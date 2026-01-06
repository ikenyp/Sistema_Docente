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


class DetalleActividadesTrimestr(BaseModel):
    """Detalles de actividades en un trimestre"""
    notas_actividades: List[DetalleNotaInsumo] = []
    nota_proyecto: Optional[DetalleNotaInsumo] = None
    nota_examen: Optional[DetalleNotaInsumo] = None


class PromedioTrimestral(BaseModel):
    """Promedio de un estudiante en un trimestre"""
    id_estudiante: int
    id_curso: int
    numero_trimestre: int
    anio_lectivo: str
    promedio_actividades: Optional[float] = None
    promedio_proyecto: Optional[float] = None
    promedio_examen: Optional[float] = None
    promedio_trimestral: Optional[float] = None
    detalles: DetalleActividadesTrimestr


class PromedioFinal(BaseModel):
    """Promedio final de un estudiante en un curso"""
    id_estudiante: int
    id_curso: int
    anio_lectivo: str
    promedio_final: Optional[float] = None
    promedios_trimestrales: List[PromedioTrimestral]
    trimestres_con_datos: int


class PromediosCurso(BaseModel):
    """Promedios de todos los estudiantes en un curso"""
    id_curso: int
    promedios: List[PromedioFinal]
    cantidad_estudiantes: int
