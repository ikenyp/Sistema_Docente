import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";
import {
  cursosAPI,
  estudiantesAPI,
  notasAPI,
  asistenciaAPI,
  comportamientoAPI,
} from "../../services/api";

function LecturasAdmin() {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);

  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [estudiantes, setEstudiantes] = useState([]);
  const [estSel, setEstSel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [notas, setNotas] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [comportamientos, setComportamientos] = useState([]);

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
        })) || []
      );
    } catch {}
  };

  useEffect(() => {
    const usuarioJSON = localStorage.getItem("usuario");
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
    if (usuario) setDatosUsuario(usuario);
  }, []);

  useEffect(() => {
    cargarCursos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarEstudiantes(cursoSel);
    setEstSel("");
    setSearchTerm("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoSel]);

  const estudiantesFiltrados = estudiantes.filter((e) =>
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estSel]);

  const cerrarSesion = () => navigate("/");

  return (
    <div className="admin-page">
      <div className="navbar-admin">
        <button className="btn-volver" onClick={() => navigate("/admin")}>
          ← Volver
        </button>

        <h1 className="titulo-admin">📚 Sistema Docente</h1>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Admin"}
        </div>
        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      <div className="admin-container">
        <h2 className="section-title">
          Lecturas: Notas, Asistencia y Comportamiento
        </h2>
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
            <div>Seleccione un curso para buscar estudiantes</div>
          )}
        </div>

        <div className="table-container">
          <h3>Notas</h3>
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
                  <td>{n.valor}</td>
                </tr>
              ))}
              {notas.length === 0 && (
                <tr>
                  <td colSpan="2" style={{ textAlign: "center" }}>
                    Sin datos
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
                  <td colSpan="2" style={{ textAlign: "center" }}>
                    Sin datos
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
                  <td>{c.descripcion}</td>
                </tr>
              ))}
              {comportamientos.length === 0 && (
                <tr>
                  <td colSpan="2" style={{ textAlign: "center" }}>
                    Sin datos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LecturasAdmin;
