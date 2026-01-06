from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_session
from app.schemas.trimestres import TrimestreCreate, TrimestreUpdate, TrimestreResponse
from app.crud import trimestres as crud_trimestres
from app.auth.dependencies import get_current_user
from app.models.usuarios import Usuario

router = APIRouter(
    prefix="/trimestres",
    tags=["trimestres"]
)


@router.post("/", response_model=TrimestreResponse, status_code=status.HTTP_201_CREATED)
async def crear_trimestre(
    trimestre: TrimestreCreate,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Crear un nuevo trimestre (solo administrativos)"""
    if current_user.rol != "administrativo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administrativos pueden crear trimestres"
        )
    
    # Validar que las fechas sean coherentes
    if trimestre.fecha_inicio >= trimestre.fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio debe ser anterior a la fecha de fin"
        )
    
    # Validar que el número de trimestre sea válido
    if trimestre.numero_trimestre not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El número de trimestre debe ser 1, 2 o 3"
        )
    
    try:
        return await crud_trimestres.create_trimestre(db=db, trimestre=trimestre)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear trimestre: {str(e)}"
        )


@router.get("/", response_model=List[TrimestreResponse])
async def listar_trimestres(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Listar todos los trimestres"""
    return await crud_trimestres.get_all_trimestres(db=db, skip=skip, limit=limit)


@router.get("/{id_trimestre}", response_model=TrimestreResponse)
async def obtener_trimestre(
    id_trimestre: int,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener un trimestre específico por ID"""
    trimestre = await crud_trimestres.get_trimestre(db=db, id_trimestre=id_trimestre)
    if not trimestre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trimestre no encontrado"
        )
    return trimestre


@router.get("/curso/{id_curso}", response_model=List[TrimestreResponse])
async def obtener_trimestres_por_curso(
    id_curso: int,
    anio_lectivo: str = None,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener todos los trimestres de un curso, opcionalmente filtrados por año lectivo"""
    if anio_lectivo:
        return await crud_trimestres.get_trimestres_by_curso_anio(
            db=db, 
            id_curso=id_curso, 
            anio_lectivo=anio_lectivo
        )
    return await crud_trimestres.get_trimestres_by_curso(db=db, id_curso=id_curso)


@router.get("/curso/{id_curso}/activo", response_model=TrimestreResponse)
async def obtener_trimestre_activo(
    id_curso: int,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener el trimestre activo actual de un curso basándose en la fecha actual"""
    trimestre = await crud_trimestres.get_trimestre_activo(db=db, id_curso=id_curso)
    if not trimestre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un trimestre activo para este curso en la fecha actual"
        )
    return trimestre


@router.put("/{id_trimestre}", response_model=TrimestreResponse)
async def actualizar_trimestre(
    id_trimestre: int,
    trimestre: TrimestreUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Actualizar un trimestre (solo administrativos)"""
    if current_user.rol != "administrativo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administrativos pueden actualizar trimestres"
        )
    
    db_trimestre = await crud_trimestres.update_trimestre(
        db=db, 
        id_trimestre=id_trimestre, 
        trimestre=trimestre
    )
    if not db_trimestre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trimestre no encontrado"
        )
    
    # Validar fechas si se actualizan ambas
    if db_trimestre.fecha_inicio >= db_trimestre.fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio debe ser anterior a la fecha de fin"
        )
    
    return db_trimestre


@router.delete("/{id_trimestre}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_trimestre(
    id_trimestre: int,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Eliminar un trimestre (solo administrativos)"""
    if current_user.rol != "administrativo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administrativos pueden eliminar trimestres"
        )
    
    if not await crud_trimestres.delete_trimestre(db=db, id_trimestre=id_trimestre):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trimestre no encontrado"
        )
