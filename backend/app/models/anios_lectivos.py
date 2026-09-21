from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func, text
from sqlalchemy.orm import relationship

from app.core.database import Base


class AnioLectivo(Base):
    __tablename__ = "anios_lectivos"

    id_anio_lectivo = Column(Integer, primary_key=True)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto"), nullable=False)
    anio_lectivo = Column(String(20), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    cerrado_en = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("id_contexto", "anio_lectivo", name="uq_anio_lectivo_contexto_anio"),
        Index(
            "uq_anio_activo_por_contexto",
            "id_contexto",
            unique=True,
            postgresql_where=text("activo = true"),
        ),
    )

    contexto = relationship("Contexto")
