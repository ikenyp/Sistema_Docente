from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Contexto(Base):
    __tablename__ = "contextos"

    id_contexto = Column(Integer, primary_key=True)
    tipo_modo = Column(String(20), nullable=False)  # institucional | personal
    nombre = Column(String(120), nullable=False)
    id_owner_docente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    owner_docente = relationship("Usuario", foreign_keys=[id_owner_docente])
    cursos = relationship("Curso", back_populates="contexto")
    materias = relationship("Materia", back_populates="contexto")
    configuraciones_periodizacion = relationship(
        "ConfiguracionPeriodizacion",
        back_populates="contexto",
        cascade="all, delete-orphan",
    )
