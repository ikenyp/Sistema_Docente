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
    contextos,
    plataforma,
    periodizacion,
    promedios,
    analisis,
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

        await session.execute(
            text("alter table materias drop constraint if exists uq_materia_contexto_codigo")
        )
        await session.execute(
            text(
                "create unique index if not exists ix_materia_contexto_codigo_activo "
                "on materias (id_contexto, codigo) where eliminado = false"
            )
        )

        result_estudiantes_col = await session.execute(
            text(
                """
                select count(*)
                from information_schema.columns
                where table_name = 'estudiantes'
                  and column_name = 'id_contexto'
                """
            )
        )
        if not result_estudiantes_col.scalar_one():
            await session.execute(
                text("alter table estudiantes add column id_contexto integer")
            )

        result_estudiantes_anio = await session.execute(
            text(
                """
                select count(*)
                from information_schema.columns
                where table_name = 'estudiantes'
                  and column_name = 'anio_lectivo'
                """
            )
        )
        if not result_estudiantes_anio.scalar_one():
            await session.execute(
                text("alter table estudiantes add column anio_lectivo varchar(20)")
            )

        await session.execute(
            text(
                """
                update estudiantes e
                set id_contexto = c.id_contexto
                from cursos c
                where e.id_curso_actual = c.id_curso
                  and e.id_contexto is null
                """
            )
        )

        await session.execute(
            text(
                """
                update estudiantes e
                set anio_lectivo = c.anio_lectivo
                from cursos c
                where e.id_curso_actual = c.id_curso
                  and e.anio_lectivo is null
                """
            )
        )

        contexto_por_defecto = await session.execute(
            text(
                """
                select id_contexto
                from contextos
                where activo = true
                order by case when tipo_modo = 'institucional' then 0 else 1 end, id_contexto
                limit 1
                """
            )
        )
        contexto_default = contexto_por_defecto.scalar_one_or_none()
        if contexto_default is not None:
            await session.execute(
                text("update estudiantes set id_contexto = :id_contexto where id_contexto is null"),
                {"id_contexto": contexto_default},
            )

        anio_activo_result = await session.execute(
            text(
                """
                select anio_lectivo
                from anios_lectivos
                where activo = true
                order by creado_en desc
                limit 1
                """
            )
        )
        anio_activo = anio_activo_result.scalar_one_or_none()
        if anio_activo is not None:
            await session.execute(
                text("update estudiantes set anio_lectivo = :anio where anio_lectivo is null"),
                {"anio": anio_activo},
            )

        estudiantes_null_contexto = await session.execute(
            text(
                """
                select count(*)
                from estudiantes
                where id_contexto is null
                """
            )
        )
        estudiantes_null_anio = await session.execute(
            text(
                """
                select count(*)
                from estudiantes
                where anio_lectivo is null
                """
            )
        )
        if estudiantes_null_contexto.scalar_one() == 0 and estudiantes_null_anio.scalar_one() == 0:
            await session.execute(text("alter table estudiantes alter column id_contexto set not null"))
            await session.execute(text("alter table estudiantes alter column anio_lectivo set not null"))

        fk_estudiantes_contexto = await session.execute(
            text(
                """
                select count(*)
                from information_schema.table_constraints
                where table_name = 'estudiantes'
                  and constraint_name = 'fk_estudiantes_contexto'
                """
            )
        )
        if not fk_estudiantes_contexto.scalar_one():
            await session.execute(
                text(
                    "alter table estudiantes add constraint fk_estudiantes_contexto "
                    "foreign key (id_contexto) references contextos(id_contexto) on delete cascade on update cascade"
                )
            )

        await session.execute(text("alter table estudiantes drop constraint if exists estudiantes_cedula_key"))
        await session.execute(
            text(
                "create unique index if not exists ix_estudiantes_contexto_anio_cedula_activo "
                "on estudiantes (id_contexto, anio_lectivo, cedula) where eliminado = false"
            )
        )

        await session.commit()

cors_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

# Configurar CORS para permitir peticiones del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
app.include_router(contextos.router, prefix="/api", tags=["Contextos"])
app.include_router(plataforma.router, prefix="/api", tags=["Plataforma"])
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
app.include_router(analisis.router, prefix="/api/analisis", tags=["Análisis académico"])
