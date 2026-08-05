from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConfiguracionPeriodizacion(Base):
    __tablename__ = "configuracion_periodizacion"

    id_config_periodizacion = Column(Integer, primary_key=True, index=True)
    id_contexto = Column(
        Integer,
        ForeignKey("contextos.id_contexto", ondelete="CASCADE"),
        nullable=False,
    )
    anio_lectivo = Column(String(20), nullable=False)
    tipo_periodizacion = Column(String(20), nullable=False)
    cantidad_periodos = Column(Integer, nullable=False)
    nombre_periodo_singular = Column(String(30), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "id_contexto",
            "anio_lectivo",
            name="uq_config_periodizacion_contexto_anio",
        ),
    )

    contexto = relationship("Contexto", back_populates="configuraciones_periodizacion")
    periodos = relationship(
        "PeriodoAcademico",
        back_populates="configuracion",
        cascade="all, delete-orphan",
        order_by="PeriodoAcademico.numero_periodo",
    )
