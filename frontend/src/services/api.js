// Configuración base de la API
const API_BASE_URL = "http://localhost:8000/api";

// Obtener token del localStorage
const getToken = () => {
  return localStorage.getItem("token");
};

// Construir querystring desde un objeto de filtros
const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

  if (entries.length === 0) return "";

  const query = entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

  return `?${query}`;
};

// Función para hacer peticiones autenticadas
const apiCall = async (endpoint, method = "GET", body = null) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT")) {
    config.body = JSON.stringify(body);
  }

  try {
    // Construir URL final asegurando que se conserve el prefijo API_BASE_URL
    // y que no perdamos la parte "/api" al usar el constructor URL con
    // endpoints que empiezan con '/'.
    const base = API_BASE_URL.replace(/\/$/, "");
    // separar path y query
    const [pathPart, queryPart] = endpoint.split("?");
    const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
    // agregar slash final si el último segmento no es numérico
    const segments = path.split("/").filter(Boolean);
    const last = segments.length ? segments[segments.length - 1] : null;
    const normalizedPath = last && !/^\d+$/.test(last) && !path.endsWith("/") ? `${path}/` : path;
    const finalUrl = `${base}${normalizedPath}${queryPart ? `?${queryPart}` : ""}`;

    // Log de depuración para verificar URL y configuración
    console.debug("API CALL", method, finalUrl, config);
    const response = await fetch(finalUrl, config);

    if (!response.ok) {
      // Manejar respuestas vacías (204) y otras respuestas sin contenido
      if (response.status === 204) {
        return null;
      }

      // Intentar obtener mensaje de error y normalizarlo a string
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        if (error) {
          if (typeof error === "string") {
            errorMessage = error;
          } else if (typeof error === "object") {
            // si existe 'detail', preferirlo
            if (error.detail !== undefined) {
              errorMessage =
                typeof error.detail === "string"
                  ? error.detail
                  : JSON.stringify(error.detail);
            } else {
              // serializar el objeto/array completo
              errorMessage = JSON.stringify(error);
            }
          }
        }
      } catch (e) {
        // Si no hay JSON, usar el status
      }

      throw new Error(errorMessage);
    }

    // Manejar respuestas sin contenido
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // Normalizar re-lanzamiento para garantizar un Error con mensaje legible
    console.error("API Error:", error);
    if (error instanceof Error) throw error;
    try {
      throw new Error(JSON.stringify(error));
    } catch (e) {
      throw new Error(String(error));
    }
  }
};

// ==================== CURSOS ====================
export const cursosAPI = {
  // Obtener cursos filtrados por tutor (docente actual)
  obtenerCursosPorDocente: (id_tutor) =>
    apiCall(`/cursos?id_tutor=${id_tutor}`),

  obtenerCurso: (id_curso) => apiCall(`/cursos/${id_curso}`),
  listar: (filtros = {}) => apiCall(`/cursos${buildQuery(filtros)}`),
  crear: (data) => apiCall(`/cursos`, "POST", data),
  actualizar: (id_curso, data) => apiCall(`/cursos/${id_curso}`, "PUT", data),
  eliminar: (id_curso) => apiCall(`/cursos/${id_curso}`, "DELETE"),
};

// ==================== CURSOS-MATERIAS-DOCENTES ====================
export const cmdAPI = {
  // Obtener materias/insumos de un docente en un curso
  listarPorDocente: (id_curso, id_docente) =>
    apiCall(
      `/cursos-materias-docentes?id_curso=${id_curso}&id_docente=${id_docente}`
    ),

  obtener: (id_cmd) => apiCall(`/cursos-materias-docentes/${id_cmd}`),
};

// ==================== INSUMOS ====================
export const insumosAPI = {
  // Obtener insumos de una materia/curso
  listarPorCMD: (id_cmd) => apiCall(`/insumos?id_cmd=${id_cmd}`),

  obtener: (id_insumo) => apiCall(`/insumos/${id_insumo}`),

  crear: (data) => apiCall("/insumos", "POST", data),

  actualizar: (id_insumo, data) =>
    apiCall(`/insumos/${id_insumo}`, "PUT", data),

  eliminar: (id_insumo) => apiCall(`/insumos/${id_insumo}`, "DELETE"),
};

// ==================== ESTUDIANTES ====================
export const estudiantesAPI = {
  // Obtener estudiantes de un curso
  obtenerPorCurso: (id_curso) => apiCall(`/estudiantes?id_curso=${id_curso}`),

  // Búsquedas filtradas (por nombre, apellido o estado)
  buscar: (filtros = {}) => apiCall(`/estudiantes${buildQuery(filtros)}`),

  obtener: (id_estudiante) => apiCall(`/estudiantes/${id_estudiante}`),
  crear: (data) => apiCall(`/estudiantes`, "POST", data),
  actualizar: (id_estudiante, data) =>
    apiCall(`/estudiantes/${id_estudiante}`, "PUT", data),
  eliminar: (id_estudiante) =>
    apiCall(`/estudiantes/${id_estudiante}`, "DELETE"),
};

// ==================== NOTAS ====================
export const notasAPI = {
  // Obtener notas por insumo
  listarPorInsumo: (id_insumo) => apiCall(`/notas?id_insumo=${id_insumo}`),

  // Listar notas con filtros (por estudiante, insumo, etc.)
  listar: (filtros = {}) => apiCall(`/notas${buildQuery(filtros)}`),

  // Obtener notas por estudiante e insumo
  obtenerNotaEstudiante: (id_estudiante, id_insumo) =>
    apiCall(`/notas?id_estudiante=${id_estudiante}&id_insumo=${id_insumo}`),

  crear: (data) => apiCall("/notas", "POST", data),

  actualizar: (id_nota, data) => apiCall(`/notas/${id_nota}`, "PUT", data),

  obtener: (id_nota) => apiCall(`/notas/${id_nota}`),
};

// ==================== MATERIAS ====================
export const materiasAPI = {
  listar: (filtros = {}) => apiCall(`/materias${buildQuery(filtros)}`),
  obtener: (id_materia) => apiCall(`/materias/${id_materia}`),
  crear: (data) => apiCall(`/materias`, "POST", data),
  actualizar: (id_materia, data) =>
    apiCall(`/materias/${id_materia}`, "PUT", data),
  eliminar: (id_materia) => apiCall(`/materias/${id_materia}`, "DELETE"),
};

// ==================== ASISTENCIA ====================
export const asistenciaAPI = {
  listar: (filtros = {}) => apiCall(`/asistencia${buildQuery(filtros)}`),
  obtener: (id_asistencia) => apiCall(`/asistencia/${id_asistencia}`),
  crear: (data) => apiCall("/asistencia", "POST", data),
  actualizar: (id_asistencia, data) =>
    apiCall(`/asistencia/${id_asistencia}`, "PUT", data),
  eliminar: (id_asistencia) =>
    apiCall(`/asistencia/${id_asistencia}`, "DELETE"),
};

// ==================== COMPORTAMIENTO ====================
export const comportamientoAPI = {
  listar: (filtros = {}) => apiCall(`/comportamiento${buildQuery(filtros)}`),
  obtener: (id_comportamiento) =>
    apiCall(`/comportamiento/${id_comportamiento}`),
  crear: (data) => apiCall("/comportamiento", "POST", data),
  actualizar: (id_comportamiento, data) =>
    apiCall(`/comportamiento/${id_comportamiento}`, "PUT", data),
  eliminar: (id_comportamiento) =>
    apiCall(`/comportamiento/${id_comportamiento}`, "DELETE"),
};

// ==================== PROMEDIOS ====================
export const promediosAPI = {
  obtenerTrimestral: (
    id_estudiante,
    id_curso,
    numero_trimestre,
    anio_lectivo
  ) =>
    apiCall(
      `/promedios/trimestre/${id_estudiante}/${id_curso}/${numero_trimestre}?anio_lectivo=${encodeURIComponent(
        anio_lectivo
      )}`
    ),
  obtenerFinal: (id_estudiante, id_curso, anio_lectivo) =>
    apiCall(
      `/promedios/final/${id_estudiante}/${id_curso}?anio_lectivo=${encodeURIComponent(
        anio_lectivo
      )}`
    ),
};

// ==================== USUARIOS ====================
export const usuariosAPI = {
  listar: (filtros = {}) => apiCall(`/usuarios${buildQuery(filtros)}`),
  obtener: (id_usuario) => apiCall(`/usuarios/${id_usuario}`),
  crear: (data) => apiCall(`/usuarios`, "POST", data),
  actualizar: (id_usuario, data) =>
    apiCall(`/usuarios/${id_usuario}`, "PUT", data),
  eliminar: (id_usuario) => apiCall(`/usuarios/${id_usuario}`, "DELETE"),
};

// ==================== ASIGNACIONES (Cursos-Materias-Docentes) ====================
export const asignacionesAPI = {
  listar: (filtros = {}) =>
    apiCall(`/cursos-materias-docentes${buildQuery(filtros)}`),
  obtener: (id_cmd) => apiCall(`/cursos-materias-docentes/${id_cmd}`),
  crear: (data) => apiCall(`/cursos-materias-docentes`, "POST", data),
  actualizar: (id_cmd, data) =>
    apiCall(`/cursos-materias-docentes/${id_cmd}`, "PUT", data),
  eliminar: (id_cmd) =>
    apiCall(`/cursos-materias-docentes/${id_cmd}`, "DELETE"),
};
