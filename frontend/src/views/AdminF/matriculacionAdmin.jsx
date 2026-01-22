import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";
import { cursosAPI, estudiantesAPI } from "../../services/api";

function MatriculacionAdmin() {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);

  const [cursoSel, setCursoSel] = useState("");
  const [cursos, setCursos] = useState([]);

  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargarCursos = async () => {
    try {
      setCursos((await cursosAPI.listar({ size: 100 })) || []);
    } catch {}
  };

  const cargarEstudiantes = async () => {
    setCargando(true);
    try {
      const lista = await estudiantesAPI.buscar({
        // normalizar estado y limitar tamaño máximo a 100
        estado: "matriculado",
        size: 100,
      });
      // Mostrar todos los estudiantes con estado 'matriculado'.
      // Si se quiere sólo los sin curso, filtrar por !id_curso_actual en la UI.
      setEstudiantes(lista || []);
    } catch (e) {
      console.error("Error al cargar estudiantes:", e);
      alert(e.message || "Error al cargar estudiantes");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const usuarioJSON = localStorage.getItem("usuario");
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
    if (usuario) setDatosUsuario(usuario);
  }, []);

  useEffect(() => {
    cargarCursos();
    cargarEstudiantes();
  }, []);

  const matricular = async (est) => {
    if (!cursoSel) {
      alert("Seleccione un curso");
      return;
    }
    try {
      await estudiantesAPI.actualizar(est.id_estudiante, {
        id_curso_actual: Number(cursoSel),
      });
      await cargarEstudiantes();
    } catch (e) {
      alert(e.message || "No se pudo matricular");
    }
  };

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
        <div className="docentes-header">
          <h2 className="section-title">Matriculación de estudiantes</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <select
              value={cursoSel}
              onChange={(e) => setCursoSel(e.target.value)}
            >
              <option value="">Seleccione curso</option>
              {cursos.map((c) => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-container">
          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Cédula</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {estudiantes.map((e) => (
                  <tr key={e.id_estudiante}>
                    <td>{e.nombre}</td>
                    <td>{e.apellido}</td>
                    <td>{e.cedula}</td>
                    <td>
                      <button
                        className="btn-success"
                        onClick={() => matricular(e)}
                      >
                        Matricular
                      </button>
                    </td>
                  </tr>
                ))}
                {estudiantes.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      No hay estudiantes sin curso
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatriculacionAdmin;
