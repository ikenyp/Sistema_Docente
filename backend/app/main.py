from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.auth.routes import router as auth_routes
from app.api import (
    estudiantes,
    estructuras_academicas,
    usuarios,
    cursos,
    anios_lectivos,
    materias,
    cursos_materias_docentes,
    notas,
    insumos,
    asistencia,
    comportamiento,
    periodizacion,
    promedios
)

app = FastAPI(
    title="Sistema Inteligente de Informacion Académica",
    version="1.0.0",)


@app.on_event("startup")
async def ensure_estructura_anio_lectivo_column():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                """
                select count(*)
                from information_schema.columns
                where table_name = 'estructuras_academicas'
                  and column_name = 'anio_lectivo'
                """
            )
        )
        existe = result.scalar_one()
        if not existe:
            await session.execute(
                text("alter table estructuras_academicas add column anio_lectivo varchar(9)")
            )
            await session.execute(
                text("update estructuras_academicas set anio_lectivo = '2026-2027' where anio_lectivo is null")
            )

        result_old = await session.execute(
            text(
                """
                select count(*)
                from information_schema.table_constraints
                where table_name = 'estructuras_academicas'
                  and constraint_name = 'uq_estructura_academica_contexto_nombre'
                """
            )
        )
        old_exists = result_old.scalar_one()

        result_new = await session.execute(
            text(
                """
                select count(*)
                from information_schema.table_constraints
                where table_name = 'estructuras_academicas'
                  and constraint_name = 'uq_estructura_academica_contexto_anio_nombre'
                """
            )
        )
        new_exists = result_new.scalar_one()

        if old_exists:
            await session.execute(
                text("alter table estructuras_academicas drop constraint if exists uq_estructura_academica_contexto_nombre")
            )

        if not new_exists:
            await session.execute(
                text(
                    "alter table estructuras_academicas add constraint uq_estructura_academica_contexto_anio_nombre unique (id_contexto, anio_lectivo, nombre)"
                )
            )

        result_materia_codigo = await session.execute(
            text(
                """
                select count(*)
                from information_schema.columns
                where table_name = 'materias'
                  and column_name = 'codigo'
                """
            )
        )
        if not result_materia_codigo.scalar_one():
            await session.execute(
                text("alter table materias add column codigo varchar(30)")
            )

        result_materia_desc = await session.execute(
            text(
                """
                select count(*)
                from information_schema.columns
                where table_name = 'materias'
                  and column_name = 'descripcion'
                """
            )
        )
        if not result_materia_desc.scalar_one():
            await session.execute(
                text("alter table materias add column descripcion varchar(255)")
            )

        result_materia_uq = await session.execute(
            text(
                """
                select count(*)
                from information_schema.table_constraints
                where table_name = 'materias'
                  and constraint_name = 'uq_materia_contexto_codigo'
                """
            )
        )
        if not result_materia_uq.scalar_one():
            await session.execute(
                text(
                    "alter table materias add constraint uq_materia_contexto_codigo unique (id_contexto, codigo)"
                )
            )

        await session.commit()

# Configurar CORS para permitir peticiones del frontend
app.add_middleware(
    CORSMiddleware,
    # Permitir los orígenes locales más comunes (localhost y 127.0.0.1)
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    # Como respaldo, habilitar cualquier puerto local (útil si el frontend cambia de puerto)
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Permite todos los headers (Authorization, Content-Type, etc.)
)

@app.get("/")
def root():
    return {"mensaje": "API funcionando correctamente"}


@app.get("/app-config")
def app_config():
    return {"app_mode": settings.APP_MODE}

# Registrar todos los routers
app.include_router(auth_routes, prefix="/auth", tags=["Authentication"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])
app.include_router(estructuras_academicas.router, prefix="/api", tags=["Estructura académica"])
app.include_router(estudiantes.router, prefix="/api/estudiantes", tags=["Estudiantes"])
app.include_router(cursos.router, prefix="/api/cursos", tags=["Cursos"])
app.include_router(anios_lectivos.router, prefix="/api", tags=["Años lectivos"])
app.include_router(materias.router, prefix="/api/materias", tags=["Materias"])
app.include_router(cursos_materias_docentes.router, prefix="/api/cursos-materias-docentes", tags=["Asignaciones"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])
app.include_router(insumos.router, prefix="/api/insumos", tags=["Insumos"])
app.include_router(asistencia.router, prefix="/api/asistencia", tags=["Asistencia"])
app.include_router(comportamiento.router, prefix="/api/comportamiento", tags=["Comportamiento"])
app.include_router(periodizacion.router, prefix="/api", tags=["Periodizacion"])
app.include_router(promedios.router, prefix="/api", tags=["Promedios"])
