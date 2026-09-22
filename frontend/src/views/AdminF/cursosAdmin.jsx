import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderOpen, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import {
  aniosLectivosAPI,
  cursosAPI,
  asignacionesAPI,
  usuariosAPI,
  estudiantesAPI,
  estructurasAcademicasAPI,
  listarTodasLasPaginas,
} from "../../services/api";
import { notify, requestConfirm } from "../../components/notify";
import { nombrePersona } from "../../utils/personas";
import { normalizarAnioLectivo } from "../../utils/anioLectivo";

function CursosAdmin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cursos, setCursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [estructuras, setEstructuras] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [conteoEstudiantes, setConteoEstudiantes] = useState({});
  const [filtroAnio, setFiltroAnio] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [cursoEditando, setCursoEditando] = useState(null);
  const [aniosLectivos, setAniosLectivos] = useState([]);
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    id_estructura_academica: "",
    id_tutor: "",
  });
  const filtroAlerta = searchParams.get("filtro") || "";

  const cargar = useCallback(async () => {
    try {
      const [lc, lu, le] = await Promise.all([
        listarTodasLasPaginas(cursosAPI.listar),
        listarTodasLasPaginas(usuariosAPI.listar),
        listarTodasLasPaginas(estructurasAcademicasAPI.listar),
      ]);
      setCursos(lc || []);
      setUsuarios(lu || []);
      setEstructuras(le || []);
      try {
        const la = await listarTodasLasPaginas(asignacionesAPI.listar);
        setAsignaciones(la || []);
      } catch {
        setAsignaciones([]);
      }

      try {
        const al = await aniosLectivosAPI.listar();
        setAniosLectivos((al || []).map((item) => normalizarAnioLectivo(item.anio_lectivo)).filter(Boolean));
      } catch {
        setAniosLectivos([]);
      }

      const est = await listarTodasLasPaginas(estudiantesAPI.buscar);
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
    let lista = cursos;
    if (filtroAnio) {
      lista = lista.filter(
      (c) => normalizarAnioLectivo(c.anio_lectivo) === filtroAnio,
      );
    }

    if (filtroAlerta === "sin-tutor") {
      lista = lista.filter((c) => !c.id_tutor);
    }

    if (filtroAlerta === "sin-estructura") {
      lista = lista.filter((c) => !c.id_estructura_academica);
    }

    if (filtroAlerta === "sin-materias") {
      const idsConAsignacion = new Set(asignaciones.map((a) => a.id_curso));
      lista = lista.filter((c) => !idsConAsignacion.has(c.id_curso));
    }

    return lista;
  }, [cursos, filtroAnio, filtroAlerta, asignaciones]);

  const anioLectivoCurso = useMemo(
    () => filtroAnio || localStorage.getItem("anio_lectivo_activo") || aniosDisponibles[0] || "",
    [aniosDisponibles, filtroAnio],
  );

  const nombreTutor = (id_tutor) => {
    if (!id_tutor) return "—";
    const u = usuarios.find((x) => x.id_usuario === id_tutor);
    return u ? nombrePersona(u) : `#${id_tutor}`;
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
      const datosCurso = {
        nombre: nuevoCurso.nombre,
        anio_lectivo: anioLectivoCurso,
        id_estructura_academica: Number(nuevoCurso.id_estructura_academica),
        id_tutor: nuevoCurso.id_tutor ? parseInt(nuevoCurso.id_tutor, 10) : null,
      };
      if (cursoEditando) {
        await cursosAPI.actualizar(cursoEditando.id_curso, {
          nombre: datosCurso.nombre,
          id_estructura_academica: datosCurso.id_estructura_academica,
          id_tutor: datosCurso.id_tutor,
        });
      } else {
        await cursosAPI.crear(datosCurso);
      }
      setModalOpen(false);
      setCursoEditando(null);
      setNuevoCurso({
        nombre: "",
        id_estructura_academica: "",
        id_tutor: "",
      });
      cargar();
      notify("success", cursoEditando ? "Curso actualizado" : "Curso creado");
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("Ya existe un curso con ese nombre")) {
        notify("error", "Ese curso ya existe en el año lectivo actual");
        return;
      }
      notify("error", msg || "No se pudo crear el curso");
    }
  };

  const abrirEditarCurso = (curso) => {
    setCursoEditando(curso);
    setNuevoCurso({
      nombre: curso.nombre || "",
      id_estructura_academica: curso.id_estructura_academica ? String(curso.id_estructura_academica) : "",
      id_tutor: curso.id_tutor ? String(curso.id_tutor) : "",
    });
    setModalOpen(true);
  };

  const eliminarCurso = async (curso) => {
    const ok = await requestConfirm("Eliminar curso", {
      title: "Eliminar Curso",
      name: curso.nombre,
      description: "Esta acción no se puede deshacer.",
      note: "Si el curso tiene información relacionada, la eliminación puede fallar.",
    });
    if (!ok) return;

    try {
      await cursosAPI.eliminar(curso.id_curso);
      await cargar();
      notify("success", "Curso eliminado");
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar el curso");
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
          {filtroAlerta && (
            <div className="cursos-year-helper cursos-filter-helper">
              Filtro activo: {filtroAlerta === "sin-tutor" ? "sin tutor" : filtroAlerta === "sin-estructura" ? "sin estructura" : "sin materias"}
            </div>
          )}
        </div>
          <button
            type="button"
            className="btn-add-docente btn-inline-icon btn-add-course-wrap"
            onClick={() => {
              setCursoEditando(null);
              setNuevoCurso({ nombre: "", id_estructura_academica: "", id_tutor: "" });
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Añadir<br />curso</span>
          </button>
        </div>

        <table className="cursos-table">
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
                       className="btn-success btn-inline-icon cursos-open-btn"
                      onClick={() => navigate(`/admin/cursos/${c.id_curso}`)}
                    >
                      <FolderOpen size={14} />
                      Abrir curso
                    </button>
                    <button
                      type="button"
                       className="btn-view btn-inline-icon cursos-edit-btn"
                      onClick={() => abrirEditarCurso(c)}
                    >
                       <Pencil size={14} />
                       Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-inline-icon cursos-delete-btn"
                      onClick={() => eliminarCurso(c)}
                      aria-label={`Eliminar curso ${c.nombre}`}
                      title={`Eliminar curso ${c.nombre}`}
                    >
                      <Trash2 size={16} />
                      Eliminar
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
            <h3>{cursoEditando ? "Editar curso" : "Añadir curso"}</h3>
            <input
              type="text"
              placeholder="Nombre del curso"
              value={nuevoCurso.nombre}
              onChange={(e) =>
                setNuevoCurso({ ...nuevoCurso, nombre: e.target.value })
              }
            />
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
              searchable
              searchPlaceholder="Buscar estructura..."
              menuMaxHeight={220}
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
                    label: nombrePersona(u),
                  })),
              ]}
              placeholder="Tutor a cargo (opcional)"
              className="custom-select-white cursos-form-select"
              searchable
              searchPlaceholder="Buscar docente..."
              menuMaxHeight={220}
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
                {cursoEditando ? "Guardar cambios" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default CursosAdmin;
