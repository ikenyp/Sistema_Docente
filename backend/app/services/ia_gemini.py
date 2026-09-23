import asyncio
import json
import logging

import requests
from fastapi import HTTPException, status

from app.core.config import settings


logger = logging.getLogger(__name__)


def _solicitar_gemini(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La integración con Gemini no está configurada",
        )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
        f"?key={settings.GEMINI_API_KEY}"
    )
    try:
        response = requests.post(
            url,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 500,
                },
            },
            timeout=settings.GEMINI_TIMEOUT_SECONDS,
        )
    except requests.Timeout as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Gemini tardó demasiado en responder. El análisis académico sigue disponible.",
        ) from exc
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo conectar con Gemini. El análisis académico sigue disponible.",
        ) from exc
    if response.status_code >= 400:
        try:
            detalle = response.json().get("error", {}).get("message", "Error desconocido")
        except ValueError:
            detalle = "Respuesta inválida del proveedor"
        logger.warning("Gemini respondió %s: %s", response.status_code, detalle)
        if response.status_code == 429:
            detalle = "Se alcanzó temporalmente la cuota de Gemini. Intenta más tarde."
        elif response.status_code in (401, 403):
            detalle = "La API key de Gemini no es válida o no tiene permisos para este modelo."
        elif response.status_code == 404:
            detalle = "El modelo de Gemini configurado no está disponible."
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini no pudo generar la explicación: {detalle}",
        )

    partes = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
    texto = "\n".join(parte.get("text", "") for parte in partes).strip()
    if not texto:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini devolvió una respuesta vacía",
        )
    return texto


async def explicar_analisis(datos: dict) -> str:
    prompt = (
        "Eres un asistente pedagógico para un sistema académico.\n"
        "Analiza únicamente los datos proporcionados. No inventes estudiantes, notas ni causas.\n\n"
        "Escribe en español una explicación breve y accionable para un docente o administrador:\n"
        "1. Resume la situación principal.\n"
        "2. Explica qué evidencia la sustenta.\n"
        "3. Sugiere hasta tres acciones concretas.\n\n"
        "No menciones que eres una IA, no modifiques datos y evita conclusiones disciplinarias.\n"
        "Datos del análisis:\n"
        + json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    )
    return await asyncio.to_thread(_solicitar_gemini, prompt)
