import React from "react";
import { BookOpen, ClipboardList, Eye, PencilLine, Plus, Trash2, UserRound } from "lucide-react";
import CustomSelect from "../../../components/admin/CustomSelect";

export const TabInsumos = ({
  activeTab,
  materiaSeleccionada,
  nuevoInsumo,
  setNuevoInsumo,
  periodosOptions,
  periodosVisibles,
  periodosFiltrados,
  filtroPeriodo,
  setFiltroPeriodo,
  ordenInsumos,
  setOrdenInsumos,
  menuFiltroPeriodoAbierto,
  setMenuFiltroPeriodoAbierto,
  menuOrdenInsumosAbierto,
  setMenuOrdenInsumosAbierto,
  insumosMateria,
  cargandoInsumo,
  soloLecturaTutor,
  agregarInsumo,
  abrirInsumosNotas,
  abrirEdicionInsumo,
  eliminarInsumo,
  eliminandoInsumo,
}) => {
  // Administra los insumos de la materia seleccionada. Las acciones llegan
  // desde CursoPrincipal para conservar una sola fuente de estado.
  return activeTab === "insumos" && materiaSeleccionada ? (
    <div className="insumos-section">
      <div className="insumos-heading-row">
        <div>
          <h3><ClipboardList size={18} /> Insumos</h3>
          <p className="panel-sub">
            {soloLecturaTutor
              ? "Consulta las actividades y evaluaciones registradas en la materia"
              : "Administra las actividades, proyectos y evaluaciones de la materia"}
          </p>
          {soloLecturaTutor && materiaSeleccionada.docente && (
            <div className="insumos-docente-responsable">
              <UserRound size={17} />
              <span><small>Docente responsable</small>{materiaSeleccionada.docente.nombre} {materiaSeleccionada.docente.apellido}</span>
            </div>
          )}
        </div>
        {soloLecturaTutor && (
          <button className="btn-add-insumo insumos-solo-lectura" type="button" disabled>
            <Eye size={16} />
            <span className="btn-add-insumo-label">Solo lectura</span>
          </button>
        )}
      </div>

      {!soloLecturaTutor ? <div className="agregar-insumo">
        <input
          type="text"
          placeholder="Nombre del insumo"
          value={nuevoInsumo.nombre}
          onChange={(e) =>
            setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Descripción"
          value={nuevoInsumo.descripcion}
          onChange={(e) =>
            setNuevoInsumo({ ...nuevoInsumo, descripcion: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Ponderación (0-10)"
          min="0"
          max="10"
          step="0.1"
          value={nuevoInsumo.ponderacion}
          onChange={(e) =>
            setNuevoInsumo({ ...nuevoInsumo, ponderacion: e.target.value })
          }
        />
        <CustomSelect
          value={nuevoInsumo.tipo_insumo}
          onChange={(value) =>
            setNuevoInsumo({ ...nuevoInsumo, tipo_insumo: value })
          }
          placeholder="Tipo de Insumo"
          options={[
            { value: "actividad", label: "Actividad" },
            { value: "proyecto_periodo", label: "Proyecto del periodo" },
            { value: "examen_periodo", label: "Examen del periodo" },
          ]}
          className="custom-select-white"
        />
        <CustomSelect
          value={nuevoInsumo.id_periodo}
          onChange={(value) =>
            setNuevoInsumo({ ...nuevoInsumo, id_periodo: value })
          }
          placeholder="Periodo"
          options={periodosOptions}
          className="custom-select-white"
        />
        <button
          onClick={agregarInsumo}
          disabled={cargandoInsumo || soloLecturaTutor}
          className="btn-add-insumo"
        >
          <Plus size={16} />
          <span className="btn-add-insumo-label">
            {soloLecturaTutor ? (
              "Solo lectura"
            ) : cargandoInsumo ? (
              "Agregando..."
            ) : (
              "Agregar Insumo"
            )}
          </span>
        </button>
      </div> : null}

      <div className="insumos-toolbar">
        <div className="toolbar-status-pill toolbar-status-pill-compact toolbar-status-pill-tight">
          <strong>Mostrando:</strong>
          <span>
            {filtroPeriodo === "todos"
               ? "Todos los periodos"
               : `Periodo ${filtroPeriodo}`}
          </span>
        </div>
         <div className="toolbar-status-pill toolbar-status-pill-compact toolbar-status-pill-tight">
          <strong>Orden:</strong>
          <span>{ordenInsumos === "reciente" ? "Más recientes" : ordenInsumos === "antiguo" ? "Más antiguos" : ordenInsumos === "a-z" ? "Alfabético" : "Z-A"}</span>
        </div>
        <div className="insumos-toolbar-actions">
          <div className="toolbar-anchor toolbar-anchor-filter">
            <button
              className="toolbar-ghost-btn"
              type="button"
               aria-label="Filtrar por periodo"
              onClick={() => {
                setMenuOrdenInsumosAbierto(false);
                setMenuFiltroPeriodoAbierto((prev) => !prev);
              }}
            >
              <span className="toolbar-filter-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>Filtrar</span>
            </button>
            {menuFiltroPeriodoAbierto && (
              <ul className="toolbar-dropdown-menu toolbar-dropdown-menu-right" role="listbox">
                {[
                   { value: "todos", label: "Todos los periodos" },
                  ...periodosVisibles.map((p) => ({
                    value: String(p.numero_periodo),
                     label: p.nombre_periodo || `Periodo ${p.numero_periodo}`,
                  })),
                ].map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === filtroPeriodo}
                    className={`toolbar-dropdown-option ${option.value === filtroPeriodo ? "active" : ""}`}
                    onClick={() => {
                      setFiltroPeriodo(option.value);
                      setMenuFiltroPeriodoAbierto(false);
                    }}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="toolbar-anchor toolbar-anchor-order">
            <button
              className="toolbar-ghost-btn"
              type="button"
              aria-label="Ordenar insumos"
              onClick={() => {
                setMenuFiltroPeriodoAbierto(false);
                setMenuOrdenInsumosAbierto((prev) => !prev);
              }}
            >
              <span className="toolbar-sort-icon" aria-hidden="true">
                <span className="arrow-up" />
                <span className="arrow-down" />
              </span>
              <span>Ordenar</span>
            </button>
            {menuOrdenInsumosAbierto && (
              <ul className="toolbar-dropdown-menu toolbar-dropdown-menu-right" role="listbox">
                  {[
                   { value: "reciente", label: "Más recientes" },
                   { value: "antiguo", label: "Más antiguos" },
                   { value: "a-z", label: "A-Z" },
                  { value: "z-a", label: "Z-A" },
                ].map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === ordenInsumos}
                    className={`toolbar-dropdown-option ${option.value === ordenInsumos ? "active" : ""}`}
                    onClick={() => {
                      setOrdenInsumos(option.value);
                      setMenuOrdenInsumosAbierto(false);
                    }}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="periodos-verticales">
        {periodosFiltrados.map((periodo) => {
          const insumosPeriodo = insumosMateria
            .filter((i) => Number(i.id_periodo) === Number(periodo.id_periodo))
            .sort((a, b) => {
              const cmp = a.nombre.localeCompare(b.nombre, "es", {
                sensitivity: "base",
              });
               if (ordenInsumos === "reciente") {
                 return Number(b.id_insumo) - Number(a.id_insumo);
               }
               if (ordenInsumos === "antiguo") {
                 return Number(a.id_insumo) - Number(b.id_insumo);
               }
               return ordenInsumos === "z-a" ? -cmp : cmp;
            });

          return (
            <div key={periodo.id_periodo} className="periodo-section">
              <h4 className="periodo-title">
                {periodo.nombre_periodo ||
                   `Periodo ${periodo.numero_periodo}`}
              </h4>
              {insumosPeriodo.length === 0 ? (
                <p className="no-insumos-periodo">Sin insumos</p>
              ) : (
                <div className="insumos-grid">
                  {insumosPeriodo.map((insumo) => (
                    <div key={insumo.id_insumo} className={`insumo-card ${soloLecturaTutor ? "solo-lectura" : ""}`}>
                      <div className="insumo-info">
                        <h4>{insumo.nombre}</h4>
                        <p>{insumo.descripcion}</p>
                        <small>Ponderación: {insumo.ponderacion}</small>
                      </div>
                      <div className="insumo-actions">
                        <button
                          className="btn-notas btn-notas-large"
                          onClick={() => abrirInsumosNotas(insumo)}
                        >
                          <BookOpen size={18} />
                          <span>Notas</span>
                        </button>
                        {!soloLecturaTutor && <button
                          className="btn-icon btn-edit"
                          disabled={eliminandoInsumo}
                          onClick={() => abrirEdicionInsumo(insumo)}
                          aria-label="Editar insumo"
                        >
                          <PencilLine size={16} />
                        </button>}
                        {!soloLecturaTutor && (
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => eliminarInsumo(insumo)}
                            disabled={eliminandoInsumo}
                            aria-label="Eliminar insumo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;
};
