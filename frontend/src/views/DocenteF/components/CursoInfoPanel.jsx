import React from "react";
import CustomSelect from "../../../components/admin/CustomSelect";
import { TabInsumos } from "./TabInsumos";
import { TabAsistencia } from "./TabAsistencia";
import { TabComportamiento } from "./TabComportamiento";
import { TabPromedios } from "./TabPromedios";
import { TabNotasEstudiante } from "./TabNotasEstudiante";
import { TabPeriodizacion } from "./TabPeriodizacion";

export const CursoInfoPanel = ({
  error,
  soloLecturaTutor,
  cursoDetalle,
  materiasCurso,
  estudiantesCurso,
  insumosMateria,
  periodos,
  errorCargaPeriodos,
  materiaSeleccionada,
  materiaNombre,
  materiasOptions,
  activeTab,
  setActiveTab,
  tabs,
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
  cargandoInsumo,
  agregarInsumo,
  abrirInsumosNotas,
  eliminarInsumo,
  requestConfirm,
  notasAPI,
  cargarNotasEstudiante,
  estudianteSeleccionado,
  fechaAsistencia,
  setFechaAsistencia,
  estadosTemporales,
  setEstadosTemporales,
  asistenciaExistentePorEstudiante,
  guardarAsistenciaUno,
  eliminarAsistenciaUno,
  guardarAsistenciaTodo,
  mesComportamiento,
  setMesComportamiento,
  valoresTemporales,
  setValoresTemporales,
  observacionesTemporales,
  setObservacionesTemporales,
  comportamientoExistentePorEstudiante,
  guardarComportamientoUno,
  eliminarComportamientoUno,
  guardarComportamientoTodo,
  estudiantePromedio,
  setEstudiantePromedio,
  periodoSeleccionado,
  setPeriodoSeleccionado,
  promedioPeriodo,
  setPromedioPeriodo,
  promedioAcumulado,
  setPromedioAcumulado,
  loadingPromedios,
  setLoadingPromedios,
  errorPromedios,
  setErrorPromedios,
  id_curso,
  notasIndividuales,
  cargandoNotasIndividual,
  guardarNotaIndividual,
  errorPeriodos,
}) => {
  if (error) {
    return (
      <div className="empty-state error-state">
        <h3>No se pudo cargar el curso</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (materiasCurso.length === 0) {
    return (
      <div className="empty-state">
        <h2>No hay materias asignadas</h2>
        <p>
          Aún no hay materias asignadas a este curso. Las materias
          aparecerán aquí una vez sean añadidas.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="course-summary">
        <div>
          <p className="summary-label">Curso</p>
          <h3>{cursoDetalle?.nombre || "Curso"}</h3>
          <p className="panel-sub">
            Año lectivo: {cursoDetalle?.anio_lectivo || "-"}
          </p>
          {soloLecturaTutor && (
            <p className="panel-sub" style={{ color: "#1f91de", fontWeight: 700 }}>
              Tutor del curso · Vista global en solo lectura
            </p>
          )}
        </div>
        <div className="summary-badge">
          <span>{materiasCurso.length}</span>
          <small>Materias</small>
        </div>
        <div className="summary-badge">
          <span>{estudiantesCurso.length}</span>
          <small>Estudiantes</small>
        </div>
      </div>

      <div className="cards-grid course-stats-grid">
        <div className="stat-card accent">
          <p className="stat-label">Materias activas</p>
          <h3 className="stat-value">{materiasCurso.length}</h3>
          <p className="stat-sub">Relacionadas al curso actual</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estudiantes</p>
          <h3 className="stat-value">{estudiantesCurso.length}</h3>
          <p className="stat-sub">Puedes buscar, registrar y evaluar</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Insumos</p>
          <h3 className="stat-value">{insumosMateria.length}</h3>
          <p className="stat-sub">
            Peso de actividades, proyectos y exámenes
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Periodos</p>
          <h3 className="stat-value">{periodos.length}</h3>
          <p className="stat-sub">Base para notas y promedios</p>
        </div>
      </div>

      {errorCargaPeriodos && (
        <div
          className="empty-state warning-state"
          style={{ marginBottom: "0.95rem" }}
        >
          <h3>Falta configuracion de periodizacion</h3>
          <p>{errorCargaPeriodos}</p>
        </div>
      )}

      {soloLecturaTutor && (
        <div
          className="empty-state"
          style={{ marginBottom: "0.95rem", border: "1px solid #dce5f4" }}
        >
          <h3>Modo tutor</h3>
          <p>
            Puedes revisar materias, notas, asistencia, promedios y comportamiento del curso completo, pero sin editar datos de las materias.
          </p>
        </div>
      )}

      <div className="materia-selector">
        <label>Selecciona Materia:</label>
        <CustomSelect
          value={materiaSeleccionada?.id_cmd ? String(materiaSeleccionada.id_cmd) : ""}
          onChange={async (value) => {
            const selected = materiasCurso.find(
              (m) => String(m.id_cmd) === String(value),
            );
            // La actualización del estado se delega al padre por callback
          }}
          options={materiasOptions}
          placeholder={materiaSeleccionada ? materiaNombre(materiaSeleccionada) : "Selecciona materia"}
          className="custom-select-white"
        />
      </div>

      <div className="tabs-curso">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: INSUMOS */}
      {activeTab === "insumos" && (
        <TabInsumos
          activeTab={activeTab}
          materiaSeleccionada={materiaSeleccionada}
          materiaNombre={materiaNombre}
          materiasOptions={materiasOptions}
          nuevoInsumo={nuevoInsumo}
          setNuevoInsumo={setNuevoInsumo}
          periodosOptions={periodosOptions}
          periodosVisibles={periodosVisibles}
          filtroPeriodo={filtroPeriodo}
          setFiltroPeriodo={setFiltroPeriodo}
          ordenInsumos={ordenInsumos}
          setOrdenInsumos={setOrdenInsumos}
          menuFiltroPeriodoAbierto={menuFiltroPeriodoAbierto}
          setMenuFiltroPeriodoAbierto={setMenuFiltroPeriodoAbierto}
          menuOrdenInsumosAbierto={menuOrdenInsumosAbierto}
          setMenuOrdenInsumosAbierto={setMenuOrdenInsumosAbierto}
          insumosMateria={insumosMateria}
          cargandoInsumo={cargandoInsumo}
          soloLecturaTutor={soloLecturaTutor}
          agregarInsumo={agregarInsumo}
          abrirInsumosNotas={abrirInsumosNotas}
          eliminarInsumo={eliminarInsumo}
          requestConfirm={requestConfirm}
          notasAPI={notasAPI}
          cargarNotasEstudiante={cargarNotasEstudiante}
          estudianteSeleccionado={estudianteSeleccionado}
        />
      )}

      <TabAsistencia
        activeTab={activeTab}
        estudiantesCurso={estudiantesCurso}
        fechaAsistencia={fechaAsistencia}
        setFechaAsistencia={setFechaAsistencia}
        estadosTemporales={estadosTemporales}
        setEstadosTemporales={setEstadosTemporales}
        asistenciaExistentePorEstudiante={asistenciaExistentePorEstudiante}
        onGuardarUno={guardarAsistenciaUno}
        onEliminarUno={eliminarAsistenciaUno}
        onGuardarTodo={guardarAsistenciaTodo}
      />

      <TabComportamiento
        activeTab={activeTab}
        estudiantesCurso={estudiantesCurso}
        mesComportamiento={mesComportamiento}
        setMesComportamiento={setMesComportamiento}
        valoresTemporales={valoresTemporales}
        setValoresTemporales={setValoresTemporales}
        observacionesTemporales={observacionesTemporales}
        setObservacionesTemporales={setObservacionesTemporales}
        comportamientoExistentePorEstudiante={comportamientoExistentePorEstudiante}
        onGuardarUno={guardarComportamientoUno}
        onEliminarUno={eliminarComportamientoUno}
        onGuardarTodo={guardarComportamientoTodo}
      />

      <TabNotasEstudiante
        activeTab={activeTab}
        estudiantesCurso={estudiantesCurso}
        estudianteSeleccionado={estudianteSeleccionado}
        setEstudianteSeleccionado={() => {}}
        notasIndividuales={notasIndividuales}
        cargandoNotasIndividual={cargandoNotasIndividual}
        onGuardarNota={guardarNotaIndividual}
      />

      <TabPromedios
        activeTab={activeTab}
        estudiantesCurso={estudiantesCurso}
        estudiantePromedio={estudiantePromedio}
        setEstudiantePromedio={setEstudiantePromedio}
        periodoSeleccionado={periodoSeleccionado}
        setPeriodoSeleccionado={setPeriodoSeleccionado}
        promedioPeriodo={promedioPeriodo}
        setPromedioPeriodo={setPromedioPeriodo}
        promedioAcumulado={promedioAcumulado}
        setPromedioAcumulado={setPromedioAcumulado}
        loadingPromedios={loadingPromedios}
        setLoadingPromedios={setLoadingPromedios}
        errorPromedios={errorPromedios}
        setErrorPromedios={setErrorPromedios}
        id_curso={id_curso}
        cursoDetalle={cursoDetalle}
        periodos={periodos}
      />

      <TabPeriodizacion
        activeTab={activeTab}
        errorPeriodos={errorPeriodos}
        periodos={periodos}
      />
    </>
  );
};
