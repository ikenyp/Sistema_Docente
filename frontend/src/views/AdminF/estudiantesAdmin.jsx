import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";
import { estudiantesAPI, cursosAPI } from "../../services/api";

function EstudiantesAdmin() {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);

  const [filtros, setFiltros] = useState({
    nombre: "",
    apellido: "",
    estado: "",
    id_curso: "",
    page: 1,
    size: 10,
  });

  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [cursos, setCursos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    fecha_nacimiento: "",
    estado: "ACTIVO",
    id_curso_actual: "",
  });

  const puedeRetroceder = useMemo(() => filtros.page > 1, [filtros.page]);
  const puedeAvanzar = useMemo(
    () => data.length === filtros.size,
    [data, filtros.size]
  );

  const cargarCursos = async () => {
    try {
      const lista = await cursosAPI.listar({ size: 100 });
      setCursos(lista || []);
    } catch (e) {
      // silencioso
    }
  };

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await estudiantesAPI.buscar({
        nombre: filtros.nombre || undefined,
        apellido: filtros.apellido || undefined,
        estado: filtros.estado || undefined,
        id_curso: filtros.id_curso || undefined,
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
    cargarCursos();
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.page, filtros.size]);

  const buscar = (e) => {
    e.preventDefault();
    setFiltros({ ...filtros, page: 1 });
    cargar();
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({
      nombre: "",
      apellido: "",
      cedula: "",
      fecha_nacimiento: "",
      estado: "ACTIVO",
      id_curso_actual: "",
    });
    setModalOpen(true);
  };

  const abrirEditar = (est) => {
    setEditando(est);
    setForm({
      nombre: est.nombre,
      apellido: est.apellido,
      cedula: est.cedula,
      fecha_nacimiento: est.fecha_nacimiento?.slice(0, 10) || "",
      estado: est.estado,
      id_curso_actual: est.id_curso_actual || "",
    });
    setModalOpen(true);
  };

  const guardar = async () => {
    try {
      const payload = {
        ...form,
        id_curso_actual: form.id_curso_actual
          ? Number(form.id_curso_actual)
          : null,
        fecha_nacimiento: form.fecha_nacimiento
          ? form.fecha_nacimiento
          : undefined,
      };
      if (editando) {
        await estudiantesAPI.actualizar(editando.id_estudiante, payload);
      } else {
        await estudiantesAPI.crear(payload);
      }
      setModalOpen(false);
      cargar();
    } catch (e) {
      alert(e.message || "Error al guardar");
    }
  };

  const eliminar = async (est) => {
    if (!window.confirm("¿Eliminar este estudiante? Debe estar INACTIVO."))
      return;
    try {
      await estudiantesAPI.eliminar(est.id_estudiante);
      cargar();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    }
  };

  const cerrarSesion = () => navigate("/");

  return (
    <div className="admin-page">
      <div className="navbar-admin">
        <div className="menu-icon" onClick={() => navigate(-1)}>
          ←
        </div>
        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          Admin
        </div>
        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      <div className="admin-container">
        <div className="docentes-header">
          <h2 className="section-title">Estudiantes</h2>
          <button className="btn-add-docente" onClick={abrirCrear}>
            Añadir Estudiante
          </button>
        </div>

        <form
          onSubmit={buscar}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <input
            placeholder="Nombre"
            value={filtros.nombre}
            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
          />
          <input
            placeholder="Apellido"
            value={filtros.apellido}
            onChange={(e) =>
              setFiltros({ ...filtros, apellido: e.target.value })
            }
          />
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
          <select
            value={filtros.id_curso}
            onChange={(e) =>
              setFiltros({ ...filtros, id_curso: e.target.value })
            }
          >
            <option value="">Curso (todos)</option>
            {cursos.map((c) => (
              <option key={c.id_curso} value={c.id_curso}>
                {c.nombre}
              </option>
            ))}
          </select>
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
                  <th>Apellido</th>
                  <th>Cédula</th>
                  <th>Estado</th>
                  <th>Curso Actual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((est) => (
                  <tr key={est.id_estudiante}>
                    <td>{est.nombre}</td>
                    <td>{est.apellido}</td>
                    <td>{est.cedula}</td>
                    <td>{est.estado}</td>
                    <td>
                      {cursos.find((c) => c.id_curso === est.id_curso_actual)
                        ?.nombre || "-"}
                    </td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => abrirEditar(est)}
                      >
                        Editar
                      </button>{" "}
                      <button
                        className="btn-danger"
                        onClick={() => eliminar(est)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center" }}>
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
            <h3>{editando ? "Editar Estudiante" : "Crear Estudiante"}</h3>
            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              placeholder="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
            <input
              placeholder="Cédula"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            />
            <input
              type="date"
              placeholder="Fecha Nacimiento"
              value={form.fecha_nacimiento}
              onChange={(e) =>
                setForm({ ...form, fecha_nacimiento: e.target.value })
              }
            />
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
            <select
              value={form.id_curso_actual}
              onChange={(e) =>
                setForm({ ...form, id_curso_actual: e.target.value })
              }
            >
              <option value="">Sin curso</option>
              {cursos.map((c) => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.nombre}
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

export default EstudiantesAdmin;
