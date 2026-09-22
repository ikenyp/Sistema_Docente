import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Brush, Save, X, UserPlus, Upload } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import ImportarEstudiantesModal from "../../components/estudiantes/ImportarEstudiantesModal";
import { estudiantesAPI, cursosAPI, listarTodasLasPaginas } from "../../services/api";
import { notify } from "../../components/notify";
import { nombrePersona } from "../../utils/personas";
import { normalizarAnioLectivo } from "../../utils/anioLectivo";

function EstudiantesAdmin() {
  const [searchParams] = useSearchParams();
  const [anioActivo, setAnioActivo] = useState(() =>
    normalizarAnioLectivo(localStorage.getItem(`anio_lectivo_activo:institucional:${localStorage.getItem("contexto_activo") || "sin-contexto"}`) || ""),
  );
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    id_curso: "",
    page: 1,
    size: 10,
  });

  const [data, setData] = useState([]);
  const [totalFiltrados, setTotalFiltrados] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [cursos, setCursos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    fecha_nacimiento: "",
    estado: "matriculado",
    id_curso_actual: "",
  });

  const puedeRetroceder = useMemo(() => filtros.page > 1, [filtros.page]);
  const puedeAvanzar = useMemo(
    () => filtros.page * filtros.size < totalFiltrados,
    [filtros.page, filtros.size, totalFiltrados],
  );

  const cursosAnioActivo = useMemo(
    () =>
      anioActivo
        ? cursos.filter((c) => normalizarAnioLectivo(c.anio_lectivo) === anioActivo)
        : cursos,
    [anioActivo, cursos],
  );

  const cargarCursos = async () => {
    try {
      const lista = await listarTodasLasPaginas(cursosAPI.listar);
      setCursos(lista || []);
    } catch (e) {
      // silencioso
    }
  };

  const cargarConFiltros = useCallback(async (filtrosAplicados) => {
    setCargando(true);
    setError("");
    try {
      const resultados = [];
      let page = 1;
      while (true) {
        const lote = await estudiantesAPI.buscar({
          nombre: filtrosAplicados.busqueda || undefined,
          apellido: filtrosAplicados.busqueda || undefined,
          estado: filtrosAplicados.estado || undefined,
          id_curso: filtrosAplicados.id_curso && filtrosAplicados.id_curso !== "sin_curso"
            ? filtrosAplicados.id_curso
            : undefined,
          page,
          size: 100,
        });

        if (!Array.isArray(lote) || lote.length === 0) break;
        resultados.push(...lote);
        if (lote.length < 100) break;
        page += 1;
      }

      const mapa = new Map();
      resultados.forEach((est) => {
        if (est?.id_estudiante) mapa.set(est.id_estudiante, est);
      });
      const idsCursosAnioActivo = new Set(
        cursosAnioActivo.map((curso) => String(curso.id_curso)),
      );
      const filtrados = Array.from(mapa.values()).filter((estudiante) => {
        const perteneceAlAnio = !anioActivo || (
          normalizarAnioLectivo(estudiante.anio_lectivo) === anioActivo ||
          idsCursosAnioActivo.has(String(estudiante.id_curso_actual))
        );
        if (!perteneceAlAnio) return false;
        if (filtrosAplicados.id_curso === "sin_curso") {
          return estudiante.id_curso_actual === null || estudiante.id_curso_actual === undefined;
        }
        return true;
      });
      filtrados.sort((a, b) => {
        const apellido = (a?.apellido || "").localeCompare(b?.apellido || "", "es", { sensitivity: "base" });
        if (apellido !== 0) return apellido;
        return (a?.nombre || "").localeCompare(b?.nombre || "", "es", { sensitivity: "base" });
      });
      const inicio = (filtrosAplicados.page - 1) * filtrosAplicados.size;
      setTotalFiltrados(filtrados.length);
      setData(filtrados.slice(inicio, inicio + filtrosAplicados.size));
    } catch (e) {
      setError(e.message || "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, [anioActivo, cursosAnioActivo]);

  const formatValue = (v) => {
    if (v === null || v === undefined) return "";
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    )
      return String(v);
    try {
      if (Array.isArray(v))
        return v
          .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
          .join(", ");
      if (typeof v === "object") {
        if (v.nombre || v.apellido)
          return nombrePersona(v);
        return JSON.stringify(v);
      }
      return String(v);
    } catch (e) {
      return String(v);
    }
  };

  const normalizeEstado = (v) => {
    if (!v && v !== "") return "matriculado";
    const s = String(v).toLowerCase();
    const map = {
      activo: "matriculado",
      inactivo: "retirado",
    };
    return map[s] || s;
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  useEffect(() => {
    const cursoQ = searchParams.get("curso");
    if (cursoQ) {
      setFiltros((prev) => ({ ...prev, id_curso: cursoQ, page: 1 }));
    }
  }, [searchParams]);

  useEffect(() => {
    const syncAnio = () => {
      setAnioActivo(
        normalizarAnioLectivo(localStorage.getItem(`anio_lectivo_activo:institucional:${localStorage.getItem("contexto_activo") || "sin-contexto"}`) || ""),
      );
    };
    syncAnio();
    window.addEventListener("storage", syncAnio);
    return () => window.removeEventListener("storage", syncAnio);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarConFiltros(filtros);
    }, 250);
    return () => clearTimeout(timeout);
  }, [filtros, cargarConFiltros]);

  const limpiarFiltros = () => {
    const base = {
      busqueda: "",
      estado: "",
      id_curso: "",
      page: 1,
      size: filtros.size,
    };
    setFiltros(base);
    cargarConFiltros(base);
  };

  const abrirCrear = () => {
    setEditando(null);
    const cursoPrefijado = searchParams.get("curso") || filtros.id_curso || "";
    setForm({
      nombre: "",
      apellido: "",
      cedula: "",
      fecha_nacimiento: "",
      estado: "matriculado",
      id_curso_actual: cursoPrefijado,
    });
    setModalOpen(true);
  };

  const abrirEditar = (est) => {
    setEditando(est);
    setForm({
      nombre: est.nombre,
      apellido: est.apellido,
      cedula: est.cedula,
      fecha_nacimiento: est.fecha_nacimiento?.slice(0, 10) || "",
      estado: normalizeEstado(est.estado),
      id_curso_actual: est.id_curso_actual || "",
    });
    setModalOpen(true);
  };

  const guardar = async () => {
    try {
      const estadoValue = editando
        ? normalizeEstado(form.estado)
        : "matriculado";

      const payload = {
        nombre: form.nombre,
        apellido: form.apellido,
        cedula: String(form.cedula || ""),
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        estado: estadoValue,
        id_curso_actual: form.id_curso_actual
          ? Number(form.id_curso_actual)
          : null,
      };

      if (editando) {
        await estudiantesAPI.actualizar(editando.id_estudiante, payload);
      } else {
        await estudiantesAPI.crear(payload);
      }
      setModalOpen(false);
      await cargarConFiltros(filtros);
      notify("success", editando ? "Estudiante actualizado" : "Estudiante creado");
    } catch (e) {
      notify("error", e.message || "Error al guardar");
    }
  };

  return (
    <AdminLayout
      title=""
      subtitle=""
    >
      <div className="docentes-header">
        <h2 className="section-title">Directorio de estudiantes</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn-view btn-inline-icon" onClick={() => setModalImportOpen(true)} type="button">
            <Upload size={16} />
            <span>Importar Excel</span>
          </button>
          <button className="btn-add-docente btn-inline-icon btn-add-student-wrap" onClick={abrirCrear} type="button">
            <UserPlus size={16} />
            <span>Añadir<br />Estudiante</span>
          </button>
        </div>
      </div>

      <div className="panel-sub" style={{ marginBottom: 12 }}>
        Registre, busque, filtre y gestione estudiantes
      </div>

      {anioActivo && (
        <div className="cursos-year-helper cursos-filter-helper" style={{ marginBottom: 10 }}>
          Año lectivo activo: {anioActivo}
        </div>
      )}

      <div className="estudiantes-filters">
        <input
          placeholder="Buscar por nombre o apellido"
          value={filtros.busqueda}
          onChange={(e) =>
            setFiltros((prev) => ({
              ...prev,
              busqueda: e.target.value,
              page: 1,
            }))
          }
        />
        <CustomSelect
          value={filtros.id_curso}
          onChange={(value) =>
            setFiltros((prev) => ({
              ...prev,
              id_curso: value,
              page: 1,
            }))
          }
          options={[
            { value: "", label: "Todos los cursos" },
            { value: "sin_curso", label: "Sin curso" },
            ...cursosAnioActivo.map((c) => ({
              value: String(c.id_curso),
              label: c.nombre,
            })),
          ]}
          placeholder="Todos los cursos"
          className="custom-select-white"
        />
        <CustomSelect
          value={filtros.estado}
          onChange={(value) =>
            setFiltros((prev) => ({
              ...prev,
              estado: value,
              page: 1,
            }))
          }
          options={[
            { value: "", label: "Todos los estados" },
            { value: "matriculado", label: "Matriculado" },
            { value: "retirado", label: "Retirado" },
            { value: "graduado", label: "Graduado" },
          ]}
          placeholder="Todos los estados"
          className="custom-select-white"
        />
        <button
          className="btn-neutral btn-inline-icon estudiantes-clear-btn"
          type="button"
          onClick={limpiarFiltros}
        >
          <Brush size={14} />
          Limpiar
        </button>
      </div>

      <div className="table-container">
        {cargando ? (
          <p>Cargando...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <table className="materias-base-table estudiantes-table">
            <thead>
              <tr>
                <th>Apellidos</th>
                <th>Nombres</th>
                <th>Cédula</th>
                <th>Estado</th>
                <th>Curso actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((est) => (
                <tr key={est.id_estudiante}>
                  <td>{formatValue(est.apellido)}</td>
                  <td>{formatValue(est.nombre)}</td>
                  <td>{formatValue(est.cedula)}</td>
                  <td>
                    <span className={`admin-status-pill admin-status-student-${normalizeEstado(est.estado)}`}>
                      {normalizeEstado(est.estado).charAt(0).toUpperCase() + normalizeEstado(est.estado).slice(1)}
                    </span>
                  </td>
                  <td>
                    {formatValue(
                      cursos.find((c) => c.id_curso === est.id_curso_actual)
                        ?.nombre || "-",
                    )}
                  </td>
                  <td className="plantillas-academicas-actions">
                    <div className="plantillas-academicas-actions-row materias-base-actions">
                      <button
                        className="btn-view btn-inline-icon"
                        onClick={() => abrirEditar(est)}
                      >
                        <Pencil size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No hay estudiantes con los filtros actuales
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          className="btn-view"
          disabled={!puedeRetroceder}
          onClick={() =>
            setFiltros((prev) => ({ ...prev, page: prev.page - 1 }))
          }
        >
          Anterior
        </button>
        <span style={{ alignSelf: "center" }}>Página {filtros.page}</span>
        <button
          className="btn-view"
          disabled={!puedeAvanzar}
          onClick={() =>
            setFiltros((prev) => ({ ...prev, page: prev.page + 1 }))
          }
        >
          Siguiente
        </button>
      </div>

      {modalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight estudiantes-modal">
            <button type="button" className="admin-modal-close-btn" onClick={() => setModalOpen(false)} aria-label="Cerrar modal">
              <X size={14} />
            </button>
            <h3>{editando ? "Editar Estudiante" : "Crear Estudiante"}</h3>
            <input
              placeholder="Nombres"
              maxLength={50}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value.slice(0, 50) })}
            />
            <input
              placeholder="Apellidos"
              maxLength={50}
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value.slice(0, 50) })}
            />
            <input
              placeholder="Cédula"
              inputMode="numeric"
              maxLength={10}
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
            {editando ? (
              <CustomSelect
                value={form.estado}
                onChange={(value) => setForm({ ...form, estado: value })}
                options={[
                  { value: "matriculado", label: "Matriculado" },
                  { value: "retirado", label: "Retirado" },
                  { value: "graduado", label: "Graduado" },
                ]}
                placeholder="Estado"
                className="custom-select-white estudiantes-modal-select"
              />
            ) : (
              <input type="hidden" value="matriculado" />
            )}
            <CustomSelect
              value={form.id_curso_actual}
              onChange={(value) =>
                setForm({ ...form, id_curso_actual: value })
              }
              options={[
                { value: "", label: "Sin curso" },
                ...cursosAnioActivo.map((c) => ({
                  value: String(c.id_curso),
                  label: c.nombre,
                })),
              ]}
              placeholder="Sin curso"
              className="custom-select-white estudiantes-modal-select"
            />
            <div className="modal-buttons">
              <button
                className="btn-neutral btn-inline-icon"
                onClick={() => setModalOpen(false)}
              >
                <X size={14} />
                Cancelar
              </button>
              <button className="btn-success btn-inline-icon" onClick={guardar}>
                <Save size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportarEstudiantesModal
        open={modalImportOpen}
        onClose={() => setModalImportOpen(false)}
      onSaved={() => cargarConFiltros(filtros)}
      cursos={cursosAnioActivo}
      mostrarCurso
      titulo="Importar estudiantes"
      subtitulo="Carga un archivo Excel, revisa cada fila y guarda solo cuando todo esté listo."
    />
    </AdminLayout>
  );
}

export default EstudiantesAdmin;
