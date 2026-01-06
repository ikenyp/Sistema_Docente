import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";
import { cursosAPI, estudiantesAPI, promediosAPI } from "../../services/api";

function PromediosAdmin() {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);

  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [estudiantes, setEstudiantes] = useState([]);
  const [estSel, setEstSel] = useState("");

  const [anio, setAnio] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [modo, setModo] = useState("trimestral"); // trimestral | final
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setCursos((await cursosAPI.listar({ size: 100 })) || []);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        setEstudiantes(
          (await estudiantesAPI.buscar({
            id_curso: cursoSel || undefined,
            size: 200,
          })) || []
        );
        setEstSel("");
      } catch {}
    })();
  }, [cursoSel]);

  const calcular = async () => {
    if (!cursoSel || !estSel || !anio) {
      alert("Seleccione curso, estudiante y año lectivo");
      return;
    }
    try {
      if (modo === "trimestral") {
        const res = await promediosAPI.obtenerTrimestral(
          Number(estSel),
          Number(cursoSel),
          Number(trimestre),
          anio
        );
        setResultado(res);
      } else {
        const res = await promediosAPI.obtenerFinal(
          Number(estSel),
          Number(cursoSel),
          anio
        );
        setResultado(res);
      }
    } catch (e) {
      alert(e.message || "No se pudo obtener el promedio");
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
        <h2 className="section-title">Promedios</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <select
            value={cursoSel}
            onChange={(e) => setCursoSel(e.target.value)}
          >
            <option value="">Curso</option>
            {cursos.map((c) => (
              <option key={c.id_curso} value={c.id_curso}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select value={estSel} onChange={(e) => setEstSel(e.target.value)}>
            <option value="">Estudiante</option>
            {estudiantes.map((e) => (
              <option key={e.id_estudiante} value={e.id_estudiante}>
                {e.nombre} {e.apellido}
              </option>
            ))}
          </select>
          <input
            placeholder="Año lectivo (ej. 2025-2026)"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
          <select value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="trimestral">Trimestral</option>
            <option value="final">Final</option>
          </select>
        </div>

        {modo === "trimestral" && (
          <div style={{ marginBottom: 16 }}>
            <select
              value={trimestre}
              onChange={(e) => setTrimestre(e.target.value)}
            >
              <option value="1">Trimestre 1</option>
              <option value="2">Trimestre 2</option>
              <option value="3">Trimestre 3</option>
            </select>
          </div>
        )}

        <button className="btn-view" onClick={calcular}>
          Calcular
        </button>

        <div className="table-container" style={{ marginTop: 16 }}>
          <h3>Resultado</h3>
          {resultado ? (
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(resultado, null, 2)}
            </pre>
          ) : (
            <p>Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromediosAdmin;
