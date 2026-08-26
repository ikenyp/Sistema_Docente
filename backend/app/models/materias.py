from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Index, text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Materia(Base):
    __tablename__ = "materias"

    id_materia = Column(Integer, primary_key=True)
    codigo = Column(String(30), nullable=True)
    nombre = Column(String(120), nullable=False)
    descripcion = Column(String(255), nullable=True)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto"), nullable=False)
    eliminado = Column(Boolean, default=False)

    __table_args__ = (
        Index(
            "ix_materia_contexto_codigo_activo",
            "id_contexto",
            "codigo",
            unique=True,
            postgresql_where=text("eliminado = false"),
        ),
    )

    contexto = relationship("Contexto", back_populates="materias")
    cursos_materias = relationship("CursoMateriaDocente", back_populates="materia")
    estructuras = relationship("EstructuraMateria", back_populates="materia")
