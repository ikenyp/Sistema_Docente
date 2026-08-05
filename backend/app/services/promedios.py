"""Servicio de calculo de promedios por periodo academico."""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.models.notas import Nota
from app.models.insumos import Insumo
from app.models.enums import TipoInsumoEnum
from app.models.configuracion_periodizacion import ConfiguracionPeriodizacion
from app.models.periodos_academicos import PeriodoAcademico
from app.models.estudiantes import Estudiante
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso


# Ponderaciones constantes
PONDERACION_ACTIVIDADES = Decimal("0.10")  # 10%
PONDERACION_PROYECTO = Decimal("0.20")  # 20%
PONDERACION_EXAMEN = Decimal("0.70")  # 70%


async def _obtener_configuracion_periodizacion(
    db: AsyncSession,
    id_contexto: int,
    anio_lectivo: str,
):
    result = await db.execute(
        select(ConfiguracionPeriodizacion)
        .where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == anio_lectivo,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay configuracion de periodizacion para el contexto y ano lectivo indicados",
        )
    return config


async def calcular_promedio_periodo(
    db: AsyncSession,
    id_contexto: int,
    id_estudiante: int,
    id_curso: int,
    numero_periodo: int,
    anio_lectivo: str
) -> dict:
    """
    Calcula el promedio de un estudiante en un periodo especifico para un curso.
    
    Estructura:
    - Promedio actividades = promedio de todas las notas de actividades
    - Promedio proyecto = nota del proyecto del periodo (hay solo uno)
    - Promedio examen = nota del examen del periodo (hay solo uno)
    - Promedio del periodo = (actividades * 0.10) + (proyecto * 0.20) + (examen * 0.70)
    
    Args:
        db: Sesión de base de datos
        id_estudiante: ID del estudiante
        id_curso: ID del curso
        numero_periodo: Numero del periodo academico
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

    curso_result = await db.execute(
        select(Curso).where(Curso.id_curso == id_curso, Curso.id_contexto == id_contexto)
    )
    curso_obj = curso_result.scalar_one_or_none()
    if not curso_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado en el contexto actual"
        )

    config = await _obtener_configuracion_periodizacion(db, id_contexto, anio_lectivo)

    periodo_result = await db.execute(
        select(PeriodoAcademico)
        .where(PeriodoAcademico.id_config_periodizacion == config.id_config_periodizacion)
        .where(PeriodoAcademico.numero_periodo == numero_periodo)
    )
    periodo_obj = periodo_result.scalar_one_or_none()
    if not periodo_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Periodo {numero_periodo} no encontrado para el curso",
        )

    # Obtener todos los insumos del periodo para el curso
    insumos = await db.execute(
        select(Insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(
            Insumo.id_periodo == periodo_obj.id_periodo,
            CursoMateriaDocente.id_curso == id_curso,
            Curso.id_contexto == id_contexto,
        )
    )
    insumos_list = insumos.scalars().all()

    # Separar insumos por tipo
    insumos_actividades = [i for i in insumos_list if i.tipo_insumo == TipoInsumoEnum.actividad]
    insumos_proyecto = [i for i in insumos_list if i.tipo_insumo == TipoInsumoEnum.proyecto_periodo]
    insumos_examen = [i for i in insumos_list if i.tipo_insumo == TipoInsumoEnum.examen_periodo]

    # Inicializar resultados
    result = {
        "id_estudiante": id_estudiante,
        "id_curso": id_curso,
        "numero_periodo": numero_periodo,
        "nombre_periodo": periodo_obj.nombre_periodo or f"Periodo {numero_periodo}",
        "anio_lectivo": anio_lectivo,
        "promedio_actividades": None,
        "promedio_proyecto": None,
        "promedio_examen": None,
        "promedio_periodo": None,
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

    # Obtener nota del proyecto del periodo
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

    # Obtener nota del examen del periodo
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

    # Calcular promedio del periodo si hay al menos un componente
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
        
        promedio_redondeado = float(round(promedio, 2))
        result["promedio_periodo"] = promedio_redondeado

    return result


async def calcular_promedio_final(
    db: AsyncSession,
    id_contexto: int,
    id_estudiante: int,
    id_curso: int,
    anio_lectivo: str
) -> dict:
    """
    Calcula el promedio acumulado de un estudiante en un curso.
    
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

    config = await _obtener_configuracion_periodizacion(db, id_contexto, anio_lectivo)
    periodos_result = await db.execute(
        select(PeriodoAcademico)
        .where(
            PeriodoAcademico.id_config_periodizacion == config.id_config_periodizacion,
        )
        .order_by(PeriodoAcademico.numero_periodo.asc())
    )
    periodos = periodos_result.scalars().all()
    if not periodos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay periodos configurados para el contexto y ano lectivo indicados"
        )

    # Calcular promedios por periodo
    promedios_por_periodo = []
    promedio_acumulado = None
    suma_promedios = Decimal("0")
    periodos_con_datos = 0

    for periodo in periodos:
        promedio_periodo = await calcular_promedio_periodo(
            db,
            id_contexto,
            id_estudiante,
            id_curso,
            periodo.numero_periodo,
            anio_lectivo
        )
        promedios_por_periodo.append(promedio_periodo)
        
        if promedio_periodo["promedio_periodo"] is not None:
            suma_promedios += Decimal(str(promedio_periodo["promedio_periodo"]))
            periodos_con_datos += 1

    if periodos_con_datos > 0:
        promedio_acumulado = float(round(suma_promedios / periodos_con_datos, 2))

    return {
        "id_estudiante": id_estudiante,
        "id_curso": id_curso,
        "anio_lectivo": anio_lectivo,
        "promedio_acumulado": promedio_acumulado,
        "promedios_por_periodo": promedios_por_periodo,
        "periodos_con_datos": periodos_con_datos,
        "cantidad_periodos": len(periodos),
        "cantidad_periodos_configurada": len(periodos),
        "tipo_periodizacion": config.tipo_periodizacion,
    }


async def obtener_promedios_curso(
    db: AsyncSession,
    id_contexto: int,
    id_curso: int,
    numero_periodo: int | None = None,
    anio_lectivo: str | None = None
) -> list:
    """
    Obtiene los promedios de todos los estudiantes en un curso.
    
    Args:
        db: Sesión de base de datos
        id_curso: ID del curso
        numero_periodo: Numero de periodo academico (opcional)
        anio_lectivo: Ano lectivo (requerido si se especifica numero_periodo)
    
    Returns:
        Lista con promedios de todos los estudiantes
    """
    # Obtener todos los estudiantes del curso
    # Validar que el curso exista en el contexto actual
    curso = await db.execute(
        select(Curso).where(Curso.id_curso == id_curso, Curso.id_contexto == id_contexto)
    )
    if not curso.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado en el contexto actual"
        )

    estudiantes = await db.execute(
        select(Estudiante).where(Estudiante.id_curso_actual == id_curso)
    )
    estudiantes_list = estudiantes.scalars().all()

    promedios = []

    if numero_periodo is not None and anio_lectivo is not None:
        for estudiante in estudiantes_list:
            promedio = await calcular_promedio_periodo(
                db,
                id_contexto,
                estudiante.id_estudiante,
                id_curso,
                numero_periodo,
                anio_lectivo
            )
            promedios.append(promedio)
    else:
        # Promedios acumulados (si no se especifica periodo)
        # Intentar obtener el ano lectivo actual
        if not anio_lectivo:
            # Buscar el año lectivo más reciente
            configuracion = await db.execute(
                select(ConfiguracionPeriodizacion)
                .where(ConfiguracionPeriodizacion.id_contexto == id_contexto)
                .order_by(ConfiguracionPeriodizacion.anio_lectivo.desc())
                .limit(1)
            )
            configuracion_obj = configuracion.scalar_one_or_none()
            if configuracion_obj:
                anio_lectivo = configuracion_obj.anio_lectivo

        if anio_lectivo:
            for estudiante in estudiantes_list:
                promedio = await calcular_promedio_final(
                    db,
                    id_contexto,
                    estudiante.id_estudiante,
                    id_curso,
                    anio_lectivo
                )
                promedios.append(promedio)

    return promedios
