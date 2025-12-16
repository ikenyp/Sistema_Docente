from fastapi import FastAPI
from app.core.config import settings
from app.api import estudiantes
app = FastAPI(
    title="Sistema Inteligente de Informacion Académica",
    version="1.0.0",)

@app.get("/")
def root():
    return {"mensaje": "API funcionando correctamente"}

app.include_router(estudiantes.router)  