# 🧪 Guía de Testing - Docente Conectado

## ✅ Pre-requisitos

1. **Backend corriendo**: `http://localhost:8000`
2. **Frontend corriendo**: `http://localhost:3000`
3. **Base de datos**: Seeded con datos de prueba
4. **Usuario Docente creado**: con `id_usuario` y rol de docente
5. **Cursos asignados**: Al docente como `id_tutor`

---

## 🔍 Test 1: Login y Visualización de Cursos

### Pasos:

1. Ir a `http://localhost:3000/`
2. Ingresar credenciales del docente
3. Verificar que token se guarda en `localStorage`
4. Verificar que usuario se guarda en `localStorage`

### Resultado esperado:

- ✅ Redirección a `/docente`
- ✅ Mostrar nombre del docente en navbar
- ✅ Listar solo los cursos donde `id_tutor = usuario.id_usuario`
- ✅ No mostrar botones de agregar/editar/eliminar curso

---

## 🔍 Test 2: Acceso a Vista de Curso

### Pasos:

1. En la página de docente, hacer click en botón "Ver Curso"
2. Verificar navegación a `/curso/{id_curso}`

### Resultado esperado:

- ✅ Mostrar nombre del curso en navbar
- ✅ Botón "Volver" regresa a `/docente`
- ✅ Cargar materias asignadas al docente en ese curso
- ✅ Selector de materia funcional

---

## 🔍 Test 3: Crear Insumo

### Pasos:

1. En vista de curso, ingresar datos de insumo:
   - Nombre: "Prueba 1"
   - Descripción: "Insumo de prueba"
   - Ponderación: "5"
2. Click "Agregar Insumo"

### Verificar en BD:

```sql
SELECT * FROM insumos WHERE nombre = 'Prueba 1' AND id_cmd = X;
```

### Resultado esperado:

- ✅ Insumo aparece en lista
- ✅ Datos correctos en BD
- ✅ Se puede ver en tabla con nombre, descripción, ponderación

---

## 🔍 Test 4: Agregar Notas

### Pasos:

1. En vista de curso, hacer click "Notas" en un insumo
2. Modal abre mostrando tabla de estudiantes
3. Ingresar nota para un estudiante: `8.5`
4. Click "Guardar"

### Verificar en BD:

```sql
SELECT * FROM notas
WHERE id_insumo = X AND id_estudiante = Y;
```

### Resultado esperado:

- ✅ Nota aparece en tabla
- ✅ Se guarda en BD con calificación = 8.5
- ✅ Modal actualiza sin recargar página

---

## 🔍 Test 5: Actualizar Nota Existente

### Pasos:

1. Modal ya abierto con notas existentes
2. Cambiar valor de nota: `7.5`
3. Click "Guardar"

### Verificar en BD:

```sql
SELECT calificacion FROM notas WHERE id_nota = X;
```

### Resultado esperado:

- ✅ Nota se actualiza a 7.5
- ✅ No crea duplicados
- ✅ Mantiene `fecha_asignacion` original

---

## 🔍 Test 6: Eliminar Insumo

### Pasos:

1. En vista de curso, hacer click "Eliminar" en un insumo
2. Click en confirmación

### Verificar en BD:

```sql
SELECT * FROM insumos WHERE id_insumo = X;
```

### Resultado esperado:

- ✅ Insumo desaparece de lista
- ✅ Se elimina de BD (cascada)
- ✅ Notas relacionadas se eliminan

---

## 🐛 Errores Comunes y Solución

### Error: "No hay usuario autenticado"

**Causa**: localStorage no tiene `usuario`
**Solución**: Ejecutar login primero

### Error: "Token inválido"

**Causa**: Token expirado o incorrecto
**Solución**: Hacer logout y login nuevamente

### Error: "La materia ya está asignada a este curso"

**Causa**: CMD duplicado en BD
**Solución**: Verificar datos de prueba

### Error: "La nota para este estudiante e insumo ya existe"

**Causa**: Intento de crear nota duplicada
**Solución**: Usar PUT para actualizar en lugar de POST

---

## 📊 Test de Datos Esperados

### Estructura de Respuesta - Cursos

```json
{
  "id_curso": 1,
  "nombre": "2do Ciencias Emprendimiento",
  "anio_lectivo": "2024",
  "id_tutor": 1
}
```

### Estructura de Respuesta - Insumos

```json
{
  "id_insumo": 1,
  "id_cmd": 1,
  "nombre": "Prueba 1",
  "descripcion": "Insumo de prueba",
  "ponderacion": 5.0,
  "fecha_creacion": "2024-01-06"
}
```

### Estructura de Respuesta - Notas

```json
{
  "id_nota": 1,
  "id_estudiante": 5,
  "id_insumo": 1,
  "calificacion": 8.5
}
```

---

## 🔐 Validaciones Verificadas

- ✅ Campo requerido: nombre de insumo
- ✅ Rango de ponderación: 0-10
- ✅ Rango de calificación: 0-10
- ✅ Unicidad: estudiante + insumo (una nota por combinación)
- ✅ Cascada: eliminar insumo elimina sus notas

---

## 📋 Checklist Final

- [ ] Login funciona
- [ ] Cursos del docente se cargan
- [ ] Vista de curso se abre
- [ ] Selector de materia funciona
- [ ] Crear insumo funciona
- [ ] Listar insumos funciona
- [ ] Eliminar insumo funciona
- [ ] Modal de notas se abre
- [ ] Tabla de estudiantes se muestra
- [ ] Crear nota funciona
- [ ] Actualizar nota funciona
- [ ] No se pueden crear notas duplicadas
- [ ] Logout funciona

---

## 🚀 Comando para Reset de BD (Opcional)

Si necesitas limpiar datos de prueba:

```bash
# Eliminar todas las notas
DELETE FROM notas;

# Eliminar todos los insumos
DELETE FROM insumos;

# Reiniciar secuencias (según DBMS)
ALTER SEQUENCE notas_id_nota_seq RESTART WITH 1;
ALTER SEQUENCE insumos_id_insumo_seq RESTART WITH 1;
```

---

## 📞 Soporte

Si encuentras issues:

1. Revisa browser console (F12)
2. Revisa backend logs
3. Verifica datos en BD
4. Confirma token en localStorage
