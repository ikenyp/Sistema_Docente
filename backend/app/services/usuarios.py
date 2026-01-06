from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from email_validator import validate_email, EmailNotValidError

from app.core.security import hash_contrasena

from app.models.usuarios import Usuario
from app.crud import usuarios as crud
from app.schemas.usuarios import RolUsuarioEnum, UsuarioCreate, UsuarioUpdate


#  Crear usuario
async def crear_usuario(db: AsyncSession, data: UsuarioCreate):
    # Validar formato de email
    try:
        validate_email(data.correo)
    except EmailNotValidError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Correo inválido: {str(e)}"
        )

    if await crud.obtener_por_correo(db, data.correo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )
    
    # Validar rol
    if data.rol not in [RolUsuarioEnum.DOCENTE, RolUsuarioEnum.ADMINISTRATIVO]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol debe ser 'docente' o 'administrativo'"
        )

    rol_norm = (data.rol.value if hasattr(data.rol, "value") else data.rol).lower()
    usuario = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        correo=data.correo,
        contrasena=hash_contrasena(data.contrasena),
        rol=rol_norm,
        activo=True
    )
    return await crud.crear(db, usuario)

#  Listar usuarios
async def listar_usuarios(
    db: AsyncSession,
    rol: RolUsuarioEnum | None = None,
    nombre: str | None = None,
    page: int = 1,
    size: int = 10
):
    # Validación básica de paginación
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

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

#  Actualizar usuario
async def actualizar_usuario(
    db: AsyncSession,
    id_usuario: int,
    data: UsuarioUpdate
):
    usuario = await obtener_usuario(db, id_usuario)

    values = data.model_dump(exclude_unset=True)

    if "correo" in values:
        # Validar formato de email
        try:
            validate_email(values["correo"])
        except EmailNotValidError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Correo inválido: {str(e)}"
            )

        existente = await crud.obtener_por_correo(db, values["correo"])
        if existente and existente.id_usuario != id_usuario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está registrado"
            )    
    
    if "contrasena" in values:
        values["contrasena"] = hash_contrasena(values["contrasena"])

    if "rol" in values and values["rol"] is not None:
        # Validar rol
        if values["rol"] not in [RolUsuarioEnum.DOCENTE, RolUsuarioEnum.ADMINISTRATIVO]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El rol debe ser 'docente' o 'administrativo'"
            )
        values["rol"] = (values["rol"].value if hasattr(values["rol"], "value") else values["rol"]).lower()

    for key, value in values.items():
        setattr(usuario, key, value)

    return await crud.actualizar(db, usuario)

#  Eliminar usuario
async def eliminar_usuario(db: AsyncSession, id_usuario: int):
    usuario = await obtener_usuario(db, id_usuario)
    usuario.activo = False
    await crud.actualizar(db, usuario)
    return None #status 204
