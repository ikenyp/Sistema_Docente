from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Institucion(Base):
    __tablename__ = "instituciones"

    id_institucion = Column(Integer, primary_key=True)
    nombre = Column(String(160), nullable=False)
    slug = Column(String(120), nullable=False, unique=True)
    activo = Column(Boolean, nullable=False, default=True)

    contextos = relationship("Contexto", back_populates="institucion")
