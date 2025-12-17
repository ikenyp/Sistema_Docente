import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/notas.css";

function NotasCurso() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [menuUsuario, setMenuUsuario] = useState(false);
  const [curso, setCurso] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);

  // ================= ROL (SIMULADO) =================
  const rolUsuario = "Admin"; // "Admin" | "Docente"
  const puedeEditar = rolUsuario === "Docente";

  useEffect(() => {
    const cursosBD = [
      { id: "1", nombre: "2do Ciencias A" },
      { id: "2", nombre: "3ro Técnico B" },
      { id: "3", nombre: "1ro Ciencias C" },
    ];

    const estudiantesBD = {
      "1": [
        { id: 1, nombre: "Ana Torres", nota: 8.7 },
        { id: 2, nombre: "Luis Pérez", nota: 7.9 },
      ],
      "2": [
        { id: 3, nombre: "María Gómez", nota: 9.1 },
        { id: 4, nombre: "Carlos Vera", nota: 8.3 },
        { id: 6, nombre: "Daniela Ruiz", nota: 9.5 },

      ],
      "3": [{ id: 5, nombre: "José Molina", nota: 7.4 }],
    };

    setCurso(cursosBD.find((c) => c.id === id));
    setEstudiantes(estudiantesBD[id] || []);
  }, [id]);

  const cerrarSesion = () => navigate("/");

  const actualizarNota = (idEst, valor) => {
    if (!puedeEditar) return;

    setEstudiantes((prev) =>
      prev.map((e) =>
        e.id === idEst ? { ...e, nota: valor } : e
      )
    );
  };

  return (
    <div className="notas-page">
      {/* ================= NAVBAR ================= */}
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
        Notas del curso – {curso?.nombre}
      </h1>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Nota Final</th>
            </tr>
          </thead>

          <tbody>
            {estudiantes.map((e, index) => (
              <tr key={e.id}>
                <td>{index + 1}</td>
                <td>{e.nombre}</td>
                <td>
                  {puedeEditar ? (
                    <input
                      type="number"
                      value={e.nota}
                      min="0"
                      max="10"
                      step="0.1"
                      className="input-nota"
                      onChange={(ev) =>
                        actualizarNota(e.id, ev.target.value)
                      }
                    />
                  ) : (
                    <span className="nota-texto">{e.nota}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*  SOLO PARA DOCENTE */}
      {puedeEditar && (
        <button
          className="btn-guardar"
          onClick={() => alert("Notas guardadas (simulado)")}
        >
          Guardar Cambios
        </button>
      )}
    </div>
  );
}

export default NotasCurso;
