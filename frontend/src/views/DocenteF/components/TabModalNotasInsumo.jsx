import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Save, Trash2 } from "lucide-react";
import { nombrePersona } from "../../../utils/personas";

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
  const [guardandoEstudiante, setGuardandoEstudiante] = useState(null);
  const notasGuardadas = useRef({});
  const guardandoNotas = useRef(new Set());

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
        const [estudiantesData, notasData] = await Promise.all([
          estudiantesCurso.length > 0 ? estudiantesCurso : cargarEstudiantesPorCurso(),
          cargarNotasPorInsumo(insumo.id_insumo),
        ]);

        const notasMap = {};
        (notasData || []).forEach((nota) => {
          notasMap[nota.id_estudiante] = nota;
        });

        if (!mounted) return;
        setEstudiantes(estudiantesData || []);
        setNotas(notasMap);
        notasGuardadas.current = Object.fromEntries(
          Object.entries(notasMap).map(([idEstudiante, nota]) => [
            idEstudiante,
            String(nota?.calificacion ?? ""),
          ]),
        );
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

  const guardarNotaDesdeInput = async (idEstudiante) => {
    if (soloLecturaTutor || guardandoNotas.current.has(idEstudiante)) return;

    const input = document.getElementById(`nota-${idEstudiante}`);
    const valor = input?.value ?? "";
    if (valor === "" || notasGuardadas.current[idEstudiante] === valor) return;

    guardandoNotas.current.add(idEstudiante);
    setGuardandoEstudiante(idEstudiante);
    try {
      const notaGuardada = await guardarNota(
        idEstudiante,
        valor,
        notas[idEstudiante]?.id_nota || null,
      );
      notasGuardadas.current[idEstudiante] = valor;
      setNotas((prev) => ({
        ...prev,
        [idEstudiante]: {
          ...prev[idEstudiante],
          ...(notaGuardada || {}),
          calificacion: Number(valor),
        },
      }));
    } finally {
      guardandoNotas.current.delete(idEstudiante);
      setGuardandoEstudiante(null);
    }
  };

  const moverFocoNota = (idEstudiante, direccion) => {
    const indiceActual = estudiantesOrdenados.findIndex(
      (estudiante) => String(estudiante.id_estudiante) === String(idEstudiante),
    );
    const indiceDestino = indiceActual + direccion;
    const estudianteDestino = estudiantesOrdenados[indiceDestino];
    if (!estudianteDestino) return;

    document.getElementById(`nota-${estudianteDestino.id_estudiante}`)?.focus();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-notas course-notes-modal">
        <div className="modal-header course-notes-modal-header">
          <h3>Agregar Notas - {insumo.nombre}</h3>
          <button className="btn-cerrar" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <div className="tabla-notas">
          <table>
            <colgroup>
              <col className="tabla-notas-col-numero" />
              <col className="tabla-notas-col-estudiante" />
              <col className="tabla-notas-col-nota" />
              {!soloLecturaTutor && <col className="tabla-notas-col-accion" />}
            </colgroup>
            <thead>
              <tr>
                <th>No.</th>
                <th>Estudiante</th>
                <th>Nota</th>
                {!soloLecturaTutor && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {estudiantesOrdenados.map((estudiante, index) => (
                <tr key={estudiante.id_estudiante}>
                  <td>{index + 1}</td>
                  <td>{nombrePersona(estudiante)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={insumo.ponderacion}
                      step="0.1"
                      defaultValue={notas[estudiante.id_estudiante]?.calificacion || ""}
                      key={`nota-${estudiante.id_estudiante}-${notas[estudiante.id_estudiante]?.id_nota || "new"}-${notas[estudiante.id_estudiante]?.calificacion || ""}`}
                      placeholder="--"
                      className="input-nota"
                      id={`nota-${estudiante.id_estudiante}`}
                      disabled={soloLecturaTutor}
                      onBlur={() => guardarNotaDesdeInput(estudiante.id_estudiante)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                          event.preventDefault();
                          moverFocoNota(
                            estudiante.id_estudiante,
                            event.key === "ArrowUp" ? -1 : 1,
                          );
                          return;
                        }
                        if (event.key === "Enter") {
                          event.preventDefault();
                          guardarNotaDesdeInput(estudiante.id_estudiante);
                        }
                      }}
                      onInput={(event) => {
                        const maximo = Number(insumo.ponderacion);
                        if (Number(event.currentTarget.value) > maximo) {
                          event.currentTarget.value = String(maximo);
                        }
                      }}
                    />
                  </td>
                  {!soloLecturaTutor && <td>
                    <div className="actions-cell">
                      <button
                        className="btn-save btn-save-inline"
                        disabled={soloLecturaTutor || guardandoEstudiante === estudiante.id_estudiante}
                        onClick={() => guardarNotaDesdeInput(estudiante.id_estudiante)}
                      >
                        <Save size={16} />
                        <span>{soloLecturaTutor ? "Solo lectura" : guardandoEstudiante === estudiante.id_estudiante ? "Guardando..." : "Guardar"}</span>
                      </button>
                      {notas[estudiante.id_estudiante]?.id_nota && !soloLecturaTutor && (
                        <button
                          className="btn-delete btn-delete-inline"
                          type="button"
                          onClick={async () => {
                            const nota = notas[estudiante.id_estudiante];
                            if (!nota) return;
                            await guardarNota(estudiante.id_estudiante, null, nota.id_nota);
                            setNotas((prev) => {
                              const siguiente = { ...prev };
                              delete siguiente[estudiante.id_estudiante];
                              return siguiente;
                            });
                          }}
                          aria-label="Eliminar nota"
                        >
                          <Trash2 size={16} />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
