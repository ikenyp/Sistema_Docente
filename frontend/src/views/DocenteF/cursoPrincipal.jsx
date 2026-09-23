import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  asistenciaAPI,
  comportamientoAPI,
  cursosAPI,
  estudiantesAPI,
  insumosAPI,
  notasAPI,
  asignacionesAPI,
  cmdAPI,
  materiasAPI,
} from "../../services/api";
import { Save, UserPlus, BookOpen, Settings2, Trash2, Brush, X, Upload, Pencil, Users } from "lucide-react";
import CustomSelect from "../../components/admin/CustomSelect";
import ImportarEstudiantesModal from "../../components/estudiantes/ImportarEstudiantesModal";
import { AnalisisAcademico } from "../../components/AnalisisAcademico";
import { TabInsumos } from "./components/TabInsumos";
import { TabAsistencia } from "./components/TabAsistencia";
import { TabComportamiento } from "./components/TabComportamiento";
import { TabNotasEstudiante } from "./components/TabNotasEstudiante";
import { TabModalNotasInsumo } from "./components/TabModalNotasInsumo";
import { TabPromedios } from "./components/TabPromedios";
import { TabReportes } from "./components/TabReportes";
import { TabPeriodizacion } from "./components/TabPeriodizacion";
import { clearSessionStorage } from "../../services/session";
import { nombrePersona } from "../../utils/personas";
import "../../styles/cursoPrincipal.css";
import { notify, requestConfirm } from "../../components/notify";

function CursoPrincipal() {
  // Esta vista coordina el trabajo dentro de un curso: materias, insumos,
  // estudiantes, notas, asistencia y comportamiento. Los componentes Tab*
  // dibujan cada sección, mientras aquí se conserva el estado compartido.
  const navigate = useNavigate();
  const { id_curso } = useParams();
  const location = useLocation();
  const estadoNavegacion = location.state || { curso: null };
  const { curso } = estadoNavegacion;
  const appMode = (localStorage.getItem("app_mode") || "institucional").toLowerCase();
  const esModoPersonal = appMode === "personal";

  const fechaHoy = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [materiasGestionablesDocente, setMateriasGestionablesDocente] = useState([]);
  const [menuUsuario, setMenuUsuario] = useState(false);

  // Datos del curso
  const [cursoDetalle, setCursoDetalle] = useState(curso || null);
  const [materiasCurso, setMateriasCurso] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [insumosMateria, setInsumosMateria] = useState([]);
  const [materiasDisponiblesAgregar, setMateriasDisponiblesAgregar] = useState([]);
  const [cargandoOpcionesCurso, setCargandoOpcionesCurso] = useState(false);
  const [modalMateriaOpen, setModalMateriaOpen] = useState(false);
  const [insumosPorCMDConfig, setInsumosPorCMDConfig] = useState({});
  const [cargandoConfiguracionMaterias, setCargandoConfiguracionMaterias] = useState(false);
  const [materiasAgregarSeleccionadas, setMateriasAgregarSeleccionadas] = useState([]);
  const [materiaPendienteQuitar, setMateriaPendienteQuitar] = useState(null);
  const [quitandoMateria, setQuitandoMateria] = useState(false);
  const [mostrarCrearEstudiante, setMostrarCrearEstudiante] = useState(false);
  const [mostrarEditarEstudiante, setMostrarEditarEstudiante] = useState(false);
  const [mostrarImportarEstudiantes, setMostrarImportarEstudiantes] = useState(false);
  const [estudianteCreando, setEstudianteCreando] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    fecha_nacimiento: "",
  });
  const [estudianteEditando, setEstudianteEditando] = useState(null);
  const [estudianteEditForm, setEstudianteEditForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    fecha_nacimiento: "",
    estado: "matriculado",
    id_curso_actual: "",
  });
  const [cursosEdicion, setCursosEdicion] = useState([]);
  const [guardandoMateriaCurso, setGuardandoMateriaCurso] = useState(false);
  const [guardandoEstudianteCurso, setGuardandoEstudianteCurso] = useState(false);
  const [guardandoEdicionEstudiante, setGuardandoEdicionEstudiante] = useState(false);

  // Estudiantes del curso
  const [estudiantesCurso, setEstudiantesCurso] = useState([]);
  const [busquedaEstudiantesCurso, setBusquedaEstudiantesCurso] = useState("");
  const [estadoEstudiantesCurso, setEstadoEstudiantesCurso] = useState("");

  // Periodos
  const [periodos, setPeriodos] = useState([]);
  const [errorCargaPeriodos] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [ordenInsumos, setOrdenInsumos] = useState("reciente");
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
  const [eliminandoInsumo, setEliminandoInsumo] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState(esModoPersonal ? "estudiantes" : "insumos");

  useEffect(() => {
    if (!esModoPersonal) return;

    if (estadoNavegacion.abrirTab) {
      setActiveTab(estadoNavegacion.abrirTab);
    }

    if (estadoNavegacion.abrirConfigMaterias) {
      setModalMateriaOpen(true);
    }
  }, [esModoPersonal, estadoNavegacion.abrirTab, estadoNavegacion.abrirConfigMaterias]);

  // Asistencia
  const [asistencias, setAsistencias] = useState([]);
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);
  const [fechaAsistencia, setFechaAsistencia] = useState(fechaHoy);
  const [estadosTemporales, setEstadosTemporales] = useState({});

  // Comportamiento
  const [comportamientos, setComportamientos] = useState([]);
  const [guardandoComportamiento, setGuardandoComportamiento] = useState(false);
  const [valoresTemporales, setValoresTemporales] = useState({});
  const [observacionesTemporales, setObservacionesTemporales] = useState({});
  const [comportamientoMes, setComportamientoMes] = useState("");

  // Notas por estudiante
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState("");
  const [notasIndividuales, setNotasIndividuales] = useState([]);
  const [cargandoNotasIndividual, setCargandoNotasIndividual] = useState(false);
  const [guardandoNotaIndividual, setGuardandoNotaIndividual] = useState(false);
  const [notasPorEstudiante, setNotasPorEstudiante] = useState({});

  // Promedios
  const [errorPeriodos, setErrorPeriodos] = useState(null);

  const esMateriaGestionableActiva = useMemo(() => {
    if (esModoPersonal) return true;
    if (!datosUsuario || !materiaSeleccionada?.id_cmd) return false;
    if (Number(materiaSeleccionada?.id_docente) === Number(datosUsuario.id_usuario)) {
      return true;
    }
    return materiasGestionablesDocente.some(
      (idCmd) => String(idCmd) === String(materiaSeleccionada.id_cmd),
    );
  }, [datosUsuario, esModoPersonal, materiaSeleccionada, materiasGestionablesDocente]);

  const esTutorInstitucionalCurso = useMemo(() => {
    if (esModoPersonal || !datosUsuario || !cursoDetalle) return false;
    return Number(cursoDetalle?.id_tutor) === Number(datosUsuario.id_usuario);
  }, [cursoDetalle, datosUsuario, esModoPersonal]);

  const soloLecturaTutor = useMemo(
    () => esTutorInstitucionalCurso && !esMateriaGestionableActiva,
    [esTutorInstitucionalCurso, esMateriaGestionableActiva],
  );

  const materiaNombre = (m) => {
    if (!m) return "Materia";
    if (m.materia?.nombre) return m.materia.nombre;
    return `Materia ${m.id_materia}`;
  };

  const tabs = useMemo(
    () => {
      const base = [
        { id: "insumos", label: "Insumos y notas" },
        { id: "asistencia", label: "Asistencia" },
        { id: "comportamiento", label: "Comportamiento" },
        { id: "notasEstudiante", label: "Notas por estudiante" },
        { id: "promedios", label: "Promedios" },
        { id: "reportes", label: "Reportes" },
        { id: "periodizacion", label: "Periodizacion" },
      ];

      return esModoPersonal ? [{ id: "estudiantes", label: "Estudiantes" }, ...base] : base;
    },
    [esModoPersonal],
  );

  const periodosVisibles = useMemo(
    () =>
      [...periodos].sort((a, b) => Number(a.numero_periodo) - Number(b.numero_periodo)),
    [periodos],
  );

  const periodosFiltrados = useMemo(() => {
    if (filtroPeriodo !== "todos") {
      return periodosVisibles.filter(
        (periodo) => String(periodo.numero_periodo) === String(filtroPeriodo),
      );
    }

    return periodosVisibles;
  }, [periodosVisibles, filtroPeriodo]);

  const materiasOptions = useMemo(
    () =>
      [...materiasCurso]
        .sort((a, b) => {
          const aGestionable =
            esTutorInstitucionalCurso &&
            materiasGestionablesDocente.some((idCmd) => String(idCmd) === String(a.id_cmd));
          const bGestionable =
            esTutorInstitucionalCurso &&
            materiasGestionablesDocente.some((idCmd) => String(idCmd) === String(b.id_cmd));
          if (aGestionable === bGestionable) return String(a.materia?.nombre || a.id_cmd).localeCompare(String(b.materia?.nombre || b.id_cmd), "es");
          return aGestionable ? -1 : 1;
        })
        .map((materia) => {
        const esGestionable =
          esTutorInstitucionalCurso &&
          materiasGestionablesDocente.some(
            (idCmd) => String(idCmd) === String(materia.id_cmd),
          );

        return {
          value: String(materia.id_cmd),
          label: materiaNombre(materia),
          badge:
            esTutorInstitucionalCurso
              ? esGestionable
                ? "Gestionable"
                : "Solo lectura"
              : null,
        };
      }),
    [esTutorInstitucionalCurso, materiasCurso, materiasGestionablesDocente],
  );

  const materiasAgregarSeleccionadasDetalle = useMemo(
    () =>
      materiasDisponiblesAgregar.filter((materia) =>
        materiasAgregarSeleccionadas.includes(String(materia.id_materia)),
      ),
    [materiasAgregarSeleccionadas, materiasDisponiblesAgregar],
  );

  const estudiantesCursoFiltrados = useMemo(() => {
    const busqueda = busquedaEstudiantesCurso.trim().toLowerCase();
    return (estudiantesCurso || [])
      .filter((est) => {
        const estado = String(est.estado || "").toLowerCase();
        const coincideEstado = !estadoEstudiantesCurso || estado === estadoEstudiantesCurso;
        const texto = `${est.nombre || ""} ${est.apellido || ""} ${est.cedula || ""}`.toLowerCase();
        const coincideBusqueda = !busqueda || texto.includes(busqueda);
        return coincideEstado && coincideBusqueda;
      })
      .sort((a, b) => `${a.apellido || ""} ${a.nombre || ""}`.localeCompare(`${b.apellido || ""} ${b.nombre || ""}`, "es"));
  }, [busquedaEstudiantesCurso, estadoEstudiantesCurso, estudiantesCurso]);

  const formatearNombrePropio = (valor) =>
    String(valor || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(" ");

  const periodosOptions = useMemo(
    () =>
      periodos.map((periodo) => ({
        value: String(periodo.id_periodo),
        label: periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`,
      })),
    [periodos],
  );

  const cursosEdicionAnioActual = useMemo(() => {
    const anioCurso = String(cursoDetalle?.anio_lectivo || curso?.anio_lectivo || "").trim();
    if (!anioCurso) return cursosEdicion;
    return cursosEdicion.filter(
      (c) => String(c.anio_lectivo || "").trim() === anioCurso,
    );
  }, [cursosEdicion, curso, cursoDetalle]);

  // ====================== CARGA BASE ======================
  const cargarInsumos = useCallback(async (id_cmd) => {
    // Un CMD representa la relación curso-materia-docente. Los insumos siempre
    // se consultan por esa relación para no mezclar materias del mismo curso.
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

  const sincronizarEstadosTemporalesAsistencia = useCallback(
    (fecha = fechaAsistencia, registros = asistencias) => {
      const next = {};
      (registros || [])
        .filter((registro) => registro.fecha === fecha)
        .forEach((registro) => {
          next[registro.id_estudiante] = registro.estado;
        });
      setEstadosTemporales(next);
    },
    [asistencias, fechaAsistencia],
  );

  useEffect(() => {
    if (!materiaSeleccionada?.id_cmd) return;
    sincronizarEstadosTemporalesAsistencia();
  }, [fechaAsistencia, asistencias, materiaSeleccionada?.id_cmd, sincronizarEstadosTemporalesAsistencia]);

  const cargarComportamientos = useCallback(async () => {
    try {
      const data = await comportamientoAPI.listar({ id_curso, size: 100 });
      setComportamientos(data || []);
    } catch (err) {
      console.error("Error al cargar comportamiento:", err);
    }
  }, [id_curso]);

  const cargarMateriasDisponiblesAgregar = useCallback(async () => {
    if (!esModoPersonal) return;
    try {
      setCargandoOpcionesCurso(true);
      const catalogo = await materiasAPI.listar({ size: 100 });
      const asignadas = new Set(
        (materiasCurso || []).map((m) => String(m.id_materia)),
      );
      setMateriasDisponiblesAgregar(
        (catalogo || []).filter(
          (materia) => !materia.eliminado && !asignadas.has(String(materia.id_materia)),
        ),
      );
    } catch (err) {
      console.error("Error al cargar materias disponibles:", err);
      setMateriasDisponiblesAgregar([]);
    } finally {
      setCargandoOpcionesCurso(false);
    }
  }, [esModoPersonal, materiasCurso]);

  const cargarConfiguracionMaterias = useCallback(async () => {
    if (!modalMateriaOpen) return;
    try {
      setCargandoConfiguracionMaterias(true);
      const entradas = await Promise.all(
        (materiasCurso || []).map(async (cmd) => {
          try {
            const insumos = await insumosAPI.listarPorCMD(cmd.id_cmd);
            return [String(cmd.id_cmd), (insumos || []).length];
          } catch {
            return [String(cmd.id_cmd), 0];
          }
        }),
      );
      setInsumosPorCMDConfig(Object.fromEntries(entradas));
    } finally {
      setCargandoConfiguracionMaterias(false);
    }
  }, [materiasCurso, modalMateriaOpen]);

  const quitarMateriaDelCurso = async (cmd) => {
    const tieneInsumos = Number(insumosPorCMDConfig[String(cmd.id_cmd)] || 0) > 0;
    if (tieneInsumos) {
      notify("error", "No se puede quitar una materia que ya tiene insumos");
      return;
    }

    try {
      setQuitandoMateria(true);
      await cmdAPI.eliminar(cmd.id_cmd);
      setMateriaPendienteQuitar(null);
      await cargarDatos();
      await cargarConfiguracionMaterias();
      notify("success", "Materia quitada del curso");
    } catch (err) {
      notify("error", err.message || "No se pudo quitar la materia");
    } finally {
      setQuitandoMateria(false);
    }
  };

  const abrirConfirmacionQuitarMateria = (cmd) => {
    const tieneInsumos = Number(insumosPorCMDConfig[String(cmd.id_cmd)] || 0) > 0;
    if (tieneInsumos) {
      notify("error", "Solo puedes quitar materias sin asignaciones");
      return;
    }
    setMateriaPendienteQuitar(cmd);
  };

  const guardarMateriaAlCurso = async () => {
    if (!materiasAgregarSeleccionadas.length) {
      notify("error", "Selecciona al menos una materia");
      return;
    }
    if (!datosUsuario?.id_usuario) {
      notify("error", "No se pudo identificar el docente actual");
      return;
    }
    try {
      setGuardandoMateriaCurso(true);
      await Promise.all(materiasAgregarSeleccionadas.map((idMateria) => asignacionesAPI.crear({
          id_curso: Number(id_curso),
          id_materia: Number(idMateria),
          id_docente: Number(datosUsuario.id_usuario),
        })));
      setModalMateriaOpen(false);
      setMateriasAgregarSeleccionadas([]);
      await cargarDatos();
      notify(
        "success",
        materiasAgregarSeleccionadas.length === 1
          ? "Materia agregada al curso"
          : "Materias agregadas al curso",
      );
    } catch (err) {
      notify("error", err.message || "No se pudo agregar la materia");
    } finally {
      setGuardandoMateriaCurso(false);
    }
  };

  const abrirModalAgregarMateria = () => {
    setMateriasAgregarSeleccionadas([]);
    setModalMateriaOpen(true);
  };

  const toggleMateriaSeleccionada = (idMateria) => {
    setMateriasAgregarSeleccionadas((prev) => {
      const id = String(idMateria);
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const abrirModalAgregarEstudiante = () => {
    setEstudianteCreando({
      nombre: "",
      apellido: "",
      cedula: "",
      fecha_nacimiento: "",
    });
    setMostrarCrearEstudiante(true);
  };

  const abrirModalEditarEstudiante = async (estudiante) => {
    setEstudianteEditando(estudiante);
    setEstudianteEditForm({
      nombre: estudiante.nombre || "",
      apellido: estudiante.apellido || "",
      cedula: estudiante.cedula || "",
      fecha_nacimiento: estudiante.fecha_nacimiento?.slice(0, 10) || "",
      estado: String(estudiante.estado || "matriculado").toLowerCase(),
      id_curso_actual: estudiante.id_curso_actual ? String(estudiante.id_curso_actual) : "",
    });
    setMostrarEditarEstudiante(true);

    try {
      const cursos = esModoPersonal
        ? await cursosAPI.obtenerCursosPorDocente(datosUsuario?.id_usuario)
        : await cursosAPI.listar({ size: 100 });
      setCursosEdicion(cursos || []);
    } catch (err) {
      console.error("Error al cargar cursos para edición:", err);
      setCursosEdicion([]);
    }
  };

  const guardarEdicionEstudiante = async () => {
    if (!estudianteEditando) return;
    if (!estudianteEditForm.nombre.trim() || !estudianteEditForm.apellido.trim() || !estudianteEditForm.cedula.trim()) {
      notify("error", "Nombre, apellido y cédula son obligatorios");
      return;
    }

    try {
      setGuardandoEdicionEstudiante(true);
      await estudiantesAPI.actualizar(Number(estudianteEditando.id_estudiante), {
        nombre: formatearNombrePropio(estudianteEditForm.nombre),
        apellido: formatearNombrePropio(estudianteEditForm.apellido),
        cedula: estudianteEditForm.cedula.trim(),
        fecha_nacimiento: estudianteEditForm.fecha_nacimiento || undefined,
        estado: estudianteEditForm.estado || "matriculado",
        id_curso_actual: estudianteEditForm.id_curso_actual ? Number(estudianteEditForm.id_curso_actual) : null,
      });
      setMostrarEditarEstudiante(false);
      setEstudianteEditando(null);
      await cargarDatos();
      notify("success", "Estudiante actualizado");
    } catch (err) {
      notify("error", err.message || "No se pudo actualizar el estudiante");
    } finally {
      setGuardandoEdicionEstudiante(false);
    }
  };

  const quitarEstudianteDelCurso = async (estudiante) => {
    try {
      const confirmado = await requestConfirm(
        `¿Eliminar a ${estudiante.apellido} ${estudiante.nombre} del curso?`,
        { title: "Quitar estudiante" },
      );
      if (!confirmado) return;

      await estudiantesAPI.actualizar(Number(estudiante.id_estudiante), {
        id_curso_actual: null,
      });
      await cargarDatos();
      notify("success", "Estudiante eliminado del curso");
    } catch (err) {
      notify("error", err.message || "No se pudo retirar el estudiante");
    }
  };

  const guardarNuevoEstudianteCurso = async () => {
    if (!estudianteCreando.nombre.trim() || !estudianteCreando.apellido.trim() || !estudianteCreando.cedula.trim()) {
      notify("error", "Nombre, apellido y cédula son obligatorios");
      return;
    }
    try {
      setGuardandoEstudianteCurso(true);
      await estudiantesAPI.crear({
        nombre: estudianteCreando.nombre.trim(),
        apellido: estudianteCreando.apellido.trim(),
        cedula: estudianteCreando.cedula.trim(),
        fecha_nacimiento: estudianteCreando.fecha_nacimiento || undefined,
        estado: "matriculado",
        id_curso_actual: Number(id_curso),
      });
      setMostrarCrearEstudiante(false);
      await cargarDatos();
      notify("success", "Estudiante agregado al curso");
    } catch (err) {
      notify("error", err.message || "No se pudo agregar el estudiante");
    } finally {
      setGuardandoEstudianteCurso(false);
    }
  };

  const cargarDatos = useCallback(async () => {
    // El dashboard trae la fotografía inicial del curso. Después de guardar
    // algo, las funciones específicas vuelven a cargar solo la sección afectada.
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

      // El tutor puede revisar todo el curso; los demás docentes solo ven
      // las materias que tienen asignadas dentro de ese mismo curso.
      const esTutorInstitucional =
        (localStorage.getItem("app_mode") || "institucional").toLowerCase() ===
          "institucional" &&
        Number(cursoActual?.id_tutor) === Number(usuario.id_usuario);

      const todasLasAsignaciones = dashboard?.asignaciones || [];
      const cmd = esTutorInstitucional
        ? todasLasAsignaciones
        : todasLasAsignaciones.filter(
            (item) => Number(item.id_docente) === Number(usuario.id_usuario),
          );
      const asignacionesGestionables = todasLasAsignaciones.filter(
        (item) => Number(item.id_docente) === Number(usuario.id_usuario),
      );

      setMateriasGestionablesDocente(
        asignacionesGestionables
          .map((item) => item.id_cmd || item.cmd?.id_cmd || item.id_materia || item.materia?.id_materia)
          .filter(Boolean),
      );
      setMateriasCurso(cmd || []);
      // Guardamos IDs normalizados como texto porque algunas respuestas de la
      // API llegan como números y otras como strings.
      const gestionablesIds = new Set(
        asignacionesGestionables
          .map((item) => item.id_cmd || item.cmd?.id_cmd || item.id_materia || item.materia?.id_materia)
          .filter(Boolean)
          .map((value) => String(value)),
      );
      const primeraGestionable = (cmd || []).find((item) =>
        gestionablesIds.has(
          String(item.id_cmd || item.cmd?.id_cmd || item.id_materia || item.materia?.id_materia),
        ),
      );
      setMateriaSeleccionada(primeraGestionable || (cmd && cmd.length > 0 ? cmd[0] : null));
      if (!cmd || cmd.length === 0) {
        setInsumosMateria([]);
        setAsistencias([]);
      }

      const estudiantes = dashboard?.estudiantes || [];
      setCursoDetalle(cursoActual);
      setEstudiantesCurso(estudiantes || []);

      setCursosEdicion([]);

      // La configuración viene incluida en el dashboard. Si no hay periodos,
      // mostramos una indicación útil en lugar de dejar un selector vacío.
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
    esModoPersonal,
  ]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (!materiaSeleccionada?.id_cmd) return;
    if (["insumos", "notasEstudiante", "promedios", "reportes"].includes(activeTab)) {
      cargarInsumos(materiaSeleccionada.id_cmd);
    }
    if (activeTab === "asistencia") {
      cargarAsistencia(materiaSeleccionada.id_cmd);
    }
  }, [activeTab, materiaSeleccionada, cargarInsumos, cargarAsistencia]);

  useEffect(() => {
    if (modalMateriaOpen) {
      cargarMateriasDisponiblesAgregar();
    }
  }, [modalMateriaOpen, cargarMateriasDisponiblesAgregar]);

  useEffect(() => {
    if (modalMateriaOpen) {
      cargarConfiguracionMaterias();
    }
  }, [modalMateriaOpen, cargarConfiguracionMaterias]);

  useEffect(() => {
    if (activeTab === "comportamiento") {
      cargarComportamientos();
    }
  }, [activeTab, cargarComportamientos]);

  // ====================== INSUMOS ======================
  const agregarInsumo = async () => {
    // Primero validamos el formulario en el navegador y luego dejamos que el
    // backend confirme periodo, permisos y duplicados antes de limpiar el form.
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
      notify("success", "Insumo creado correctamente");
    } catch (err) {
      notify("error", "Error al crear insumo: " + err.message);
    } finally {
      setCargandoInsumo(false);
    }
  };

  const eliminarInsumo = (insumo) => {
    setInsumoPendienteEliminar(insumo);
  };

  const confirmarEliminarInsumo = async () => {
    const insumo = insumoPendienteEliminar;
    if (!insumo || eliminandoInsumo) return;

    setEliminandoInsumo(true);
    try {
      await insumosAPI.eliminar(insumo.id_insumo);
      await cargarInsumos(materiaSeleccionada.id_cmd);
      setInsumoPendienteEliminar(null);
      notify("success", "Insumo eliminado correctamente");
    } catch (err) {
      notify("error", "Error al eliminar insumo: " + err.message);
    } finally {
      setEliminandoInsumo(false);
    }
  };

  const [insumoNotasAbierto, setInsumoNotasAbierto] = useState(null);
  const [insumoPendienteEliminar, setInsumoPendienteEliminar] = useState(null);
  const notasPorInsumoCache = useRef(new Map());

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
    if (notasPorInsumoCache.current.has(id_insumo)) {
      return notasPorInsumoCache.current.get(id_insumo);
    }
    const notas = await notasAPI.listarPorInsumo(id_insumo);
    notasPorInsumoCache.current.set(id_insumo, notas || []);
    return notas || [];
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

  const guardarAsistenciaUno = async (id_estudiante, { silent = false, recargar = true } = {}) => {
    // Si ya existe asistencia para esa fecha se actualiza; si no, se crea.
    // Así el botón puede usarse varias veces sin generar registros duplicados.
    const estado = estadosTemporales[id_estudiante];
    if (!estado) return false;
    const accionIndividual = !silent;
    if (accionIndividual && guardandoAsistencia) return false;
    if (accionIndividual) setGuardandoAsistencia(true);

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
      if (recargar) {
        await cargarAsistencia(materiaSeleccionada.id_cmd);
      }
      if (!silent) {
        notify("success", existente ? "Asistencia actualizada" : "Asistencia guardada");
      }
      return true;
    } catch (err) {
      if (!silent) notify("error", "No se pudo guardar: " + err.message);
      return false;
    } finally {
      if (accionIndividual) setGuardandoAsistencia(false);
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
      await cargarAsistencia(materiaSeleccionada.id_cmd);
      sincronizarEstadosTemporalesAsistencia(fechaAsistencia);
      notify("success", "Asistencia limpiada");
    } catch (err) {
      notify("error", "No se pudo eliminar: " + err.message);
    }
  };

  const guardarAsistenciaTodo = async () => {
    if (guardandoAsistencia) return;
    setGuardandoAsistencia(true);
    const pendientes = estudiantesCurso.filter(
      (estudiante) => estadosTemporales[estudiante.id_estudiante],
    );
    try {
      const resultados = await Promise.all(
        pendientes.map((estudiante) =>
          guardarAsistenciaUno(estudiante.id_estudiante, {
            silent: true,
            recargar: false,
          }),
        ),
      );
      const guardadas = resultados.filter(Boolean).length;
      const fallidas = resultados.length - guardadas;

      if (pendientes.length > 0) {
        await cargarAsistencia(materiaSeleccionada.id_cmd);
      }
      if (guardadas > 0) {
        notify("success", "Asistencia guardada correctamente");
      }
      if (fallidas > 0) {
        notify(
          "error",
          fallidas === 1
            ? "1 registro no pudo guardarse. Revisa la fecha seleccionada."
            : `${fallidas} registros no pudieron guardarse. Revisa la fecha seleccionada.`,
        );
      }
    } finally {
      setGuardandoAsistencia(false);
    }
  };

  const comportamientoExistentePorEstudiante = (id_estudiante) =>
    comportamientos.find(
      (c) => c.id_estudiante === id_estudiante && c.periodo === comportamientoMes,
    );

  const sincronizarEstadosTemporalesComportamiento = useCallback(
    (mes = comportamientoMes, registros = comportamientos) => {
      const valores = {};
      const observaciones = {};

      (registros || [])
        .filter((registro) => registro.periodo === mes)
        .forEach((registro) => {
          valores[registro.id_estudiante] = registro.valor;
          observaciones[registro.id_estudiante] = registro.observaciones || "";
        });

      setValoresTemporales(valores);
      setObservacionesTemporales(observaciones);
    },
    [comportamientoMes, comportamientos],
  );

  useEffect(() => {
    if (!materiaSeleccionada?.id_cmd || activeTab !== "comportamiento") return;
    sincronizarEstadosTemporalesComportamiento();
  }, [
    activeTab,
    comportamientoMes,
    comportamientos,
    materiaSeleccionada?.id_cmd,
    sincronizarEstadosTemporalesComportamiento,
  ]);

  const guardarComportamientoUno = async (id_estudiante, { silent = false } = {}) => {
    const valor = valoresTemporales[id_estudiante];
    if (!valor) return false;
    const accionIndividual = !silent;
    if (accionIndividual && guardandoComportamiento) return false;
    if (accionIndividual) setGuardandoComportamiento(true);

    const existente = comportamientoExistentePorEstudiante(id_estudiante);
    const payload = {
      id_curso: parseInt(id_curso, 10),
      id_estudiante: parseInt(id_estudiante, 10),
      periodo: comportamientoMes,
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
      if (!silent) notify("success", "Comportamiento guardado correctamente");
      return true;
    } catch (err) {
      if (!silent) notify("error", "No se pudo guardar: " + err.message);
      return false;
    } finally {
      if (accionIndividual) setGuardandoComportamiento(false);
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
    // Una celda vacía elimina la nota existente; un valor reemplaza o crea la
    // nota. El backend sigue siendo quien valida el rango permitido.
    if (guardandoNotaIndividual) return;
    if (idNotaAEliminar) {
      setGuardandoNotaIndividual(true);
      try {
        await notasAPI.eliminar(idNotaAEliminar);
        await cargarNotasEstudiante(estudianteSeleccionado);
        await cargarNotasCurso();
      } catch (err) {
        notify("error", "No se pudo eliminar la nota: " + err.message);
      } finally {
        setGuardandoNotaIndividual(false);
      }
      return;
    }

    if (nuevoValor === "" || nuevoValor === null || nuevoValor === undefined) return;

    setGuardandoNotaIndividual(true);
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
      await cargarNotasCurso();
    } catch (err) {
      notify("error", "No se pudo guardar la nota: " + err.message);
    } finally {
      setGuardandoNotaIndividual(false);
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
      await cargarComportamientos();
      sincronizarEstadosTemporalesComportamiento(comportamientoMes);
      notify("success", "Comportamiento eliminado");
    } catch (err) {
      notify("error", "No se pudo eliminar: " + err.message);
    }
  };

  const guardarComportamientoTodo = async () => {
    if (guardandoComportamiento) return;
    setGuardandoComportamiento(true);
    let guardados = 0;
    let fallidos = 0;
    try {
      for (const estudiante of estudiantesCurso) {
        if (valoresTemporales[estudiante.id_estudiante]) {
          const guardado = await guardarComportamientoUno(estudiante.id_estudiante, { silent: true });
          if (guardado) guardados += 1;
          else fallidos += 1;
        }
      }
      if (guardados > 0) {
        notify("success", `${guardados} registro${guardados === 1 ? "" : "s"} de comportamiento guardado${guardados === 1 ? "" : "s"}`);
      }
      if (fallidos > 0) {
        notify(
          "error",
          fallidos === 1
            ? "1 registro de comportamiento no pudo guardarse"
            : `${fallidos} registros de comportamiento no pudieron guardarse`,
        );
      }
    } finally {
      setGuardandoComportamiento(false);
    }
  };

  useEffect(() => {
    if (activeTab === "notasEstudiante" && estudianteSeleccionado) {
      cargarNotasEstudiante(estudianteSeleccionado);
    }
  }, [activeTab, cargarNotasEstudiante, estudianteSeleccionado]);

  useEffect(() => {
    if (activeTab !== "notasEstudiante") {
      setEstudianteSeleccionado("");
      setNotasIndividuales([]);
      setCargandoNotasIndividual(false);
    }
  }, [activeTab]);

  useEffect(() => {
    cargarNotasCurso();
  }, [cargarNotasCurso]);

  const cerrarSesion = () => {
    const appMode = localStorage.getItem("app_mode") || "institucional";
    clearSessionStorage();
    // Volver al login con el modo que estaba usando
    window.location.replace(`/?mode=${appMode}`);
  };

  return (
    <div className="curso-principal-page">
      <div className="navbar-curso">
        <button className="btn-volver" onClick={() => navigate("/docente", { replace: true })}>
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
            ? nombrePersona(datosUsuario)
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
          <div className="empty-state course-setup-empty">
            <h2>No hay materias asignadas</h2>
            <p>
              Aún no hay materias asignadas a este curso. El siguiente paso es
              agregar una materia para habilitar el resto del curso.
            </p>
            {esModoPersonal && (
              <div className="course-setup-actions course-setup-actions-primary">
                <button type="button" className="btn-success" onClick={abrirModalAgregarMateria}>
                  <BookOpen size={14} />
                  <span>Añadir materia</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="course-summary">
                <div className="course-summary-main">
                  <p className="summary-label">Curso</p>
                  <h3 className="course-summary-title">{cursoDetalle?.nombre || "Curso"}</h3>
                  {soloLecturaTutor && (
                    <p className="summary-sub" style={{ color: "#111", fontWeight: 700 }}>
                      Tutor del curso · Vista global en solo lectura
                    </p>
                  )}
                </div>
                <div className="course-summary-year">
                  <span>Año lectivo</span>
                  <strong>{cursoDetalle?.anio_lectivo || "-"}</strong>
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
                  <p className="stat-sub">Matriculados en este curso</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Insumos</p>
                  <h3 className="stat-value">{insumosMateria.length}</h3>
                  <p className="stat-sub">Actividades, proyecto y examen</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Periodos</p>
                  <h3 className="stat-value">{periodos.length}</h3>
                  <p className="stat-sub">Configurados para este año</p>
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

            <div className="materia-selector">
                <label>Selecciona Materia:</label>
                <div className="materia-selector-inline">
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
                  {esModoPersonal && (
                    <button
                      type="button"
                      className="btn-secondary materia-config-btn"
                      onClick={() => setModalMateriaOpen(true)}
                    >
                      <span className="materia-config-btn-text">
                        <span>Configurar</span>
                        <span>materias</span>
                      </span>
                      <Settings2 size={14} />
                    </button>
                  )}
                </div>
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

            {esModoPersonal && activeTab === "estudiantes" && (
              <div className="panel-card tab-pane active estudiantes-tab-panel">
                <div className="panel-header estudiantes-tab-header">
                  <div>
                    <h3><Users size={18} /> Estudiantes</h3>
                    <p className="panel-sub">Gestiona los estudiantes del curso. Puedes buscar, filtrar y retirar.</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn-view btn-inline-icon btn-add-student-wrap" onClick={() => setMostrarImportarEstudiantes(true)}>
                      <Upload size={16} />
                      <span>Importar<br />Excel</span>
                    </button>
                    <button type="button" className="btn-add-docente btn-inline-icon btn-add-student-wrap" onClick={abrirModalAgregarEstudiante}>
                      <UserPlus size={16} />
                      <span>Añadir<br />Estudiante</span>
                    </button>
                  </div>
                </div>

                <div className="estudiantes-course-filters">
                  <input
                    placeholder="Buscar por nombre, apellido o cédula"
                    value={busquedaEstudiantesCurso}
                    onChange={(e) => setBusquedaEstudiantesCurso(e.target.value)}
                  />
                  <CustomSelect
                    value={estadoEstudiantesCurso}
                    onChange={setEstadoEstudiantesCurso}
                    options={[
                      { value: "", label: "Todos los estados" },
                      { value: "matriculado", label: "Matriculado" },
                      { value: "retirado", label: "Retirado" },
                      { value: "graduado", label: "Graduado" },
                    ]}
                    placeholder="Todos los estados"
                    className="custom-select-white"
                  />
                  <button
                    type="button"
                    className="btn-neutral btn-inline-icon estudiantes-clear-btn"
                    onClick={() => {
                      setBusquedaEstudiantesCurso("");
                      setEstadoEstudiantesCurso("");
                    }}
                  >
                    <Brush size={14} />
                    Limpiar
                  </button>
                </div>

                <div className="table-container estudiantes-course-table-container">
                  <table className="estudiantes-course-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Apellido</th>
                        <th>Nombre</th>
                        <th>Cédula</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesCursoFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center" }}>
                            No hay estudiantes con los filtros actuales
                          </td>
                        </tr>
                      ) : (
                        estudiantesCursoFiltrados.map((estudiante, index) => (
                          <tr key={estudiante.id_estudiante}>
                            <td>{index + 1}</td>
                            <td>{estudiante.apellido || "-"}</td>
                            <td>{estudiante.nombre || "-"}</td>
                            <td>{estudiante.cedula || "-"}</td>
                            <td>
                              <span className={`student-state-pill student-state-${String(estudiante.estado || "").toLowerCase() || "sin-estado"}`}>
                                {estudiante.estado || "Sin estado"}
                              </span>
                            </td>
                            <td>
                              <div className="student-table-actions">
                                <button
                                  type="button"
                                  className="btn-view btn-inline-icon"
                                  onClick={() => abrirModalEditarEstudiante(estudiante)}
                                >
                                  <Pencil size={14} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-delete btn-delete-inline btn-inline-icon"
                                  onClick={() => quitarEstudianteDelCurso(estudiante)}
                                >
                                  <Trash2 size={14} />
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: INSUMOS */}
            {activeTab === "insumos" && (
                <TabInsumos
                  activeTab={activeTab}
                  materiaSeleccionada={materiaSeleccionada}
                  nuevoInsumo={nuevoInsumo}
                  setNuevoInsumo={setNuevoInsumo}
                  periodosOptions={periodosOptions}
                  periodosVisibles={periodosVisibles}
                  periodosFiltrados={periodosFiltrados}
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
                   eliminandoInsumo={eliminandoInsumo}
                />
            )}

            <TabAsistencia
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                fechaAsistencia={fechaAsistencia}
                setFechaAsistencia={setFechaAsistencia}
                soloLecturaTutor={soloLecturaTutor}
                estadosTemporales={estadosTemporales}
                setEstadosTemporales={setEstadosTemporales}
                asistenciaExistentePorEstudiante={asistenciaExistentePorEstudiante}
                onGuardarUno={guardarAsistenciaUno}
                onEliminarUno={eliminarAsistenciaUno}
                onGuardarTodo={guardarAsistenciaTodo}
                guardandoAsistencia={guardandoAsistencia}
            />

            <TabComportamiento
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                mesComportamiento={comportamientoMes}
                setMesComportamiento={setComportamientoMes}
                periodos={periodos}
                soloLecturaTutor={soloLecturaTutor}
                valoresTemporales={valoresTemporales}
                setValoresTemporales={setValoresTemporales}
                observacionesTemporales={observacionesTemporales}
                setObservacionesTemporales={setObservacionesTemporales}
                comportamientoExistentePorEstudiante={comportamientoExistentePorEstudiante}
                onGuardarUno={guardarComportamientoUno}
                onEliminarUno={eliminarComportamientoUno}
                onGuardarTodo={guardarComportamientoTodo}
                guardandoComportamiento={guardandoComportamiento}
            />

            <TabNotasEstudiante
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                periodos={periodos}
                insumosMateria={insumosMateria}
                estudianteSeleccionado={estudianteSeleccionado}
                setEstudianteSeleccionado={setEstudianteSeleccionado}
                soloLecturaTutor={soloLecturaTutor}
                notasIndividuales={notasIndividuales}
                cargandoNotasIndividual={cargandoNotasIndividual}
                onGuardarNota={guardarNotaIndividual}
                guardandoNota={guardandoNotaIndividual}
            />

            {/* TAB: PROMEDIOS */}
            <TabPromedios
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                periodos={periodos}
                insumosMateria={insumosMateria}
                notasPorEstudiante={notasPorEstudiante}
            />

            <TabReportes
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                periodos={periodos}
                insumosMateria={insumosMateria}
                notasPorEstudiante={notasPorEstudiante}
                materiasCurso={materiasCurso}
                materiaSeleccionada={materiaSeleccionada}
                cursoDetalle={cursoDetalle}
                soloLecturaTutor={soloLecturaTutor}
              />

            <TabPeriodizacion
                activeTab={activeTab}
                errorPeriodos={errorPeriodos}
                periodos={periodos}
                esModoPersonal={esModoPersonal}
            />

            {insumoNotasAbierto && (
              <TabModalNotasInsumo
                insumo={insumoNotasAbierto}
                estudiantesCurso={estudiantesCurso}
                soloLecturaTutor={soloLecturaTutor}
                cargarEstudiantesPorCurso={cargarEstudiantesPorCurso}
                cargarNotasPorInsumo={cargarNotasPorInsumo}
                guardarNota={async (id_estudiante, valor, idNota = null) => {
                  if (!insumoNotasAbierto) return;
                  const notasCacheadas = notasPorInsumoCache.current.get(insumoNotasAbierto.id_insumo) || [];
                  const notaExistente = idNota
                    ? { id_nota: idNota }
                    : notasCacheadas.find(
                        (n) => String(n.id_estudiante) === String(id_estudiante),
                      );
                  let notaGuardada = notaExistente;
                  if (notaExistente) {
                    if (valor === null) {
                      await notasAPI.eliminar(notaExistente.id_nota);
                    } else {
                      notaGuardada = await notasAPI.actualizar(notaExistente.id_nota, {
                        calificacion: parseFloat(valor),
                      });
                    }
                  } else if (valor !== null) {
                    notaGuardada = await notasAPI.crear({
                      id_estudiante: parseInt(id_estudiante, 10),
                      id_insumo: insumoNotasAbierto.id_insumo,
                      calificacion: parseFloat(valor),
                    });
                  }
                  const notasActualizadas = notasCacheadas.filter(
                    (nota) => String(nota.id_estudiante) !== String(id_estudiante),
                  );
                  if (valor !== null) {
                    notasActualizadas.push({
                      ...(notaExistente || {}),
                      ...(notaGuardada || {}),
                      id_estudiante,
                      id_insumo: insumoNotasAbierto.id_insumo,
                      calificacion: parseFloat(valor),
                    });
                  }
                  notasPorInsumoCache.current.set(
                    insumoNotasAbierto.id_insumo,
                    notasActualizadas,
                  );
                  notify(
                    "success",
                    valor === null
                      ? "Nota eliminada correctamente"
                      : notaExistente
                        ? "Nota actualizada correctamente"
                        : "Nota guardada correctamente",
                  );
                  return notaGuardada;
                }}
                onClose={cerrarModalInsumo}
              />
            )}

            {insumoEditando && (
              <div className="modal-overlay">
                <div className="modal-notas modal-insumo-edit course-mini-modal course-edit-modal">
                  <div className="modal-header course-mini-modal-header">
                    <h3 className="course-mini-modal-title">Editar Insumo</h3>
                    <button className="btn-cerrar" onClick={cerrarModalEdicionInsumo} disabled={editandoInsumo} aria-label="Cerrar modal">
                      <X size={14} />
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
                    <button className="btn-cancel btn-inline-icon" type="button" onClick={cerrarModalEdicionInsumo} disabled={editandoInsumo}>
                      <X size={14} />
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

        {modalMateriaOpen && (
          <div className="modal-overlay course-mini-modal-overlay">
            <div className="modal-notas modal-insumo-edit course-mini-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header course-mini-modal-header">
                <h3 className="course-mini-modal-title">Configurar materias</h3>
                <button className="btn-cerrar" type="button" onClick={() => setModalMateriaOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="modal-insumo-edit-body course-mini-modal-body">
                <p className="panel-sub" style={{ marginTop: 0 }}>
                  Toca para quitar materia. Solo podrás quitar las que no tengan asignaciones.
                </p>
                <div className="materia-config-section">
                  <div className="materia-config-section-header">
                    <h4>Materias asignadas</h4>
                    <span className="course-mini-empty-helper">{materiasCurso.length} asignadas</span>
                  </div>
                  <div className="materia-pill-grid">
                    {materiasCurso.length === 0 ? (
                      <p className="course-mini-empty-helper">Aún no hay materias asignadas.</p>
                    ) : (
                      materiasCurso.map((cmd) => {
                        const tieneInsumos = Number(insumosPorCMDConfig[String(cmd.id_cmd)] || 0) > 0;
                        const materiaBloqueada = tieneInsumos;
                        return (
                          <div
                            key={cmd.id_cmd}
                            className={`materia-assigned-pill ${materiaBloqueada ? "materia-assigned-pill-locked" : ""}`}
                          >
                            <button
                              type="button"
                              className={`estudiante-pill materia-pill-option active materia-assigned-pill-row ${materiaBloqueada ? "materia-assigned-pill-row-locked" : ""}`}
                              onClick={() => abrirConfirmacionQuitarMateria(cmd)}
                              disabled={materiaBloqueada || cargandoConfiguracionMaterias || quitandoMateria}
                              aria-label={materiaBloqueada ? "Materia bloqueada por insumos" : "Quitar materia"}
                              title={materiaBloqueada ? "Materia bloqueada por insumos" : "Quitar materia"}
                            >
                              <span className="materia-assigned-pill-label">
                                {materiaNombre(cmd)}
                              </span>
                              <span className="materia-assigned-pill-x">
                                <X size={14} />
                              </span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="materia-config-section">
                  <div className="materia-config-section-header">
                    <h4>Materias disponibles</h4>
                    <span className="course-mini-empty-helper">Toca para agregar</span>
                  </div>
                  <div className="materia-pill-grid">
                    {cargandoOpcionesCurso || cargandoConfiguracionMaterias ? (
                      <p className="course-mini-empty-helper">Cargando materias...</p>
                    ) : materiasDisponiblesAgregar.length === 0 ? (
                      <p className="course-mini-empty-helper">No hay materias disponibles para asignar.</p>
                    ) : (
                      materiasDisponiblesAgregar.map((materia) => {
                        const active = materiasAgregarSeleccionadas.includes(String(materia.id_materia));
                        return (
                          <button
                            key={materia.id_materia}
                            type="button"
                            className={`estudiante-pill materia-pill-option ${active ? "active" : ""}`}
                            onClick={() => toggleMateriaSeleccionada(materia.id_materia)}
                            disabled={guardandoMateriaCurso}
                          >
                            {materia.nombre}
                            {materia.codigo ? <span className="materia-pill-code">{materia.codigo}</span> : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="materia-pill-summary">
                  <p className="materia-pill-summary-title">Se agregarán</p>
                  {materiasAgregarSeleccionadasDetalle.length === 0 ? (
                    <p className="course-mini-empty-helper">Aún no has seleccionado materias.</p>
                  ) : (
                    <div className="materia-pill-summary-list">
                      {materiasAgregarSeleccionadasDetalle.map((materia) => (
                        <span key={materia.id_materia} className="summary-badge materia-summary-badge">
                          {materia.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-insumo-edit-footer">
                <button className="btn-cancel" type="button" onClick={() => setModalMateriaOpen(false)} disabled={guardandoMateriaCurso}>
                  <X size={14} />
                  <span>Cancelar</span>
                </button>
                <button className="btn-save btn-save-inline course-add-materia-save" type="button" onClick={guardarMateriaAlCurso} disabled={guardandoMateriaCurso || materiasAgregarSeleccionadas.length === 0}>
                  <Save size={16} />
                  <span>{guardandoMateriaCurso ? "Guardando..." : "Agregar materias"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {materiaPendienteQuitar && (
          <div className="modal-overlay course-mini-modal-overlay course-confirm-overlay">
            <div className="modal-notas modal-insumo-edit course-mini-modal course-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header course-mini-modal-header">
                <h3 className="course-mini-modal-title">Quitar materia</h3>
                <button className="btn-cerrar" type="button" onClick={() => setMateriaPendienteQuitar(null)}>
                  <X size={14} />
                </button>
              </div>
              <div className="modal-insumo-edit-body course-mini-modal-body">
                <p className="panel-sub" style={{ marginTop: 0 }}>
                  ¿Seguro que quieres quitar <strong>{materiaNombre(materiaPendienteQuitar)}</strong> del curso?
                </p>
                <p className="course-mini-empty-helper">
                  Solo se puede quitar si no tiene asignaciones.
                </p>
              </div>
              <div className="modal-insumo-edit-footer">
                <button className="btn-cancel" type="button" onClick={() => setMateriaPendienteQuitar(null)} disabled={quitandoMateria}>
                  <X size={14} />
                  <span>Cancelar</span>
                </button>
                <button
                  className="btn-delete btn-delete-inline"
                  type="button"
                  onClick={() => quitarMateriaDelCurso(materiaPendienteQuitar)}
                  disabled={quitandoMateria}
                >
                  <Trash2 size={14} />
                  <span>{quitandoMateria ? "Quitando..." : "Quitar materia"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {insumoPendienteEliminar && (
          <div className="modal-overlay course-mini-modal-overlay course-confirm-overlay">
            <div className="modal-notas modal-insumo-edit course-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header course-mini-modal-header">
                <h3 className="course-mini-modal-title">Eliminar insumo</h3>
                <button
                  className="btn-cerrar"
                  type="button"
                  onClick={() => setInsumoPendienteEliminar(null)}
                  aria-label="Cerrar modal"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="modal-insumo-edit-body course-mini-modal-body">
                <p className="panel-sub" style={{ marginTop: 0 }}>
                  ¿Estás seguro de eliminar el siguiente insumo?
                </p>
                <span className="insumo-delete-type-pill">
                  {{
                    actividad: "Actividad",
                    proyecto_periodo: "Proyecto del periodo",
                    examen_periodo: "Examen del periodo",
                  }[insumoPendienteEliminar.tipo_insumo] || "Insumo"}: {insumoPendienteEliminar.nombre}
                </span>
              </div>
              <div className="modal-insumo-edit-footer">
                <button className="btn-cancel btn-inline-icon" type="button" onClick={() => setInsumoPendienteEliminar(null)} disabled={eliminandoInsumo}>
                  <X size={14} />
                  Cancelar
                </button>
                <button className="btn-delete btn-delete-inline" type="button" onClick={confirmarEliminarInsumo} disabled={eliminandoInsumo}>
                  <Trash2 size={14} />
                  {eliminandoInsumo ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarCrearEstudiante && (
          <div className="modal-overlay course-student-create-overlay">
            <div className="modal-notas course-student-create-modal course-mini-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header course-mini-modal-header">
                <h3 className="course-mini-modal-title course-dialog-title">Añadir Estudiante</h3>
                <button className="btn-cerrar" type="button" onClick={() => setMostrarCrearEstudiante(false)} aria-label="Cerrar modal">
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub course-student-create-sub">
                Crea el estudiante y quedará asignado al curso actual.
              </p>
              <input
                placeholder="Nombres"
                maxLength={50}
                value={estudianteCreando.nombre}
                onChange={(e) => setEstudianteCreando((prev) => ({ ...prev, nombre: e.target.value.slice(0, 50) }))}
              />
              <input
                placeholder="Apellidos"
                maxLength={50}
                value={estudianteCreando.apellido}
                onChange={(e) => setEstudianteCreando((prev) => ({ ...prev, apellido: e.target.value.slice(0, 50) }))}
              />
              <input
                placeholder="Cédula"
                inputMode="numeric"
                maxLength={10}
                value={estudianteCreando.cedula}
                onChange={(e) => setEstudianteCreando((prev) => ({ ...prev, cedula: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              />
              <input type="hidden" value="matriculado" />
              <div className="modal-buttons course-student-create-buttons">
                <button
                  type="button"
                  className="btn-neutral btn-inline-icon"
                  onClick={() => setMostrarCrearEstudiante(false)}
                  disabled={guardandoEstudianteCurso}
                >
                  <X size={14} />
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-success btn-inline-icon"
                  onClick={guardarNuevoEstudianteCurso}
                  disabled={guardandoEstudianteCurso}
                >
                  <UserPlus size={14} />
                  {guardandoEstudianteCurso ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarEditarEstudiante && (
          <div className="modal-overlay course-student-create-overlay">
            <div className="modal-notas course-student-create-modal course-student-edit-modal course-mini-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header course-mini-modal-header">
                <h3 className="course-mini-modal-title course-dialog-title">Editar Estudiante</h3>
                <button className="btn-cerrar" type="button" onClick={() => setMostrarEditarEstudiante(false)} aria-label="Cerrar modal">
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub course-student-create-sub">
                Actualiza los datos del estudiante.
              </p>
              <input
                placeholder="Apellidos"
                maxLength={50}
                value={estudianteEditForm.apellido}
                onChange={(e) => setEstudianteEditForm((prev) => ({ ...prev, apellido: e.target.value.slice(0, 50) }))}
              />
              <input
                placeholder="Nombres"
                maxLength={50}
                value={estudianteEditForm.nombre}
                onChange={(e) => setEstudianteEditForm((prev) => ({ ...prev, nombre: e.target.value.slice(0, 50) }))}
              />
              <input
                placeholder="Cédula"
                inputMode="numeric"
                maxLength={10}
                value={estudianteEditForm.cedula}
                onChange={(e) => setEstudianteEditForm((prev) => ({ ...prev, cedula: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              />
              <CustomSelect
                value={estudianteEditForm.estado}
                onChange={(value) => setEstudianteEditForm((prev) => ({ ...prev, estado: value }))}
                options={[
                  { value: "matriculado", label: "Matriculado" },
                  { value: "retirado", label: "Retirado" },
                  { value: "graduado", label: "Graduado" },
                ]}
                placeholder="Estado"
                className="custom-select-white estudiantes-modal-select"
              />
              {!esModoPersonal && (
                  <CustomSelect
                    value={estudianteEditForm.id_curso_actual}
                    onChange={(value) => setEstudianteEditForm((prev) => ({ ...prev, id_curso_actual: value }))}
                    options={[
                      { value: "", label: "Sin curso" },
                      ...cursosEdicionAnioActual.map((c) => ({
                        value: String(c.id_curso),
                        label: `${c.nombre}${c.anio_lectivo ? ` · ${c.anio_lectivo}` : ""}`,
                      })),
                    ]}
                  placeholder="Sin curso"
                  className="custom-select-white estudiantes-modal-select"
                />
              )}
              <div className="modal-buttons course-student-create-buttons">
                <button
                  type="button"
                  className="btn-neutral btn-inline-icon"
                  onClick={() => {
                    setMostrarEditarEstudiante(false);
                    setEstudianteEditando(null);
                  }}
                  disabled={guardandoEdicionEstudiante}
                >
                  <X size={14} />
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-success btn-inline-icon"
                  onClick={guardarEdicionEstudiante}
                  disabled={guardandoEdicionEstudiante}
                >
                  <Save size={14} />
                  {guardandoEdicionEstudiante ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ImportarEstudiantesModal
          open={mostrarImportarEstudiantes}
          onClose={() => setMostrarImportarEstudiantes(false)}
          onSaved={cargarDatos}
          cursoFijoId={String(id_curso)}
          titulo="Importar estudiantes"
          subtitulo="Carga un Excel y revisa los datos antes de guardarlos en este curso."
        />

        <AnalisisAcademico
          idCurso={id_curso}
          nombreCurso={cursoDetalle?.nombre || curso?.nombre}
          habilitado={!cargando && Boolean(cursoDetalle) && !error}
        />

      </div>
    </div>
  );
}

export default CursoPrincipal;
