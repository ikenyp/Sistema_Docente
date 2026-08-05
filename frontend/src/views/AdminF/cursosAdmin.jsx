import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Save, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  cursosAPI,
  usuariosAPI,
  estudiantesAPI,
  estructurasAcademicasAPI,
} from "../../services/api";
import { notify } from "../../components/notify";

function CursosAdmin() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [estructuras, setEstructuras] = useState([]);
  const [conteoEstudiantes, setConteoEstudiantes] = useState({});
  const [filtroAnio, setFiltroAnio] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    anio_lectivo: "",
    id_estructura_academica: "",
    id_tutor: "",
  });

  const cargar = async () => {
    try {
      const [lc, lu, le] = await Promise.all([
        cursosAPI.listar({ size: 100 }),
        usuariosAPI.listar({ size: 100 }),
        estructurasAcademicasAPI.listar({ size: 100 }),
      ]);
      setCursos(lc || []);
      setUsuarios(lu || []);
      setEstructuras(le || []);

      const est = await estudiantesAPI.buscar({ size: 100 });
      const counts = {};
      (est || []).forEach((e) => {
        const id = e.id_curso_actual;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
      setConteoEstudiantes(counts);
    } catch (e) {
      notify("error", e.message || "Error al cargar cursos");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const aniosDisponibles = useMemo(() => {
    const set = new Set((cursos || []).map((c) => c.anio_lectivo).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [cursos]);

  useEffect(() => {
    if (!filtroAnio && aniosDisponibles.length > 0) {
      setFiltroAnio(aniosDisponibles[0]);
    }
  }, [aniosDisponibles, filtroAnio]);

  const cursosFiltrados = useMemo(() => {
    if (!filtroAnio) return cursos;
    return cursos.filter((c) => c.anio_lectivo === filtroAnio);
  }, [cursos, filtroAnio]);

  const nombreTutor = (id_tutor) => {
    if (!id_tutor) return "—";
    const u = usuarios.find((x) => x.id_usuario === id_tutor);
    return u ? `${u.nombre} ${u.apellido}` : `#${id_tutor}`;
  };

  const nombreEstructura = (id_estructura_academica) => {
    if (!id_estructura_academica) return "—";
    const estructura = estructuras.find(
      (item) => item.id_estructura_academica === id_estructura_academica,
    );
    return estructura ? estructura.nombre : `#${id_estructura_academica}`;
  };

  const agregarCurso = async () => {
    if (
      !nuevoCurso.nombre ||
      !nuevoCurso.anio_lectivo ||
      !nuevoCurso.id_estructura_academica
    ) {
      notify("error", "Nombre, año lectivo y estructura académica son obligatorios");
      return;
    }
    try {
      await cursosAPI.crear({
        nombre: nuevoCurso.nombre,
        anio_lectivo: nuevoCurso.anio_lectivo,
        id_estructura_academica: Number(nuevoCurso.id_estructura_academica),
        id_tutor: nuevoCurso.id_tutor ? parseInt(nuevoCurso.id_tutor, 10) : null,
      });
      setModalOpen(false);
      setNuevoCurso({
        nombre: "",
        anio_lectivo: "",
        id_estructura_academica: "",
        id_tutor: "",
      });
      cargar();
      notify("success", "Curso creado");
    } catch {
      notify("error", "No se pudo crear el curso");
    }
  };

  return (
    <AdminLayout
      title="Cursos"
      subtitle="Cada curso pertenece a un año lectivo. Entra a un curso para ver estudiantes, docentes y consultas académicas."
    >
      <div className="table-container">
        <div className="docentes-header">
          <div className="header-actions">
            <label className="admin-inline-label">
              Año lectivo
              <select
                value={filtroAnio}
                onChange={(e) => setFiltroAnio(e.target.value)}
              >
                <option value="">Todos</option>
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="btn-add-docente"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Añadir curso
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Curso</th>
              <th>Año lectivo</th>
              <th>Estructura</th>
              <th>Tutor</th>
              <th>Estudiantes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cursosFiltrados.map((c) => (
              <tr key={c.id_curso}>
                <td>{c.nombre}</td>
                <td>{c.anio_lectivo}</td>
                <td>{nombreEstructura(c.id_estructura_academica)}</td>
                <td>{nombreTutor(c.id_tutor)}</td>
                <td>{conteoEstudiantes[c.id_curso] ?? 0}</td>
                <td>
<button
                      type="button"
                      className="btn-view"
                      onClick={() => navigate(`/admin/cursos/${c.id_curso}`)}
                    >
                      <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                      Abrir curso
                    </button>
                </td>
              </tr>
            ))}
            {cursosFiltrados.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No hay cursos para este filtro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3>Añadir curso</h3>
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
              placeholder="Año lectivo (ej. 2025-2026)"
              value={nuevoCurso.anio_lectivo}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, anio_lectivo: e.target.value })
              }
            />
            <select
              value={nuevoCurso.id_estructura_academica}
              onChange={(e) =>
                setNuevoCurso({
                  ...nuevoCurso,
                  id_estructura_academica: e.target.value,
                })
              }
            >
              <option value="">Estructura académica</option>
              {estructuras.map((estructura) => (
                <option
                  key={estructura.id_estructura_academica}
                  value={estructura.id_estructura_academica}
                >
                  {estructura.nombre}
                </option>
              ))}
            </select>
            <select
              value={nuevoCurso.id_tutor}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, id_tutor: e.target.value })
              }
            >
              <option value="">Tutor a cargo (opcional)</option>
              {usuarios
                .filter((u) => (u.rol || "").toLowerCase() === "docente")
                .map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
            </select>
            <div className="modal-buttons">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setModalOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button type="button" className="btn-save" onClick={agregarCurso}>
                <Save size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default CursosAdmin;
