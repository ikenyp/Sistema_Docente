def normalizar_paginacion(
    page: int,
    size: int,
    default_size: int = 10,
    max_size: int = 100,
) -> tuple[int, int]:
    if page < 1:
        page = 1
    if size < 1 or size > max_size:
        size = default_size
    return page, size


def calcular_offset(page: int, size: int) -> int:
    return (page - 1) * size
