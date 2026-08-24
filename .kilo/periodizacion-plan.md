# Plan de migracion a periodizacion configurable

## Objetivo

Reemplazar el concepto rigido de `trimestre` por un modelo general de `periodizacion` que permita operar con 2 quimestres, 3 trimestres o 4 bimestres sin volver a rehacer backend, frontend y reglas de promedio.

La regla funcional principal sera:

- un `contexto` define una configuracion de periodizacion para cada `anio_lectivo`;
- esa configuracion determina cuantos periodos existen y como se llaman;
- todos los cursos de ese contexto y anio usan esos mismos periodos;
- los insumos se asocian a un periodo academico;
- las notas se cargan sobre insumos;
- los promedios se calculan por estudiante, curso y periodo;
- el promedio acumulado/final usa los periodos con datos disponibles.

## Decision de arquitectura

No conviene hacer un simple renombre cosmetico de `trimestres` a `periodos` en algunos componentes. Conviene completar una migracion de dominio.

Se recomienda separar el concepto en dos niveles:

1. `ConfiguracionPeriodizacion`
2. `PeriodoAcademico`

### 1. ConfiguracionPeriodizacion

Representa la definicion global del anio lectivo para un contexto.

Campos propuestos:

- `id_config_periodizacion`
- `id_contexto`
- `anio_lectivo`
- `tipo_periodizacion` con valores iniciales: `quimestral`, `trimestral`, `bimestral`
- `cantidad_periodos`
- `nombre_periodo_singular` opcional, por ejemplo `Quimestre`, `Trimestre`, `Bimestre`
- `activo` opcional si luego se quisiera versionar
- timestamps opcionales si el proyecto los usa

Restriccion unica:

- unico por `id_contexto + anio_lectivo`

### 2. PeriodoAcademico

Representa cada corte evaluativo concreto dentro de la configuracion.

Campos propuestos:

- `id_periodo`
- `id_config_periodizacion`
- `id_contexto` opcional si quieres facilitar consultas, aunque no es estrictamente necesario si ya cuelga de la configuracion
- `anio_lectivo` opcional por redundancia controlada, aunque tambien puede inferirse
- `numero_periodo`
- `nombre_periodo` opcional, por ejemplo `Trimestre 1`
- `fecha_inicio`
- `fecha_fin`

Restricciones:

- unico por `id_config_periodizacion + numero_periodo`
- fechas validas y no solapadas

## Compatibilidad gradual

No conviene romper todo en una sola pasada. La migracion debe ser por fases.

### Fase 1. Introducir el nuevo dominio sin borrar el viejo contrato visual

- mantener tablas/rutas actuales funcionando temporalmente;
- introducir nuevas entidades internas;
- adaptar servicios para usar el nuevo modelo;
- exponer respuestas compatibles mientras se actualiza frontend.

### Fase 2. Migrar frontend a lenguaje de periodizacion

- cambiar formularios, textos y API wrappers;
- permitir que la UI se adapte a 2, 3 o 4 periodos;
- dejar de asumir opciones fijas 1, 2, 3.

### Fase 3. Retirar legado de trimestre

- eliminar referencias viejas a `id_trimestre`, `numero_trimestre`, rutas y funciones por curso;
- dejar alias o migraciones solo si existe una necesidad real de compatibilidad de datos.

## Cambios de modelo y base de datos

## Backend: nuevas entidades

Crear:

- `backend/app/models/configuracion_periodizacion.py`
- `backend/app/models/periodos_academicos.py`
- schemas, CRUD y API equivalentes

### Modelo recomendado

`ConfiguracionPeriodizacion`

- FK a `contextos`
- unique `(id_contexto, anio_lectivo)`
- enum `tipo_periodizacion`
- entero `cantidad_periodos`

`PeriodoAcademico`

- FK a `configuracion_periodizacion`
- `numero_periodo`
- `fecha_inicio`
- `fecha_fin`
- nombre opcional calculable o persistido

## Migracion de datos

Crear una migracion que:

1. cree tablas nuevas;
2. lea la tabla actual `trimestres` agrupando por `id_contexto + anio_lectivo`;
3. cree una `ConfiguracionPeriodizacion` con `tipo_periodizacion = trimestral` y `cantidad_periodos = 3` por cada grupo detectado;
4. cree un `PeriodoAcademico` por cada registro existente de `trimestres`;
5. agregue en `insumos` una nueva FK `id_periodo`;
6. haga backfill desde `id_trimestre` hacia `id_periodo`;
7. deje `id_trimestre` temporalmente para compatibilidad si hace falta;
8. en una migracion posterior elimine la dependencia final del campo legado.

## Reglas de negocio

## Configuracion por modo

### Modo institucional

- solo administrativos configuran periodizacion;
- la configuracion aplica a todo el contexto;
- docentes consumen la configuracion existente;
- no se configura al crear curso.

### Modo personal

- el docente owner del contexto configura la periodizacion de su contexto;
- tambien es global al contexto personal, no al curso.

## Validaciones de configuracion

Al crear o editar una configuracion de periodizacion:

- `cantidad_periodos` debe coincidir con el tipo base si se usa catalogo fijo:
  - quimestral = 2
  - trimestral = 3
  - bimestral = 4
- o, si se quiere mas flexibilidad, `cantidad_periodos` manda y `tipo_periodizacion` es descriptivo.

Recomendacion:

- usar ambos, pero validar consistencia en estos tres tipos iniciales.

## Validaciones de periodos

Al crear/editar periodos:

- `fecha_inicio < fecha_fin`
- no se permiten solapamientos
- no se permiten huecos si se adopta continuidad estricta
- el periodo siguiente debe empezar el dia siguiente del anterior
- debe existir exactamente la cantidad de periodos definida para considerar la configuracion completa
- no puede repetirse `numero_periodo`

## Edicion con datos existentes

Si ya existen insumos asociados a un periodo:

- no permitir cambios que rompan la pertenencia temporal si el insumo tiene fecha academica;
- si hoy el insumo no tiene fecha academica real y solo existe `fecha_creacion`, usar una regla conservadora.

Regla recomendada para esta fase:

- bloquear cambios de fecha cuando ya existan insumos asociados al periodo;
- bloquear con mas razon si ya existen notas asociadas a esos insumos.

Esto evita inconsistencias sin requerir redisenar ahora la entidad insumo.

## Cambios backend por archivo

## 1. `backend/app/models/trimestres.py`

Decidir una de dos rutas:

- Ruta A: mantenerlo temporalmente y marcarlo como legado durante la migracion.
- Ruta B: reemplazarlo por `periodos_academicos.py` y adaptar importaciones.

Recomendacion:

- Ruta A durante la migracion; Ruta B al finalizar.

## 2. `backend/app/crud/trimestres.py`

No debe seguir evolucionando. Reemplazar por:

- `crud/configuracion_periodizacion.py`
- `crud/periodos_academicos.py`

Y retirar funciones viejas basadas en `id_curso`.

## 3. `backend/app/api/trimestres.py`

Debe ser reemplazado gradualmente por rutas nuevas como:

- `GET /periodizacion/contexto/{id_contexto}/{anio_lectivo}`
- `POST /periodizacion/configuracion`
- `PUT /periodizacion/configuracion/{id}`
- `POST /periodizacion/periodos/lote`
- `PUT /periodizacion/periodos/{id_periodo}`
- `DELETE /periodizacion/periodos/{id_periodo}`

Durante transicion se puede dejar `trimestres.py` como alias del nuevo servicio para no romper el frontend de golpe.

## 4. `backend/app/services/promedios.py`

Refactorizar para dejar de pensar en trimestre fijo.

Cambios:

- `calcular_promedio_trimestral` debe pasar a algo como `calcular_promedio_periodo`;
- parametros:
  - `numero_periodo`
  - `anio_lectivo`
  - o directamente `id_periodo`
- resolver periodo por configuracion del contexto y anio;
- obtener insumos del curso asociados a `id_periodo`;
- retornar estructura neutral:
  - `numero_periodo`
  - `nombre_periodo`
  - `promedio_periodo`

Para el promedio final:

- cambiar el concepto a `promedio_acumulado`;
- dividir por los periodos con datos disponibles;
- retornar tambien `periodos_con_datos` y `cantidad_periodos_configurada`.

## 5. `backend/app/services/insumos.py`

Refactorizar `_resolver_trimestre_id` a algo como `_resolver_periodo_id`.

Debe aceptar:

- `id_periodo` real;
- o `numero_periodo` dentro del `id_contexto + anio_lectivo` del curso.

Nunca debe resolver por `id_curso` en el modelo nuevo.

## 6. `backend/app/schemas/insumos.py`

Cambiar gradualmente:

- `id_trimestre` -> `id_periodo`

Si necesitas compatibilidad temporal:

- aceptar ambos en la entrada durante una fase intermedia;
- normalizar internamente a `id_periodo`.

## 7. `backend/app/api/promedios.py`

Revisar contratos para evitar endpoints atados a trimestre. Ejemplos sugeridos:

- `/promedios/periodo/{id_estudiante}/{id_curso}/{numero_periodo}`
- `/promedios/acumulado/{id_estudiante}/{id_curso}`

O mejor aun, permitir `id_periodo`.

## Cambios frontend por archivo

## 1. `frontend/src/services/api.js`

Crear un wrapper nuevo:

- `periodizacionAPI`

Con metodos como:

- `obtenerConfiguracion(id_contexto, anio_lectivo)`
- `crearConfiguracion(data)`
- `actualizarConfiguracion(id, data)`
- `crearPeriodosLote(data)`
- `listarPeriodos(id_contexto, anio_lectivo)`
- `actualizarPeriodo(id_periodo, data)`
- `eliminarPeriodo(id_periodo)`

Mantener `trimestresAPI` solo como alias temporal si fuera necesario.

## 2. `frontend/src/views/AdminF/trimestresAdmin.jsx`

Este archivo debe cambiar de rol y probablemente de nombre.

Nuevo objetivo:

- configurar la periodizacion del anio lectivo actual del contexto;
- seleccionar tipo: quimestral, trimestral, bimestral;
- generar automaticamente la cantidad de formularios segun el tipo;
- validar continuidad, no solapamiento y completitud;
- mostrar estado de configuracion.

Recomendacion:

- renombrar a algo como `periodizacionAdmin.jsx`;
- mantener un redirect o ruta vieja temporal si es necesario.

## 3. `frontend/src/views/DocenteF/cursoPrincipal.jsx`

Cambios obligatorios:

- dejar de mostrar un selector fijo `Trimestre 1, 2, 3`;
- cargar periodos reales desde la configuracion del contexto/anio;
- mostrar `nombre_periodo` dinamico;
- al crear insumo usar `id_periodo`;
- al calcular promedios usar `numero_periodo` o `id_periodo` segun contrato final;
- cambiar textos `Promedio trimestral` por `Promedio del periodo` o `Promedio del corte`;
- cambiar `Promedio final` por `Promedio acumulado` cuando aun no existan todos los datos.

## 4. `frontend/src/views/DocenteF/docente.jsx`

Aplicar opcion A definitivamente:

- quitar del wizard de creacion de curso cualquier paso de configuracion de trimestres;
- el curso no define periodos;
- si no existe configuracion del anio, redirigir a la configuracion general correspondiente segun modo.

## 5. `frontend/src/views/AdminF/admin.jsx`

Actualizar accesos rapidos y mensajes:

- cambiar referencias de `Trimestres` por `Periodizacion` si se expone en dashboard;
- si no hay configuracion para el anio, mostrar alerta prioritaria.

## Contratos de respuesta recomendados

## Configuracion

```json
{
  "id_config_periodizacion": 7,
  "id_contexto": 3,
  "anio_lectivo": "2026-2027",
  "tipo_periodizacion": "trimestral",
  "cantidad_periodos": 3,
  "completa": true,
  "periodos": [
    {
      "id_periodo": 11,
      "numero_periodo": 1,
      "nombre_periodo": "Trimestre 1",
      "fecha_inicio": "2026-09-01",
      "fecha_fin": "2026-11-30"
    }
  ]
}
```

## Promedio por periodo

```json
{
  "id_estudiante": 9,
  "id_curso": 4,
  "numero_periodo": 1,
  "nombre_periodo": "Trimestre 1",
  "anio_lectivo": "2026-2027",
  "promedio_actividades": 8.5,
  "promedio_proyecto": 9.0,
  "promedio_examen": 8.2,
  "promedio_periodo": 8.41
}
```

## Promedio acumulado

```json
{
  "id_estudiante": 9,
  "id_curso": 4,
  "anio_lectivo": "2026-2027",
  "tipo_periodizacion": "trimestral",
  "cantidad_periodos": 3,
  "periodos_con_datos": 2,
  "promedio_acumulado": 8.63,
  "promedios_por_periodo": []
}
```

## Riesgos y decisiones tecnicas

## 1. Renombre masivo vs adaptacion incremental

Recomendacion:

- hacer adaptacion incremental;
- migrar backend primero;
- luego wrappers de frontend;
- luego UI.

## 2. Fecha academica de insumo

Actualmente parece no existir una fecha academica fuerte para validar pertenencia exacta al periodo. Esto limita las reglas de edicion de periodos.

Decision recomendada para esta fase:

- no introducir esa complejidad aun;
- bloquear cambios de fechas si el periodo ya tiene insumos.

## 3. Ponderaciones y formula de promedio

La formula actual por componentes parece independiente del nombre del periodo, por lo que se puede conservar. Solo hay que desacoplarla del numero fijo de trimestres.

## Plan de implementacion

1. Crear modelos y migraciones de `ConfiguracionPeriodizacion` y `PeriodoAcademico`.
2. Migrar datos existentes desde `trimestres` e `insumos.id_trimestre`.
3. Crear CRUD y API nuevos para periodizacion.
4. Refactorizar servicios `insumos` y `promedios` para usar `id_periodo`.
5. Mantener compatibilidad temporal con `trimestresAPI` si hace falta.
6. Cambiar frontend `api.js` a `periodizacionAPI`.
7. Refactorizar `trimestresAdmin.jsx` a configurador dinamico de periodizacion.
8. Eliminar configuracion de trimestres del wizard de creacion de curso.
9. Refactorizar `cursoPrincipal.jsx` para periodos dinamicos.
10. Retirar referencias legadas a trimestre cuando todo este estable.

## Criterio de terminado

La migracion estara completa cuando:

- no queden consultas por `Trimestre.id_curso`;
- `insumos` opere con `id_periodo`;
- docentes y admin vean periodos dinamicos segun configuracion;
- el wizard de crear curso ya no configure trimestres;
- promedio por periodo y acumulado funcionen con 2, 3 o 4 periodos;
- cambiar entre quimestral, trimestral y bimestral solo requiera configurar periodizacion, no cambiar codigo.
