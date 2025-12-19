from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.crud import cursos_materias_docentes as crud
from app.schemas.cursos_materias_docentes import CMDCreate, CMDUpdate


# Crear asignación Curso–Materia–Docente
async def crear_cmd(db: AsyncSession, data: CMDCreate):
    # Validar que no exista ya curso + materia
    if await crud.obtener_por_curso_materia(db, data.id_curso, data.id_materia):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La materia ya está asignada a este curso"
        )

    cmd = CursoMateriaDocente(
        id_curso=data.id_curso,
        id_materia=data.id_materia,
        id_docente=data.id_docente
    )

    return await crud.crear(db, cmd)


# Listar asignaciones
async def listar_cmd(
    db: AsyncSession,
    id_curso: int | None,
    id_materia: int | None,
    id_docente: int | None,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_cmd(
        db=db,
        id_curso=id_curso,
        id_materia=id_materia,
        id_docente=id_docente,
        page=page,
        size=size
    )


# Obtener asignación
async def obtener_cmd(db: AsyncSession, id_cmd: int):
    cmd = await crud.obtener_por_id(db, id_cmd)

    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada"
        )

    return cmd


# Actualizar asignación
async def actualizar_cmd(
    db: AsyncSession,
    id_cmd: int,
    data: CMDUpdate
):
    cmd = await obtener_cmd(db, id_cmd)

    values = data.model_dump(exclude_unset=True)

    # Validar unicidad curso + materia si se modifican
    if "id_curso" in values or "id_materia" in values:
        id_curso = values.get("id_curso", cmd.id_curso)
        id_materia = values.get("id_materia", cmd.id_materia)

        existente = await crud.obtener_por_curso_materia(db, id_curso, id_materia)

        if existente and existente.id_cmd != cmd.id_cmd:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe esta asignación curso–materia"
            )

    for key, value in values.items():
        setattr(cmd, key, value)

    return await crud.actualizar(db, cmd)


# Eliminar asignación (eliminación física)
async def eliminar_cmd(db: AsyncSession, id_cmd: int):
    cmd = await obtener_cmd(db, id_cmd)

    await crud.eliminar(db, cmd)