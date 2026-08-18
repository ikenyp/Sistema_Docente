import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Search, Save, X, ArrowLeft } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { estructurasAcademicasAPI, materiasAPI } from "../../services/api";
import { notify, requestConfirm } from "../../components/notify";

function MateriasAdmin() {
  const [estructuras, setEstructuras] = useState([]);
  const [estructuraSeleccionada, setEstructuraSeleccionada] = useState("");
  const [materiasEstructura, setMateriasEstructura] = useState([]);
  const [estructuraModalOpen, setEstructuraModalOpen] = useState(false);
  const [estructuraEditando, setEstructuraEditando] = useState(null);
  const [estructuraForm, setEstructuraForm] = useState({
    nombre: "",
    nivel: "",
    subnivel: "",
    modalidad: "",
    especialidad: "",
  });
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [filtros, setFiltros] = useState({ nombre: "", page: 1, size: 10 });
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "" });

  const puedeRetroceder = useMemo(() => filtros.page > 1, [filtros.page]);
  const puedeAvanzar = useMemo(
    () => data.length === filtros.size,
    [data, filtros.size],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const res = await materiasAPI.listar({
        nombre: filtros.nombre || undefined,
        page: filtros.page,
        size: filtros.size,
      });
      setData(res || []);
    } catch (e) {
      setError(e.message || "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, [filtros.nombre, filtros.page, filtros.size]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const buscar = (e) => {
    e.preventDefault();
    setFiltros({ ...filtros, page: 1 });
    cargar();
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({ nombre: "" });
    setModalOpen(true);
  };

  const abrirCrearEstructura = () => {
    setEstructuraEditando(null);
    setEstructuraForm({
      nombre: "",
      nivel: "",
      subnivel: "",
      modalidad: "",
      especialidad: "",
    });
    setEstructuraModalOpen(true);
  };

  const abrirEditarEstructura = (estructura) => {
    setEstructuraEditando(estructura);
    setEstructuraForm({
      nombre: estructura.nombre || "",
      nivel: estructura.nivel || "",
      subnivel: estructura.subnivel || "",
      modalidad: estructura.modalidad || "",
      especialidad: estructura.especialidad || "",
    });
    setEstructuraModalOpen(true);
  };

  const abrirEditar = (m) => {
    setEditando(m);
    setForm({ nombre: m.nombre });
    setModalOpen(true);
  };

  const cargarEstructuras = async () => {
    try {
      const lista = await estructurasAcademicasAPI.listar({ size: 100 });
      setEstructuras(lista || []);
    } catch (e) {
      notify("error", e.message || "No se pudieron cargar las estructuras");
    }
  };

  const cargarMateriasEstructura = async (idEstructura) => {
    if (!idEstructura) {
      setMateriasEstructura([]);
      return;
    }
    try {
      const lista = await estructurasAcademicasAPI.listarMaterias(idEstructura);
      setMateriasEstructura(lista || []);
    } catch (e) {
      notify(
        "error",
        e.message || "No se pudieron cargar las materias de la estructura",
      );
    }
  };

  const guardar = async () => {
    try {
      if (editando) await materiasAPI.actualizar(editando.id_materia, form);
      else await materiasAPI.crear(form);
      setModalOpen(false);
      cargar();
    } catch (e) {
      notify("error", e.message || "Error al guardar");
    }
  };

  const guardarEstructura = async () => {
    try {
      if (!estructuraForm.nombre || !estructuraForm.nivel) {
        notify("error", "Nombre y nivel son obligatorios");
        return;
      }

      if (estructuraEditando) {
        await estructurasAcademicasAPI.actualizar(
          estructuraEditando.id_estructura_academica,
          estructuraForm,
        );
      } else {
        await estructurasAcademicasAPI.crear(estructuraForm);
      }
      setEstructuraModalOpen(false);
      await cargarEstructuras();
    } catch (e) {
      notify("error", e.message || "No se pudo guardar la estructura");
    }
  };

  const agregarMateriaAEstructura = async () => {
    if (!estructuraSeleccionada || !materiaSeleccionada) {
      notify("error", "Selecciona una estructura y una materia base");
      return;
    }
    try {
      await estructurasAcademicasAPI.agregarMateria(estructuraSeleccionada, {
        id_materia: Number(materiaSeleccionada),
        orden: materiasEstructura.length + 1,
        obligatoria: true,
      });
      setMateriaSeleccionada("");
      await cargarMateriasEstructura(estructuraSeleccionada);
    } catch (e) {
      notify("error", e.message || "No se pudo agregar la materia");
    }
  };

  const quitarMateriaDeEstructura = async (idMateria) => {
    if (!estructuraSeleccionada) return;
    const ok = await requestConfirm("¿Retirar esta materia de la estructura?");
    if (!ok) return;
    try {
      await estructurasAcademicasAPI.eliminarMateria(estructuraSeleccionada, idMateria);
      await cargarMateriasEstructura(estructuraSeleccionada);
    } catch (e) {
      notify("error", e.message || "No se pudo retirar la materia");
    }
  };

  const eliminar = async (m) => {
    const ok = await requestConfirm("¿Eliminar esta materia?");
    if (!ok) return;
    try {
      await materiasAPI.eliminar(m.id_materia);
      cargar();
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar");
    }
  };

  useEffect(() => {
    cargarEstructuras();
  }, []);

  useEffect(() => {
    cargarMateriasEstructura(estructuraSeleccionada);
  }, [estructuraSeleccionada]);

  return (
    <AdminLayout
      title="Estructura académica"
      subtitle="Administre plantillas académicas, materias base y las materias que corresponden a cada estructura."
    >
      <div className="dashboard-grid dashboard-grid-2 admin-action-grid" style={{ marginBottom: 16 }}>
        <button className="admin-action-card" type="button" onClick={abrirCrearEstructura}>
          <span className="admin-action-title">Nueva estructura</span>
          <span className="admin-action-sub">Nivel, modalidad y especialidad</span>
        </button>
        <button className="admin-action-card" type="button" onClick={abrirCrear}>
          <span className="admin-action-title">Nueva materia base</span>
          <span className="admin-action-sub">Catálogo reutilizable para varias estructuras</span>
        </button>
      </div>

      <div className="dashboard-grid dashboard-grid-2" style={{ alignItems: "start", gap: 16 }}>
        <div className="table-container">
          <div className="docentes-header">
            <h2 className="section-title">Estructuras</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Nivel</th>
                <th>Modalidad</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {estructuras.map((estructura) => (
                <tr key={estructura.id_estructura_academica}>
                  <td>{estructura.nombre}</td>
                  <td>{estructura.nivel}</td>
                  <td>{estructura.modalidad || "—"}</td>
                  <td>
                    <button
                      className="btn-view"
                      type="button"
                      onClick={() => setEstructuraSeleccionada(estructura.id_estructura_academica)}
                    >
                      Abrir
                    </button>{" "}
                    <button
                      className="btn-view"
                      type="button"
                      onClick={() => abrirEditarEstructura(estructura)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {estructuras.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    Aún no hay estructuras creadas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-container">
          <div className="docentes-header">
            <h2 className="section-title">Materias base</h2>
          </div>

          <form
            onSubmit={buscar}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <input
              placeholder="Nombre"
              value={filtros.nombre}
              onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
            />
            <button className="btn-view" type="submit">
              <Search size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
              Buscar
            </button>
          </form>

          {cargando ? (
            <p>Cargando...</p>
          ) : error ? (
            <p style={{ color: "red" }}>{error}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id_materia}>
                    <td>{m.nombre}</td>
                    <td>
                      <button className="btn-view" onClick={() => abrirEditar(m)}>
                        <Pencil size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                        Editar
                      </button>{" "}
                      <button className="btn-danger" onClick={() => eliminar(m)}>
                        <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: "center" }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel-divider" />

      <div className="table-container">
        <div className="docentes-header">
          <h2 className="section-title">Materias por estructura</h2>
          <div className="header-actions">
            <select
              value={estructuraSeleccionada}
              onChange={(e) => setEstructuraSeleccionada(e.target.value)}
            >
              <option value="">Seleccione estructura</option>
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
              value={materiaSeleccionada}
              onChange={(e) => setMateriaSeleccionada(e.target.value)}
              disabled={!estructuraSeleccionada}
            >
              <option value="">Seleccione materia base</option>
              {data.map((materia) => (
                <option key={materia.id_materia} value={materia.id_materia}>
                  {materia.nombre}
                </option>
              ))}
            </select>
            <button
              className="btn-save"
              type="button"
              disabled={!estructuraSeleccionada || !materiaSeleccionada}
              onClick={agregarMateriaAEstructura}
            >
              Añadir materia
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Materia</th>
              <th>Obligatoria</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {materiasEstructura.map((item) => (
              <tr key={item.id_estructura_materia}>
                <td>{item.orden}</td>
                <td>{item.materia?.nombre || `#${item.id_materia}`}</td>
                <td>{item.obligatoria ? "Sí" : "No"}</td>
                <td>
                  <button
                    className="btn-danger"
                    type="button"
                    onClick={() => quitarMateriaDeEstructura(item.id_materia)}
                  >
                    Retirar
                  </button>
                </td>
              </tr>
            ))}
            {materiasEstructura.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  {estructuraSeleccionada
                    ? "Esta estructura aún no tiene materias asociadas"
                    : "Seleccione una estructura para ver y asociar materias"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          className="btn-view"
          disabled={!puedeRetroceder}
          onClick={() => setFiltros({ ...filtros, page: filtros.page - 1 })}
        >
          <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
          Anterior
        </button>
        <span style={{ alignSelf: "center" }}>Página {filtros.page}</span>
        <button
          className="btn-view"
          disabled={!puedeAvanzar}
          onClick={() => setFiltros({ ...filtros, page: filtros.page + 1 })}
        >
          Siguiente
        </button>
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editando ? "Editar Materia" : "Crear Materia"}</h3>
            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
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

      {estructuraModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3>
              {estructuraEditando
                ? "Editar estructura académica"
                : "Crear estructura académica"}
            </h3>
            <input
              placeholder="Nombre visible"
              value={estructuraForm.nombre}
              onChange={(e) =>
                setEstructuraForm({ ...estructuraForm, nombre: e.target.value })
              }
            />
            <input
              placeholder="Nivel (ej: Básica, Bachillerato)"
              value={estructuraForm.nivel}
              onChange={(e) =>
                setEstructuraForm({ ...estructuraForm, nivel: e.target.value })
              }
            />
            <input
              placeholder="Subnivel (ej: 8vo EGB, 1ro BGU)"
              value={estructuraForm.subnivel}
              onChange={(e) =>
                setEstructuraForm({ ...estructuraForm, subnivel: e.target.value })
              }
            />
            <input
              placeholder="Modalidad (ej: Ciencias, Técnico)"
              value={estructuraForm.modalidad}
              onChange={(e) =>
                setEstructuraForm({ ...estructuraForm, modalidad: e.target.value })
              }
            />
            <input
              placeholder="Especialidad (opcional)"
              value={estructuraForm.especialidad}
              onChange={(e) =>
                setEstructuraForm({
                  ...estructuraForm,
                  especialidad: e.target.value,
                })
              }
            />
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setEstructuraModalOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button className="btn-save" onClick={guardarEstructura}>
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

export default MateriasAdmin;
