# Mejoras al Modelo de Insumos - Backend

## Cambios Implementados

### 1. Nuevos Enums en `app/models/enums.py`

Se agregaron dos nuevos enums para clasificar mejor los insumos:

```python
class TipoInsumoEnum(str, enum.Enum):
    actividad = "actividad"
    proyecto_trimestral = "proyecto_trimestral"
    examen_trimestral = "examen_trimestral"

class TrimestreEnum(int, enum.Enum):
    primero = 1
    segundo = 2
    tercero = 3
```

### 2. Modelo Insumo Actualizado - `app/models/insumos.py`

**Nuevos campos:**

- `tipo_insumo`: Enum que indica si es actividad, proyecto trimestral o examen trimestral
- `trimestre`: Número del trimestre (1, 2 o 3)

**Nueva restricción de unicidad:**

```python
UniqueConstraint("id_cmd", "trimestre", "tipo_insumo",
                name="uq_proyecto_examen_por_trimestre")
```

Esta restricción garantiza que **solo puede haber un proyecto trimestral y un examen trimestral por cada trimestre** en cada curso-materia. Las actividades pueden ser ilimitadas.

### 3. Schema Actualizado - `app/schemas/insumos.py`

Los schemas ahora incluyen:

- `tipo_insumo`: Campo obligatorio al crear/responder
- `trimestre`: Campo obligatorio (1-3) con validación
- Validadores para asegurar que el trimestre sea válido

### 4. CRUD Mejorado - `app/crud/insumos.py`

**Nueva función:**

```python
async def obtener_por_cmd_trimestre_tipo(
    db: AsyncSession,
    id_cmd: int,
    trimestre: int,
    tipo_insumo: TipoInsumoEnum,
    id_insumo_excluir: int | None = None
)
```

Esta función permite validar si ya existe un proyecto o examen en un trimestre específico.

**Función listar_insumos mejorada** con filtros adicionales:

- Filtrar por trimestre
- Filtrar por tipo de insumo

### 5. Servicio Mejorado - `app/services/insumos.py`

**Validaciones agregadas en crear_insumo:**

- Validación de trimestre (1, 2 o 3)
- Validación de unicidad para proyectos y exámenes trimestrales
- Mensaje de error específico cuando ya existe un proyecto/examen

**Validaciones agregadas en actualizar_insumo:**

- Validación de trimestre al actualizar
- Validación de unicidad al cambiar tipo o trimestre
- Previene duplicados de proyectos/exámenes

### 6. API Actualizada - `app/api/insumos.py`

**Nuevos parámetros en GET /insumos/:**

- `trimestre`: Filtrar por trimestre (1, 2 o 3)
- `tipo_insumo`: Filtrar por tipo (actividad, proyecto_trimestral, examen_trimestral)

### 7. Migración de Base de Datos

Archivo generado: `backend/alembic/versions/60b49a409f2d_add_tipo_insumo_y_trimestre_a_insumos.py`

**La migración:**

1. Crea el enum `tipoinsmoenum` en la base de datos
2. Agrega las columnas `tipo_insumo` y `trimestre`
3. Establece valores por defecto para registros existentes ('actividad', trimestre 1)
4. Hace las columnas NOT NULL
5. Crea la constraint única para proyectos y exámenes

## Reglas de Negocio Implementadas

### Restricciones por Trimestre:

- ✅ **Actividades**: Número ilimitado por trimestre
- ✅ **Proyecto Trimestral**: Máximo 1 por trimestre por curso-materia
- ✅ **Examen Trimestral**: Máximo 1 por trimestre por curso-materia

### Ponderaciones Sugeridas (para cálculo de promedios):

- Actividades: 10% del promedio trimestral
- Proyecto Trimestral: 20% del promedio trimestral
- Examen Trimestral: 70% del promedio trimestral

> **Nota:** El cálculo de promedios con estas ponderaciones se implementará en una fase posterior.

## Próximos Pasos

1. **Aplicar la migración a la base de datos:**

   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Implementar cálculo de promedios trimestrales** basado en:

   - 10% promedio de actividades
   - 20% proyecto trimestral
   - 70% examen trimestral

3. **Actualizar Frontend** para:

   - Mostrar campos tipo_insumo y trimestre
   - Implementar filtros por trimestre y tipo
   - Validar restricciones en la UI (deshabilitar crear segundo proyecto/examen)

4. **Agregar validaciones adicionales** si es necesario:
   - Validar ponderaciones sugeridas según tipo
   - Alertar al docente cuando no hay proyecto o examen en un trimestre

## Ejemplos de Uso del API

### Crear una actividad:

```json
POST /insumos/
{
  "id_cmd": 1,
  "nombre": "Tarea 1",
  "descripcion": "Primera tarea del trimestre",
  "ponderacion": 10,
  "tipo_insumo": "actividad",
  "trimestre": 1
}
```

### Crear un proyecto trimestral:

```json
POST /insumos/
{
  "id_cmd": 1,
  "nombre": "Proyecto Final Trimestre 1",
  "descripcion": "Proyecto de investigación",
  "ponderacion": 20,
  "tipo_insumo": "proyecto_trimestral",
  "trimestre": 1
}
```

### Filtrar insumos por trimestre y tipo:

```
GET /insumos/?id_cmd=1&trimestre=1&tipo_insumo=actividad
```

## Validaciones Implementadas

✅ Solo un proyecto trimestral por trimestre por curso-materia  
✅ Solo un examen trimestral por trimestre por curso-materia  
✅ Actividades ilimitadas  
✅ Trimestre debe ser 1, 2 o 3  
✅ Tipo de insumo debe ser uno de los enums definidos  
✅ Ponderación entre 0 y 10  
✅ Nombres únicos de insumos por curso-materia

## Compatibilidad con Datos Existentes

La migración establece valores por defecto para registros existentes:

- `tipo_insumo`: 'actividad'
- `trimestre`: 1

Los registros existentes se tratarán como actividades del primer trimestre.
