import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, CheckCircle2, CircleSlash, Clipboard, BookOpen, Plus, Save, Settings2, Trash2, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import { notify } from "../../components/notify";
import PeriodizacionPage from "../Periodizacion/PeriodizacionPage";
import {
  aniosLectivosAPI,
  usuariosAPI,
  cursosAPI,
  estudiantesAPI,
  asignacionesAPI,
  estructurasAcademicasAPI,
} from "../../services/api";

function Admin() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [estructuras, setEstructuras] = useState([]);
  const [anioActivo, setAnioActivo] = useState("");
  const [aniosLectivos, setAniosLectivos] = useState([]);
  const [modalAnioOpen, setModalAnioOpen] = useState(false);
  const [modalConfigAnioOpen, setModalConfigAnioOpen] = useState(false);
  const [modalPeriodizacionOpen, setModalPeriodizacionOpen] = useState(false);
  const [anioNuevo, setAnioNuevo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [u, c, e, a, es, al] = await Promise.allSettled([
        usuariosAPI.listar({ size: 100 }),
        cursosAPI.listar({ size: 100 }),
        estudiantesAPI.buscar({ estado: "matriculado", size: 100 }),
        asignacionesAPI.listar({ size: 100 }),
        estructurasAcademicasAPI.listar({ size: 100 }),
        aniosLectivosAPI.listar(),
      ]);
      const usuariosData = u.status === "fulfilled" ? u.value : [];
      const cursosData = c.status === "fulfilled" ? c.value : [];
      const estudiantesData = e.status === "fulfilled" ? e.value : [];
      const asignacionesData = a.status === "fulfilled" ? a.value : [];
      const estructurasData = es.status === "fulfilled" ? es.value : [];
      const aniosData = al.status === "fulfilled" ? al.value : [];

      setUsuarios(usuariosData || []);
      setCursos(cursosData || []);
      setEstudiantes(estudiantesData || []);
      setAsignaciones(asignacionesData || []);
      setEstructuras(estructurasData || []);
      const aniosBackend = (aniosData || []).filter(Boolean);
      setAniosLectivos(aniosBackend);
      if (aniosBackend.length > 0) {
        const primerAnio = normalizarAnioLectivo(aniosBackend[0].anio_lectivo);
        const anioResuelto = (() => {
          const actual = anioActivo;
          if (!actual) return primerAnio;
          const existeEnLista = aniosBackend.some(
            (item) => normalizarAnioLectivo(item.anio_lectivo) === actual,
          );
          return existeEnLista ? actual : primerAnio;
        })();
        setAnioActivo((prev) => {
          if (!prev) return primerAnio;
          const existeEnLista = aniosBackend.some(
            (item) => normalizarAnioLectivo(item.anio_lectivo) === prev,
          );
          return existeEnLista ? prev : primerAnio;
        });
        localStorage.setItem("anio_lectivo_activo", anioResuelto);
      }
    } catch (e) {
      const msg = e.message || "Error al cargar datos del dashboard";
      setErrorCarga(msg);
      notify("error", msg);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const normalizarAnioLectivo = (valor) => {
    if (!valor) return "";
    if (/^\d{4}$/.test(valor)) return `${valor}-${Number(valor) + 1}`;
    return valor;
  };

  const formatarAnioLectivo = (valor) => {
    const soloNumeros = String(valor || "").replace(/\D/g, "");
    if (soloNumeros.length <= 4) return soloNumeros;
    return `${soloNumeros.slice(0, 4)}-${soloNumeros.slice(4, 8)}`;
  };

  const validarAnioLectivo = (anio) => {
    const patron = /^\d{4}-\d{4}$/;
    if (!patron.test(anio)) return "Formato inválido. Usa: 2026-2027";
    const [inicio, fin] = anio.split("-").map(Number);
    if (fin !== inicio + 1) return "El año final debe ser +1 del inicial (ej: 2026-2027)";
    return null;
  };

  const anios = useMemo(() => {
    const base = aniosLectivos
      .map((item) => normalizarAnioLectivo(item.anio_lectivo))
      .filter(Boolean);
    return Array.from(new Set(base)).sort().reverse();
  }, [aniosLectivos]);

  useEffect(() => {
    if (anios.length === 0) return;
    if (!anioActivo || !anios.includes(anioActivo)) setAnioActivo(anios[0]);
  }, [anios, anioActivo]);

  useEffect(() => {
    if (anioActivo) {
      localStorage.setItem("anio_lectivo_activo", anioActivo);
    }
  }, [anioActivo]);

  const abrirNuevoAnio = () => {
    setAnioNuevo("");
    setModalAnioOpen(true);
  };

  const guardarNuevoAnio = async () => {
    const formato = formatarAnioLectivo(anioNuevo);
    const error = validarAnioLectivo(formato);
    if (error) {
      notify("error", error);
      return;
    }

    try {
      const nuevo = await aniosLectivosAPI.crear({ anio_lectivo: formato, activo: true });
      setModalAnioOpen(false);
      setAnioNuevo("");
      await cargar();
      setAnioActivo(normalizarAnioLectivo(nuevo?.anio_lectivo || formato));
      localStorage.setItem("anio_lectivo_activo", normalizarAnioLectivo(nuevo?.anio_lectivo || formato));
      notify("success", `Año lectivo ${formato} creado`);
    } catch (e) {
      notify("error", e.message || "No se pudo crear el año lectivo");
    }
  };

  const cursosAnio = useMemo(() => {
    if (!anioActivo) return cursos;
    return cursos.filter((c) => normalizarAnioLectivo(c.anio_lectivo) === anioActivo);
  }, [cursos, anioActivo]);

  const aniosSelector = useMemo(() => anios, [anios]);

  const anioSeleccionado = useMemo(
    () => aniosSelector.find((item) => item === anioActivo) || anioActivo,
    [aniosSelector, anioActivo],
  );

  const cursoDelAnioSeleccionado = useMemo(
    () => cursos.filter((c) => normalizarAnioLectivo(c.anio_lectivo) === anioActivo),
    [cursos, anioActivo],
  );

  const tieneDependenciasAnio = cursoDelAnioSeleccionado.length > 0;

  const configurarAnio = () => {
    if (!anioActivo) {
      notify("error", "Selecciona un año lectivo primero");
      return;
    }
    setModalConfigAnioOpen(true);
  };

  const anioActualObj = aniosLectivos.find(
    (item) => normalizarAnioLectivo(item.anio_lectivo) === anioActivo,
  );

  const actualizarEstadoAnio = async (activo) => {
    if (!anioActivo) {
      notify("error", "Selecciona un año lectivo primero");
      return;
    }
    if (!anioActualObj) {
      notify("error", "No se encontró el año lectivo actual");
      return;
    }
    try {
      await aniosLectivosAPI.actualizar(anioActualObj.id_anio_lectivo, { activo });
      await cargar();
      setModalConfigAnioOpen(false);
      notify("success", activo ? "Año lectivo activado" : "Año lectivo inactivado");
    } catch (e) {
      notify("error", e.message || "No se pudo actualizar el año lectivo");
    }
  };

  const eliminarAnio = async () => {
    if (tieneDependenciasAnio) {
      notify("error", "No se puede eliminar un año lectivo con cursos asociados");
      return;
    }
    if (!anioActivo) return;
    const actual = aniosLectivos.find((item) => normalizarAnioLectivo(item.anio_lectivo) === anioActivo);
    if (!actual) {
      notify("error", "No se encontró el año lectivo actual");
      return;
    }
    try {
      await aniosLectivosAPI.actualizar(actual.id_anio_lectivo, { activo: false });
      await aniosLectivosAPI.eliminar(actual.id_anio_lectivo);
      await cargar();
      setAnioActivo(aniosSelector[0] || "");
      setModalConfigAnioOpen(false);
      notify("success", "Año lectivo eliminado");
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar el año lectivo");
    }
  };

  const estudiantesAnio = useMemo(() => {
    if (!anioActivo) return estudiantes;
    const idsCursos = new Set(cursosAnio.map((c) => c.id_curso));
    return estudiantes.filter((e) => idsCursos.has(e.id_curso_actual));
  }, [estudiantes, cursosAnio, anioActivo]);

  const resumen = useMemo(() => {
    const docentes = usuarios.filter(
      (u) => (u.rol || "").toLowerCase() === "docente",
    ).length;
    const admins = usuarios.filter(
      (u) => (u.rol || "").toLowerCase() === "administrativo",
    ).length;
    return {
      docentes,
      admins,
      totalUsuarios: usuarios.length,
      estructuras: estructuras.length,
      cursosAnio: cursosAnio.length,
      estudiantesAnio: estudiantesAnio.length,
    };
  }, [usuarios, estructuras, cursosAnio, estudiantesAnio]);

  const pendientes = useMemo(() => {
    const sinCurso = estudiantes.filter((e) => !e.id_curso_actual).length;
    const sinTutor = cursosAnio.filter((c) => !c.id_tutor).length;
    const sinEstructura = cursosAnio.filter((c) => !c.id_estructura_academica).length;
    const idsConAsignacion = new Set(asignaciones.map((a) => a.id_curso));
    const sinMaterias = cursosAnio.filter(
      (c) => !idsConAsignacion.has(c.id_curso),
    ).length;
    return { sinCurso, sinTutor, sinMaterias, sinEstructura };
  }, [estudiantes, cursosAnio, asignaciones]);

  const totalPendientes = useMemo(
    () =>
      pendientes.sinCurso +
      pendientes.sinTutor +
      pendientes.sinMaterias +
      pendientes.sinEstructura,
    [pendientes],
  );

  const pasosInicioAnio = [
    {
      title: "1. Usuarios",
      sub: "Docentes y administradores",
      to: "/admin/usuarios",
    },
    {
      title: "2. Estructura académica",
      sub: "Plantillas, materias base y periodización",
      to: "/admin/estructura-academica",
    },
    {
      title: "3. Cursos",
      sub: "Paralelos del año lectivo",
      to: "/admin/cursos",
    },
    {
      title: "4. Estudiantes",
      sub: "Registro de alumnos",
      to: "/admin/estudiantes",
    },
  ];

  const nombreTutor = (id_tutor) => {
    if (!id_tutor) return "—";
    const u = usuarios.find((x) => x.id_usuario === id_tutor);
    return u ? `${u.nombre} ${u.apellido}` : `#${id_tutor}`;
  };

  return (
    <AdminLayout
      title="Panel del administrador"
      subtitle="Organice la estructura académica, prepare cursos y revise pendientes del periodo."
      headerActions={
        <button type="button" className="btn-add-docente btn-inline-icon btn-add-year-wrap" onClick={abrirNuevoAnio}>
          <Plus size={16} />
          <span>Nuevo año<br />lectivo</span>
        </button>
      }
    >
      <div className="admin-year-bar">
        <div className="admin-year-context">
          <label className="admin-inline-label cursos-year-label" style={{ marginBottom: 8 }}>
            Año lectivo de trabajo
          </label>
          <CustomSelect
            value={anioActivo}
            onChange={setAnioActivo}
            options={aniosSelector.map((a) => ({ value: a, label: a }))}
            placeholder="—"
            className="custom-select-white admin-year-select"
          />
        </div>
        <div className="admin-year-actions">
          <button type="button" className="btn-view btn-inline-icon admin-year-action-btn" onClick={() => setModalPeriodizacionOpen(true)}>
            <CalendarClock size={18} />
            <span>Periodización</span>
          </button>
          <button type="button" className="btn-view btn-inline-icon admin-year-action-btn" onClick={configurarAnio}>
            <Settings2 size={18} />
            <span>Configuración</span>
          </button>
        </div>
      </div>

      <div className="cards-grid dashboard-summary-grid admin-metrics-grid">
        <div className="stat-card accent">
          <p className="stat-label">Usuarios</p>
          <h3 className="stat-value">{resumen.totalUsuarios}</h3>
          <p className="stat-sub">
            {resumen.docentes} docentes · {resumen.admins} administradores
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estudiantes</p>
          <h3 className="stat-value">{resumen.estudiantesAnio}</h3>
          <p className="stat-sub">Matriculados en el año</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Cursos</p>
          <h3 className="stat-value">{resumen.cursosAnio}</h3>
          <p className="stat-sub">Disponibles en el año</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estructuras</p>
          <h3 className="stat-value">{resumen.estructuras}</h3>
          <p className="stat-sub">Plantillas académicas disponibles</p>
        </div>
      </div>

      {modalAnioOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight">
            <button type="button" className="admin-modal-close-btn" onClick={() => setModalAnioOpen(false)} aria-label="Cerrar modal">
              <X size={14} />
            </button>
            <h3>Nuevo año lectivo</h3>
            <input
              type="text"
              placeholder="Año lectivo (ej: 2026-2027)"
              value={anioNuevo}
              onChange={(e) => setAnioNuevo(formatarAnioLectivo(e.target.value))}
            />
            <p style={{ marginTop: -2, marginBottom: 10, fontSize: "0.85rem", color: "#6b7a99" }}>
              Formato: YYYY-YYYY (ej: 2026-2027)
            </p>
            <div className="modal-buttons cursos-modal-buttons">
              <button type="button" className="btn-neutral btn-inline-icon" onClick={() => setModalAnioOpen(false)}>
                <X size={14} />
                Cancelar
              </button>
              <button type="button" className="btn-success btn-inline-icon" onClick={guardarNuevoAnio}>
                <Save size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfigAnioOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight">
            <button type="button" className="admin-modal-close-btn" onClick={() => setModalConfigAnioOpen(false)} aria-label="Cerrar modal">
              <X size={14} />
            </button>
            <h3>Configuración del año lectivo</h3>
            <p style={{ marginBottom: 12 }}>
              {anioSeleccionado || "Sin año seleccionado"}
            </p>
            <p style={{ marginTop: -6, marginBottom: 10, fontSize: "0.85rem", color: "#6b7a99" }}>
              Estado actual: {(anioActualObj?.activo ?? true) ? "Activo" : "Inactivo"}
            </p>
            <div className="modal-buttons cursos-modal-buttons">
              <button type="button" className="btn-success btn-inline-icon" onClick={() => actualizarEstadoAnio(true)}>
                <CheckCircle2 size={15} />
                Activar
              </button>
              <button type="button" className="btn-neutral btn-inline-icon" onClick={() => actualizarEstadoAnio(false)}>
                <CircleSlash size={15} />
                Inactivar
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn-danger btn-inline-icon admin-year-delete-btn"
                onClick={eliminarAnio}
                disabled={tieneDependenciasAnio}
                title={tieneDependenciasAnio ? "No se puede eliminar porque tiene cursos asociados" : "Eliminar año lectivo"}
                style={{ width: "100%" }}
              >
                <Trash2 size={15} />
                Eliminar año lectivo
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPeriodizacionOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-periodizacion">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalPeriodizacionOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3 className="admin-modal-title admin-modal-title-center">Periodizacion</h3>
            <PeriodizacionPage embedded />
          </div>
        </div>
      )}

      {errorCarga && (
        <div className="admin-alerts table-container">
          <h3>Error al cargar datos</h3>
          <p>{errorCarga}</p>
        </div>
      )}

      {!cargando && totalPendientes > 0 && (
        <div className="admin-attention-line admin-attention-emphasis table-container">
          <h3>Atención: {totalPendientes} tareas pendientes por revisar</h3>
          <ul className="admin-alert-list">
            {pendientes.sinCurso > 0 && (
              <li>
                <strong>{pendientes.sinCurso}</strong> estudiante(s) matriculado(s)
                sin curso asignado.
                <button type="button" className="admin-link-btn admin-link-btn-inline" onClick={() => navigate("/admin/estudiantes")}>
                  <Check size={14} />
                  <span>Ir a estudiantes</span>
                </button>
              </li>
            )}
            {pendientes.sinEstructura > 0 && (
              <li>
                <strong>{pendientes.sinEstructura}</strong> curso(s) sin estructura académica.
                <button type="button" className="admin-link-btn admin-link-btn-inline" onClick={() => navigate("/admin/cursos")}>
                  <Clipboard size={14} />
                  <span>Revisar cursos</span>
                </button>
              </li>
            )}
            {pendientes.sinTutor > 0 && (
              <li>
                <strong>{pendientes.sinTutor}</strong> curso(s) sin tutor.
                <button type="button" className="admin-link-btn admin-link-btn-inline" onClick={() => navigate("/admin/cursos")}>
                  <Clipboard size={14} />
                  <span>Revisar cursos</span>
                </button>
              </li>
            )}
            {pendientes.sinMaterias > 0 && (
              <li>
                <strong>{pendientes.sinMaterias}</strong> curso(s) sin asignaciones de materias.
                <button type="button" className="admin-link-btn admin-link-btn-inline" onClick={() => navigate("/admin/cursos")}>
                  <BookOpen size={14} />
                  <span>Abrir cursos</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="panel-divider" />

      <div className="section-block">
        <div className="section-block-head">
          <h3>Inicio de año lectivo</h3>
          <p>Siga este orden para dejar lista la operación del periodo.</p>
        </div>
        <div className="dashboard-grid dashboard-grid-2 admin-action-grid">
          {pasosInicioAnio.map((p) => (
            <button
              key={p.to}
              type="button"
              className="admin-action-card"
              onClick={() => navigate(p.to)}
            >
              <span className="admin-action-title">{p.title}</span>
              <span className="admin-action-sub">{p.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-divider" />

      <div className="section-block">
        <div className="section-block-head">
          <h3>Cursos del periodo</h3>
          <p>Entre directamente a la ficha de cada curso.</p>
        </div>
        <div className="table-container table-compact">
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Año</th>
                <th>Tutor</th>
                <th>Estudiantes</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cursosAnio.map((c) => (
                <tr key={c.id_curso}>
                  <td>{c.nombre}</td>
                  <td>{c.anio_lectivo}</td>
                  <td>{nombreTutor(c.id_tutor)}</td>
                  <td>
                    {estudiantes.filter(
                      (e) => e.id_curso_actual === c.id_curso,
                    ).length}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-view"
                      onClick={() => navigate(`/admin/cursos/${c.id_curso}`)}
                    >
                      <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                      Abrir curso
                    </button>
                  </td>
                </tr>
              ))}
              {cursosAnio.length === 0 && !cargando && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    Cree cursos en la sección Cursos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {cursos.length > 8 && (
            <p className="panel-sub" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => navigate("/admin/cursos")}
              >
                <Clipboard size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Ver todos los cursos
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="panel-divider" />

      <div className="section-block">
        <div className="section-block-head">
          <h3>Accesos rápidos</h3>
          <p>Las consultas y reportes más usados.</p>
        </div>
        <div className="dashboard-grid dashboard-grid-2 admin-action-grid">
          <button
            type="button"
            className="admin-action-card"
            onClick={() => navigate("/admin/consultas")}
          >
            <span className="admin-action-title">Consulta de curso</span>
            <span className="admin-action-sub">
              Estudiantes, notas y promedios
            </span>
          </button>
          <button
            type="button"
            className="admin-action-card"
            onClick={() => navigate("/admin/usuarios")}
          >
            <span className="admin-action-title">Gestionar usuarios</span>
            <span className="admin-action-sub">
              Docentes y administradores
            </span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Admin;
