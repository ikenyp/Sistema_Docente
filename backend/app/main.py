from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(title="Sistema Inteligente de Desempeño Académico")

print("DATABASE_URL CARGADO:", settings.DATABASE_URL)

@app.get("/")
def root():
    return {"mensaje": "API funcionando correctamente"}
