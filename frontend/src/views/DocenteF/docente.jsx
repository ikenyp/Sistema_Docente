import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Save,
  CalendarClock,
  Settings2,
  BookOpen,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import CustomSelect from "../../components/admin/CustomSelect";
import PeriodizacionPage from "../Periodizacion/PeriodizacionPage";
import "../../styles/docente.css";
import {
  aniosLectivosAPI,
  cmdAPI,
  cursosAPI,
  asignacionesAPI,
  estudiantesAPI,
  materiasAPI,
  insumosAPI,
  notasAPI,
  periodizacionAPI,
} from "../../services/api";
import { notify } from "../../components/notify";

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
  const [aniosLectivosPersonales, setAniosLectivosPersonales] = useState([]);
  const [anioLectivoActivoPersonal, setAnioLectivoActivoPersonal] = useState(
    localStorage.getItem("anio_lectivo_activo") || "",
  );
  const [mostrarAnioModal, setMostrarAnioModal] = useState(false);
  const [mostrarConfigAnioModal, setMostrarConfigAnioModal] = useState(false);
  const [anioNuevoPersonal, setAnioNuevoPersonal] = useState("");
  const [creandoAnioPersonal, setCreandoAnioPersonal] = useState(false);
  const [errorAnioPersonal, setErrorAnioPersonal] = useState(null);

  const [resumenOperacion, setResumenOperacion] = useState({
    asignaciones: 0,
    cursosSinMaterias: 0,
    cursosSinTutor: 0,
    aniosSinPeriodizacion: 0,
    estudiantesSinCurso: 0,
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
    soyTutor: true,
  });
  const [guardandoWizard, setGuardandoWizard] = useState(false);
  const [errorWizard, setErrorWizard] = useState(null);
  const [mostrarPeriodizacionModal, setMostrarPeriodizacionModal] =
    useState(false);
  const [mostrarMateriasModal, setMostrarMateriasModal] = useState(false);
  const [mostrarMateriaFormModal, setMostrarMateriaFormModal] = useState(false);
  const [materiasPersonales, setMateriasPersonales] = useState([]);
  const [busquedaMateriaPersonal, setBusquedaMateriaPersonal] = useState("");
  const [materiaEditando, setMateriaEditando] = useState(null);
  const [nuevaMateriaPersonal, setNuevaMateriaPersonal] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
  });
  const [guardandoMateriaPersonal, setGuardandoMateriaPersonal] =
    useState(false);
  const [errorMateriaPersonal, setErrorMateriaPersonal] = useState(null);
  const [estudiantesPersonales, setEstudiantesPersonales] = useState([]);
  const [asignacionesPersonales, setAsignacionesPersonales] = useState([]);
  const [insumosSinNotasPorCurso, setInsumosSinNotasPorCurso] = useState({});
  const [mostrarPendientesModal, setMostrarPendientesModal] = useState(false);

  // Menú y edición/eliminación de curso
  const [openMenuId, setOpenMenuId] = useState(null);
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false);
  const [editarCursoData, setEditarCursoData] = useState(null);
  const [guardandoCurso, setGuardandoCurso] = useState(false);
  const [mostrarEliminarModal, setMostrarEliminarModal] = useState(false);
  const [cursoAEliminar, setCursoAEliminar] = useState(null);

  // Control de sesión expirada
  const [sesionExpirada, setSesionExpirada] = useState(false);

  const anioContextoVisible =
    appMode === "personal" ? anioLectivoActivoPersonal : filtroAnio;

  const anioActualObjPersonal = useMemo(
    () =>
      aniosLectivosPersonales.find(
        (anio) => anio === anioLectivoActivoPersonal,
      ) || null,
    [aniosLectivosPersonales, anioLectivoActivoPersonal],
  );

  const resumenCursos = useMemo(() => {
    const cursosContexto =
      appMode === "personal" && anioContextoVisible
        ? cursos.filter((curso) => curso?.anio_lectivo === anioContextoVisible)
        : cursos;
    const totalCursos = cursosContexto.length;
    const cursosConAnio = cursosContexto.filter(
      (curso) => curso?.anio_lectivo,
    ).length;
    const esTutor = cursosContexto.some(
      (curso) =>
        datosUsuario &&
        Number(curso?.id_tutor) === Number(datosUsuario.id_usuario),
    );

    return {
      totalCursos,
      cursosConAnio,
      modo: appMode === "personal" ? "Personal" : "Institucional",
      esTutor,
    };
  }, [appMode, anioContextoVisible, cursos, datosUsuario]);

  const cursoTutorActual = useMemo(() => {
    if (appMode !== "personal" || !datosUsuario) return null;

    return (
      cursos.find(
        (curso) =>
          curso?.anio_lectivo === anioContextoVisible &&
          (Number(curso?.id_tutor) === Number(datosUsuario.id_usuario) ||
            Number(curso?.tutor?.id_usuario) ===
              Number(datosUsuario.id_usuario)),
      ) || null
    );
  }, [appMode, anioContextoVisible, cursos, datosUsuario]);

  useEffect(() => {
    if (appMode !== "personal") return;
    if (!mostrarWizard) return;

    if (cursoTutorActual) {
      setNuevoCurso((prev) =>
        prev.soyTutor ? { ...prev, soyTutor: false } : prev,
      );
    }
  }, [appMode, mostrarWizard, cursoTutorActual]);

  const aniosDisponiblesCursos = useMemo(() => {
    return [
      ...new Set(cursos.map((curso) => curso?.anio_lectivo).filter(Boolean)),
    ].sort();
  }, [cursos]);

  const materiasPersonalesFiltradas = useMemo(() => {
    const termino = busquedaMateriaPersonal.trim().toLowerCase();
    const base = materiasPersonales;
    if (!termino) return base;
    return base.filter((materia) => {
      const texto =
        `${materia.codigo || ""} ${materia.nombre || ""} ${materia.descripcion || ""}`.toLowerCase();
      return texto.includes(termino);
    });
  }, [busquedaMateriaPersonal, materiasPersonales]);

  const resumenMateriasPersonales = useMemo(
    () => materiasPersonales.filter((materia) => !materia?.eliminado).length,
    [materiasPersonales],
  );

  const pendientesPersonal = useMemo(() => {
    if (appMode !== "personal") return [];

    const idsConAsignacion = new Set(
      asignacionesPersonales.map((item) => item.id_curso).filter(Boolean),
    );
    const cursosConEstudiantes = new Set(
      estudiantesPersonales
        .map((item) => item.id_curso_actual)
        .filter((idCurso) => idCurso !== null && idCurso !== undefined),
    );

    const cursosPendientesContexto =
      anioContextoVisible && anioContextoVisible !== "todos"
        ? cursos.filter((curso) => curso?.anio_lectivo === anioContextoVisible)
        : cursos;

    const pendientes = [];
    cursosPendientesContexto.forEach((curso) => {
      if (!idsConAsignacion.has(curso.id_curso)) {
        pendientes.push({
          id: `materias-${curso.id_curso}`,
          tipo: "materias",
          curso,
          titulo: curso.nombre,
          detalle: "No tiene materias asignadas",
          accion: "Configurar materias",
        });
      }

      if (!cursosConEstudiantes.has(curso.id_curso)) {
        pendientes.push({
          id: `estudiantes-${curso.id_curso}`,
          tipo: "estudiantes",
          curso,
          titulo: curso.nombre,
          detalle: "No tiene estudiantes asignados",
          accion: "Abrir estudiantes",
        });
      }

      if (!curso.id_tutor) {
        pendientes.push({
          id: `tutor-${curso.id_curso}`,
          tipo: "tutor",
          curso,
          titulo: curso.nombre,
          detalle: "No tiene tutor asignado",
          accion: "Editar curso",
        });
      }

      const sinNotas = insumosSinNotasPorCurso[curso.id_curso] || 0;
      if (sinNotas > 0) {
        pendientes.push({
          id: `insumos-${curso.id_curso}`,
          tipo: "insumos",
          curso,
          titulo: curso.nombre,
          detalle: `${sinNotas} insumo(s) sin notas registradas`,
          accion: "Abrir insumos",
        });
      }
    });

    if (anioContextoVisible && resumenOperacion.aniosSinPeriodizacion > 0) {
      pendientes.push({
        id: `periodizacion-${anioContextoVisible}`,
        tipo: "periodizacion",
        titulo: anioContextoVisible,
        detalle: "El año lectivo no tiene periodización",
        accion: "Ver periodización",
      });
    }

    return pendientes;
  }, [
    appMode,
    asignacionesPersonales,
    estudiantesPersonales,
    insumosSinNotasPorCurso,
    cursos,
    anioContextoVisible,
    resumenOperacion.aniosSinPeriodizacion,
  ]);

  const normalizarAnioLectivo = (valor) => {
    if (!valor) return "";
    if (/^\d{4}$/.test(valor)) return `${valor}-${Number(valor) + 1}`;
    return valor;
  };

  const validarAnioLectivo = (anio) => {
    const patron = /^\d{4}-\d{4}$/;
    if (!patron.test(anio)) return "Formato inválido. Usa: 2026-2027";
    const [inicio, fin] = anio.split("-").map(Number);
    if (fin !== inicio + 1)
      return "El año final debe ser +1 del inicial (ej: 2026-2027)";
    return null;
  };

  const cursosVisibles = useMemo(() => {
    let lista = [...cursos];

    if (anioContextoVisible && anioContextoVisible !== "todos") {
      lista = lista.filter(
        (curso) => curso?.anio_lectivo === anioContextoVisible,
      );
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
      if (
        texto.includes("1ro") ||
        texto.includes("1er") ||
        texto.includes("primero")
      )
        return 11;
      if (texto.includes("2do") || texto.includes("segundo")) return 12;
      if (texto.includes("3ro") || texto.includes("tercero")) return 13;
      return 99;
    };

    const comparador =
      {
        "colegio-asc": (a, b) =>
          gradoCurso(a.nombre) - gradoCurso(b.nombre) ||
          numeroCurso(a.nombre) - numeroCurso(b.nombre) ||
          a.nombre.localeCompare(b.nombre),
        "colegio-desc": (a, b) =>
          gradoCurso(b.nombre) - gradoCurso(a.nombre) ||
          numeroCurso(b.nombre) - numeroCurso(a.nombre) ||
          b.nombre.localeCompare(a.nombre),
        reciente: (a, b) =>
          String(b.anio_lectivo || "").localeCompare(
            String(a.anio_lectivo || ""),
          ) || a.nombre.localeCompare(b.nombre),
        antiguo: (a, b) =>
          String(a.anio_lectivo || "").localeCompare(
            String(b.anio_lectivo || ""),
          ) || a.nombre.localeCompare(b.nombre),
        alfabetico: (a, b) => a.nombre.localeCompare(b.nombre),
      }[ordenCursos] || ((a, b) => a.nombre.localeCompare(b.nombre));

    return lista.sort(comparador);
  }, [anioContextoVisible, cursos, ordenCursos]);

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

  useEffect(() => {
    if (appMode !== "personal") return;

    const cargarAniosPersonales = async () => {
      try {
        const data = await aniosLectivosAPI.listar();
        const lista = (data || [])
          .map((item) => normalizarAnioLectivo(item.anio_lectivo))
          .filter(Boolean)
          .sort()
          .reverse();

        setAniosLectivosPersonales(lista);

        const almacenado = localStorage.getItem("anio_lectivo_activo") || "";
        const elegido =
          almacenado && lista.includes(almacenado)
            ? almacenado
            : lista[0] || "";

        if (elegido && elegido !== almacenado) {
          localStorage.setItem("anio_lectivo_activo", elegido);
        }

        setAnioLectivoActivoPersonal(elegido);
      } catch (err) {
        console.error("Error al cargar años lectivos personales:", err);
      }
    };

    cargarAniosPersonales();
  }, [appMode]);

  useEffect(() => {
    if (appMode !== "personal") return;
    if (!anioLectivoActivoPersonal) return;
    localStorage.setItem("anio_lectivo_activo", anioLectivoActivoPersonal);
  }, [appMode, anioLectivoActivoPersonal]);

  const cargarMateriasPersonales = useCallback(async () => {
    if (appMode !== "personal") return;
    try {
      const data = await materiasAPI.listar({
        size: 100,
        incluir_eliminadas: true,
      });
      setMateriasPersonales(data || []);
    } catch (err) {
      console.error("Error al cargar materias personales:", err);
      notify("error", err.message || "No se pudieron cargar las materias");
    }
  }, [appMode]);

  useEffect(() => {
    if (!mostrarMateriasModal) return;
    cargarMateriasPersonales();
  }, [mostrarMateriasModal, cargarMateriasPersonales]);

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

      const cursosMap = new Map();
      const materiasAsignadasDocente = new Set();

      const fusionarCurso = (cursoBase, cursoNuevo) => {
        if (!cursoNuevo?.id_curso) return cursoBase;
        if (!cursoBase) return { ...cursoNuevo };

        return {
          ...cursoBase,
          ...cursoNuevo,
          id_tutor: cursoBase.id_tutor ?? cursoNuevo.id_tutor,
          tutor: cursoBase.tutor ?? cursoNuevo.tutor,
        };
      };

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
        if (curso?.id_curso) {
          cursosMap.set(curso.id_curso, fusionarCurso(null, curso));
        }
      });

      (asignaciones || []).forEach((asig) => {
        const claveMateria =
          asig?.id_cmd ||
          asig?.cmd?.id_cmd ||
          asig?.id_materia ||
          asig?.materia?.id_materia;
        if (claveMateria) {
          materiasAsignadasDocente.add(claveMateria);
        }
        const curso =
          asig?.curso ||
          (asig?.id_curso
            ? { id_curso: asig.id_curso, nombre: "Curso", anio_lectivo: "" }
            : null);

        if (curso?.id_curso) {
          const cursoActual = cursosMap.get(curso.id_curso);
          cursosMap.set(curso.id_curso, fusionarCurso(cursoActual, curso));
        }
      });

      if (modoActual === "personal") {
        try {
          const cursosPropios = await cursosAPI.listar({
            id_tutor: usuario.id_usuario,
            size: 100,
          });
          (cursosPropios || []).forEach((curso) => {
            if (curso?.id_curso) {
              const cursoActual = cursosMap.get(curso.id_curso);
              cursosMap.set(curso.id_curso, fusionarCurso(cursoActual, curso));
            }
          });
        } catch {
          // ya se intenta más abajo con cursosTutor
        }
      }

      const cursosUnicos = Array.from(cursosMap.values());

      if (modoActual === "personal") {
        const cursosTutorActual = cursosUnicos.filter(
          (curso) =>
            curso?.anio_lectivo === anioContextoVisible &&
            (Number(curso?.id_tutor) === Number(usuario.id_usuario) ||
              Number(curso?.tutor?.id_usuario) === Number(usuario.id_usuario)),
        );

        if (cursosTutorActual.length > 1) {
          const cursoTutorPrincipal = cursosTutorActual[0]?.id_curso;

          let tutorAsignado = false;
          cursosUnicos.forEach((curso) => {
            const esTutorDelDocente =
              curso?.anio_lectivo === anioContextoVisible &&
              (Number(curso?.id_tutor) === Number(usuario.id_usuario) ||
                Number(curso?.tutor?.id_usuario) ===
                  Number(usuario.id_usuario));

            if (!esTutorDelDocente) return;

            const conservarTutor =
              (!tutorAsignado && curso.id_curso === cursoTutorPrincipal) ||
              (!tutorAsignado && !cursoTutorPrincipal);

            if (conservarTutor) {
              tutorAsignado = true;
              return;
            }

            curso.id_tutor = null;
            if (curso.tutor?.id_usuario === usuario.id_usuario) {
              curso.tutor = null;
            }
          });
        }
      }

      const todasAsignaciones =
        modoActual === "personal"
          ? await asignacionesAPI.listar({ size: 100 })
          : asignaciones || [];

      if (modoActual === "personal") {
        setAsignacionesPersonales(todasAsignaciones || []);
      } else {
        setAsignacionesPersonales(asignaciones || []);
      }

      let estudiantesPersonalesData = [];
      if (modoActual === "personal") {
        try {
          estudiantesPersonalesData =
            (await estudiantesAPI.buscar({ estado: "matriculado", size: 100 })) || [];
        } catch {
          estudiantesPersonalesData = [];
        }
        setEstudiantesPersonales(estudiantesPersonalesData);
      }

      let insumosSinNotasData = {};
      if (modoActual === "personal") {
        const cmdPorCurso = new Map();
        (todasAsignaciones || []).forEach((asignacion) => {
          if (asignacion?.id_cmd && asignacion?.id_curso) {
            cmdPorCurso.set(asignacion.id_cmd, asignacion.id_curso);
          }
        });

        const conteos = await Promise.allSettled(
          Array.from(cmdPorCurso.entries()).map(async ([idCmd, idCurso]) => {
            const insumos = await insumosAPI.listarPorCMD(idCmd);
            let sinNotas = 0;

            for (const insumo of insumos || []) {
              const notas = await notasAPI.listar({ id_insumo: insumo.id_insumo, size: 1 });
              if (!(notas || []).length) {
                sinNotas += 1;
              }
            }

            return [idCurso, sinNotas];
          }),
        );

        insumosSinNotasData = conteos.reduce((acc, result) => {
          if (result.status !== "fulfilled") return acc;
          const [idCurso, sinNotas] = result.value;
          if (sinNotas > 0) {
            acc[idCurso] = sinNotas;
          }
          return acc;
        }, {});
        setInsumosSinNotasPorCurso(insumosSinNotasData);
      } else {
        setInsumosSinNotasPorCurso({});
      }

      const cursosContexto =
        modoActual === "personal" && anioContextoVisible
          ? cursosUnicos.filter(
              (curso) => curso?.anio_lectivo === anioContextoVisible,
            )
          : cursosUnicos;

      const idsConAsignacion = new Set(
        (todasAsignaciones || []).map((item) => item.id_curso),
      );
      const cursosSinMaterias = cursosContexto.filter(
        (curso) => !idsConAsignacion.has(curso.id_curso),
      ).length;
      const cursosSinTutor = cursosContexto.filter(
        (curso) => !curso.id_tutor,
      ).length;

      const cursosConInsumosSinNotas = cursosContexto.filter(
        (curso) => (insumosSinNotasData[curso.id_curso] || 0) > 0,
      ).length;

      const estudiantesSinCurso =
        modoActual === "personal"
          ? estudiantesPersonalesData.filter((e) => !e.id_curso_actual).length
          : 0;

      let aniosSinPeriodizacion = 0;
      if (modoActual === "personal") {
        const aniosUnicos = anioContextoVisible ? [anioContextoVisible] : [];
        for (const anio of aniosUnicos) {
          try {
            const config =
              await periodizacionAPI.obtenerConfiguracionActual(anio);
            if (!config?.periodos?.length) aniosSinPeriodizacion += 1;
          } catch {
            aniosSinPeriodizacion += 1;
          }
        }
      }

      setResumenOperacion({
        asignaciones:
          materiasAsignadasDocente.size ||
          (cursosTutor || []).length ||
          (todasAsignaciones || []).length,
        cursosSinMaterias,
        cursosSinTutor,
        aniosSinPeriodizacion,
        estudiantesSinCurso,
        cursosConInsumosSinNotas,
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
  }, [navigate, anioContextoVisible]);

  useEffect(() => {
    if (appMode === "personal" && !anioLectivoActivoPersonal) return;
    cargarCursos();
  }, [appMode, anioLectivoActivoPersonal, cargarCursos]);

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

  // ====================== ACCIONES ======================
  const irAlCurso = (curso, extraState = {}) => {
    navigate(`/curso/${curso.id_curso}`, {
      state: { curso, rol: "Docente", ...extraState },
    });
  };

  const resolverPendiente = (pendiente) => {
    if (!pendiente) return;

    if (pendiente.tipo === "tutor") {
      abrirEditarCurso(pendiente.curso);
      setMostrarPendientesModal(false);
      return;
    }

    if (pendiente.tipo === "periodizacion") {
      navigate("/docente/periodizacion");
      setMostrarPendientesModal(false);
      return;
    }

    if (pendiente.tipo === "materias") {
      irAlCurso(pendiente.curso, { abrirConfigMaterias: true });
      setMostrarPendientesModal(false);
      return;
    }

    if (pendiente.tipo === "estudiantes") {
      irAlCurso(pendiente.curso, { abrirTab: "estudiantes" });
      setMostrarPendientesModal(false);
      return;
    }

    if (pendiente.tipo === "insumos") {
      irAlCurso(pendiente.curso, { abrirTab: "insumos" });
      setMostrarPendientesModal(false);
    }
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
    const cursoActual =
      cursos.find((c) => c.id_curso === curso.id_curso) || curso;
    setEditarCursoData({
      ...cursoActual,
      soyTutor: !!(
        datosUsuario &&
        (cursoActual.id_tutor === datosUsuario.id_usuario ||
          cursoActual.tutor?.id_usuario === datosUsuario.id_usuario)
      ),
      id_estructura_academica: cursoActual.id_estructura_academica || "",
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

      if (
        appMode === "personal" &&
        editarCursoData.soyTutor &&
        cursoTutorActual &&
        Number(cursoTutorActual.id_curso) !== Number(id_curso)
      ) {
        notify(
          "error",
          `Ya tienes un curso como tutor (${cursoTutorActual.nombre}). Debes quitar ese curso antes de marcar otro como tutor.`,
        );
        return;
      }

      if (appMode === "personal") {
        payload.id_tutor = editarCursoData.soyTutor
          ? datosUsuario.id_usuario
          : null;
        payload.id_estructura_academica =
          editarCursoData.id_estructura_academica
            ? Number(editarCursoData.id_estructura_academica)
            : null;
      }

      const cursoActualizado = await cursosAPI.actualizar(id_curso, payload);
      const cursoRecargado = await cursosAPI.obtenerCurso(id_curso);
      const cursoFinal = {
        ...(cursoActualizado || {}),
        ...(cursoRecargado || {}),
      };
      setCursos((prevCursos) =>
        prevCursos.map((curso) =>
          curso.id_curso === id_curso ? { ...curso, ...cursoFinal } : curso,
        ),
      );
      setMostrarEditarModal(false);
      setEditarCursoData(null);
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
      notify("error", err.message || "No se pudo eliminar el curso");
    }
  };

  const crearCursoPersonal = async () => {
    setErrorWizard(null);

    if (!nuevoCurso.nombre) {
      setErrorWizard("Nombre del curso es obligatorio");
      return;
    }

    if (!anioLectivoActivoPersonal) {
      setErrorWizard("No hay un año lectivo activo configurado");
      return;
    }

    if (appMode === "personal" && nuevoCurso.soyTutor && cursoTutorActual) {
      setErrorWizard(
        `Ya tienes un curso como tutor en este año lectivo (${cursoTutorActual.nombre}).`,
      );
      return;
    }

    try {
      setGuardandoWizard(true);
      await cursosAPI.crear({
        nombre: nuevoCurso.nombre,
        anio_lectivo: anioLectivoActivoPersonal,
        id_tutor: nuevoCurso.soyTutor ? datosUsuario.id_usuario : null,
      });

      await cargarCursos();
      setMostrarWizard(false);
      setNuevoCurso({
        nombre: "",
        soyTutor: true,
      });
      notify("success", "Curso creado correctamente");
    } catch (err) {
      setErrorWizard(`Error al crear curso: ${err.message}`);
    } finally {
      setGuardandoWizard(false);
    }
  };

  const cambiarAnioPersonal = (anio) => {
    setAnioLectivoActivoPersonal(anio);
    localStorage.setItem("anio_lectivo_activo", anio);
  };

  const crearAnioPersonal = async () => {
    const formato = normalizarAnioLectivo(anioNuevoPersonal.trim());
    const errorAnio = validarAnioLectivo(formato);
    if (errorAnio) {
      setErrorAnioPersonal(errorAnio);
      return;
    }

    setCreandoAnioPersonal(true);
    setErrorAnioPersonal(null);

    try {
      await aniosLectivosAPI.crear({ anio_lectivo: formato, activo: true });
      const listaActualizada = [
        formato,
        ...aniosLectivosPersonales.filter((item) => item !== formato),
      ];
      setAniosLectivosPersonales(listaActualizada);
      cambiarAnioPersonal(formato);
      setMostrarAnioModal(false);
      setAnioNuevoPersonal("");
      notify("success", `Año lectivo ${formato} creado`);
    } catch (err) {
      setErrorAnioPersonal(err.message || "No se pudo crear el año lectivo");
    } finally {
      setCreandoAnioPersonal(false);
    }
  };

  const aplicarEstadoAnioPersonal = async (activo) => {
    if (!anioActualObjPersonal) {
      notify("error", "No se encontró el año lectivo actual");
      return;
    }

    try {
      if (anioActualObjPersonal) {
        await aniosLectivosAPI.actualizar(
          anioActualObjPersonal.id_anio_lectivo,
          { activo },
        );
      }
      setMostrarConfigAnioModal(false);
      notify(
        "success",
        activo ? "Año lectivo activado" : "Año lectivo inactivado",
      );
      await cargarCursos();
    } catch (err) {
      notify("error", err.message || "No se pudo actualizar el año lectivo");
    }
  };

  const eliminarAnioPersonal = async () => {
    if (!anioActualObjPersonal) {
      notify("error", "No se encontró el año lectivo actual");
      return;
    }

    try {
      await aniosLectivosAPI.actualizar(anioActualObjPersonal.id_anio_lectivo, {
        activo: false,
      });
      await aniosLectivosAPI.eliminar(anioActualObjPersonal.id_anio_lectivo);
      setMostrarConfigAnioModal(false);
      const listaActualizada = aniosLectivosPersonales.filter(
        (item) => item !== anioLectivoActivoPersonal,
      );
      setAniosLectivosPersonales(listaActualizada);
      const siguiente = listaActualizada[0] || "";
      setAnioLectivoActivoPersonal(siguiente);
      if (siguiente) localStorage.setItem("anio_lectivo_activo", siguiente);
      else localStorage.removeItem("anio_lectivo_activo");
      await cargarCursos();
      notify("success", "Año lectivo eliminado");
    } catch (err) {
      notify("error", err.message || "No se pudo eliminar el año lectivo");
    }
  };

  const abrirModalMateriasPersonales = async () => {
    setMostrarMateriasModal(true);
    setErrorMateriaPersonal(null);
    setBusquedaMateriaPersonal("");
  };

  const abrirFormularioMateriaPersonal = (materia = null) => {
    if (materia) {
      setMateriaEditando(materia);
      setNuevaMateriaPersonal({
        codigo: materia.codigo || "",
        nombre: materia.nombre || "",
        descripcion: materia.descripcion || "",
      });
    } else {
      setMateriaEditando(null);
      setNuevaMateriaPersonal({ codigo: "", nombre: "", descripcion: "" });
    }

    setErrorMateriaPersonal(null);
    setMostrarMateriaFormModal(true);
  };

  const cerrarFormularioMateriaPersonal = () => {
    setMostrarMateriaFormModal(false);
    setMateriaEditando(null);
    setNuevaMateriaPersonal({ codigo: "", nombre: "", descripcion: "" });
    setErrorMateriaPersonal(null);
  };

  const crearMateriaPersonal = async () => {
    const nombre = nuevaMateriaPersonal.nombre.trim();
    const codigo = nuevaMateriaPersonal.codigo.trim();
    const descripcion = nuevaMateriaPersonal.descripcion.trim();

    if (!nombre) {
      setErrorMateriaPersonal("El nombre es obligatorio");
      return;
    }

    setGuardandoMateriaPersonal(true);
    setErrorMateriaPersonal(null);

    try {
      if (materiaEditando?.id_materia) {
        await materiasAPI.actualizar(materiaEditando.id_materia, {
          codigo: codigo || null,
          nombre,
          descripcion: descripcion || null,
        });
        notify("success", "Materia actualizada");
      } else {
        await materiasAPI.crear({
          codigo: codigo || null,
          nombre,
          descripcion: descripcion || null,
        });
        notify("success", "Materia creada");
      }
      setNuevaMateriaPersonal({ codigo: "", nombre: "", descripcion: "" });
      setMateriaEditando(null);
      await cargarMateriasPersonales();
      setMostrarMateriaFormModal(false);
    } catch (err) {
      setErrorMateriaPersonal(err.message || "No se pudo guardar la materia");
    } finally {
      setGuardandoMateriaPersonal(false);
    }
  };

  const eliminarMateriaPersonal = async (idMateria) => {
    try {
      await materiasAPI.eliminar(idMateria);
      await cargarMateriasPersonales();
      notify("success", "Materia eliminada");
    } catch (err) {
      notify("error", err.message || "No se pudo eliminar la materia");
    }
  };

  const cancelarWizard = () => {
    setMostrarWizard(false);
    setNuevoCurso({
      nombre: "",
      soyTutor: true,
    });
    setErrorWizard(null);
  };

  const abrirWizardCurso = () => {
    setNuevoCurso({
      nombre: "",
      soyTutor: !cursoTutorActual,
    });
    setErrorWizard(null);
    setMostrarWizard(true);
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
        {appMode === "personal" && (
          <div className="personal-year-context">
            <div className="personal-year-context-head">
              <div>
                <h3 className="personal-year-context-title">AÑO LECTIVO</h3>
              </div>
            </div>
            <div className="personal-year-context-grid personal-year-context-grid-inline">
              <label className="personal-year-context-select">
                <CustomSelect
                  value={anioLectivoActivoPersonal}
                  onChange={cambiarAnioPersonal}
                  options={[
                    {
                      value: "",
                      label:
                        aniosLectivosPersonales.length > 0
                          ? "Seleccione año lectivo"
                          : "Sin años creados",
                    },
                    ...(aniosLectivosPersonales.length > 0
                      ? aniosLectivosPersonales
                      : [anioLectivoActivoPersonal].filter(Boolean)
                    ).map((anio) => ({ value: anio, label: anio })),
                  ]}
                  placeholder="Seleccione año lectivo"
                  className="custom-select-white"
                  menuMaxHeight={220}
                />
              </label>
              <div className="personal-year-context-actions">
                <button
                  type="button"
                  className="btn-add-docente btn-inline-icon"
                  onClick={() => setMostrarAnioModal(true)}
                >
                  <Plus size={14} />
                  Nuevo año
                </button>
                <button
                  type="button"
                  className="toolbar-blue-btn btn-inline-icon"
                  onClick={() => setMostrarPeriodizacionModal(true)}
                >
                  <CalendarClock size={14} />
                  Periodización
                </button>
                <button
                  type="button"
                  className="toolbar-outline-btn btn-inline-icon"
                  onClick={() => setMostrarConfigAnioModal(true)}
                >
                  <Settings2 size={14} />
                  Configurar
                </button>
              </div>
            </div>
            <div className="personal-year-context-note">
              Cursos, periodización, materias y estudiantes se cargan según este
              año.
            </div>
          </div>
        )}

        {mostrarPeriodizacionModal && (
          <div className="personal-modal-overlay personal-modal-overlay-wide">
            <div className="personal-modal-card personal-year-modal personal-year-modal-wide">
              <div className="personal-modal-header">
                <h3 className="personal-modal-title personal-modal-title-center">
                  Periodización
                </h3>
                <button
                  type="button"
                  className="personal-modal-close"
                  onClick={() => setMostrarPeriodizacionModal(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <PeriodizacionPage embedded />
            </div>
          </div>
        )}

        {mostrarAnioModal && (
          <div className="personal-modal-overlay">
            <div className="personal-modal-card personal-year-modal">
              <div className="personal-modal-header">
                <h3 className="personal-modal-title personal-modal-title-center">
                  Nuevo año lectivo
                </h3>
                <button
                  type="button"
                  className="personal-modal-close"
                  onClick={() => setMostrarAnioModal(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub">
                Crea un nuevo año para usarlo como contexto activo en tu espacio
                personal.
              </p>
              <input
                className="personal-input"
                type="text"
                placeholder="2027-2028"
                value={anioNuevoPersonal}
                onChange={(e) => setAnioNuevoPersonal(e.target.value)}
              />
              {errorAnioPersonal && (
                <div className="personal-modal-error">{errorAnioPersonal}</div>
              )}
              <div className="wizard-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-cancel btn-inline-icon"
                  onClick={() => setMostrarAnioModal(false)}
                >
                  <X size={14} />
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-success btn-inline-icon"
                  onClick={crearAnioPersonal}
                  disabled={creandoAnioPersonal}
                >
                  <Plus size={14} />
                  {creandoAnioPersonal ? "Creando..." : "Crear año"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarConfigAnioModal && (
          <div className="personal-modal-overlay">
            <div className="personal-modal-card personal-year-modal">
              <div className="personal-modal-header">
                <h3 className="personal-modal-title personal-modal-title-center">
                  Configurar año lectivo
                </h3>
                <button
                  type="button"
                  className="personal-modal-close"
                  onClick={() => setMostrarConfigAnioModal(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub">
                {anioLectivoActivoPersonal || "Sin año seleccionado"}
              </p>
              <div
                className="personal-modal-error"
                style={{ background: "#eef3fb", color: "#223553" }}
              >
                Puedes activar, inactivar o eliminar el año lectivo actual.
              </div>
              <div
                className="wizard-actions"
                style={{ marginTop: "1rem", flexWrap: "wrap" }}
              >
                <button
                  type="button"
                  className="btn-add-docente btn-inline-icon"
                  onClick={() => aplicarEstadoAnioPersonal(true)}
                >
                  <Plus size={14} />
                  Activar
                </button>
                <button
                  type="button"
                  className="btn-view btn-inline-icon"
                  onClick={() => aplicarEstadoAnioPersonal(false)}
                >
                  <X size={14} />
                  Inactivar
                </button>
                <button
                  type="button"
                  className="btn-danger btn-inline-icon"
                  onClick={eliminarAnioPersonal}
                >
                  <X size={14} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarMateriasModal && (
          <div className="personal-modal-overlay">
            <div className="personal-modal-card personal-materias-modal">
              <div className="personal-modal-header">
                <h3 className="personal-modal-title personal-modal-title-center">
                  Configurar materias
                </h3>
                <button
                  type="button"
                  className="personal-modal-close"
                  onClick={() => setMostrarMateriasModal(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub">
                Crea, edita y administra tus materias propias dentro del
                contexto personal actual.
              </p>

              <div className="personal-materias-list-header">
                <div className="personal-materias-list-header-top">
                  <h4>Materias creadas</h4>
                  <button
                    type="button"
                    className="btn-add-docente btn-inline-icon"
                    onClick={() => abrirFormularioMateriaPersonal()}
                  >
                    <Plus size={14} />
                    Añadir materia
                  </button>
                </div>
                <input
                  className="personal-input personal-materias-search"
                  type="text"
                  placeholder="Buscar materia..."
                  value={busquedaMateriaPersonal}
                  onChange={(e) => setBusquedaMateriaPersonal(e.target.value)}
                />
              </div>

              <div className="personal-materias-list">
                {materiasPersonalesFiltradas.length > 0 ? (
                  materiasPersonalesFiltradas.map((materia) => (
                    <div
                      key={materia.id_materia}
                      className={`personal-materia-item ${materia.eliminado ? "personal-materia-item-deleted" : ""}`}
                    >
                      <div>
                        <strong>
                          {materia.nombre}
                          {materia.eliminado && (
                            <span className="personal-materia-badge">
                              Eliminada
                            </span>
                          )}
                        </strong>
                        <span>{materia.codigo || "Sin código"}</span>
                        {materia.descripcion && <p>{materia.descripcion}</p>}
                      </div>
                      <div className="personal-materia-actions">
                        <button
                          type="button"
                          className="btn-view btn-inline-icon"
                          onClick={() =>
                            abrirFormularioMateriaPersonal(materia)
                          }
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-inline-icon"
                          onClick={() =>
                            eliminarMateriaPersonal(materia.id_materia)
                          }
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No hay materias creadas</h3>
                    <p>
                      Agrega tu primera materia para este contexto personal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mostrarMateriaFormModal && (
          <div className="personal-modal-overlay">
            <div className="personal-modal-card personal-materia-form-modal">
              <div className="personal-modal-header">
                <h3 className="personal-modal-title personal-modal-title-center">
                  {materiaEditando ? "Editar materia" : "Añadir materia"}
                </h3>
                <button
                  type="button"
                  className="personal-modal-close"
                  onClick={cerrarFormularioMateriaPersonal}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub">
                {materiaEditando
                  ? "Actualiza los datos de la materia."
                  : "Completa los datos para crear una nueva materia."}
              </p>
              <div className="personal-materias-form">
                <input
                  className="personal-input"
                  type="text"
                  placeholder="Nombre de la materia"
                  value={nuevaMateriaPersonal.nombre}
                  onChange={(e) =>
                    setNuevaMateriaPersonal((prev) => ({
                      ...prev,
                      nombre: e.target.value,
                    }))
                  }
                />
                <input
                  className="personal-input"
                  type="text"
                  placeholder="Código (opcional)"
                  value={nuevaMateriaPersonal.codigo}
                  onChange={(e) =>
                    setNuevaMateriaPersonal((prev) => ({
                      ...prev,
                      codigo: e.target.value,
                    }))
                  }
                />
                <textarea
                  className="personal-input"
                  rows={2}
                  maxLength={255}
                  placeholder="Descripción (opcional)"
                  value={nuevaMateriaPersonal.descripcion}
                  onChange={(e) =>
                    setNuevaMateriaPersonal((prev) => ({
                      ...prev,
                      descripcion: e.target.value.slice(0, 255),
                    }))
                  }
                />
                <div className="personal-materia-counter">
                  {nuevaMateriaPersonal.descripcion.length}/255
                </div>
                {errorMateriaPersonal && (
                  <div className="personal-modal-error">
                    {errorMateriaPersonal}
                  </div>
                )}
                <div
                  className="personal-modal-actions-split"
                  style={{ marginTop: "0.8rem" }}
                >
                  <button
                    type="button"
                    className="btn-cancel btn-inline-icon"
                    onClick={cerrarFormularioMateriaPersonal}
                  >
                    <X size={14} />
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-success btn-inline-icon"
                    onClick={crearMateriaPersonal}
                    disabled={guardandoMateriaPersonal}
                  >
                    <Save size={14} />
                    {guardandoMateriaPersonal
                      ? "Guardando..."
                      : materiaEditando
                        ? "Guardar cambios"
                        : "Crear materia"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="cards-grid dashboard-summary-grid docente-summary-grid">
          <div className="stat-card accent">
            <p className="stat-label">Cursos visibles</p>
            <h3 className="stat-value">{resumenCursos.totalCursos}</h3>
            <p className="stat-sub">
              {appMode === "personal"
                ? "Filtrados por tu año lectivo activo"
                : "Cargados según tu modo de trabajo"}
            </p>
          </div>

          {appMode === "personal" ? (
            <>
              <div className="stat-card">
                <p className="stat-label">Materias creadas</p>
                <h3 className="stat-value">{resumenMateriasPersonales}</h3>
                <p className="stat-sub">Disponibles para gestionar en tu panel</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Tutor</p>
                <h3 className="stat-value">
                  {resumenCursos.esTutor ? "Sí" : "No"}
                </h3>
                <p className="stat-sub">Indicador de tutoría</p>
              </div>
              <button
                type="button"
                className="stat-card stat-card-action stat-card-pending"
                onClick={() => setMostrarPendientesModal(true)}
              >
                <p className="stat-label">Pendientes</p>
                <h3 className="stat-value">{pendientesPersonal.length}</h3>
                <p className="stat-sub">Toca para revisar lo que falta</p>
              </button>
            </>
          ) : (
            <>
              <div className="stat-card">
                <p className="stat-label">Materias asignadas</p>
                <h3 className="stat-value">{resumenOperacion.asignaciones}</h3>
                <p className="stat-sub">Materias que ya puedes gestionar</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Cursos con año lectivo</p>
                <h3 className="stat-value">{resumenCursos.cursosConAnio}</h3>
                <p className="stat-sub">Útil para periodos y promedios</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Tutor</p>
                <h3 className="stat-value">
                  {resumenCursos.esTutor ? "Sí" : "No"}
                </h3>
                <p className="stat-sub">Indicador de tutoría</p>
              </div>
            </>
          )}
        </div>

        {mostrarPendientesModal && (
          <div className="personal-modal-overlay docente-pendientes-overlay">
            <div className="personal-modal-card personal-course-modal docente-pendientes-modal">
              <div className="personal-modal-header personal-modal-header-tight">
                <h3 className="personal-modal-title personal-modal-title-center" style={{ marginBottom: 0 }}>
                  Pendientes
                </h3>
                <button
                  type="button"
                  className="personal-modal-close"
                  onClick={() => setMostrarPendientesModal(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="panel-sub" style={{ marginTop: 0 }}>
                Toca un pendiente para ir directo a resolverlo.
              </p>

              <div className="docente-pendientes-list">
                {pendientesPersonal.length === 0 ? (
                  <div className="empty-state" style={{ margin: 0 }}>
                    <h3>No hay pendientes</h3>
                    <p>Todo está listo en el año lectivo activo.</p>
                  </div>
                ) : (
                  pendientesPersonal.map((pendiente) => (
                    <button
                      key={pendiente.id}
                      type="button"
                      className={`docente-pendiente-item docente-pendiente-${pendiente.tipo}`}
                      onClick={() => resolverPendiente(pendiente)}
                    >
                      <div>
                        <strong>{pendiente.titulo}</strong>
                        <p>{pendiente.detalle}</p>
                      </div>
                      <span className="docente-pendiente-action">{pendiente.accion}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

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
            {appMode === "personal" && (
              <button
                className="toolbar-blue-btn toolbar-blue-btn-rounded"
                type="button"
                onClick={abrirModalMateriasPersonales}
              >
                <BookOpen size={14} />
                <span>Configurar materias</span>
              </button>
            )}
            {appMode === "personal" && (
              <button
                className="toolbar-success-btn"
                type="button"
                onClick={abrirWizardCurso}
              >
                <Plus size={14} />
                <span>Crear curso</span>
              </button>
            )}
            <div className="docente-toolbar-right">
              {appMode !== "personal" && (
                <div className="toolbar-anchor toolbar-anchor-filter">
                  <button
                    className="toolbar-outline-btn"
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
                    <ul
                      className="toolbar-dropdown-menu toolbar-dropdown-menu-left"
                      role="listbox"
                    >
                      {[
                        { value: "todos", label: "Todos los años lectivos" },
                        ...aniosDisponiblesCursos.map((anio) => ({
                          value: anio,
                          label: anio,
                        })),
                      ].map((option) => (
                        <li
                          key={option.value}
                          role="option"
                          aria-selected={option.value === filtroAnio}
                          className={`toolbar-dropdown-option ${option.value === filtroAnio ? "active" : ""}`}
                          onClick={() => {
                            setFiltroAnio(option.value);
                            setMenuFiltroAbierto(false);
                          }}
                        >
                          {option.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="toolbar-anchor toolbar-anchor-order">
                <button
                  className="toolbar-ghost-btn"
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
                  <ul
                    className="toolbar-dropdown-menu toolbar-dropdown-menu-left"
                    role="listbox"
                  >
                    {[
                      { value: "colegio-asc", label: "Colegio A-Z" },
                      { value: "colegio-desc", label: "Colegio Z-A" },
                      { value: "reciente", label: "Más reciente" },
                      { value: "antiguo", label: "Más antiguo" },
                      { value: "alfabetico", label: "Alfabético" },
                    ].map((option) => (
                      <li
                        key={option.value}
                        role="option"
                        aria-selected={option.value === ordenCursos}
                        className={`toolbar-dropdown-option ${option.value === ordenCursos ? "active" : ""}`}
                        onClick={() => {
                          setOrdenCursos(option.value);
                          setMenuOrdenAbierto(false);
                        }}
                      >
                        {option.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="docente-toolbar-statuses">
            <div className="toolbar-status-pill">
              <strong>Mostrando:</strong>{" "}
              {filtroAnio === "todos" ? "Todos los años lectivos" : filtroAnio}
            </div>
            <div className="toolbar-status-pill">
              <strong>Orden:</strong>{" "}
              {ordenCursos === "colegio-asc"
                ? "Colegio A-Z"
                : ordenCursos === "colegio-desc"
                  ? "Colegio Z-A"
                  : ordenCursos === "reciente"
                    ? "Más reciente"
                    : ordenCursos === "antiguo"
                      ? "Más antiguo"
                      : "Alfabético"}
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
            className="modal-backdrop session-expired-backdrop"
            style={{
              zIndex: 3000,
              background: "rgba(0, 0, 0, 0.5)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                padding: "2rem",
                width: "90%",
                maxWidth: "380px",
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
                type="button"
                className="session-expired-action"
                onClick={volverAlLogin}
              >
                ← Volver al Login
              </button>
            </div>
          </div>
        )}

        {!cargando && !error && (
          <>
            {appMode === "personal" && mostrarWizard && (
              <div className="personal-modal-overlay">
                <div className="personal-modal-card personal-course-modal">
                  <div className="personal-modal-header">
                    <h3 className="personal-modal-title personal-modal-title-center">
                      Crear curso
                    </h3>
                    <button
                      type="button"
                      className="personal-modal-close"
                      onClick={cancelarWizard}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="panel-sub">
                    Crea curso, luego podras añadir materias y estudiantes.
                  </p>

                  {errorWizard && (
                    <div className="personal-modal-error">⚠️ {errorWizard}</div>
                  )}

                  <div className="wizard-step">
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
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#6b7a99",
                        marginBottom: "1rem",
                      }}
                    >
                      Se usará el año lectivo activo del sistema.
                    </p>
                    {appMode === "personal" && (
                      <div
                        className={`course-tutor-toggle ${cursoTutorActual && !nuevoCurso.soyTutor ? "is-disabled" : ""}`}
                      >
                        <button
                          type="button"
                          className={`course-tutor-toggle-button ${nuevoCurso.soyTutor ? "is-active" : ""}`}
                          onClick={() =>
                            setNuevoCurso((p) => ({
                              ...p,
                              soyTutor: !p.soyTutor,
                            }))
                          }
                          disabled={!!cursoTutorActual}
                        >
                          {nuevoCurso.soyTutor ? "✓" : ""}
                        </button>
                        <span className="course-tutor-toggle-label">
                          Tutor de curso
                        </span>
                      </div>
                    )}
                    {appMode === "personal" && cursoTutorActual && (
                      <div className="course-tutor-warning-card course-tutor-warning-card-compact">
                        <div className="course-tutor-warning-content">
                          <strong>Tutor ya asignado</strong>
                          <span>
                            Ya tienes el curso {cursoTutorActual.nombre} como
                            tutor en este año lectivo.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="course-edit-modal-actions wizard-actions-compact">
                    <button
                      type="button"
                      className="course-edit-modal-btn course-edit-modal-btn-cancel"
                      onClick={cancelarWizard}
                      disabled={guardandoWizard}
                    >
                      <X size={14} />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      className="course-edit-modal-btn course-edit-modal-btn-save"
                      onClick={crearCursoPersonal}
                      disabled={guardandoWizard}
                    >
                      <Save size={14} />
                      <span>{guardandoWizard ? "Guardando..." : "Crear"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid-cursos">
              {cursosVisibles.length === 0 ? (
                <div className="empty-state">
                  <h3>
                    {appMode === "personal"
                      ? "No hay cursos creados para este año lectivo"
                      : "No tienes cursos asignados"}
                  </h3>
                  <p>
                    {appMode === "personal"
                      ? `Crea un curso para ${anioContextoVisible || "este contexto"} y empieza a gestionarlo desde aquí.`
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
                      {appMode === "personal" &&
                        (Number(curso.id_tutor) ===
                          Number(datosUsuario?.id_usuario) ||
                          Number(curso.tutor?.id_usuario) ===
                            Number(datosUsuario?.id_usuario)) && (
                          <span className="tutor-pill">TUTOR</span>
                        )}
                    </div>
                    {filtroAnio === "todos" ? (
                      <p className="curso-info">Año: {curso.anio_lectivo}</p>
                    ) : (
                      <p className="curso-info curso-info-ghost">
                        Año: {curso.anio_lectivo || " "}
                      </p>
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
                    padding: "1.5rem",
                    width: "90%",
                    maxWidth: "400px",
                    textAlign: "left",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="personal-modal-header personal-modal-header-tight">
                    <h3
                      className="personal-modal-title personal-modal-title-center"
                      style={{ marginBottom: 0 }}
                    >
                      Editar Curso
                    </h3>
                    <button
                      type="button"
                      className="personal-modal-close"
                      onClick={() => {
                        setMostrarEditarModal(false);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          justifyContent: "center",
                          gap: "0.5rem",
                          marginBottom: "0.4rem",
                          color:
                            cursoTutorActual &&
                            Number(cursoTutorActual.id_curso) !==
                              Number(editarCursoData.id_curso) &&
                            !editarCursoData.soyTutor
                              ? "#7a869a"
                              : "#223553",
                          fontSize: "0.92rem",
                          textAlign: "left",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setEditarCursoData((p) => ({
                              ...p,
                              soyTutor: !p.soyTutor,
                            }))
                          }
                          disabled={
                            !!cursoTutorActual &&
                            Number(cursoTutorActual.id_curso) !==
                              Number(editarCursoData.id_curso) &&
                            !editarCursoData.soyTutor
                          }
                          style={{
                            width: "30px",
                            height: "30px",
                            padding: 0,
                            border: "1px solid #cfd9ea",
                            borderRadius: "6px",
                            background: editarCursoData.soyTutor
                              ? "#4c6fdc"
                              : "#fff",
                            color: editarCursoData.soyTutor
                              ? "#fff"
                              : "transparent",
                            fontSize: "18px",
                            lineHeight: 1,
                            fontWeight: 700,
                            cursor:
                              !!cursoTutorActual &&
                              Number(cursoTutorActual.id_curso) !==
                                Number(editarCursoData.id_curso) &&
                              !editarCursoData.soyTutor
                                ? "not-allowed"
                                : "pointer",
                            flex: "0 0 auto",
                            alignSelf: "center",
                          }}
                        >
                          ✓
                        </button>
                        <span
                          style={{
                            whiteSpace: "normal",
                            lineHeight: 1.25,
                            flex: "0 1 auto",
                            alignSelf: "center",
                            textAlign: "center",
                          }}
                        >
                          Tutor de curso
                        </span>
                      </div>
                      {cursoTutorActual &&
                        Number(cursoTutorActual.id_curso) !==
                          Number(editarCursoData.id_curso) &&
                        !editarCursoData.soyTutor && (
                          <div className="course-tutor-warning-card">
                            <div className="course-tutor-warning-content">
                              <strong>Tutor ya asignado</strong>
                              <p>
                                Ya tienes el curso {cursoTutorActual.nombre}{" "}
                                como tutor. Debes quitarlo primero para asignar
                                otro.
                              </p>
                            </div>
                          </div>
                        )}
                    </>
                  )}

                  <div className="course-edit-modal-actions">
                    <button
                      type="button"
                      className="course-edit-modal-btn course-edit-modal-btn-cancel"
                      onClick={() => {
                        setMostrarEditarModal(false);
                      }}
                    >
                      <X size={14} />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      className="course-edit-modal-btn course-edit-modal-btn-save"
                      onClick={guardarEdicionCurso}
                      disabled={guardandoCurso}
                    >
                      <Save size={14} />
                      <span>{guardandoCurso ? "Guardando..." : "Guardar"}</span>
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
                    maxWidth: "420px",
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
