from sqlalchemy import Column, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class PeriodoAcademico(Base):
    __tablename__ = "periodos_academicos"

    id_periodo = Column(Integer, primary_key=True, index=True)
    id_config_periodizacion = Column(
        Integer,
        ForeignKey("configuracion_periodizacion.id_config_periodizacion", ondelete="CASCADE"),
        nullable=False,
    )
    numero_periodo = Column(Integer, nullable=False)
    nombre_periodo = Column(String(80), nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "id_config_periodizacion",
            "numero_periodo",
            name="uq_periodo_config_numero",
        ),
    )

    configuracion = relationship("ConfiguracionPeriodizacion", back_populates="periodos")
