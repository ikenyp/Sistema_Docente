import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Save, X, UserPlus } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import { usuariosAPI } from "../../services/api";
import { notify, requestConfirm } from "../../components/notify";
import { nombrePersona } from "../../utils/personas";

function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState("");
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState(false);

  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    rol: "docente",
  });

  const usuariosFiltrados = useMemo(() => {
    const texto = busquedaUsuarios.trim().toLowerCase();
    const filtrados = texto
      ? usuarios.filter((usuario) => {
          const nombreCompleto = nombrePersona(usuario).trim().toLowerCase();
          const correo = (usuario?.correo || "").toLowerCase();
          const rol = (usuario?.rol || "").toLowerCase();
          return (
            nombreCompleto.includes(texto) ||
            correo.includes(texto) ||
            rol.includes(texto)
          );
        })
      : usuarios;

    return [...filtrados].sort((a, b) => {
      const rolA = (a?.rol || "").toLowerCase() === "administrativo" ? 0 : 1;
      const rolB = (b?.rol || "").toLowerCase() === "administrativo" ? 0 : 1;
      if (rolA !== rolB) return rolA - rolB;
      const apellido = (a?.apellido || "").localeCompare(b?.apellido || "", "es", { sensitivity: "base" });
      if (apellido !== 0) return apellido;
      return (a?.nombre || "").localeCompare(b?.nombre || "", "es", { sensitivity: "base" });
    });
  }, [busquedaUsuarios, usuarios]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await usuariosAPI.listar({ size: 100 });
        setUsuarios(data);
        setCargandoUsuarios(false);
      } catch (error) {
        console.error(error);
        setErrorUsuarios(true);
        setCargandoUsuarios(false);
      }
    };
    fetchUsuarios();
  }, []);

  const abrirEditarModal = (usuario) => {
    setUsuarioEditar({
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol,
      contrasena: "",
    });
    setModalEditarOpen(true);
  };

  const cerrarEditarModal = () => {
    setModalEditarOpen(false);
    setUsuarioEditar(null);
  };

  const editarUsuario = async () => {
    if (
      !usuarioEditar.nombre ||
      !usuarioEditar.apellido ||
      !usuarioEditar.correo
    ) {
      notify("error", "Nombre, apellido y correo son obligatorios");
      return;
    }
    try {
      const body = {
        nombre: usuarioEditar.nombre,
        apellido: usuarioEditar.apellido,
        correo: usuarioEditar.correo,
        rol: usuarioEditar.rol,
      };
      if (usuarioEditar.contrasena) body.contrasena = usuarioEditar.contrasena;

      const usuarioActualizado = await usuariosAPI.actualizar(
        usuarioEditar.id_usuario,
        body,
      );
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id_usuario === usuarioEditar.id_usuario ? usuarioActualizado : u,
        ),
      );
      cerrarEditarModal();
      notify("success", "Usuario actualizado");
    } catch (error) {
      notify("error", "No se pudo editar el usuario: " + error.message);
    }
  };

  const eliminarUsuario = async (usuario) => {
    const ok = await requestConfirm(
      "Eliminar usuario",
      {
        title: "Eliminar Usuario",
        role: rolLabel(usuario.rol),
        name: `${usuario.apellido} ${usuario.nombre}`,
        description: "Estas seguro de eliminarlo?",
        note: "Si el usuario tiene información relacionada en la app, no podrá ser eliminado.",
      },
    );
    if (!ok) return;
    try {
      await usuariosAPI.eliminar(usuario.id_usuario);
      setUsuarios((prev) =>
        prev.filter((u) => u.id_usuario !== usuario.id_usuario),
      );
      notify("success", "Usuario eliminado");
    } catch (error) {
      notify("error", error.message || "Error al eliminar usuario");
    }
  };

  const agregarUsuario = async () => {
    if (
      !nuevoUsuario.nombre ||
      !nuevoUsuario.apellido ||
      !nuevoUsuario.correo ||
      !nuevoUsuario.contrasena
    ) {
      notify("error", "Todos los campos son obligatorios");
      return;
    }
    try {
      const nuevo = await usuariosAPI.crear(nuevoUsuario);
      setUsuarios((prev) => [...prev, nuevo]);
      setModalAgregarOpen(false);
      setNuevoUsuario({
        nombre: "",
        apellido: "",
        correo: "",
        contrasena: "",
        rol: "docente",
      });
      notify("success", "Usuario creado");
    } catch (error) {
      notify("error", "No se pudo agregar el usuario: " + error.message);
    }
  };

  const rolLabel = (rol) => {
    const r = (rol || "").toLowerCase();
    if (r === "administrativo") return "Administrador";
    if (r === "docente") return "Docente";
    return rol;
  };

  return (
    <AdminLayout
      title="Usuarios del sistema"
      subtitle="Registra docentes y otros administradores. Un docente puede ser tutor de un curso al crear o editar el curso."
    >
      <div className="table-container">
        <div className="docentes-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="section-title">Directorio</h2>
            <input
              className="table-search"
              type="text"
              placeholder="Buscar por nombre, correo o rol"
              value={busquedaUsuarios}
              onChange={(e) => setBusquedaUsuarios(e.target.value)}
              style={{ marginTop: 8, maxWidth: 420 }}
            />
          </div>
          <button
            type="button"
            className="btn-add-docente usuarios-add-user-btn"
            onClick={() => setModalAgregarOpen(true)}
          >
            <UserPlus size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
            <span className="usuarios-add-user-label">Añadir usuario</span>
          </button>
        </div>

        {cargandoUsuarios && <p>Cargando usuarios...</p>}
        {errorUsuarios && (
          <p className="error-state">No se pudieron cargar los usuarios.</p>
        )}

        {!cargandoUsuarios && !errorUsuarios && (
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Apellidos</th>
                  <th>Nombres</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.apellido}</td>
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td>
                    <span className={`admin-status-pill admin-status-role-${String(u.rol || "").toLowerCase()}`}>
                      {rolLabel(u.rol)}
                    </span>
                  </td>
                  <td className="plantillas-academicas-actions">
                    <div className="plantillas-academicas-actions-row materias-base-actions">
                      <button
                        type="button"
                        className="btn-view btn-inline-icon"
                        onClick={() => abrirEditarModal(u)}
                      >
                        <Pencil size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-inline-icon"
                        onClick={() => eliminarUsuario(u)}
                      >
                        <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    {busquedaUsuarios
                      ? "No hay coincidencias"
                      : "No hay usuarios registrados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalEditarOpen && usuarioEditar && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight usuarios-modal">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={cerrarEditarModal}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3>Editar usuario</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={usuarioEditar.nombre}
              onChange={(e) =>
                setUsuarioEditar({ ...usuarioEditar, nombre: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Apellido"
              value={usuarioEditar.apellido}
              onChange={(e) =>
                setUsuarioEditar({ ...usuarioEditar, apellido: e.target.value })
              }
            />
            <input
              type="email"
              placeholder="Correo"
              value={usuarioEditar.correo}
              onChange={(e) =>
                setUsuarioEditar({ ...usuarioEditar, correo: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Nueva contraseña (opcional)"
              value={usuarioEditar.contrasena}
              onChange={(e) =>
                setUsuarioEditar({
                  ...usuarioEditar,
                  contrasena: e.target.value,
                })
              }
            />
            <CustomSelect
              value={usuarioEditar.rol}
              onChange={(value) =>
                setUsuarioEditar({ ...usuarioEditar, rol: value })
              }
              options={[
                { value: "docente", label: "Docente" },
                { value: "administrativo", label: "Administrador" },
              ]}
              placeholder="Rol"
              className="custom-select-white"
            />
            <div className="modal-buttons">
              <button
                type="button"
                className="btn-view btn-inline-icon"
                onClick={cerrarEditarModal}
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                type="button"
                className="btn-success btn-inline-icon"
                onClick={editarUsuario}
              >
                <Save size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAgregarOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight usuarios-modal">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalAgregarOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3>Añadir usuario</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoUsuario.nombre}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Apellido"
              value={nuevoUsuario.apellido}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, apellido: e.target.value })
              }
            />
            <input
              type="email"
              placeholder="Correo"
              value={nuevoUsuario.correo}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={nuevoUsuario.contrasena}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })
              }
            />
            <CustomSelect
              value={nuevoUsuario.rol}
              onChange={(value) =>
                setNuevoUsuario({ ...nuevoUsuario, rol: value })
              }
              options={[
                { value: "docente", label: "Docente" },
                { value: "administrativo", label: "Administrador" },
              ]}
              placeholder="Rol"
              className="custom-select-white"
            />
            <div className="modal-buttons">
              <button
                type="button"
                className="btn-view btn-inline-icon"
                onClick={() => setModalAgregarOpen(false)}
              >
                <X size={14} />
                Cancelar
              </button>
              <button type="button" className="btn-success btn-inline-icon" onClick={agregarUsuario}>
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

export default UsuariosAdmin;
