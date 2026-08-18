import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  asistenciaAPI,
  comportamientoAPI,
  cursosAPI,
  estudiantesAPI,
  insumosAPI,
  notasAPI,
} from "../../services/api";
import { Save } from "lucide-react";
import CustomSelect from "../../components/admin/CustomSelect";
import { TabInsumos } from "./components/TabInsumos";
import { TabAsistencia } from "./components/TabAsistencia";
import { TabComportamiento } from "./components/TabComportamiento";
import { TabNotasEstudiante } from "./components/TabNotasEstudiante";
import { TabModalNotasInsumo } from "./components/TabModalNotasInsumo";
import { TabPromedios } from "./components/TabPromedios";
import { TabPeriodizacion } from "./components/TabPeriodizacion";
import "../../styles/cursoPrincipal.css";
import { notify, requestConfirm } from "../../components/notify";

function CursoPrincipal() {
  const navigate = useNavigate();
  const { id_curso } = useParams();
  const location = useLocation();
  const { curso } = location.state || { curso: null };

  const fechaHoy = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [menuUsuario, setMenuUsuario] = useState(false);

  // Datos del curso
  const [cursoDetalle, setCursoDetalle] = useState(curso || null);
  const [materiasCurso, setMateriasCurso] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [insumosMateria, setInsumosMateria] = useState([]);

  // Estudiantes del curso
  const [estudiantesCurso, setEstudiantesCurso] = useState([]);

  // Periodos
  const [periodos, setPeriodos] = useState([]);
  const [errorCargaPeriodos] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [ordenInsumos, setOrdenInsumos] = useState("a-z");
  const [menuFiltroPeriodoAbierto, setMenuFiltroPeriodoAbierto] = useState(false);
  const [menuOrdenInsumosAbierto, setMenuOrdenInsumosAbierto] = useState(false);

  // Edición de insumos
  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: "",
    descripcion: "",
    ponderacion: "",
    tipo_insumo: "",
    id_periodo: "",
  });
  const [insumoEditando, setInsumoEditando] = useState(null);
  const [editandoInsumo, setEditandoInsumo] = useState(false);
  const [cargandoInsumo, setCargandoInsumo] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState("insumos");

  // Asistencia
  const [asistencias, setAsistencias] = useState([]);
  const [fechaAsistencia, setFechaAsistencia] = useState(fechaHoy);
  const [estadosTemporales, setEstadosTemporales] = useState({});

  // Comportamiento
  const [comportamientos, setComportamientos] = useState([]);
  const [valoresTemporales, setValoresTemporales] = useState({});
  const [observacionesTemporales, setObservacionesTemporales] = useState({});
  const [comportamientoMes, setComportamientoMes] = useState("");

  // Notas por estudiante
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState("");
  const [notasIndividuales, setNotasIndividuales] = useState([]);
  const [cargandoNotasIndividual, setCargandoNotasIndividual] = useState(false);
  const [notasPorEstudiante, setNotasPorEstudiante] = useState({});

  // Promedios
  const [errorPeriodos, setErrorPeriodos] = useState(null);

  const soloLecturaTutor = false;

  const materiaNombre = (m) => {
    if (!m) return "Materia";
    if (m.materia?.nombre) return m.materia.nombre;
    return `Materia ${m.id_materia}`;
  };

  const tabs = useMemo(
    () => [
      { id: "insumos", label: "Insumos y notas" },
      { id: "asistencia", label: "Asistencia" },
      { id: "comportamiento", label: "Comportamiento" },
      { id: "notasEstudiante", label: "Notas por estudiante" },
      { id: "promedios", label: "Promedios" },
      { id: "periodizacion", label: "Periodizacion" },
    ],
    [],
  );

  const periodosVisibles = useMemo(() => {
    const ordenados = [...periodos].sort(
      (a, b) => Number(a.numero_periodo) - Number(b.numero_periodo),
    );

    if (filtroPeriodo !== "todos") {
      return ordenados.filter(
        (periodo) => String(periodo.numero_periodo) === String(filtroPeriodo),
      );
    }

    return ordenados;
  }, [periodos, filtroPeriodo]);

  const materiasOptions = useMemo(
    () =>
      materiasCurso.map((materia) => ({
        value: String(materia.id_cmd),
        label: materiaNombre(materia),
      })),
    [materiasCurso],
  );

  const periodosOptions = useMemo(
    () =>
      periodos.map((periodo) => ({
        value: String(periodo.id_periodo),
        label: periodo.nombre_periodo || `Trimestre ${periodo.numero_periodo}`,
      })),
    [periodos],
  );

  // ====================== CARGA BASE ======================
  const cargarInsumos = useCallback(async (id_cmd) => {
    if (!id_cmd) return;
    try {
      const insumos = await insumosAPI.listarPorCMD(id_cmd);
      setInsumosMateria(insumos || []);
    } catch (err) {
      console.error("Error al cargar insumos:", err);
    }
  }, []);

  const cargarAsistencia = useCallback(async (id_cmd) => {
    if (!id_cmd) return;
    try {
      const data = await asistenciaAPI.listar({ id_cmd, size: 100 });
      setAsistencias(data || []);
    } catch (err) {
      console.error("Error al cargar asistencia:", err);
    }
  }, []);

  const cargarComportamientos = useCallback(async () => {
    try {
      const data = await comportamientoAPI.listar({ id_curso, size: 100 });
      setComportamientos(data || []);
    } catch (err) {
      console.error("Error al cargar comportamiento:", err);
    }
  }, [id_curso]);

  const cargarDatos = useCallback(async () => {
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
      const dashboard = await cursosAPI.obtenerDashboard(id_curso);
      const cursoActual = dashboard?.curso || curso;
      setCursoDetalle(cursoActual);

      const esTutorInstitucional =
        (localStorage.getItem("app_mode") || "institucional").toLowerCase() ===
          "institucional" &&
        Number(cursoActual?.id_tutor) === Number(usuario.id_usuario);

      const cmd = esTutorInstitucional
        ? dashboard?.asignaciones || []
        : (dashboard?.asignaciones || []).filter(
            (item) => item.id_docente === usuario.id_usuario,
          );
      setMateriasCurso(cmd || []);

      const estudiantes = dashboard?.estudiantes || [];
      setEstudiantesCurso(estudiantes || []);

      if (cmd && cmd.length > 0) {
        const primera = cmd[0];
        setMateriaSeleccionada(primera);
      }

      // Cargar periodizacion con el curso actual
      if (cursoActual) {
        setErrorPeriodos(null);
        try {
          const anio = cursoActual.anio_lectivo;
          const config = dashboard?.periodizacion;
          const periodos = (config?.periodos || []).map((periodo) => ({
            id_periodo: periodo.id_periodo,
            numero_periodo: periodo.numero_periodo,
            fecha_inicio: periodo.fecha_inicio,
            fecha_fin: periodo.fecha_fin,
            nombre_periodo: periodo.nombre_periodo,
          }));
          setPeriodos(periodos);

          if (periodos.length === 0) {
            setErrorPeriodos(
              `No hay periodos configurados para ${anio}. Solicita que se configure la periodizacion.`,
            );
          }
        } catch (err) {
          console.error("Error al cargar periodos:", err);
          setErrorPeriodos(
            err.message ||
              "Error al cargar los periodos. Solicita que se configure la periodizacion.",
          );
        }
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError(err.message || "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }, [
    id_curso,
    navigate,
    curso,
  ]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (!materiaSeleccionada?.id_cmd) return;
    if (activeTab === "insumos") {
      cargarInsumos(materiaSeleccionada.id_cmd);
    }
    if (activeTab === "asistencia") {
      cargarAsistencia(materiaSeleccionada.id_cmd);
    }
  }, [activeTab, materiaSeleccionada, cargarInsumos, cargarAsistencia]);

  useEffect(() => {
    if (activeTab === "comportamiento") {
      cargarComportamientos();
    }
  }, [activeTab, cargarComportamientos]);

  // ====================== INSUMOS ======================
  const agregarInsumo = async () => {
    if (!nuevoInsumo.nombre.trim() || !nuevoInsumo.ponderacion) {
      notify("error", "Debe completar nombre y ponderación");
      return;
    }

    if (!nuevoInsumo.tipo_insumo) {
      notify("error", "Debe seleccionar el tipo de insumo");
      return;
    }

    if (!nuevoInsumo.id_periodo) {
      notify("error", "Debe seleccionar el periodo");
      return;
    }

    if (errorPeriodos || periodos.length === 0) {
      notify(
        "error",
        "No hay periodos disponibles. " +
          (errorPeriodos || "Solicita que se configure la periodizacion."),
      );
      return;
    }

    try {
      setCargandoInsumo(true);
      await insumosAPI.crear({
        id_cmd: materiaSeleccionada.id_cmd,
        nombre: nuevoInsumo.nombre,
        descripcion: nuevoInsumo.descripcion || null,
        ponderacion: parseFloat(nuevoInsumo.ponderacion),
        tipo_insumo: nuevoInsumo.tipo_insumo,
        id_periodo: parseInt(nuevoInsumo.id_periodo, 10),
      });
      setNuevoInsumo({
        nombre: "",
        descripcion: "",
        ponderacion: "",
        tipo_insumo: "",
        id_periodo: "",
      });
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      notify("error", "Error al crear insumo: " + err.message);
    } finally {
      setCargandoInsumo(false);
    }
  };

  const eliminarInsumo = async (id_insumo) => {
    const ok = await requestConfirm("¿Está seguro de eliminar este insumo?");
    if (!ok) return;

    try {
      await insumosAPI.eliminar(id_insumo);
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      notify("error", "Error al eliminar insumo: " + err.message);
    }
  };

  const [insumoNotasAbierto, setInsumoNotasAbierto] = useState(null);

  const abrirInsumosNotas = async (insumo) => {
    setInsumoNotasAbierto(insumo);
  };

  const abrirEdicionInsumo = (insumo) => {
    setInsumoEditando({
      id_insumo: insumo.id_insumo,
      nombre: insumo.nombre || "",
      descripcion: insumo.descripcion || "",
      ponderacion: insumo.ponderacion ?? "",
      tipo_insumo: insumo.tipo_insumo || "",
      id_periodo: insumo.id_periodo ? String(insumo.id_periodo) : "",
    });
  };

  const guardarEdicionInsumo = async () => {
    if (!insumoEditando) return;
    if (!insumoEditando.nombre.trim() || !insumoEditando.ponderacion) {
      notify("error", "Debe completar nombre y ponderación");
      return;
    }

    setEditandoInsumo(true);
    try {
      await insumosAPI.actualizar(insumoEditando.id_insumo, {
        nombre: insumoEditando.nombre.trim(),
        descripcion: insumoEditando.descripcion.trim(),
        ponderacion: parseFloat(insumoEditando.ponderacion),
        tipo_insumo: insumoEditando.tipo_insumo,
        id_periodo: parseInt(insumoEditando.id_periodo, 10),
      });
      await cargarInsumos(materiaSeleccionada.id_cmd);
      setInsumoEditando(null);
    } catch (err) {
      notify("error", "No se pudo actualizar el insumo: " + err.message);
    } finally {
      setEditandoInsumo(false);
    }
  };

  const cargarEstudiantesPorCurso = async () => {
    return estudiantesCurso.length > 0 ? estudiantesCurso : estudiantesAPI.obtenerPorCurso(id_curso);
  };

  const cargarNotasPorInsumo = async (id_insumo) => {
    return notasAPI.listarPorInsumo(id_insumo);
  };

  const cerrarModalInsumo = () => setInsumoNotasAbierto(null);

  const cerrarModalEdicionInsumo = () => {
    if (editandoInsumo) return;
    setInsumoEditando(null);
  };

  const asistenciaExistentePorEstudiante = useCallback(
    (id_estudiante) =>
      asistencias.find(
        (a) => a.id_estudiante === id_estudiante && a.fecha === fechaAsistencia,
      ),
    [asistencias, fechaAsistencia],
  );

  const guardarAsistenciaUno = async (id_estudiante) => {
    const estado = estadosTemporales[id_estudiante];
    if (!estado) return;

    const existente = asistenciaExistentePorEstudiante(id_estudiante);
    const payload = {
      id_estudiante: parseInt(id_estudiante, 10),
      id_cmd: parseInt(materiaSeleccionada.id_cmd, 10),
      fecha: fechaAsistencia,
      estado,
    };

    try {
      if (existente) {
        await asistenciaAPI.actualizar(existente.id_asistencia, payload);
      } else {
        await asistenciaAPI.crear(payload);
      }
      await cargarAsistencia(materiaSeleccionada.id_cmd);
    } catch (err) {
      notify("error", "No se pudo guardar: " + err.message);
    }
  };

  const eliminarAsistenciaUno = async (id_estudiante) => {
    const existente = asistenciaExistentePorEstudiante(id_estudiante);
    if (!existente) {
      setEstadosTemporales((prev) => {
        const next = { ...prev };
        delete next[id_estudiante];
        return next;
      });
      return;
    }

    try {
      await asistenciaAPI.eliminar(existente.id_asistencia);
      setEstadosTemporales((prev) => {
        const next = { ...prev };
        delete next[id_estudiante];
        return next;
      });
      await cargarAsistencia(materiaSeleccionada.id_cmd);
    } catch (err) {
      notify("error", "No se pudo eliminar: " + err.message);
    }
  };

  const guardarAsistenciaTodo = async () => {
    for (const estudiante of estudiantesCurso) {
      if (estadosTemporales[estudiante.id_estudiante]) {
        await guardarAsistenciaUno(estudiante.id_estudiante);
      }
    }
  };

  const comportamientoExistentePorEstudiante = (id_estudiante) =>
    comportamientos.find(
      (c) => c.id_estudiante === id_estudiante && c.mes === comportamientoMes,
    );

  const guardarComportamientoUno = async (id_estudiante) => {
    const valor = valoresTemporales[id_estudiante];
    if (!valor) return;

    const existente = comportamientoExistentePorEstudiante(id_estudiante);
    const payload = {
      id_curso: parseInt(id_curso, 10),
      id_estudiante: parseInt(id_estudiante, 10),
      mes: comportamientoMes,
      valor,
      observaciones: observacionesTemporales[id_estudiante] || "",
    };

    try {
      if (existente) {
        await comportamientoAPI.actualizar(existente.id_comportamiento, payload);
      } else {
        await comportamientoAPI.crear(payload);
      }
      await cargarComportamientos();
    } catch (err) {
      notify("error", "No se pudo guardar: " + err.message);
    }
  };

  // ====================== NOTAS POR ESTUDIANTE ======================
  const cargarNotasEstudiante = useCallback(
    async (id_estudiante) => {
      if (!id_estudiante || !materiaSeleccionada) return;
      try {
        setCargandoNotasIndividual(true);
        const notas = await notasAPI.listar({ id_estudiante });
        const mapNotas = {};
        (notas || []).forEach((nota) => {
          mapNotas[nota.id_insumo] = nota;
        });

        const dataset = (insumosMateria || []).map((insumo) => ({
          insumo,
          id_nota: mapNotas[insumo.id_insumo]?.id_nota || null,
          valor: mapNotas[insumo.id_insumo]?.calificacion ?? "",
        }));

        setNotasIndividuales(dataset);
      } catch (err) {
        notify(
          "error",
          "No se pudieron cargar las notas del estudiante: " + err.message,
        );
      } finally {
        setCargandoNotasIndividual(false);
      }
    },
    [insumosMateria, materiaSeleccionada],
  );

  const cargarNotasCurso = useCallback(async () => {
    if (!materiaSeleccionada || estudiantesCurso.length === 0) return;

    try {
      const acumulado = {};
      for (const estudiante of estudiantesCurso) {
        const notas = await notasAPI.listar({ id_estudiante: estudiante.id_estudiante });
        const mapNotas = {};
        (notas || []).forEach((nota) => {
          mapNotas[nota.id_insumo] = nota;
        });
        acumulado[estudiante.id_estudiante] = (insumosMateria || []).map((insumo) => ({
          insumo,
          id_nota: mapNotas[insumo.id_insumo]?.id_nota || null,
          valor: mapNotas[insumo.id_insumo]?.calificacion ?? "",
          id_estudiante: estudiante.id_estudiante,
        }));
      }
      setNotasPorEstudiante(acumulado);
    } catch (err) {
      console.error("Error al cargar notas del curso:", err);
    }
  }, [estudiantesCurso, insumosMateria, materiaSeleccionada]);

  const guardarNotaIndividual = async (registro, nuevoValor, idNotaAEliminar = null) => {
    if (idNotaAEliminar) {
      try {
        await notasAPI.eliminar(idNotaAEliminar);
        await cargarNotasEstudiante(estudianteSeleccionado);
      } catch (err) {
        notify("error", "No se pudo eliminar la nota: " + err.message);
      }
      return;
    }

    if (nuevoValor === "" || nuevoValor === null || nuevoValor === undefined) return;

    try {
      if (registro.id_nota) {
        await notasAPI.actualizar(registro.id_nota, {
          calificacion: parseFloat(nuevoValor),
        });
      } else {
        await notasAPI.crear({
          id_estudiante: parseInt(estudianteSeleccionado, 10),
          id_insumo: registro.insumo.id_insumo,
          calificacion: parseFloat(nuevoValor),
        });
      }

      await cargarNotasEstudiante(estudianteSeleccionado);
    } catch (err) {
      notify("error", "No se pudo guardar la nota: " + err.message);
    }
  };

  const eliminarComportamientoUno = async (id_estudiante) => {
    const existente = comportamientoExistentePorEstudiante(id_estudiante);
    if (!existente) {
      setValoresTemporales((prev) => {
        const next = { ...prev };
        delete next[id_estudiante];
        return next;
      });
      setObservacionesTemporales((prev) => {
        const next = { ...prev };
        delete next[id_estudiante];
        return next;
      });
      return;
    }

    try {
      await comportamientoAPI.eliminar(existente.id_comportamiento);
      setValoresTemporales((prev) => {
        const next = { ...prev };
        delete next[id_estudiante];
        return next;
      });
      setObservacionesTemporales((prev) => {
        const next = { ...prev };
        delete next[id_estudiante];
        return next;
      });
      await cargarComportamientos();
    } catch (err) {
      notify("error", "No se pudo eliminar: " + err.message);
    }
  };

  const guardarComportamientoTodo = async () => {
    for (const estudiante of estudiantesCurso) {
      if (valoresTemporales[estudiante.id_estudiante]) {
        await guardarComportamientoUno(estudiante.id_estudiante);
      }
    }
  };

  useEffect(() => {
    if (estudianteSeleccionado) {
      cargarNotasEstudiante(estudianteSeleccionado);
    }
  }, [cargarNotasEstudiante, estudianteSeleccionado]);

  useEffect(() => {
    cargarNotasCurso();
  }, [cargarNotasCurso]);

  const cerrarSesion = () => {
    const appMode = localStorage.getItem("app_mode") || "institucional";
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("app_mode");
    // Volver al login con el modo que estaba usando
    navigate(`/?mode=${appMode}`);
  };

  return (
    <div className="curso-principal-page">
      <div className="navbar-curso">
        <button className="btn-volver" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <h2 className="navbar-title navbar-title-curso">
          Panel de Gestión Docente
        </h2>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Usuario"}
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      <div className="curso-container">
        {cargando ? (
          <>
            <div className="course-summary">
              <div>
                <p className="summary-label">Curso</p>
                <h3>Cargando curso...</h3>
                <p className="summary-sub">Preparando materias, estudiantes y periodos</p>
              </div>
              <div className="summary-badge">
                <span>...</span>
                <small>Materias</small>
              </div>
              <div className="summary-badge">
                <span>...</span>
                <small>Estudiantes</small>
              </div>
            </div>

            <div className="cards-grid course-stats-grid">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="stat-card">
                  <p className="stat-label">Cargando</p>
                  <h3 className="stat-value">...</h3>
                  <p className="stat-sub">Obteniendo información del curso</p>
                </div>
              ))}
            </div>

            <div className="empty-state" style={{ marginTop: "1rem" }}>
              <h3>Cargando información del curso</h3>
              <p>Espera unos segundos mientras se obtienen materias, estudiantes y configuración académica.</p>
            </div>
          </>
        ) : error ? (
          <div className="empty-state error-state">
            <h3>No se pudo cargar el curso</h3>
            <p>{error}</p>
          </div>
        ) : materiasCurso.length === 0 ? (
          <div className="empty-state">
            <h2>No hay materias asignadas</h2>
            <p>
              Aún no hay materias asignadas a este curso. Las materias
              aparecerán aquí una vez sean añadidas.
            </p>
          </div>
        ) : (
          <>
            <div className="course-summary">
                <div>
                  <p className="summary-label">Curso</p>
                  <h3>{cursoDetalle?.nombre || "Curso"}</h3>
                  <p className="summary-sub">
                    Año lectivo: {cursoDetalle?.anio_lectivo || "-"}
                  </p>
                  {soloLecturaTutor && (
                    <p className="summary-sub" style={{ color: "#1f91de", fontWeight: 700 }}>
                      Tutor del curso · Vista global en solo lectura
                    </p>
                  )}
                </div>
                <div className="summary-badge">
                  <span>{materiasCurso.length}</span>
                  <small>Materias</small>
                </div>
                <div className="summary-badge">
                  <span>{estudiantesCurso.length}</span>
                  <small>Estudiantes</small>
                </div>
            </div>

            <div className="cards-grid course-stats-grid">
                <div className="stat-card accent">
                  <p className="stat-label">Materias activas</p>
                  <h3 className="stat-value">{materiasCurso.length}</h3>
                  <p className="stat-sub">Relacionadas al curso actual</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Estudiantes</p>
                  <h3 className="stat-value">{estudiantesCurso.length}</h3>
                  <p className="stat-sub">Puedes buscar, registrar y evaluar</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Insumos</p>
                  <h3 className="stat-value">{insumosMateria.length}</h3>
                  <p className="stat-sub">
                    Peso de actividades, proyectos y exámenes
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Periodos</p>
                  <h3 className="stat-value">{periodos.length}</h3>
                  <p className="stat-sub">Base para notas y promedios</p>
                </div>
            </div>

            {errorCargaPeriodos && (
                <div
                  className="empty-state warning-state"
                  style={{ marginBottom: "0.95rem" }}
                >
                  <h3>Falta configuracion de periodizacion</h3>
                  <p>{errorCargaPeriodos}</p>
                </div>
            )}

            {soloLecturaTutor && (
                <div
                  className="empty-state"
                  style={{ marginBottom: "0.95rem", border: "1px solid #dce5f4" }}
                >
                  <h3>Modo tutor</h3>
                  <p>
                    Puedes revisar materias, notas, asistencia, promedios y comportamiento del curso completo, pero sin editar datos de las materias.
                  </p>
                </div>
            )}

            <div className="materia-selector">
                <label>Selecciona Materia:</label>
                <CustomSelect
                  value={materiaSeleccionada?.id_cmd ? String(materiaSeleccionada.id_cmd) : ""}
                  onChange={async (value) => {
                    const selected = materiasCurso.find(
                      (m) => String(m.id_cmd) === String(value),
                    );
                    setMateriaSeleccionada(selected);
                    await cargarInsumos(selected.id_cmd);
                    await cargarAsistencia(selected.id_cmd);
                    if (estudianteSeleccionado) {
                      cargarNotasEstudiante(estudianteSeleccionado);
                    }
                  }}
                  options={materiasOptions}
                  placeholder={materiaSeleccionada ? materiaNombre(materiaSeleccionada) : "Selecciona materia"}
                  className="custom-select-white"
                />
            </div>

            <div className="tabs-curso">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab-button ${
                      activeTab === tab.id ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            {/* TAB: INSUMOS */}
            {activeTab === "insumos" && (
                <TabInsumos
                  activeTab={activeTab}
                  materiaSeleccionada={materiaSeleccionada}
                  materiaNombre={materiaNombre}
                  materiasOptions={materiasOptions}
                  nuevoInsumo={nuevoInsumo}
                  setNuevoInsumo={setNuevoInsumo}
                  periodosOptions={periodosOptions}
                  periodosVisibles={periodosVisibles}
                  filtroPeriodo={filtroPeriodo}
                  setFiltroPeriodo={setFiltroPeriodo}
                  ordenInsumos={ordenInsumos}
                  setOrdenInsumos={setOrdenInsumos}
                  menuFiltroPeriodoAbierto={menuFiltroPeriodoAbierto}
                  setMenuFiltroPeriodoAbierto={setMenuFiltroPeriodoAbierto}
                  menuOrdenInsumosAbierto={menuOrdenInsumosAbierto}
                  setMenuOrdenInsumosAbierto={setMenuOrdenInsumosAbierto}
                  insumosMateria={insumosMateria}
                  cargandoInsumo={cargandoInsumo}
                  soloLecturaTutor={soloLecturaTutor}
                  agregarInsumo={agregarInsumo}
                  abrirInsumosNotas={abrirInsumosNotas}
                  abrirEdicionInsumo={abrirEdicionInsumo}
                  eliminarInsumo={eliminarInsumo}
                  requestConfirm={requestConfirm}
                  notasAPI={notasAPI}
                  cargarNotasEstudiante={cargarNotasEstudiante}
                  estudianteSeleccionado={estudianteSeleccionado}
                />
            )}

            <TabAsistencia
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                fechaAsistencia={fechaAsistencia}
                setFechaAsistencia={setFechaAsistencia}
                estadosTemporales={estadosTemporales}
                setEstadosTemporales={setEstadosTemporales}
                asistenciaExistentePorEstudiante={asistenciaExistentePorEstudiante}
                onGuardarUno={guardarAsistenciaUno}
                onEliminarUno={eliminarAsistenciaUno}
                onGuardarTodo={guardarAsistenciaTodo}
            />

            <TabComportamiento
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                mesComportamiento={comportamientoMes}
                setMesComportamiento={setComportamientoMes}
                valoresTemporales={valoresTemporales}
                setValoresTemporales={setValoresTemporales}
                observacionesTemporales={observacionesTemporales}
                setObservacionesTemporales={setObservacionesTemporales}
                comportamientoExistentePorEstudiante={comportamientoExistentePorEstudiante}
                onGuardarUno={guardarComportamientoUno}
                onEliminarUno={eliminarComportamientoUno}
                onGuardarTodo={guardarComportamientoTodo}
            />

            <TabNotasEstudiante
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                periodos={periodos}
                estudianteSeleccionado={estudianteSeleccionado}
                setEstudianteSeleccionado={setEstudianteSeleccionado}
                notasIndividuales={notasIndividuales}
                cargandoNotasIndividual={cargandoNotasIndividual}
                onGuardarNota={guardarNotaIndividual}
            />

            {/* TAB: PROMEDIOS */}
            <TabPromedios
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                periodos={periodos}
                insumosMateria={insumosMateria}
                notasPorEstudiante={notasPorEstudiante}
            />

            {/* TAB: PERIODIZACION */}
            <TabPeriodizacion
                activeTab={activeTab}
                errorPeriodos={errorPeriodos}
                periodos={periodos}
            />
            {insumoNotasAbierto && (
              <TabModalNotasInsumo
                insumo={insumoNotasAbierto}
                estudiantesCurso={estudiantesCurso}
                soloLecturaTutor={soloLecturaTutor}
                cargarEstudiantesPorCurso={cargarEstudiantesPorCurso}
                cargarNotasPorInsumo={cargarNotasPorInsumo}
                guardarNota={async (id_estudiante, valor) => {
                  if (!insumoNotasAbierto) return;
                  const existente = await notasAPI.listarPorInsumo(insumoNotasAbierto.id_insumo);
                  const notaExistente = (existente || []).find(
                    (n) => String(n.id_estudiante) === String(id_estudiante),
                  );
                  if (notaExistente) {
                    if (valor === null) {
                      await notasAPI.eliminar(notaExistente.id_nota);
                    } else {
                      await notasAPI.actualizar(notaExistente.id_nota, {
                        calificacion: parseFloat(valor),
                      });
                    }
                  } else if (valor !== null) {
                    await notasAPI.crear({
                      id_estudiante: parseInt(id_estudiante, 10),
                      id_insumo: insumoNotasAbierto.id_insumo,
                      calificacion: parseFloat(valor),
                    });
                  }
                  await abrirInsumosNotas(insumoNotasAbierto);
                }}
                onClose={cerrarModalInsumo}
              />
            )}

            {insumoEditando && (
              <div className="modal-overlay">
                <div className="modal-notas modal-insumo-edit">
                  <div className="modal-header">
                    <h3>Editar Insumo</h3>
                    <button className="btn-cerrar" onClick={cerrarModalEdicionInsumo} disabled={editandoInsumo}>
                      ✕
                    </button>
                  </div>
                  <div className="modal-body modal-insumo-edit-body">
                    <div className="modal-insumo-edit-grid modal-insumo-edit-grid-two">
                      <input
                        type="text"
                        placeholder="Nombre del insumo"
                        value={insumoEditando.nombre}
                        onChange={(e) =>
                          setInsumoEditando((prev) => ({ ...prev, nombre: e.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="Ponderación (0-10)"
                        value={insumoEditando.ponderacion}
                        onChange={(e) =>
                          setInsumoEditando((prev) => ({ ...prev, ponderacion: e.target.value }))
                        }
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={insumoEditando.descripcion}
                      onChange={(e) =>
                        setInsumoEditando((prev) => ({ ...prev, descripcion: e.target.value }))
                      }
                      className="modal-insumo-edit-full"
                    />
                    <div className="modal-insumo-edit-grid modal-insumo-edit-grid-two">
                      <CustomSelect
                        value={insumoEditando.tipo_insumo}
                        onChange={(value) =>
                          setInsumoEditando((prev) => ({ ...prev, tipo_insumo: value }))
                        }
                        placeholder="Tipo de Insumo"
                        options={[
                          { value: "actividad", label: "Actividad" },
                          { value: "proyecto_periodo", label: "Proyecto del periodo" },
                          { value: "examen_periodo", label: "Examen del periodo" },
                        ]}
                        className="custom-select-white"
                      />
                      <CustomSelect
                        value={insumoEditando.id_periodo}
                        onChange={(value) =>
                          setInsumoEditando((prev) => ({ ...prev, id_periodo: value }))
                        }
                        placeholder="Periodo"
                        options={periodosOptions}
                        className="custom-select-white"
                      />
                    </div>
                  </div>
                  <div className="modal-footer modal-insumo-edit-footer">
                    <button className="btn-cancel" type="button" onClick={cerrarModalEdicionInsumo} disabled={editandoInsumo}>
                      Cancelar
                    </button>
                    <button className="btn-save btn-save-inline" type="button" onClick={guardarEdicionInsumo} disabled={editandoInsumo}>
                      <Save size={16} />
                      <span>{editandoInsumo ? "Guardando..." : "Guardar"}</span>
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

export default CursoPrincipal;
