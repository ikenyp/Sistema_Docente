from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class EstructuraAcademica(Base):
    __tablename__ = "estructuras_academicas"

    id_estructura_academica = Column(Integer, primary_key=True)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto"), nullable=False)
    anio_lectivo = Column(String(9), nullable=False)
    nombre = Column(String(120), nullable=False)
    nivel = Column(String(80), nullable=False)
    subnivel = Column(String(80), nullable=True)
    modalidad = Column(String(80), nullable=True)
    especialidad = Column(String(120), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "id_contexto",
            "anio_lectivo",
            "nombre",
            name="uq_estructura_academica_contexto_anio_nombre",
        ),
    )

    contexto = relationship("Contexto")
    cursos = relationship("Curso", back_populates="estructura_academica")
    materias = relationship(
        "EstructuraMateria",
        back_populates="estructura_academica",
        cascade="all, delete-orphan",
    )


class EstructuraMateria(Base):
    __tablename__ = "estructuras_materias"

    id_estructura_materia = Column(Integer, primary_key=True)
    id_estructura_academica = Column(
        Integer,
        ForeignKey("estructuras_academicas.id_estructura_academica", ondelete="CASCADE"),
        nullable=False,
    )
    id_materia = Column(Integer, ForeignKey("materias.id_materia"), nullable=False)
    orden = Column(Integer, nullable=False, default=1)
    obligatoria = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "id_estructura_academica",
            "id_materia",
            name="uq_estructura_materia",
        ),
    )

    estructura_academica = relationship("EstructuraAcademica", back_populates="materias")
    materia = relationship("Materia", back_populates="estructuras")
