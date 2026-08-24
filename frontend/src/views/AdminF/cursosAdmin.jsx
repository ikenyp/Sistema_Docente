import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Save, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import {
  aniosLectivosAPI,
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
  const [aniosLectivos, setAniosLectivos] = useState([]);
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    id_estructura_academica: "",
    id_tutor: "",
  });

  const normalizarAnioLectivo = (valor) => {
    if (!valor) return "";
    if (/^\d{4}$/.test(valor)) {
      return `${valor}-${Number(valor) + 1}`;
    }
    return valor;
  };

  const cargar = useCallback(async () => {
    try {
      const [lc, lu, le] = await Promise.all([
        cursosAPI.listar({ size: 100 }),
        usuariosAPI.listar({ size: 100 }),
        estructurasAcademicasAPI.listar({ size: 100 }),
      ]);
      setCursos(lc || []);
      setUsuarios(lu || []);
      setEstructuras(le || []);

      try {
        const al = await aniosLectivosAPI.listar();
        setAniosLectivos((al || []).map((item) => normalizarAnioLectivo(item.anio_lectivo)).filter(Boolean));
      } catch {
        setAniosLectivos([]);
      }

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
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aniosDisponibles = useMemo(() => {
    const fuente = aniosLectivos.length > 0 ? aniosLectivos : (cursos || []).map((c) => normalizarAnioLectivo(c.anio_lectivo));
    const set = new Set(fuente.filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [cursos, aniosLectivos]);

  useEffect(() => {
    if (!filtroAnio && aniosDisponibles.length > 0) {
      const anioPreferido = aniosDisponibles.find((anio) => anio.includes("-"));
      setFiltroAnio(anioPreferido || aniosDisponibles[0]);
    }
  }, [aniosDisponibles, filtroAnio]);

  useEffect(() => {
    if (filtroAnio && !aniosDisponibles.includes(filtroAnio)) {
      setFiltroAnio(aniosDisponibles[0] || "");
    }
  }, [aniosDisponibles, filtroAnio]);

  const cursosFiltrados = useMemo(() => {
    if (!filtroAnio) return cursos;
    return cursos.filter(
      (c) => normalizarAnioLectivo(c.anio_lectivo) === filtroAnio,
    );
  }, [cursos, filtroAnio]);

  const opcionesAnio = useMemo(() => {
    return [
      { value: "__todos__", label: "Todos" },
      ...aniosDisponibles.map((a) => ({ value: a, label: a })),
    ];
  }, [aniosDisponibles]);

  const anioLectivoCurso = useMemo(
    () => localStorage.getItem("anio_lectivo_activo") || aniosDisponibles[0] || "",
    [aniosDisponibles],
  );

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
    if (!nuevoCurso.nombre || !nuevoCurso.id_estructura_academica) {
      notify("error", "Nombre y estructura académica son obligatorios");
      return;
    }

    if (!anioLectivoCurso) {
      notify("error", "No hay un año lectivo activo para crear el curso");
      return;
    }

    try {
      await cursosAPI.crear({
        nombre: nuevoCurso.nombre,
        anio_lectivo: anioLectivoCurso,
        id_estructura_academica: Number(nuevoCurso.id_estructura_academica),
        id_tutor: nuevoCurso.id_tutor ? parseInt(nuevoCurso.id_tutor, 10) : null,
      });
      setModalOpen(false);
      setNuevoCurso({
        nombre: "",
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
      subtitle="Cada curso se crea con el año lectivo activo del sistema. Entra a un curso para ver estudiantes, docentes y consultas académicas."
    >
      <div className="table-container">
        <div className="docentes-header cursos-header">
          <div className="cursos-year-block">
            <label className="admin-inline-label cursos-year-label">
              Año lectivo
            </label>
            <div className="cursos-year-display">
              <span>{filtroAnio || aniosDisponibles[0] || "Sin año seleccionado"}</span>
            </div>
            <div className="cursos-year-helper">Se usará para cursos nuevos</div>
          </div>
          <button
            type="button"
            className="btn-add-docente btn-inline-icon btn-add-course-wrap"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} />
            <span>Añadir<br />curso</span>
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Curso</th>
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
                <td colSpan="5" style={{ textAlign: "center" }}>
                  No hay cursos para este filtro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="admin-modal cursos-modal">
          <div className="admin-modal-content admin-modal-tight">
            <button type="button" className="admin-modal-close-btn" onClick={() => setModalOpen(false)} aria-label="Cerrar modal">
              <X size={14} />
            </button>
            <h3>Añadir curso</h3>
            <input
              type="text"
              placeholder="Nombre del curso"
              value={nuevoCurso.nombre}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, nombre: e.target.value })
              }
            />
            <div className="cursos-year-display cursos-year-display-modal">
              <span>{anioLectivoCurso || "Sin año lectivo activo"}</span>
            </div>
            <p style={{ marginTop: -2, marginBottom: 10, fontSize: "0.85rem", color: "#6b7a99" }}>
              Se tomará automáticamente como año del curso.
            </p>
            <CustomSelect
              value={nuevoCurso.id_estructura_academica}
              onChange={(value) =>
                setNuevoCurso({
                  ...nuevoCurso,
                  id_estructura_academica: value,
                })
              }
              options={estructuras.map((estructura) => ({
                value: String(estructura.id_estructura_academica),
                label: estructura.nombre,
              }))}
              placeholder="Estructura académica"
              className="custom-select-white cursos-form-select"
            />
            <CustomSelect
              value={nuevoCurso.id_tutor}
              onChange={(value) =>
                setNuevoCurso({ ...nuevoCurso, id_tutor: value })
              }
              options={[
                { value: "", label: "Tutor a cargo (opcional)" },
                ...usuarios
                  .filter((u) => (u.rol || "").toLowerCase() === "docente")
                  .map((u) => ({
                    value: String(u.id_usuario),
                    label: `${u.nombre} ${u.apellido}`,
                  })),
              ]}
              placeholder="Tutor a cargo (opcional)"
              className="custom-select-white cursos-form-select"
            />
            <div className="modal-buttons cursos-modal-buttons">
              <button
                type="button"
                className="btn-neutral btn-inline-icon"
                onClick={() => setModalOpen(false)}
              >
                <X size={14} />
                Cancelar
              </button>
              <button type="button" className="btn-success btn-inline-icon" onClick={agregarCurso}>
                <Save size={14} />
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
