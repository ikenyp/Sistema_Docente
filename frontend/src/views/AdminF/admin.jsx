import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";

function Admin() {
  const navigate = useNavigate();

  // ====== Estados ======
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);

  // Modal roles
  const [modalOpen, setModalOpen] = useState(false);
  const [accion, setAccion] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

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
        const res = await fetch("http://localhost:8000/api/usuarios/usuarios");
        if (!res.ok) throw new Error("Error al traer los usuarios");
        const data = await res.json();
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
        const res = await fetch("http://localhost:8000/api/cursos/cursos");
        if (!res.ok) throw new Error("Error al traer cursos");
        const data = await res.json();
        setCursos(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCursos();
  }, []);

  // ====== Modal asignar/quitar tutor ======
  const abrirModal = (usuario, tipo) => {
    setUsuarioSeleccionado(usuario);
    setAccion(tipo);
    setModalOpen(true);
  };

  const confirmarAccion = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/usuarios/usuarios/${usuarioSeleccionado.id_usuario}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rol: accion === "asignar" ? "tutor" : "docente" }),
        }
      );

      if (!res.ok) throw new Error("Error al actualizar el rol");

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id_usuario === usuarioSeleccionado.id_usuario
            ? { ...u, rol: accion === "asignar" ? "tutor" : "docente" }
            : u
        )
      );
      setModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el rol");
    }
  };

  // ====== Modal añadir usuario ======
  const abrirAgregarModal = () => setModalAgregarOpen(true);
  const cerrarAgregarModal = () => {
    setModalAgregarOpen(false);
    setNuevoUsuario({ nombre: "", apellido: "", correo: "", contrasena: "", rol: "docente" });
  };

  const agregarUsuario = async () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.apellido || !nuevoUsuario.correo || !nuevoUsuario.contrasena) {
      alert("Todos los campos son obligatorios");
      return;
    }
    try {
      const res = await fetch("http://localhost:8000/api/usuarios/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoUsuario),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const mensaje = errorData.detail
          ? typeof errorData.detail === "string"
            ? errorData.detail
            : JSON.stringify(errorData.detail)
          : "Error al agregar usuario";
        throw new Error(mensaje);
      }

      const nuevo = await res.json();
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
    setNuevoCurso({ nombre: "", anio_lectivo: "", id_docente: "", id_tutor: "" });
  };

  const agregarCurso = async () => {
    if (!nuevoCurso.nombre || !nuevoCurso.anio_lectivo || !nuevoCurso.id_docente) {
      alert("Nombre, año lectivo y docente son obligatorios");
      return;
    }
    try {
      const res = await fetch("http://localhost:8000/api/cursos/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoCurso),
      });

      if (!res.ok) throw new Error("Error al agregar curso");
      const curso = await res.json();
      setCursos((prev) => [...prev, curso]);
      cerrarAgregarCursoModal();
    } catch (error) {
      console.error(error);
      alert("No se pudo agregar el curso");
    }
  };

  // ====== Cerrar sesión ======
  const cerrarSesion = () => navigate("/");

  // ====== JSX ======
  return (
    <div className="admin-page">
      {/* NAVBAR */}
      <div className="navbar-admin">
        <div className="menu-icon">☰</div>
        <div className="navbar-user" onClick={() => setMenuUsuario(!menuUsuario)}>
          Keny Elan Nieto Plua
        </div>
        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      <div className="admin-container">
        <h1 className="admin-title">Panel del Administrador</h1>

        {/* USUARIOS */}
        <div className="docentes-header">
          <h2 className="section-title">Usuarios Registrados</h2>
          <button className="btn-add-docente" onClick={abrirAgregarModal}>
            Añadir Usuario
          </button>
        </div>

        {cargandoUsuarios && <p>Cargando usuarios...</p>}
        {errorUsuarios && <p style={{ color: "red", textAlign: "center" }}>No se pudieron cargar los usuarios registrados</p>}

        {!cargandoUsuarios && !errorUsuarios && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
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
                      {u.rol === "tutor" ? (
                        <button className="btn-danger" onClick={() => abrirModal(u, "quitar")}>Quitar Tutor</button>
                      ) : (
                        <button className="btn-success" onClick={() => abrirModal(u, "asignar")}>Asignar Tutor</button>
                      )}
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
          <button className="btn-add-docente" onClick={abrirAgregarCursoModal}>Añadir Curso</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Estudiantes</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.estudiantes}</td>
                  <td>
                    <button className="btn-view" onClick={() => navigate(`/curso/${c.id}/notas`)}>
                      Ver Estudiantes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TUTOR */}
      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>{accion === "asignar" ? "Asignar rol de Tutor" : "Quitar rol de Tutor"}</h3>
            <p>{`¿Deseas ${accion === "asignar" ? "asignar" : "quitar"} el rol de tutor a ${usuarioSeleccionado.nombre}?`}</p>
            <div className="modal-buttons">
              <button className="btn-success" onClick={confirmarAccion}>Confirmar</button>
              <button className="btn-danger" onClick={() => setModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR USUARIO */}
      {modalAgregarOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Añadir Usuario</h3>
            <input type="text" placeholder="Nombre" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} />
            <input type="text" placeholder="Apellido" value={nuevoUsuario.apellido} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellido: e.target.value })} />
            <input type="email" placeholder="Correo" value={nuevoUsuario.correo} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })} />
            <input type="password" placeholder="Contraseña" value={nuevoUsuario.contrasena} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })} />
            <div className="modal-buttons">
              <button className="btn-save" onClick={agregarUsuario}>Guardar</button>
              <button className="btn-cancel" onClick={cerrarAgregarModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR CURSO */}
      {modalAgregarCursoOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Añadir Curso</h3>
            <input type="text" placeholder="Nombre del curso" value={nuevoCurso.nombre} onChange={(e) => setNuevoCurso({ ...nuevoCurso, nombre: e.target.value })} />
            <input type="text" placeholder="Año lectivo" value={nuevoCurso.anio_lectivo} onChange={(e) => setNuevoCurso({ ...nuevoCurso, anio_lectivo: e.target.value })} />
            
            <select value={nuevoCurso.id_docente} onChange={(e) => setNuevoCurso({ ...nuevoCurso, id_docente: e.target.value })}>
              <option value="">Selecciona un docente</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido}</option>
              ))}
            </select>

            <select value={nuevoCurso.id_tutor} onChange={(e) => setNuevoCurso({ ...nuevoCurso, id_tutor: e.target.value })}>
              <option value="">Selecciona un tutor (opcional)</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido}</option>
              ))}
            </select>

            <div className="modal-buttons">
              <button className="btn-save" onClick={agregarCurso}>Guardar</button>
              <button className="btn-cancel" onClick={cerrarAgregarCursoModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Admin;
