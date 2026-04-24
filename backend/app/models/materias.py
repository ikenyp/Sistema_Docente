from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Materia(Base):
    __tablename__ = "materias"

    id_materia = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto"), nullable=False)
    eliminado = Column(Boolean, default=False)

    contexto = relationship("Contexto", back_populates="materias")
    cursos_materias = relationship("CursoMateriaDocente", back_populates="materia")