import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./../styles/login.css";

function Login() {

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Iniciar Sesión</h1>

        <form className="login-form">

          {/* Usuario */}
          <input
            type="text"
            placeholder="Usuario"
            className="login-input"
          />

          {/* Contraseña con ojo dentro */}
          <div className="input-password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              className="login-input password-input"
            />

            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </span>
          </div>

          {/* Rol */}
          <select className="login-input">
            <option value="admin">Administrador</option>
            <option value="docente">Docente</option>
          </select>

          {/* Botón */}
          <button className="login-button">
            Iniciar Sesión
          </button>

        </form>
      </div>
    </div>
  );
}

export default Login;
