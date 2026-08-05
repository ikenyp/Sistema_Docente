from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Curso(Base):
    __tablename__ = "cursos"

    id_curso = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    anio_lectivo = Column(String(20), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contextos.id_contexto"), nullable=False)
    id_estructura_academica = Column(
        Integer,
        ForeignKey("estructuras_academicas.id_estructura_academica"),
        nullable=True,
    )

    id_tutor = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)

    __table_args__ = (UniqueConstraint("id_contexto", "nombre", "anio_lectivo", name="uq_curso_contexto_nombre_anio"),)

    tutor = relationship("Usuario", foreign_keys=[id_tutor], back_populates="cursos_tutor")
    contexto = relationship("Contexto", back_populates="cursos")
    estructura_academica = relationship("EstructuraAcademica", back_populates="cursos")

    estudiantes = relationship("Estudiante", back_populates="curso_actual")
    materias_docentes = relationship("CursoMateriaDocente", back_populates="curso")
    comportamientos = relationship("Comportamiento", back_populates="curso")

