# Implementación de Validación de Ponderación y Cálculo de Promedios

## Cambios Implementados

### 1. Validación de Ponderación en Insumos ✅

**Archivos modificados:**

- [backend/app/schemas/insumos.py](backend/app/schemas/insumos.py)
- [backend/app/services/insumos.py](backend/app/services/insumos.py)

**Cambios:**

- Actualizado rango de validación de ponderación de `ge=0` a `ge=1`
- Ponderación ahora debe estar entre **1 y 10** (no permite 0)
- Se aplica en:
  - Schema `InsumoBase`
  - Schema `InsumoUpdate`
  - Validación en servicio `crear_insumo()`
  - Validación en servicio `actualizar_insumo()`

**Mensajes de error:**

```
"La ponderación debe estar entre 1 y 10"
```

---

### 2. Validación: Tipo de Insumo No Puede Cambiar Si Tiene Notas ✅

**Archivo modificado:**

- [backend/app/services/insumos.py](backend/app/services/insumos.py)

**Implementación:**

```python
# VALIDACIÓN CRÍTICA: No permitir cambiar tipo_insumo si ya tiene notas
if "tipo_insumo" in values:
    notas_existentes = await db.execute(
        select(Nota).where(Nota.id_insumo == id_insumo)
    )
    if notas_existentes.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede cambiar el tipo de insumo si ya tiene notas asignadas"
        )
```

**Validación:**

- Se ejecuta en la actualización de insumos
- Si el insumo tiene al menos una nota, no se permite cambiar `tipo_insumo`
- Mensaje de error: `"No se puede cambiar el tipo de insumo si ya tiene notas asignadas"`

---

### 3. Servicio de Cálculo de Promedios ✅

**Nuevo archivo:**

- [backend/app/services/promedios.py](backend/app/services/promedios.py)

**Funciones implementadas:**

#### `calcular_promedio_trimestral()`

Calcula el promedio de un estudiante en un trimestre específico.

**Ponderaciones:**

- Actividades: 10%
- Proyecto Trimestral: 20%
- Examen Trimestral: 70%

**Fórmula:**

```
Promedio Trimestral = (Actividades × 0.10) + (Proyecto × 0.20) + (Examen × 0.70)
```

**Parámetros:**

- `id_estudiante`: ID del estudiante
- `id_curso`: ID del curso
- `numero_trimestre`: 1, 2 o 3
- `anio_lectivo`: Año lectivo (ej: "2025-2026")

**Retorna:**

```json
{
  "id_estudiante": 1,
  "id_curso": 1,
  "numero_trimestre": 1,
  "anio_lectivo": "2025-2026",
  "promedio_actividades": 8.5,
  "promedio_proyecto": 9.0,
  "promedio_examen": 7.5,
  "promedio_trimestral": 7.85,
  "detalles": {
    "notas_actividades": [...],
    "nota_proyecto": {...},
    "nota_examen": {...}
  }
}
```

#### `calcular_promedio_final()`

Calcula el promedio final de un estudiante en un curso.

**Fórmula:**

```
Promedio Final = (Promedio T1 + Promedio T2 + Promedio T3) / 3
```

**Parámetros:**

- `id_estudiante`: ID del estudiante
- `id_curso`: ID del curso
- `anio_lectivo`: Año lectivo

**Retorna:**

```json
{
  "id_estudiante": 1,
  "id_curso": 1,
  "anio_lectivo": "2025-2026",
  "promedio_final": 8.15,
  "promedios_trimestrales": [...],
  "trimestres_con_datos": 3
}
```

#### `obtener_promedios_curso()`

Obtiene los promedios de todos los estudiantes en un curso.

**Parámetros opcionales:**

- `numero_trimestre`: Filtrar por trimestre (1-3)
- `anio_lectivo`: Requerido si se especifica trimestre

**Retorna:**

```json
{
  "id_curso": 1,
  "promedios": [...],
  "cantidad_estudiantes": 25
}
```

---

### 4. Schemas de Promedios ✅

**Nuevo archivo:**

- [backend/app/schemas/promedios.py](backend/app/schemas/promedios.py)

**Esquemas creados:**

- `DetalleNotaInsumo`: Información de una nota individual
- `DetalleActividadesTrimestr`: Detalles de actividades, proyecto y examen
- `PromedioTrimestral`: Promedio de un trimestre
- `PromedioFinal`: Promedio final con desglose trimestral
- `PromediosCurso`: Promedios de todos los estudiantes en un curso

---

### 5. Endpoints de Promedios ✅

**Nuevo archivo:**

- [backend/app/api/promedios.py](backend/app/api/promedios.py)

**Endpoints disponibles:**

#### GET `/api/promedios/trimestre/{id_estudiante}/{id_curso}/{numero_trimestre}`

Obtiene el promedio trimestral de un estudiante.

**Parámetros query:**

- `anio_lectivo` (requerido): Año lectivo

**Ejemplo:**

```
GET /api/promedios/trimestre/1/1/1?anio_lectivo=2025-2026
```

#### GET `/api/promedios/final/{id_estudiante}/{id_curso}`

Obtiene el promedio final de un estudiante.

**Parámetros query:**

- `anio_lectivo` (requerido): Año lectivo

**Ejemplo:**

```
GET /api/promedios/final/1/1?anio_lectivo=2025-2026
```

#### GET `/api/promedios/curso/{id_curso}`

Obtiene los promedios de todos los estudiantes en un curso.

**Parámetros query (opcionales):**

- `numero_trimestre`: Filtrar por trimestre
- `anio_lectivo`: Requerido si se especifica trimestre

**Ejemplos:**

```
# Promedios finales
GET /api/promedios/curso/1

# Promedios de un trimestre específico
GET /api/promedios/curso/1?numero_trimestre=1&anio_lectivo=2025-2026
```

---

### 6. Integración en main.py ✅

**Archivo modificado:**

- [backend/app/main.py](backend/app/main.py)

**Cambios:**

- Importado módulo `promedios` de `app.api`
- Registrado router de promedios con prefijo `/api`

```python
app.include_router(promedios.router, prefix="/api", tags=["Promedios"])
```

---

## Características de Eficiencia

### Cálculo Atomizado

- Cada función calcula su métrica específica sin dependencias externas
- Las funciones pueden ejecutarse independientemente
- Fácil de testear y mantener

### Optimización de Consultas

- Se utiliza `select()` con filtros específicos
- Se evitan queries innecesarias
- Uso de relaciones de SQLAlchemy para acceso eficiente

### Manejo de Datos Incompletos

- Si un estudiante no tiene notas de actividades, proyecto o examen, se retorna `None`
- El cálculo se realiza solo con los datos disponibles
- Se reporta el número de trimestres con datos completos

---

## Validaciones

### En Insumos

1. ✅ Ponderación >= 1 y <= 10
2. ✅ Tipo de insumo no cambia si hay notas
3. ✅ Validaciones existentes (unicidad, trimestres, etc.)

### En Promedios

1. ✅ Validación de existencia de estudiante
2. ✅ Validación de existencia de trimestre
3. ✅ Manejo de datos incompletos
4. ✅ Cálculos precisos con Decimal

---

## Pruebas Recomendadas

### 1. Validación de Ponderación

```
POST /api/insumos
{
  "id_cmd": 1,
  "nombre": "Test",
  "ponderacion": 0,  # Debe fallar
  "tipo_insumo": "actividad",
  "id_trimestre": 1
}
```

### 2. Cambio de Tipo con Notas

```
PUT /api/insumos/1
{
  "tipo_insumo": "proyecto_trimestral"  # Debe fallar si tiene notas
}
```

### 3. Cálculo de Promedio Trimestral

```
GET /api/promedios/trimestre/1/1/1?anio_lectivo=2025-2026
```

### 4. Cálculo de Promedio Final

```
GET /api/promedios/final/1/1?anio_lectivo=2025-2026
```

### 5. Promedios del Curso

```
GET /api/promedios/curso/1
GET /api/promedios/curso/1?numero_trimestre=1&anio_lectivo=2025-2026
```

---

## Notas de Implementación

- Todos los cálculos utilizan tipo `Decimal` para precisión
- Los resultados se retornan como `float` redondeados a 2 decimales
- El sistema maneja correctamente trimestres incompletos
- Las validaciones son atómicas y ejecutadas en la base de datos
