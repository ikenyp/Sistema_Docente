import React, { useEffect, useMemo, useState } from "react";

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SessionModal({ state, onStay, onLogout }) {
  const [remaining, setRemaining] = useState(state?.remainingMs || 0);

  useEffect(() => {
    setRemaining(state?.remainingMs || 0);
  }, [state]);

  useEffect(() => {
    if (state?.type !== "warning" || !state?.expiresAt) return undefined;
    const timer = setInterval(() => {
      setRemaining(Math.max(0, state.expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  const content = useMemo(() => {
    if (!state) return null;
    if (state.type === "expired") {
      return {
        title: "Sesion finalizada",
        message:
          "Tu sesion ha terminado. Debes volver a iniciar sesion para continuar usando el sistema.",
      };
    }
    return {
      title: "Sesion por vencer",
      message: `Tu sesion terminara pronto. Tiempo restante: ${formatRemaining(remaining)}.`,
    };
  }, [state, remaining]);

  if (!state || !content) return null;

  return (
    <div className="confirm-backdrop" onClick={() => {}}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>{content.title}</h3>
        <p style={{ marginBottom: 16 }}>{content.message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {state.type === "warning" ? (
            <>
              <button onClick={onLogout}>Cerrar sesion</button>
              <button className="btn-view" onClick={onStay}>
                Mantener sesion
              </button>
            </>
          ) : (
            <button className="btn-view" onClick={onLogout}>
              Ir al inicio de sesion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
