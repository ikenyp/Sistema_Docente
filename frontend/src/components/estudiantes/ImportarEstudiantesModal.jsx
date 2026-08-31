import React, { useEffect, useMemo, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import { estudiantesAPI } from "../../services/api";
import { notify } from "../notify";

function ImportarEstudiantesModal({
  open,
  onClose,
  onSaved,
  cursos = [],
  titulo = "Importar estudiantes",
  subtitulo = "Selecciona un archivo Excel y revisa los datos antes de guardar.",
  cursoFijoId = "",
  mostrarCurso = false,
}) {
  const inputRef = useRef(null);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  const opcionesCurso = useMemo(
    () => (cursos || []).map((curso) => ({
      value: String(curso.id_curso),
      label: `${curso.nombre || "Curso"}${curso.anio_lectivo ? ` · ${curso.anio_lectivo}` : ""}`,
    })),
    [cursos],
  );

  const formatearNombre = (valor) =>
    String(valor || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(" ");

  const reset = () => {
    setArchivoNombre("");
    setCargando(false);
    setGuardando(false);
    setFilas([]);
    setResumen(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  const normalizarFila = (fila, index) => ({
    __id: fila.__id || `fila-${index + 1}`,
    fila: fila.fila || index + 1,
    nombre: formatearNombre(fila.nombre),
    apellido: formatearNombre(fila.apellido),
    cedula: fila.cedula || "",
    fecha_nacimiento: fila.fecha_nacimiento || "",
    id_curso_actual:
      fila.id_curso_actual !== undefined && fila.id_curso_actual !== null && fila.id_curso_actual !== ""
        ? String(fila.id_curso_actual)
        : cursoFijoId
        ? String(cursoFijoId)
        : "",
    errores: Array.isArray(fila.errores) ? fila.errores : [],
  });

  const cargarArchivo = async (file) => {
    if (!file) return;

    setCargando(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (cursoFijoId) {
        formData.append("id_curso_actual", String(cursoFijoId));
      }

      const data = await estudiantesAPI.importarPreview(formData);
      const filasPreview = (data?.estudiantes || []).map((fila, index) =>
        normalizarFila(fila, index),
      );
      setFilas(filasPreview);
      setResumen(data?.resumen || null);
      setArchivoNombre(file.name);
      if (filasPreview.length === 0) {
        notify("error", "El archivo no contiene filas válidas para importar");
      }
    } catch (err) {
      setError(err.message || "No se pudo leer el archivo");
      notify("error", err.message || "No se pudo leer el archivo");
    } finally {
      setCargando(false);
    }
  };

  const actualizarFila = (id, campo, valor) => {
    setFilas((prev) =>
      prev.map((fila) =>
        fila.__id === id
          ? {
              ...fila,
              [campo]: valor,
              errores: fila.errores.filter((msg) => msg !== `Campo ${campo}`),
            }
          : fila,
      ),
    );
  };

  const validarLocal = (fila) => {
    const errores = [];
    if (!String(fila.nombre || "").trim()) errores.push("El nombre es obligatorio");
    if (!String(fila.apellido || "").trim()) errores.push("El apellido es obligatorio");
    if (!String(fila.cedula || "").trim()) errores.push("La cédula es obligatoria");
    return errores;
  };

  const guardarImportacion = async () => {
    if (filas.length === 0) {
      notify("error", "No hay estudiantes para importar");
      return;
    }

    setGuardando(true);
    try {
      const filasRestantes = [];
      let creados = 0;
      let errores = 0;

      for (const fila of filas) {
        const erroresLocales = validarLocal(fila);
        if (erroresLocales.length > 0) {
          filasRestantes.push({ ...fila, errores: erroresLocales });
          errores += 1;
          continue;
        }

        const payload = {
          nombre: String(fila.nombre || "").trim(),
          apellido: String(fila.apellido || "").trim(),
          cedula: String(fila.cedula || "").trim(),
          fecha_nacimiento: fila.fecha_nacimiento || null,
          id_curso_actual: fila.id_curso_actual ? Number(fila.id_curso_actual) : null,
        };

        try {
          await estudiantesAPI.crear(payload);
          creados += 1;
        } catch (err) {
          filasRestantes.push({
            ...fila,
            errores: [err.message || "No se pudo guardar el estudiante"],
          });
          errores += 1;
        }
      }

      if (creados > 0) {
        notify(
          "success",
          errores > 0
            ? `${creados} estudiante(s) importado(s). ${errores} con observaciones.`
            : `${creados} estudiante(s) importado(s) correctamente`,
        );
        await onSaved?.();
      }

      if (filasRestantes.length === 0) {
        onClose?.();
        reset();
      } else {
        setFilas(filasRestantes);
        setResumen({
          total: filasRestantes.length,
          validos: filasRestantes.filter((fila) => fila.errores.length === 0).length,
          con_error: filasRestantes.filter((fila) => fila.errores.length > 0).length,
        });
      }
    } catch (err) {
      notify("error", err.message || "No se pudo completar la importación");
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2500,
        padding: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(18, 31, 58, 0.55)",
      }}
      onClick={onClose}
    >
      <div
        className="modal-notas"
        style={{
          width: "min(96vw, 1080px)",
          maxHeight: "92vh",
          overflow: "auto",
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: "18px",
          border: "1px solid #dce5f4",
          boxShadow: "0 24px 48px rgba(23, 33, 53, 0.32)",
          padding: "1rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
            paddingBottom: "0.6rem",
            borderBottom: "1px solid #dce5f4",
          }}
        >
          <h3 style={{ flex: 1, margin: 0, textAlign: "center", color: "#223553" }}>
            {titulo}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              border: "none",
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#eef3fb",
              color: "#223553",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <p style={{ marginTop: 0, marginBottom: "0.85rem", color: "#4d628a", fontSize: "0.9rem" }}>
          {subtitulo}
        </p>
        <div style={{ marginBottom: "0.9rem", padding: "0.75rem 0.8rem", borderRadius: 12, background: "#eef3fb", color: "#223553", fontSize: "0.88rem" }}>
          Se importarán <strong>Cédulas, Apellidos y Nombres</strong> de los estudiantes del Excel.
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.85rem" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => cargarArchivo(e.target.files?.[0])}
            disabled={cargando || guardando}
          />
          {archivoNombre && <span className="panel-sub">{archivoNombre}</span>}
        </div>

        {error && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem 0.8rem", borderRadius: 12, background: "#ffeef1", color: "#9b2331", fontSize: "0.88rem" }}>
            {error}
          </div>
        )}

        {resumen && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.34rem 0.62rem", borderRadius: 999, background: "rgba(255, 255, 255, 0.82)", border: "1px solid #dce5f4", color: "#23324f", fontSize: "0.8rem" }}><strong>Total:</strong> {resumen.total || 0}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.34rem 0.62rem", borderRadius: 999, background: "rgba(255, 255, 255, 0.82)", border: "1px solid #dce5f4", color: "#23324f", fontSize: "0.8rem" }}><strong>Válidos:</strong> {resumen.validos || 0}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.34rem 0.62rem", borderRadius: 999, background: "rgba(255, 255, 255, 0.82)", border: "1px solid #dce5f4", color: "#23324f", fontSize: "0.8rem" }}><strong>Con error:</strong> {resumen.con_error || 0}</div>
          </div>
        )}

        {cargando && <p style={{ marginTop: "0.8rem" }}>Leyendo archivo...</p>}

        {filas.length > 0 && (
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Cédula</th>
                  <th>Apellidos</th>
                  <th>Nombres</th>
                  {mostrarCurso && <th>Curso actual</th>}
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.__id}>
                    <td>{fila.fila}</td>
                    <td><input style={{ width: "100%", boxSizing: "border-box" }} value={fila.cedula} onChange={(e) => actualizarFila(fila.__id, "cedula", e.target.value)} /></td>
                    <td><input style={{ width: "100%", boxSizing: "border-box" }} value={fila.apellido} onChange={(e) => actualizarFila(fila.__id, "apellido", e.target.value)} /></td>
                    <td><input style={{ width: "100%", boxSizing: "border-box" }} value={fila.nombre} onChange={(e) => actualizarFila(fila.__id, "nombre", e.target.value)} /></td>
                    {mostrarCurso && (
                      <td>
                        {cursoFijoId ? (
                          <span>{opcionesCurso.find((op) => op.value === String(cursoFijoId))?.label || `Curso ${cursoFijoId}`}</span>
                        ) : (
                          <select
                            style={{ width: "100%", boxSizing: "border-box" }}
                            value={fila.id_curso_actual}
                            onChange={(e) => actualizarFila(fila.__id, "id_curso_actual", e.target.value)}
                          >
                            <option value="">Sin curso</option>
                            {opcionesCurso.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    )}
                    <td>
                      {fila.errores.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: "1rem", color: "#9b2331" }}>
                          {fila.errores.map((msg) => <li key={msg}>{msg}</li>)}
                        </ul>
                      ) : (
                        <span style={{ color: "#21795d" }}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.6rem", marginTop: "1rem" }}>
          <button type="button" className="btn-cancel btn-inline-icon" onClick={onClose} disabled={guardando} style={{ width: "100%", justifyContent: "center" }}>
            <X size={14} />
            Cancelar
          </button>
          <button type="button" className="btn-success btn-inline-icon" onClick={guardarImportacion} disabled={guardando || filas.length === 0} style={{ width: "100%", justifyContent: "center" }}>
            <Save size={14} />
            {guardando ? "Guardando..." : "Guardar importación"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportarEstudiantesModal;
