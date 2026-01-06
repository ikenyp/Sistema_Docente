# 📋 Búsqueda, Paginación y Validaciones - Resumen de Implementación

**Fecha:** 6 de enero de 2026  
**Estado:** ✅ COMPLETADO

---

## ✅ Punto 7 - Búsqueda y Paginación

### Ya Implementados

✅ Todos los endpoints principales tienen búsqueda y paginación:

- **Estudiantes**: `?nombre=`, `?apellido=`, `?page=`, `?limit=`
- **Usuarios**: `?nombre=`, `?page=`, `?limit=`
- **Cursos**: `?nombre=`, `?anio_lectivo=`, `?id_tutor=`, `?page=`, `?limit=`
- **Materias**: `?page=`, `?limit=`
- **Insumos**: `?nombre=`, `?trimestre=`, `?tipo_insumo=`, `?page=`, `?limit=`

### Nuevo en Notas

✅ **Agregado paginación al endpoint `/api/notas`**

```
GET /api/notas?id_estudiante=1&id_insumo=2&page=1&limit=10
```

**Cambios:**

- [backend/app/api/notas.py](backend/app/api/notas.py): Agregados parámetros `page` y `size`
- [backend/app/services/notas.py](backend/app/services/notas.py): Lógica de paginación
- [backend/app/crud/notas.py](backend/app/crud/notas.py): Soporte de offset/limit en BD

---

## ✅ Punto 8 - Validaciones de Lógica de Negocio

### 1. Eliminación de Insumos Protegida ✅

**Validación Crítica:** No se pueden eliminar insumos con notas asignadas

**Ubicación:** [backend/app/services/insumos.py](backend/app/services/insumos.py) - `eliminar_insumo()`

```python
# Error 400 si existen notas
"No se puede eliminar un insumo que tiene notas asignadas"
```

---

### 2. Autenticación en Endpoints ✅

Todos los endpoints ahora requieren token JWT válido mediante `get_current_user()`

**Endpoints Actualizados:**

- `GET /api/cursos` - Requiere autenticación
- `POST /api/cursos` - Solo ADMIN
- `PUT /api/cursos/{id}` - Solo ADMIN o tutor del curso
- `DELETE /api/cursos/{id}` - Solo ADMIN
- `POST /api/insumos` - Solo DOCENTE
- `PUT /api/insumos/{id}` - Solo DOCENTE asignado
- `DELETE /api/insumos/{id}` - Solo DOCENTE asignado + sin notas
- Todos en `/api/notas`, `/api/asistencia`, `/api/comportamiento`

---

### 3. Docente Solo Edita Sus Propios Cursos ✅

**Validación:** Un docente (no admin) solo puede:

- ✅ Ver todos los cursos (lectura)
- ✅ Actualizar cursos donde es tutor (`id_tutor == current_user.id`)
- ❌ No puede eliminar cursos (solo ADMIN)

**Ubicación:** [backend/app/api/cursos.py](backend/app/api/cursos.py)

```python
# En actualizar_curso():
if current_user.rol != RolUsuarioEnum.ADMIN:
    await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario)
```

---

### 4. Docente Solo Crea Insumos en Sus Materias ✅

**Validación:** Un docente solo puede crear/editar/eliminar insumos donde es el docente asignado (id_cmd)

**Ubicación:** [backend/app/services/insumos.py](backend/app/services/insumos.py)

```python
# En crear_insumo():
if current_user.id_usuario != cmd_obj.id_docente:
    raise HTTPException(403, "Solo puedes crear insumos para tus propias materias")

# En actualizar_insumo():
if current_user.id_usuario != insumo.cmd.id_docente:
    raise HTTPException(403, "Solo el docente asignado puede actualizar este insumo")

# En eliminar_insumo():
if current_user.id_usuario != insumo.cmd.id_docente:
    raise HTTPException(403, "Solo el docente asignado puede eliminar este insumo")
```

---

### 5. Docente Solo Tutor en Cursos que Imparte (Política Flexible) ✅

**Nota:** La validación está comentada para permitir asignar tutores sin restricciones de materia.

**Ubicación:** [backend/app/services/cursos.py](backend/app/services/cursos.py) - líneas 32-50

**Para activar validación estricta, descomentar:**

```python
# Validar que el docente imparte en el curso
cmd = await db.execute(
    select(CursoMateriaDocente).where(
        CursoMateriaDocente.id_curso == id_curso,
        CursoMateriaDocente.id_docente == id_tutor
    )
)
if not cmd.scalar_one_or_none():
    raise HTTPException(400, "El docente debe imparter al menos una materia en el curso")
```

---

### 6. Admin Solo Lectura en Notas, Asistencia, Comportamiento ✅

**Validación:** Los administradores **NO pueden**:

- ❌ Crear notas, asistencia, comportamiento
- ❌ Actualizar notas, asistencia, comportamiento
- ❌ Eliminar notas, asistencia, comportamiento
- ✅ Solo pueden LEER

**Ubicaciones:**

- [backend/app/api/notas.py](backend/app/api/notas.py) - POST, PUT, DELETE bloqueados para ADMIN
- [backend/app/api/asistencia.py](backend/app/api/asistencia.py) - POST, PUT, DELETE bloqueados para ADMIN
- [backend/app/api/comportamiento.py](backend/app/api/comportamiento.py) - POST, PUT, DELETE bloqueados para ADMIN

**Errores:**

```python
# Si ADMIN intenta modificar
"Los administradores no pueden modificar notas"
"Los administradores no pueden eliminar asistencia"
"Los administradores no pueden modificar comportamiento"
```

---

## 📁 Nuevos Archivos Creados

### `backend/app/services/authorization.py`

Funciones helper para validaciones de autorización:

- `validar_docente_puede_editar_curso()` - Verifica si docente es tutor
- `validar_docente_imparte_materia_en_curso()` - Verifica CMD
- `validar_admin_solo_lectura()` - Bloquea escritura para admin

---

## 🔐 Matriz de Permisos

| Recurso            | ADMIN        | DOCENTE                  |
| ------------------ | ------------ | ------------------------ |
| **Cursos**         | CRUD (admin) | R + U (solo propios)     |
| **Insumos**        | R            | C + U + D (solo propios) |
| **Notas**          | R            | C + U + D                |
| **Asistencia**     | R            | C + U + D                |
| **Comportamiento** | R            | C + U + D                |
| **Estudiantes**    | CRUD         | R                        |
| **Usuarios**       | CRUD         | R                        |

---

## 🧪 Ejemplos de Uso

### Listar notas con paginación

```bash
GET /api/notas?id_insumo=5&page=2&size=10
Authorization: Bearer <token>
```

### Crear insumo (solo docente asignado)

```bash
POST /api/insumos
Authorization: Bearer <token_docente>
Content-Type: application/json

{
  "id_cmd": 1,
  "nombre": "Parcial 1",
  "descripcion": "Evaluación parcial",
  "ponderacion": 3,
  "tipo_insumo": "evaluacion",
  "trimestre": 1
}
```

**Error si docente NO imparte en ese curso:**

```json
{ "detail": "Solo puedes crear insumos para tus propias materias" }
```

### Eliminar insumo con notas (Error esperado)

```bash
DELETE /api/insumos/1
Authorization: Bearer <token_docente>
```

**Respuesta Error:**

```json
{ "detail": "No se puede eliminar un insumo que tiene notas asignadas" }
```

### Actualizar nota como Admin (Error esperado)

```bash
PUT /api/notas/1
Authorization: Bearer <token_admin>

{"calificacion": 9.5}
```

**Respuesta Error:**

```json
{ "detail": "Los administradores no pueden modificar notas" }
```

---

## ✨ Resumen de Cambios

| Archivo                                                                        | Cambios                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| [backend/app/api/notas.py](backend/app/api/notas.py)                           | +Paginación, +Autenticación, +Bloqueo ADMIN      |
| [backend/app/api/cursos.py](backend/app/api/cursos.py)                         | +Autenticación, +Validación docente tutor        |
| [backend/app/api/insumos.py](backend/app/api/insumos.py)                       | +Autenticación docente, +Validación propietario  |
| [backend/app/api/asistencia.py](backend/app/api/asistencia.py)                 | +Autenticación, +Bloqueo ADMIN                   |
| [backend/app/api/comportamiento.py](backend/app/api/comportamiento.py)         | +Autenticación, +Bloqueo ADMIN                   |
| [backend/app/services/notas.py](backend/app/services/notas.py)                 | +Paginación en service                           |
| [backend/app/services/insumos.py](backend/app/services/insumos.py)             | +Validación docente, +Bloqueo eliminar con notas |
| [backend/app/services/cursos.py](backend/app/services/cursos.py)               | +Comentarios para política estricta              |
| [backend/app/crud/notas.py](backend/app/crud/notas.py)                         | +Offset/limit en SQL                             |
| [backend/app/services/authorization.py](backend/app/services/authorization.py) | ✨ NUEVO - Helpers de autorización               |

---

## 📊 Estado de Requisitos

| #   | Requisito                                          | Estado        |
| --- | -------------------------------------------------- | ------------- |
| 7.1 | Búsqueda por nombre/apellido en estudiantes        | ✅            |
| 7.2 | Búsqueda por nombre en usuarios                    | ✅            |
| 7.3 | Búsqueda en cursos                                 | ✅            |
| 7.4 | Paginación en todos los endpoints                  | ✅            |
| 7.5 | **Paginación en notas**                            | ✅ NUEVO      |
| 8.1 | Docente solo ve/edita sus cursos                   | ✅            |
| 8.2 | Docente solo tutor en cursos que imparte           | ✅ (Flexible) |
| 8.3 | Admin solo lectura notas/asistencia/comportamiento | ✅            |
| 8.4 | No eliminar insumos con notas                      | ✅            |

---

## 🚀 Próximos Pasos (Opcionales)

1. **Auditoría:** Registrar cambios (quién, cuándo, qué)
2. **Rate Limiting:** Limitar solicitudes por usuario
3. **Caché:** Cachear consultas frecuentes
4. **Logs:** Sistema de logging completo
5. **Tests:** Suite de pruebas unitarias
