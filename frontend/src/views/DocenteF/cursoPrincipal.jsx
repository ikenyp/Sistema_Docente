import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  asistenciaAPI,
  cmdAPI,
  comportamientoAPI,
  cursosAPI,
  estudiantesAPI,
  insumosAPI,
  notasAPI,
  promediosAPI,
  materiasAPI,
} from "../../services/api";
import "../../styles/cursoPrincipal.css";

const ESTADOS_ASISTENCIA = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "justificado", label: "Justificado" },
];

const VALORES_COMPORTAMIENTO = ["A", "B", "C", "D"];

function CursoPrincipal() {
  const navigate = useNavigate();
  const { id_curso } = useParams();
  const location = useLocation();
  const { curso } = location.state || { curso: null };

  const fechaHoy = useMemo(() => new Date().toISOString().split("T")[0], []);

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
  });
  const [cargandoInsumo, setCargandoInsumo] = useState(false);

  // Vista de notas por insumo (modal)
  const [insumosSeleccionado, setInsumosSeleccionado] = useState(null);
  const [estudiantesInsumo, setEstudiantesInsumo] = useState([]);
  const [notasEstudiantes, setNotasEstudiantes] = useState({});

  // Tabs
  const [activeTab, setActiveTab] = useState("insumos");

  // Asistencia
  const [asistencias, setAsistencias] = useState([]);
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false);
  const [asistenciaForm, setAsistenciaForm] = useState({
    id_estudiante: "",
    fecha: fechaHoy,
    estado: ESTADOS_ASISTENCIA[0].value,
  });
  const [asistenciaEditando, setAsistenciaEditando] = useState(null);

  // Comportamiento
  const [comportamientos, setComportamientos] = useState([]);
  const [cargandoComportamiento, setCargandoComportamiento] = useState(false);
  const [comportamientoForm, setComportamientoForm] = useState({
    id_estudiante: "",
    mes: "",
    valor: VALORES_COMPORTAMIENTO[0],
    observaciones: "",
  });
  const [comportamientoEditando, setComportamientoEditando] = useState(null);

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
      { id: "busqueda", label: "Búsqueda estudiantes" },
    ],
    []
  );

  // ====================== CARGA BASE ======================
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

  const cargarNombresMaterias = useCallback(
    async (cmdList) => {
      const faltantes = (cmdList || [])
        .map((item) => item.id_materia)
        .filter((id) => id && !materiaNombres[id]);

      if (faltantes.length === 0) return;

      try {
        const respuestas = await Promise.all(
          faltantes.map(async (id) => {
            try {
              const data = await materiasAPI.obtener(id);
              return { id, nombre: data?.nombre || `Materia ${id}` };
            } catch (err) {
              console.error("No se pudo obtener nombre de materia", id, err);
              return { id, nombre: `Materia ${id}` };
            }
          })
        );

        const nuevos = respuestas.reduce((acc, item) => {
          acc[item.id] = item.nombre;
          return acc;
        }, {});

        setMateriaNombres((prev) => ({ ...prev, ...nuevos }));
      } catch (err) {
        console.error("Error cargando nombres de materias", err);
      }
    },
    [materiaNombres]
  );

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
      await cargarNombresMaterias(cmd || []);

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
    cursoDetalle,
    id_curso,
    navigate,
    cargarAsistencia,
    cargarComportamientos,
    cargarInsumos,
    cargarNombresMaterias,
  ]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ====================== INSUMOS ======================
  const agregarInsumo = async () => {
    if (!nuevoInsumo.nombre.trim() || !nuevoInsumo.ponderacion) {
      alert("Debe completar nombre y ponderación");
      return;
    }

    try {
      setCargandoInsumo(true);
      const data = {
        id_cmd: materiaSeleccionada.id_cmd,
        nombre: nuevoInsumo.nombre,
        descripcion: nuevoInsumo.descripcion || null,
        ponderacion: parseFloat(nuevoInsumo.ponderacion),
      };

      await insumosAPI.crear(data);
      setNuevoInsumo({ nombre: "", descripcion: "", ponderacion: "" });
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      alert("Error al crear insumo: " + err.message);
    } finally {
      setCargandoInsumo(false);
    }
  };

  const eliminarInsumo = async (id_insumo) => {
    if (!window.confirm("¿Está seguro de eliminar este insumo?")) return;

    try {
      await insumosAPI.eliminar(id_insumo);
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      alert("Error al eliminar insumo: " + err.message);
    }
  };

  // ====================== NOTAS (modal por insumo) ======================
  const abrirInsumosNotas = async (insumo) => {
    try {
      setInsumosSeleccionado(insumo);

      const estudiantes =
        estudiantesCurso.length > 0
          ? estudiantesCurso
          : await estudiantesAPI.obtenerPorCurso(id_curso);
      setEstudiantesInsumo(estudiantes || []);

      const notas = await notasAPI.listarPorInsumo(insumo.id_insumo);
      const notasMap = {};
      notas.forEach((nota) => {
        notasMap[nota.id_estudiante] = nota;
      });
      setNotasEstudiantes(notasMap);
    } catch (err) {
      alert("Error al cargar notas: " + err.message);
    }
  };

  const guardarNota = async (id_estudiante, calificacion) => {
    if (
      calificacion === "" ||
      calificacion === null ||
      calificacion === undefined
    )
      return;

    try {
      const nota = notasEstudiantes[id_estudiante];

      if (nota) {
        await notasAPI.actualizar(nota.id_nota, {
          calificacion: parseFloat(calificacion),
        });
      } else {
        await notasAPI.crear({
          id_insumo: insumosSeleccionado.id_insumo,
          id_estudiante: id_estudiante,
          calificacion: parseFloat(calificacion),
        });
      }

      await abrirInsumosNotas(insumosSeleccionado);
    } catch (err) {
      alert("Error al guardar nota: " + err.message);
    }
  };

  // ====================== ASISTENCIA ======================
  const resetAsistenciaForm = () => {
    setAsistenciaForm({
      id_estudiante: "",
      fecha: fechaHoy,
      estado: ESTADOS_ASISTENCIA[0].value,
    });
    setAsistenciaEditando(null);
  };

  const guardarAsistencia = async () => {
    if (!materiaSeleccionada) return;
    if (!asistenciaForm.id_estudiante || !asistenciaForm.fecha) {
      alert("Seleccione estudiante y fecha");
      return;
    }

    try {
      setCargandoAsistencia(true);
      const payload = {
        ...asistenciaForm,
        id_cmd: materiaSeleccionada.id_cmd,
        id_estudiante: parseInt(asistenciaForm.id_estudiante, 10),
      };

      if (asistenciaEditando) {
        await asistenciaAPI.actualizar(
          asistenciaEditando.id_asistencia,
          payload
        );
      } else {
        await asistenciaAPI.crear(payload);
      }

      await cargarAsistencia(materiaSeleccionada.id_cmd);
      resetAsistenciaForm();
    } catch (err) {
      alert("No se pudo guardar la asistencia: " + err.message);
    } finally {
      setCargandoAsistencia(false);
    }
  };

  const editarAsistencia = (registro) => {
    setAsistenciaEditando(registro);
    setAsistenciaForm({
      id_estudiante: registro.id_estudiante,
      fecha: registro.fecha,
      estado: registro.estado,
    });
  };

  const eliminarAsistencia = async (id_asistencia) => {
    if (!window.confirm("¿Eliminar registro de asistencia?")) return;
    try {
      await asistenciaAPI.eliminar(id_asistencia);
      await cargarAsistencia(materiaSeleccionada.id_cmd);
      resetAsistenciaForm();
    } catch (err) {
      alert("No se pudo eliminar: " + err.message);
    }
  };

  // ====================== COMPORTAMIENTO ======================
  const resetComportamientoForm = () => {
    setComportamientoForm({
      id_estudiante: "",
      mes: "",
      valor: VALORES_COMPORTAMIENTO[0],
      observaciones: "",
    });
    setComportamientoEditando(null);
  };

  const guardarComportamiento = async () => {
    if (!comportamientoForm.id_estudiante || !comportamientoForm.mes) {
      alert("Seleccione estudiante y mes");
      return;
    }

    try {
      setCargandoComportamiento(true);
      const payload = {
        ...comportamientoForm,
        id_curso: parseInt(id_curso, 10),
        id_estudiante: parseInt(comportamientoForm.id_estudiante, 10),
      };

      if (comportamientoEditando) {
        await comportamientoAPI.actualizar(
          comportamientoEditando.id_comportamiento,
          payload
        );
      } else {
        await comportamientoAPI.crear(payload);
      }

      await cargarComportamientos();
      resetComportamientoForm();
    } catch (err) {
      alert("No se pudo guardar el comportamiento: " + err.message);
    } finally {
      setCargandoComportamiento(false);
    }
  };

  const editarComportamiento = (registro) => {
    setComportamientoEditando(registro);
    setComportamientoForm({
      id_estudiante: registro.id_estudiante,
      mes: registro.mes,
      valor: registro.valor,
      observaciones: registro.observaciones || "",
    });
  };

  const eliminarComportamiento = async (id_comportamiento) => {
    if (!window.confirm("¿Eliminar registro de comportamiento?")) return;
    try {
      await comportamientoAPI.eliminar(id_comportamiento);
      await cargarComportamientos();
      resetComportamientoForm();
    } catch (err) {
      alert("No se pudo eliminar: " + err.message);
    }
  };

  // ====================== NOTAS POR ESTUDIANTE ======================
  const cargarNotasEstudiante = useCallback(
    async (id_estudiante) => {
      if (!id_estudiante || !materiaSeleccionada) return;
      try {
        setCargandoNotasIndividual(true);
        const notas = await notasAPI.listar({ id_estudiante });
        const mapNotas = {};
        (notas || []).forEach((nota) => {
          mapNotas[nota.id_insumo] = nota;
        });

        const dataset = (insumosMateria || []).map((insumo) => ({
          insumo,
          id_nota: mapNotas[insumo.id_insumo]?.id_nota || null,
          valor: mapNotas[insumo.id_insumo]?.calificacion ?? "",
        }));

        setNotasIndividuales(dataset);
      } catch (err) {
        alert("No se pudieron cargar las notas del estudiante: " + err.message);
      } finally {
        setCargandoNotasIndividual(false);
      }
    },
    [insumosMateria, materiaSeleccionada]
  );

  useEffect(() => {
    if (estudianteSeleccionado) {
      cargarNotasEstudiante(estudianteSeleccionado);
    }
  }, [cargarNotasEstudiante, estudianteSeleccionado]);

  const guardarNotaIndividual = async (registro, nuevoValor) => {
    if (nuevoValor === "" || nuevoValor === null || nuevoValor === undefined)
      return;
    try {
      if (registro.id_nota) {
        await notasAPI.actualizar(registro.id_nota, {
          calificacion: parseFloat(nuevoValor),
        });
      } else {
        await notasAPI.crear({
          id_estudiante: parseInt(estudianteSeleccionado, 10),
          id_insumo: registro.insumo.id_insumo,
          calificacion: parseFloat(nuevoValor),
        });
      }

      await cargarNotasEstudiante(estudianteSeleccionado);
    } catch (err) {
      alert("No se pudo guardar la nota: " + err.message);
    }
  };

  // ====================== PROMEDIOS ======================
  const consultarPromedioTrimestral = async () => {
    if (!estudiantePromedio || !cursoDetalle?.anio_lectivo) {
      alert("Seleccione estudiante y verifique que el curso tenga año lectivo");
      return;
    }
    try {
      setLoadingPromedios(true);
      setErrorPromedios(null);
      const data = await promediosAPI.obtenerTrimestral(
        parseInt(estudiantePromedio, 10),
        parseInt(id_curso, 10),
        parseInt(trimestreSeleccionado, 10),
        cursoDetalle.anio_lectivo
      );
      setPromedioTrimestre(data);
    } catch (err) {
      setErrorPromedios(
        err.message || "No se pudo calcular el promedio trimestral"
      );
    } finally {
      setLoadingPromedios(false);
    }
  };

  const consultarPromedioFinal = async () => {
    if (!estudiantePromedio || !cursoDetalle?.anio_lectivo) {
      alert("Seleccione estudiante y verifique que el curso tenga año lectivo");
      return;
    }
    try {
      setLoadingPromedios(true);
      setErrorPromedios(null);
      const data = await promediosAPI.obtenerFinal(
        parseInt(estudiantePromedio, 10),
        parseInt(id_curso, 10),
        cursoDetalle.anio_lectivo
      );
      setPromedioFinal(data);
    } catch (err) {
      setErrorPromedios(err.message || "No se pudo calcular el promedio final");
    } finally {
      setLoadingPromedios(false);
    }
  };

  // ====================== BÚSQUEDA DE ESTUDIANTES ======================
  const ejecutarBusqueda = async () => {
    try {
      setCargandoBusqueda(true);
      const filtros = {
        id_curso: id_curso,
        nombre: busqueda.nombre.trim() || undefined,
        apellido: busqueda.apellido.trim() || undefined,
        size: 50,
      };
      const data = await estudiantesAPI.buscar(filtros);
      setResultadosBusqueda(data || []);
    } catch (err) {
      alert("No se pudo realizar la búsqueda: " + err.message);
    } finally {
      setCargandoBusqueda(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  // ====================== RENDERS ======================
  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  const materiaNombre = (m) => {
    if (!m) return "Materia";
    if (m.materia?.nombre) return m.materia.nombre;
    const nombreGuardado = materiaNombres[m.id_materia];
    return nombreGuardado || `Materia ${m.id_materia}`;
  };

  return (
    <div className="curso-principal-page">
      <div className="navbar-curso">
        <button className="btn-volver" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <h2 className="titulo-curso">
          {cursoDetalle?.nombre || curso?.nombre}
        </h2>

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
              Aún no hay materias asignadas a este curso. Las materias
              aparecerán aquí una vez sean añadidas.
            </p>
          </div>
        ) : (
          <>
            <div className="course-summary">
              <div>
                <p className="summary-label">Curso</p>
                <h3>{cursoDetalle?.nombre || "Curso"}</h3>
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
                  const selected = materiasCurso.find(
                    (m) => m.id_cmd === parseInt(e.target.value, 10)
                  );
                  setMateriaSeleccionada(selected);
                  await cargarInsumos(selected.id_cmd);
                  await cargarAsistencia(selected.id_cmd);
                  if (estudianteSeleccionado) {
                    cargarNotasEstudiante(estudianteSeleccionado);
                  }
                }}
              >
                {materiasCurso.map((materia) => (
                  <option key={materia.id_cmd} value={materia.id_cmd}>
                    {materiaNombre(materia)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tabs-curso">
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

            {/* TAB: INSUMOS */}
            {activeTab === "insumos" && materiaSeleccionada && (
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
                      setNuevoInsumo({
                        ...nuevoInsumo,
                        descripcion: e.target.value,
                      })
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
                      setNuevoInsumo({
                        ...nuevoInsumo,
                        ponderacion: e.target.value,
                      })
                    }
                  />
                  <button
                    onClick={agregarInsumo}
                    disabled={cargandoInsumo}
                    className="btn-add-insumo"
                  >
                    {cargandoInsumo ? "Agregando..." : "Agregar Insumo"}
                  </button>
                </div>

                <div className="insumos-list">
                  {insumosMateria.length === 0 ? (
                    <p>No hay insumos creados</p>
                  ) : (
                    insumosMateria.map((insumo) => (
                      <div key={insumo.id_insumo} className="insumo-card">
                        <div className="insumo-info">
                          <h4>{insumo.nombre}</h4>
                          <p>{insumo.descripcion}</p>
                          <small>Ponderación: {insumo.ponderacion}</small>
                        </div>
                        <div className="insumo-actions">
                          <button
                            className="btn-notas"
                            onClick={() => abrirInsumosNotas(insumo)}
                          >
                            Notas
                          </button>
                          <button
                            className="btn-eliminar"
                            onClick={() => eliminarInsumo(insumo.id_insumo)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: ASISTENCIA */}
            {activeTab === "asistencia" && (
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>🗓️ Asistencia</h3>
                    <p className="panel-sub">
                      Crear, editar o eliminar registros
                    </p>
                  </div>
                  <button className="link-button" onClick={resetAsistenciaForm}>
                    Limpiar formulario
                  </button>
                </div>

                <div className="form-grid">
                  <select
                    value={asistenciaForm.id_estudiante}
                    onChange={(e) =>
                      setAsistenciaForm({
                        ...asistenciaForm,
                        id_estudiante: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione estudiante</option>
                    {estudiantesCurso.map((est) => (
                      <option key={est.id_estudiante} value={est.id_estudiante}>
                        {est.nombre} {est.apellido}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={asistenciaForm.fecha}
                    onChange={(e) =>
                      setAsistenciaForm({
                        ...asistenciaForm,
                        fecha: e.target.value,
                      })
                    }
                  />

                  <select
                    value={asistenciaForm.estado}
                    onChange={(e) =>
                      setAsistenciaForm({
                        ...asistenciaForm,
                        estado: e.target.value,
                      })
                    }
                  >
                    {ESTADOS_ASISTENCIA.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn-primary"
                    onClick={guardarAsistencia}
                    disabled={cargandoAsistencia}
                  >
                    {asistenciaEditando ? "Actualizar" : "Crear"} registro
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistencias.map((item) => {
                        const estudiante = estudiantesCurso.find(
                          (e) => e.id_estudiante === item.id_estudiante
                        );
                        return (
                          <tr key={item.id_asistencia}>
                            <td>
                              {estudiante
                                ? `${estudiante.nombre} ${estudiante.apellido}`
                                : `ID ${item.id_estudiante}`}
                            </td>
                            <td>{item.fecha}</td>
                            <td>
                              <span className={`pill pill-${item.estado}`}>
                                {item.estado}
                              </span>
                            </td>
                            <td className="actions-cell">
                              <button
                                className="link-button"
                                onClick={() => editarAsistencia(item)}
                              >
                                Editar
                              </button>
                              <button
                                className="link-button danger"
                                onClick={() =>
                                  eliminarAsistencia(item.id_asistencia)
                                }
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {asistencias.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center" }}>
                            No hay registros de asistencia para esta materia
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: COMPORTAMIENTO */}
            {activeTab === "comportamiento" && (
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>🧭 Comportamiento</h3>
                    <p className="panel-sub">Valoraciones mensuales (A-D)</p>
                  </div>
                  <button
                    className="link-button"
                    onClick={resetComportamientoForm}
                  >
                    Limpiar formulario
                  </button>
                </div>

                <div className="form-grid">
                  <select
                    value={comportamientoForm.id_estudiante}
                    onChange={(e) =>
                      setComportamientoForm({
                        ...comportamientoForm,
                        id_estudiante: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione estudiante</option>
                    {estudiantesCurso.map((est) => (
                      <option key={est.id_estudiante} value={est.id_estudiante}>
                        {est.nombre} {est.apellido}
                      </option>
                    ))}
                  </select>

                  <input
                    type="month"
                    value={comportamientoForm.mes}
                    onChange={(e) =>
                      setComportamientoForm({
                        ...comportamientoForm,
                        mes: e.target.value,
                      })
                    }
                  />

                  <select
                    value={comportamientoForm.valor}
                    onChange={(e) =>
                      setComportamientoForm({
                        ...comportamientoForm,
                        valor: e.target.value,
                      })
                    }
                  >
                    {VALORES_COMPORTAMIENTO.map((valor) => (
                      <option key={valor} value={valor}>
                        {valor}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Observaciones"
                    value={comportamientoForm.observaciones}
                    onChange={(e) =>
                      setComportamientoForm({
                        ...comportamientoForm,
                        observaciones: e.target.value,
                      })
                    }
                  />

                  <button
                    className="btn-primary"
                    onClick={guardarComportamiento}
                    disabled={cargandoComportamiento}
                  >
                    {comportamientoEditando ? "Actualizar" : "Guardar"}
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Mes</th>
                        <th>Valor</th>
                        <th>Observaciones</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comportamientos.map((item) => {
                        const estudiante = estudiantesCurso.find(
                          (e) => e.id_estudiante === item.id_estudiante
                        );
                        return (
                          <tr key={item.id_comportamiento}>
                            <td>
                              {estudiante
                                ? `${estudiante.nombre} ${estudiante.apellido}`
                                : `ID ${item.id_estudiante}`}
                            </td>
                            <td>{item.mes}</td>
                            <td>
                              <span className="pill pill-valor">
                                {item.valor}
                              </span>
                            </td>
                            <td>{item.observaciones || "-"}</td>
                            <td className="actions-cell">
                              <button
                                className="link-button"
                                onClick={() => editarComportamiento(item)}
                              >
                                Editar
                              </button>
                              <button
                                className="link-button danger"
                                onClick={() =>
                                  eliminarComportamiento(item.id_comportamiento)
                                }
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {comportamientos.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center" }}>
                            No hay registros de comportamiento
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: NOTAS POR ESTUDIANTE */}
            {activeTab === "notasEstudiante" && (
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>📑 Notas por estudiante</h3>
                    <p className="panel-sub">Gestiona notas por cada insumo</p>
                  </div>
                </div>

                <div className="form-grid">
                  <select
                    value={estudianteSeleccionado}
                    onChange={(e) => setEstudianteSeleccionado(e.target.value)}
                  >
                    <option value="">Seleccione estudiante</option>
                    {estudiantesCurso.map((est) => (
                      <option key={est.id_estudiante} value={est.id_estudiante}>
                        {est.nombre} {est.apellido}
                      </option>
                    ))}
                  </select>
                </div>

                {cargandoNotasIndividual && <p>Cargando notas...</p>}

                {!cargandoNotasIndividual && estudianteSeleccionado && (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th>Ponderación</th>
                          <th>Nota</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasIndividuales.map((registro) => (
                          <tr key={registro.insumo.id_insumo}>
                            <td>{registro.insumo.nombre}</td>
                            <td>{registro.insumo.ponderacion}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                defaultValue={registro.valor}
                                className="input-nota"
                                id={`nota-ind-${registro.insumo.id_insumo}`}
                              />
                            </td>
                            <td>
                              <button
                                className="btn-guardar-nota"
                                onClick={() => {
                                  const input = document.getElementById(
                                    `nota-ind-${registro.insumo.id_insumo}`
                                  );
                                  guardarNotaIndividual(registro, input.value);
                                }}
                              >
                                Guardar
                              </button>
                            </td>
                          </tr>
                        ))}
                        {notasIndividuales.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center" }}>
                              No hay insumos configurados para esta materia
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PROMEDIOS */}
            {activeTab === "promedios" && (
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>📈 Promedios</h3>
                    <p className="panel-sub">Trimestral y final anual</p>
                  </div>
                </div>

                <div className="form-grid">
                  <select
                    value={estudiantePromedio}
                    onChange={(e) => setEstudiantePromedio(e.target.value)}
                  >
                    <option value="">Seleccione estudiante</option>
                    {estudiantesCurso.map((est) => (
                      <option key={est.id_estudiante} value={est.id_estudiante}>
                        {est.nombre} {est.apellido}
                      </option>
                    ))}
                  </select>

                  <select
                    value={trimestreSeleccionado}
                    onChange={(e) => setTrimestreSeleccionado(e.target.value)}
                  >
                    <option value="1">Trimestre 1</option>
                    <option value="2">Trimestre 2</option>
                    <option value="3">Trimestre 3</option>
                  </select>

                  <button
                    className="btn-primary"
                    onClick={consultarPromedioTrimestral}
                    disabled={loadingPromedios}
                  >
                    Ver promedio trimestral
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={consultarPromedioFinal}
                    disabled={loadingPromedios}
                  >
                    Ver promedio final
                  </button>
                </div>

                {errorPromedios && (
                  <p style={{ color: "red", marginTop: "10px" }}>
                    {errorPromedios}
                  </p>
                )}

                {promedioTrimestre && (
                  <div className="cards-grid">
                    <div className="stat-card">
                      <p className="stat-label">
                        Trimestre {promedioTrimestre.numero_trimestre}
                      </p>
                      <h3 className="stat-value">
                        {promedioTrimestre.promedio_trimestral ?? "-"}
                      </h3>
                      <p className="stat-sub">
                        Actividades:{" "}
                        {promedioTrimestre.promedio_actividades ?? "-"}
                      </p>
                      <p className="stat-sub">
                        Proyecto: {promedioTrimestre.promedio_proyecto ?? "-"}
                      </p>
                      <p className="stat-sub">
                        Examen: {promedioTrimestre.promedio_examen ?? "-"}
                      </p>
                    </div>
                  </div>
                )}

                {promedioFinal && (
                  <div className="cards-grid">
                    <div className="stat-card accent">
                      <p className="stat-label">Promedio Final</p>
                      <h3 className="stat-value">
                        {promedioFinal.promedio_final ?? "-"}
                      </h3>
                      <p className="stat-sub">
                        Trimestres con datos:{" "}
                        {promedioFinal.trimestres_con_datos}
                      </p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-label">Detalle por trimestre</p>
                      <ul className="trimestre-list">
                        {promedioFinal.promedios_trimestrales.map((t) => (
                          <li key={t.numero_trimestre}>
                            <strong>T{t.numero_trimestre}:</strong>{" "}
                            {t.promedio_trimestral ?? "-"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BÚSQUEDA DE ESTUDIANTES */}
            {activeTab === "busqueda" && (
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>🔎 Buscar estudiantes</h3>
                    <p className="panel-sub">
                      Filtra por nombre o apellido dentro del curso
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={busqueda.nombre}
                    onChange={(e) =>
                      setBusqueda({ ...busqueda, nombre: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={busqueda.apellido}
                    onChange={(e) =>
                      setBusqueda({ ...busqueda, apellido: e.target.value })
                    }
                  />
                  <button
                    className="btn-primary"
                    onClick={ejecutarBusqueda}
                    disabled={cargandoBusqueda}
                  >
                    Buscar
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setBusqueda({ nombre: "", apellido: "" });
                      setResultadosBusqueda([]);
                    }}
                  >
                    Limpiar
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Estado</th>
                        <th>Curso actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosBusqueda.map((est) => (
                        <tr key={est.id_estudiante}>
                          <td>
                            {est.nombre} {est.apellido}
                          </td>
                          <td>
                            <span className="pill pill-estado">
                              {est.estado}
                            </span>
                          </td>
                          <td>{est.id_curso_actual || "-"}</td>
                        </tr>
                      ))}
                      {resultadosBusqueda.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center" }}>
                            {cargandoBusqueda
                              ? "Buscando..."
                              : "Sin resultados"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL DE NOTAS POR INSUMO */}
        {insumosSeleccionado && (
          <div className="modal-overlay">
            <div className="modal-notas">
              <div className="modal-header">
                <h3>Agregar Notas - {insumosSeleccionado.nombre}</h3>
                <button
                  className="btn-cerrar"
                  onClick={() => setInsumosSeleccionado(null)}
                >
                  ✕
                </button>
              </div>

              <div className="tabla-notas">
                <table>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Nota</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesInsumo.map((estudiante) => (
                      <tr key={estudiante.id_estudiante}>
                        <td>
                          {estudiante.nombre} {estudiante.apellido}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            defaultValue={
                              notasEstudiantes[estudiante.id_estudiante]
                                ?.calificacion || ""
                            }
                            placeholder="--"
                            className="input-nota"
                            id={`nota-${estudiante.id_estudiante}`}
                          />
                        </td>
                        <td>
                          <button
                            className="btn-guardar-nota"
                            onClick={() => {
                              const input = document.getElementById(
                                `nota-${estudiante.id_estudiante}`
                              );
                              guardarNota(
                                estudiante.id_estudiante,
                                input.value
                              );
                            }}
                          >
                            Guardar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CursoPrincipal;
