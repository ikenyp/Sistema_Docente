import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  cmdAPI,
  cursosAPI,
  estudiantesAPI,
  insumosAPI,
  asistenciaAPI,
  comportamientoAPI,
  notasAPI,
  materiasAPI,
} from "../../services/api";
import { TabInsumos } from "./components/TabInsumos";
import { TabAsistencia } from "./components/TabAsistencia";
import { TabComportamiento } from "./components/TabComportamiento";
import { TabNotasEstudiante } from "./components/TabNotasEstudiante";
import { TabPromedios } from "./components/TabPromedios";
import { TabBusquedaEstudiantes } from "./components/TabBusquedaEstudiantes";
import "../../styles/cursoPrincipal.css";

function CursoPrincipal() {
  const navigate = useNavigate();
  const { id_curso } = useParams();
  const location = useLocation();
  const { curso } = location.state || { curso: null };

  const fechaHoy = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ====================== ESTADOS PRINCIPALES ======================
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [menuUsuario, setMenuUsuario] = useState(false);

  // Datos del curso
  const [cursoDetalle, setCursoDetalle] = useState(curso || null);
  const [materiasCurso, setMateriasCurso] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [insumosMateria, setInsumosMateria] = useState([]);
  const [materiaNombres, setMateriaNombres] = useState({});

  // Estudiantes del curso
  const [estudiantesCurso, setEstudiantesCurso] = useState([]);

  // Edición de insumos
  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: "",
    descripcion: "",
    ponderacion: "",
    tipo_insumo: "quiz",
    id_trimestre: "1",
  });

  // Vista de notas por insumo (modal)
  const [insumosSeleccionado, setInsumosSeleccionado] = useState(null);
  const [estudiantesInsumo, setEstudiantesInsumo] = useState([]);
  const [notasEstudiantes, setNotasEstudiantes] = useState({});

  // Tabs
  const [activeTab, setActiveTab] = useState("insumos");

  // Asistencia
  const [asistencias, setAsistencias] = useState([]);
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false);
  const [fechaAsistencia, setFechaAsistencia] = useState(fechaHoy);
  const [estadosTemporales, setEstadosTemporales] = useState({});

  // Comportamiento
  const [comportamientos, setComportamientos] = useState([]);
  const [cargandoComportamiento, setCargandoComportamiento] = useState(false);
  const [mesComportamiento, setMesComportamiento] = useState(
    new Date().toISOString().slice(0, 7),
  ); // YYYY-MM
  const [valoresTemporales, setValoresTemporales] = useState({});
  const [observacionesTemporales, setObservacionesTemporales] = useState({});

  // Notas por estudiante
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState("");
  const [notasIndividuales, setNotasIndividuales] = useState([]);
  const [cargandoNotasIndividual, setCargandoNotasIndividual] = useState(false);

  // Promedios
  const [promedioTrimestre, setPromedioTrimestre] = useState(null);
  const [promedioFinal, setPromedioFinal] = useState(null);
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState("1");
  const [estudiantePromedio, setEstudiantePromedio] = useState("");
  const [loadingPromedios, setLoadingPromedios] = useState(false);
  const [errorPromedios, setErrorPromedios] = useState(null);

  // Búsqueda de estudiantes
  const [busqueda, setBusqueda] = useState({ nombre: "", apellido: "" });
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  const tabs = useMemo(
    () => [
      { id: "insumos", label: "Insumos y notas" },
      { id: "asistencia", label: "Asistencia" },
      { id: "comportamiento", label: "Comportamiento" },
      { id: "notasEstudiante", label: "Notas por estudiante" },
      { id: "promedios", label: "Promedios" },
      // { id: "busqueda", label: "Búsqueda estudiantes" },
    ],
    [],
  );

  // ====================== FUNCIONES DE CARGA ======================
  const cargarInsumos = useCallback(async (id_cmd) => {
    if (!id_cmd) return;
    try {
      const insumos = await insumosAPI.listarPorCMD(id_cmd);
      setInsumosMateria(insumos || []);
    } catch (err) {
      console.error("Error al cargar insumos:", err);
    }
  }, []);

  const cargarAsistencia = useCallback(async (id_cmd) => {
    if (!id_cmd) return;
    try {
      setCargandoAsistencia(true);
      const data = await asistenciaAPI.listar({ id_cmd, size: 100 });
      setAsistencias(data || []);
    } catch (err) {
      console.error("Error al cargar asistencia:", err);
    } finally {
      setCargandoAsistencia(false);
    }
  }, []);

  const cargarComportamientos = useCallback(async () => {
    try {
      setCargandoComportamiento(true);
      const data = await comportamientoAPI.listar({ id_curso, size: 100 });
      setComportamientos(data || []);
    } catch (err) {
      console.error("Error al cargar comportamiento:", err);
    } finally {
      setCargandoComportamiento(false);
    }
  }, [id_curso]);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const usuarioJSON = localStorage.getItem("usuario");
      if (!usuarioJSON) {
        setError("No hay usuario autenticado");
        navigate("/");
        return;
      }

      const usuario = JSON.parse(usuarioJSON);
      setDatosUsuario(usuario);

      if (!cursoDetalle) {
        const cursoApi = await cursosAPI.obtenerCurso(id_curso);
        setCursoDetalle(cursoApi);
      }

      const cmd = await cmdAPI.listarPorDocente(id_curso, usuario.id_usuario);
      setMateriasCurso(cmd || []);

      // Cargar nombres de materias
      if (cmd && cmd.length > 0) {
        const faltantes = cmd
          .map((item) => item.id_materia)
          .filter((id) => id && !materiaNombres[id]);

        if (faltantes.length > 0) {
          const respuestas = await Promise.all(
            faltantes.map(async (id) => {
              try {
                const data = await materiasAPI.obtener(id);
                return { id, nombre: data?.nombre || `Materia ${id}` };
              } catch (err) {
                console.error("No se pudo obtener nombre de materia", id, err);
                return { id, nombre: `Materia ${id}` };
              }
            }),
          );

          const nuevos = respuestas.reduce((acc, item) => {
            acc[item.id] = item.nombre;
            return acc;
          }, {});

          setMateriaNombres((prev) => ({ ...prev, ...nuevos }));
        }
      }

      const estudiantes = await estudiantesAPI.obtenerPorCurso(id_curso);
      setEstudiantesCurso(estudiantes || []);

      if (cmd && cmd.length > 0) {
        const primera = cmd[0];
        setMateriaSeleccionada(primera);
        await Promise.all([
          cargarInsumos(primera.id_cmd),
          cargarAsistencia(primera.id_cmd),
        ]);
        await cargarComportamientos();
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError(err.message || "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }, [
    id_curso,
    navigate,
    cargarAsistencia,
    cargarComportamientos,
    cargarInsumos,
    cursoDetalle,
    materiaNombres,
  ]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Limpiar estados temporales cuando cambia el mes de comportamiento
  useEffect(() => {
    setValoresTemporales({});
    setObservacionesTemporales({});
  }, [mesComportamiento]);

  // Limpiar notas cuando se cierra el modal de insumos
  useEffect(() => {
    if (!insumosSeleccionado) {
      setNotasEstudiantes({});
    }
  }, [insumosSeleccionado, setNotasEstudiantes]);

  // ====================== FUNCIONES PARA NOTAS POR ESTUDIANTE ======================
  const cargarNotasEstudiante = useCallback(
    async (id_estudiante) => {
      if (!id_estudiante || !materiaSeleccionada) return;
      try {
        setCargandoNotasIndividual(true);
        const insumos = await insumosAPI.listarPorCMD(
          materiaSeleccionada.id_cmd,
        );
        const notas = await notasAPI.listarPorEstudiante(id_estudiante);

        const registros = insumos.map((insumo) => {
          const nota = notas.find((n) => n.id_insumo === insumo.id_insumo);
          return {
            insumo,
            valor: nota?.calificacion || "",
          };
        });

        setNotasIndividuales(registros);
      } catch (err) {
        console.error("Error al cargar notas del estudiante:", err);
      } finally {
        setCargandoNotasIndividual(false);
      }
    },
    [materiaSeleccionada],
  );

  const guardarNotaIndividual = async (registro, calificacion) => {
    if (
      calificacion === "" ||
      calificacion === null ||
      calificacion === undefined
    ) {
      alert("Por favor ingrese una calificación");
      return;
    }

    const notaNum = parseFloat(calificacion);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      alert("La calificación debe ser un número entre 0 y 10");
      return;
    }

    try {
      if (registro.valor) {
        const nota = (
          await notasAPI.listarPorEstudiante(estudianteSeleccionado)
        ).find((n) => n.id_insumo === registro.insumo.id_insumo);

        if (nota) {
          await notasAPI.actualizar(nota.id_nota, {
            calificacion: notaNum,
          });
        }
      } else {
        await notasAPI.crear({
          id_insumo: registro.insumo.id_insumo,
          id_estudiante: parseInt(estudianteSeleccionado, 10),
          calificacion: notaNum,
        });
      }

      await cargarNotasEstudiante(estudianteSeleccionado);
      alert("Nota guardada correctamente");
    } catch (err) {
      alert("Error al guardar nota: " + (err.message || err));
    }
  };

  useEffect(() => {
    if (estudianteSeleccionado) {
      cargarNotasEstudiante(estudianteSeleccionado);
    }
  }, [estudianteSeleccionado, cargarNotasEstudiante]);

  // ====================== FUNCIONES AUXILIARES ======================
  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  // ====================== RENDER ======================
  if (cargando)
    return <p style={{ padding: "20px", textAlign: "center" }}>Cargando...</p>;

  if (error)
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );

  return (
    <div className="curso-principal-container">
      <div className="navbar-curso">
        <button className="btn-volver" onClick={() => navigate("/docente")}>
          ← Volver
        </button>

        <h1 className="titulo-curso">📚 Sistema Docente</h1>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Usuario"}
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      <div className="curso-container">
        {materiasCurso.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>No hay materias asignadas</h2>
            <p>
              Aún no cuentas con materias asignadas a este curso. Las materias
              aparecerán aquí una vez sean añadidas.
            </p>
          </div>
        ) : (
          <>
            <div className="course-summary">
              <div>
                <p className="summary-label">Curso</p>
                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#333",
                    margin: "10px 0",
                  }}
                >
                  {cursoDetalle?.nombre || "Curso"}
                </h2>
                <p className="summary-sub">
                  Año lectivo: {cursoDetalle?.anio_lectivo || "-"}
                </p>
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

            <div className="materia-selector">
              <label>Selecciona Materia:</label>
              <select
                value={materiaSeleccionada?.id_cmd || ""}
                onChange={async (e) => {
                  const cmd = materiasCurso.find(
                    (c) => c.id_cmd === parseInt(e.target.value),
                  );
                  setMateriaSeleccionada(cmd);
                  if (cmd) {
                    await Promise.all([
                      cargarInsumos(cmd.id_cmd),
                      cargarAsistencia(cmd.id_cmd),
                    ]);
                  }
                }}
              >
                {materiasCurso.map((cmd) => (
                  <option key={cmd.id_cmd} value={cmd.id_cmd}>
                    {materiaNombres[cmd.id_materia] ||
                      `Materia ${cmd.id_materia}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="tabs-container">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-button ${
                    activeTab === tab.id ? "active" : ""
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tabs-content">
              <TabInsumos
                activeTab={activeTab}
                materiaSeleccionada={materiaSeleccionada}
                insumosMateria={insumosMateria}
                estudiantesCurso={estudiantesCurso}
                id_curso={id_curso}
                nuevoInsumo={nuevoInsumo}
                setNuevoInsumo={setNuevoInsumo}
                insumosSeleccionado={insumosSeleccionado}
                setInsumosSeleccionado={setInsumosSeleccionado}
                estudiantesInsumo={estudiantesInsumo}
                setEstudiantesInsumo={setEstudiantesInsumo}
                notasEstudiantes={notasEstudiantes}
                setNotasEstudiantes={setNotasEstudiantes}
                cargarInsumos={cargarInsumos}
              />

              <TabAsistencia
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                asistencias={asistencias}
                cargandoAsistencia={cargandoAsistencia}
                fechaAsistencia={fechaAsistencia}
                setFechaAsistencia={setFechaAsistencia}
                estadosTemporales={estadosTemporales}
                setEstadosTemporales={setEstadosTemporales}
                id_cmd={materiaSeleccionada?.id_cmd}
                cargarAsistencia={cargarAsistencia}
              />

              <TabComportamiento
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                comportamientos={comportamientos}
                cargandoComportamiento={cargandoComportamiento}
                mesComportamiento={mesComportamiento}
                setMesComportamiento={setMesComportamiento}
                valoresTemporales={valoresTemporales}
                setValoresTemporales={setValoresTemporales}
                observacionesTemporales={observacionesTemporales}
                setObservacionesTemporales={setObservacionesTemporales}
                id_curso={id_curso}
                cargarComportamientos={cargarComportamientos}
              />

              <TabNotasEstudiante
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                estudianteSeleccionado={estudianteSeleccionado}
                setEstudianteSeleccionado={setEstudianteSeleccionado}
                notasIndividuales={notasIndividuales}
                cargandoNotasIndividual={cargandoNotasIndividual}
                onGuardarNota={guardarNotaIndividual}
              />

              <TabPromedios
                activeTab={activeTab}
                estudiantesCurso={estudiantesCurso}
                estudiantePromedio={estudiantePromedio}
                setEstudiantePromedio={setEstudiantePromedio}
                trimestreSeleccionado={trimestreSeleccionado}
                setTrimestreSeleccionado={setTrimestreSeleccionado}
                promedioTrimestre={promedioTrimestre}
                setPromedioTrimestre={setPromedioTrimestre}
                promedioFinal={promedioFinal}
                setPromedioFinal={setPromedioFinal}
                loadingPromedios={loadingPromedios}
                setLoadingPromedios={setLoadingPromedios}
                errorPromedios={errorPromedios}
                setErrorPromedios={setErrorPromedios}
                id_curso={id_curso}
                cursoDetalle={cursoDetalle}
              />

              <TabBusquedaEstudiantes
                activeTab={activeTab}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                resultadosBusqueda={resultadosBusqueda}
                setResultadosBusqueda={setResultadosBusqueda}
                cargandoBusqueda={cargandoBusqueda}
                setCargandoBusqueda={setCargandoBusqueda}
                id_curso={id_curso}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CursoPrincipal;
