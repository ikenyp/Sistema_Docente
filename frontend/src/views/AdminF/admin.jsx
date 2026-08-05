import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clipboard, BookOpen, ArrowLeft } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { notify } from "../../components/notify";
import {
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
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [u, c, e, a, es] = await Promise.all([
          usuariosAPI.listar({ size: 100 }),
          cursosAPI.listar({ size: 100 }),
          estudiantesAPI.buscar({ estado: "matriculado", size: 100 }),
          asignacionesAPI.listar({ size: 100 }),
          estructurasAcademicasAPI.listar({ size: 100 }),
        ]);
        setUsuarios(u || []);
        setCursos(c || []);
        setEstudiantes(e || []);
        setAsignaciones(a || []);
        setEstructuras(es || []);
      } catch (e) {
        const msg = e.message || "Error al cargar datos del dashboard";
        setErrorCarga(msg);
        notify("error", msg);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const anios = useMemo(() => {
    const set = new Set(cursos.map((c) => c.anio_lectivo).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [cursos]);

  useEffect(() => {
    if (!anioActivo && anios.length > 0) setAnioActivo(anios[0]);
  }, [anios, anioActivo]);

  const cursosAnio = useMemo(() => {
    if (!anioActivo) return cursos;
    return cursos.filter((c) => c.anio_lectivo === anioActivo);
  }, [cursos, anioActivo]);

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
    >
      <div className="admin-year-bar">
        <label className="admin-inline-label">
          Año lectivo de trabajo
          <select
            value={anioActivo}
            onChange={(e) => setAnioActivo(e.target.value)}
          >
            {anios.length === 0 && <option value="">—</option>}
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
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
          <p className="stat-label">Estudiantes ({anioActivo || "todos"})</p>
          <h3 className="stat-value">{resumen.estudiantesAnio}</h3>
          <p className="stat-sub">Matriculados en el periodo</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Cursos ({anioActivo || "todos"})</p>
          <h3 className="stat-value">{resumen.cursosAnio}</h3>
          <p className="stat-sub">Paralelos del periodo</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estructuras</p>
          <h3 className="stat-value">{resumen.estructuras}</h3>
          <p className="stat-sub">Plantillas académicas disponibles</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pendientes</p>
          <h3 className="stat-value">{totalPendientes}</h3>
          <p className="stat-sub">Tareas por revisar abajo</p>
        </div>
      </div>

      {errorCarga && (
        <div className="admin-alerts table-container">
          <h3>Error al cargar datos</h3>
          <p>{errorCarga}</p>
        </div>
      )}

      {!cargando && totalPendientes > 0 && (
        <div className="admin-alerts table-container">
          <h3>Atención</h3>
          <ul className="admin-alert-list">
            {pendientes.sinCurso > 0 && (
              <li>
                <strong>{pendientes.sinCurso}</strong> estudiante(s)
                matriculado(s) sin curso asignado.{" "}
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => navigate("/admin/estudiantes")}
                >
                  <Check size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  Ir a estudiantes
                </button>
              </li>
            )}
            {pendientes.sinEstructura > 0 && (
              <li>
                <strong>{pendientes.sinEstructura}</strong> curso(s) sin estructura académica.{" "}
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => navigate("/admin/cursos")}
                >
                  <Clipboard size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  Revisar cursos
                </button>
              </li>
            )}
            {pendientes.sinTutor > 0 && (
              <li>
                <strong>{pendientes.sinTutor}</strong> curso(s) sin tutor.{" "}
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => navigate("/admin/cursos")}
                >
                  <Clipboard size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  Revisar cursos
                </button>
              </li>
            )}
            {pendientes.sinMaterias > 0 && (
              <li>
                <strong>{pendientes.sinMaterias}</strong> curso(s) sin
                asignaciones de materias.{" "}
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => navigate("/admin/cursos")}
                >
                  <BookOpen size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  Abrir cursos
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
                <th>Acción</th>
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
