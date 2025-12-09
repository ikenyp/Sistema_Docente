from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Nota(Base):
    __tablename__ = "notas"

    id_nota = Column(Integer, primary_key=True)
    id_insumo = Column(Integer, ForeignKey("insumos.id_insumo", ondelete="CASCADE"), nullable=False)
    id_estudiante = Column(Integer, ForeignKey("estudiantes.id_estudiante", ondelete="CASCADE"), nullable=False)
    calificacion = Column(DECIMAL(5,2), nullable=False)
    fecha_asignacion = Column(Date)

    __table_args__ = (UniqueConstraint("id_estudiante", "id_insumo", name="uq_estudiante_insumo"),)

    insumo = relationship("Insumo", back_populates="notas")
    estudiante = relationship("Estudiante", back_populates="notas")
