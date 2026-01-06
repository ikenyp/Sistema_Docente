// Configuración base de la API
const API_BASE_URL = "http://localhost:8000/api";

// Obtener token del localStorage
const getToken = () => {
  return localStorage.getItem("token");
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      // Manejar respuestas vacías (204) y otras respuestas sin contenido
      if (response.status === 204) {
        return null;
      }

      // Intentar obtener mensaje de error
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.detail || errorMessage;
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
    console.error("API Error:", error);
    throw error;
  }
};

// ==================== CURSOS ====================
export const cursosAPI = {
  // Obtener cursos filtrados por tutor (docente actual)
  obtenerCursosPorDocente: (id_tutor) =>
    apiCall(`/cursos?id_tutor=${id_tutor}`),

  obtenerCurso: (id_curso) => apiCall(`/cursos/${id_curso}`),
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

  obtener: (id_estudiante) => apiCall(`/estudiantes/${id_estudiante}`),
};

// ==================== NOTAS ====================
export const notasAPI = {
  // Obtener notas por insumo
  listarPorInsumo: (id_insumo) => apiCall(`/notas?id_insumo=${id_insumo}`),

  // Obtener notas por estudiante e insumo
  obtenerNotaEstudiante: (id_estudiante, id_insumo) =>
    apiCall(`/notas?id_estudiante=${id_estudiante}&id_insumo=${id_insumo}`),

  crear: (data) => apiCall("/notas", "POST", data),

  actualizar: (id_nota, data) => apiCall(`/notas/${id_nota}`, "PUT", data),

  obtener: (id_nota) => apiCall(`/notas/${id_nota}`),
};

// ==================== MATERIAS ====================
export const materiasAPI = {
  obtener: (id_materia) => apiCall(`/materias/${id_materia}`),
};
