# 🧪 Guía de Testeo - Búsqueda, Paginación y Validaciones

**Versión:** 1.0  
**Fecha:** 6 de enero de 2026

---

## ✅ Pre-requisitos

1. Backend ejecutándose en `http://localhost:8000`
2. Token JWT válido de docente y admin
3. Datos de prueba en BD

```bash
# Para obtener token de docente
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo": "docente@example.com", "contrasena": "password123"}'

# Para obtener token de admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo": "admin@example.com", "contrasena": "password123"}'
```

---

## 📋 Test 1: Paginación en Notas

### Test 1.1 - Listar notas sin paginación (página 1)

```bash
curl -X GET http://localhost:8000/api/notas \
  -H "Authorization: Bearer <token_docente>"
```

**Esperado:** Array de notas (máximo 10 por defecto)

### Test 1.2 - Listar notas página 2

```bash
curl -X GET "http://localhost:8000/api/notas?page=2&size=5" \
  -H "Authorization: Bearer <token_docente>"
```

**Esperado:** Notas de la página 2, 5 por página

### Test 1.3 - Filtrar por insumo con paginación

```bash
curl -X GET "http://localhost:8000/api/notas?id_insumo=1&page=1&size=10" \
  -H "Authorization: Bearer <token_docente>"
```

**Esperado:** Notas del insumo 1, página 1

---

## 🔐 Test 2: Autenticación Requerida

### Test 2.1 - Sin token (debe fallar)

```bash
curl -X GET http://localhost:8000/api/notas
```

**Esperado:** Error 401

```json
{ "detail": "Not authenticated" }
```

### Test 2.2 - Token inválido (debe fallar)

```bash
curl -X GET http://localhost:8000/api/notas \
  -H "Authorization: Bearer token_invalido"
```

**Esperado:** Error 401

```json
{ "detail": "Token inválido" }
```

---

## 👨‍🏫 Test 3: Docente Edita Solo Sus Cursos

### Test 3.1 - Docente obtiene lista de cursos

```bash
curl -X GET http://localhost:8000/api/cursos \
  -H "Authorization: Bearer <token_docente>"
```

**Esperado:** Lista de todos los cursos (lectura permitida)

### Test 3.2 - Docente actualiza su propio curso (éxito)

```bash
curl -X PUT http://localhost:8000/api/cursos/1 \
  -H "Authorization: Bearer <token_docente>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Nuevo nombre"}'
```

**Esperado:** 200 OK (si es tutor del curso 1)

### Test 3.3 - Docente actualiza curso ajeno (debe fallar)

```bash
curl -X PUT http://localhost:8000/api/cursos/2 \
  -H "Authorization: Bearer <token_docente>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Nuevo nombre"}'
```

**Esperado:** Error 403

```json
{ "detail": "Solo el tutor del curso puede realizar esta acción" }
```

### Test 3.4 - Admin actualiza cualquier curso (éxito)

```bash
curl -X PUT http://localhost:8000/api/cursos/1 \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Editado por admin"}'
```

**Esperado:** 200 OK

---

## 📚 Test 4: Docente Crea Insumos Solo en Sus Materias

### Test 4.1 - Docente crea insumo en su materia (éxito)

```bash
curl -X POST http://localhost:8000/api/insumos \
  -H "Authorization: Bearer <token_docente>" \
  -H "Content-Type: application/json" \
  -d '{
    "id_cmd": 1,
    "nombre": "Parcial 1",
    "descripcion": "Evaluación",
    "ponderacion": 3,
    "tipo_insumo": "evaluacion",
    "trimestre": 1
  }'
```

**Esperado:** 201 Created (si docente imparte en CMD 1)

### Test 4.2 - Docente crea insumo en materia ajena (debe fallar)

```bash
curl -X POST http://localhost:8000/api/insumos \
  -H "Authorization: Bearer <token_docente_otro>" \
  -H "Content-Type: application/json" \
  -d '{
    "id_cmd": 1,
    "nombre": "Parcial",
    "descripcion": "Test",
    "ponderacion": 3,
    "tipo_insumo": "evaluacion",
    "trimestre": 1
  }'
```

**Esperado:** Error 403

```json
{ "detail": "Solo puedes crear insumos para tus propias materias" }
```

### Test 4.3 - Docente actualiza insumo ajeno (debe fallar)

```bash
curl -X PUT http://localhost:8000/api/insumos/5 \
  -H "Authorization: Bearer <token_docente_otro>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Nuevo nombre"}'
```

**Esperado:** Error 403

```json
{ "detail": "Solo el docente asignado puede actualizar este insumo" }
```

---

## 🚫 Test 5: No Eliminar Insumos con Notas

### Setup: Crear insumo y nota

```bash
# 1. Crear insumo (id_insumo = 10)
curl -X POST http://localhost:8000/api/insumos ...

# 2. Crear nota para ese insumo
curl -X POST http://localhost:8000/api/notas \
  -H "Authorization: Bearer <token_docente>" \
  -H "Content-Type: application/json" \
  -d '{
    "id_insumo": 10,
    "id_estudiante": 5,
    "calificacion": 8.5
  }'
```

### Test 5.1 - Intentar eliminar insumo con notas (debe fallar)

```bash
curl -X DELETE http://localhost:8000/api/insumos/10 \
  -H "Authorization: Bearer <token_docente>"
```

**Esperado:** Error 400

```json
{ "detail": "No se puede eliminar un insumo que tiene notas asignadas" }
```

### Test 5.2 - Eliminar nota primero, luego insumo (éxito)

```bash
# Eliminar la nota
curl -X DELETE http://localhost:8000/api/notas/nota_id \
  -H "Authorization: Bearer <token_docente>"

# Ahora sí eliminar insumo
curl -X DELETE http://localhost:8000/api/insumos/10 \
  -H "Authorization: Bearer <token_docente>"
```

**Esperado:** 200 OK

---

## 🔒 Test 6: Admin Solo Lectura en Notas

### Test 6.1 - Admin lee notas (éxito)

```bash
curl -X GET http://localhost:8000/api/notas \
  -H "Authorization: Bearer <token_admin>"
```

**Esperado:** 200 OK - Lista de notas

### Test 6.2 - Admin intenta crear nota (debe fallar)

```bash
curl -X POST http://localhost:8000/api/notas \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "id_insumo": 1,
    "id_estudiante": 1,
    "calificacion": 8.5
  }'
```

**Esperado:** Error 403

```json
{ "detail": "Los administradores no pueden modificar notas" }
```

### Test 6.3 - Admin intenta actualizar nota (debe fallar)

```bash
curl -X PUT http://localhost:8000/api/notas/1 \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"calificacion": 9.0}'
```

**Esperado:** Error 403

```json
{ "detail": "Los administradores no pueden modificar notas" }
```

### Test 6.4 - Admin intenta eliminar nota (debe fallar)

```bash
curl -X DELETE http://localhost:8000/api/notas/1 \
  -H "Authorization: Bearer <token_admin>"
```

**Esperado:** Error 403

```json
{ "detail": "Los administradores no pueden eliminar notas" }
```

---

## 🧪 Test 7: Admin Solo Lectura en Asistencia

### Test 7.1 - Admin intenta crear asistencia (debe fallar)

```bash
curl -X POST http://localhost:8000/api/asistencia \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"id_cmd": 1, "id_estudiante": 1, "estado": "presente"}'
```

**Esperado:** Error 403

```json
{ "detail": "Los administradores no pueden modificar asistencia" }
```

---

## 📊 Test 8: Admin Solo Lectura en Comportamiento

### Test 8.1 - Admin intenta crear comportamiento (debe fallar)

```bash
curl -X POST http://localhost:8000/api/comportamiento \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "id_estudiante": 1,
    "id_curso": 1,
    "mes": "enero",
    "calificacion": 8
  }'
```

**Esperado:** Error 403

```json
{ "detail": "Los administradores no pueden modificar comportamiento" }
```

---

## ✨ Checklist Final

- [ ] Paginación en notas funciona
- [ ] Sin token devuelve 401
- [ ] Token inválido devuelve 401
- [ ] Docente puede editar solo sus cursos
- [ ] Admin puede editar todos los cursos
- [ ] Docente crea insumos solo en sus materias
- [ ] No se elimina insumo con notas
- [ ] Admin no puede crear notas
- [ ] Admin no puede actualizar notas
- [ ] Admin no puede eliminar notas
- [ ] Admin no puede crear asistencia
- [ ] Admin no puede crear comportamiento
- [ ] Admin PUEDE leer todos los recursos

---

## 🐛 Troubleshooting

**Error: "Not authenticated"**

- Verificar que el token está siendo enviado correctamente
- Verificar que el token no ha expirado
- Revisar formato: `Authorization: Bearer <token>`

**Error: "Token inválido"**

- Asegurar que el token fue generado por el servidor
- Verificar que la clave secreta es correcta en JWT

**Error: "Curso no encontrado"**

- Verificar que el ID del curso existe en BD
- Usar IDs válidos de la base de datos

**Error: "Solo el tutor del curso puede realizar..."**

- Verificar que el usuario logueado es tutor del curso
- Usar token del docente correcto

---

## 📞 Soporte

Para reportar bugs o problemas:

1. Incluir el comando exacto ejecutado
2. Incluir el error completo recibido
3. Incluir la versión del backend
4. Incluir datos de prueba (IDs utilizados)
