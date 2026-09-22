"""Alta privada de una institución y su primer administrador.

Ejemplo:
py -m scripts.crear_institucion --institucion "Colegio Central" --correo admin@colegio.edu \
  --nombre Ana --apellido Pérez --contrasena-temporal "Cambiar-2026!"
"""

import argparse
import asyncio

from app.core.database import AsyncSessionLocal
from app.services.instituciones import crear_institucion_con_administrador


async def main(args):
    async with AsyncSessionLocal() as db:
        institucion, administrador, cuenta_creada = await crear_institucion_con_administrador(
            db,
            nombre_institucion=args.institucion,
            correo_administrador=args.correo,
            nombre_administrador=args.nombre,
            apellido_administrador=args.apellido,
            contrasena_temporal=args.contrasena_temporal,
        )
    estado = "creada" if cuenta_creada else "vinculada"
    print(f"Institución creada: {institucion.nombre} ({institucion.slug})")
    print(f"Cuenta administradora {estado}: {administrador.correo}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crea una institución y su primer administrador")
    parser.add_argument("--institucion", required=True)
    parser.add_argument("--correo", required=True)
    parser.add_argument("--nombre")
    parser.add_argument("--apellido")
    parser.add_argument("--contrasena-temporal", dest="contrasena_temporal")
    asyncio.run(main(parser.parse_args()))
