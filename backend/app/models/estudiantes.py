from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import EstadoEstudianteEnum


class Estudiante(Base):
    __tablename__ = "estudiantes"

    id_estudiante = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    cedula = Column(String(20), unique=True, nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)

    estado = Column(Enum(EstadoEstudianteEnum, name="estado_estudiante"), default="matriculado")

    id_curso_actual = Column(Integer, ForeignKey("cursos.id_curso"))

    curso_actual = relationship("Curso", back_populates="estudiantes")
    notas = relationship("Nota", back_populates="estudiante")
    asistencias = relationship("Asistencia", back_populates="estudiante")
    comportamientos = relationship("Comportamiento", back_populates="estudiante")
