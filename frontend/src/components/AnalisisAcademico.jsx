import React, { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, BookOpen, CheckCircle2, ClipboardList, Filter, Users, X } from "lucide-react";
import { analisisAPI } from "../services/api";
import "../styles/analisisAcademico.css";

const tipoLabel = (tipo) => ({
  rendimiento: "Rendimiento",
  asistencia: "Asistencia",
  actividades_pendientes: "Actividades pendientes",
}[tipo] || String(tipo || "Situación").replaceAll("_", " "));

function Metric({ label, value, detail }) {
  return (
    <div className="analisis-metrica">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

export function AnalisisAcademico({ idCurso, nombreCurso }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [analisis, setAnalisis] = useState(null);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("inicio");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [estudianteDetalle, setEstudianteDetalle] = useState(null);
  const [cargandoEstudiante, setCargandoEstudiante] = useState(false);
  const [situacionSeleccionada, setSituacionSeleccionada] = useState(null);

  useEffect(() => {
    if (!abierto || !idCurso) return;

    let activo = true;
    setCargando(true);
    setError("");
    analisisAPI
      .analizarCurso(idCurso)
      .then((resultado) => {
        if (activo) setAnalisis(resultado);
      })
      .catch((err) => {
        if (activo) setError(err.message || "No se pudo cargar el análisis");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [abierto, idCurso]);

  const abrir = () => setAbierto(true);
  const cerrar = () => {
    setAbierto(false);
    setEstudianteDetalle(null);
    setSituacionSeleccionada(null);
    setVista("inicio");
  };
  const resumen = analisis?.resumen;
  const tiposAlerta = [...new Set((analisis?.alertas || []).map((alerta) => alerta.tipo))];
  const estudiantesConAlertas = (analisis?.estudiantes || []).filter((estudiante) => estudiante.alertas.length > 0);

  const abrirDetalleEstudiante = async (idEstudiante) => {
    setVista("estudiantes");
    setCargandoEstudiante(true);
    try {
      const detalle = await analisisAPI.analizarEstudiante(idCurso, idEstudiante);
      setEstudianteDetalle(detalle);
    } catch (err) {
      setError(err.message || "No se pudo cargar el análisis individual");
    } finally {
      setCargandoEstudiante(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="analisis-academico-launcher"
        onClick={abrir}
        aria-label="Abrir análisis académico"
        title="Análisis académico"
      >
        <BarChart3 size={22} strokeWidth={2.2} />
        {resumen && resumen.situaciones > 0 && (
          <span className="analisis-academico-badge">
            {resumen.situaciones}
          </span>
        )}
      </button>

      {abierto && (
        <div className="analisis-academico-overlay" role="presentation" onMouseDown={cerrar}>
          <section
            className="analisis-academico-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analisis-academico-titulo"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="analisis-academico-header">
              <div>
                <p className="analisis-academico-kicker">Centro de seguimiento académico</p>
                <h2 id="analisis-academico-titulo">Estado y prioridades</h2>
                <p>{nombreCurso || "Curso actual"}</p>
              </div>
              <button type="button" className="analisis-academico-close" onClick={cerrar} aria-label="Cerrar análisis">
                <X size={20} />
              </button>
            </header>

            {cargando && <div className="analisis-academico-state">Analizando la información registrada...</div>}
            {error && <div className="analisis-academico-error">{error}</div>}

            {!cargando && !error && analisis && (
              <div className="analisis-academico-content">
                <div className="analisis-metricas-grid">
                  <Metric label="Estudiantes" value={resumen.estudiantes_analizados} />
                  <Metric label="Estudiantes involucrados" value={resumen.estudiantes_afectados ?? estudiantesConAlertas.length} />
                  <Metric label="Situaciones detectadas" value={resumen.situaciones ?? 0} />
                  <Metric label="Promedio registrado" value={resumen.promedio_curso ?? "-"} detail="Referencia, no nota oficial" />
                </div>

                <section className="analisis-situaciones">
                  <div className="analisis-seccion-titulo"><AlertTriangle size={17} /> Situaciones para revisar</div>
                  {(analisis.situaciones || []).length === 0 ? (
                    <div className="analisis-empty"><CheckCircle2 size={18} /> No se detectaron situaciones con los datos registrados.</div>
                  ) : (
                    <div className="analisis-situaciones-lista">
                      {analisis.situaciones.map((situacion) => (
                        <button type="button" className={`analisis-situacion analisis-situacion-${situacion.prioridad}`} key={situacion.id_situacion} onClick={() => setSituacionSeleccionada(situacion)}>
                          <span className="analisis-situacion-prioridad">{situacion.prioridad}</span>
                          <span className="analisis-situacion-contenido"><strong>{situacion.titulo}</strong><small>{situacion.materia && `${situacion.materia} · `}{situacion.actividad ? `${situacion.actividad} · ` : ""}{situacion.afectados} afectados</small><em>{situacion.descripcion}</em></span>
                          <span className="analisis-situacion-flecha">›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {situacionSeleccionada && (
                  <section className="analisis-situacion-detalle">
                    <div className="analisis-seccion-titulo"><ClipboardList size={17} /> Detalle de la situación</div>
                    <h3>{situacionSeleccionada.titulo}</h3>
                    <p>{situacionSeleccionada.descripcion}</p>
                    {situacionSeleccionada.promedio != null && <strong>Promedio de la actividad: {situacionSeleccionada.promedio}</strong>}
                    <p className="analisis-situacion-recomendacion"><strong>Sugerencia:</strong> {situacionSeleccionada.recomendacion}</p>
                    <div className="analisis-situacion-acciones">
                      <button type="button" onClick={() => setVista(situacionSeleccionada.tipo.includes("actividad") ? "materias" : "estudiantes")}>Ver información relacionada</button>
                      <button type="button" onClick={() => setSituacionSeleccionada(null)}>Cerrar detalle</button>
                    </div>
                  </section>
                )}

                {vista !== "inicio" && <div className="analisis-detalle-barra">
                  <button type="button" onClick={() => { setVista("inicio"); setEstudianteDetalle(null); }}><BarChart3 size={15} /> Volver al estado general</button>
                  <strong>{vista === "estudiantes" ? "Estudiantes que requieren seguimiento" : "Materias y actividades"}</strong>
                </div>}

                {vista === "estudiantes" && (
                  <div className="analisis-filtros">
                    <Filter size={16} />
                    <label>Nivel
                      <select value={filtroNivel} onChange={(event) => setFiltroNivel(event.target.value)}>
                        <option value="todos">Todos</option><option value="alto">Alto</option><option value="medio">Medio</option><option value="bajo">Bajo</option>
                      </select>
                    </label>
                    <label>Tipo
                      <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}>
                        <option value="todos">Todos</option>
                        {tiposAlerta.map((tipo) => <option key={tipo} value={tipo}>{tipoLabel(tipo)}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                {vista === "inicio" && <div className="analisis-recomendaciones-inicio">
                  <div className="analisis-academico-side">
                    <div className="analisis-seccion-titulo"><ClipboardList size={17} /> Recomendaciones</div>
                    {analisis.recomendaciones.length === 0 ? <div className="analisis-empty">No hay acciones sugeridas con la información actual.</div> : analisis.recomendaciones.map((recomendacion) => (
                      <p className="analisis-recomendacion" key={recomendacion}>{recomendacion}</p>
                    ))}
                    {analisis.fortalezas.length > 0 && (
                      <>
                        <div className="analisis-seccion-titulo analisis-fortalezas-titulo"><CheckCircle2 size={17} /> Fortalezas</div>
                        {analisis.fortalezas.map((fortaleza) => <p className="analisis-fortaleza" key={fortaleza}>{fortaleza}</p>)}
                      </>
                    )}
                  </div>
                </div>}

                {vista === "estudiantes" && (
                  <div className="analisis-estudiantes-vista">
                    {estudianteDetalle && (
                      <div className="analisis-detalle-estudiante analisis-detalle-estudiante-destacado">
                        <div className="analisis-seccion-titulo"><Users size={17} /> Detalle de {estudianteDetalle.estudiante.estudiante}</div>
                        <div className="analisis-detalle-datos"><strong>Promedio: {estudianteDetalle.estudiante.promedio_registrado ?? "-"}</strong><strong>Asistencia: {estudianteDetalle.estudiante.porcentaje_asistencia != null ? `${estudianteDetalle.estudiante.porcentaje_asistencia}%` : "-"}</strong><strong>Pendientes: {estudianteDetalle.estudiante.actividades_pendientes}</strong></div>
                        {cargandoEstudiante ? <p>Cargando detalle...</p> : estudianteDetalle.recomendaciones.map((item) => <p className="analisis-recomendacion" key={item}>{item}</p>)}
                      </div>
                    )}
                    <div className="analisis-grupos-grid">
                      {(analisis.grupos || []).filter((grupo) => grupo.cantidad > 0).map((grupo) => (
                        <div className="analisis-grupo" key={grupo.tipo}>
                          <span>{grupo.nombre}</span>
                          <strong>{grupo.cantidad}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="analisis-estudiantes-lista">
                      {(analisis.estudiantes || []).filter((estudiante) => estudiante.alertas.some((alerta) => (filtroNivel === "todos" || alerta.nivel === filtroNivel) && (filtroTipo === "todos" || alerta.tipo === filtroTipo))).map((estudiante) => (
                        <button type="button" className="analisis-estudiante-fila" key={estudiante.id_estudiante} onClick={() => abrirDetalleEstudiante(estudiante.id_estudiante)}>
                          <span><strong>{estudiante.estudiante}</strong><small>{estudiante.alertas.length ? estudiante.alertas.map((alerta) => tipoLabel(alerta.tipo)).join(" · ") : "Sin alertas detectadas"}</small></span>
                          <span className="analisis-estudiante-datos">{estudiante.promedio_registrado ?? "-"} · {estudiante.porcentaje_asistencia != null ? `${estudiante.porcentaje_asistencia}%` : "-"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {vista === "materias" && (
                  <div className="analisis-materias-vista">
                    <div className="analisis-seccion-titulo"><BookOpen size={17} /> Materias</div>
                    {(analisis.materias || []).map((materia) => (
                      <div className="analisis-materia-fila" key={materia.id_materia}>
                        <strong>{materia.nombre}</strong><span>{materia.promedio ?? "-"} promedio · {materia.estudiantes_bajo_aprobacion} bajo 7 · {materia.actividades} actividades</span>
                      </div>
                    ))}
                    <div className="analisis-seccion-titulo analisis-actividades-titulo"><ClipboardList size={17} /> Actividades que requieren revisión</div>
                    {(analisis.actividades || []).filter((actividad) => actividad.pendientes > 0 || (actividad.promedio != null && actividad.promedio < 7)).map((actividad) => (
                      <div className="analisis-actividad-fila" key={actividad.id_insumo}>
                        <strong>{actividad.nombre}</strong><small>{actividad.materia} · promedio {actividad.promedio ?? "-"} · {actividad.pendientes} pendientes · {actividad.estudiantes_bajo_aprobacion} bajo 7</small>
                      </div>
                    ))}
                  </div>
                )}

                <p className="analisis-academico-disclaimer">
                  Este análisis es orientativo. No modifica notas, asistencia ni otros registros académicos.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
