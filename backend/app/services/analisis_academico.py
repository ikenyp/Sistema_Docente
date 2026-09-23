from collections import defaultdict
from statistics import mean

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.asistencia import Asistencia
from app.models.cursos import Curso
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.estudiantes import Estudiante
from app.models.insumos import Insumo
from app.models.notas import Nota
from app.schemas.analisis import (
    AnalisisAlerta,
    AnalisisActividad,
    AnalisisCursoResponse,
    AnalisisCursoResumen,
    AnalisisEstudianteResumen,
    AnalisisGrupo,
    AnalisisMateria,
    AnalisisSituacion,
)


APROBACION_MINIMA = 7.0
ESTADOS_ASISTENCIA = {"presente", "justificado", "atraso"}


def _estado(valor) -> str:
    return getattr(valor, "value", valor)


def _nombre(estudiante: Estudiante) -> str:
    return f"{estudiante.apellido} {estudiante.nombre}".strip()


def _prioridad_por_afectados(cantidad: int, umbral_alto: int, umbral_medio: int) -> str:
    if cantidad >= umbral_alto:
        return "alta"
    if cantidad >= umbral_medio:
        return "media"
    return "baja"


def _nota_sobre_diez(nota: Nota, insumo: Insumo) -> float | None:
    maximo = float(insumo.ponderacion or 0)
    if maximo <= 0:
        return None
    return float(nota.calificacion) * 10 / maximo


async def analizar_curso(
    db: AsyncSession,
    curso: Curso,
    id_docente: int | None = None,
) -> AnalisisCursoResponse:
    """Construye indicadores explicables sin modificar datos académicos."""
    estudiantes_result = await db.execute(
        select(Estudiante)
        .where(
            Estudiante.id_curso_actual == curso.id_curso,
            Estudiante.id_contexto == curso.id_contexto,
            Estudiante.anio_lectivo == curso.anio_lectivo,
            Estudiante.eliminado.is_(False),
        )
        .order_by(Estudiante.apellido, Estudiante.nombre)
    )
    estudiantes = list(estudiantes_result.scalars().all())
    estudiante_ids = {est.id_estudiante for est in estudiantes}
    nombres_estudiantes = {est.id_estudiante: _nombre(est) for est in estudiantes}

    filtros_cmd = [CursoMateriaDocente.id_curso == curso.id_curso]
    if id_docente is not None:
        filtros_cmd.append(CursoMateriaDocente.id_docente == id_docente)
    cmd_result = await db.execute(
        select(CursoMateriaDocente)
        .options(joinedload(CursoMateriaDocente.materia))
        .where(*filtros_cmd)
    )
    asignaciones = list(cmd_result.scalars().all())
    cmd_ids = [cmd.id_cmd for cmd in asignaciones]
    materia_por_cmd = {
        cmd.id_cmd: (cmd.materia.id_materia, cmd.materia.nombre)
        for cmd in asignaciones
        if cmd.materia
    }

    insumos: list[Insumo] = []
    if cmd_ids:
        insumos_result = await db.execute(
            select(Insumo).options(joinedload(Insumo.periodo)).where(Insumo.id_cmd.in_(cmd_ids))
        )
        insumos = list(insumos_result.scalars().all())

    insumo_ids = [insumo.id_insumo for insumo in insumos]
    notas: list[Nota] = []
    if insumo_ids and estudiante_ids:
        notas_result = await db.execute(
            select(Nota).where(
                Nota.id_insumo.in_(insumo_ids),
                Nota.id_estudiante.in_(estudiante_ids),
            )
        )
        notas = list(notas_result.scalars().all())

    asistencias: list[Asistencia] = []
    if cmd_ids and estudiante_ids:
        asistencias_result = await db.execute(
            select(Asistencia).where(
                Asistencia.id_cmd.in_(cmd_ids),
                Asistencia.id_estudiante.in_(estudiante_ids),
            )
        )
        asistencias = list(asistencias_result.scalars().all())

    notas_por_estudiante: dict[int, list[float]] = defaultdict(list)
    notas_por_insumo: dict[tuple[int, int], Nota] = {}
    notas_por_insumo_lista: dict[int, list[float]] = defaultdict(list)
    insumo_por_id = {insumo.id_insumo: insumo for insumo in insumos}
    notas_por_estudiante_periodo: dict[int, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    for nota in notas:
        insumo = insumo_por_id.get(nota.id_insumo)
        valor = _nota_sobre_diez(nota, insumo) if insumo else None
        if valor is None:
            continue
        notas_por_estudiante[nota.id_estudiante].append(valor)
        notas_por_insumo[(nota.id_estudiante, nota.id_insumo)] = nota
        notas_por_insumo_lista[nota.id_insumo].append(valor)
        numero_periodo = getattr(insumo.periodo, "numero_periodo", None) if insumo else None
        if numero_periodo is not None:
            notas_por_estudiante_periodo[nota.id_estudiante][numero_periodo].append(valor)

    asistencia_por_estudiante: dict[int, list[str]] = defaultdict(list)
    for registro in asistencias:
        asistencia_por_estudiante[registro.id_estudiante].append(_estado(registro.estado))

    alertas: list[AnalisisAlerta] = []
    estudiantes_resumen: list[AnalisisEstudianteResumen] = []
    for estudiante in estudiantes:
        id_estudiante = estudiante.id_estudiante
        nombre = _nombre(estudiante)
        valores = notas_por_estudiante[id_estudiante]
        promedio = round(mean(valores), 2) if valores else None
        pendientes = max(0, len(insumos) - len(valores))
        asistencias_estudiante = asistencia_por_estudiante[id_estudiante]
        asistencias_favorables = sum(estado in ESTADOS_ASISTENCIA for estado in asistencias_estudiante)
        actividades_pendientes_nombres = [
            insumo.nombre
            for insumo in insumos
            if (id_estudiante, insumo.id_insumo) not in notas_por_insumo
        ]
        porcentaje_asistencia = (
            round(
                asistencias_favorables
                * 100
                / len(asistencias_estudiante),
                2,
            )
            if asistencias_estudiante
            else None
        )
        promedios_periodo = {
            numero: round(mean(valores_periodo), 2)
            for numero, valores_periodo in notas_por_estudiante_periodo[id_estudiante].items()
            if valores_periodo
        }
        periodos_ordenados = sorted(promedios_periodo)
        tendencia_promedio = None
        if len(periodos_ordenados) >= 2:
            tendencia_promedio = round(
                promedios_periodo[periodos_ordenados[-1]]
                - promedios_periodo[periodos_ordenados[-2]],
                2,
            )
        puntaje_riesgo = 0
        alertas_estudiante: list[AnalisisAlerta] = []

        if promedio is not None and promedio < APROBACION_MINIMA:
            puntaje_riesgo += 2
            alertas_estudiante.append(
                AnalisisAlerta(
                    tipo="rendimiento",
                    nivel="alto" if promedio < 6 else "medio",
                    titulo="Promedio bajo la nota de aprobación",
                    descripcion=f"El promedio de notas registradas es {promedio:.2f}, inferior a {APROBACION_MINIMA:.0f}.",
                    recomendacion="Revisar las evidencias disponibles y conversar con el estudiante antes de definir acciones de apoyo.",
                    id_estudiante=id_estudiante,
                    estudiante=nombre,
                )
            )

        if pendientes:
            puntaje_riesgo += 1 if pendientes < 3 else 2
            nivel = "alto" if pendientes >= 3 else "medio"
            alertas_estudiante.append(
                AnalisisAlerta(
                    tipo="actividades_pendientes",
                    nivel=nivel,
                    titulo="Actividades sin calificación registrada",
                    descripcion=f"Hay {pendientes} de {len(insumos)} actividades sin una nota registrada.",
                    recomendacion="Verificar si las actividades están pendientes de entrega o si falta registrar una evaluación.",
                    id_estudiante=id_estudiante,
                    estudiante=nombre,
                )
            )

        if porcentaje_asistencia is not None and porcentaje_asistencia < 80:
            puntaje_riesgo += 1 if porcentaje_asistencia >= 70 else 2
            alertas_estudiante.append(
                AnalisisAlerta(
                    tipo="asistencia",
                    nivel="alto" if porcentaje_asistencia < 70 else "medio",
                    titulo="Asistencia por debajo del nivel esperado",
                    descripcion=f"La asistencia observada es de {porcentaje_asistencia:.2f}%.",
                    recomendacion="Revisar el patrón de inasistencias y realizar seguimiento con el estudiante y su representante según el protocolo institucional.",
                    id_estudiante=id_estudiante,
                    estudiante=nombre,
                )
            )

        if tendencia_promedio is not None and tendencia_promedio <= -1:
            puntaje_riesgo += 1
            alertas_estudiante.append(
                AnalisisAlerta(
                    tipo="tendencia",
                    nivel="alto" if tendencia_promedio <= -2 else "medio",
                    titulo="Descenso reciente del rendimiento",
                    descripcion=f"El promedio bajó {abs(tendencia_promedio):.2f} puntos frente al periodo anterior.",
                    recomendacion="Revisar las últimas actividades y conversar con el estudiante antes de que el descenso continúe.",
                    id_estudiante=id_estudiante,
                    estudiante=nombre,
                )
            )

        alertas.extend(alertas_estudiante)
        estudiantes_resumen.append(
            AnalisisEstudianteResumen(
                id_estudiante=id_estudiante,
                estudiante=nombre,
                promedio_registrado=promedio,
                actividades_registradas=len(valores),
                actividades_pendientes=pendientes,
                actividades_pendientes_nombres=actividades_pendientes_nombres,
                porcentaje_asistencia=porcentaje_asistencia,
                asistencias_favorables=asistencias_favorables,
                asistencias_totales=len(asistencias_estudiante),
                tendencia_promedio=tendencia_promedio,
                puntaje_riesgo=puntaje_riesgo,
                alertas=alertas_estudiante,
            )
        )

    promedios = [item.promedio_registrado for item in estudiantes_resumen if item.promedio_registrado is not None]
    porcentajes_asistencia = [item.porcentaje_asistencia for item in estudiantes_resumen if item.porcentaje_asistencia is not None]
    promedio_curso = round(mean(promedios), 2) if promedios else None
    asistencia_curso = round(mean(porcentajes_asistencia), 2) if porcentajes_asistencia else None
    alertas_altas = sum(alerta.nivel == "alto" for alerta in alertas)
    alertas_medias = sum(alerta.nivel == "medio" for alerta in alertas)
    bajo_aprobacion = sum(
        item.promedio_registrado is not None and item.promedio_registrado < APROBACION_MINIMA
        for item in estudiantes_resumen
    )
    pendientes_totales = sum(item.actividades_pendientes for item in estudiantes_resumen)
    estudiantes_en_riesgo = sum(item.puntaje_riesgo >= 3 for item in estudiantes_resumen)

    actividades = []
    for insumo in insumos:
        valores = notas_por_insumo_lista[insumo.id_insumo]
        materia = materia_por_cmd.get(insumo.id_cmd, (0, "Materia"))
        actividades.append(
            AnalisisActividad(
                id_insumo=insumo.id_insumo,
                nombre=insumo.nombre,
                materia=materia[1],
                estudiantes_esperados=len(estudiantes),
                notas_registradas=len(valores),
                pendientes=max(0, len(estudiantes) - len(valores)),
                promedio=round(mean(valores), 2) if valores else None,
                estudiantes_bajo_aprobacion=sum(valor < APROBACION_MINIMA for valor in valores),
            )
        )

    materia_datos: dict[int, dict] = {}
    for actividad, insumo in zip(actividades, insumos):
        materia_id, materia_nombre = materia_por_cmd.get(insumo.id_cmd, (0, "Materia"))
        datos = materia_datos.setdefault(
            materia_id,
            {"nombre": materia_nombre, "actividades": 0, "valores": [], "bajo": 0},
        )
        datos["actividades"] += 1
        datos["bajo"] += actividad.estudiantes_bajo_aprobacion
        datos["valores"].extend(notas_por_insumo_lista[insumo.id_insumo])

    materias = [
        AnalisisMateria(
            id_materia=materia_id,
            nombre=datos["nombre"],
            actividades=datos["actividades"],
            promedio=round(mean(datos["valores"]), 2) if datos["valores"] else None,
            estudiantes_bajo_aprobacion=datos["bajo"],
        )
        for materia_id, datos in materia_datos.items()
    ]

    grupos = []
    definiciones_grupos = (
        ("riesgo_alto", "Riesgo alto", lambda item: any(alerta.nivel == "alto" for alerta in item.alertas)),
        ("bajo_aprobacion", "Bajo la nota de aprobación", lambda item: any(alerta.tipo == "rendimiento" for alerta in item.alertas)),
        ("asistencia_baja", "Asistencia baja", lambda item: any(alerta.tipo == "asistencia" for alerta in item.alertas)),
        ("actividades_pendientes", "Actividades pendientes", lambda item: any(alerta.tipo == "actividades_pendientes" for alerta in item.alertas)),
        ("riesgo_acumulado", "Riesgo acumulado", lambda item: item.puntaje_riesgo >= 3),
        ("sin_alertas", "Sin alertas detectadas", lambda item: not item.alertas),
    )
    for tipo, nombre, criterio in definiciones_grupos:
        integrantes = [item.id_estudiante for item in estudiantes_resumen if criterio(item)]
        grupos.append(AnalisisGrupo(tipo=tipo, nombre=nombre, cantidad=len(integrantes), id_estudiantes=integrantes))

    situaciones: list[AnalisisSituacion] = []
    for actividad in actividades:
        if actividad.promedio is not None and actividad.promedio < APROBACION_MINIMA:
            estudiantes_bajo_actividad = [
                id_estudiante
                for id_estudiante in estudiante_ids
                if (nota := notas_por_insumo.get((id_estudiante, actividad.id_insumo)))
                and _nota_sobre_diez(nota, insumo_por_id[actividad.id_insumo]) < APROBACION_MINIMA
            ]
            situaciones.append(
                AnalisisSituacion(
                    id_situacion=f"actividad-{actividad.id_insumo}",
                    tipo="actividad_bajo_desempeno",
                    titulo="Actividad con bajo desempeño",
                    descripcion=f"La actividad concentra resultados inferiores a la nota de aprobación.",
                    prioridad=_prioridad_por_afectados(actividad.estudiantes_bajo_aprobacion, 3, 2),
                    afectados=actividad.estudiantes_bajo_aprobacion,
                    id_estudiantes=estudiantes_bajo_actividad,
                    nombres_estudiantes=[nombres_estudiantes[id_estudiante] for id_estudiante in estudiantes_bajo_actividad],
                    materia=actividad.materia,
                    actividad=actividad.nombre,
                    promedio=actividad.promedio,
                    recomendacion="Revisar la actividad, sus instrucciones y los criterios de evaluación antes de definir un refuerzo.",
                )
            )

    estudiantes_asistencia = [
        item for item in estudiantes_resumen
        if any(alerta.tipo == "asistencia" for alerta in item.alertas)
    ]
    if estudiantes_asistencia:
        situaciones.append(
            AnalisisSituacion(
                id_situacion="asistencia-baja-curso",
                tipo="asistencia_baja",
                titulo="Asistencia por debajo del nivel esperado",
                descripcion="Hay estudiantes con un patrón de asistencia inferior al nivel esperado.",
                prioridad=_prioridad_por_afectados(len(estudiantes_asistencia), 3, 2),
                afectados=len(estudiantes_asistencia),
                id_estudiantes=[item.id_estudiante for item in estudiantes_asistencia],
                nombres_estudiantes=[item.estudiante for item in estudiantes_asistencia],
                recomendacion="Revisar las inasistencias y coordinar el seguimiento correspondiente según el protocolo institucional.",
            )
        )

    estudiantes_pendientes = [
        item for item in estudiantes_resumen if item.actividades_pendientes > 0
    ]
    if estudiantes_pendientes:
        situaciones.append(
            AnalisisSituacion(
                id_situacion="actividades-pendientes-curso",
                tipo="actividades_pendientes",
                titulo="Actividades sin calificación registrada",
                descripcion="Hay estudiantes con actividades que aún no tienen una calificación registrada.",
                prioridad=_prioridad_por_afectados(pendientes_totales, 6, 3),
                afectados=len(estudiantes_pendientes),
                id_estudiantes=[item.id_estudiante for item in estudiantes_pendientes],
                nombres_estudiantes=[item.estudiante for item in estudiantes_pendientes],
                recomendacion="Verificar si las actividades están pendientes de entrega o si falta registrar una evaluación.",
            )
        )

    estudiantes_bajo = [
        item for item in estudiantes_resumen
        if item.promedio_registrado is not None and item.promedio_registrado < APROBACION_MINIMA
    ]
    if estudiantes_bajo:
        situaciones.append(
            AnalisisSituacion(
                id_situacion="rendimiento-bajo-curso",
                tipo="rendimiento_bajo",
                titulo="Estudiantes bajo la nota de aprobación",
                descripcion="Hay estudiantes cuyo promedio de notas registradas está por debajo de 7.",
                prioridad=_prioridad_por_afectados(len(estudiantes_bajo), 3, 2),
                afectados=len(estudiantes_bajo),
                id_estudiantes=[item.id_estudiante for item in estudiantes_bajo],
                nombres_estudiantes=[item.estudiante for item in estudiantes_bajo],
                recomendacion="Revisar cada caso considerando sus evidencias, asistencia y actividades pendientes.",
            )
        )

    estudiantes_afectados = {
        item.id_estudiante
        for item in estudiantes_resumen
        if item.alertas
    }

    fortalezas: list[str] = []
    recomendaciones: list[str] = []
    if promedio_curso is not None and promedio_curso >= APROBACION_MINIMA:
        fortalezas.append(f"El promedio de las notas registradas del curso es {promedio_curso:.2f}.")
    if asistencia_curso is not None and asistencia_curso >= 90:
        fortalezas.append(f"La asistencia observada del curso se mantiene en {asistencia_curso:.2f}%.")
    if bajo_aprobacion:
        recomendaciones.append("Priorizar el seguimiento de los estudiantes bajo la nota de aprobación.")
    if estudiantes_en_riesgo:
        recomendaciones.append("Priorizar una revisión individual de los estudiantes que acumulan varias señales de riesgo.")
    if pendientes_totales:
        recomendaciones.append("Revisar las actividades sin calificación para distinguir entregas pendientes de registros aún no ingresados.")
    if asistencia_curso is not None and asistencia_curso < 85:
        recomendaciones.append("Analizar las causas de las inasistencias y coordinar acciones de acompañamiento.")
    if not alertas:
        recomendaciones.append("No se detectaron alertas con los datos académicos actualmente registrados.")

    return AnalisisCursoResponse(
        resumen=AnalisisCursoResumen(
            id_curso=curso.id_curso,
            nombre_curso=curso.nombre,
            anio_lectivo=curso.anio_lectivo,
            estudiantes_analizados=len(estudiantes_resumen),
            promedio_curso=promedio_curso,
            estudiantes_bajo_aprobacion=bajo_aprobacion,
            actividades_pendientes=pendientes_totales,
            porcentaje_asistencia=asistencia_curso,
            alertas_altas=alertas_altas,
            alertas_medias=alertas_medias,
            estudiantes_afectados=len(estudiantes_afectados),
            estudiantes_en_riesgo=estudiantes_en_riesgo,
            situaciones=len(situaciones),
        ),
        situaciones=situaciones,
        alertas=alertas,
        fortalezas=fortalezas,
        recomendaciones=recomendaciones,
        estudiantes=estudiantes_resumen,
        grupos=grupos,
        actividades=actividades,
        materias=materias,
    )


async def analizar_estudiante(
    db: AsyncSession,
    curso: Curso,
    id_estudiante: int,
    id_docente: int | None = None,
):
    """Reutiliza el análisis del curso para mantener reglas consistentes."""
    resultado = await analizar_curso(db, curso, id_docente=id_docente)
    estudiante = next(
        (item for item in resultado.estudiantes if item.id_estudiante == id_estudiante),
        None,
    )
    if estudiante is None:
        return None

    recomendaciones = [
        alerta.recomendacion for alerta in estudiante.alertas
    ]
    fortalezas = []
    if estudiante.promedio_registrado is not None and estudiante.promedio_registrado >= APROBACION_MINIMA:
        fortalezas.append("El promedio de las notas registradas alcanza la nota de aprobación.")
    if estudiante.porcentaje_asistencia is not None and estudiante.porcentaje_asistencia >= 90:
        fortalezas.append("La asistencia observada se mantiene en un nivel favorable.")

    return {
        "id_curso": curso.id_curso,
        "nombre_curso": curso.nombre,
        "estudiante": estudiante,
        "recomendaciones": list(dict.fromkeys(recomendaciones)),
        "fortalezas": fortalezas,
    }
