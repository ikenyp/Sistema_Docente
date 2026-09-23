import React, { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, BookOpen, CheckCircle2, ClipboardList, Filter, LoaderCircle, Sparkles, Users, X } from "lucide-react";
import { analisisAPI } from "../services/api";
import "../styles/analisisAcademico.css";

const tipoLabel = (tipo) => ({
  rendimiento: "Rendimiento",
  asistencia: "Asistencia",
  actividades_pendientes: "Actividades pendientes",
  tendencia: "Tendencia",
}[tipo] || String(tipo || "Situación").replaceAll("_", " "));

const nivelRiesgo = (puntaje, alertas = []) => {
  if (alertas.some((alerta) => alerta.nivel === "alto")) return "alto";
  if (alertas.some((alerta) => alerta.nivel === "medio")) return "medio";
  return puntaje >= 5 ? "alto" : puntaje >= 3 ? "medio" : "bajo";
};
const ordenRiesgo = { alto: 0, medio: 1, bajo: 2 };
const etiquetaSeguimiento = (tipo) => ({
  rendimiento: "Rendimiento",
  asistencia: "Asistencia",
  actividades_pendientes: "Incumplimiento",
  tendencia: "Tendencia",
}[tipo] || tipoLabel(tipo));

function Metric({ label, value, detail }) {
  return (
    <div className="analisis-metrica">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function renderExplicacionIA(texto) {
  const bloques = [];
  let lista = [];
  const cerrarLista = () => {
    if (lista.length) {
      bloques.push({ tipo: "lista", contenido: lista });
      lista = [];
    }
  };

  texto.split("\n").forEach((linea) => {
    const limpia = linea.trim();
    if (!limpia) {
      cerrarLista();
      return;
    }
    if (/^\*\*\d+\./.test(limpia) || /^\d+\./.test(limpia)) {
      cerrarLista();
      bloques.push({ tipo: "titulo", contenido: limpia.replaceAll("**", "").replace(/:$/, "") });
      return;
    }
    if (/^[-•]/.test(limpia)) {
      lista.push(limpia.replace(/^[-•]\s*/, "").replaceAll("**", ""));
      return;
    }
    cerrarLista();
    bloques.push({ tipo: "parrafo", contenido: limpia.replaceAll("**", "") });
  });
  cerrarLista();

  return bloques.map((bloque, indice) => {
    if (bloque.tipo === "titulo") return <h4 key={indice}>{bloque.contenido}</h4>;
    if (bloque.tipo === "lista") return <ul key={indice}>{bloque.contenido.map((item, itemIndex) => <li key={`${indice}-${itemIndex}`}>{item}</li>)}</ul>;
    return <p key={indice}>{bloque.contenido}</p>;
  });
}

const DURACION_CACHE_IA = 24 * 60 * 60 * 1000;

function obtenerHuellaAnalisis(analisis) {
  return JSON.stringify({
    resumen: analisis.resumen,
    situaciones: analisis.situaciones,
    recomendaciones: analisis.recomendaciones,
  });
}

export function AnalisisAcademico({ idCurso, nombreCurso, habilitado = true }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [analisis, setAnalisis] = useState(null);
  const [error, setError] = useState("");
  const [errorIA, setErrorIA] = useState("");
  const [vista, setVista] = useState("inicio");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroMateriaAnalisis, setFiltroMateriaAnalisis] = useState("");
  const [filtroActividadAnalisis, setFiltroActividadAnalisis] = useState("");
  const [estudianteDetalle, setEstudianteDetalle] = useState(null);
  const [cargandoEstudiante, setCargandoEstudiante] = useState(false);
  const [situacionSeleccionada, setSituacionSeleccionada] = useState(null);
  const [explicacionIA, setExplicacionIA] = useState("");
  const [mostrarExplicacionIA, setMostrarExplicacionIA] = useState(true);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [mostrarSeguimiento, setMostrarSeguimiento] = useState(true);

  useEffect(() => {
    if (!habilitado || !idCurso) return;

    let activo = true;
    setAnalisis(null);
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
  }, [habilitado, idCurso]);

  useEffect(() => {
    if (!analisis || !idCurso) return;
    const clave = `analisis-ia-${idCurso}`;
    try {
      const guardada = JSON.parse(localStorage.getItem(clave) || "null");
      const vigente = guardada && Date.now() - guardada.fecha < DURACION_CACHE_IA;
      if (vigente && guardada.huella === obtenerHuellaAnalisis(analisis)) {
        setExplicacionIA(guardada.explicacion);
        setMostrarExplicacionIA(true);
      } else if (guardada) {
        localStorage.removeItem(clave);
      }
    } catch {
      localStorage.removeItem(clave);
    }
  }, [analisis, idCurso]);

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

  const limpiarFiltroRelacionado = () => {
    setFiltroMateriaAnalisis("");
    setFiltroActividadAnalisis("");
    setFiltroNivel("todos");
    setFiltroTipo("todos");
  };

  const generarExplicacionIA = async () => {
    if (generandoIA || !idCurso) return;
    setErrorIA("");
    const clave = `analisis-ia-${idCurso}`;
    const huella = analisis ? obtenerHuellaAnalisis(analisis) : "";
    try {
      const guardada = JSON.parse(localStorage.getItem(clave) || "null");
      if (guardada && Date.now() - guardada.fecha < DURACION_CACHE_IA && guardada.huella === huella) {
        setExplicacionIA(guardada.explicacion);
        setMostrarExplicacionIA(true);
        return;
      }
    } catch {
      localStorage.removeItem(clave);
    }
    setGenerandoIA(true);
    try {
      const resultado = await analisisAPI.explicarCurso(idCurso);
      setExplicacionIA(resultado.explicacion || "");
      setMostrarExplicacionIA(true);
      localStorage.setItem(clave, JSON.stringify({
        explicacion: resultado.explicacion || "",
        huella,
        fecha: Date.now(),
      }));
    } catch (err) {
      setErrorIA(err.message || "No se pudo generar la explicación con IA");
    } finally {
      setGenerandoIA(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="analisis-academico-launcher"
        onClick={abrir}
        aria-label="Abrir análisis académico"
        title={cargando ? "Analizando el curso..." : "Abrir análisis académico"}
        aria-busy={cargando}
      >
        <BarChart3 size={22} strokeWidth={2.2} />
        {cargando && (
          <span className="analisis-academico-loading-indicator" aria-label="Analizando">
            <LoaderCircle size={13} />
          </span>
        )}
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
                <p>
                  {nombreCurso || "Curso actual"}
                  {resumen?.estudiantes_analizados != null && ` · ${resumen.estudiantes_analizados} estudiantes`}
                </p>
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
                  <Metric label="Estudiantes involucrados" value={resumen.estudiantes_afectados ?? estudiantesConAlertas.length} />
                  <Metric label="Riesgo acumulado" value={resumen.estudiantes_en_riesgo ?? 0} detail="Varias señales combinadas" />
                  <Metric label="Situaciones detectadas" value={resumen.situaciones ?? 0} />
                  <Metric label="Promedio registrado" value={resumen.promedio_curso ?? "-"} detail="Referencia, no nota oficial" />
                </div>
                <div className="analisis-ia-toolbar">
                  <button type="button" className="analisis-ia-button" onClick={generarExplicacionIA} disabled={generandoIA}>
                    <Sparkles size={15} /> {generandoIA ? "Generando explicación..." : "Generar explicación con IA"}
                  </button>
                  {explicacionIA && (
                    <div className="analisis-ia-explicacion">
                      <button
                        type="button"
                        className="analisis-ia-explicacion-titulo"
                        onClick={() => setMostrarExplicacionIA((visible) => !visible)}
                        aria-expanded={mostrarExplicacionIA}
                      >
                        <span><Sparkles size={15} /> Explicación generada</span>
                        <span className="analisis-ia-explicacion-flecha">{mostrarExplicacionIA ? "⌃" : "⌄"}</span>
                      </button>
                      {mostrarExplicacionIA && <div className="analisis-ia-explicacion-contenido">{renderExplicacionIA(explicacionIA)}</div>}
                    </div>
                  )}
                  {errorIA && <div className="analisis-ia-error">{errorIA}</div>}
                </div>

                <section className="analisis-situaciones">
                  <div className="analisis-seccion-titulo"><AlertTriangle size={17} /> Situaciones para revisar</div>
                  {(analisis.situaciones || []).length === 0 ? (
                    <div className="analisis-empty"><CheckCircle2 size={18} /> No se detectaron situaciones con los datos registrados.</div>
                  ) : (
                    <div className="analisis-situaciones-lista">
                      {[...(analisis.situaciones || [])].sort((a, b) => {
                        const prioridad = { alta: 0, media: 1, baja: 2 };
                        return (prioridad[a.prioridad] ?? 3) - (prioridad[b.prioridad] ?? 3);
                      }).map((situacion) => (
                        <div key={situacion.id_situacion} className={`analisis-situacion-item analisis-situacion-item-${situacion.prioridad} ${situacionSeleccionada?.id_situacion === situacion.id_situacion ? "expandida" : ""}`}>
                          <button type="button" className={`analisis-situacion analisis-situacion-${situacion.prioridad}`} onClick={() => setSituacionSeleccionada((actual) => actual?.id_situacion === situacion.id_situacion ? null : situacion)}>
                            <span className="analisis-situacion-prioridad">{situacion.prioridad}</span>
                            <span className="analisis-situacion-contenido"><strong>{situacion.titulo}</strong><small>{situacion.materia && `${situacion.materia} · `}{situacion.actividad ? `${situacion.actividad} · ` : ""}{situacion.afectados} afectados</small><em>{situacion.descripcion}</em></span>
                            <span className={`analisis-situacion-flecha ${situacionSeleccionada?.id_situacion === situacion.id_situacion ? "expandida" : ""}`}>›</span>
                          </button>
                          {situacionSeleccionada?.id_situacion === situacion.id_situacion && (
                            <section className="analisis-situacion-detalle">
                              {situacion.promedio != null && <strong>Promedio de la actividad: {situacion.promedio}</strong>}
                              <div className="analisis-informacion-relacionada">
                                <strong>{situacion.afectados} estudiantes afectados</strong>
                                <div className="analisis-relacionados-lista">
                                  {(situacion.nombres_estudiantes?.length
                                    ? situacion.nombres_estudiantes.map((nombre, indice) => <span key={`${nombre}-${indice}`}>{nombre}</span>)
                                    : (
                                      (situacion.id_estudiantes?.length
                                      ? situacion.id_estudiantes
                                      : (analisis.estudiantes || [])
                                        .filter((estudiante) => estudiante.alertas.some((alerta) => alerta.tipo === ({ rendimiento_bajo: "rendimiento", asistencia_baja: "asistencia", actividades_pendientes: "actividades_pendientes" }[situacion.tipo] || situacion.tipo)))
                                        .map((estudiante) => estudiante.id_estudiante))
                                      ).map((idEstudiante) => {
                                        const estudiante = (analisis.estudiantes || []).find((item) => Number(item.id_estudiante) === Number(idEstudiante));
                                        return estudiante ? <span key={idEstudiante}>{estudiante.estudiante}</span> : null;
                                      })
                                    )}
                                </div>
                              </div>
                              <p className="analisis-situacion-recomendacion"><strong>Sugerencia:</strong> {situacion.recomendacion}</p>
                            </section>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="analisis-seguimiento-individual">
                  <button type="button" className="analisis-seguimiento-titulo" onClick={() => setMostrarSeguimiento((visible) => !visible)} aria-expanded={mostrarSeguimiento}>
                    <span><Users size={17} /> <strong>Seguimiento individual</strong></span>
                    <span className="analisis-seguimiento-resumen">
                      {estudiantesConAlertas.length} estudiantes requieren atención
                      <em className="analisis-riesgo-alto">{estudiantesConAlertas.filter((estudiante) => nivelRiesgo(estudiante.puntaje_riesgo || 0, estudiante.alertas) === "alto").length} Riesgo alto</em>
                      <em className="analisis-riesgo-medio">{estudiantesConAlertas.filter((estudiante) => nivelRiesgo(estudiante.puntaje_riesgo || 0, estudiante.alertas) === "medio").length} Riesgo medio</em>
                      <em className="analisis-riesgo-bajo">{estudiantesConAlertas.filter((estudiante) => nivelRiesgo(estudiante.puntaje_riesgo || 0, estudiante.alertas) === "bajo").length} Riesgo bajo</em>
                      <span>{mostrarSeguimiento ? "⌃" : "⌄"}</span>
                    </span>
                  </button>
                  <p className="analisis-seguimiento-ayuda">Da clic para desplegar los detalles.</p>
                  {estudiantesConAlertas.length === 0 ? (
                    <div className="analisis-empty"><CheckCircle2 size={18} /> No hay alertas individuales con los datos registrados.</div>
                  ) : mostrarSeguimiento && (
                    <div className="analisis-seguimiento-lista">
                      {[...estudiantesConAlertas]
                        .sort((a, b) => {
                          const diferenciaNivel = ordenRiesgo[nivelRiesgo(a.puntaje_riesgo || 0, a.alertas)] - ordenRiesgo[nivelRiesgo(b.puntaje_riesgo || 0, b.alertas)];
                          return diferenciaNivel || (b.puntaje_riesgo || 0) - (a.puntaje_riesgo || 0);
                        })
                        .map((estudiante) => (
                          <div
                            className="analisis-seguimiento-item"
                            key={estudiante.id_estudiante}
                          >
                            <span className="analisis-seguimiento-cabecera">
                              <strong>{estudiante.estudiante}</strong>
                              <em className={`analisis-riesgo-${nivelRiesgo(estudiante.puntaje_riesgo || 0, estudiante.alertas)}`}>{nivelRiesgo(estudiante.puntaje_riesgo || 0, estudiante.alertas)}</em>
                            </span>
                            <span className="analisis-seguimiento-datos">
                              Promedio {estudiante.promedio_registrado ?? "-"} · Asistencia {estudiante.asistencias_favorables}/{estudiante.asistencias_totales || "-"} ({estudiante.porcentaje_asistencia != null ? `${estudiante.porcentaje_asistencia}%` : "-"})
                            </span>
                            <span className="analisis-seguimiento-alertas">
                              {estudiante.alertas.map((alerta) => (
                                <span key={`${estudiante.id_estudiante}-${alerta.tipo}`} className={`analisis-alerta-chip analisis-alerta-chip-${alerta.nivel}`}>
                                  {etiquetaSeguimiento(alerta.tipo)}
                                </span>
                              ))}
                            </span>
                            {estudiante.actividades_pendientes > 0 && <span className="analisis-seguimiento-pendientes"><strong>{estudiante.actividades_pendientes} pendientes:</strong> {estudiante.actividades_pendientes_nombres.join(", ")}</span>}
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                {vista !== "inicio" && <div className="analisis-detalle-barra">
                  <button type="button" onClick={() => { setVista("inicio"); setEstudianteDetalle(null); limpiarFiltroRelacionado(); }}><BarChart3 size={15} /> Volver al estado general</button>
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
                      {[...(analisis.estudiantes || [])].filter((estudiante) => estudiante.alertas.some((alerta) => (filtroNivel === "todos" || alerta.nivel === filtroNivel) && (filtroTipo === "todos" || alerta.tipo === filtroTipo))).sort((a, b) => (b.puntaje_riesgo || 0) - (a.puntaje_riesgo || 0)).map((estudiante) => (
                        <button type="button" className="analisis-estudiante-fila" key={estudiante.id_estudiante} onClick={() => abrirDetalleEstudiante(estudiante.id_estudiante)}>
                          <span><strong>{estudiante.estudiante}</strong><small>{estudiante.alertas.length ? estudiante.alertas.map((alerta) => tipoLabel(alerta.tipo)).join(" · ") : "Sin alertas detectadas"}</small></span>
                          <span className="analisis-estudiante-datos">Riesgo {estudiante.puntaje_riesgo ?? 0} · {estudiante.promedio_registrado ?? "-"} · {estudiante.porcentaje_asistencia != null ? `${estudiante.porcentaje_asistencia}%` : "-"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {vista === "materias" && (
                  <div className="analisis-materias-vista">
                    {(filtroMateriaAnalisis || filtroActividadAnalisis) && (
                      <div className="analisis-contexto-filtro">
                        <span>Mostrando información relacionada</span>
                        <button type="button" onClick={limpiarFiltroRelacionado}>Mostrar todas</button>
                      </div>
                    )}
                    <div className="analisis-seccion-titulo"><BookOpen size={17} /> Materias</div>
                    {(analisis.materias || []).filter((materia) => !filtroMateriaAnalisis || materia.nombre === filtroMateriaAnalisis).map((materia) => (
                      <div className="analisis-materia-fila" key={materia.id_materia}>
                        <strong>{materia.nombre}</strong><span>{materia.promedio ?? "-"} promedio · {materia.estudiantes_bajo_aprobacion} bajo 7 · {materia.actividades} actividades</span>
                      </div>
                    ))}
                    <div className="analisis-seccion-titulo analisis-actividades-titulo"><ClipboardList size={17} /> Actividades que requieren revisión</div>
                    {(analisis.actividades || []).filter((actividad) => (!filtroMateriaAnalisis || actividad.materia === filtroMateriaAnalisis) && (!filtroActividadAnalisis || actividad.nombre === filtroActividadAnalisis) && (actividad.pendientes > 0 || (actividad.promedio != null && actividad.promedio < 7))).map((actividad) => (
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
