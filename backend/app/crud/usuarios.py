from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.usuarios import Usuario
from app.schemas.usuarios import RolUsuario

#  Obtener por ID
async def obtener_por_id(db: AsyncSession, id_usuario: int):
    result = await db.execute(
        select(Usuario).where(
        Usuario.id_usuario == id_usuario,
        Usuario.activo == True
        )
    )
    return result.scalar_one_or_none()

#  Obtener por correo
async def obtener_por_correo(db: AsyncSession, correo: str):
    result = await db.execute(
        select(Usuario).where(
        Usuario.correo == correo,
        Usuario.activo == True
        )
    )
    return result.scalar_one_or_none()

#  Listar usuarios
async def listar_usuarios(
    db: AsyncSession,
    rol: RolUsuario | None = None,
    nombre: str | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(Usuario).where(Usuario.activo == True)

    if rol:
        query = query.where(Usuario.rol == rol)

    if nombre:
        query = query.where(
            Usuario.nombre.ilike(f"%{nombre}%")
        )

    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    return result.scalars().all()

#  Crear usuario
async def crear(db: AsyncSession, usuario: Usuario):
    db.add(usuario)
    db.flush
    await db.commit()
    await db.refresh(usuario)
    return usuario

# Actualizar
async def actualizar(db: AsyncSession, usuario: Usuario):
    await db.commit()
    await db.refresh(usuario)
    return usuario

