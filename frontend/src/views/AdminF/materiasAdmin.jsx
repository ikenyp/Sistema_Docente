import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";
import { materiasAPI } from "../../services/api";

function MateriasAdmin() {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);

  const [filtros, setFiltros] = useState({ nombre: "", page: 1, size: 10 });
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "" });

  const puedeRetroceder = useMemo(() => filtros.page > 1, [filtros.page]);
  const puedeAvanzar = useMemo(
    () => data.length === filtros.size,
    [data, filtros.size]
  );

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await materiasAPI.listar({
        nombre: filtros.nombre || undefined,
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
    const usuarioJSON = localStorage.getItem("usuario");
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
    if (usuario) setDatosUsuario(usuario);
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
    setForm({ nombre: "" });
    setModalOpen(true);
  };
  const abrirEditar = (m) => {
    setEditando(m);
    setForm({ nombre: m.nombre });
    setModalOpen(true);
  };

  const guardar = async () => {
    try {
      if (editando) await materiasAPI.actualizar(editando.id_materia, form);
      else await materiasAPI.crear(form);
      setModalOpen(false);
      cargar();
    } catch (e) {
      alert(e.message || "Error al guardar");
    }
  };

  const eliminar = async (m) => {
    if (!window.confirm("¿Eliminar esta materia?")) return;
    try {
      await materiasAPI.eliminar(m.id_materia);
      cargar();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    }
  };

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
        <div className="docentes-header">
          <h2 className="section-title">Materias</h2>
          <button className="btn-add-docente" onClick={abrirCrear}>
            Añadir Materia
          </button>
        </div>

        <form
          onSubmit={buscar}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <input
            placeholder="Nombre"
            value={filtros.nombre}
            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
          />
          <button className="btn-view" type="submit">
            Buscar
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
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id_materia}>
                    <td>{m.nombre}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => abrirEditar(m)}
                      >
                        Editar
                      </button>{" "}
                      <button
                        className="btn-danger"
                        onClick={() => eliminar(m)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: "center" }}>
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
            <h3>{editando ? "Editar Materia" : "Crear Materia"}</h3>
            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
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

export default MateriasAdmin;
