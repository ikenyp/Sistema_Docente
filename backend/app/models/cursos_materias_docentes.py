from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class CursoMateriaDocente(Base):
    __tablename__ = "cursos_materias_docentes"

    id_cmd = Column(Integer, primary_key=True)
    id_curso = Column(Integer, ForeignKey("cursos.id_curso", ondelete="CASCADE"), nullable=False)
    id_materia = Column(Integer, ForeignKey("materias.id_materia"), nullable=False)
    id_docente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    __table_args__ = (UniqueConstraint("id_curso", "id_materia", name="uq_curso_materia"),)

    curso = relationship("Curso", back_populates="materias_docentes")
    materia = relationship("Materia", back_populates="cursos_materias")
    docente = relationship("Usuario")
    
    insumos = relationship("Insumo", back_populates="cmd")
    asistencias = relationship("Asistencia", back_populates="cmd")
