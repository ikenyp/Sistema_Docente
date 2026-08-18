import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Brush, Save, X, UserPlus } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { estudiantesAPI, cursosAPI } from "../../services/api";
import { notify } from "../../components/notify";

function EstudiantesAdmin() {
  const [searchParams] = useSearchParams();
  const [filtros, setFiltros] = useState({
    nombre: "",
    apellido: "",
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
        nombre: filtrosAplicados.nombre || undefined,
        apellido: filtrosAplicados.apellido || undefined,
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
      nombre: "",
      apellido: "",
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
      title="Estudiantes"
      subtitle="Registre y gestione estudiantes. La vinculación al curso ya se hace directamente aquí."
    >
      <div className="docentes-header">
        <h2 className="section-title">Estudiantes</h2>
        <button className="btn-add-docente" onClick={abrirCrear}>
          <UserPlus size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Añadir Estudiante
        </button>
      </div>

      <div className="panel-sub" style={{ marginBottom: 12 }}>
        Busca, filtra y asigna curso desde el mismo flujo sin una pantalla separada de matrícula.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Nombre"
          value={filtros.nombre}
          onChange={(e) =>
            setFiltros((prev) => ({
              ...prev,
              nombre: e.target.value,
              page: 1,
            }))
          }
        />
        <input
          placeholder="Apellido"
          value={filtros.apellido}
          onChange={(e) =>
            setFiltros((prev) => ({
              ...prev,
              apellido: e.target.value,
              page: 1,
            }))
          }
        />
        <select
          value={filtros.estado}
          onChange={(e) =>
            setFiltros((prev) => ({
              ...prev,
              estado: e.target.value,
              page: 1,
            }))
          }
        >
          <option value="">Todos</option>
          <option value="matriculado">Matriculado</option>
          <option value="retirado">Retirado</option>
          <option value="graduado">Graduado</option>
        </select>
        <select
          value={filtros.id_curso}
          onChange={(e) =>
            setFiltros((prev) => ({
              ...prev,
              id_curso: e.target.value,
              page: 1,
            }))
          }
        >
          <option value="">Curso (todos)</option>
          {cursos.map((c) => (
            <option key={c.id_curso} value={c.id_curso}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary"
          type="button"
          onClick={limpiarFiltros}
        >
          <Brush size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
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
                      className="btn-view"
                      onClick={() => abrirEditar(est)}
                    >
                      <Pencil size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
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
          <div className="admin-modal-content">
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
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="matriculado">Matriculado</option>
                <option value="retirado">Retirado</option>
                <option value="graduado">Graduado</option>
              </select>
            ) : (
              <input type="hidden" value="matriculado" />
            )}
            <select
              value={form.id_curso_actual}
              onChange={(e) =>
                setForm({ ...form, id_curso_actual: e.target.value })
              }
            >
              <option value="">Sin curso</option>
              {cursos.map((c) => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setModalOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button className="btn-save" onClick={guardar}>
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

export default EstudiantesAdmin;
