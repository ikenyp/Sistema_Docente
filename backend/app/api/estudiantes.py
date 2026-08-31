from fastapi import APIRouter, Depends, HTTPException, status, Request, File, Form, UploadFile
import logging
import traceback
from datetime import date, datetime
from io import BytesIO
import re
import unicodedata

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Query

from app.core.database import get_session
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.schemas.estudiantes import (
    EstudianteCreate,
    EstudianteUpdate,
    EstudianteResponse,
    EstadoEstudiante
)
from app.crud import estudiantes as crud
from app.services import estudiantes as service
from app.auth.dependencies import get_current_user
from app.models.usuarios import Usuario
from app.schemas.usuarios import RolUsuarioEnum
from app.services.authorization import validar_docente_puede_editar_curso, validar_usuario_puede_ver_curso

router = APIRouter(
    tags=["Estudiantes"]
)


def _normalizar_encabezado(valor: object) -> str:
    texto = str(valor or "").strip().lower()
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-z0-9]+", "_", texto)
    return texto.strip("_")


def _limpiar_texto(valor: object) -> str:
    if valor is None:
        return ""
    if isinstance(valor, float) and pd.isna(valor):
        return ""
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    texto = str(valor).strip()
    if texto.lower() == "nan":
        return ""
    return texto


def _parsear_fecha(valor: object) -> date | None:
    if valor is None:
        return None
    if isinstance(valor, date) and not isinstance(valor, datetime):
        return valor
    if isinstance(valor, datetime):
        return valor.date()
    texto = _limpiar_texto(valor)
    if not texto:
        return None
    try:
        return pd.to_datetime(texto, dayfirst=True, errors="raise").date()
    except Exception:
        return None


def _separar_nombre_completo(valor: object) -> tuple[str, str]:
    texto = _limpiar_texto(valor)
    if not texto:
        return "", ""

    partes = [p for p in texto.split() if p]
    if len(partes) >= 4:
        return " ".join(partes[2:]), " ".join(partes[:2])
    if len(partes) == 3:
        return " ".join(partes[1:]), partes[0]
    if len(partes) == 2:
        return partes[1], partes[0]
    return texto, ""


def _formatear_nombre_propio(valor: object) -> str:
    texto = _limpiar_texto(valor)
    if not texto:
        return ""
    partes = [parte for parte in texto.split() if parte]
    return " ".join(parte[:1].upper() + parte[1:].lower() for parte in partes)


def _cedula_parece_valida(valor: str) -> bool:
    texto = re.sub(r"\D", "", _limpiar_texto(valor))
    return len(texto) >= 7


def _extraer_registros_excel_estudiantes(contenido: bytes) -> list[dict]:
    try:
        df = pd.read_excel(BytesIO(contenido), header=None, dtype=object)
    except Exception:
        return []

    registros: list[dict] = []
    encabezado_encontrado = False

    for _, row in df.iterrows():
        valores = [_limpiar_texto(v) for v in row.tolist()]
        nonempty = [v for v in valores if v]
        tokens = [_normalizar_encabezado(v) for v in nonempty]

        if not tokens:
            continue

        if "cedula" in tokens and "nombres_completos" in tokens:
            encabezado_encontrado = True
            continue

        if not encabezado_encontrado:
            continue

        if len(nonempty) < 2:
            continue

        cedula = ""
        nombres_completos = ""

        if len(nonempty) >= 3 and re.fullmatch(r"\d+", nonempty[0]) and _cedula_parece_valida(nonempty[1]):
            cedula = nonempty[1]
            nombres_completos = nonempty[2]
        elif _cedula_parece_valida(nonempty[0]):
            cedula = nonempty[0]
            nombres_completos = nonempty[1] if len(nonempty) > 1 else ""

        if not cedula or not nombres_completos:
            continue

        nombre, apellido = _separar_nombre_completo(nombres_completos)
        registros.append(
            {
                "nombre": _formatear_nombre_propio(nombre),
                "apellido": _formatear_nombre_propio(apellido),
                "nombres_completos": nombres_completos,
                "cedula": cedula,
                "fecha_nacimiento": None,
                "estado": EstadoEstudiante.matriculado.value,
                "id_curso_actual": None,
            }
        )

    return registros


async def _preparar_fila_importacion(
    db: AsyncSession,
    request: Request,
    current_user: Usuario,
    id_contexto: int | None,
    valores: dict,
    cedulas_vistas: set[str],
    validar_bd: bool = True,
):
    errores: list[str] = []

    nombre = _limpiar_texto(valores.get("nombre"))
    apellido = _limpiar_texto(valores.get("apellido"))
    nombres_completos = _limpiar_texto(valores.get("nombres_completos"))
    cedula = _limpiar_texto(valores.get("cedula"))
    fecha_nacimiento = _parsear_fecha(valores.get("fecha_nacimiento"))
    estado = _limpiar_texto(valores.get("estado")).lower() or EstadoEstudiante.matriculado.value

    if nombres_completos and (not nombre or not apellido):
        nombre_parsed, apellido_parsed = _separar_nombre_completo(nombres_completos)
        nombre = nombre or nombre_parsed
        apellido = apellido or apellido_parsed

    nombre = _formatear_nombre_propio(nombre)
    apellido = _formatear_nombre_propio(apellido)

    id_curso_raw = valores.get("id_curso_actual")
    if id_curso_raw in (None, "", "nan"):
        id_curso_actual = None
    else:
        try:
          id_curso_actual = int(id_curso_raw)
        except Exception:
          id_curso_actual = None
          errores.append("El curso actual no es válido")

    if not nombre:
        errores.append("El nombre es obligatorio")
    if not apellido:
        errores.append("El apellido es obligatorio")
    if not cedula:
        errores.append("La cédula es obligatoria")
    if fecha_nacimiento:
        if fecha_nacimiento > date.today():
            errores.append("La fecha de nacimiento no puede ser futura")
        edad = (date.today() - fecha_nacimiento).days // 365
        if edad < 5:
            errores.append("El estudiante debe tener al menos 5 años")

    if estado not in {item.value for item in EstadoEstudiante}:
        errores.append("El estado no es válido")

    if cedula:
        if cedula in cedulas_vistas:
            errores.append("La cédula se repite dentro del archivo")
        elif validar_bd and await crud.obtener_por_cedula(db, cedula):
            errores.append("La cédula ya está registrada")
        else:
            cedulas_vistas.add(cedula)

    if (
        is_personal_mode(request)
        and current_user.rol == RolUsuarioEnum.docente
        and id_curso_actual is not None
    ):
        try:
            await validar_docente_puede_editar_curso(
                db,
                id_curso_actual,
                current_user.id_usuario,
                id_contexto,
            )
        except Exception as exc:
            errores.append(str(exc.detail) if hasattr(exc, "detail") else str(exc))

    return {
        "nombre": nombre,
        "apellido": apellido,
        "cedula": cedula,
        "fecha_nacimiento": fecha_nacimiento.isoformat() if fecha_nacimiento else "",
        "estado": estado,
        "id_curso_actual": id_curso_actual,
        "errores": errores,
    }


def _validar_gestion_estudiantes(current_user: Usuario, request: Request):
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo docentes pueden gestionar estudiantes"
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden gestionar estudiantes"
        )

@router.post("/", response_model=EstudianteResponse)
async def crear_estudiante(
    data: EstudianteCreate,
    db: AsyncSession = Depends(get_session),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user)
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request) and data.id_curso_actual is not None:
        await validar_docente_puede_editar_curso(db, data.id_curso_actual, current_user.id_usuario, id_contexto)

    # Log incoming data and auth header for debugging
    try:
        logging.debug("crear_estudiante headers: %s", request.headers.get("authorization") if request else None)
        logging.debug("crear_estudiante payload: %s", data.model_dump() if hasattr(data, 'model_dump') else dict(data))
    except Exception:
        logging.debug("No se pudo loggear request info")

    try:
        return await service.crear_estudiante(db, data)
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error en crear_estudiante: %s", e)
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor")


@router.get("/", response_model=list[EstudianteResponse])
async def listar_estudiantes(
    estado: EstadoEstudiante | None = Query(None),
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    apellido: str | None = Query(None, description="Búsqueda parcial por apellido"),
    id_curso: int | None = Query(None, description="Filtrar por curso actual"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Usuario = Depends(get_current_user),
    request: Request = None,
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol != RolUsuarioEnum.administrativo:
        id_contexto = await resolve_contexto_id(db, current_user, request)
        if id_curso is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debes filtrar por curso para listar estudiantes")
        if is_personal_mode(request):
            await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
        else:
            await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
    return await service.listar_estudiantes(
        db=db,
        estado=estado,
        nombre=nombre,
        apellido=apellido,
        id_curso_actual=id_curso,
        page=page,
        size=size
    )


@router.post("/import-preview")
async def previsualizar_importacion_estudiantes(
    file: UploadFile = File(...),
    id_curso_actual: int | None = Form(None),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request) and id_curso_actual is not None:
        await validar_docente_puede_editar_curso(
            db, id_curso_actual, current_user.id_usuario, id_contexto
        )

    contenido = await file.read()
    if not contenido:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío")

    nombre_archivo = (file.filename or "").lower()
    if not nombre_archivo.endswith((".xlsx", ".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser Excel (.xlsx o .xlsm)",
        )

    try:
        df = pd.read_excel(BytesIO(contenido))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo leer el archivo Excel: {exc}",
        )

    if df.empty:
        return {"estudiantes": [], "resumen": {"total": 0, "validos": 0, "con_error": 0}}

    df = df.rename(columns={col: _normalizar_encabezado(col) for col in df.columns})
    if "cedula" in df.columns and (
        "nombres_completos" in df.columns or "nombre" in df.columns or "apellido" in df.columns
    ):
        cedulas_vistas: set[str] = set()
        filas: list[dict] = []

        for idx, fila in df.iterrows():
            valores = {
                "nombre": fila.get("nombre"),
                "apellido": fila.get("apellido"),
                "nombres_completos": fila.get("nombres_completos"),
                "cedula": fila.get("cedula"),
                "fecha_nacimiento": fila.get("fecha_nacimiento"),
                "estado": fila.get("estado"),
                "id_curso_actual": id_curso_actual,
            }

            if not any(
                _limpiar_texto(v)
                for clave, v in valores.items()
                if clave != "id_curso_actual" and v is not None
            ):
                continue

            preparado = await _preparar_fila_importacion(
                db,
                request,
                current_user,
                id_contexto,
                valores,
                cedulas_vistas,
                validar_bd=True,
            )
            preparado["fila"] = int(idx) + 2
            filas.append(preparado)
    else:
        filas = _extraer_registros_excel_estudiantes(contenido)
        if not filas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se detectó una tabla válida de estudiantes en el Excel",
            )

        cedulas_vistas = set()
        filas_preparadas: list[dict] = []
        for idx, fila in enumerate(filas, start=1):
            preparado = await _preparar_fila_importacion(
                db,
                request,
                current_user,
                id_contexto,
                fila,
                cedulas_vistas,
                validar_bd=True,
            )
            preparado["fila"] = idx
            filas_preparadas.append(preparado)

        filas = filas_preparadas

    return {
        "estudiantes": filas,
        "resumen": {
            "total": len(filas),
            "validos": sum(1 for fila in filas if not fila["errores"]),
            "con_error": sum(1 for fila in filas if fila["errores"]),
        },
    }


@router.post("/import")
async def importar_estudiantes_desde_excel(
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    payload = await request.json()
    filas = payload.get("estudiantes", []) if isinstance(payload, dict) else []
    if not isinstance(filas, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato inválido de importación")

    cedulas_vistas: set[str] = set()
    creados: list[dict] = []
    errores: list[dict] = []

    for idx, fila in enumerate(filas, start=1):
        if not isinstance(fila, dict):
            errores.append({"fila": idx, "errores": ["Fila inválida"]})
            continue

        preparado = await _preparar_fila_importacion(
            db,
            request,
            current_user,
            id_contexto,
            fila,
            cedulas_vistas,
            validar_bd=True,
        )

        if preparado["errores"]:
            errores.append({"fila": preparado.get("fila", idx), "errores": preparado["errores"]})
            continue

        try:
            fecha_nacimiento = (
                date.fromisoformat(preparado["fecha_nacimiento"])
                if preparado["fecha_nacimiento"]
                else None
            )
            estudiante = await service.crear_estudiante(
                db,
                EstudianteCreate(
                    nombre=preparado["nombre"],
                    apellido=preparado["apellido"],
                    cedula=preparado["cedula"],
                    fecha_nacimiento=fecha_nacimiento,
                    estado=EstadoEstudiante(preparado["estado"]),
                    id_curso_actual=preparado["id_curso_actual"],
                ),
            )
            creados.append({"fila": idx, "id_estudiante": estudiante.id_estudiante, "cedula": estudiante.cedula})
        except Exception as exc:
            errores.append({"fila": idx, "errores": [str(exc.detail) if hasattr(exc, "detail") else str(exc)]})

    return {
        "creados": creados,
        "errores": errores,
        "resumen": {
            "total": len(filas),
            "creados": len(creados),
            "con_error": len(errores),
        },
    }



@router.get("/{id_estudiante}", response_model=EstudianteResponse)
async def obtener_estudiante(
    id_estudiante: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    estudiante = await service.obtener_estudiante(db, id_estudiante=id_estudiante)

    if is_personal_mode(request) and current_user.rol == RolUsuarioEnum.docente and estudiante.id_curso_actual is not None:
        await validar_docente_puede_editar_curso(db, estudiante.id_curso_actual, current_user.id_usuario, id_contexto)

    return estudiante


@router.put("/{id_estudiante}", response_model=EstudianteResponse)
async def actualizar_estudiante(
    id_estudiante: int,
    data: EstudianteUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        estudiante_actual = await service.obtener_estudiante(db, id_estudiante=id_estudiante)
        curso_objetivo = data.id_curso_actual if data.id_curso_actual is not None else estudiante_actual.id_curso_actual
        if curso_objetivo is not None:
            await validar_docente_puede_editar_curso(db, curso_objetivo, current_user.id_usuario, id_contexto)

    return await service.actualizar_estudiante(db, id_estudiante, data)


@router.delete("/{id_estudiante}", status_code=200)
async def eliminar_estudiante(
    id_estudiante: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
): 
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        estudiante_actual = await service.obtener_estudiante(db, id_estudiante=id_estudiante)
        if estudiante_actual.id_curso_actual is not None:
            await validar_docente_puede_editar_curso(db, estudiante_actual.id_curso_actual, current_user.id_usuario, id_contexto)

    return await service.eliminar_estudiante(db, id_estudiante)



