import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/login.css";
import { scheduleSessionWatch } from "../../services/session";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [searchParams] = useSearchParams();
  const [authView, setAuthView] = useState("login");
  const [registerName, setRegisterName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Detectar modo desde parámetro de query al cargar el componente
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (
      modeParam &&
      (modeParam === "personal" || modeParam === "institucional")
    ) {
      setSelectedMode(modeParam);
    }
  }, [searchParams]);

  const resetFlowMessages = () => {
    setError("");
    setSuccess("");
  };

  const clearLoginFields = () => {
    setEmail("");
    setPassword("");
  };

  const clearRegisterFields = () => {
    setRegisterName("");
    setRegisterLastName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");
  };

  const clearRecoveryFields = () => {
    setResetEmail("");
    setResetToken("");
    setNewPassword("");
    setNewPasswordConfirm("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetFlowMessages();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email); // el backend espera "username"
      form.append("password", password);

      const appMode = selectedMode || "institucional";

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-App-Mode": appMode,
        },
        body: form.toString(),
      });

      if (!res.ok) throw new Error("Credenciales inválidas");

      const data = await res.json();
      const role = (data.role ?? data.rol ?? "").toLowerCase();
      if (!role) throw new Error("No se pudo iniciar sesión, intenta de nuevo");

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", role);
      localStorage.setItem("app_mode", appMode);
      scheduleSessionWatch(data.access_token);

      // Obtener datos completos del usuario
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "X-App-Mode": appMode,
        },
      });

      if (userRes.ok) {
        const usuario = await userRes.json();
        localStorage.setItem("usuario", JSON.stringify(usuario));
      }

      if (appMode === "personal") {
        if (role === "docente") navigate("/docente");
        else throw new Error("En modo personal solo se permite acceso docente");
      } else if (role === "administrativo") navigate("/admin");
      else if (role === "docente") navigate("/docente");
      else throw new Error(`Rol desconocido: ${role}`);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetFlowMessages();

    if (registerPassword !== registerConfirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register-personal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Mode": "personal",
        },
        body: JSON.stringify({
          nombre: registerName,
          apellido: registerLastName,
          correo: registerEmail,
          contrasena: registerPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo crear la cuenta");

      setSuccess("Cuenta creada. Ya puedes iniciar sesión.");
      clearRegisterFields();
      setAuthView("login");
    } catch (err) {
      setError(err.message || "Error al registrar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async (e) => {
    e.preventDefault();
    resetFlowMessages();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ correo: resetEmail }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || "No se pudo generar la recuperación");

      setResetToken(data.token || "");
      setSuccess(
        "Se generó un token temporal de recuperación. Continúa con el cambio.",
      );
    } catch (err) {
      setError(err.message || "Error al solicitar recuperación");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryConfirm = async (e) => {
    e.preventDefault();
    resetFlowMessages();

    if (newPassword !== newPasswordConfirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          nueva_contrasena: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || "No se pudo cambiar la contraseña");

      setSuccess("Contraseña actualizada. Ya puedes iniciar sesión.");
      clearRecoveryFields();
      setAuthView("login");
    } catch (err) {
      setError(err.message || "Error al confirmar la recuperación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="system-header">
          <div className="system-icon">🎓</div>
          <h1 className="system-title">
            Sistema Inteligente de Gestión Estudiantil
          </h1>
        </div>

        <div
          className={
            authView === "register" && selectedMode === "personal"
              ? "login-card register-card"
              : "login-card"
          }
        >
          {!selectedMode ? (
            <>
              <h2 className="login-title">Bienvenido</h2>
              <p className="login-subtitle">
                ¿En qué modo quieres usar el sistema?
              </p>
              <div className="mode-selector">
                <button
                  className="login-button"
                  type="button"
                  onClick={() => setSelectedMode("institucional")}
                >
                  🏫 Institucional
                </button>
                <button
                  className="login-button"
                  type="button"
                  onClick={() => setSelectedMode("personal")}
                >
                  👤 Personal
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="login-title">
                Iniciar Sesión (
                {selectedMode === "institucional"
                  ? "Institucional"
                  : "Personal"}
                )
              </h2>

              {authView === "login" && (
                <form className="login-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo"
                    className="login-input"
                    required
                  />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="login-input"
                    required
                  />
                  {(error || success) && (
                    <div className={error ? "login-error" : "login-success"}>
                      {error || success}
                    </div>
                  )}

                  <button
                    className="login-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Ingresando..." : "Ingresar"}
                  </button>
                  <div className="login-links">
                    {selectedMode === "personal" && (
                      <button
                        className="login-link-button"
                        type="button"
                        onClick={() => {
                          resetFlowMessages();
                          clearLoginFields();
                          setAuthView("register");
                        }}
                      >
                        Crear cuenta
                      </button>
                    )}
                    <button
                      className="login-link-button"
                      type="button"
                      onClick={() => {
                        resetFlowMessages();
                        clearLoginFields();
                        setAuthView("recover");
                      }}
                    >
                      Olvidé mi contraseña
                    </button>
                  </div>
                  {selectedMode === "institucional" && (
                    <p className="login-note">
                      En este modo las cuentas las crea administración.
                    </p>
                  )}
                  <button
                    className="login-button secondary"
                    type="button"
                    onClick={() => {
                      setSelectedMode("");
                      resetFlowMessages();
                      clearLoginFields();
                      setAuthView("login");
                    }}
                  >
                    Cambiar modo
                  </button>
                </form>
              )}

              {authView === "register" && selectedMode === "personal" && (
                <form
                  className="login-form register-form"
                  onSubmit={handleRegister}
                >
                  <div className="register-grid">
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Nombre"
                      className="login-input"
                      required
                    />
                    <input
                      type="text"
                      value={registerLastName}
                      onChange={(e) => setRegisterLastName(e.target.value)}
                      placeholder="Apellido"
                      className="login-input"
                      required
                    />
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Correo"
                      className="login-input register-full"
                      required
                    />
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="login-input"
                      required
                    />
                    <input
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) =>
                        setRegisterConfirmPassword(e.target.value)
                      }
                      placeholder="Confirmar contraseña"
                      className="login-input"
                      required
                    />
                  </div>
                  {(error || success) && (
                    <div className={error ? "login-error" : "login-success"}>
                      {error || success}
                    </div>
                  )}
                  <div className="auth-actions">
                    <button
                      className="login-button"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Creando cuenta..." : "Crear cuenta"}
                    </button>
                    <button
                      className="login-button secondary"
                      type="button"
                      onClick={() => {
                        resetFlowMessages();
                        clearRegisterFields();
                        setAuthView("login");
                      }}
                    >
                      Iniciar sesión
                    </button>
                  </div>
                </form>
              )}

              {authView === "recover" && (
                <form
                  className="login-form"
                  onSubmit={
                    resetToken ? handleRecoveryConfirm : handleRecoveryRequest
                  }
                >
                  {!resetToken ? (
                    <>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Correo de la cuenta"
                        className="login-input"
                        required
                      />
                      {(error || success) && (
                        <div
                          className={error ? "login-error" : "login-success"}
                        >
                          {error || success}
                        </div>
                      )}
                      <button
                        className="login-button"
                        type="submit"
                        disabled={loading}
                      >
                        {loading
                          ? "Buscando cuenta..."
                          : "Enviar enlace temporal"}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Token temporal"
                        className="login-input"
                        required
                      />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="login-input"
                        required
                      />
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="Confirmar nueva contraseña"
                        className="login-input"
                        required
                      />
                      {(error || success) && (
                        <div
                          className={error ? "login-error" : "login-success"}
                        >
                          {error || success}
                        </div>
                      )}
                      <button
                        className="login-button"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? "Actualizando..." : "Cambiar contraseña"}
                      </button>
                    </>
                  )}
                  <button
                    className="login-button secondary"
                    type="button"
                    onClick={() => {
                      resetFlowMessages();
                      clearRecoveryFields();
                      setAuthView("login");
                    }}
                  >
                    Volver al inicio de sesión
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
