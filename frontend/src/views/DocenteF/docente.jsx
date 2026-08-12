import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/docente.css";
import {
  cmdAPI,
  cursosAPI,
  asignacionesAPI,
  insumosAPI,
  notasAPI,
  periodizacionAPI,
  estructurasAcademicasAPI,
} from "../../services/api";
import { notify } from "../../components/notify";
import CustomSelect from "../../components/admin/CustomSelect";

function Docente() {
  const navigate = useNavigate();

  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [appMode, setAppMode] = useState(
    (localStorage.getItem("app_mode") || "institucional").toLowerCase(),
  );

  const [estructuras, setEstructuras] = useState([]);
  const [resumenOperacion, setResumenOperacion] = useState({
    asignaciones: 0,
    cursosSinMaterias: 0,
    cursosSinTutor: 0,
    aniosSinPeriodizacion: 0,
  });
  const [filtroAnio, setFiltroAnio] = useState("todos");
  const [ordenCursos, setOrdenCursos] = useState("colegio-asc");
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState(false);
  const [menuOrdenAbierto, setMenuOrdenAbierto] = useState(false);
  const toolbarRef = useRef(null);

  // WIZARD DE CREACIÓN DE CURSO
  const [mostrarWizard, setMostrarWizard] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    anio_lectivo: "",
    soyTutor: true,
    id_estructura_academica: "",
  });
  const [guardandoWizard, setGuardandoWizard] = useState(false);
  const [errorWizard, setErrorWizard] = useState(null);

  // Menú y edición/eliminación de curso
  const [openMenuId, setOpenMenuId] = useState(null);
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false);
  const [editarCursoData, setEditarCursoData] = useState(null);
  const [guardandoCurso, setGuardandoCurso] = useState(false);
  const [bloqueoEstructuraEdicion, setBloqueoEstructuraEdicion] = useState("");
  const [mostrarEliminarModal, setMostrarEliminarModal] = useState(false);
  const [cursoAEliminar, setCursoAEliminar] = useState(null);

  // Control de sesión expirada
  const [sesionExpirada, setSesionExpirada] = useState(false);

  const resumenCursos = useMemo(() => {
    const totalCursos = cursos.length;
    const cursosConAnio = cursos.filter((curso) => curso?.anio_lectivo).length;
    const esTutor = cursos.some(
      (curso) => datosUsuario && curso?.id_tutor === datosUsuario.id_usuario,
    );

    return {
      totalCursos,
      cursosConAnio,
      modo: appMode === "personal" ? "Personal" : "Institucional",
      esTutor,
    };
  }, [appMode, cursos, datosUsuario]);

  const aniosDisponiblesCursos = useMemo(() => {
    return [...new Set(cursos.map((curso) => curso?.anio_lectivo).filter(Boolean))].sort();
  }, [cursos]);

  const cursosVisibles = useMemo(() => {
    let lista = [...cursos];

    if (filtroAnio !== "todos") {
      lista = lista.filter((curso) => curso?.anio_lectivo === filtroAnio);
    }

    const numeroCurso = (nombre = "") => {
      const texto = String(nombre).toLowerCase();
      const numero = parseInt(texto.match(/\d+/)?.[0] || "0", 10);
      return Number.isNaN(numero) ? 0 : numero;
    };

    const gradoCurso = (nombre = "") => {
      const texto = String(nombre).toLowerCase();
      if (texto.includes("8")) return 8;
      if (texto.includes("9")) return 9;
      if (texto.includes("10")) return 10;
      if (texto.includes("1ro") || texto.includes("1er") || texto.includes("primero")) return 11;
      if (texto.includes("2do") || texto.includes("segundo")) return 12;
      if (texto.includes("3ro") || texto.includes("tercero")) return 13;
      return 99;
    };

    const comparador = {
      "colegio-asc": (a, b) => gradoCurso(a.nombre) - gradoCurso(b.nombre) || numeroCurso(a.nombre) - numeroCurso(b.nombre) || a.nombre.localeCompare(b.nombre),
      "colegio-desc": (a, b) => gradoCurso(b.nombre) - gradoCurso(a.nombre) || numeroCurso(b.nombre) - numeroCurso(a.nombre) || b.nombre.localeCompare(a.nombre),
      "reciente": (a, b) => String(b.anio_lectivo || "").localeCompare(String(a.anio_lectivo || "")) || a.nombre.localeCompare(b.nombre),
      "antiguo": (a, b) => String(a.anio_lectivo || "").localeCompare(String(b.anio_lectivo || "")) || a.nombre.localeCompare(b.nombre),
      "alfabetico": (a, b) => a.nombre.localeCompare(b.nombre),
    }[ordenCursos] || ((a, b) => a.nombre.localeCompare(b.nombre));

    return lista.sort(comparador);
  }, [cursos, filtroAnio, ordenCursos]);

  useEffect(() => {
    const cerrarMenus = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setMenuFiltroAbierto(false);
        setMenuOrdenAbierto(false);
      }
    };

    document.addEventListener("mousedown", cerrarMenus);
    return () => document.removeEventListener("mousedown", cerrarMenus);
  }, []);

  // ====================== CARGAR CURSOS DEL DOCENTE ======================
  const cargarCursos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const usuarioJSON = localStorage.getItem("usuario");
      if (!usuarioJSON) {
        setError("No hay usuario autenticado");
        navigate("/");
        return;
      }

      const usuario = JSON.parse(usuarioJSON);
      setDatosUsuario(usuario);
      const modoActual = (
        localStorage.getItem("app_mode") || "institucional"
      ).toLowerCase();
      setAppMode(modoActual);

      let asignaciones = [];
      try {
        asignaciones = await cmdAPI.listarPorDocente(usuario.id_usuario);
      } catch {
        asignaciones = [];
      }
      const totalMateriasAsignadas = 0;

      const cursosUnicos = [];
      const vistos = new Set();
      const materiasAsignadasDocente = new Set();

      (asignaciones || []).forEach((asig) => {
        const claveMateria = asig?.id_cmd || asig?.cmd?.id_cmd || asig?.id_materia || asig?.materia?.id_materia;
        if (claveMateria) {
          materiasAsignadasDocente.add(claveMateria);
        }
        const curso =
          asig?.curso ||
          (asig?.id_curso
            ? { id_curso: asig.id_curso, nombre: "Curso", anio_lectivo: "" }
            : null);

        if (curso && curso.id_curso && !vistos.has(curso.id_curso)) {
          vistos.add(curso.id_curso);
          cursosUnicos.push(curso);
        }
      });

      let cursosTutor = [];
      try {
        cursosTutor = await cursosAPI.listar({
          id_tutor: usuario.id_usuario,
          size: 100,
        });
      } catch {
        cursosTutor = [];
      }
      (cursosTutor || []).forEach((curso) => {
        if (curso && curso.id_curso && !vistos.has(curso.id_curso)) {
          vistos.add(curso.id_curso);
          cursosUnicos.push(curso);
        }
      });

      const todasAsignaciones =
        modoActual === "personal"
          ? await asignacionesAPI.listar({ size: 100 })
          : asignaciones || [];

      const idsConAsignacion = new Set(
        (todasAsignaciones || []).map((item) => item.id_curso),
      );
      const cursosSinMaterias = cursosUnicos.filter(
        (curso) => !idsConAsignacion.has(curso.id_curso),
      ).length;
      const cursosSinTutor = cursosUnicos.filter(
        (curso) => !curso.id_tutor,
      ).length;

      const aniosUnicos = [
        ...new Set(cursosUnicos.map((curso) => curso?.anio_lectivo).filter(Boolean)),
      ];
      let aniosSinPeriodizacion = 0;
      for (const anio of aniosUnicos) {
        try {
          const config = await periodizacionAPI.obtenerConfiguracionActual(anio);
          if (!config?.periodos?.length) aniosSinPeriodizacion += 1;
        } catch {
          aniosSinPeriodizacion += 1;
        }
      }

      setResumenOperacion({
        asignaciones: materiasAsignadasDocente.size || (cursosTutor || []).length || (todasAsignaciones || []).length,
        cursosSinMaterias,
        cursosSinTutor,
        aniosSinPeriodizacion,
      });

      setCursos(cursosUnicos);
    } catch (err) {
      console.error("Error al cargar cursos:", err);

      // Detectar errores de autenticación/token inválido
      const mensajeError = err.message || "Error al cargar los cursos";
      if (
        mensajeError.includes("Token inválido") ||
        mensajeError.includes("401") ||
        mensajeError.includes("Unauthorized") ||
        mensajeError.includes("invalid token")
      ) {
        setSesionExpirada(true);
      } else if (err.message && err.message.includes("404")) {
        setCursos([]);
      } else {
        setError(mensajeError);
      }
    } finally {
      setCargando(false);
    }
  }, [navigate]);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  const cargarEstructuras = useCallback(async () => {
    if (
      (localStorage.getItem("app_mode") || "institucional").toLowerCase() !==
      "personal"
    )
      return;
    try {
      const data = await estructurasAcademicasAPI.listar({ size: 100 });
      setEstructuras(data || []);
    } catch (err) {
      console.error("Error al cargar estructuras:", err);
    }
  }, []);

  useEffect(() => {
    cargarEstructuras();
  }, [cargarEstructuras]);

  // Cerrar menú cuando se toca fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId !== null && e.target.closest(".curso-card") === null) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  // ====================== UTILIDADES ======================
  const formatarAnioLectivo = (valor) => {
    const solo_numeros = valor.replace(/\D/g, "");

    if (solo_numeros.length <= 4) {
      return solo_numeros;
    } else if (solo_numeros.length <= 8) {
      return solo_numeros.slice(0, 4) + "-" + solo_numeros.slice(4, 8);
    }
    return solo_numeros.slice(0, 4) + "-" + solo_numeros.slice(4, 8);
  };

  const validarAnioLectivo = (anio) => {
    const patron = /^\d{4}-\d{4}$/;
    if (!patron.test(anio)) {
      return "Formato inválido. Usa: 2026-2027";
    }
    const [inicio, fin] = anio.split("-").map(Number);
    if (fin !== inicio + 1) {
      return "El año final debe ser +1 del inicial (ej: 2026-2027)";
    }
    return null;
  };

  // ====================== ACCIONES ======================
  const irAlCurso = (curso) => {
    navigate(`/curso/${curso.id_curso}`, {
      state: { curso, rol: "Docente" },
    });
  };

  const cerrarSesion = () => {
    const appMode = localStorage.getItem("app_mode") || "institucional";
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("app_mode");
    // Volver al login con el modo que estaba usando
    navigate(`/?mode=${appMode}`);
  };

  // ====================== EDITAR / ELIMINAR CURSO ======================
  const abrirEditarCurso = async (curso) => {
    let bloqueo = "";
    if (appMode === "personal") {
      try {
        const asignaciones = await cmdAPI.listar({ id_curso: curso.id_curso });
        if ((asignaciones || []).length > 0) {
          bloqueo =
            "La estructura académica ya no se puede cambiar porque este curso tiene materias o configuración académica asociada.";
        }
      } catch {
        bloqueo =
          "No se pudo verificar la configuración del curso. Por seguridad, la estructura académica no se podrá cambiar ahora.";
      }
    }

    setBloqueoEstructuraEdicion(bloqueo);
    setEditarCursoData({
      ...curso,
      soyTutor: !!(datosUsuario && curso.id_tutor === datosUsuario.id_usuario),
      id_estructura_academica: curso.id_estructura_academica || "",
    });
    setMostrarEditarModal(true);
    setOpenMenuId(null);
  };

  const guardarEdicionCurso = async () => {
    if (!editarCursoData) return;
    const { id_curso, nombre, anio_lectivo } = editarCursoData;

    if (!nombre || !anio_lectivo) {
      notify("error", "Nombre y año lectivo son obligatorios");
      return;
    }

    try {
      setGuardandoCurso(true);

      // Validar unicidad por nombre (buscar otros cursos con el mismo nombre)
      const encontrados = await cursosAPI.listar({ nombre });
      const duplicado = (encontrados || []).some(
        (c) => c.id_curso !== id_curso && c.nombre === nombre,
      );

      if (duplicado) {
        notify(
          "error",
          "Ya existe otro curso con ese nombre. Elige otro nombre.",
        );
        return;
      }

      const payload = {
        nombre,
        anio_lectivo,
      };

      if (appMode === "personal") {
        payload.id_tutor = editarCursoData.soyTutor
          ? datosUsuario.id_usuario
          : null;
        payload.id_estructura_academica = editarCursoData.id_estructura_academica
          ? Number(editarCursoData.id_estructura_academica)
          : null;
      }

      await cursosAPI.actualizar(id_curso, payload);
      setMostrarEditarModal(false);
      setEditarCursoData(null);
      setBloqueoEstructuraEdicion("");
      await cargarCursos();
    } catch (err) {
      notify("error", "Error al actualizar curso: " + err.message);
    } finally {
      setGuardandoCurso(false);
    }
  };

  const comprobarNotasEnCurso = async (id_curso) => {
    try {
      // Obtener asignaciones (cmd) del curso
      const asignaciones = await cmdAPI.listar({ id_curso });

      for (const asig of asignaciones || []) {
        const id_cmd = asig.id_cmd;
        if (!id_cmd) continue;
        const insumos = await insumosAPI.listarPorCMD(id_cmd);
        for (const insumo of insumos || []) {
          const notas = await notasAPI.listar({
            id_insumo: insumo.id_insumo,
            size: 1,
          });
          if (notas && notas.length > 0) return true;
        }
      }

      return false;
    } catch (err) {
      console.error("Error comprobando notas en curso:", err);
      // Si hay error, ser conservador: impedir eliminación
      return true;
    }
  };

  const confirmarEliminarCurso = async (curso) => {
    setOpenMenuId(null);
    const tieneNotas = await comprobarNotasEnCurso(curso.id_curso);
    if (tieneNotas) {
      notify(
        "error",
        "No se puede eliminar el curso porque ya existen notas en sus insumos.",
      );
      return;
    }

    setCursoAEliminar(curso);
    setMostrarEliminarModal(true);
  };

  const ejecutarEliminarCurso = async () => {
    if (!cursoAEliminar) return;

    try {
      await cursosAPI.eliminar(cursoAEliminar.id_curso);
      setMostrarEliminarModal(false);
      setCursoAEliminar(null);
      await cargarCursos();
    } catch (err) {
      notify("error", "Error al eliminar curso: " + err.message);
    }
  };

  const crearCursoPersonal = async () => {
    setErrorWizard(null);

    if (
      !nuevoCurso.nombre ||
      !nuevoCurso.anio_lectivo ||
      !nuevoCurso.id_estructura_academica
    ) {
      setErrorWizard("Nombre, año lectivo y estructura académica son obligatorios");
      return;
    }

    const errorAnio = validarAnioLectivo(nuevoCurso.anio_lectivo);
    if (errorAnio) {
      setErrorWizard(errorAnio);
      return;
    }

    try {
      setGuardandoWizard(true);
      const cursoCreado = await cursosAPI.crear({
        nombre: nuevoCurso.nombre,
        anio_lectivo: nuevoCurso.anio_lectivo,
        id_tutor: nuevoCurso.soyTutor ? datosUsuario.id_usuario : null,
        id_estructura_academica: Number(nuevoCurso.id_estructura_academica),
      });

      const materiasEstructura =
        await estructurasAcademicasAPI.listarMaterias(
          Number(nuevoCurso.id_estructura_academica),
        );

      for (const item of materiasEstructura || []) {
        await asignacionesAPI.crear({
          id_curso: cursoCreado.id_curso,
          id_materia: item.id_materia,
          id_docente: datosUsuario.id_usuario,
        });
      }

      await cargarCursos();
      setMostrarWizard(false);
      setNuevoCurso({
        nombre: "",
        anio_lectivo: "",
        soyTutor: true,
        id_estructura_academica: "",
      });
      notify("success", "Curso creado correctamente con sus materias base");
    } catch (err) {
      setErrorWizard(`Error al crear curso: ${err.message}`);
    } finally {
      setGuardandoWizard(false);
    }
  };

  const cancelarWizard = () => {
    setMostrarWizard(false);
    setNuevoCurso({
      nombre: "",
      anio_lectivo: "",
      soyTutor: true,
      id_estructura_academica: "",
    });
    setErrorWizard(null);
  };

  const volverAlLogin = () => {
    const appMode = localStorage.getItem("app_mode") || "institucional";
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    // Volver al login con el modo que estaba usando
    navigate(`/?mode=${appMode}`);
  };

  return (
    <div className="docente-page">
      {/* ====================== NAVBAR ====================== */}
      <div className="navbar-docente">
        <div className="menu-icon">☰</div>

        <div className="navbar-title navbar-title-docente">
          Panel de Gestión Docente
        </div>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Docente"}
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      {/* ====================== CONTENIDO ====================== */}
      <div className="docente-container">
        <h2 className="docente-title">Mis Cursos</h2>

        <div className="cards-grid dashboard-summary-grid docente-summary-grid">
          <div className="stat-card accent">
            <p className="stat-label">Cursos visibles</p>
            <h3 className="stat-value">{resumenCursos.totalCursos}</h3>
            <p className="stat-sub">Cargados según tu modo de trabajo</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Materias asignadas</p>
            <h3 className="stat-value">{resumenOperacion.asignaciones}</h3>
            <p className="stat-sub">Materias que ya puedes gestionar</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Cursos con año lectivo</p>
            <h3 className="stat-value">{resumenCursos.cursosConAnio}</h3>
            <p className="stat-sub">Util para periodos y promedios</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Tutor</p>
            <h3 className="stat-value">{resumenCursos.esTutor ? "Sí" : "No"}</h3>
            <p className="stat-sub">Indicador simple de tutoría</p>
          </div>
        </div>

        <div className="docente-toolbar-shell" ref={toolbarRef}>
          <div className="docente-toolbar-main">
              <button
                className="toolbar-refresh-btn"
                type="button"
                onClick={cargarCursos}
                aria-label="Recargar"
              >
                ↻
              </button>
            <div className="docente-toolbar-right">
              <div className="toolbar-anchor">
                  <button
                    className="toolbar-blue-btn"
                    type="button"
                    aria-label="Filtrar por año lectivo"
                  onClick={() => {
                    setMenuOrdenAbierto(false);
                    setMenuFiltroAbierto((prev) => !prev);
                  }}
                >
                  <span className="toolbar-filter-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>Filtrar</span>
                </button>
                {menuFiltroAbierto && (
                  <CustomSelect
                    value={filtroAnio}
                    onChange={(value) => {
                      setFiltroAnio(value);
                      setMenuFiltroAbierto(false);
                    }}
                    options={[
                      { value: "todos", label: "Todos los años lectivos" },
                      ...aniosDisponiblesCursos.map((anio) => ({ value: anio, label: anio })),
                    ]}
                    placeholder="Filtrar por año lectivo"
                    className="docente-popover-select docente-popover-select-left"
                    hideTrigger
                    open={menuFiltroAbierto}
                    onToggle={setMenuFiltroAbierto}
                  />
                )}
              </div>
              <div className="toolbar-anchor">
                <button
                  className="toolbar-blue-btn"
                  type="button"
                  aria-label="Ordenar cursos"
                  onClick={() => {
                    setMenuFiltroAbierto(false);
                    setMenuOrdenAbierto((prev) => !prev);
                  }}
                >
                  <span className="toolbar-sort-icon" aria-hidden="true">
                    <span className="arrow-up" />
                    <span className="arrow-down" />
                  </span>
                  <span>Ordenar</span>
                </button>
                {menuOrdenAbierto && (
                  <CustomSelect
                    value={ordenCursos}
                    onChange={(value) => {
                      setOrdenCursos(value);
                      setMenuOrdenAbierto(false);
                    }}
                    options={[
                      { value: "colegio-asc", label: "Colegio A-Z" },
                      { value: "colegio-desc", label: "Colegio Z-A" },
                      { value: "reciente", label: "Más reciente" },
                      { value: "antiguo", label: "Más antiguo" },
                      { value: "alfabetico", label: "Alfabético" },
                    ]}
                    placeholder="Ordenar cursos"
                    className="docente-popover-select docente-popover-select-left"
                    hideTrigger
                    open={menuOrdenAbierto}
                    onToggle={setMenuOrdenAbierto}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="docente-toolbar-statuses">
            <div className="toolbar-status-pill">
              <strong>Mostrando:</strong> {filtroAnio === "todos" ? "Todos los años lectivos" : filtroAnio}
            </div>
            <div className="toolbar-status-pill">
              <strong>Orden:</strong> {ordenCursos === "colegio-asc" ? "Colegio A-Z" : ordenCursos === "colegio-desc" ? "Colegio Z-A" : ordenCursos === "reciente" ? "Más reciente" : ordenCursos === "antiguo" ? "Más antiguo" : "Alfabético"}
            </div>
          </div>
        </div>

        {cargando && <p>Cargando cursos...</p>}
        {error && (
          <div className="empty-state error-state">
            <h3>No se pudieron cargar los cursos</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Modal de Sesión Expirada */}
        {sesionExpirada && (
          <div
            className="modal-backdrop"
            style={{
              zIndex: 1000,
              background: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                padding: "2rem",
                width: "90%",
                maxWidth: "300px",
                textAlign: "center",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              }}
            >
              <h3
                style={{
                  color: "#c73a51",
                  marginBottom: "0.75rem",
                  fontSize: "1.3rem",
                }}
              >
                ⚠️ Sesión Expirada
              </h3>
              <p
                style={{
                  marginBottom: "1.5rem",
                  color: "#666",
                  fontSize: "0.9rem",
                  lineHeight: "1.4",
                }}
              >
                Tu sesión se cerró por inactividad.
              </p>
              <button
                onClick={volverAlLogin}
                style={{
                  width: "100%",
                  background: "#1f91de",
                  color: "white",
                  padding: "0.65rem",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#0d3d6b";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#1f91de";
                }}
              >
                ← Volver al Login
              </button>
            </div>
          </div>
        )}

        {!cargando && !error && (
          <>
            {appMode === "personal" && mostrarWizard && (
              <div className="wizard-container">
                  <div className="personal-card wizard-card">
                    <div className="wizard-header">
                      <h3>Crear curso desde estructura</h3>
                      <div className="wizard-progress">
                        <div className="step activo">1. Curso</div>
                        <div className="step activo">2. Estructura</div>
                        <div className="step activo">3. Crear</div>
                      </div>
                    </div>

                    {errorWizard && (
                      <div
                        style={{
                          background: "#ffebee",
                          color: "#c62828",
                          padding: "0.8rem",
                          borderRadius: "8px",
                          marginBottom: "1rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        ⚠️ {errorWizard}
                      </div>
                    )}

                      <div className="wizard-step">
                        <h4>Información del Curso</h4>
                    <input
                          className="personal-input"
                          type="text"
                          placeholder="Nombre del curso (ej: 4to A)"
                          value={nuevoCurso.nombre}
                          onChange={(e) =>
                            setNuevoCurso((p) => ({
                              ...p,
                              nombre: e.target.value,
                            }))
                          }
                          style={{ marginBottom: "0.8rem" }}
                        />
                        <input
                          className="personal-input"
                          type="text"
                          placeholder="Año lectivo (ej: 2026-2027)"
                          value={nuevoCurso.anio_lectivo}
                          onChange={(e) =>
                            setNuevoCurso((p) => ({
                              ...p,
                              anio_lectivo: formatarAnioLectivo(e.target.value),
                            }))
                          }
                          style={{ marginBottom: "0.5rem" }}
                        />
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "#6b7a99",
                            marginBottom: "1rem",
                          }}
                        >
                          💡 Formato: YYYY-YYYY (ej: 2026-2027)
                        </p>
                        {appMode === "personal" && (
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.6rem",
                              marginBottom: "1rem",
                              color: "#223553",
                              fontSize: "0.92rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!nuevoCurso.soyTutor}
                              onChange={(e) =>
                                setNuevoCurso((p) => ({
                                  ...p,
                                  soyTutor: e.target.checked,
                                }))
                              }
                            />
                            Este es uno de mis cursos como tutor
                          </label>
                        )}
                      </div>

                    <div className="wizard-step">
                      <h4>Estructura académica</h4>
                      <select
                        className="personal-input"
                        value={nuevoCurso.id_estructura_academica}
                        onChange={(e) =>
                          setNuevoCurso((p) => ({
                            ...p,
                            id_estructura_academica: e.target.value,
                          }))
                        }
                        style={{ marginBottom: "0.8rem" }}
                      >
                        <option value="">Seleccione estructura académica</option>
                        {estructuras.map((estructura) => (
                          <option
                            key={estructura.id_estructura_academica}
                            value={estructura.id_estructura_academica}
                          >
                            {estructura.nombre}
                          </option>
                        ))}
                      </select>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "#4b5f84",
                          marginBottom: "1rem",
                        }}
                      >
                        Primero configura la estructura académica y la periodización del contexto. Después crea el curso y continúa su gestión igual que en el modo institucional.
                      </p>
                      {estructuras.length === 0 && (
                        <div className="empty-state" style={{ marginTop: 8 }}>
                          <h3>Falta estructura académica</h3>
                          <p>
                            Antes de crear cursos, configura al menos una estructura académica en tu contexto personal.
                          </p>
                          <button
                            className="personal-action"
                            onClick={() => navigate("/docente/estructura-academica")}
                          >
                            Ir a estructura académica
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      className="wizard-actions"
                      style={{
                        display: "flex",
                        gap: "0.6rem",
                        marginTop: "1.5rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={cancelarWizard}
                        disabled={guardandoWizard}
                        style={{
                          padding: "0.56rem 0.86rem",
                          border: "1px solid #dce5f4",
                          borderRadius: "10px",
                          background: "#fff",
                          color: "#223553",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "0.84rem",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        className="personal-action"
                        onClick={crearCursoPersonal}
                        disabled={guardandoWizard || estructuras.length === 0}
                      >
                        {guardandoWizard ? "Guardando..." : "Crear curso"}
                      </button>
                    </div>
                  </div>
              </div>
            )}

            <div className="grid-cursos">
              {cursos.length === 0 ? (
                <div className="empty-state">
                  <h3>No tienes cursos asignados</h3>
                  <p>
                    {appMode === "personal"
                      ? "Configura estructura y periodización, luego crea cursos y entra a gestionarlos."
                      : "Cuando el administrativo te asigne cursos o materias, aparecerán aquí."}
                  </p>
                </div>
              ) : (
                cursosVisibles.map((curso) => (
                  <div
                    className="curso-card"
                    key={curso.id_curso}
                    style={{ position: "relative" }}
                  >
                    <div style={{ position: "absolute", top: 12, right: 12 }}>
                      <button
                        className="menu-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === curso.id_curso
                              ? null
                              : curso.id_curso,
                          );
                        }}
                        aria-label="Opciones"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "18px",
                        }}
                      >
                        ⋯
                      </button>

                      {openMenuId === curso.id_curso && (
                        <div
                          className="menu-dropdown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="menu-item menu-item-edit"
                            onClick={() => abrirEditarCurso(curso)}
                          >
                            Editar
                          </button>
                          <button
                            className="menu-item menu-item-delete"
                            onClick={() => confirmarEliminarCurso(curso)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="curso-title-row">
                      <p className="curso-nombre">{curso.nombre}</p>
                      {curso.id_tutor === datosUsuario?.id_usuario && (
                        <span className="tutor-pill">TUTOR</span>
                      )}
                    </div>
                    {filtroAnio === "todos" ? (
                      <p className="curso-info">Año: {curso.anio_lectivo}</p>
                    ) : (
                      <p className="curso-info curso-info-ghost">Año: {curso.anio_lectivo || " "}</p>
                    )}
                    <button
                      className="btn-ingresar"
                      onClick={() => irAlCurso(curso)}
                    >
                      Ver Curso
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal edición curso */}
            {mostrarEditarModal && editarCursoData && (
              <div
                className="modal-backdrop"
                style={{
                  zIndex: 1000,
                  background: "rgba(0, 0, 0, 0.5)",
                }}
                onClick={() => setMostrarEditarModal(false)}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "12px",
                    padding: "2rem",
                    width: "90%",
                    maxWidth: "320px",
                    textAlign: "center",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3
                    style={{
                      color: "#223553",
                      marginBottom: "1rem",
                      fontSize: "1.2rem",
                    }}
                  >
                    Editar Curso
                  </h3>
                  <input
                    style={{
                      width: "100%",
                      marginBottom: "0.75rem",
                      padding: "0.7rem 0.8rem",
                      borderRadius: "8px",
                      border: "1px solid #d7e2f2",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                    type="text"
                    placeholder="Nombre del curso"
                    value={editarCursoData.nombre}
                    onChange={(e) =>
                      setEditarCursoData((p) => ({
                        ...p,
                        nombre: e.target.value,
                      }))
                    }
                  />
                  <input
                    style={{
                      width: "100%",
                      marginBottom: "1.25rem",
                      padding: "0.7rem 0.8rem",
                      borderRadius: "8px",
                      border: "1px solid #d7e2f2",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                    type="text"
                    placeholder="Año lectivo (ej. 2025-2026)"
                    value={editarCursoData.anio_lectivo}
                    onChange={(e) =>
                      setEditarCursoData((p) => ({
                        ...p,
                        anio_lectivo: e.target.value,
                      }))
                    }
                    />
                    {appMode === "personal" && (
                      <>
                        <select
                          style={{
                            width: "100%",
                            marginBottom: "0.75rem",
                            padding: "0.7rem 0.8rem",
                            borderRadius: "8px",
                            border: "1px solid #d7e2f2",
                            fontSize: "0.95rem",
                            boxSizing: "border-box",
                          }}
                          value={editarCursoData.id_estructura_academica || ""}
                          onChange={(e) =>
                            setEditarCursoData((p) => ({
                              ...p,
                              id_estructura_academica: e.target.value,
                            }))
                          }
                          disabled={!!bloqueoEstructuraEdicion}
                        >
                          <option value="">Seleccione estructura académica</option>
                          {estructuras.map((estructura) => (
                            <option
                              key={estructura.id_estructura_academica}
                              value={estructura.id_estructura_academica}
                            >
                              {estructura.nombre}
                            </option>
                          ))}
                        </select>
                        {bloqueoEstructuraEdicion && (
                          <p
                            style={{
                              marginBottom: "0.75rem",
                              color: "#9a5a00",
                              background: "#fff4db",
                              borderRadius: "8px",
                              padding: "0.7rem 0.8rem",
                              fontSize: "0.88rem",
                              textAlign: "left",
                            }}
                          >
                            {bloqueoEstructuraEdicion}
                          </p>
                        )}
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            marginBottom: "1.25rem",
                            color: "#223553",
                            fontSize: "0.92rem",
                            textAlign: "left",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!editarCursoData.soyTutor}
                            onChange={(e) =>
                              setEditarCursoData((p) => ({
                                ...p,
                                soyTutor: e.target.checked,
                              }))
                            }
                          />
                          Este es uno de mis cursos como tutor
                        </label>
                      </>
                    )}

                    <div
                      style={{
                      display: "flex",
                      gap: "0.75rem",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      style={{
                        padding: "0.75rem 1.2rem",
                        border: "none",

                        borderRadius: "8px",
                        background: "#eef3fb",
                        color: "#223553",
                        fontWeight: "600",
                        cursor: "pointer",
                        minWidth: "110px",
                      }}
                      onClick={() => {
                        setMostrarEditarModal(false);
                        setBloqueoEstructuraEdicion("");
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      style={{
                        padding: "0.75rem 1.2rem",
                        border: "none",
                        borderRadius: "8px",
                        background: "#4c6fdc",
                        color: "white",
                        fontWeight: "600",
                        cursor: "pointer",
                        minWidth: "110px",
                      }}
                      onClick={guardarEdicionCurso}
                      disabled={guardandoCurso}
                    >
                      {guardandoCurso ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal eliminar curso */}
            {mostrarEliminarModal && cursoAEliminar && (
              <div
                className="modal-backdrop"
                style={{
                  zIndex: 1000,
                  background: "rgba(0, 0, 0, 0.5)",
                }}
                onClick={() => {
                  setMostrarEliminarModal(false);
                  setCursoAEliminar(null);
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "12px",
                    padding: "2rem",
                    width: "90%",
                    maxWidth: "320px",
                    textAlign: "center",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3
                    style={{
                      color: "#c73a51",
                      marginBottom: "1rem",
                      fontSize: "1.2rem",
                    }}
                  >
                    Eliminar Curso
                  </h3>
                  <p
                    style={{
                      marginBottom: "1.25rem",
                      color: "#666",
                      fontSize: "0.95rem",
                      lineHeight: "1.4",
                    }}
                  >
                    ¿Estás seguro de eliminar el curso {cursoAEliminar.nombre}?
                    Esta acción es irreversible.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      style={{
                        padding: "0.75rem 1.2rem",
                        border: "none",
                        borderRadius: "8px",
                        background: "#eef3fb",
                        color: "#223553",
                        fontWeight: "600",
                        cursor: "pointer",
                        minWidth: "110px",
                      }}
                      onClick={() => {
                        setMostrarEliminarModal(false);
                        setCursoAEliminar(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      style={{
                        padding: "0.75rem 1.2rem",
                        border: "none",
                        borderRadius: "8px",
                        background: "#c73a51",
                        color: "white",
                        fontWeight: "600",
                        cursor: "pointer",
                        minWidth: "110px",
                      }}
                      onClick={ejecutarEliminarCurso}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Docente;
