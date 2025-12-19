import enum

class RolUsuarioEnum(str, enum.Enum):
    DOCENTE = "docente"
    ADMINISTRATIVO = "administrativo"

class EstadoEstudianteEnum(str, enum.Enum):
    matriculado = "matriculado"
    activo = "activo"
    inactivo = "inactivo"
    graduado = "graduado"

class EstadoAsistenciaEnum(str, enum.Enum):
    presente = "presente"
    ausente = "ausente"
    atraso = "atraso"

class ValorComportamientoEnum(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"