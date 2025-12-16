from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Curso(Base):
    __tablename__ = "cursos"

    id_curso = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    anio_lectivo = Column(String(20), nullable=False)

    id_docente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_tutor = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    docente = relationship("Usuario", foreign_keys=[id_docente], back_populates="cursos_dictados", overlaps="cursos_tutor")
    tutor = relationship("Usuario", foreign_keys=[id_tutor], back_populates="cursos_tutor", overlaps="cursos_dictados")

    estudiantes = relationship("Estudiante", back_populates="curso_actual")
    materias_docentes = relationship("CursoMateriaDocente", back_populates="curso")

