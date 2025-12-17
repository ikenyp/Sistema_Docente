import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css"
function Admin() {
  const navigate = useNavigate();

  const [docentes, setDocentes] = useState([]);
  const [cursos, setCursos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [accion, setAccion] = useState("");
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);

  const [menuUsuario, setMenuUsuario] = useState(false);

  // ------- SIMULACIÓN DE BD --------
  useEffect(() => {
    setDocentes([
      {
        id: 1,
        nombre: "Juan Pérez",
        email: "juan@example.com",
        cursos: 3,
        rol: "Docente",
      },
      {
        id: 2,
        nombre: "María López",
        email: "maria@example.com",
        cursos: 2,
        rol: "Tutor",
      },
      {
        id: 3,
        nombre: "Carlos Soto",
        email: "carlos@example.com",
        cursos: 4,
        rol: "Docente",
      },
    ]);

    setCursos([
      { id: 1, nombre: "2do Ciencias A", estudiantes: 26 },
      { id: 2, nombre: "3ro Técnico B", estudiantes: 31 },
      { id: 3, nombre: "1ro Ciencias C", estudiantes: 28 },
    ]);
  }, []);

  // ------- ABRIR MODAL --------
  const abrirModal = (docente, tipo) => {
    setDocenteSeleccionado(docente);
    setAccion(tipo);
    setModalOpen(true);
  };

  // ------- CONFIRMAR ACCIÓN --------
  const confirmarAccion = () => {
    setDocentes((prev) =>
      prev.map((d) =>
        d.id === docenteSeleccionado.id
          ? { ...d, rol: accion === "asignar" ? "Tutor" : "Docente" }
          : d
      )
    );

    setModalOpen(false);
  };

  // ------- CERRAR SESIÓN --------
  const cerrarSesion = () => {
    navigate("/");
  };

  return (
    <div className="admin-page">

      {/* ------------------- NAVBAR ------------------- */}
      <div className="navbar-admin">

        <div className="menu-icon">☰</div>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          Keny Elan Nieto Plua 
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      {/* ---------------- CONTENIDO ---------------- */}
      <div className="admin-container">

        <h1 className="admin-title">Panel del Administrador</h1>

        {/* ------------------- DOCENTES ------------------- */}
        <h2 className="section-title">Docentes Registrados</h2>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Cursos</th>
                <th>Rol</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {docentes.map((d) => (
                <tr key={d.id}>
                  <td>{d.nombre}</td>
                  <td>{d.email}</td>
                  <td>{d.cursos}</td>
                  <td>{d.rol}</td>

                  <td>
                    {d.rol === "Tutor" ? (
                      <button
                        className="btn-danger"
                        onClick={() => abrirModal(d, "quitar")}
                      >
                        Quitar Tutor
                      </button>
                    ) : (
                      <button
                        className="btn-success"
                        onClick={() => abrirModal(d, "asignar")}
                      >
                        Asignar Tutor
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ------------------- CURSOS ------------------- */}
        <h2 className="section-title">Cursos Disponibles</h2>

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
                      <button
                        className="btn-view"
                        onClick={() =>
                          navigate(`/admin/cursos/${c.id}/estudiantes`)
                        }
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

      {/* ------------------- MODAL ------------------- */}
      {modalOpen && (
        <div className="modal">
          <div className="modal-content">

            <h3 className="modal-title">
              {accion === "asignar"
                ? "Asignar rol de Tutor"
                : "Quitar rol de Tutor"}
            </h3>

            <p className="modal-text">
              {`¿Deseas ${
                accion === "asignar" ? "asignar" : "quitar"
              } el rol de tutor a ${docenteSeleccionado.nombre}?`}
            </p>

            <div className="modal-buttons">
              <button className="btn-success" onClick={confirmarAccion}>
                Confirmar
              </button>

              <button className="btn-danger" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Admin;
