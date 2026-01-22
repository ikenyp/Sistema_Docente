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
    proyecto_trimestral = "proyecto_trimestral"
    examen_trimestral = "examen_trimestral"

class TrimestreEnum(int, enum.Enum):
    primero = 1
    segundo = 2
    tercero = 3