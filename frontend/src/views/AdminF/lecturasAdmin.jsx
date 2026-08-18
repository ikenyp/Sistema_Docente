import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  cursosAPI,
  estudiantesAPI,
  notasAPI,
  asistenciaAPI,
  comportamientoAPI,
} from "../../services/api";

function LecturasAdmin() {
  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [estudiantes, setEstudiantes] = useState([]);
  const [estSel, setEstSel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [notas, setNotas] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [comportamientos, setComportamientos] = useState([]);

  const estudianteSeleccionadoActual = useMemo(
    () => estudiantes.find((e) => String(e.id_estudiante) === String(estSel)),
    [estSel, estudiantes],
  );

  const resumen = useMemo(
    () => ({
      estudiantes: estudiantes.length,
      notas: notas.length,
      asistencias: asistencias.length,
      comportamientos: comportamientos.length,
    }),
    [
      asistencias.length,
      comportamientos.length,
      estudiantes.length,
      notas.length,
    ],
  );

  const cargarCursos = async () => {
    try {
      setCursos((await cursosAPI.listar({ size: 100 })) || []);
    } catch {}
  };

  const cargarEstudiantes = async (id_curso) => {
    try {
      setEstudiantes(
        (await estudiantesAPI.buscar({
          id_curso: id_curso || undefined,
          size: 99,
        })) || [],
      );
    } catch {}
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  useEffect(() => {
    cargarEstudiantes(cursoSel);
    setEstSel("");
    setSearchTerm("");
  }, [cursoSel]);

  const estudiantesFiltrados = estudiantes.filter((e) =>
    `${e.nombre} ${e.apellido}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    if (estSel) {
      const filtrosBase = { id_estudiante: Number(estSel) };
      (async () => {
        try {
          const [ln, la, lc] = await Promise.all([
            notasAPI.listar({ ...filtrosBase, size: 100 }),
            asistenciaAPI.listar({ ...filtrosBase, size: 100 }),
            comportamientoAPI.listar({ ...filtrosBase, size: 100 }),
          ]);
          setNotas(ln || []);
          setAsistencias(la || []);
          setComportamientos(lc || []);
        } catch {}
      })();
    } else {
      setNotas([]);
      setAsistencias([]);
      setComportamientos([]);
    }
  }, [estSel]);

  return (
    <AdminLayout
      title="Consulta académica"
      subtitle="Revise notas, asistencia y comportamiento de los estudiantes."
    >
      <h2 className="section-title">
        Consulta académica: notas, asistencia y comportamiento
      </h2>

      <div className="cards-grid dashboard-summary-grid">
        <div className="stat-card accent">
          <p className="stat-label">Estudiantes</p>
          <h3 className="stat-value">{resumen.estudiantes}</h3>
          <p className="stat-sub">Cargados para la vista actual</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Notas</p>
          <h3 className="stat-value">{resumen.notas}</h3>
          <p className="stat-sub">Registros recuperados</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Asistencias</p>
          <h3 className="stat-value">{resumen.asistencias}</h3>
          <p className="stat-sub">Registros recuperados</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Comportamiento</p>
          <h3 className="stat-value">{resumen.comportamientos}</h3>
          <p className="stat-sub">Registros recuperados</p>
        </div>
      </div>

      <div className="empty-state" style={{ marginBottom: 16 }}>
        <h3>Flujo de consulta</h3>
        <p>
          1. Elige un curso. 2. Busca y selecciona un estudiante. 3. Revisa
          sus datos académicos y de convivencia.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <select
          value={cursoSel}
          onChange={(e) => setCursoSel(e.target.value)}
        >
          <option value="">Curso (opcional)</option>
          {cursos.map((c) => (
            <option key={c.id_curso} value={c.id_curso}>
              {c.nombre}
            </option>
          ))}
        </select>
        {cursoSel ? (
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%" }}
            />
            {estudiantesFiltrados.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "white",
                  border: "1px solid #ccc",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 1000,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {estudiantesFiltrados.map((e) => (
                  <li
                    key={e.id_estudiante}
                    onClick={() => {
                      setEstSel(e.id_estudiante);
                      setSearchTerm(`${e.nombre} ${e.apellido}`);
                    }}
                    style={{
                      padding: "8px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {e.nombre} {e.apellido}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Selecciona un curso para revisar lecturas</h3>
            <p>
              Después podrás buscar un estudiante y consultar notas,
              asistencia y comportamiento.
            </p>
          </div>
        )}
      </div>

      <div className="table-container">
        <h3>Notas</h3>
        {estudianteSeleccionadoActual && (
          <p className="panel-sub" style={{ marginBottom: 12 }}>
            Mostrando información de {estudianteSeleccionadoActual.nombre}{" "}
            {estudianteSeleccionadoActual.apellido}
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((n) => (
              <tr key={n.id_nota}>
                <td>{n.id_insumo}</td>
                <td>{n.calificacion ?? n.valor ?? "-"}</td>
              </tr>
            ))}
            {notas.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: "center" }}>
                  No hay notas para el estudiante seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-container">
        <h3>Asistencia</h3>
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
            {asistencias.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: "center" }}>
                  No hay asistencia para el estudiante seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-container">
        <h3>Comportamiento</h3>
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
                <td>{c.observaciones || c.descripcion || "-"}</td>
              </tr>
            ))}
            {comportamientos.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: "center" }}>
                  No hay comportamiento para el estudiante seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default LecturasAdmin;
