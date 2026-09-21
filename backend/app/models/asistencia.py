from sqlalchemy import Column, Date, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import EstadoAsistenciaEnum


class Asistencia(Base):
    __tablename__ = "asistencia"

    id_asistencia = Column(Integer, primary_key=True)
    id_cmd = Column(Integer, ForeignKey("cursos_materias_docentes.id_cmd", ondelete="CASCADE"), nullable=False)
    id_estudiante = Column(Integer, ForeignKey("estudiantes.id_estudiante", ondelete="CASCADE"), nullable=False)
    fecha = Column(Date, nullable=False)
    estado = Column(Enum(EstadoAsistenciaEnum, name="estado_asistencia"), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "id_cmd",
            "id_estudiante",
            "fecha",
            name="uq_asistencia_cmd_estudiante_fecha",
        ),
    )

    cmd = relationship("CursoMateriaDocente", back_populates="asistencias")
    estudiante = relationship("Estudiante", back_populates="asistencias")
