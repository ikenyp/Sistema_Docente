"""Reglas comunes para limitar consultas paginadas."""


def normalizar_paginacion(
    page: int,
    size: int,
    default_size: int = 10,
    max_size: int = 100,
) -> tuple[int, int]:
    # Nunca permitimos páginas o tamaños inválidos. El límite evita que una
    # petición accidental intente cargar miles de registros en una sola respuesta.
    if page < 1:
        page = 1
    if size < 1 or size > max_size:
        size = default_size
    return page, size


def calcular_offset(page: int, size: int) -> int:
    # SQLAlchemy usa offset para saltar los registros de las páginas anteriores.
    return (page - 1) * size
