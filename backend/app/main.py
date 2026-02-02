from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.routes import router as auth_routes
from app.api import (
    estudiantes,
    usuarios,
    cursos,
    materias,
    cursos_materias_docentes,
    notas,
    insumos,
    asistencia,
    comportamiento,
    trimestres,
    promedios
)

app = FastAPI(
    title="Sistema Inteligente de Informacion Académica",
    version="1.0.0",)

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

# Registrar todos los routers
app.include_router(auth_routes, prefix="/auth", tags=["Authentication"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])
app.include_router(estudiantes.router, prefix="/api/estudiantes", tags=["Estudiantes"])
app.include_router(cursos.router, prefix="/api/cursos", tags=["Cursos"])
app.include_router(materias.router, prefix="/api/materias", tags=["Materias"])
app.include_router(cursos_materias_docentes.router, prefix="/api/cursos-materias-docentes", tags=["Asignaciones"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])
app.include_router(insumos.router, prefix="/api/insumos", tags=["Insumos"])
app.include_router(asistencia.router, prefix="/api/asistencia", tags=["Asistencia"])
app.include_router(comportamiento.router, prefix="/api/comportamiento", tags=["Comportamiento"])
app.include_router(trimestres.router, prefix="/api/trimestres", tags=["Trimestres"])
app.include_router(promedios.router, prefix="/api", tags=["Promedios"])