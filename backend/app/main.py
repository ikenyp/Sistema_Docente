from fastapi import FastAPI

app = FastAPI(title="Sistema Inteligente de Desempeño Académico")

@app.get("/")
def root():
    return {"mensaje": "API funcionando correctamente"}
