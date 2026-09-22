from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class UsuarioContexto(Base):
    __tablename__ = "usuarios_contextos"
    __table_args__ = (
        UniqueConstraint("id_usuario", "id_contexto", name="uq_usuario_contexto"),
    )

    id_usuario_contexto = Column(Integer, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto", ondelete="CASCADE"), nullable=False)
    rol = Column(String(30), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)

    usuario = relationship("Usuario", back_populates="membresias_contexto")
    contexto = relationship("Contexto", back_populates="membresias")
