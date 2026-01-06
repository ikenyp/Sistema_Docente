import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/login.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email); // el backend espera "username"
      form.append("password", password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!res.ok) throw new Error("Credenciales inválidas");

      const data = await res.json();
      const role = (data.role ?? data.rol ?? "").toLowerCase();
      console.log("login data:", data, "role:", role);

      if (!role) throw new Error("No se pudo iniciar sesión, intenta de nuevo");

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", role);

      // Obtener datos completos del usuario
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (userRes.ok) {
        const usuario = await userRes.json();
        localStorage.setItem("usuario", JSON.stringify(usuario));
      }

      if (role === "administrativo") navigate("/admin");
      else if (role === "docente") navigate("/docente");
      else throw new Error(`Rol desconocido: ${role}`);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="system-header">
          <div className="system-icon">🎓</div>
          <h1 className="system-title">Sistema Inteligente de Gestión Estudiantil</h1>
        </div>

        <div className="login-card">
          <h2 className="login-title">Iniciar Sesión</h2>

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
            {error && <div className="login-error">{error}</div>}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
