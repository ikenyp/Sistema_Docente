import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  CircleMinus,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { estructurasAcademicasAPI, materiasAPI } from "../../services/api";
import { notify, requestConfirm } from "../../components/notify";

function MateriasAdmin() {
  const [estructuras, setEstructuras] = useState([]);
  const [estructuraSeleccionada, setEstructuraSeleccionada] = useState("");
  const [materiasEstructura, setMateriasEstructura] = useState([]);
  const [modalEditarEstructuraOpen, setModalEditarEstructuraOpen] = useState(false);
  const [modalConfigurarEstructuraOpen, setModalConfigurarEstructuraOpen] = useState(false);
  const [modalEliminarEstructuraOpen, setModalEliminarEstructuraOpen] = useState(false);
  const [modalNuevaMateriaEstructuraOpen, setModalNuevaMateriaEstructuraOpen] = useState(false);
  const [estructuraEditando, setEstructuraEditando] = useState(null);
  const [estructuraEliminando, setEstructuraEliminando] = useState(null);
  const [estructuraForm, setEstructuraForm] = useState({
    nombre: "",
    nivel: "",
    subnivel: "",
    modalidad: "",
    especialidad: "",
  });
  const [busquedaMateriaModal, setBusquedaMateriaModal] = useState("");
  const [catalogoMaterias, setCatalogoMaterias] = useState([]);
  const [catalogoCargando, setCatalogoCargando] = useState(false);
  const [catalogoError, setCatalogoError] = useState("");
  const [nuevaMateriaForm, setNuevaMateriaForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
  });
  const [filtros, setFiltros] = useState({ nombre: "", page: 1, size: 10 });
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ codigo: "", nombre: "", descripcion: "" });

  const puedeRetroceder = useMemo(() => filtros.page > 1, [filtros.page]);
  const puedeAvanzar = useMemo(
    () => data.length === filtros.size,
    [data, filtros.size],
  );

  const materiasCatalogoFiltradas = useMemo(() => {
    const q = busquedaMateriaModal.trim().toLowerCase();
    if (!q) return catalogoMaterias;
    return catalogoMaterias.filter((materia) => {
      const codigo = (materia.codigo || "").toLowerCase();
      const nombre = (materia.nombre || "").toLowerCase();
      const descripcion = (materia.descripcion || "").toLowerCase();
      return (
        codigo.includes(q) ||
        nombre.includes(q) ||
        descripcion.includes(q)
      );
    });
  }, [catalogoMaterias, busquedaMateriaModal]);

  const materiasCatalogoDisponibles = useMemo(
    () =>
      materiasCatalogoFiltradas.filter(
        (materia) => !materiasEstructura.some((item) => item.id_materia === materia.id_materia),
      ),
    [materiasCatalogoFiltradas, materiasEstructura],
  );

  const materiasSugeridas = useMemo(
    () => materiasCatalogoDisponibles.filter((materia) => (materia.uso_total || 0) > 0).slice(0, 6),
    [materiasCatalogoDisponibles],
  );

  const materiasCatalogoRestante = useMemo(
    () =>
      materiasCatalogoDisponibles.filter(
        (materia) => !materiasSugeridas.some((s) => s.id_materia === materia.id_materia),
      ),
    [materiasCatalogoDisponibles, materiasSugeridas],
  );

  const busquedaActiva = busquedaMateriaModal.trim().length > 0;

  const estructuraSeleccionadaObj = useMemo(
    () => estructuras.find((e) => String(e.id_estructura_academica) === estructuraSeleccionada) || null,
    [estructuras, estructuraSeleccionada],
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

  const cargarCatalogo = useCallback(async () => {
    setCatalogoCargando(true);
    setCatalogoError("");
    try {
      const lista = await materiasAPI.catalogo();
      setCatalogoMaterias(lista || []);
    } catch (e) {
      setCatalogoError(e.message || "No se pudo cargar el catálogo de materias");
    } finally {
      setCatalogoCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ codigo: "", nombre: "", descripcion: "" });
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
    setModalEditarEstructuraOpen(true);
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
    setModalEditarEstructuraOpen(true);
  };

  const abrirConfigurarEstructura = (estructura) => {
    setEstructuraSeleccionada(String(estructura.id_estructura_academica));
    setMateriasEstructura([]);
    setBusquedaMateriaModal("");
    cargarCatalogo();
    setModalConfigurarEstructuraOpen(true);
  };

  const abrirNuevaMateriaEstructura = () => {
    setNuevaMateriaForm({ codigo: "", nombre: "", descripcion: "" });
    setModalNuevaMateriaEstructuraOpen(true);
  };

  const abrirEliminarEstructura = (estructura) => {
    setEstructuraEliminando(estructura);
    setModalEliminarEstructuraOpen(true);
  };

  const abrirEditar = (m) => {
    setEditando(m);
    setForm({
      codigo: m.codigo || "",
      nombre: m.nombre || "",
      descripcion: m.descripcion || "",
    });
    setModalOpen(true);
  };

  const cargarEstructuras = async () => {
    try {
      const lista = await estructurasAcademicasAPI.listar({ size: 100 });
      setEstructuras(lista || []);
    } catch (e) {
      notify("error", e.message || "No se pudieron cargar las plantillas académicas");
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
        e.message || "No se pudieron cargar las materias de la plantilla",
      );
    }
  };

  const guardar = async () => {
    try {
      if (!form.nombre.trim()) {
        notify("error", "El nombre es obligatorio");
        return;
      }
      if (editando) await materiasAPI.actualizar(editando.id_materia, form);
      else await materiasAPI.crear(form);
      setModalOpen(false);
      cargar();
      await cargarCatalogo();
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
        const actualizada = await estructurasAcademicasAPI.actualizar(
          estructuraEditando.id_estructura_academica,
          estructuraForm,
        );
        setEstructuraEditando(actualizada);
      } else {
        await estructurasAcademicasAPI.crear(estructuraForm);
      }
      await cargarEstructuras();
      setModalEditarEstructuraOpen(false);
      notify("success", "Plantilla guardada");
    } catch (e) {
      notify("error", e.message || "No se pudo guardar la plantilla");
    }
  };

  const agregarMateriaAEstructura = async (idMateria) => {
    if (!estructuraSeleccionada || !idMateria) {
      notify("error", "Selecciona una plantilla y una materia del catálogo");
      return;
    }
    try {
      await estructurasAcademicasAPI.agregarMateria(estructuraSeleccionada, {
        id_materia: Number(idMateria),
        orden: materiasEstructura.length + 1,
        obligatoria: true,
      });
      await cargarMateriasEstructura(estructuraSeleccionada);
    } catch (e) {
      notify("error", e.message || "No se pudo agregar la materia");
    }
  };

  const crearYMateriaAEstructura = async () => {
    const nombre = nuevaMateriaForm.nombre.trim();
    if (!nombre) {
      notify("error", "Escribe el nombre de la materia");
      return;
    }
    try {
      const creada = await materiasAPI.crear({
        codigo: nuevaMateriaForm.codigo.trim(),
        nombre,
        descripcion: nuevaMateriaForm.descripcion.trim(),
      });
      setModalNuevaMateriaEstructuraOpen(false);
      setNuevaMateriaForm({ codigo: "", nombre: "", descripcion: "" });
      await cargar();
      await cargarCatalogo();
      await agregarMateriaAEstructura(creada.id_materia);
    } catch (e) {
      notify("error", e.message || "No se pudo crear la materia");
    }
  };

  const eliminarEstructura = async () => {
    if (!estructuraEliminando) return;
    try {
      await estructurasAcademicasAPI.eliminar(estructuraEliminando.id_estructura_academica);
      setModalEliminarEstructuraOpen(false);
      setEstructuraEliminando(null);
      if (estructuraSeleccionada === String(estructuraEliminando.id_estructura_academica)) {
        setEstructuraSeleccionada("");
        setMateriasEstructura([]);
        setModalConfigurarEstructuraOpen(false);
      }
      await cargarEstructuras();
      notify("success", "Plantilla eliminada");
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar la plantilla");
    }
  };

  const quitarMateriaDeEstructura = async (idMateria) => {
    if (!estructuraSeleccionada) return;
    const ok = await requestConfirm("¿Retirar esta materia de la plantilla?");
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
      await cargarCatalogo();
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar");
    }
  };

  useEffect(() => {
    cargarEstructuras();
  }, []);

  useEffect(() => {
    if (modalConfigurarEstructuraOpen) {
      cargarMateriasEstructura(estructuraSeleccionada);
    }
  }, [estructuraSeleccionada, modalConfigurarEstructuraOpen]);

  return (
    <AdminLayout
      title="Plantillas académicas"
      subtitle="Administre plantillas académicas, el catálogo de materias y las materias que corresponden a cada plantilla."
    >
      <div className="dashboard-grid" style={{ alignItems: "start", gap: 16 }}>
        <div className="table-container">
          <div className="docentes-header table-header-actions">
            <h2 className="section-title">Plantillas académicas</h2>
            <button
              className="btn-add-docente btn-inline-icon btn-add-structure-wrap"
              type="button"
              onClick={abrirCrearEstructura}
            >
              <Plus size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
              <span>Nueva<br />plantilla</span>
            </button>
          </div>
          <table className="plantillas-academicas-table">
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Nivel</th>
                <th>Modalidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estructuras.map((estructura) => (
                <tr key={estructura.id_estructura_academica}>
                  <td>{estructura.nombre}</td>
                  <td>{estructura.nivel}</td>
                  <td>{estructura.modalidad || "—"}</td>
                    <td className="plantillas-academicas-actions">
                      <div className="plantillas-academicas-actions-row">
                        <button
                          className="btn-view btn-inline-icon"
                          type="button"
                          onClick={() => abrirEditarEstructura(estructura)}
                        >
                          <Pencil size={14} style={{ verticalAlign: "middle" }} />
                          Editar
                        </button>
                        <button
                          className="btn-success btn-inline-icon"
                          type="button"
                          onClick={() => abrirConfigurarEstructura(estructura)}
                        >
                          <SlidersHorizontal size={14} style={{ verticalAlign: "middle" }} />
                          Materias
                        </button>
                        <button
                          className="btn-danger btn-inline-icon"
                          type="button"
                          onClick={() => abrirEliminarEstructura(estructura)}
                        >
                          <Trash2 size={14} style={{ verticalAlign: "middle" }} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                </tr>
              ))}
              {estructuras.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    Aún no hay plantillas creadas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-container">
          <div className="docentes-header table-header-actions">
            <h2 className="section-title">Catálogo de materias</h2>
            <button
              className="btn-add-docente btn-inline-icon btn-add-materia-wrap"
              type="button"
              onClick={abrirCrear}
            >
              <Plus size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
              <span>Nueva<br />materia</span>
            </button>
          </div>

          <div
            style={{
              marginBottom: 16,
            }}
          >
            <input
              placeholder="Nombre"
              value={filtros.nombre}
              onChange={(e) =>
                setFiltros({ ...filtros, nombre: e.target.value, page: 1 })
              }
            />
          </div>

          {cargando ? (
            <p>Cargando...</p>
          ) : error ? (
            <p style={{ color: "red" }}>{error}</p>
          ) : (
            <table className="materias-base-table catalogo-materias-table">
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "38%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id_materia}>
                    <td>{m.codigo || "—"}</td>
                    <td>{m.nombre}</td>
                    <td>{m.descripcion || "—"}</td>
                    <td className="plantillas-academicas-actions">
                      <div className="plantillas-academicas-actions-row materias-base-actions">
                        <button className="btn-view btn-inline-icon" type="button" onClick={() => abrirEditar(m)}>
                          <Pencil size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                          Editar
                        </button>
                        <button className="btn-danger btn-inline-icon" type="button" onClick={() => eliminar(m)}>
                          <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <div className="table-pagination">
            <button
              className="btn-view btn-inline-icon"
              disabled={!puedeRetroceder}
              type="button"
              onClick={() => setFiltros({ ...filtros, page: filtros.page - 1 })}
            >
              <ArrowLeft size={14} style={{ verticalAlign: "middle" }} />
              Anterior
            </button>
            <span className="table-pagination-badge">
              Página <strong>{filtros.page}</strong>
            </span>
            <button
              className="btn-view btn-inline-icon"
              disabled={!puedeAvanzar}
              type="button"
              onClick={() => setFiltros({ ...filtros, page: filtros.page + 1 })}
            >
              Siguiente
              <ArrowRight size={14} style={{ verticalAlign: "middle" }} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="admin-modal admin-modal-top">
          <div className="admin-modal-content admin-modal-tight">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3 className="admin-modal-title">
              {editando ? "Editar materia" : "Nueva materia"}
            </h3>
            <input
              placeholder="Código (opcional)"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
            />
            <div className="modal-buttons cursos-modal-buttons">
              <button
                type="button"
                className="btn-neutral btn-inline-icon"
                onClick={() => setModalOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button className="btn-success btn-inline-icon" type="button" onClick={guardar}>
                <Save size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEditarEstructuraOpen && (
        <div className="admin-modal admin-modal-top">
          <div className="admin-modal-content admin-modal-structure-edit">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalEditarEstructuraOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3 className="admin-modal-title">
              {estructuraEditando ? "Editar plantilla académica" : "Nueva plantilla académica"}
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
            <div className="modal-buttons cursos-modal-buttons">
              <button
                type="button"
                className="btn-neutral btn-inline-icon"
                onClick={() => setModalEditarEstructuraOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button className="btn-success btn-inline-icon" type="button" onClick={guardarEstructura}>
                <Save size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfigurarEstructuraOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-structure-config">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalConfigurarEstructuraOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3 className="admin-modal-title">
              Configurar materias
            </h3>
            <p style={{ marginTop: -2, marginBottom: 0, color: "#243a57", fontSize: "0.86rem", fontWeight: 700 }}>
              Plantilla: "{estructuraSeleccionadaObj?.nombre || "Seleccione una plantilla"}"
            </p>
            <p style={{ marginTop: 0, marginBottom: 0, color: "#7a879b", fontSize: "0.76rem" }}>
              Toca materias para agregar a la plantilla o crea una nueva.
            </p>

            <div className="structure-modal-toolbar" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Buscar en el catálogo"
                value={busquedaMateriaModal}
                onChange={(e) => setBusquedaMateriaModal(e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />
            </div>

            {catalogoCargando ? (
              <p style={{ marginBottom: 14 }}>Cargando catálogo...</p>
            ) : catalogoError ? (
              <p style={{ marginBottom: 14, color: "#c0392b" }}>{catalogoError}</p>
            ) : (
              <>
                {(busquedaActiva || materiasSugeridas.length > 0) && (
                  <div style={{ marginBottom: busquedaActiva ? 4 : 3 }}>
                    <div className="docentes-header structure-section-header" style={{ margin: 0 }}>
                      <h3 className="section-title" style={{ fontSize: "0.8rem" }}>
                        Sugeridas
                      </h3>
                    </div>
                    <div
                      className="structure-materia-grid"
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "stretch",
                        gap: 4,
                      }}
                    >
                      {materiasSugeridas.map((materia) => (
                        <button
                          key={materia.id_materia}
                          type="button"
                          className="admin-action-card structure-materia-card"
                          style={{ width: "fit-content", minWidth: 122, maxWidth: 220, flex: "0 1 auto" }}
                          onClick={() => agregarMateriaAEstructura(materia.id_materia)}
                        >
                          <span className="structure-materia-info">
                            <span className="admin-action-title" style={{ display: "block", fontSize: "0.82rem" }}>
                              {materia.nombre}
                            </span>
                            <span className="admin-action-sub" style={{ fontSize: "0.66rem" }}>
                              {materia.codigo || "Sin código"}
                            </span>
                          </span>
                          <span className="structure-materia-inline-action">
                            <span className="admin-action-sub" style={{ fontSize: "0.92rem" }}>+</span>
                          </span>
                        </button>
                      ))}
                      {busquedaActiva && materiasSugeridas.length === 0 && (
                        <div className="empty-state structure-empty-state">
                          No hay sugerencias que coincidan con la búsqueda.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!busquedaActiva && (
                  <div style={{ marginBottom: 5 }}>
                    <div className="docentes-header structure-section-header" style={{ margin: 0 }}>
                      <h3 className="section-title" style={{ fontSize: "0.8rem" }}>
                        Catálogo de materias
                      </h3>
                    </div>
                    <div
                      className="structure-materia-grid"
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "stretch",
                        gap: 4,
                      }}
                    >
                      {materiasCatalogoRestante.map((materia) => (
                        <button
                          key={materia.id_materia}
                          type="button"
                          className="admin-action-card structure-materia-card"
                          style={{ width: "fit-content", minWidth: 122, maxWidth: 220, flex: "0 1 auto" }}
                          onClick={() => agregarMateriaAEstructura(materia.id_materia)}
                        >
                          <span className="structure-materia-info">
                            <span className="admin-action-title" style={{ display: "block", fontSize: "0.82rem" }}>
                              {materia.nombre}
                            </span>
                            <span className="admin-action-sub" style={{ fontSize: "0.66rem" }}>
                              {materia.codigo || "Sin código"}
                            </span>
                          </span>
                          <span className="structure-materia-inline-action">
                            <span className="admin-action-sub" style={{ fontSize: "0.92rem" }}>+</span>
                          </span>
                        </button>
                      ))}
                      {materiasCatalogoRestante.length === 0 && (
                        <div className="empty-state structure-empty-state">
                          No hay mas materias disponibles.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </>
            )}

            <div className="docentes-header" style={{ marginTop: 4, marginBottom: 4 }}>
              <h3 className="section-title" style={{ fontSize: "0.98rem" }}>
                Materias de la plantilla
              </h3>
              <button
                type="button"
                className="btn-add-docente btn-inline-icon btn-add-materia-wrap btn-add-materia-wrap-single"
                onClick={abrirNuevaMateriaEstructura}
              >
                <Plus size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                <span>Crear nueva materia</span>
              </button>
            </div>

            <table className="structure-modal-table">
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "46%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Materia</th>
                  <th>Código</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materiasEstructura.map((item, index) => (
                  <tr key={item.id_estructura_materia}>
                    <td>{index + 1}</td>
                    <td>{item.materia?.nombre || `#${item.id_materia}`}</td>
                    <td>{item.materia?.codigo || "—"}</td>
                    <td>
                      <div className="materias-base-actions">
                        <button
                          className="btn-view btn-inline-icon structure-edit-btn"
                          type="button"
                          onClick={() => abrirEditar(item.materia)}
                        >
                          <Pencil size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                          Editar
                        </button>
                        <button
                          className="btn-danger btn-inline-icon"
                          type="button"
                          onClick={() => quitarMateriaDeEstructura(item.id_materia)}
                        >
                          <CircleMinus size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                          Quitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {materiasEstructura.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      Esta plantilla aún no tiene materias asociadas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNuevaMateriaEstructuraOpen && (
        <div className="admin-modal admin-modal-top">
          <div className="admin-modal-content admin-modal-tight">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalNuevaMateriaEstructuraOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3 className="admin-modal-title">Crear materia</h3>
            <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7a99", fontSize: "0.88rem" }}>
              Se creará en el catálogo de materias y se añadirá a la plantilla actual.
            </p>
            <input
              placeholder="Código (opcional)"
              value={nuevaMateriaForm.codigo}
              onChange={(e) => setNuevaMateriaForm({ ...nuevaMateriaForm, codigo: e.target.value })}
            />
            <input
              placeholder="Nombre de la materia"
              value={nuevaMateriaForm.nombre}
              onChange={(e) => setNuevaMateriaForm({ ...nuevaMateriaForm, nombre: e.target.value })}
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={nuevaMateriaForm.descripcion}
              onChange={(e) =>
                setNuevaMateriaForm({ ...nuevaMateriaForm, descripcion: e.target.value })
              }
              rows={3}
            />
            <div className="modal-buttons cursos-modal-buttons">
              <button
                type="button"
                className="btn-neutral btn-inline-icon"
                onClick={() => setModalNuevaMateriaEstructuraOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button
                type="button"
                className="btn-success btn-inline-icon"
                onClick={crearYMateriaAEstructura}
              >
                <Save size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Crear y agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEliminarEstructuraOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalEliminarEstructuraOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3 className="admin-modal-title">Eliminar plantilla académica</h3>
            <p style={{ marginTop: 0, color: "#51637f" }}>
              ¿Deseas eliminar <strong>{estructuraEliminando?.nombre || "esta plantilla"}</strong>?
            </p>
            <p style={{ marginTop: 0, marginBottom: 12, fontSize: "0.88rem", color: "#7a879b" }}>
              Si ya fue usada en un curso, el sistema bloqueará la eliminación.
            </p>
            <div className="modal-buttons cursos-modal-buttons">
              <button
                type="button"
                className="btn-neutral btn-inline-icon"
                onClick={() => setModalEliminarEstructuraOpen(false)}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger btn-inline-icon"
                onClick={eliminarEstructura}
              >
                <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default MateriasAdmin;
