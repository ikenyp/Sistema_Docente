from pydantic import BaseModel, Field
from typing import Optional

from app.schemas.materias import MateriaResponse


class EstructuraAcademicaBase(BaseModel):
    nombre: str = Field(..., max_length=120)
    nivel: str = Field(..., max_length=80)
    subnivel: Optional[str] = Field(None, max_length=80)
    modalidad: Optional[str] = Field(None, max_length=80)
    especialidad: Optional[str] = Field(None, max_length=120)


class EstructuraAcademicaCreate(EstructuraAcademicaBase):
    pass


class EstructuraAcademicaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=120)
    nivel: Optional[str] = Field(None, max_length=80)
    subnivel: Optional[str] = Field(None, max_length=80)
    modalidad: Optional[str] = Field(None, max_length=80)
    especialidad: Optional[str] = Field(None, max_length=120)
    activo: Optional[bool] = None

    model_config = {"from_attributes": True}


class EstructuraAcademicaResponse(EstructuraAcademicaBase):
    id_estructura_academica: int
    activo: bool

    model_config = {"from_attributes": True}


class EstructuraMateriaCreate(BaseModel):
    id_materia: int
    orden: int = Field(1, ge=1)
    obligatoria: bool = True


class EstructuraMateriaResponse(BaseModel):
    id_estructura_materia: int
    id_estructura_academica: int
    id_materia: int
    orden: int
    obligatoria: bool
    materia: MateriaResponse

    model_config = {"from_attributes": True}
