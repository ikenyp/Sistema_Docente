import enum

class RolUsuarioEnum(str, enum.Enum):
    docente = "docente"
    administrativo = "administrativo"

class EstadoEstudianteEnum(str, enum.Enum):
    matriculado = "matriculado"
    retirado = "retirado"
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