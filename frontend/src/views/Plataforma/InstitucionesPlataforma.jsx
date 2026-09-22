import { useEffect, useState } from "react";
import { plataformaAPI } from "../../services/api";
import { notify } from "../../components/notify";

const initialForm = {
  nombre: "",
  correo_administrador: "",
  nombre_administrador: "",
  apellido_administrador: "",
  contrasena_temporal: "",
};

export default function InstitucionesPlataforma() {
  const [instituciones, setInstituciones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      setInstituciones((await plataformaAPI.listarInstituciones()) || []);
    } catch (error) {
      notify("error", error.message || "No se pudieron cargar las instituciones");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async (event) => {
    event.preventDefault();
    setGuardando(true);
    try {
      await plataformaAPI.crearInstitucion(form);
      setForm(initialForm);
      notify("success", "Institución creada correctamente");
      await cargar();
    } catch (error) {
      notify("error", error.message || "No se pudo crear la institución");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="platform-page">
      <h1>Instituciones</h1>
      <form className="platform-form" onSubmit={crear}>
        {Object.entries(form).map(([field, value]) => (
          <input
            key={field}
            type={field === "contrasena_temporal" ? "password" : field === "correo_administrador" ? "email" : "text"}
            placeholder={field.replaceAll("_", " ")}
            value={value}
            required
            onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
          />
        ))}
        <button type="submit" disabled={guardando}>{guardando ? "Creando..." : "Crear institución"}</button>
      </form>
      {cargando ? <p>Cargando instituciones...</p> : (
        <div className="platform-list">
          {instituciones.map((institucion) => (
            <article key={institucion.id_institucion} className="platform-card">
              <strong>{institucion.nombre}</strong>
              <span>{institucion.correo_administrador || "Administrador vinculado"}</span>
              <small>{institucion.activo ? "Activa" : "Inactiva"}</small>
              <button type="button" onClick={async () => {
                await plataformaAPI.cambiarEstadoInstitucion(institucion.id_institucion, !institucion.activo);
                await cargar();
              }}>
                {institucion.activo ? "Desactivar" : "Activar"}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
