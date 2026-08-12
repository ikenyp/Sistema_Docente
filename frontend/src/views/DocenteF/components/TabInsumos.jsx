import React from "react";
import { BookOpen, PencilLine, Trash2, Save } from "lucide-react";
import CustomSelect from "../../../components/admin/CustomSelect";

export const TabInsumos = ({
  activeTab,
  materiaSeleccionada,
  nuevoInsumo,
  setNuevoInsumo,
  periodosOptions,
  periodosVisibles,
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
  eliminarInsumo,
  cargarInsumos,
  requestConfirm,
  notasAPI,
  cargarNotasEstudiante,
  estudianteSeleccionado,
}) => {
  return activeTab === "insumos" && materiaSeleccionada ? (
    <div className="insumos-section">
      <h3>📋 Insumos</h3>

      <div className="agregar-insumo">
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
          {soloLecturaTutor
            ? "Solo lectura"
            : cargandoInsumo
              ? "Agregando..."
              : "Agregar Insumo"}
        </button>
      </div>

      <div className="insumos-toolbar">
        <div className="toolbar-status-pill toolbar-status-pill-compact toolbar-status-pill-tight">
          <strong>Mostrando:</strong>
          <span>
            {filtroPeriodo === "todos"
              ? "Todos los Trimestres"
              : `Trimestre ${filtroPeriodo}`}
          </span>
        </div>
        <div className="toolbar-status-pill toolbar-status-pill-compact toolbar-status-pill-tight">
          <strong>Orden:</strong>
          <span>{ordenInsumos === "a-z" ? "Alfabético" : "Z-A"}</span>
        </div>
        <div className="insumos-toolbar-actions">
          <div className="toolbar-anchor toolbar-anchor-filter">
            <button
              className="toolbar-blue-btn"
              type="button"
              aria-label="Filtrar por trimestre"
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
              <CustomSelect
                value={filtroPeriodo}
                onChange={(value) => {
                  setFiltroPeriodo(value);
                  setMenuFiltroPeriodoAbierto(false);
                }}
                options={[
                  { value: "todos", label: "Todos los Trimestres" },
                  ...periodosVisibles.map((p) => ({
                    value: String(p.numero_periodo),
                    label: `Trimestre ${p.numero_periodo}`,
                  })),
                ]}
                placeholder="Filtrar por trimestre"
                className="docente-popover-select docente-popover-select-left"
                hideTrigger
                open={menuFiltroPeriodoAbierto}
                onToggle={setMenuFiltroPeriodoAbierto}
                menuAlign="left"
              />
            )}
          </div>
          <div className="toolbar-anchor toolbar-anchor-order">
            <button
              className="toolbar-blue-btn"
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
              <CustomSelect
                value={ordenInsumos}
                onChange={(value) => {
                  setOrdenInsumos(value);
                  setMenuOrdenInsumosAbierto(false);
                }}
                options={[
                  { value: "a-z", label: "A-Z" },
                  { value: "z-a", label: "Z-A" },
                ]}
                placeholder="Ordenar insumos"
                className="docente-popover-select docente-popover-select-left"
                hideTrigger
                open={menuOrdenInsumosAbierto}
                onToggle={setMenuOrdenInsumosAbierto}
                key="orden-select"
                menuAlign="left"
              />
            )}
          </div>
        </div>
      </div>

      <div className="periodos-verticales">
        {periodosVisibles.map((periodo) => {
          const insumosPeriodo = insumosMateria
            .filter((i) => Number(i.id_periodo) === Number(periodo.id_periodo))
            .sort((a, b) => {
              const cmp = a.nombre.localeCompare(b.nombre, "es", {
                sensitivity: "base",
              });
              return ordenInsumos === "z-a" ? -cmp : cmp;
            });

          return (
            <div key={periodo.id_periodo} className="periodo-section">
              <h4 className="periodo-title">
                {periodo.nombre_periodo ||
                  `Trimestre ${periodo.numero_periodo}`}
              </h4>
              {insumosPeriodo.length === 0 ? (
                <p className="no-insumos-periodo">Sin insumos</p>
              ) : (
                <div className="insumos-grid">
                  {insumosPeriodo.map((insumo) => (
                    <div key={insumo.id_insumo} className="insumo-card">
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
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => {}}
                          aria-label="Editar insumo"
                        >
                          <PencilLine size={16} />
                        </button>
                        {!soloLecturaTutor && (
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => eliminarInsumo(insumo.id_insumo)}
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
