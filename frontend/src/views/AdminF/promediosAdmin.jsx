import React, { useEffect, useMemo, useState } from "react";
import { Search, Save, X, Brush, Calculator, ArrowLeft } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import CustomSelect from "../../components/admin/CustomSelect";
import { cursosAPI, estudiantesAPI, periodizacionAPI, promediosAPI } from "../../services/api";
import { notify } from "../../components/notify";

function PromediosAdmin() {
  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [estudiantes, setEstudiantes] = useState([]);
  const [estSel, setEstSel] = useState("");

  const [anio, setAnio] = useState("");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [modo, setModo] = useState("periodo");
  const [resultado, setResultado] = useState(null);
  const [periodosConfigurados, setPeriodosConfigurados] = useState([]);

  const resumen = useMemo(
    () => ({
      cursos: cursos.length,
      estudiantes: estudiantes.length,
      modo: modo === "periodo" ? "Periodo" : "Acumulado",
    }),
    [cursos.length, estudiantes.length, modo],
  );

  useEffect(() => {
    (async () => {
      try {
        setCursos((await cursosAPI.listar({ size: 100 })) || []);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        setEstudiantes(
          (await estudiantesAPI.buscar({
            id_curso: cursoSel || undefined,
            size: 100,
          })) || [],
        );
        setEstSel("");
      } catch {}
    })();
  }, [cursoSel]);

  useEffect(() => {
    (async () => {
      if (!anio) {
        setPeriodosConfigurados([]);
        setPeriodoSeleccionado("");
        return;
      }
      try {
        const config = await periodizacionAPI.obtenerConfiguracionActual(anio);
        setPeriodosConfigurados(config?.periodos || []);
        setPeriodoSeleccionado(
          (config?.periodos || [])[0]?.numero_periodo?.toString() || "",
        );
      } catch {
        setPeriodosConfigurados([]);
        setPeriodoSeleccionado("");
      }
    })();
  }, [anio]);

  const calcular = async () => {
    if (!cursoSel || !estSel || !anio) {
      notify("error", "Seleccione curso, estudiante y año lectivo");
      return;
    }
    try {
      if (modo === "periodo") {
        const res = await promediosAPI.obtenerPeriodo(
          Number(estSel),
          Number(cursoSel),
          Number(periodoSeleccionado),
          anio,
        );
        setResultado(res);
      } else {
        const res = await promediosAPI.obtenerAcumulado(
          Number(estSel),
          Number(cursoSel),
          anio,
        );
        setResultado(res);
      }
    } catch (e) {
      notify("error", e.message || "No se pudo obtener el promedio");
    }
  };

  const limpiar = () => {
    setCursoSel("");
    setEstSel("");
    setAnio("");
    setPeriodoSeleccionado("");
    setModo("periodo");
    setResultado(null);
  };

  return (
    <AdminLayout
      title="Promedios y reportes"
      subtitle="Consulte promedios de estudiantes por curso, ano lectivo y periodo."
    >
      <h2 className="section-title">Promedios y reportes</h2>

      <div className="empty-state" style={{ marginBottom: 16 }}>
        <h3>Consulta simple y directa</h3>
        <p>
          Selecciona un curso, un estudiante y el año lectivo para obtener
          solo el promedio que necesitas revisar o presentar.
        </p>
      </div>

      <div className="cards-grid dashboard-summary-grid">
        <div className="stat-card accent">
          <p className="stat-label">Cursos</p>
          <h3 className="stat-value">{resumen.cursos}</h3>
          <p className="stat-sub">Disponibles para consultar</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estudiantes</p>
          <h3 className="stat-value">{resumen.estudiantes}</h3>
          <p className="stat-sub">Cargados según el curso</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Modo</p>
          <h3 className="stat-value">{resumen.modo}</h3>
          <p className="stat-sub">Cálculo actual</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <CustomSelect
          value={cursoSel}
          onChange={setCursoSel}
          options={cursos.map((c) => ({
            value: String(c.id_curso),
            label: c.nombre,
          }))}
          placeholder="Curso"
          className="custom-select-white"
        />
        <CustomSelect
          value={estSel}
          onChange={setEstSel}
          options={estudiantes.map((e) => ({
            value: String(e.id_estudiante),
            label: `${e.nombre} ${e.apellido}`,
          }))}
          placeholder="Estudiante"
          className="custom-select-white"
        />
        <input
          placeholder="Año lectivo (ej. 2025-2026)"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
        <CustomSelect
          value={modo}
          onChange={setModo}
          options={[
            { value: "periodo", label: "Por periodo" },
            { value: "final", label: "Acumulado" },
          ]}
          placeholder="Modo"
          className="custom-select-white"
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn-view" onClick={calcular}>
          <Calculator size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
          Calcular
        </button>
        <button className="btn-secondary" onClick={limpiar} type="button">
          <Brush size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
          Limpiar
        </button>
      </div>

      {modo === "periodo" && (
        <div style={{ marginBottom: 16 }}>
          <CustomSelect
            value={periodoSeleccionado}
            onChange={setPeriodoSeleccionado}
            options={periodosConfigurados.map((periodo) => ({
              value: String(periodo.numero_periodo),
              label: periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`,
            }))}
            placeholder="Seleccione periodo"
            className="custom-select-white"
          />
        </div>
      )}

      <div className="table-container" style={{ marginTop: 16 }}>
        <h3>Resultado</h3>
        {resultado ? (
          <>
            <div className="cards-grid" style={{ marginBottom: 12 }}>
              {modo === "periodo" ? (
                <>
                  <div className="stat-card accent">
                    <p className="stat-label">Promedio del periodo</p>
                    <h3 className="stat-value">
                      {resultado.promedio_periodo ?? "-"}
                    </h3>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Actividades</p>
                    <h3 className="stat-value">
                      {resultado.promedio_actividades ?? "-"}
                    </h3>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Proyecto</p>
                    <h3 className="stat-value">
                      {resultado.promedio_proyecto ?? "-"}
                    </h3>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Examen</p>
                    <h3 className="stat-value">
                      {resultado.promedio_examen ?? "-"}
                    </h3>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-card accent">
                    <p className="stat-label">Promedio acumulado</p>
                    <h3 className="stat-value">
                      {resultado.promedio_acumulado ?? "-"}
                    </h3>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Periodos con datos</p>
                    <h3 className="stat-value">
                      {resultado.periodos_con_datos ?? "-"}
                    </h3>
                  </div>
                </>
              )}
            </div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </>
        ) : (
          <div className="empty-state">
            <h3>Sin resultados todavía</h3>
            <p>
              Selecciona curso, estudiante y año lectivo para calcular el
              promedio.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default PromediosAdmin;
