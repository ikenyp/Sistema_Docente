import React, { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import { cursosAPI } from "../../services/api";

function MatriculacionAdmin() {
  const navigate = useNavigate();
  const [cursoSel, setCursoSel] = useState("");
  const [cursos, setCursos] = useState([]);

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
      title="Matriculación"
      subtitle="Este flujo fue absorbido por Estudiantes y por la ficha del curso para simplificar la operación diaria."
    >
      <div className="empty-state" style={{ marginBottom: 16 }}>
        <h3>La matrícula ya no se gestiona como módulo separado</h3>
        <p>
          Usa la pantalla de estudiantes para crear o mover alumnos de curso, o entra a un curso para revisar su grupo actual.
        </p>
      </div>

      <div className="dashboard-grid dashboard-grid-2 admin-action-grid">
        <button
          type="button"
          className="admin-action-card"
          onClick={() => navigate("/admin/estudiantes")}
        >
          <span className="admin-action-title">
            <Users size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Ir a estudiantes
          </span>
          <span className="admin-action-sub">Crear, editar y asignar curso desde el mismo formulario</span>
        </button>
          <div className="admin-action-card" style={{ cursor: "default" }}>
            <span className="admin-action-title">Abrir curso</span>
            <span className="admin-action-sub">Selecciona un curso y entra a su ficha para revisar su grupo actual</span>
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
              type="button"
              className="btn-view"
              disabled={!cursoSel}
              onClick={() => navigate(`/admin/cursos/${cursoSel}?tab=estudiantes`)}
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

export default MatriculacionAdmin;
