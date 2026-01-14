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
          size: 200,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoSel]);

  const cargarDatos = async () => {
    const filtrosBase = estSel ? { id_estudiante: Number(estSel) } : {};
    try {
      const [ln, la, lc] = await Promise.all([
        notasAPI.listar({ ...filtrosBase, size: 200 }),
        asistenciaAPI.listar({ ...filtrosBase, size: 200 }),
        comportamientoAPI.listar({ ...filtrosBase, size: 200 }),
      ]);
      setNotas(ln || []);
      setAsistencias(la || []);
      setComportamientos(lc || []);
    } catch {}
  };

  useEffect(() => {
    if (estSel) cargarDatos();
    else {
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
        <div
          className="menu-icon"
          onClick={() => navigate(-1)}
          title="Volver atrás"
        >
          ← Volver
        </div>
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
          <select value={estSel} onChange={(e) => setEstSel(e.target.value)}>
            <option value="">Seleccione Estudiante</option>
            {estudiantes.map((e) => (
              <option key={e.id_estudiante} value={e.id_estudiante}>
                {e.nombre} {e.apellido}
              </option>
            ))}
          </select>
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
