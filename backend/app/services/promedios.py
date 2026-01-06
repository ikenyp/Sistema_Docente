"""
Servicio de cálculo de promedios para estudiantes.

Estructura de ponderación por trimestre:
- Actividades: 10%
- Proyecto Trimestral: 20%
- Examen Trimestral: 70%

Promedio Final = (Promedio T1 + Promedio T2 + Promedio T3) / 3
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.models.notas import Nota
from app.models.insumos import Insumo
from app.models.enums import TipoInsumoEnum
from app.models.trimestres import Trimestre
from app.models.estudiantes import Estudiante
from app.models.cursos_materias_docentes import CursoMateriaDocente


# Ponderaciones constantes
PONDERACION_ACTIVIDADES = Decimal("0.10")  # 10%
PONDERACION_PROYECTO = Decimal("0.20")  # 20%
PONDERACION_EXAMEN = Decimal("0.70")  # 70%


async def calcular_promedio_trimestral(
    db: AsyncSession,
    id_estudiante: int,
    id_curso: int,
    numero_trimestre: int,
    anio_lectivo: str
) -> dict:
    """
    Calcula el promedio de un estudiante en un trimestre específico para un curso.
    
    Estructura:
    - Promedio actividades = promedio de todas las notas de actividades
    - Promedio proyecto = nota del proyecto trimestral (hay solo uno)
    - Promedio examen = nota del examen trimestral (hay solo uno)
    - Promedio trimestral = (actividades * 0.10) + (proyecto * 0.20) + (examen * 0.70)
    
    Args:
        db: Sesión de base de datos
        id_estudiante: ID del estudiante
        id_curso: ID del curso
        numero_trimestre: Número del trimestre (1, 2 o 3)
        anio_lectivo: Año lectivo (ej: "2025-2026")
    
    Returns:
        dict con detalles del cálculo o None si no hay datos
    """
    # Validar que el estudiante exista
    estudiante = await db.execute(
        select(Estudiante).where(Estudiante.id_estudiante == id_estudiante)
    )
    if not estudiante.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )

    # Obtener el trimestre
    trimestre = await db.execute(
        select(Trimestre).where(
            Trimestre.id_curso == id_curso,
            Trimestre.numero_trimestre == numero_trimestre,
            Trimestre.anio_lectivo == anio_lectivo
        )
    )
    trimestre_obj = trimestre.scalar_one_or_none()
    if not trimestre_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trimestre {numero_trimestre} no encontrado para el curso"
        )

    # Obtener todos los insumos del trimestre para el curso
    insumos = await db.execute(
        select(Insumo).where(
            Insumo.id_trimestre == trimestre_obj.id_trimestre,
            CursoMateriaDocente.id_curso == id_curso
        ).join(CursoMateriaDocente)
    )
    insumos_list = insumos.scalars().all()

    # Separar insumos por tipo
    insumos_actividades = [i for i in insumos_list if i.tipo_insumo == TipoInsumoEnum.actividad]
    insumos_proyecto = [i for i in insumos_list if i.tipo_insumo == TipoInsumoEnum.proyecto_trimestral]
    insumos_examen = [i for i in insumos_list if i.tipo_insumo == TipoInsumoEnum.examen_trimestral]

    # Inicializar resultados
    result = {
        "id_estudiante": id_estudiante,
        "id_curso": id_curso,
        "numero_trimestre": numero_trimestre,
        "anio_lectivo": anio_lectivo,
        "promedio_actividades": None,
        "promedio_proyecto": None,
        "promedio_examen": None,
        "promedio_trimestral": None,
        "detalles": {
            "notas_actividades": [],
            "nota_proyecto": None,
            "nota_examen": None
        }
    }

    # Calcular promedio de actividades
    if insumos_actividades:
        notas_actividades = await db.execute(
            select(Nota).where(
                Nota.id_estudiante == id_estudiante,
                Nota.id_insumo.in_([i.id_insumo for i in insumos_actividades])
            )
        )
        notas_actividades_list = notas_actividades.scalars().all()
        
        if notas_actividades_list:
            suma_notas = sum(float(n.calificacion) for n in notas_actividades_list)
            promedio_actividades = Decimal(str(suma_notas / len(notas_actividades_list)))
            result["promedio_actividades"] = float(round(promedio_actividades, 2))
            result["detalles"]["notas_actividades"] = [
                {
                    "id_insumo": n.id_insumo,
                    "nombre_insumo": n.insumo.nombre,
                    "calificacion": float(n.calificacion)
                }
                for n in notas_actividades_list
            ]

    # Obtener nota del proyecto trimestral
    if insumos_proyecto:
        nota_proyecto = await db.execute(
            select(Nota).where(
                Nota.id_estudiante == id_estudiante,
                Nota.id_insumo == insumos_proyecto[0].id_insumo
            )
        )
        nota_proyecto_obj = nota_proyecto.scalar_one_or_none()
        if nota_proyecto_obj:
            result["promedio_proyecto"] = float(nota_proyecto_obj.calificacion)
            result["detalles"]["nota_proyecto"] = {
                "id_insumo": nota_proyecto_obj.id_insumo,
                "nombre_insumo": nota_proyecto_obj.insumo.nombre,
                "calificacion": float(nota_proyecto_obj.calificacion)
            }

    # Obtener nota del examen trimestral
    if insumos_examen:
        nota_examen = await db.execute(
            select(Nota).where(
                Nota.id_estudiante == id_estudiante,
                Nota.id_insumo == insumos_examen[0].id_insumo
            )
        )
        nota_examen_obj = nota_examen.scalar_one_or_none()
        if nota_examen_obj:
            result["promedio_examen"] = float(nota_examen_obj.calificacion)
            result["detalles"]["nota_examen"] = {
                "id_insumo": nota_examen_obj.id_insumo,
                "nombre_insumo": nota_examen_obj.insumo.nombre,
                "calificacion": float(nota_examen_obj.calificacion)
            }

    # Calcular promedio trimestral si hay al menos un componente
    componentes = [
        result["promedio_actividades"],
        result["promedio_proyecto"],
        result["promedio_examen"]
    ]
    
    if any(c is not None for c in componentes):
        promedio = Decimal("0")
        
        if result["promedio_actividades"] is not None:
            promedio += Decimal(str(result["promedio_actividades"])) * PONDERACION_ACTIVIDADES
        
        if result["promedio_proyecto"] is not None:
            promedio += Decimal(str(result["promedio_proyecto"])) * PONDERACION_PROYECTO
        
        if result["promedio_examen"] is not None:
            promedio += Decimal(str(result["promedio_examen"])) * PONDERACION_EXAMEN
        
        result["promedio_trimestral"] = float(round(promedio, 2))

    return result


async def calcular_promedio_final(
    db: AsyncSession,
    id_estudiante: int,
    id_curso: int,
    anio_lectivo: str
) -> dict:
    """
    Calcula el promedio final de un estudiante en un curso.
    
    Promedio Final = (Promedio T1 + Promedio T2 + Promedio T3) / 3
    
    Args:
        db: Sesión de base de datos
        id_estudiante: ID del estudiante
        id_curso: ID del curso
        anio_lectivo: Año lectivo (ej: "2025-2026")
    
    Returns:
        dict con detalles del cálculo
    """
    # Validar que el estudiante exista
    estudiante = await db.execute(
        select(Estudiante).where(Estudiante.id_estudiante == id_estudiante)
    )
    if not estudiante.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )

    # Calcular promedios por trimestre
    promedios_trimestrales = []
    promedio_final = None
    suma_promedios = Decimal("0")
    trimestres_con_datos = 0

    for num_trimestre in [1, 2, 3]:
        promedio_trimestral = await calcular_promedio_trimestral(
            db,
            id_estudiante,
            id_curso,
            num_trimestre,
            anio_lectivo
        )
        promedios_trimestrales.append(promedio_trimestral)
        
        if promedio_trimestral["promedio_trimestral"] is not None:
            suma_promedios += Decimal(str(promedio_trimestral["promedio_trimestral"]))
            trimestres_con_datos += 1

    # Calcular promedio final si hay al menos un trimestre con datos
    if trimestres_con_datos > 0:
        promedio_final = float(round(suma_promedios / trimestres_con_datos, 2))

    return {
        "id_estudiante": id_estudiante,
        "id_curso": id_curso,
        "anio_lectivo": anio_lectivo,
        "promedio_final": promedio_final,
        "promedios_trimestrales": promedios_trimestrales,
        "trimestres_con_datos": trimestres_con_datos
    }


async def obtener_promedios_curso(
    db: AsyncSession,
    id_curso: int,
    numero_trimestre: int | None = None,
    anio_lectivo: str | None = None
) -> list:
    """
    Obtiene los promedios de todos los estudiantes en un curso.
    
    Args:
        db: Sesión de base de datos
        id_curso: ID del curso
        numero_trimestre: Número de trimestre (opcional, para filtrar por trimestre)
        anio_lectivo: Año lectivo (requerido si se especifica numero_trimestre)
    
    Returns:
        Lista con promedios de todos los estudiantes
    """
    # Obtener todos los estudiantes del curso
    estudiantes = await db.execute(
        select(Estudiante).where(Estudiante.id_curso_actual == id_curso)
    )
    estudiantes_list = estudiantes.scalars().all()

    promedios = []

    if numero_trimestre is not None and anio_lectivo is not None:
        # Promedios por trimestre
        for estudiante in estudiantes_list:
            promedio = await calcular_promedio_trimestral(
                db,
                estudiante.id_estudiante,
                id_curso,
                numero_trimestre,
                anio_lectivo
            )
            promedios.append(promedio)
    else:
        # Promedios finales (si no se especifica trimestre)
        # Intentar obtener el año lectivo actual
        if not anio_lectivo:
            # Buscar el año lectivo más reciente
            trimestre = await db.execute(
                select(Trimestre).where(Trimestre.id_curso == id_curso)
                .order_by(Trimestre.anio_lectivo.desc())
                .limit(1)
            )
            trimestre_obj = trimestre.scalar_one_or_none()
            if trimestre_obj:
                anio_lectivo = trimestre_obj.anio_lectivo

        if anio_lectivo:
            for estudiante in estudiantes_list:
                promedio = await calcular_promedio_final(
                    db,
                    estudiante.id_estudiante,
                    id_curso,
                    anio_lectivo
                )
                promedios.append(promedio)

    return promedios
