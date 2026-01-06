"""
Endpoints para obtener promedios de estudiantes
"""

from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.services import promedios as service
from app.schemas.promedios import PromedioTrimestral, PromedioFinal, PromediosCurso

router = APIRouter(
    prefix="/promedios",
    tags=["Promedios"],
    responses={404: {"description": "No encontrado"}}
)


@router.get(
    "/trimestre/{id_estudiante}/{id_curso}/{numero_trimestre}",
    response_model=PromedioTrimestral,
    summary="Obtener promedio trimestral de un estudiante"
)
async def obtener_promedio_trimestral(
    id_estudiante: int = Path(..., gt=0, description="ID del estudiante"),
    id_curso: int = Path(..., gt=0, description="ID del curso"),
    numero_trimestre: int = Path(..., ge=1, le=3, description="Número de trimestre (1, 2 o 3)"),
    anio_lectivo: str = Query(..., description="Año lectivo (ej: 2025-2026)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Calcula y retorna el promedio de un estudiante en un trimestre específico.
    
    **Estructura de cálculo:**
    - Promedio de Actividades (10%)
    - Nota del Proyecto Trimestral (20%)
    - Nota del Examen Trimestral (70%)
    
    **Fórmula:**
    Promedio Trimestral = (Actividades × 0.10) + (Proyecto × 0.20) + (Examen × 0.70)
    """
    return await service.calcular_promedio_trimestral(
        db=db,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        numero_trimestre=numero_trimestre,
        anio_lectivo=anio_lectivo
    )


@router.get(
    "/final/{id_estudiante}/{id_curso}",
    response_model=PromedioFinal,
    summary="Obtener promedio final de un estudiante"
)
async def obtener_promedio_final(
    id_estudiante: int = Path(..., gt=0, description="ID del estudiante"),
    id_curso: int = Path(..., gt=0, description="ID del curso"),
    anio_lectivo: str = Query(..., description="Año lectivo (ej: 2025-2026)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Calcula y retorna el promedio final de un estudiante en un curso.
    
    **Fórmula:**
    Promedio Final = (Promedio T1 + Promedio T2 + Promedio T3) / 3
    
    Incluye desglose de promedios por trimestre.
    """
    return await service.calcular_promedio_final(
        db=db,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        anio_lectivo=anio_lectivo
    )


@router.get(
    "/curso/{id_curso}",
    summary="Obtener promedios de todos los estudiantes en un curso"
)
async def obtener_promedios_curso(
    id_curso: int = Path(..., gt=0, description="ID del curso"),
    numero_trimestre: int | None = Query(None, ge=1, le=3, description="Filtrar por trimestre (opcional)"),
    anio_lectivo: str | None = Query(None, description="Año lectivo (requerido si se especifica trimestre)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Obtiene los promedios de todos los estudiantes matriculados en un curso.
    
    **Parámetros opcionales:**
    - `numero_trimestre`: Filtrar por trimestre específico (1, 2 o 3)
    - `anio_lectivo`: Requerido si se especifica trimestre
    
    Si no se especifica trimestre, retorna promedios finales del año.
    """
    promedios = await service.obtener_promedios_curso(
        db=db,
        id_curso=id_curso,
        numero_trimestre=numero_trimestre,
        anio_lectivo=anio_lectivo
    )
    
    return {
        "id_curso": id_curso,
        "promedios": promedios,
        "cantidad_estudiantes": len(promedios)
    }
