import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import { cursosAPI } from "../../services/api";

function AsignacionesAdmin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");

  useEffect(() => {
    const cursoQ = searchParams.get("curso");
    if (cursoQ) {
      setCursoSel(cursoQ);
    }
  }, [searchParams]);

  const cargarCursos = async () => {
    try {
      setCursos((await cursosAPI.listar({ size: 100 })) || []);
    } catch {}
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  return (
    <AdminLayout
      title="Asignaciones académicas"
      subtitle="La asignación de docentes ahora se gestiona principalmente dentro de cada curso, junto con sus materias heredadas por estructura."
    >
      <div className="empty-state" style={{ marginBottom: 16 }}>
        <h3>Ahora el flujo principal vive dentro del curso</h3>
        <p>
          Elige un curso y abre su pestaña de materias para asignar docentes a las materias que hereda desde la estructura académica.
        </p>
      </div>

      <div className="dashboard-grid dashboard-grid-2 admin-action-grid">
        <div className="admin-action-card" style={{ cursor: "default" }}>
          <span className="admin-action-title">
            <BookOpen size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Abrir curso para asignar docentes
          </span>
          <span className="admin-action-sub">Selecciona el curso y entra directo a su pestaña de materias</span>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <CustomSelect
              value={cursoSel}
              onChange={setCursoSel}
              options={cursos.map((c) => ({
                value: String(c.id_curso),
                label: c.nombre,
              }))}
              placeholder="Curso"
              className="custom-select-white"
            />
            <button
              className="btn-view"
              type="button"
              disabled={!cursoSel}
              onClick={() => navigate(`/admin/cursos/${cursoSel}?tab=materias`)}
            >
              <ArrowRight size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
              Abrir
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AsignacionesAdmin;
