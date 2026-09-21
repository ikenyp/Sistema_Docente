import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/login.css";
import { clearSessionStorage, scheduleSessionWatch } from "../../services/session";
import { API_ROOT_URL } from "../../services/apiConfig";
import { requestHttp } from "../../services/http";
import { validarContrasena } from "../../utils/password";

export default function Login() {
  // Esta pantalla contiene tres flujos relacionados: iniciar sesión, registrar
  // una cuenta personal y recuperar la contraseña.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
  const [mostrarRegistroPassword, setMostrarRegistroPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);
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

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (searchParams.get("view") === "recover" && tokenParam) {
      setAuthView("recover");
      setResetToken(tokenParam);
      setSelectedMode("institucional");
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

      const data = await requestHttp(`${API_ROOT_URL}/auth/login`, "POST", form, {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-App-Mode": appMode,
      });
      const role = (data.role ?? data.rol ?? "").toLowerCase();
      if (!role) throw new Error("No se pudo iniciar sesión, intenta de nuevo");

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", role);
      localStorage.setItem("app_mode", appMode);
      scheduleSessionWatch(data.access_token);

      // Obtener datos completos del usuario
      const usuario = await requestHttp(`${API_ROOT_URL}/auth/me`, "GET", null, {
        Authorization: `Bearer ${data.access_token}`,
        "X-App-Mode": appMode,
      });
      localStorage.setItem("usuario", JSON.stringify(usuario));

      if (appMode === "personal") {
        if (role === "docente") navigate("/docente");
        else throw new Error("En modo personal solo se permite acceso docente");
      } else if (role === "administrativo") navigate("/admin");
      else if (role === "docente") navigate("/docente");
      else throw new Error(`Rol desconocido: ${role}`);
    } catch (err) {
      clearSessionStorage();
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
    const errorContrasena = validarContrasena(registerPassword);
    if (errorContrasena) {
      setError(errorContrasena);
      return;
    }

    setLoading(true);
    try {
      await requestHttp(`${API_ROOT_URL}/auth/register-personal`, "POST", {
          nombre: registerName,
          apellido: registerLastName,
          correo: registerEmail,
          contrasena: registerPassword,
        }, { "Content-Type": "application/json", "X-App-Mode": "personal" });

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
      const data = await requestHttp(`${API_ROOT_URL}/auth/password-reset/request`, "POST", { correo: resetEmail }, { "Content-Type": "application/json" });

      setSuccess(
        data.mensaje || "Si la cuenta existe, recibirás instrucciones de recuperación.",
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
    const errorContrasena = validarContrasena(newPassword);
    if (errorContrasena) {
      setError(errorContrasena);
      return;
    }

    setLoading(true);
    try {
      await requestHttp(`${API_ROOT_URL}/auth/password-reset/confirm`, "POST", {
          token: resetToken,
          nueva_contrasena: newPassword,
        }, { "Content-Type": "application/json" });

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
            Sistema Docente
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
                Elige cómo quieres ingresar
              </p>
              <div className="mode-selector">
                <button
                  className="login-button"
                  type="button"
                  onClick={() => setSelectedMode("institucional")}
                >
                  <span className="mode-icon">🏫</span>
                  <span>Institucional</span>
                  <small>Gestionado por la institución</small>
                </button>
                <button
                  className="login-button"
                  type="button"
                  onClick={() => setSelectedMode("personal")}
                >
                  <span className="mode-icon">👤</span>
                  <span>Personal</span>
                  <small>Tu espacio docente independiente</small>
                </button>
              </div>
            </>
          ) : (
            <>
              {authView === "register" && selectedMode === "personal" ? (
                <>
                  <h2 className="login-title login-title-register">
                    Crear cuenta
                  </h2>
                </>
              ) : (
                <>
                  <h2 className="login-title">Iniciar sesión</h2>
                  <p className="login-context-note">
                    Acceso {selectedMode === "institucional" ? "institucional" : "personal"}
                  </p>
                </>
              )}

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

                  <div className="password-field">
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="login-input"
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setMostrarPassword((value) => !value)}>{mostrarPassword ? "Ocultar" : "Mostrar"}</button>
                  </div>
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
                  <div
                    className={`login-links ${
                      selectedMode === "institucional" ? "login-links-institutional" : ""
                    }`}
                  >
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
                      type={mostrarRegistroPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="login-input"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <input
                      type={mostrarRegistroPassword ? "text" : "password"}
                      value={registerConfirmPassword}
                      onChange={(e) =>
                        setRegisterConfirmPassword(e.target.value)
                      }
                      placeholder="Confirmar contraseña"
                      className="login-input"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button type="button" className="password-toggle register-password-toggle" onClick={() => setMostrarRegistroPassword((value) => !value)}>{mostrarRegistroPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}</button>
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
                      Volver
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
                        type={mostrarNuevaPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="login-input"
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                      <input
                        type={mostrarNuevaPassword ? "text" : "password"}
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="Confirmar nueva contraseña"
                        className="login-input"
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                      <button type="button" className="password-toggle register-password-toggle" onClick={() => setMostrarNuevaPassword((value) => !value)}>{mostrarNuevaPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}</button>
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
