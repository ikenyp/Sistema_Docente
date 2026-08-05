"""
Esquemas para respuestas de promedios
"""

from pydantic import BaseModel
from typing import Optional, List


class DetalleNotaInsumo(BaseModel):
    """Detalle de una nota de un insumo específico"""
    id_insumo: int
    nombre_insumo: str
    calificacion: float


class DetalleActividadesPeriodo(BaseModel):
    """Detalles de actividades en un periodo academico."""
    notas_actividades: List[DetalleNotaInsumo] = []
    nota_proyecto: Optional[DetalleNotaInsumo] = None
    nota_examen: Optional[DetalleNotaInsumo] = None


class PromedioPeriodo(BaseModel):
    """Promedio de un estudiante en un periodo academico."""
    id_estudiante: int
    id_curso: int
    numero_periodo: int
    nombre_periodo: str
    anio_lectivo: str
    promedio_actividades: Optional[float] = None
    promedio_proyecto: Optional[float] = None
    promedio_examen: Optional[float] = None
    promedio_periodo: Optional[float] = None
    detalles: DetalleActividadesPeriodo


class PromedioAcumulado(BaseModel):
    """Promedio acumulado de un estudiante en un curso."""
    id_estudiante: int
    id_curso: int
    anio_lectivo: str
    promedio_acumulado: Optional[float] = None
    promedios_por_periodo: List[PromedioPeriodo]
    periodos_con_datos: int
    cantidad_periodos: int
    cantidad_periodos_configurada: int
    tipo_periodizacion: str


class PromediosCurso(BaseModel):
    """Promedios de todos los estudiantes en un curso"""
    id_curso: int
    promedios: List[PromedioAcumulado]
    cantidad_estudiantes: int
