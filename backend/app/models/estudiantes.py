from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import EstadoEstudianteEnum



class Estudiante(Base):
    __tablename__ = "estudiantes"
    __table_args__ = (
        UniqueConstraint("id_contexto", "anio_lectivo", "cedula", name="uq_estudiantes_contexto_anio_cedula"),
    )

    id_estudiante = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    cedula = Column(String(20), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    anio_lectivo = Column(String(20), nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)

    estado = Column(Enum(EstadoEstudianteEnum, name="estado_estudiante"), default="matriculado")

    id_curso_actual = Column(Integer, ForeignKey("cursos.id_curso", ondelete="SET NULL", onupdate="CASCADE"), nullable=True)

    eliminado = Column(Boolean, default=False)

    contexto = relationship("Contexto", back_populates="estudiantes")
    curso_actual = relationship("Curso", back_populates="estudiantes")
    notas = relationship("Nota", back_populates="estudiante")
    asistencias = relationship("Asistencia", back_populates="estudiante")
    comportamientos = relationship("Comportamiento", back_populates="estudiante")
