from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.trimestres import Trimestre
from app.schemas.trimestres import TrimestreCreate, TrimestreUpdate
from typing import List, Optional


def create_trimestre(db: Session, trimestre: TrimestreCreate) -> Trimestre:
    """Crear un nuevo trimestre"""
    db_trimestre = Trimestre(**trimestre.model_dump())
    db.add(db_trimestre)
    db.commit()
    db.refresh(db_trimestre)
    return db_trimestre


def get_trimestre(db: Session, id_trimestre: int) -> Optional[Trimestre]:
    """Obtener un trimestre por ID"""
    return db.query(Trimestre).filter(Trimestre.id_trimestre == id_trimestre).first()


def get_trimestres_by_curso(db: Session, id_curso: int) -> List[Trimestre]:
    """Obtener todos los trimestres de un curso"""
    return db.query(Trimestre).filter(Trimestre.id_curso == id_curso).order_by(Trimestre.numero_trimestre).all()


def get_trimestres_by_curso_anio(db: Session, id_curso: int, anio_lectivo: str) -> List[Trimestre]:
    """Obtener trimestres de un curso para un año lectivo específico"""
    return db.query(Trimestre).filter(
        and_(
            Trimestre.id_curso == id_curso,
            Trimestre.anio_lectivo == anio_lectivo
        )
    ).order_by(Trimestre.numero_trimestre).all()


def get_trimestre_activo(db: Session, id_curso: int) -> Optional[Trimestre]:
    """Obtener el trimestre activo actual basándose en la fecha"""
    from datetime import date
    hoy = date.today()
    return db.query(Trimestre).filter(
        and_(
            Trimestre.id_curso == id_curso,
            Trimestre.fecha_inicio <= hoy,
            Trimestre.fecha_fin >= hoy
        )
    ).first()


def update_trimestre(db: Session, id_trimestre: int, trimestre: TrimestreUpdate) -> Optional[Trimestre]:
    """Actualizar un trimestre"""
    db_trimestre = get_trimestre(db, id_trimestre)
    if not db_trimestre:
        return None
    
    update_data = trimestre.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_trimestre, key, value)
    
    db.commit()
    db.refresh(db_trimestre)
    return db_trimestre


def delete_trimestre(db: Session, id_trimestre: int) -> bool:
    """Eliminar un trimestre"""
    db_trimestre = get_trimestre(db, id_trimestre)
    if not db_trimestre:
        return False
    
    db.delete(db_trimestre)
    db.commit()
    return True


def get_all_trimestres(db: Session, skip: int = 0, limit: int = 100) -> List[Trimestre]:
    """Obtener todos los trimestres con paginación"""
    return db.query(Trimestre).offset(skip).limit(limit).all()
