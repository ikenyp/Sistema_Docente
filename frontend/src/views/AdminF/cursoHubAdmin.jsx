import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserPlus, BookOpen, Clipboard, Calendar, FileText, Link2, Link2Off, Trash2, X, Save, Pencil, Upload } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import ImportarEstudiantesModal from "../../components/estudiantes/ImportarEstudiantesModal";
import { AnalisisAcademico } from "../../components/AnalisisAcademico";
import TabReportes from "../DocenteF/components/TabReportes";
import {
  cursosAPI,
  estudiantesAPI,
  asignacionesAPI,
  usuariosAPI,
  insumosAPI,
  notasAPI,
  asistenciaAPI,
  comportamientoAPI,
  materiasAPI,
} from "../../services/api";
import { notify, requestConfirm } from "../../components/notify";
import { normalizarAnioLectivo } from "../../utils/anioLectivo";
import { calcularPromedioInteractivo } from "../../utils/promedios";
import { nombrePersona } from "../../utils/personas";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "estudiantes", label: "Estudiantes" },
  { id: "materias", label: "Materias y docentes" },
  { id: "notas", label: "Notas" },
  { id: "reportes", label: "Reportes" },
  { id: "consulta", label: "Consulta académica" },
];

function CursoHubAdmin() {
  const { id } = useParams();
  const idCurso = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "resumen";

  const [curso, setCurso] = useState(null);
  const [tutor, setTutor] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesDisponibles, setEstudiantesDisponibles] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [materiasList, setMateriasList] = useState([]);
  const [materiasEstructura, setMateriasEstructura] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [estSel, setEstSel] = useState("");
  const [searchEst, setSearchEst] = useState("");
  const [searchAgregarEst, setSearchAgregarEst] = useState("");
  const [subConsulta, setSubConsulta] = useState("notas");
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [modalCrearEstOpen, setModalCrearEstOpen] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    fecha_nacimiento: "",
  });

  const [notas, setNotas] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [comportamientos, setComportamientos] = useState([]);
  const [insumosPorCMD, setInsumosPorCMD] = useState({});
  const [materiaDetalleSeleccionada, setMateriaDetalleSeleccionada] = useState("");
  const [materiaReporteSeleccionada, setMateriaReporteSeleccionada] = useState("");

  const [periodosConfigurados, setPeriodosConfigurados] = useState([]);

  const [notasCurso, setNotasCurso] = useState([]);

  const [tutorModalOpen, setTutorModalOpen] = useState(false);
  const [nuevoTutor, setNuevoTutor] = useState("");

  const [asignacionModalOpen, setAsignacionModalOpen] = useState(false);
  const [nuevaAsignacion, setNuevaAsignacion] = useState({
    id_materia: "",
    id_docente: "",
  });

  const registrarCursoReciente = useCallback((cursoReciente) => {
    if (!cursoReciente?.id_curso) return;
    const key = "admin_recent_courses";
    const actual = JSON.parse(localStorage.getItem(key) || "[]");
    const siguiente = [
      {
        id_curso: cursoReciente.id_curso,
        nombre: cursoReciente.nombre || `Curso ${cursoReciente.id_curso}`,
        anio_lectivo: normalizarAnioLectivo(cursoReciente.anio_lectivo || ""),
        accessedAt: Date.now(),
      },
      ...actual.filter((item) => Number(item.id_curso) !== Number(cursoReciente.id_curso)),
    ].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(siguiente));
  }, []);

  const cargarEstudiantesDisponibles = useCallback(async () => {
    try {
      const lista = await estudiantesAPI.buscar({ estado: "matriculado", size: 100 });
      setEstudiantesDisponibles(
        (lista || []).filter((est) => !est.id_curso_actual),
      );
    } catch {
      setEstudiantesDisponibles([]);
    }
  }, []);

  const cargarInsumosDelCurso = useCallback(async (asignacionesDelCurso) => {
    if (!Array.isArray(asignacionesDelCurso) || asignacionesDelCurso.length === 0) {
      setInsumosPorCMD({});
      return {};
    }

    try {
      const resultados = await Promise.all(
        asignacionesDelCurso.map(async (asignacion) => {
          try {
            const lista = await insumosAPI.listarPorCMD(asignacion.id_cmd);
            return [String(asignacion.id_cmd), Array.isArray(lista) ? lista : []];
          } catch {
            return [String(asignacion.id_cmd), []];
          }
        }),
      );

      const mapInsumos = Object.fromEntries(resultados);
      setInsumosPorCMD(mapInsumos);
      return mapInsumos;
    } catch {
      setInsumosPorCMD({});
      return {};
    }
  }, []);

  const cargarNotasCurso = useCallback(async (listaEstudiantes, asignacionesDelCurso, insumosMap) => {
    try {
      const estudiantesBase = Array.isArray(listaEstudiantes) ? listaEstudiantes : [];
      const asignacionesBase = Array.isArray(asignacionesDelCurso) ? asignacionesDelCurso : [];
      const insumosCurso = asignacionesBase.flatMap((asignacion) => insumosMap[String(asignacion.id_cmd)] || []);

      if (insumosCurso.length === 0) {
        setNotasCurso(
          estudiantesBase.map((estudiante) => ({
            id_estudiante: estudiante.id_estudiante,
            notas: [],
          })),
        );
        return;
      }

      const notasPorEstudiante = new Map(
        estudiantesBase.map((estudiante) => [String(estudiante.id_estudiante), []]),
      );

      await Promise.all(
        insumosCurso.map(async (insumo) => {
          try {
            const notasInsumo = await notasAPI.listarPorInsumo(insumo.id_insumo);
            (notasInsumo || []).forEach((nota) => {
              const bucket = notasPorEstudiante.get(String(nota.id_estudiante));
              if (bucket) bucket.push(nota);
            });
          } catch {
            /* ignorar un insumo puntual */
          }
        }),
      );

      setNotasCurso(
        estudiantesBase.map((estudiante) => ({
          id_estudiante: estudiante.id_estudiante,
          notas: notasPorEstudiante.get(String(estudiante.id_estudiante)) || [],
        })),
      );
    } catch (e) {
      notify("error", "No se pudieron cargar las notas del curso");
    }
  }, []);

  const refrescarCursoNotas = useCallback(async () => {
    try {
      const dashboard = await cursosAPI.obtenerDashboard(idCurso);
      const c = dashboard?.curso || null;
      const asignacionesDashboard = dashboard?.asignaciones || [];
      const estudiantesDashboard = dashboard?.estudiantes || [];

      setCurso(c);
      setEstudiantes(estudiantesDashboard);
      setAsignaciones(asignacionesDashboard);
      setMateriasEstructura(dashboard?.materias_estructura || []);

      if (c?.id_tutor) {
        try {
          const u = await usuariosAPI.obtener(c.id_tutor);
          setTutor(u);
        } catch {
          setTutor(null);
        }
      } else {
        setTutor(null);
      }

      const periodos = dashboard?.periodizacion?.periodos || [];
      setPeriodosConfigurados(periodos);

      const insumosMap = await cargarInsumosDelCurso(asignacionesDashboard);
      await cargarNotasCurso(estudiantesDashboard, asignacionesDashboard, insumosMap);
    } catch (e) {
      notify("error", e.message || "No se pudo refrescar las notas del curso");
    }
  }, [cargarInsumosDelCurso, cargarNotasCurso, idCurso]);

  const setTab = (next) => {
    setSearchParams({ tab: next }, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCargando(true);
      try {
        const [dashboard, lm, ld] = await Promise.all([
          cursosAPI.obtenerDashboard(idCurso),
          materiasAPI.listar({ size: 100 }),
          usuariosAPI.listar({ rol: "docente", size: 100 }),
        ]);
        if (cancelled) return;
        const c = dashboard?.curso || null;
        setCurso(c);
        registrarCursoReciente(c);
        setEstudiantes(dashboard?.estudiantes || []);
        setAsignaciones(dashboard?.asignaciones || []);
        setMateriasList(lm || []);
        setDocentes(ld || []);
        setMateriasEstructura(dashboard?.materias_estructura || []);
        await cargarEstudiantesDisponibles();

        if (c?.id_tutor) {
          try {
            const u = await usuariosAPI.obtener(c.id_tutor);
            if (!cancelled) setTutor(u);
          } catch {
            setTutor(null);
          }
        } else {
          setTutor(null);
        }

        if (!cancelled) {
          const periodos = dashboard?.periodizacion?.periodos || [];
          setPeriodosConfigurados(periodos);
        }
      } catch (e) {
        notify("error", e.message || "No se pudo cargar el curso");
      } finally {
        if (!cancelled) setCargando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idCurso, cargarEstudiantesDisponibles, registrarCursoReciente]);

  const agregarEstudianteAlCurso = async (idEstudiante) => {
    if (!idEstudiante) {
      notify("error", "Selecciona un estudiante");
      return;
    }

    const estudianteSeleccionado = estudiantesDisponibles.find(
      (est) => Number(est.id_estudiante) === Number(idEstudiante),
    );
    if (estudianteSeleccionado?.id_curso_actual) {
      notify("error", "Ese estudiante ya tiene un curso asignado");
      return;
    }

    try {
      await estudiantesAPI.actualizar(Number(idEstudiante), {
        id_curso_actual: idCurso,
      });
      const [estCurso] = await Promise.all([
        estudiantesAPI.buscar({ id_curso: idCurso, size: 100 }),
        cargarEstudiantesDisponibles(),
      ]);
      setEstudiantes(estCurso || []);
      notify("success", "Estudiante agregado al curso");
    } catch (e) {
      notify("error", e.message || "No se pudo agregar el estudiante");
    }
  };

  const abrirCrearEstudiante = () => {
    setNuevoEstudiante({
      nombre: "",
      apellido: "",
      cedula: "",
      fecha_nacimiento: "",
    });
    setModalCrearEstOpen(true);
  };

  const guardarNuevoEstudiante = async () => {
    if (!nuevoEstudiante.nombre.trim() || !nuevoEstudiante.apellido.trim() || !nuevoEstudiante.cedula.trim()) {
      notify("error", "Nombre, apellido y cédula son obligatorios");
      return;
    }

    try {
      await estudiantesAPI.crear({
        nombre: nuevoEstudiante.nombre.trim(),
        apellido: nuevoEstudiante.apellido.trim(),
        cedula: nuevoEstudiante.cedula.trim(),
        fecha_nacimiento: nuevoEstudiante.fecha_nacimiento || undefined,
        estado: "matriculado",
        id_curso_actual: idCurso,
      });
      setModalCrearEstOpen(false);
      const [estCurso] = await Promise.all([
        estudiantesAPI.buscar({ id_curso: idCurso, size: 100 }),
        cargarEstudiantesDisponibles(),
      ]);
      setEstudiantes(estCurso || []);
      notify("success", "Estudiante creado y agregado al curso");
    } catch (e) {
      notify("error", e.message || "No se pudo crear el estudiante");
    }
  };

  const quitarEstudianteDelCurso = async (estudiante) => {
    const ok = await requestConfirm(
      `¿Quitar a ${nombrePersona(estudiante)} de este curso?`,
    );
    if (!ok) return;
    try {
      await estudiantesAPI.actualizar(estudiante.id_estudiante, {
        id_curso_actual: null,
      });
      const [estCurso] = await Promise.all([
        estudiantesAPI.buscar({ id_curso: idCurso, size: 100 }),
        cargarEstudiantesDisponibles(),
      ]);
      setEstudiantes(estCurso || []);
      notify("success", "Estudiante retirado del curso");
    } catch (e) {
      notify("error", e.message || "No se pudo retirar el estudiante");
    }
  };

  const estudiantesFiltrados = useMemo(() => {
    const t = searchEst.trim().toLowerCase();
    if (!t) return estudiantes;
    return estudiantes.filter((e) =>
      nombrePersona(e).toLowerCase().includes(t),
    );
  }, [estudiantes, searchEst]);

  const estudiantesDisponiblesFiltrados = useMemo(() => {
    const t = searchAgregarEst.trim().toLowerCase();
    if (!t) return estudiantesDisponibles;
    return estudiantesDisponibles.filter((e) =>
      `${nombrePersona(e)} ${e.cedula || ""}`.toLowerCase().includes(t),
    );
  }, [estudiantesDisponibles, searchAgregarEst]);

  useEffect(() => {
    if (!estSel || tab !== "consulta") {
      setNotas([]);
      setAsistencias([]);
      setComportamientos([]);
      return;
    }
    const filtros = { id_estudiante: Number(estSel), size: 100 };
    (async () => {
      try {
        const [ln, la, lc] = await Promise.all([
          notasAPI.listar(filtros),
          asistenciaAPI.listar(filtros),
          comportamientoAPI.listar(filtros),
        ]);
        setNotas(ln || []);
        setAsistencias(la || []);
        setComportamientos(lc || []);
      } catch {
        /* lectura opcional */
      }
    })();
  }, [estSel, tab]);

  useEffect(() => {
    if (tab === "notas" || tab === "reportes") {
      refrescarCursoNotas();
    }
  }, [tab, idCurso, refrescarCursoNotas]);

  const titulo = curso
    ? `${curso.nombre} · ${curso.anio_lectivo}`
    : "Curso";

  const nombreEstudiante = (idEst) => {
    const e = estudiantes.find((es) => es.id_estudiante === idEst);
    return e ? nombrePersona(e) : `#${idEst}`;
  };

  const formatAverage = (value) => {
    if (value === null || value === undefined) return "—";
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "—";
  };

  const resumenNotasPorMateria = useMemo(() => {
    return asignaciones.map((asignacion) => {
      const insumosMateria = insumosPorCMD[String(asignacion.id_cmd)] || [];
      const idsInsumos = new Set(insumosMateria.map((insumo) => String(insumo.id_insumo)));
      const notasMateria = notasCurso.flatMap((registro) =>
        (registro.notas || [])
          .filter((nota) => idsInsumos.has(String(nota.id_insumo)))
          .map((nota) => ({ ...nota, id_estudiante: registro.id_estudiante })),
      );
      const promediosEstudiantes = notasCurso
        .map((registro) => {
          const notasEstudiante = (registro.notas || []).filter((nota) =>
            idsInsumos.has(String(nota.id_insumo)),
          );
          if (!notasEstudiante.length) return null;
          const notasPorInsumo = new Map(
            notasEstudiante.map((nota) => [String(nota.id_insumo), nota]),
          );
          return calcularPromedioInteractivo(
            insumosMateria,
            (insumo) => notasPorInsumo.get(String(insumo.id_insumo))?.calificacion
              ?? notasPorInsumo.get(String(insumo.id_insumo))?.valor,
          ).promedio;
        })
        .filter((promedio) => promedio !== null);
      const promedio = promediosEstudiantes.length
        ? promediosEstudiantes.reduce((acc, valor) => acc + valor, 0) / promediosEstudiantes.length
        : null;

      return {
        ...asignacion,
        insumosMateria,
        notasMateria,
        promedio,
      };
    });
  }, [asignaciones, insumosPorCMD, notasCurso]);

  const estudiantesOrdenados = useMemo(() => {
    return [...estudiantes].sort((a, b) => {
      const va = `${a.apellido || ""} ${a.nombre || ""}`.trim();
      const vb = `${b.apellido || ""} ${b.nombre || ""}`.trim();
      return va.localeCompare(vb, "es", { sensitivity: "base" });
    });
  }, [estudiantes]);

  const materiasOrdenadas = useMemo(() => {
    return [...asignaciones].sort((a, b) => {
      const va = String(a.materia?.nombre || a.id_materia || "");
      const vb = String(b.materia?.nombre || b.id_materia || "");
      return va.localeCompare(vb, "es", { sensitivity: "base" });
    });
  }, [asignaciones]);

  useEffect(() => {
    if (tab !== "reportes") return;
    if (materiasOrdenadas.length === 0) {
      if (materiaReporteSeleccionada) setMateriaReporteSeleccionada("");
      return;
    }

    const seleccionValida = materiasOrdenadas.some(
      (materia) => String(materia.id_cmd) === String(materiaReporteSeleccionada),
    );
    if (!seleccionValida) {
      setMateriaReporteSeleccionada(String(materiasOrdenadas[0].id_cmd));
    }
  }, [tab, materiasOrdenadas, materiaReporteSeleccionada]);

  const notasCursoPorEstudiante = useMemo(() => {
    return new Map(
      notasCurso.map((registro) => [String(registro.id_estudiante), registro.notas || []]),
    );
  }, [notasCurso]);

  const matrizNotasCurso = useMemo(() => {
    return estudiantesOrdenados.map((estudiante) => {
      const notasEstudiante = notasCursoPorEstudiante.get(String(estudiante.id_estudiante)) || [];
      const materias = materiasOrdenadas.map((asignacion) => {
        const insumosMateria = insumosPorCMD[String(asignacion.id_cmd)] || [];
        const idsInsumos = new Set(insumosMateria.map((insumo) => String(insumo.id_insumo)));
        const notasMateria = notasEstudiante.filter((nota) => idsInsumos.has(String(nota.id_insumo)));
        const notasPorInsumo = new Map(
          notasMateria.map((nota) => [String(nota.id_insumo), nota]),
        );
        const promedio = notasMateria.length
          ? calcularPromedioInteractivo(
              insumosMateria,
              (insumo) => notasPorInsumo.get(String(insumo.id_insumo))?.calificacion
                ?? notasPorInsumo.get(String(insumo.id_insumo))?.valor,
            ).promedio
          : null;

        return {
          id_cmd: asignacion.id_cmd,
          materia: asignacion.materia,
          promedio,
        };
      });

      return { estudiante, materias };
    });
  }, [estudiantesOrdenados, notasCursoPorEstudiante, materiasOrdenadas, insumosPorCMD]);

  const materiaDetalleActiva = useMemo(
    () =>
      resumenNotasPorMateria.find(
        (materia) => String(materia.id_cmd) === String(materiaDetalleSeleccionada),
      ) || null,
    [resumenNotasPorMateria, materiaDetalleSeleccionada],
  );

  const periodosDetalleMateria = useMemo(() => {
    const ordenados = [...periodosConfigurados].sort(
      (a, b) => Number(a.numero_periodo) - Number(b.numero_periodo),
    );
    if (ordenados.length > 0) return ordenados;
    return [];
  }, [periodosConfigurados]);

  const detalleMateriaPorEstudiante = useMemo(() => {
    if (!materiaDetalleActiva) return [];

    const insumosMateria = insumosPorCMD[String(materiaDetalleActiva.id_cmd)] || [];
    const insumosPorPeriodo = periodosDetalleMateria.map((periodo) => {
      const idPeriodo = periodo.id_periodo ?? periodo.numero_periodo;
      return {
        ...periodo,
        idsInsumos: new Set(
          insumosMateria
            .filter((insumo) => String(insumo.id_periodo) === String(idPeriodo))
            .map((insumo) => String(insumo.id_insumo)),
        ),
      };
    });

    return estudiantesOrdenados.map((estudiante) => {
      const notasEstudiante = notasCursoPorEstudiante.get(String(estudiante.id_estudiante)) || [];
      const periodos = insumosPorPeriodo.map((periodo) => {
        const notasPeriodo = notasEstudiante.filter((nota) =>
          periodo.idsInsumos.has(String(nota.id_insumo)),
        );
        const notasPorInsumo = new Map(
          notasPeriodo.map((nota) => [String(nota.id_insumo), nota]),
        );
        const promedio = notasPeriodo.length
          ? calcularPromedioInteractivo(
              insumosMateria.filter((insumo) => periodo.idsInsumos.has(String(insumo.id_insumo))),
              (insumo) => notasPorInsumo.get(String(insumo.id_insumo))?.calificacion
                ?? notasPorInsumo.get(String(insumo.id_insumo))?.valor,
            ).promedio
          : null;

        return {
          numero_periodo: periodo.numero_periodo,
          nombre_periodo: periodo.nombre_periodo,
          promedio,
        };
      });

      const periodosConDatos = periodos.filter((periodo) => periodo.promedio !== null);
      const suma = periodosConDatos.reduce((acc, periodo) => acc + Number(periodo.promedio), 0);
      const promedio = periodosConDatos.length ? suma / periodosConDatos.length : null;

      return {
        estudiante,
        periodos,
        suma,
        promedio,
      };
    });
  }, [estudiantesOrdenados, materiaDetalleActiva, notasCursoPorEstudiante, insumosPorCMD, periodosDetalleMateria]);

  const detalleNotasEstudiante = useMemo(() => {
    if (!estSel) return [];

    return asignaciones.map((asignacion) => {
      const insumosMateria = insumosPorCMD[String(asignacion.id_cmd)] || [];
      const idsInsumos = new Set(insumosMateria.map((insumo) => String(insumo.id_insumo)));
      const notasMateria = notas.filter((nota) => idsInsumos.has(String(nota.id_insumo)));
      const notasPorInsumo = new Map(
        notasMateria.map((nota) => [String(nota.id_insumo), nota]),
      );
      const promedio = notasMateria.length
        ? calcularPromedioInteractivo(
            insumosMateria,
            (insumo) => notasPorInsumo.get(String(insumo.id_insumo))?.calificacion
              ?? notasPorInsumo.get(String(insumo.id_insumo))?.valor,
          ).promedio
        : null;

      return {
        ...asignacion,
        insumosMateria,
        notasMateria,
        promedio,
      };
    });
  }, [asignaciones, estSel, insumosPorCMD, notas]);

  const notasCursoPorEstudianteReporte = useMemo(
    () => Object.fromEntries(notasCurso.map((registro) => [String(registro.id_estudiante), registro.notas || []])),
    [notasCurso],
  );

  const materiaReporteActiva = useMemo(
    () =>
      materiasOrdenadas.find((materia) => String(materia.id_cmd) === String(materiaReporteSeleccionada)) ||
      null,
    [materiasOrdenadas, materiaReporteSeleccionada],
  );

  const insumosMateriaReporte = useMemo(() => {
    if (!materiaReporteActiva) return [];
    return insumosPorCMD[String(materiaReporteActiva.id_cmd)] || [];
  }, [insumosPorCMD, materiaReporteActiva]);

  const guardarTutor = async () => {
    if (!nuevoTutor) {
      notify("error", "Selecciona un docente");
      return;
    }
    try {
      await cursosAPI.actualizar(idCurso, {
        id_tutor: Number(nuevoTutor),
      });
      const u = docentes.find((d) => d.id_usuario === Number(nuevoTutor));
      setTutor(u || null);
      setTutorModalOpen(false);
      setNuevoTutor("");
      notify("success", "Tutor actualizado");
    } catch (e) {
      notify("error", e.message || "No se pudo actualizar el tutor");
    }
  };

  const guardarAsignacion = async () => {
    if (!nuevaAsignacion.id_materia || !nuevaAsignacion.id_docente) {
      notify("error", "Selecciona materia y docente");
      return;
    }
    try {
      const asignacionExistente = asignaciones.find(
        (asignacion) => Number(asignacion.id_materia) === Number(nuevaAsignacion.id_materia),
      );
      const datos = {
        id_curso: idCurso,
        id_materia: Number(nuevaAsignacion.id_materia),
        id_docente: Number(nuevaAsignacion.id_docente),
      };
      if (asignacionExistente) {
        await asignacionesAPI.actualizar(asignacionExistente.id_cmd, {
          id_docente: datos.id_docente,
        });
      } else {
        await asignacionesAPI.crear(datos);
      }
      setAsignacionModalOpen(false);
      setNuevaAsignacion({ id_materia: "", id_docente: "" });
      const [asig, lm, ld] = await Promise.all([
        asignacionesAPI.listar({ id_curso: idCurso, size: 100 }),
        materiasAPI.listar({ size: 100 }),
        usuariosAPI.listar({ rol: "docente", size: 100 }),
      ]);
      setAsignaciones(asig || []);
      setMateriasList(lm || []);
      setDocentes(ld || []);
      notify("success", asignacionExistente ? "Docente actualizado" : "Asignación creada");
    } catch (e) {
      notify("error", e.message || "No se pudo crear la asignación");
    }
  };

  useEffect(() => {
    cargarInsumosDelCurso(asignaciones);
  }, [asignaciones, cargarInsumosDelCurso]);

  const abrirAsignacionDocente = (idMateria, idDocente = "") => {
    setNuevaAsignacion({
      id_materia: String(idMateria),
      id_docente: idDocente ? String(idDocente) : "",
    });
    setAsignacionModalOpen(true);
  };

  const eliminarAsignacion = async (asignacion) => {
    const ok = await requestConfirm(
      `¿Eliminar la asignación de ${asignacion.materia?.nombre || asignacion.id_materia}?`,
    );
    if (!ok) return;
    try {
      await asignacionesAPI.eliminar(asignacion.id_cmd);
      const [asig, lm, ld] = await Promise.all([
        asignacionesAPI.listar({ id_curso: idCurso, size: 100 }),
        materiasAPI.listar({ size: 100 }),
        usuariosAPI.listar({ rol: "docente", size: 100 }),
      ]);
      setAsignaciones(asig || []);
      setMateriasList(lm || []);
      setDocentes(ld || []);
      notify("success", "Asignación eliminada");
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar");
    }
  };

  return (
    <AdminLayout
      title={cargando ? "Cargando curso…" : titulo}
      subtitle="Vista central del curso: personal, estudiantes, notas y consultas."
    >
      <div className="admin-hub-toolbar">
        <button
          type="button"
          className="btn-secondary btn-back-link"
          onClick={() => navigate("/admin/cursos")}
        >
          <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
          Volver a cursos
        </button>
        <div className="admin-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`admin-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {cargando && (
        <>
          <div className="cards-grid dashboard-summary-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="stat-card">
                <p className="stat-label">Cargando</p>
                <h3 className="stat-value">...</h3>
                <p className="stat-sub">Preparando la ficha del curso</p>
              </div>
            ))}
          </div>
          <div className="empty-state" style={{ marginTop: 16 }}>
            <h3>Cargando información del curso</h3>
            <p>Se están preparando estudiantes, materias, docentes y consultas del curso.</p>
          </div>
        </>
      )}

      {!cargando && tab === "resumen" && (
        <div className="course-hub-summary-block">
          <div className="course-hub-summary-head">
            <p>Un vistazo rápido a los datos clave antes de entrar a gestionar.</p>
          </div>
          <div className="cards-grid dashboard-summary-grid course-hub-summary-grid">
          <div className="stat-card accent course-hub-summary-card course-hub-summary-card-main">
            <p className="stat-label">Estudiantes</p>
            <h3 className="stat-value">{estudiantes.length}</h3>
            <p className="stat-sub">Matriculados en este curso</p>
          </div>
          <div className="stat-card course-hub-summary-card">
            <p className="stat-label">Materias asignadas</p>
            <h3 className="stat-value">{asignaciones.length}</h3>
            <p className="stat-sub">Docente por materia</p>
          </div>
          <div className="stat-card course-hub-summary-card">
            <p className="stat-label">Estructura académica</p>
            <h3 className="stat-value" style={{ fontSize: "1.1rem" }}>
              {curso?.estructura_academica?.nombre || "Sin estructura"}
            </h3>
            <p className="stat-sub">
              {curso?.estructura_academica?.nivel ||
                "Asocia una estructura académica al curso"}
            </p>
          </div>
          <div className="stat-card course-hub-summary-card course-hub-summary-card-tutor">
            <p className="stat-label">Tutor a cargo</p>
            <h3 className="stat-value" style={{ fontSize: "1.1rem" }}>
              {tutor ? nombrePersona(tutor) : "Sin asignar"}
            </h3>
            <p className="stat-sub">
              {tutor
                ? tutor.correo
                : "Asigne un tutor para este curso"}
            </p>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn-view btn-inline-icon"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                onClick={() => setTutorModalOpen(true)}
              >
                <Link2 size={12} style={{ verticalAlign: "middle", marginRight: 2 }} />
                {tutor ? "Cambiar" : "Asignar"}
              </button>
              {tutor && (
                <button
                  type="button"
                  className="btn-danger btn-inline-icon"
                  style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                  onClick={async () => {
                    const ok = await requestConfirm("¿Quitar al tutor de este curso?");
                    if (!ok) return;
                    try {
                      await cursosAPI.actualizar(idCurso, { id_tutor: null });
                      setTutor(null);
                      notify("success", "Tutor quitado del curso");
                    } catch (e) {
                      notify("error", e.message || "No se pudo quitar el tutor");
                    }
                  }}
                >
                  <Link2Off size={12} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  Quitar
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {!cargando && tab === "resumen" && (
        <div className="dashboard-grid dashboard-grid-2 admin-action-grid admin-action-grid-4" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="admin-action-card"
            onClick={() => setTab("estudiantes")}
          >
            <span className="admin-action-title">
              <UserPlus size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Gestionar estudiantes
            </span>
            <span className="admin-action-sub">Revise y vincule estudiantes del curso</span>
          </button>
          <button
            type="button"
            className="admin-action-card"
            onClick={() => setTab("materias")}
          >
            <span className="admin-action-title">
              <BookOpen size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Asignar docentes
            </span>
            <span className="admin-action-sub">Materias y profesores del curso</span>
          </button>
          <button
            type="button"
            className="admin-action-card"
            onClick={() => setTab("notas")}
          >
            <span className="admin-action-title">
              <Clipboard size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Ver notas del curso
            </span>
            <span className="admin-action-sub">Promedios y calificaciones</span>
          </button>
          <button
            type="button"
            className="admin-action-card"
            onClick={() => setTab("consulta")}
          >
            <span className="admin-action-title">
              <Calendar size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Consulta académica
            </span>
            <span className="admin-action-sub">Notas, asistencia y promedios</span>
          </button>
        </div>
      )}

      {!cargando && tab === "estudiantes" && (
        <div className="table-container">
          <div className="course-hub-add-students">
            <div className="docentes-header course-hub-add-students-header">
              <div className="course-hub-add-title-block">
                <div>
                  <h3>Agregar estudiantes al curso</h3>
                  <p>Importa por Excel o crea uno manualmente y asígnalo directo al curso.</p>
                </div>
                <div className="course-hub-add-header-actions">
                  <button type="button" className="btn-view btn-inline-icon course-hub-add-header-btn" onClick={() => setModalImportOpen(true)}>
                    <Upload size={14} />
                    Importar Excel
                  </button>
                  <button type="button" className="btn-add-docente btn-inline-icon course-hub-add-header-btn" onClick={abrirCrearEstudiante}>
                    <UserPlus size={14} />
                    Agregar estudiante
                  </button>
                </div>
              </div>
              <input
                className="table-search course-hub-add-search"
                placeholder="Buscar por nombre o cédula…"
                value={searchAgregarEst}
                onChange={(e) => setSearchAgregarEst(e.target.value)}
              />
            </div>
            <div className="course-hub-add-list">
              {estudiantesDisponiblesFiltrados.length > 0 ? (
                estudiantesDisponiblesFiltrados.map((est) => (
                  <div key={est.id_estudiante} className="course-hub-add-item">
                    <div>
                    <strong>{nombrePersona(est)}</strong>
                      <span>{est.cedula || "Sin cédula"}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-success btn-inline-icon course-hub-add-btn"
                      onClick={() => agregarEstudianteAlCurso(est.id_estudiante)}
                    >
                      <UserPlus size={14} />
                      Añadir
                    </button>
                  </div>
                ))
              ) : (
                <div className="course-hub-add-empty">
                  No hay estudiantes disponibles para agregar.
                </div>
              )}
            </div>
          </div>

          <div className="docentes-header panel-header-compact">
            <div>
              <h3 style={{ margin: 0 }}>Estudiantes del curso</h3>
              <p className="panel-sub">Busca dentro de los estudiantes ya vinculados.</p>
            </div>
            <div className="header-actions">
              <input
                className="table-search"
                placeholder="Buscar estudiante…"
                value={searchEst}
                onChange={(e) => setSearchEst(e.target.value)}
              />
            </div>
          </div>

          <table className="materias-base-table course-hub-students-table">
            <colgroup>
              <col style={{ width: "34%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cédula</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesFiltrados.map((e) => (
                <tr key={e.id_estudiante}>
                  <td>
                    {nombrePersona(e)}
                  </td>
                  <td>{e.cedula || "—"}</td>
                  <td>{e.estado || "—"}</td>
                  <td className="plantillas-academicas-actions">
                    <div className="plantillas-academicas-actions-row materias-base-actions course-hub-actions-row">
                      <button
                        type="button"
                        className="btn-view btn-inline-icon"
                        onClick={() => {
                          setEstSel(String(e.id_estudiante));
                          setTab("consulta");
                        }}
                      >
                        <Clipboard size={14} />
                        Ver notas
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-inline-icon"
                        onClick={() => quitarEstudianteDelCurso(e)}
                      >
                        <Trash2 size={14} />
                        Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {estudiantesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    No hay estudiantes en este curso
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && tab === "materias" && (
        <div className="table-container">
          <div className="docentes-header">
            <div>
              <h3>Materias y docentes</h3>
              <p className="panel-sub">
                Asigna, cambia o retira el docente responsable de cada materia del curso.
              </p>
            </div>
          </div>
          <table className="plantillas-academicas-table course-hub-materias-table">
            <colgroup>
                <col style={{ width: "32%" }} />
                <col style={{ width: "40%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Materia</th>
                <th>Docente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {materiasEstructura.map((item) => {
                const asignacion = asignaciones.find(
                  (a) => a.id_materia === item.id_materia,
                );
                return (
                  <tr key={item.id_estructura_materia}>
                    <td>{item.materia?.nombre || item.id_materia}</td>
                    <td>
                      {asignacion?.docente
                        ? nombrePersona(asignacion.docente)
                        : asignacion?.id_docente || "Sin asignar"}
                    </td>
                    <td>
                      <div className="plantillas-academicas-actions-row course-hub-actions-row">
                        <button
                          type="button"
                          className={asignacion ? "btn-view btn-inline-icon" : "btn-success btn-inline-icon"}
                          onClick={() =>
                            abrirAsignacionDocente(
                              item.id_materia,
                              asignacion?.id_docente || "",
                            )
                          }
                        >
                          {asignacion ? <Pencil size={12} /> : <UserPlus size={12} />}
                          {asignacion ? "Cambiar" : "Asignar"}
                        </button>
                        {asignacion ? (
                          <button
                            type="button"
                            className="btn-danger btn-inline-icon"
                            onClick={() => eliminarAsignacion(asignacion)}
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {materiasEstructura.length === 0 && asignaciones.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center" }}>
                    Aún no hay materias heredadas ni asignadas para este curso
                  </td>
                </tr>
              )}
              {materiasEstructura.length === 0 &&
                asignaciones.map((a) => (
                  <tr key={a.id_cmd}>
                    <td>{a.materia?.nombre || a.id_materia}</td>
                    <td>
                      {a.docente
                        ? nombrePersona(a.docente)
                        : a.id_docente}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-view"
                        style={{ fontSize: "0.78rem", padding: "0.25rem 0.55rem" }}
                        onClick={() => abrirAsignacionDocente(a.id_materia, a.id_docente)}
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", marginLeft: 8 }}
                        onClick={() => eliminarAsignacion(a)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && tab === "notas" && (
        <div className="table-container">
          <div className="docentes-header">
            <div>
              <h3>Notas del curso</h3>
              <p className="panel-sub">
                Revisa los promedios por materia y consulta el detalle de cada estudiante.
              </p>
            </div>
            <span className="panel-sub">
              {estudiantes.length} estudiante(s) ·{" "}
              {asignaciones.length} materia(s)
            </span>
          </div>

          <div className="cards-grid course-hub-summary-grid course-hub-summary-grid-compact">
            {resumenNotasPorMateria.map((a) => (
              <button
                key={a.id_cmd}
                type="button"
                className={`stat-card course-hub-materia-summary-card course-hub-materia-summary-card-compact course-hub-materia-summary-card-button${String(materiaDetalleSeleccionada) === String(a.id_cmd) ? " is-active" : ""}`}
                onClick={() =>
                  setMateriaDetalleSeleccionada((prev) =>
                    String(prev) === String(a.id_cmd) ? "" : String(a.id_cmd),
                  )
                }
              >
                <p className="stat-label">{a.materia?.nombre || a.id_materia}</p>
                <h3 className="stat-value">{formatAverage(a.promedio)}</h3>
                <p className="stat-sub">
                  {a.insumosMateria.length} insumo(s) · {a.notasMateria.length} nota(s)
                </p>
              </button>
            ))}
          </div>

          <div className="table-container" style={{ marginTop: 16 }}>
            {materiaDetalleActiva ? (
              <>
                <div className="docentes-header" style={{ marginBottom: 12 }}>
                  <div>
                    <h4 style={{ marginBottom: 4 }}>
                      Detalle de {materiaDetalleActiva.materia?.nombre || materiaDetalleActiva.id_materia}
                    </h4>
                    <span className="panel-sub">
                      Periodos configurados, suma y promedio por estudiante
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setMateriaDetalleSeleccionada("")}
                  >
                    Volver al resumen
                  </button>
                </div>

                <table className="materias-base-table course-hub-notas-matrix course-hub-notas-detail-table">
                  <colgroup>
                    <col style={{ width: "40%" }} />
                    {periodosDetalleMateria.map((periodo) => (
                      <col key={periodo.numero_periodo} style={{ width: "12%" }} />
                    ))}
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      {periodosDetalleMateria.map((periodo) => (
                        <th key={periodo.numero_periodo}>
                            {periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`}
                          </th>
                        ))}
                        <th>Suma</th>
                        <th>Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleMateriaPorEstudiante.map(({ estudiante, periodos, suma, promedio }) => {
                        const tieneDatos = periodos.some((periodo) => periodo.promedio !== null);
                        return (
                          <tr key={estudiante.id_estudiante}>
                            <td>
                              <button
                                type="button"
                                className="admin-link-btn"
                                onClick={() => {
                                  setEstSel(String(estudiante.id_estudiante));
                                  setTab("consulta");
                                }}
                              >
                                {nombreEstudiante(estudiante.id_estudiante)}
                              </button>
                            </td>
                            {periodos.map((periodo) => (
                              <td key={periodo.numero_periodo}>
                                {formatAverage(periodo.promedio)}
                              </td>
                            ))}
                            <td>{tieneDatos ? formatAverage(suma) : "—"}</td>
                            <td>{formatAverage(promedio)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </>
            ) : matrizNotasCurso.length > 0 ? (
              <>
                <h4 style={{ marginTop: 0 }}>Promedio por estudiante y materia</h4>
                <div className="course-hub-matrix-scroll">
                  <table
                    className="materias-base-table course-hub-notas-matrix"
                    style={{ minWidth: `${280 + materiasOrdenadas.length * 120}px` }}
                  >
                    <colgroup>
                      <col style={{ width: "280px" }} />
                      {materiasOrdenadas.map((materia) => (
                        <col key={materia.id_cmd} style={{ width: "120px" }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        {materiasOrdenadas.map((materia) => (
                          <th key={materia.id_cmd}>
                            {materia.materia?.nombre || materia.id_materia}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrizNotasCurso.map(({ estudiante, materias }) => (
                        <tr key={estudiante.id_estudiante}>
                          <td>
                            <button
                              type="button"
                              className="admin-link-btn"
                              onClick={() => {
                                setEstSel(String(estudiante.id_estudiante));
                                setTab("consulta");
                              }}
                            >
                              {nombreEstudiante(estudiante.id_estudiante)}
                            </button>
                          </td>
                          {materias.map((materia) => (
                            <td key={materia.id_cmd}>{formatAverage(materia.promedio)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ marginTop: 8 }}>
                <p>No hay notas registradas para este curso.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!cargando && tab === "reportes" && (
        <>
          <div className="course-hub-reportes-intro">
            <div className="course-hub-reportes-intro-icon" aria-hidden="true">
              <FileText size={22} />
            </div>
            <div>
              <h3>Reportes del curso</h3>
              <p>
                Selecciona una materia del curso para exportar y previsualizar sus reportes en formato académico.
              </p>
            </div>
          </div>

          <div className="admin-consulta-filters" style={{ marginBottom: 16 }}>
            <CustomSelect
              value={materiaReporteSeleccionada}
              onChange={setMateriaReporteSeleccionada}
              placeholder="Materia"
              searchable
              className="custom-select-white"
              options={materiasOrdenadas.map((a) => ({
                value: String(a.id_cmd),
                label: a.materia?.nombre || a.id_materia,
              }))}
            />
          </div>

          {materiaReporteActiva ? (
            <TabReportes
              activeTab="reportes"
              estudiantesCurso={estudiantesOrdenados}
              materiasCurso={materiasOrdenadas}
              periodos={periodosConfigurados}
              insumosMateria={insumosMateriaReporte}
              notasPorEstudiante={notasCursoPorEstudianteReporte}
              materiaSeleccionada={materiaReporteActiva}
              cursoDetalle={curso}
              compactPreview
            />
          ) : (
            <div className="empty-state">
              <p>No hay materias asignadas para generar reportes.</p>
            </div>
          )}
        </>
      )}

      {!cargando && tab === "consulta" && (
        <>
          <div className="course-hub-reportes-intro course-hub-consulta-intro">
            <div className="course-hub-reportes-intro-icon" aria-hidden="true">
              <Calendar size={22} />
            </div>
            <div>
              <h3>Consulta académica <span>(solo lectura)</span></h3>
              <p>
                Elige un estudiante del curso para revisar notas, asistencia, comportamiento y promedios.
              </p>
            </div>
          </div>

          <div className="admin-consulta-filters">
            <CustomSelect
              value={estSel}
              onChange={setEstSel}
              placeholder="Estudiante"
              searchable
              className="custom-select-white"
              options={estudiantes.map((e) => ({
                value: String(e.id_estudiante),
                label: `${e.apellido} ${e.nombre}`,
              }))}
            />
          </div>

          <div className="admin-subtabs">
            {[
              { id: "notas", label: "Notas" },
              { id: "asistencia", label: "Asistencia" },
              { id: "comportamiento", label: "Comportamiento" },
              { id: "promedios", label: "Promedios" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                className={`admin-tab admin-tab-sm${subConsulta === s.id ? " active" : ""}`}
                onClick={() => setSubConsulta(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {subConsulta === "notas" && (
            <div className="table-container">
              {!estSel ? (
                <div className="empty-state">
                  <p>Seleccione un estudiante para ver el detalle por materia.</p>
                </div>
              ) : (
                <div className="cards-grid course-hub-summary-grid">
                  {detalleNotasEstudiante.map((asignacion) => (
                    <div key={asignacion.id_cmd} className="table-container course-hub-notas-materia-card">
                      <div className="docentes-header" style={{ marginBottom: 12 }}>
                        <div>
                          <h4 style={{ marginBottom: 4 }}>
                            {asignacion.materia?.nombre || asignacion.id_materia}
                          </h4>
                          <span className="panel-sub">
                            {asignacion.insumosMateria.length} insumo(s) · promedio {formatAverage(asignacion.promedio)}
                          </span>
                        </div>
                      </div>

                      <table className="materias-base-table course-hub-consulta-notas-table">
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th>Ponderación</th>
                            <th>Calificación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asignacion.insumosMateria.length > 0 ? (
                            asignacion.insumosMateria.map((insumo) => {
                              const nota = notas.find(
                                (n) => String(n.id_insumo) === String(insumo.id_insumo),
                              );
                              return (
                                <tr key={insumo.id_insumo}>
                                  <td>{insumo.nombre}</td>
                                  <td>{insumo.ponderacion ?? "—"}</td>
                                  <td>{nota ? (nota.calificacion ?? nota.valor ?? "—") : "—"}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} style={{ textAlign: "center" }}>
                                Sin insumos configurados para esta materia
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subConsulta === "asistencia" && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencias.map((a) => (
                    <tr key={a.id_asistencia}>
                      <td>{a.fecha}</td>
                      <td>{a.estado}</td>
                    </tr>
                  ))}
                  {estSel && asistencias.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center" }}>
                        Sin registros de asistencia
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {subConsulta === "comportamiento" && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Valor</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {comportamientos.map((c) => (
                    <tr key={c.id_comportamiento}>
                      <td>{c.periodo || c.fecha || "—"}</td>
                      <td>{c.valor || "—"}</td>
                      <td>{c.observaciones || c.descripcion || "—"}</td>
                    </tr>
                  ))}
                  {estSel && comportamientos.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center" }}>
                        Sin registros de comportamiento
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {subConsulta === "promedios" && (
            <div className="table-container">
              {!estSel ? (
                <div className="empty-state">
                  <p>Seleccione un estudiante para consultar sus promedios por materia.</p>
                </div>
              ) : (
                <table className="course-hub-promedios-table">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      {periodosConfigurados.map((periodo) => (
                        <th key={periodo.id_periodo}>{periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`}</th>
                      ))}
                      <th>Suma de periodos</th>
                      <th>Promedio general</th>
                    </tr>
                  </thead>
                  <tbody>
                  {detalleNotasEstudiante.map((asignacion) => {
                    const notasPorInsumo = new Map(
                      asignacion.notasMateria.map((nota) => [String(nota.id_insumo), nota]),
                    );
                    const promedios = periodosConfigurados.map((periodo) =>
                      calcularPromedioInteractivo(
                        asignacion.insumosMateria.filter(
                          (insumo) => String(insumo.id_periodo) === String(periodo.id_periodo),
                        ),
                        (insumo) => notasPorInsumo.get(String(insumo.id_insumo))?.calificacion
                          ?? notasPorInsumo.get(String(insumo.id_insumo))?.valor,
                      ).promedio,
                    );
                    const disponibles = promedios.filter((promedio) => promedio !== null);
                    const suma = disponibles.reduce((total, promedio) => total + promedio, 0);
                    const promedioGeneral = disponibles.length ? suma / disponibles.length : null;
                    return (
                      <React.Fragment key={asignacion.id_cmd}>
                        <tr className="course-hub-promedios-row">
                          <td>{asignacion.materia?.nombre || asignacion.id_materia}</td>
                          {promedios.map((promedio, index) => <td key={index}>{promedio === null ? "—" : promedio.toFixed(2)}</td>)}
                          <td>{disponibles.length ? suma.toFixed(2) : "—"}</td>
                          <td>{promedioGeneral === null ? "—" : promedioGeneral.toFixed(2)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
      {tutorModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content course-hub-tutor-modal">
            <h3>{tutor ? "Cambiar tutor" : "Asignar tutor"}</h3>
            <CustomSelect
              value={nuevoTutor}
              onChange={setNuevoTutor}
              options={[
                { value: "", label: "Seleccionar docente" },
                ...docentes.map((d) => ({
                  value: String(d.id_usuario),
                  label: nombrePersona(d),
                })),
              ]}
              placeholder="Seleccionar docente"
              className="custom-select-white"
              searchable
              searchPlaceholder="Buscar docente..."
              menuMaxHeight={220}
            />
            <div className="modal-buttons">
              <button
                type="button"
                className="btn-view btn-inline-icon"
                onClick={() => {
                  setTutorModalOpen(false);
                  setNuevoTutor("");
                }}
              >
                <X size={14} />
                Cancelar
              </button>
              <button type="button" className="btn-success btn-inline-icon" onClick={guardarTutor}>
                <Save size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      {asignacionModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content course-hub-assignment-modal">
            <h3>{asignaciones.some((a) => Number(a.id_materia) === Number(nuevaAsignacion.id_materia)) ? "Cambiar docente" : "Asignar docente"}</h3>
            <div className="course-hub-assignment-materia">
              <span>Materia</span>
              <strong>
                {materiasEstructura.find((m) => String(m.id_materia) === String(nuevaAsignacion.id_materia))?.materia?.nombre ||
                  materiasList.find((m) => String(m.id_materia) === String(nuevaAsignacion.id_materia))?.nombre ||
                  "Materia seleccionada"}
              </strong>
            </div>
            <CustomSelect
              value={nuevaAsignacion.id_docente}
              onChange={(value) =>
                setNuevaAsignacion({
                  ...nuevaAsignacion,
                  id_docente: value,
                })
              }
              options={[
                { value: "", label: "Seleccionar docente" },
                ...docentes.map((d) => ({
                  value: String(d.id_usuario),
                  label: nombrePersona(d),
                })),
              ]}
              placeholder="Seleccionar docente"
              className="custom-select-white"
              searchable
              searchPlaceholder="Buscar docente..."
              menuMaxHeight={220}
            />
            <div className="modal-buttons">
              <button
                type="button"
                className="btn-view btn-inline-icon"
                onClick={() => {
                  setAsignacionModalOpen(false);
                  setNuevaAsignacion({ id_materia: "", id_docente: "" });
                }}
              >
                <X size={14} />
                Cancelar
              </button>
              <button type="button" className="btn-success btn-inline-icon" onClick={guardarAsignacion}>
                <Save size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportarEstudiantesModal
        open={modalImportOpen}
        onClose={() => setModalImportOpen(false)}
        onSaved={async () => {
          const [estCurso] = await Promise.all([
            estudiantesAPI.buscar({ id_curso: idCurso, size: 100 }),
            cargarEstudiantesDisponibles(),
          ]);
          setEstudiantes(estCurso || []);
        }}
        cursos={[]}
        cursoFijoId={idCurso}
        mostrarCurso={false}
        titulo="Importar estudiantes al curso"
        subtitulo="Selecciona un archivo Excel. Todos los estudiantes se guardarán directamente en este curso."
      />

      {modalCrearEstOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight">
            <button type="button" className="admin-modal-close-btn" onClick={() => setModalCrearEstOpen(false)} aria-label="Cerrar modal">
              <X size={14} />
            </button>
            <h3 className="admin-modal-title admin-modal-title-center">Agregar estudiante al curso</h3>
            <p className="panel-sub" style={{ marginTop: 0 }}>
              El estudiante se creará y quedará asignado a este curso.
            </p>
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoEstudiante.nombre}
              onChange={(e) => setNuevoEstudiante((prev) => ({ ...prev, nombre: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Apellido"
              value={nuevoEstudiante.apellido}
              onChange={(e) => setNuevoEstudiante((prev) => ({ ...prev, apellido: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Cédula"
              value={nuevoEstudiante.cedula}
              onChange={(e) => setNuevoEstudiante((prev) => ({ ...prev, cedula: e.target.value }))}
            />
            <input
              type="date"
              value={nuevoEstudiante.fecha_nacimiento}
              onChange={(e) => setNuevoEstudiante((prev) => ({ ...prev, fecha_nacimiento: e.target.value }))}
            />
            <div className="modal-buttons">
              <button type="button" className="btn-neutral btn-inline-icon" onClick={() => setModalCrearEstOpen(false)}>
                <X size={14} />
                Cancelar
              </button>
              <button type="button" className="btn-success btn-inline-icon" onClick={guardarNuevoEstudiante}>
                <Save size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      <AnalisisAcademico
        idCurso={idCurso}
        nombreCurso={curso?.nombre}
      />
    </AdminLayout>
  );
}

export default CursoHubAdmin;
