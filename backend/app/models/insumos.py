from sqlalchemy import Column, Integer, String, Text, Date, DECIMAL, ForeignKey, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import TipoInsumoEnum, TrimestreEnum


class Insumo(Base):
    __tablename__ = "insumos"

    id_insumo = Column(Integer, primary_key=True, index=True)
    id_cmd = Column(Integer, ForeignKey("cursos_materias_docentes.id_cmd", ondelete="CASCADE"), nullable=False)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_creacion = Column(Date, nullable=False)
    ponderacion = Column(DECIMAL(5,2), nullable=False)
    tipo_insumo = Column(Enum(TipoInsumoEnum), nullable=False)
    trimestre = Column(Integer, nullable=False)  # 1, 2 o 3

    __table_args__ = (
        UniqueConstraint("id_cmd", "nombre", name="uq_insumo_curso"),
        # Restricción para garantizar solo un proyecto por trimestre por curso-materia
        UniqueConstraint("id_cmd", "trimestre", "tipo_insumo", 
                        name="uq_proyecto_examen_por_trimestre"),
    )

    cmd = relationship("CursoMateriaDocente", back_populates="insumos")
    notas = relationship("Nota", back_populates="insumo")
