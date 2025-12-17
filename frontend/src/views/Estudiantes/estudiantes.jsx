import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/estudiante.css";

function Estudiantes() {
  const { id } = useParams(); // ID DEL CURSO
  const navigate = useNavigate();

  const [curso, setCurso] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [menuUsuario, setMenuUsuario] = useState(false);

  // ================= SIMULACIÓN DE ROL =================
  const rolUsuario = "Admin"; // "Admin" o "Docente"

  // ================= BASE DE DATOS =================
  useEffect(() => {
    const cursosBD = [
      { id: "1", nombre: "2do Ciencias A" },
      { id: "2", nombre: "3ro Técnico B" },
      { id: "3", nombre: "1ro Ciencias C" },
    ];

    const estudiantesBD = {
      "1": [
        { id: 1, nombre: "Ana Torres", numeroR: "09999999999", nota: 8.7 },
        { id: 2, nombre: "Luis Pérez", numeroR: "09999999999", nota: 7.9 },
      ],
      "2": [
        { id: 3, nombre: "María Gómez", numeroR: "09999999999", nota: 9.1 },
        { id: 4, nombre: "Carlos Vera", numeroR: "09999999999", nota: 8.3 },
        { id: 5, nombre: "Daniela Ruiz", numeroR: "09999999999", nota: 8.8 },
      ],
      "3": [
        { id: 6, nombre: "José Molina", numeroR: "09999999999", nota: 7.4 },
      ],
    };

    setCurso(cursosBD.find((c) => c.id === id));
    setEstudiantes(estudiantesBD[id] || []);
  }, [id]);

  // ------- CERRAR SESIÓN --------
  const cerrarSesion = () => {
    navigate("/");
  };

  return (
    <div className="estudiantes-page">
      {/* ------------------- NAVBAR ------------------- */}
      <div className="navbar-notas">
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

      <button className="btn-back" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <h1 className="page-title">
        Estudiantes inscritos – {curso?.nombre}
      </h1>

      {/* BOTÓN GENERAL PARA NOTAS */}
      <div className="acciones-curso">
        <button
          className="btn-notas"
          onClick={() => navigate(`/curso/${id}/notas`)}
        >
          {rolUsuario === "Docente"
            ? "Gestionar Notas"
            : "Ver Notas"}
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Nota Final</th>
              <th>Representante</th>
            </tr>
          </thead>

          <tbody>
            {estudiantes.map((e, index) => (
              <tr key={e.id}>
                <td>{index + 1}</td>
                <td>{e.nombre}</td>
                <td>{e.nota}</td>
                <td>{e.numeroR}</td>
              </tr>
            ))}

            {estudiantes.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No hay estudiantes inscritos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Estudiantes;
