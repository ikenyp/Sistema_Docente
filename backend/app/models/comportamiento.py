from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import ValorComportamientoEnum


class Comportamiento(Base):
    __tablename__ = "comportamiento"

    id_comportamiento = Column(Integer, primary_key=True)
    id_estudiante = Column(Integer, ForeignKey("estudiantes.id_estudiante", ondelete="CASCADE"), nullable=False)
    id_curso = Column(Integer, ForeignKey("cursos.id_curso", ondelete="CASCADE"), nullable=False)
    mes = Column(String(10), nullable=False)
    valor = Column(Enum(ValorComportamientoEnum, name="valor_comportamiento"), nullable=False)
    observaciones = Column(Text)

    __table_args__ = (UniqueConstraint("id_estudiante", "id_curso", "mes", name="uq_comportamiento"),)

    estudiante = relationship("Estudiante", back_populates="comportamientos")
    curso = relationship("Curso")
