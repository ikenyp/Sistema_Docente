# Conexión Docente - Backend: Resumen de Cambios

## 📋 Visión General

Se ha realizado una transformación completa del componente Docente para conectarlo con el backend de manera lógica y funcional. El docente ahora:

- ✅ **Ve solo sus cursos asignados** (obtenidos de la API)
- ✅ **Accede a vista detallada por curso**
- ✅ **Puede crear insumos en cada materia**
- ✅ **Ve estudiantes y asigna notas por insumo**

---

## 🔄 Cambios en el Frontend

### 1. **Nuevo Servicio API** (`frontend/src/services/api.js`)

- Centraliza todas las llamadas al backend
- Maneja autenticación con token JWT
- Funciones para: Cursos, Materias, Insumos, Estudiantes, Notas

### 2. **Componente Docente Actualizado** (`docente.jsx`)

- **Eliminado**: CRUD local (agregar/editar/eliminar cursos)
- **Nuevo**: Conexión con API para obtener cursos del docente
- Carga datos del usuario desde localStorage
- Muestra solo los cursos asignados como tutor (id_tutor)
- Botón "Ver Curso" navega a la vista detallada

### 3. **Nuevo Componente** (`cursoPrincipal.jsx`)

- **Vista detallada del curso** con:
  - Selector de materias asignadas al docente
  - **Sección de Insumos**:
    - Crear nuevo insumo (nombre, descripción, ponderación)
    - Listar insumos creados
    - Eliminar insumos
  - **Modal de Notas**:
    - Click en botón "Notas" abre modal con estudiantes del curso
    - Tabla de estudiantes con campos de nota
    - Opción de crear/actualizar notas

### 4. **Estilos Nuevos** (`cursoPrincipal.css`)

- Navbar con botón volver
- Grid responsive de insumos
- Modal de notas con tabla scrolleable
- Diseño moderno con transiciones

### 5. **Actualización de Rutas** (`App.js`)

- Nueva ruta: `/curso/:id_curso` → CursoPrincipal

---

## 🔧 Cambios en el Backend

### 1. **API Estudiantes** (`app/api/estudiantes.py`)

- ✅ Agregado parámetro `id_curso` para filtrar estudiantes por curso

### 2. **CRUD Estudiantes** (`app/crud/estudiantes.py`)

- ✅ Implementado filtro `id_curso_actual` en la query

### 3. **Esquemas de Notas** (`app/schemas/notas.py`)

- ❌ Cambio: `id_alumno` → `id_estudiante`
- ❌ Cambio: `id_curso_materia_docente` → `id_insumo`
- ❌ Cambio: `nota` → `calificacion`

### 4. **Servicio de Notas** (`app/services/notas.py`)

- ✅ Actualizado para usar nombres correctos del schema

---

## 🔌 Flujo de Datos

### Paso 1: Docente inicia sesión

```
Login → Token + Usuario guardado en localStorage
```

### Paso 2: Docente ve sus cursos

```
GET /api/cursos?id_tutor={id_usuario}
→ Retorna lista de cursos asignados
```

### Paso 3: Docente abre un curso

```
GET /api/cursos-materias-docentes?id_curso={id}&id_docente={id}
→ Retorna materias asignadas al docente en ese curso
```

### Paso 4: Docente crea insumo

```
POST /api/insumos
Body: {
  id_cmd: {id_cmd},
  nombre: "...",
  descripcion: "...",
  ponderacion: 5.0
}
```

### Paso 5: Docente agrega notas

```
GET /api/estudiantes?id_curso={id}
→ Obtiene lista de estudiantes del curso

POST /api/notas o PUT /api/notas/{id}
Body: {
  id_insumo: {id},
  id_estudiante: {id},
  calificacion: 8.5
}
```

---

## 📁 Estructura de Archivos Creados

```
frontend/
├── src/
│   ├── services/
│   │   └── api.js ✨ NUEVO
│   ├── views/DocenteF/
│   │   ├── docente.jsx ♻️ ACTUALIZADO
│   │   └── cursoPrincipal.jsx ✨ NUEVO
│   ├── styles/
│   │   ├── docente.css ♻️ ACTUALIZADO
│   │   └── cursoPrincipal.css ✨ NUEVO
│   └── App.js ♻️ ACTUALIZADO
backend/
├── app/
│   ├── api/
│   │   └── estudiantes.py ♻️ ACTUALIZADO
│   ├── crud/
│   │   └── estudiantes.py ♻️ ACTUALIZADO
│   ├── schemas/
│   │   └── notas.py ♻️ ACTUALIZADO
│   └── services/
│       └── notas.py ♻️ ACTUALIZADO
```

---

## 🚀 Cómo Usar

### 1. **Iniciar sesión como Docente**

- Ir a `/`
- Ingresar credenciales de docente
- Se guarda token y datos en localStorage

### 2. **Ver Cursos**

- Se cargan automáticamente desde la API
- Mostrar solo cursos donde es tutor (id_tutor)

### 3. **Acceder a Curso**

- Click en "Ver Curso"
- Se abre vista detallada con insumos

### 4. **Crear Insumo**

- Rellenar formulario (nombre, descripción, ponderación)
- Click "Agregar Insumo"
- Se guarda en BD y se actualiza lista

### 5. **Agregar Notas**

- Click "Notas" en un insumo
- Modal muestra tabla de estudiantes
- Ingresa notas y click "Guardar"
- Se crea/actualiza la nota en BD

---

## ⚙️ Configuración Required

### Backend

- URL base: `http://localhost:8000/api`
- CORS habilitado para `http://localhost:3000`

### Frontend

- Token debe estar en `localStorage.getItem("token")`
- Usuario debe estar en `localStorage.getItem("usuario")`
- Usuario requiere campo `id_usuario`

---

## 🎯 Endpoints Utilizados

| Método | Endpoint                                                  | Descripción           |
| ------ | --------------------------------------------------------- | --------------------- |
| GET    | `/cursos?id_tutor={id}`                                   | Cursos del docente    |
| GET    | `/cursos-materias-docentes?id_curso={id}&id_docente={id}` | Materias en curso     |
| GET    | `/insumos?id_cmd={id}`                                    | Insumos de materia    |
| POST   | `/insumos`                                                | Crear insumo          |
| DELETE | `/insumos/{id}`                                           | Eliminar insumo       |
| GET    | `/estudiantes?id_curso={id}`                              | Estudiantes del curso |
| GET    | `/notas?id_insumo={id}`                                   | Notas de insumo       |
| POST   | `/notas`                                                  | Crear nota            |
| PUT    | `/notas/{id}`                                             | Actualizar nota       |

---

## ✅ Verificación

**Cambios completados:**

- ✅ Componente Docente conectado a API
- ✅ Vista detallada de curso creada
- ✅ CRUD de insumos implementado
- ✅ Sistema de notas funcional
- ✅ Eliminación de CRUD local
- ✅ Backend sincronizado
- ✅ Esquemas corregidos
- ✅ Rutas agregadas

**Próximos pasos opcionales:**

- Agregar validaciones más robustas
- Implementar paginación en listas
- Agregar feedback visual (loading, success, error)
- Implementar búsqueda/filtros avanzados
- Agregar eliminación de notas
