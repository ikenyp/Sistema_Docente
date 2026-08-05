import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clipboard } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { cursosAPI } from "../../services/api";

function ConsultasAdmin() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setCursos((await cursosAPI.listar({ size: 100 })) || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const abrir = () => {
    if (!cursoSel) return;
    navigate(`/admin/cursos/${cursoSel}?tab=consulta`);
  };

  return (
    <AdminLayout
      title="Consulta de curso"
      subtitle="Elija un curso para revisar estudiantes, notas, asistencia y promedios (solo lectura)."
    >
      <div className="table-container">
        <div className="empty-state" style={{ marginBottom: 16 }}>
          <h3>Paso 1: seleccione el curso</h3>
          <p>
            Toda la consulta académica se hace desde la ficha del curso, con el
            mismo contexto de año lectivo y paralelo.
          </p>
        </div>

        <div className="admin-consulta-filters">
          <select value={cursoSel} onChange={(e) => setCursoSel(e.target.value)}>
            <option value="">Curso</option>
            {cursos.map((c) => (
              <option key={c.id_curso} value={c.id_curso}>
                {c.nombre} ({c.anio_lectivo})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-view"
            disabled={!cursoSel}
            onClick={abrir}
          >
            <Search size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
            Abrir consulta
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!cursoSel}
            onClick={() => navigate(`/admin/cursos/${cursoSel}`)}
          >
            <Clipboard size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
            Ver ficha completa
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default ConsultasAdmin;
