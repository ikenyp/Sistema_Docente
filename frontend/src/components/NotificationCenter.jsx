import React, { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { subscribeNotify, setConfirmHandler } from "./notify";
import "../styles/notifications.css";

export default function NotificationCenter() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const unsub = subscribeNotify((msg) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...msg }]);
      // auto remove
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, msg.options?.duration || 4000);
    });

    setConfirmHandler(({ message, options, resolve }) => {
      setConfirm({ message, options, resolve });
    });

    return () => {
      unsub();
      setConfirmHandler(null);
    };
  }, []);

  return (
    <div>
      <div className="notification-root">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type || "info"}`}>
            {t.message}
          </div>
        ))}
      </div>

      {confirm && (
        <div className="confirm-backdrop" onClick={() => {}}>
          <div className="confirm-modal confirm-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="confirm-close-btn"
              aria-label="Cerrar confirmación"
              onClick={() => {
                confirm.resolve(false);
                setConfirm(null);
              }}
            >
              <X size={14} />
            </button>
            <h3 style={{ marginBottom: 10 }}>{confirm.options?.title || "Confirmar acción"}</h3>
            {confirm.options?.role && confirm.options?.name ? (
              <div className="confirm-entity">
                <span className="confirm-entity-role">{confirm.options.role}</span>
                <strong className="confirm-entity-name">{confirm.options.name}</strong>
              </div>
            ) : (
              <p style={{ marginBottom: 10, whiteSpace: "pre-line" }}>
                {confirm.options?.description || confirm.message}
              </p>
            )}
            {confirm.options?.description && confirm.options?.role && confirm.options?.name && (
              <p style={{ marginBottom: 10, whiteSpace: "pre-line" }}>
                {confirm.options.description}
              </p>
            )}
            {confirm.options?.note && (
              <p className="confirm-note" style={{ marginBottom: 14 }}>
                {confirm.options.note}
              </p>
            )}
            <div className="confirm-actions">
              <button
                className="btn-cancel btn-inline-icon confirm-action-btn"
                onClick={() => {
                  confirm.resolve(false);
                  setConfirm(null);
                }}
              >
                <X size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Cancelar
              </button>
              <button
                className="btn-danger btn-inline-icon confirm-action-btn"
                onClick={() => {
                  confirm.resolve(true);
                  setConfirm(null);
                }}
              >
                <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
