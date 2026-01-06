# Validaciones Asistencia y Comportamiento

## 5. Asistencia

### Validaciones Implementadas:

#### ✅ Solo L-V (Lunes a Viernes)

- **Ubicación**: `app/services/asistencia.py` - función `crear_asistencia()`
- **Validación**: Verifica que `fecha.weekday()` esté entre 0-4 (lunes a viernes)
- **Mensaje Error**: "La asistencia solo puede ser registrada de lunes a viernes"
- **Se aplica en**: Crear y actualizar asistencia

#### ✅ No Permitir Duplicados

- **Ubicación**: `app/services/asistencia.py` - función `crear_asistencia()` y `actualizar_asistencia()`
- **Validación**: Verifica que no exista otro registro con:
  - Mismo `id_cmd` (materia/curso)
  - Mismo `id_estudiante`
  - Misma `fecha`
- **Query**: Busca registros existentes antes de crear
- **Mensaje Error**: "Ya existe un registro de asistencia para este estudiante, fecha y materia"
- **Se aplica en**: Crear y actualizar asistencia

#### ✅ Tipo de Asistencia Válido

- **Ubicación**: `app/models/enums.py` - `EstadoAsistenciaEnum`
- **Valores válidos**:
  - `presente`
  - `ausente`
  - `atraso` (retraso)
- **Validación**: Controlada por Pydantic mediante el enum en el schema
- **Se aplica en**: Crear y actualizar asistencia

---

## 6. Comportamiento

### Validaciones Implementadas:

#### ✅ Solo A, B, C o D

- **Ubicación**:
  - `app/models/enums.py` - `ValorComportamientoEnum`
  - `app/schemas/comportamiento.py` - `ValorComportamiento`
- **Valores válidos**: `A`, `B`, `C`, `D` (eliminada opción `E`)
- **Validación**: Controlada por Pydantic mediante el enum en el schema
- **Se aplica en**: Crear y actualizar comportamiento

#### ✅ Mensual (Máximo 1 por Mes)

- **Ubicación**: `app/services/comportamiento.py` - función `crear_comportamiento()` y `actualizar_comportamiento()`
- **Validación**: Verifica unicidad de:
  - `id_estudiante`
  - `id_curso`
  - `mes`
- **Constraint BD**: `UniqueConstraint("id_estudiante", "id_curso", "mes")` en modelo
- **Mensaje Error**: "Ya existe un registro de comportamiento para este estudiante, curso y mes"
- **Se aplica en**: Crear y actualizar comportamiento

---

## Archivos Modificados:

1. **backend/app/services/asistencia.py**

   - Agregadas validaciones L-V y no duplicados en `crear_asistencia()`
   - Agregadas validaciones L-V y no duplicados en `actualizar_asistencia()`

2. **backend/app/models/enums.py**

   - Removida opción `E` de `ValorComportamientoEnum`

3. **backend/app/schemas/comportamiento.py**
   - Removida opción `E` de `ValorComportamiento`

---

## Validaciones Existentes que se Mantienen:

### Asistencia:

- ✅ Fecha no puede ser futura
- ✅ Estudiante debe estar matriculado en el curso
- ✅ CMD (curso-materia-docente) debe existir
- ✅ Estudiante debe existir

### Comportamiento:

- ✅ Mes debe ser válido (enero-diciembre)
- ✅ Estudiante debe existir
- ✅ Curso debe existir
- ✅ Máximo 1 por mes (validado en BD y en servicio)

---

## Pruebas Recomendadas:

### Asistencia:

```bash
# Intentar crear asistencia en fin de semana (debe fallar)
POST /asistencias/
{
  "id_cmd": 1,
  "id_estudiante": 1,
  "fecha": "2026-01-11",  # Es sábado
  "estado": "presente"
}

# Intentar duplicar asistencia (debe fallar)
POST /asistencias/
{
  "id_cmd": 1,
  "id_estudiante": 1,
  "fecha": "2026-01-09",  # Mismo día/estudiante/materia
  "estado": "presente"
}
```

### Comportamiento:

```bash
# Intentar crear con valor E (debe fallar)
POST /comportamientos/
{
  "id_estudiante": 1,
  "id_curso": 1,
  "mes": "enero",
  "valor": "E"  # No permitido
}

# Intentar crear 2 en el mismo mes (debe fallar)
POST /comportamientos/
{
  "id_estudiante": 1,
  "id_curso": 1,
  "mes": "enero",
  "valor": "A"
}
# Repetir → error de duplicidad
```
