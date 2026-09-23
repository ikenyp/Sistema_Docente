import argparse
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_contrasena
from app.models.enums import RolUsuarioEnum
from app.models.usuarios import Usuario


async def main(args):
    async with AsyncSessionLocal() as db:
        existente = await db.scalar(select(Usuario).where(Usuario.correo == args.correo.lower()))
        if existente:
            raise RuntimeError("Ya existe una cuenta con ese correo; no se modificó su contraseña")
        operador = Usuario(
                nombre=args.nombre,
                apellido=args.apellido,
                correo=args.correo.lower(),
                contrasena=hash_contrasena(args.contrasena),
                rol=RolUsuarioEnum.administrativo,
                activo=True,
            )
        db.add(operador)
        await db.commit()
        print("Operador creado correctamente")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--correo", required=True)
    parser.add_argument("--contrasena", required=True)
    parser.add_argument("--nombre", default="Operador")
    parser.add_argument("--apellido", default="Plataforma")
    asyncio.run(main(parser.parse_args()))
