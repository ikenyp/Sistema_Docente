# Sistema de Trimestres - Implementación Completa

## Resumen

Se ha implementado un sistema completo de trimestres que incluye:

- Modelo/Tabla de Trimestres
- Relación entre Trimestres e Insumos (FK)
- Relación entre Trimestres y Cursos (año lectivo)

## Cambios Realizados

### 1. **Modelo de Trimestre** (`backend/app/models/trimestres.py`)

Nuevo archivo con la clase `Trimestre` que contiene:

- `id_trimestre`: ID principal (auto-incrementado)
- `id_curso`: Relación FK con Cursos (ondelete=CASCADE)
- `numero_trimestre`: 1, 2 o 3
- `anio_lectivo`: Ej: "2025-2026" (permite múltiples años por curso)
- `fecha_inicio`: Fecha de inicio del trimestre
- `fecha_fin`: Fecha de fin del trimestre

**Constraint único**: `(id_curso, numero_trimestre, anio_lectivo)` - garantiza un único trimestre por número y año por curso

**Relaciones**:

- ↔ Curso (back_populates="trimestres")
- ↔ Insumo (back_populates="trimestre")

### 2. **Modelo de Insumo Actualizado** (`backend/app/models/insumos.py`)

Cambios importantes:

- ❌ Removido: Campo `trimestre` (Integer)
- ✅ Agregado: `id_trimestre` (FK a trimestres.id_trimestre, ondelete=CASCADE)
- ✅ Agregado: Campo `tipo_insumo` (Enum: actividad, proyecto_trimestral, examen_trimestral)
- **Nueva relación**: `trimestre = relationship("Trimestre", back_populates="insumos")`
- **Nuevo constraint único**: `(id_cmd, id_trimestre, tipo_insumo)` - solo un proyecto/examen por trimestre por curso-materia

### 3. **Modelo de Curso Actualizado** (`backend/app/models/cursos.py`)

- ✅ Agregada relación: `trimestres = relationship("Trimestre", back_populates="curso", cascade="all, delete-orphan")`

### 4. **Schemas de Trimestre** (`backend/app/schemas/trimestres.py`)

Nuevo archivo con:

- `TrimestreBase`: Datos básicos (numero_trimestre, anio_lectivo, fecha_inicio, fecha_fin)
- `TrimestreCreate`: Incluye id_curso
- `TrimestreUpdate`: Todos los campos opcionales
- `TrimestreResponse`: Incluye id_trimestre, id_curso (con from_attributes)

### 5. **Schema de Insumo Actualizado** (`backend/app/schemas/insumos.py`)

- ❌ Removido: Campo `trimestre` (Int)
- ✅ Agregado: `id_trimestre` (en Create y Response)
- ❌ Removido: Validador TrimestreEnum (no es necesario con FK)

### 6. **CRUD de Trimestre** (`backend/app/crud/trimestres.py`)

Funciones implementadas:

- `create_trimestre()`: Crear nuevo trimestre
- `get_trimestre()`: Obtener por ID
- `get_trimestres_by_curso()`: Listar trimestres de un curso
- `get_trimestres_by_curso_anio()`: Filtrar por año lectivo
- `get_trimestre_activo()`: Obtener el trimestre activo actual (basado en fecha)
- `update_trimestre()`: Actualizar datos
- `delete_trimestre()`: Eliminar
- `get_all_trimestres()`: Listar con paginación

### 7. **API Endpoints** (`backend/app/api/trimestres.py`)

Router con endpoints:

```
POST   /api/trimestres/                    # Crear trimestre (admin)
GET    /api/trimestres/                    # Listar todos (con paginación)
GET    /api/trimestres/{id_trimestre}      # Obtener por ID
GET    /api/trimestres/curso/{id_curso}    # Listar trimestres del curso
GET    /api/trimestres/curso/{id_curso}/activo  # Obtener trimestre activo
PUT    /api/trimestres/{id_trimestre}      # Actualizar (admin)
DELETE /api/trimestres/{id_trimestre}      # Eliminar (admin)
```

**Controles de acceso**:

- POST, PUT, DELETE: Solo administrativos
- GET: Todos (autenticados)

**Validaciones**:

- Fecha inicio < fecha fin
- Número de trimestre en [1, 2, 3]
- Restricciones de unicidad en BD

### 8. **Registro en Main** (`backend/app/main.py`)

- Importado router de trimestres
- Registrado: `app.include_router(trimestres.router, prefix="/api/trimestres", tags=["Trimestres"])`

### 9. **Migraciones Alembic**

Archivo: `backend/alembic/versions/5bc5e2e90f28_add_trimestres_table_and_update_insumos.py`

**Upgrade**:

- Crea tabla `trimestres` con todas las columnas y constraints
- Agrega `id_trimestre` FK a tabla `insumos`
- Agrega `tipo_insumo` enum a tabla `insumos`
- Crea constraint único en insumos

**Downgrade**:

- Revierte todos los cambios automáticamente

## Cómo Usar

### Crear un Trimestre

```bash
POST /api/trimestres/
{
  "numero_trimestre": 1,
  "anio_lectivo": "2025-2026",
  "fecha_inicio": "2025-01-01",
  "fecha_fin": "2025-04-30",
  "id_curso": 1
}
```

### Obtener Trimestre Activo

```bash
GET /api/trimestres/curso/1/activo
```

### Crear Insumo con Trimestre

```bash
POST /api/insumos/
{
  "nombre": "Proyecto Final",
  "descripcion": "Proyecto integrador del primer trimestre",
  "ponderacion": 4.0,
  "tipo_insumo": "proyecto_trimestral",
  "id_cmd": 1,
  "id_trimestre": 1
}
```

## Características Avanzadas

✅ **Soporte Multi-año**: Un mismo curso puede tener múltiples años lectivos
✅ **Trimestres Activos**: Identificación automática del trimestre actual por fecha
✅ **Relaciones Automáticas**: Eliminar curso elimina automáticamente sus trimestres
✅ **Validación de Fechas**: Garantiza coherencia en periodos
✅ **Constraints Únicos**: Evita duplicación de trimestres y conflictos de insumos

## Próximos Pasos (Opcionales)

- Actualizar UI frontend para permitir selección de trimestres
- Implementar filtros de reportes por trimestre
- Agregar campos adicionales (ej: semanas lectivas, vacaciones)
- Crear endpoint para generar trimestres automáticamente
