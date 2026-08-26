import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserPlus, BookOpen, Clipboard, Calendar, Link, Trash2, X, Save, Pencil } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import {
  cursosAPI,
  estudiantesAPI,
  asignacionesAPI,
  usuariosAPI,
  notasAPI,
  asistenciaAPI,
  comportamientoAPI,
  promediosAPI,
  materiasAPI,
} from "../../services/api";
import { notify, requestConfirm } from "../../components/notify";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "estudiantes", label: "Estudiantes" },
  { id: "materias", label: "Materias y docentes" },
  { id: "notas", label: "Notas" },
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

  const [notas, setNotas] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [comportamientos, setComportamientos] = useState([]);

  const [anioPromedio, setAnioPromedio] = useState("");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [modoPromedio, setModoPromedio] = useState("periodo");
  const [resultadoPromedio, setResultadoPromedio] = useState(null);
  const [periodosConfigurados, setPeriodosConfigurados] = useState([]);

  const [notasCurso, setNotasCurso] = useState([]);
  const [promediosCurso, setPromediosCurso] = useState([]);

  const [tutorModalOpen, setTutorModalOpen] = useState(false);
  const [nuevoTutor, setNuevoTutor] = useState("");

  const [asignacionModalOpen, setAsignacionModalOpen] = useState(false);
  const [nuevaAsignacion, setNuevaAsignacion] = useState({
    id_materia: "",
    id_docente: "",
  });

  const cargarEstudiantesDisponibles = useCallback(async () => {
    try {
      const lista = await estudiantesAPI.buscar({ estado: "matriculado", size: 100 });
      setEstudiantesDisponibles(
        (lista || []).filter((est) => est.id_curso_actual !== idCurso),
      );
    } catch {
      setEstudiantesDisponibles([]);
    }
  }, [idCurso]);

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
        setAnioPromedio(c?.anio_lectivo || "");
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
          setPeriodoSeleccionado(periodos[0]?.numero_periodo?.toString() || "");
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
  }, [idCurso, cargarEstudiantesDisponibles]);

  const agregarEstudianteAlCurso = async (idEstudiante) => {
    if (!idEstudiante) {
      notify("error", "Selecciona un estudiante");
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

  const quitarEstudianteDelCurso = async (estudiante) => {
    const ok = await requestConfirm(
      `¿Quitar a ${estudiante.nombre} ${estudiante.apellido} de este curso?`,
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
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(t),
    );
  }, [estudiantes, searchEst]);

  const estudiantesDisponiblesFiltrados = useMemo(() => {
    const t = searchAgregarEst.trim().toLowerCase();
    if (!t) return estudiantesDisponibles;
    return estudiantesDisponibles.filter((e) =>
      `${e.nombre} ${e.apellido} ${e.cedula || ""}`.toLowerCase().includes(t),
    );
  }, [estudiantesDisponibles, searchAgregarEst]);

  const estudianteActual = useMemo(
    () => estudiantes.find((e) => String(e.id_estudiante) === String(estSel)),
    [estSel, estudiantes],
  );

  useEffect(() => {
    if (!estSel || tab !== "consulta") {
      setNotas([]);
      setAsistencias([]);
      setComportamientos([]);
      setResultadoPromedio(null);
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

  const calcularPromedio = async () => {
    if (!estSel || !anioPromedio) {
      notify("error", "Seleccione estudiante y año lectivo");
      return;
    }
    try {
      if (modoPromedio === "periodo") {
        setResultadoPromedio(
          await promediosAPI.obtenerPeriodo(
            Number(estSel),
            idCurso,
            Number(periodoSeleccionado),
            anioPromedio,
          ),
        );
      } else {
        setResultadoPromedio(
          await promediosAPI.obtenerAcumulado(
            Number(estSel),
            idCurso,
            anioPromedio,
          ),
        );
      }
    } catch (e) {
      notify("error", e.message || "No se pudo calcular el promedio");
    }
  };

const cargarNotasCurso = useCallback(async () => {
    try {
      const estudianteIds = estudiantes.map((e) => e.id_estudiante);
      if (estudianteIds.length === 0) {
        setNotasCurso([]);
        setPromediosCurso([]);
        return;
      }
      const resultados = await Promise.all(
        estudianteIds.map(async (idEst) => {
          try {
            const notasEst = await notasAPI.listar({
              id_estudiante: idEst,
              size: 100,
            });
            return { id_estudiante: idEst, notas: notasEst || [] };
          } catch {
            return { id_estudiante: idEst, notas: [] };
          }
        }),
      );
      setNotasCurso(resultados);

      const promedios = resultados.map((r) => {
        if (r.notas.length === 0) return { id_estudiante: r.id_estudiante, promedio: null, insumos: 0 };
        const suma = r.notas.reduce((acc, n) => acc + (n.calificacion ?? n.valor ?? 0), 0);
        return {
          id_estudiante: r.id_estudiante,
          promedio: suma / r.notas.length,
          insumos: r.notas.length,
        };
      });
      setPromediosCurso(promedios);
    } catch (e) {
      notify("error", "No se pudieron cargar las notas del curso");
    }
  }, [estudiantes]);

  useEffect(() => {
    if (tab === "notas") {
      cargarNotasCurso();
    }
  }, [tab, idCurso, cargarNotasCurso]);

  const titulo = curso
    ? `${curso.nombre} · ${curso.anio_lectivo}`
    : "Curso";

  const nombreEstudiante = (idEst) => {
    const e = estudiantes.find((es) => es.id_estudiante === idEst);
    return e ? `${e.nombre} ${e.apellido}` : `#${idEst}`;
  };

  const nombreInsumo = (idInsumo) => {
    return `Insumo #${idInsumo}`;
  };

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
      await asignacionesAPI.crear({
        id_curso: idCurso,
        id_materia: Number(nuevaAsignacion.id_materia),
        id_docente: Number(nuevaAsignacion.id_docente),
      });
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
      notify("success", "Asignación creada");
    } catch (e) {
      notify("error", e.message || "No se pudo crear la asignación");
    }
  };

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
        <div className="cards-grid dashboard-summary-grid">
          <div className="stat-card accent">
            <p className="stat-label">Estudiantes</p>
            <h3 className="stat-value">{estudiantes.length}</h3>
            <p className="stat-sub">Matriculados en este curso</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Materias asignadas</p>
            <h3 className="stat-value">{asignaciones.length}</h3>
            <p className="stat-sub">Docente por materia</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Estructura académica</p>
            <h3 className="stat-value" style={{ fontSize: "1.1rem" }}>
              {curso?.estructura_academica?.nombre || "Sin estructura"}
            </h3>
            <p className="stat-sub">
              {curso?.estructura_academica?.nivel ||
                "Asocia una estructura académica al curso"}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Tutor a cargo</p>
            <h3 className="stat-value" style={{ fontSize: "1.1rem" }}>
              {tutor ? `${tutor.nombre} ${tutor.apellido}` : "Sin asignar"}
            </h3>
            <p className="stat-sub">
              {tutor
                ? tutor.correo
                : "Asigne un tutor para este curso"}
            </p>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn-view"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                onClick={() => setTutorModalOpen(true)}
              >
                <Link size={12} style={{ verticalAlign: "middle", marginRight: 2 }} />
                {tutor ? "Cambiar tutor" : "Asignar tutor"}
              </button>
              {tutor && (
                <button
                  type="button"
                  className="btn-danger"
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
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!cargando && tab === "resumen" && (
        <div className="dashboard-grid dashboard-grid-2 admin-action-grid" style={{ marginTop: 16 }}>
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
            onClick={() => setAsignacionModalOpen(true)}
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
          <div className="docentes-header">
            <div className="header-actions">
              <input
                className="table-search"
                placeholder="Buscar estudiante…"
                value={searchEst}
                onChange={(e) => setSearchEst(e.target.value)}
              />
            </div>
          </div>

          <div className="course-hub-add-students">
            <div className="docentes-header course-hub-add-students-header">
              <div>
                <h3>Agregar estudiantes al curso</h3>
                <p>Busca un estudiante y agrégalo directo desde la lista.</p>
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
                      <strong>{est.nombre} {est.apellido}</strong>
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

          <table>
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
                    {e.nombre} {e.apellido}
                  </td>
                  <td>{e.cedula || "—"}</td>
                  <td>{e.estado || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-view"
                      onClick={() => {
                        setEstSel(String(e.id_estudiante));
                        setTab("consulta");
                      }}
                    >
                      <Clipboard size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                      Ver notas
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      style={{ marginLeft: 8 }}
                      onClick={() => quitarEstudianteDelCurso(e)}
                    >
                      <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                      Quitar
                    </button>
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
            <h3>Materias y docentes</h3>
          </div>
          <table className="plantillas-academicas-table course-hub-materias-table">
            <colgroup>
              <col style={{ width: "42%" }} />
              <col style={{ width: "30%" }} />
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
                        ? `${asignacion.docente.nombre} ${asignacion.docente.apellido}`
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
                        ? `${a.docente.nombre} ${a.docente.apellido}`
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
            <h3>Notas del curso</h3>
            <span className="panel-sub">
              {estudiantes.length} estudiante(s) ·{" "}
              {asignaciones.length} materia(s)
            </span>
          </div>

          {promediosCurso.length > 0 && (
            <div className="table-container" style={{ marginBottom: 16 }}>
              <h4>Promedio general del curso por materia</h4>
              <div className="cards-grid">
                {asignaciones.map((a) => {
                  const insumosMateria = notasCurso.flatMap(
                    (n) => n.notas.filter((x) => x.id_insumo === a.id_materia),
                  );
                  const promedioMateria =
                    insumosMateria.length > 0
                      ? (insumosMateria.reduce(
                          (acc, x) => acc + (x.calificacion ?? x.valor ?? 0),
                          0,
                        ) / insumosMateria.length).toFixed(2)
                      : "—";
                  return (
                    <div key={a.id_cmd} className="stat-card">
                      <p className="stat-label">{a.materia?.nombre || a.id_materia}</p>
                      <h3 className="stat-value">{promedioMateria}</h3>
                      <p className="stat-sub">
                        {insumosMateria.length} calificación(es)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Notas</th>
                <th>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {promediosCurso.map((p) => (
                <tr key={p.id_estudiante}>
                  <td>
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => {
                        setEstSel(String(p.id_estudiante));
                        setTab("consulta");
                      }}
                    >
                      {nombreEstudiante(p.id_estudiante)}
                    </button>
                  </td>
                  <td>{p.insumos} insumo(s)</td>
                  <td>
                    {p.promedio !== null && p.promedio !== undefined
                      ? Number(p.promedio).toFixed(2)
                      : "—"}
                  </td>
                </tr>
              ))}
              {promediosCurso.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center" }}>
                    No hay notas registradas para este curso
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && tab === "consulta" && (
        <>
          <div className="empty-state" style={{ marginBottom: 16 }}>
            <h3>Consulta (solo lectura)</h3>
            <p>
              Elija un estudiante del curso para revisar notas, asistencia,
              comportamiento y promedios.
            </p>
          </div>

          <div className="admin-consulta-filters">
            <select
              value={estSel}
              onChange={(e) => setEstSel(e.target.value)}
            >
              <option value="">Estudiante</option>
              {estudiantes.map((e) => (
                <option key={e.id_estudiante} value={e.id_estudiante}>
                  {e.nombre} {e.apellido}
                </option>
              ))}
            </select>
          </div>

          {estudianteActual && (
            <p className="panel-sub" style={{ marginBottom: 12 }}>
              {estudianteActual.nombre} {estudianteActual.apellido}
            </p>
          )}

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
              <table>
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Calificación</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id_nota}>
                      <td>{nombreInsumo(n.id_insumo)}</td>
                      <td>{n.calificacion ?? n.valor ?? "—"}</td>
                    </tr>
                  ))}
                  {!estSel && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center" }}>
                        Seleccione un estudiante
                      </td>
                    </tr>
                  )}
                  {estSel && notas.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center" }}>
                        Sin notas registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {comportamientos.map((c) => (
                    <tr key={c.id_comportamiento}>
                      <td>{c.fecha}</td>
                      <td>{c.observaciones || c.descripcion || "—"}</td>
                    </tr>
                  ))}
                  {estSel && comportamientos.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center" }}>
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
              <div className="admin-consulta-filters">
                <input
                  placeholder="Año lectivo"
                  value={anioPromedio}
                  onChange={(e) => setAnioPromedio(e.target.value)}
                />
                <select
                  value={modoPromedio}
                  onChange={(e) => setModoPromedio(e.target.value)}
                >
                  <option value="periodo">Periodo</option>
                  <option value="final">Acumulado</option>
                </select>
                {modoPromedio === "periodo" && (
                  <select
                    value={periodoSeleccionado}
                    onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                  >
                    <option value="" disabled>Seleccione periodo</option>
                    {periodosConfigurados.map((periodo) => (
                      <option key={periodo.id_periodo} value={periodo.numero_periodo}>
                        {periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="btn-view"
                  onClick={calcularPromedio}
                  disabled={!estSel}
                >
                  Calcular
                </button>
              </div>
              {resultadoPromedio ? (
                <div className="cards-grid" style={{ marginTop: 12 }}>
                  {modoPromedio === "periodo" ? (
                    <>
                      <div className="stat-card accent">
                        <p className="stat-label">Promedio del periodo</p>
                        <h3 className="stat-value">
                          {resultadoPromedio.promedio_periodo ?? "—"}
                        </h3>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Actividades</p>
                        <h3 className="stat-value">
                          {resultadoPromedio.promedio_actividades ?? "—"}
                        </h3>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Proyecto</p>
                        <h3 className="stat-value">
                          {resultadoPromedio.promedio_proyecto ?? "—"}
                        </h3>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Examen</p>
                        <h3 className="stat-value">
                          {resultadoPromedio.promedio_examen ?? "—"}
                        </h3>
                      </div>
                    </>
                  ) : (
                    <div className="stat-card accent">
                        <p className="stat-label">Promedio acumulado</p>
                        <h3 className="stat-value">
                          {resultadoPromedio.promedio_acumulado ?? "—"}
                        </h3>
                      </div>
                  )}
                </div>
              ) : (
                <p className="panel-sub">
                  Calcule el promedio del estudiante seleccionado.
                </p>
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
                  label: `${d.nombre} ${d.apellido}`,
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
            <h3>Asignar docente</h3>
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
                  label: `${d.nombre} ${d.apellido}`,
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
    </AdminLayout>
  );
}

export default CursoHubAdmin;
