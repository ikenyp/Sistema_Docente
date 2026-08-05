import enum

class RolUsuarioEnum(str, enum.Enum):
    docente = "docente"
    administrativo = "administrativo"

class EstadoEstudianteEnum(str, enum.Enum):
    matriculado = "matriculado"
    activo = "activo"
    inactivo = "inactivo"
    retirado = "retirado"
    graduado = "graduado"

class EstadoAsistenciaEnum(str, enum.Enum):
    presente = "presente"
    ausente = "ausente"
    justificado = "justificado"
    atraso = "atraso"

class ValorComportamientoEnum(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"

class TipoInsumoEnum(str, enum.Enum):
    actividad = "actividad"
    proyecto_periodo = "proyecto_periodo"
    examen_periodo = "examen_periodo"
