import React, { useEffect, useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";

export const TabModalNotasInsumo = ({
  insumo,
  estudiantesCurso,
  soloLecturaTutor,
  cargarEstudiantesPorCurso,
  cargarNotasPorInsumo,
  guardarNota,
  onClose,
}) => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [notas, setNotas] = useState({});

  const estudiantesOrdenados = useMemo(
    () =>
      [...estudiantes].sort((a, b) => {
        const valorA = `${String(a?.apellido || "")} ${String(a?.nombre || "")}`.trim();
        const valorB = `${String(b?.apellido || "")} ${String(b?.nombre || "")}`.trim();
        return valorA.localeCompare(valorB, "es");
      }),
    [estudiantes],
  );

  useEffect(() => {
    let mounted = true;

    const cargar = async () => {
      if (!insumo) return;

      try {
        const estudiantesData =
          estudiantesCurso.length > 0 ? estudiantesCurso : await cargarEstudiantesPorCurso();
        const notasData = await cargarNotasPorInsumo(insumo.id_insumo);

        const notasMap = {};
        (notasData || []).forEach((nota) => {
          notasMap[nota.id_estudiante] = nota;
        });

        if (!mounted) return;
        setEstudiantes(estudiantesData || []);
        setNotas(notasMap);
      } catch {
        if (!mounted) return;
        setEstudiantes([]);
        setNotas({});
      }
    };

    cargar();

    return () => {
      mounted = false;
    };
  }, [insumo, estudiantesCurso, cargarEstudiantesPorCurso, cargarNotasPorInsumo]);

  if (!insumo) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-notas">
        <div className="modal-header">
          <h3>Agregar Notas - {insumo.nombre}</h3>
          <button className="btn-cerrar" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tabla-notas">
          <table>
            <colgroup>
              <col className="tabla-notas-col-numero" />
              <col className="tabla-notas-col-estudiante" />
              <col className="tabla-notas-col-nota" />
              <col className="tabla-notas-col-accion" />
            </colgroup>
            <thead>
              <tr>
                <th>No.</th>
                <th>Estudiante</th>
                <th>Nota</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesOrdenados.map((estudiante, index) => (
                <tr key={estudiante.id_estudiante}>
                  <td>{index + 1}</td>
                  <td>{estudiante.apellido} {estudiante.nombre}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      defaultValue={notas[estudiante.id_estudiante]?.calificacion || ""}
                      placeholder="--"
                      className="input-nota"
                      id={`nota-${estudiante.id_estudiante}`}
                      disabled={soloLecturaTutor}
                    />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-save btn-save-inline"
                        disabled={soloLecturaTutor}
                        onClick={() => {
                          const input = document.getElementById(`nota-${estudiante.id_estudiante}`);
                          guardarNota(estudiante.id_estudiante, input.value);
                        }}
                      >
                        <Save size={16} />
                        <span>{soloLecturaTutor ? "Solo lectura" : "Guardar"}</span>
                      </button>
                      {notas[estudiante.id_estudiante]?.id_nota && !soloLecturaTutor && (
                        <button
                          className="btn-delete btn-delete-inline"
                          type="button"
                          onClick={async () => {
                            const nota = notas[estudiante.id_estudiante];
                            if (!nota) return;
                            await guardarNota(estudiante.id_estudiante, null, nota.id_nota);
                          }}
                          aria-label="Eliminar nota"
                        >
                          <Trash2 size={16} />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
