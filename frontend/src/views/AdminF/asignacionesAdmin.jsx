import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";
import {
  asignacionesAPI,
  cursosAPI,
  materiasAPI,
  usuariosAPI,
} from "../../services/api";

function AsignacionesAdmin() {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);

  const [filtros, setFiltros] = useState({
    id_curso: "",
    id_materia: "",
    id_docente: "",
    page: 1,
    size: 10,
  });
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    id_curso: "",
    id_materia: "",
    id_docente: "",
  });

  const puedeRetroceder = useMemo(() => filtros.page > 1, [filtros.page]);
  const puedeAvanzar = useMemo(
    () => data.length === filtros.size,
    [data, filtros.size]
  );

  useEffect(() => {
    const usuarioJSON = localStorage.getItem("usuario");
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
    if (usuario) setDatosUsuario(usuario);
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [lc, lm, ld] = await Promise.all([
        cursosAPI.listar({ size: 100 }),
        materiasAPI.listar({ size: 100 }),
        usuariosAPI.listar({ rol: "docente", size: 100 }),
      ]);
      setCursos(lc || []);
      setMaterias(lm || []);
      setDocentes(ld || []);
    } catch {}
  };

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await asignacionesAPI.listar({
        id_curso: filtros.id_curso || undefined,
        id_materia: filtros.id_materia || undefined,
        id_docente: filtros.id_docente || undefined,
        page: filtros.page,
        size: filtros.size,
      });
      setData(res || []);
    } catch (e) {
      setError(e.message || "Error al cargar");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);
  useEffect(() => {
    cargar(); // eslint-disable-next-line
  }, [filtros.page, filtros.size]);

  const buscar = (e) => {
    e.preventDefault();
    setFiltros({ ...filtros, page: 1 });
    cargar();
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({ id_curso: "", id_materia: "", id_docente: "" });
    setModalOpen(true);
  };
  const abrirEditar = (row) => {
    setEditando(row);
    setForm({
      id_curso: row.id_curso,
      id_materia: row.id_materia,
      id_docente: row.id_docente,
    });
    setModalOpen(true);
  };

  const guardar = async () => {
    try {
      const payload = {
        id_curso: Number(form.id_curso),
        id_materia: Number(form.id_materia),
        id_docente: Number(form.id_docente),
      };
      if (editando) await asignacionesAPI.actualizar(editando.id_cmd, payload);
      else await asignacionesAPI.crear(payload);
      setModalOpen(false);
      cargar();
    } catch (e) {
      alert(e.message || "Error al guardar");
    }
  };

  const eliminar = async (row) => {
    if (!window.confirm("¿Eliminar esta asignación?")) return;
    try {
      await asignacionesAPI.eliminar(row.id_cmd);
      cargar();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
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
          <h2 className="section-title">
            Asignar docentes a cursos y materias
          </h2>
          <button className="btn-add-docente" onClick={abrirCrear}>
            Nueva Asignación
          </button>
        </div>

        <form
          onSubmit={buscar}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr) auto",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <select
            value={filtros.id_curso}
            onChange={(e) =>
              setFiltros({ ...filtros, id_curso: e.target.value })
            }
          >
            <option value="">Curso</option>
            {cursos.map((c) => (
              <option key={c.id_curso} value={c.id_curso}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtros.id_materia}
            onChange={(e) =>
              setFiltros({ ...filtros, id_materia: e.target.value })
            }
          >
            <option value="">Materia</option>
            {materias.map((m) => (
              <option key={m.id_materia} value={m.id_materia}>
                {m.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtros.id_docente}
            onChange={(e) =>
              setFiltros({ ...filtros, id_docente: e.target.value })
            }
          >
            <option value="">Docente</option>
            {docentes.map((d) => (
              <option key={d.id_usuario} value={d.id_usuario}>
                {d.nombre} {d.apellido}
              </option>
            ))}
          </select>
          <div />
          <button className="btn-view" type="submit">
            Filtrar
          </button>
        </form>

        <div className="table-container">
          {cargando ? (
            <p>Cargando...</p>
          ) : error ? (
            <p style={{ color: "red" }}>{error}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Materia</th>
                  <th>Docente</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id_cmd}>
                    <td>
                      {row.curso?.nombre ||
                        cursos.find((c) => c.id_curso === row.id_curso)
                          ?.nombre ||
                        row.id_curso}
                    </td>
                    <td>
                      {row.materia?.nombre ||
                        materias.find((m) => m.id_materia === row.id_materia)
                          ?.nombre ||
                        row.id_materia}
                    </td>
                    <td>
                      {(row.docente &&
                        `${row.docente.nombre} ${row.docente.apellido}`) ||
                        (docentes.find((d) => d.id_usuario === row.id_docente)
                          ? `${
                              docentes.find(
                                (d) => d.id_usuario === row.id_docente
                              ).nombre
                            } ${
                              docentes.find(
                                (d) => d.id_usuario === row.id_docente
                              ).apellido
                            }`
                          : row.id_docente)}
                    </td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => abrirEditar(row)}
                      >
                        Editar
                      </button>{" "}
                      <button
                        className="btn-danger"
                        onClick={() => eliminar(row)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="btn-view"
            disabled={!puedeRetroceder}
            onClick={() => setFiltros({ ...filtros, page: filtros.page - 1 })}
          >
            Anterior
          </button>
          <span style={{ alignSelf: "center" }}>Página {filtros.page}</span>
          <button
            className="btn-view"
            disabled={!puedeAvanzar}
            onClick={() => setFiltros({ ...filtros, page: filtros.page + 1 })}
          >
            Siguiente
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editando ? "Editar Asignación" : "Nueva Asignación"}</h3>
            <select
              value={form.id_curso}
              onChange={(e) => setForm({ ...form, id_curso: e.target.value })}
            >
              <option value="">Curso</option>
              {cursos.map((c) => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select
              value={form.id_materia}
              onChange={(e) => setForm({ ...form, id_materia: e.target.value })}
            >
              <option value="">Materia</option>
              {materias.map((m) => (
                <option key={m.id_materia} value={m.id_materia}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <select
              value={form.id_docente}
              onChange={(e) => setForm({ ...form, id_docente: e.target.value })}
            >
              <option value="">Docente</option>
              {docentes.map((d) => (
                <option key={d.id_usuario} value={d.id_usuario}>
                  {d.nombre} {d.apellido}
                </option>
              ))}
            </select>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn-save" onClick={guardar}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AsignacionesAdmin;
