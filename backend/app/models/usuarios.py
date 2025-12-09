from sqlalchemy import Column, Integer, String, Enum
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

    cursos_dictados = relationship("Curso", foreign_keys="Curso.id_docente")
    cursos_tutor = relationship("Curso", foreign_keys="Curso.id_tutor")