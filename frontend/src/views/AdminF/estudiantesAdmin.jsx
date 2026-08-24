import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Brush, Save, X, UserPlus } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import { estudiantesAPI, cursosAPI } from "../../services/api";
import { notify } from "../../components/notify";

function EstudiantesAdmin() {
  const [searchParams] = useSearchParams();
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    id_curso: "",
    page: 1,
    size: 10,
  });

  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [cursos, setCursos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
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
    () => data.length === filtros.size,
    [data, filtros.size],
  );

  const cargarCursos = async () => {
    try {
      const lista = await cursosAPI.listar({ size: 100 });
      setCursos(lista || []);
    } catch (e) {
      // silencioso
    }
  };

  const cargarConFiltros = async (filtrosAplicados) => {
    setCargando(true);
    setError("");
    try {
      const res = await estudiantesAPI.buscar({
        nombre: filtrosAplicados.busqueda || undefined,
        apellido: filtrosAplicados.busqueda || undefined,
        estado: filtrosAplicados.estado || undefined,
        id_curso: filtrosAplicados.id_curso || undefined,
        page: filtrosAplicados.page,
        size: filtrosAplicados.size,
      });
      setData(res || []);
    } catch (e) {
      setError(e.message || "Error al cargar");
    } finally {
      setCargando(false);
    }
  };

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
          return `${v.nombre || ""} ${v.apellido || ""}`.trim();
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
    const timeout = setTimeout(() => {
      cargarConFiltros(filtros);
    }, 250);
    return () => clearTimeout(timeout);
  }, [filtros]);

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
      if (!form.fecha_nacimiento && !editando) {
        notify("error", "La fecha de nacimiento es obligatoria");
        return;
      }

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
      cargarConFiltros(filtros);
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
        <button className="btn-add-docente btn-inline-icon btn-add-student-wrap" onClick={abrirCrear}>
          <UserPlus size={16} />
          <span>Añadir<br />Estudiante</span>
        </button>
      </div>

      <div className="panel-sub" style={{ marginBottom: 12 }}>
        Registre, busque, filtre y gestione estudiantes
      </div>

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
            ...cursos.map((c) => ({
              value: String(c.id_curso),
              label: c.nombre,
            })),
          ]}
          placeholder="Todos los cursos"
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
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Cédula</th>
                <th>Estado</th>
                <th>Curso Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((est) => (
                <tr key={est.id_estudiante}>
                  <td>{formatValue(est.nombre)}</td>
                  <td>{formatValue(est.apellido)}</td>
                  <td>{formatValue(est.cedula)}</td>
                  <td>{formatValue(est.estado)}</td>
                  <td>
                    {formatValue(
                      cursos.find((c) => c.id_curso === est.id_curso_actual)
                        ?.nombre || "-",
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-view btn-inline-icon"
                      onClick={() => abrirEditar(est)}
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
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
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              placeholder="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
            <input
              placeholder="Cédula"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            />
            <input
              type="date"
              placeholder="Fecha Nacimiento"
              value={form.fecha_nacimiento}
              onChange={(e) =>
                setForm({ ...form, fecha_nacimiento: e.target.value })
              }
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
                ...cursos.map((c) => ({
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
    </AdminLayout>
  );
}

export default EstudiantesAdmin;
