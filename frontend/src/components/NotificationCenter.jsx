import React, { useEffect, useState } from "react";
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
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p style={{ marginBottom: 12 }}>{confirm.message}</p>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  confirm.resolve(false);
                  setConfirm(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  confirm.resolve(true);
                  setConfirm(null);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
