import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usuariosAPI, cursosAPI } from "../../services/api";
import "../../styles/admin.css";

function Admin() {
  const navigate = useNavigate();

  const [datosUsuario, setDatosUsuario] = useState(null);

  // ====== Estados ======
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);

  // Modal editar usuario
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  // Modal añadir usuario
  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    rol: "docente",
  });

  // Modal añadir curso
  const [modalAgregarCursoOpen, setModalAgregarCursoOpen] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    anio_lectivo: "",
    id_docente: "",
    id_tutor: "",
  });

  // Otros
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState(false);

  // ====== Traer usuarios ======
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const usuarioJSON = localStorage.getItem("usuario");
        const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
        if (usuario) setDatosUsuario(usuario);

        const data = await usuariosAPI.listar();
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

  // ====== Traer cursos ======
  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const data = await cursosAPI.listar();
        setCursos(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCursos();
  }, []);

  // ====== Modal editar usuario ======
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
      alert("Nombre, apellido y correo son obligatorios");
      return;
    }
    try {
      const body = {
        nombre: usuarioEditar.nombre,
        apellido: usuarioEditar.apellido,
        correo: usuarioEditar.correo,
        rol: usuarioEditar.rol,
      };

      // Solo incluir contraseña si se ingresó una nueva
      if (usuarioEditar.contrasena) {
        body.contrasena = usuarioEditar.contrasena;
      }

      const usuarioActualizado = await usuariosAPI.actualizar(
        usuarioEditar.id_usuario,
        body
      );
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id_usuario === usuarioEditar.id_usuario ? usuarioActualizado : u
        )
      );
      cerrarEditarModal();
    } catch (error) {
      console.error(error);
      alert("No se pudo editar el usuario: " + error.message);
    }
  };

  // ====== Eliminar usuario ======
  const eliminarUsuario = async (usuario) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar a ${usuario.nombre} ${usuario.apellido}?`
      )
    ) {
      return;
    }

    try {
      await usuariosAPI.eliminar(usuario.id_usuario);
      setUsuarios((prev) =>
        prev.filter((u) => u.id_usuario !== usuario.id_usuario)
      );
      alert("Usuario eliminado exitosamente");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // ====== Modal añadir usuario ======
  const abrirAgregarModal = () => setModalAgregarOpen(true);
  const cerrarAgregarModal = () => {
    setModalAgregarOpen(false);
    setNuevoUsuario({
      nombre: "",
      apellido: "",
      correo: "",
      contrasena: "",
      rol: "docente",
    });
  };

  const agregarUsuario = async () => {
    if (
      !nuevoUsuario.nombre ||
      !nuevoUsuario.apellido ||
      !nuevoUsuario.correo ||
      !nuevoUsuario.contrasena
    ) {
      alert("Todos los campos son obligatorios");
      return;
    }
    try {
      const nuevo = await usuariosAPI.crear(nuevoUsuario);
      setUsuarios((prev) => [...prev, nuevo]);
      cerrarAgregarModal();
    } catch (error) {
      console.error(error);
      alert("No se pudo agregar el usuario: " + error.message);
    }
  };

  // ====== Modal añadir curso ======
  const abrirAgregarCursoModal = () => setModalAgregarCursoOpen(true);
  const cerrarAgregarCursoModal = () => {
    setModalAgregarCursoOpen(false);
    setNuevoCurso({
      nombre: "",
      anio_lectivo: "",
      id_docente: "",
      id_tutor: "",
    });
  };

  const agregarCurso = async () => {
    if (!nuevoCurso.nombre || !nuevoCurso.anio_lectivo) {
      alert("Nombre y año lectivo son obligatorios");
      return;
    }
    try {
      const curso = await cursosAPI.crear({
        nombre: nuevoCurso.nombre,
        anio_lectivo: nuevoCurso.anio_lectivo,
        id_tutor: nuevoCurso.id_tutor ? parseInt(nuevoCurso.id_tutor) : null,
      });
      setCursos((prev) => [...prev, curso]);
      cerrarAgregarCursoModal();
    } catch (error) {
      console.error(error);
      alert("No se pudo agregar el curso");
    }
  };

  // ====== Cerrar sesión ======
  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  // ====== JSX ======
  return (
    <div className="admin-page">
      {/* NAVBAR */}
      <div className="navbar-admin">
        <h1 className="titulo-admin">📚 Sistema Docente</h1>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Administrador"}
        </div>
        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      <div className="admin-container">
        <h1 className="admin-title">Panel del Administrador</h1>

        <div className="table-container" style={{ marginTop: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <button
              className="btn-view"
              onClick={() => navigate("/admin/estudiantes")}
            >
              Gestionar Estudiantes
            </button>
            <button
              className="btn-view"
              onClick={() => navigate("/admin/materias")}
            >
              Gestionar Materias
            </button>
            <button
              className="btn-view"
              onClick={() => navigate("/admin/asignaciones")}
            >
              Asignar Docentes a Cursos/Materias
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
              maxWidth: "600px",
              margin: "16px auto 0",
            }}
          >
            {/* <button
              className="btn-view"
              onClick={() => navigate("/admin/matriculacion")}
            >
              Matricular Estudiantes a Cursos
            </button> */}
            <button
              className="btn-view"
              onClick={() => navigate("/admin/lecturas")}
            >
              Ver Notas/Asistencia/Comportamiento
            </button>
            <button
              className="btn-view"
              onClick={() => navigate("/admin/promedios")}
            >
              Vista de Promedios
            </button>
          </div>
        </div>

        {/* USUARIOS */}
        <div className="docentes-header">
          <h2 className="section-title">Usuarios Registrados</h2>
          <button className="btn-add-docente" onClick={abrirAgregarModal}>
            Añadir Usuario
          </button>
        </div>

        {cargandoUsuarios && <p>Cargando usuarios...</p>}
        {errorUsuarios && (
          <p style={{ color: "red", textAlign: "center" }}>
            No se pudieron cargar los usuarios registrados
          </p>
        )}

        {!cargandoUsuarios && !errorUsuarios && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombres</th>
                  <th>Apellidos</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario}>
                    <td>{u.nombre}</td>
                    <td>{u.apellido}</td>
                    <td>{u.correo}</td>
                    <td>{u.rol}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => abrirEditarModal(u)}
                        style={{ marginRight: "8px" }}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => eliminarUsuario(u)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CURSOS */}
        <div className="docentes-header">
          <h2 className="section-title">Cursos Disponibles</h2>
          <button className="btn-add-docente" onClick={abrirAgregarCursoModal}>
            Añadir Curso
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Año Lectivo</th>
                <th>Estudiantes</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.anio_lectivo}</td>
                  <td>{c.estudiantes}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => navigate(`Notas/notasCurso/`)}
                    >
                      Ver Estudiantes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDITAR USUARIO */}
      {modalEditarOpen && usuarioEditar && (
        <div className="modal">
          <div className="modal-content">
            <h3>Editar Usuario</h3>
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
              placeholder="Nueva Contraseña (dejar vacío para mantener)"
              value={usuarioEditar.contrasena}
              onChange={(e) =>
                setUsuarioEditar({
                  ...usuarioEditar,
                  contrasena: e.target.value,
                })
              }
            />
            <select
              value={usuarioEditar.rol}
              onChange={(e) =>
                setUsuarioEditar({ ...usuarioEditar, rol: e.target.value })
              }
            >
              <option value="docente">Docente</option>
              <option value="tutor">Tutor</option>
              <option value="admin">Administrador</option>
            </select>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={cerrarEditarModal}>
                Cancelar
              </button>
              <button className="btn-save" onClick={editarUsuario}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR USUARIO */}
      {modalAgregarOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Añadir Usuario</h3>
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
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={cerrarAgregarModal}>
                Cancelar
              </button>
              <button className="btn-save" onClick={agregarUsuario}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR CURSO */}
      {modalAgregarCursoOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Añadir Curso</h3>
            <input
              type="text"
              placeholder="Nombre del curso"
              value={nuevoCurso.nombre}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, nombre: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Año lectivo"
              value={nuevoCurso.anio_lectivo}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, anio_lectivo: e.target.value })
              }
            />

            <select
              value={nuevoCurso.id_tutor}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, id_tutor: e.target.value })
              }
            >
              <option value="">Selecciona un tutor (opcional)</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </select>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={cerrarAgregarCursoModal}>
                Cancelar
              </button>
              <button className="btn-save" onClick={agregarCurso}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
