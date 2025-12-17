import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/login.css";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/docente");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Iniciar Sesión</h1>

        <form className="login-form" onSubmit={handleSubmit}>

          <input
            type="text"
            placeholder="Usuario"
            className="login-input"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="login-input"
            required
          />

          <select
            className="login-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Administrador</option>
            <option value="docente">Docente</option>
          </select>

          <button className="login-button" type="submit">
            Iniciar Sesión
          </button>

        </form>
      </div>
    </div>
  );
}

export default Login;
