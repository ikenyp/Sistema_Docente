from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class Materia(Base):
    __tablename__ = "materias"

    id_materia = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    eliminado = Column(Boolean, default=False)

    cursos_materias = relationship("CursoMateriaDocente", back_populates="materia")