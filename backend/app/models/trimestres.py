from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Trimestre(Base):
    __tablename__ = "trimestres"

    id_trimestre = Column(Integer, primary_key=True, index=True)
    id_curso = Column(Integer, ForeignKey("cursos.id_curso", ondelete="CASCADE"), nullable=False)
    numero_trimestre = Column(Integer, nullable=False)  # 1, 2 o 3
    anio_lectivo = Column(String(20), nullable=False)  # Ej: "2025-2026"
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint("id_curso", "numero_trimestre", "anio_lectivo", 
                        name="uq_trimestre_curso_numero_anio"),
    )

    # Relaciones
    curso = relationship("Curso", back_populates="trimestres")
    insumos = relationship("Insumo", back_populates="trimestre")
