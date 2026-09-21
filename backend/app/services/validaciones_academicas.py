from fastapi import HTTPException, status


async def manejar_error_integridad(db, detalle: str) -> None:
    # Después de un error de unicidad la sesión queda fallida hasta hacer
    # rollback. Lo hacemos antes de devolver un mensaje útil al frontend.
    await db.rollback()
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detalle,
    )


def validar_calificacion(calificacion) -> None:
    if not 0 <= calificacion <= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nota debe estar entre 0 y 10",
        )


def validar_ponderacion(ponderacion) -> None:
    if not 1 <= ponderacion <= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La ponderación debe estar entre 1 y 10",
        )


def validar_estudiante_en_curso(
    estudiante,
    id_curso: int,
    detalle: str = "El estudiante no está matriculado en el curso",
) -> None:
    if estudiante.id_curso_actual != id_curso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detalle,
        )
