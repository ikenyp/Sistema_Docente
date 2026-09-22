from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from email_validator import validate_email, EmailNotValidError

from app.core.security import hash_contrasena
from app.core.pagination import normalizar_paginacion

from app.models.usuarios import Usuario
from app.models.usuarios_contextos import UsuarioContexto
from app.crud import usuarios as crud
from app.schemas.usuarios import RolUsuarioEnum, UsuarioCreate, UsuarioUpdate


#  Validaciones de usuario reutilizables
def validar_email(correo: str) -> None:
    # Se valida aquí además del schema porque el servicio también puede ser
    # llamado desde tareas internas y no solo desde una petición HTTP.
    try:
        validate_email(correo)
    except EmailNotValidError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Correo inválido: {str(e)}"
        )


def validar_rol(rol) -> None:
    if rol is None:
        return
    if rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol debe ser 'docente' o 'administrativo'"
        )


def normalizar_rol(rol) -> str:
    return (rol.value if hasattr(rol, "value") else rol).lower()


#  Crear usuario
async def crear_usuario(db: AsyncSession, data: UsuarioCreate, id_contexto: int | None = None):
    validar_email(data.correo)

    if await crud.obtener_por_correo(db, data.correo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )

    validar_rol(data.rol)

    rol_norm = normalizar_rol(data.rol)
    usuario = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        correo=data.correo,
        contrasena=hash_contrasena(data.contrasena),
        rol=rol_norm,
        activo=True
    )
    usuario = await crud.crear(db, usuario)
    if id_contexto is not None:
        db.add(UsuarioContexto(
            id_usuario=usuario.id_usuario,
            id_contexto=id_contexto,
            rol=rol_norm,
            activo=True,
        ))
        await db.commit()
    return usuario

#  Listar usuarios
async def listar_usuarios(
    db: AsyncSession,
    rol: RolUsuarioEnum | None = None,
    nombre: str | None = None,
    page: int = 1,
    size: int = 10
    , id_contexto: int | None = None
):
    page, size = normalizar_paginacion(page, size)

    if id_contexto is not None:
        query = (
            select(Usuario)
            .join(UsuarioContexto, UsuarioContexto.id_usuario == Usuario.id_usuario)
            .where(
                UsuarioContexto.id_contexto == id_contexto,
                UsuarioContexto.activo == True,
            )
        )
        if rol is not None:
            query = query.where(UsuarioContexto.rol == rol.value)
        if nombre:
            query = query.where(
                (Usuario.nombre.ilike(f"%{nombre}%")) |
                (Usuario.apellido.ilike(f"%{nombre}%"))
            )
        result = await db.execute(
            query.order_by(Usuario.apellido, Usuario.nombre)
            .offset((page - 1) * size)
            .limit(size)
        )
        return result.scalars().all()

    return await crud.listar_usuarios(
        db=db,
        rol=rol,
        nombre=nombre,
        page=page,
        size=size
    )

#  Obtener usuario por ID
async def obtener_usuario(db: AsyncSession, id_usuario: int):
    usuario = await crud.obtener_por_id(db, id_usuario)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return usuario


async def obtener_usuario_en_contexto(db: AsyncSession, id_usuario: int, id_contexto: int):
    result = await db.execute(
        select(Usuario)
        .join(UsuarioContexto, UsuarioContexto.id_usuario == Usuario.id_usuario)
        .where(
            Usuario.id_usuario == id_usuario,
            UsuarioContexto.id_contexto == id_contexto,
            UsuarioContexto.activo == True,
            Usuario.activo == True,
        )
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado en este contexto")
    return usuario

#  Actualizar usuario
async def actualizar_usuario(
    db: AsyncSession,
    id_usuario: int,
    data: UsuarioUpdate
):
    # Solo se modifican los campos enviados; así editar el nombre no borra por
    # accidente contraseña, rol u otros datos existentes.
    usuario = await obtener_usuario(db, id_usuario)

    values = data.model_dump(exclude_unset=True)

    if "correo" in values:
        validar_email(values["correo"])

        existente = await crud.obtener_por_correo(db, values["correo"])
        if existente and existente.id_usuario != id_usuario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está registrado"
            )

    if "contrasena" in values:
        values["contrasena"] = hash_contrasena(values["contrasena"])

    if "rol" in values and values["rol"] is not None:
        validar_rol(values["rol"])
        values["rol"] = normalizar_rol(values["rol"])

    for key, value in values.items():
        setattr(usuario, key, value)

    return await crud.actualizar(db, usuario)

#  Eliminar usuario
async def eliminar_usuario(db: AsyncSession, id_usuario: int):
    from app.models.cursos_materias_docentes import CursoMateriaDocente
    from app.models.cursos import Curso
    from sqlalchemy import select

    usuario = await obtener_usuario(db, id_usuario)

    # Verificar si tiene asignaciones como docente
    stmt_asignaciones = select(CursoMateriaDocente).where(
        CursoMateriaDocente.id_docente == id_usuario
    )
    result_asignaciones = await db.execute(stmt_asignaciones)
    asignaciones = result_asignaciones.scalars().all()

    if asignaciones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el usuario porque tiene {len(asignaciones)} asignación(es) de curso/materia. Elimine primero sus asignaciones."
        )

    # Verificar si es tutor de algún curso
    stmt_cursos = select(Curso).where(
        Curso.id_tutor == id_usuario
    )
    result_cursos = await db.execute(stmt_cursos)
    cursos_tutor = result_cursos.scalars().all()

    if cursos_tutor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el usuario porque es tutor de {len(cursos_tutor)} curso(s). Reasigne el tutor primero."
        )

    usuario.activo = False
    await crud.actualizar(db, usuario)
    return None #status 204
