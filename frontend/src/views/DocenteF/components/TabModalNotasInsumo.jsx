import React from "react";

export const TabModalNotasInsumo = ({
  insumosSeleccionado,
  setInsumosSeleccionado,
  estudiantesInsumo,
  notasEstudiantes,
  soloLecturaTutor,
  guardarNota,
}) => {
  if (!insumosSeleccionado) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-notas">
        <div className="modal-header">
          <h3>Agregar Notas - {insumosSeleccionado.nombre}</h3>
          <button className="btn-cerrar" onClick={() => setInsumosSeleccionado(null)}>
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
                  <td>{estudiante.nombre} {estudiante.apellido}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      defaultValue={notasEstudiantes[estudiante.id_estudiante]?.calificacion || ""}
                      placeholder="--"
                      className="input-nota"
                      id={`nota-${estudiante.id_estudiante}`}
                      disabled={soloLecturaTutor}
                    />
                  </td>
                  <td>
                    <button
                      className="btn-guardar-nota"
                      disabled={soloLecturaTutor}
                      onClick={() => {
                        const input = document.getElementById(`nota-${estudiante.id_estudiante}`);
                        guardarNota(estudiante.id_estudiante, input.value);
                      }}
                    >
                      {soloLecturaTutor ? "Solo lectura" : "Guardar"}
                    </button>
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
