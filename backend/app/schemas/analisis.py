from pydantic import BaseModel, Field


class AnalisisAlerta(BaseModel):
    tipo: str
    nivel: str
    titulo: str
    descripcion: str
    recomendacion: str
    id_estudiante: int | None = None
    estudiante: str | None = None


class AnalisisEstudianteResumen(BaseModel):
    id_estudiante: int
    estudiante: str
    promedio_registrado: float | None = None
    actividades_registradas: int = 0
    actividades_pendientes: int = 0
    actividades_pendientes_nombres: list[str] = Field(default_factory=list)
    porcentaje_asistencia: float | None = None
    asistencias_favorables: int = 0
    asistencias_totales: int = 0
    tendencia_promedio: float | None = None
    puntaje_riesgo: int = 0
    alertas: list[AnalisisAlerta] = Field(default_factory=list)


class AnalisisCursoResumen(BaseModel):
    id_curso: int
    nombre_curso: str
    anio_lectivo: str
    estudiantes_analizados: int = 0
    promedio_curso: float | None = None
    estudiantes_bajo_aprobacion: int = 0
    actividades_pendientes: int = 0
    porcentaje_asistencia: float | None = None
    alertas_altas: int = 0
    alertas_medias: int = 0
    estudiantes_afectados: int = 0
    estudiantes_en_riesgo: int = 0
    situaciones: int = 0


class AnalisisGrupo(BaseModel):
    tipo: str
    nombre: str
    cantidad: int = 0
    id_estudiantes: list[int] = Field(default_factory=list)


class AnalisisActividad(BaseModel):
    id_insumo: int
    nombre: str
    materia: str
    estudiantes_esperados: int = 0
    notas_registradas: int = 0
    pendientes: int = 0
    promedio: float | None = None
    estudiantes_bajo_aprobacion: int = 0


class AnalisisMateria(BaseModel):
    id_materia: int
    nombre: str
    actividades: int = 0
    promedio: float | None = None
    estudiantes_bajo_aprobacion: int = 0


class AnalisisSituacion(BaseModel):
    id_situacion: str
    tipo: str
    titulo: str
    descripcion: str
    prioridad: str
    afectados: int = 0
    id_estudiantes: list[int] = Field(default_factory=list)
    nombres_estudiantes: list[str] = Field(default_factory=list)
    materia: str | None = None
    actividad: str | None = None
    promedio: float | None = None
    recomendacion: str


class AnalisisCursoResponse(BaseModel):
    resumen: AnalisisCursoResumen
    situaciones: list[AnalisisSituacion] = Field(default_factory=list)
    alertas: list[AnalisisAlerta] = Field(default_factory=list)
    fortalezas: list[str] = Field(default_factory=list)
    recomendaciones: list[str] = Field(default_factory=list)
    estudiantes: list[AnalisisEstudianteResumen] = Field(default_factory=list)
    grupos: list[AnalisisGrupo] = Field(default_factory=list)
    actividades: list[AnalisisActividad] = Field(default_factory=list)
    materias: list[AnalisisMateria] = Field(default_factory=list)


class AnalisisEstudianteResponse(BaseModel):
    id_curso: int
    nombre_curso: str
    estudiante: AnalisisEstudianteResumen
    recomendaciones: list[str] = Field(default_factory=list)
    fortalezas: list[str] = Field(default_factory=list)
