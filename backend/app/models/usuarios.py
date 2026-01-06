from sqlalchemy import Boolean, Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import RolUsuarioEnum


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    correo = Column(String(150), unique=True, nullable=False)
    contrasena = Column(String(200), nullable=False)
    rol = Column(Enum(RolUsuarioEnum, name="rol_usuario"), nullable=False)
    activo = Column(Boolean, default=True)

    cursos_tutor = relationship("Curso", foreign_keys="Curso.id_tutor", back_populates="tutor")
    asignaciones_docente = relationship("CursoMateriaDocente", back_populates="docente")