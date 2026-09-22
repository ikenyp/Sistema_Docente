import { useEffect, useState } from "react";
import { plataformaAPI } from "../../services/api";
import { notify } from "../../components/notify";
import { clearSessionStorage } from "../../services/session";
import "../../styles/platform.css";
import "../../styles/admin.css";

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
    <main className="admin-page platform-page">
      <header className="platform-header">
        <div>
          <p className="platform-eyebrow">Administración de plataforma</p>
          <h1>Instituciones</h1>
          <p>Gestiona los espacios institucionales y sus administradores iniciales.</p>
        </div>
        <span className="platform-count">{instituciones.length} registradas</span>
        <button className="platform-logout" type="button" onClick={() => { clearSessionStorage(); window.location.replace("/"); }}>
          Cerrar sesión
        </button>
      </header>
      <section className="platform-create-card">
        <h2>Crear institución</h2>
        <p>La cuenta indicada quedará vinculada automáticamente como administrador institucional inicial.</p>
        <form className="platform-form" onSubmit={crear}>
          <div className="platform-form-section platform-form-section-wide">
            <h3>Datos de la institución</h3>
            <label>
              Nombre de la institución
              <input value={form.nombre} required onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))} />
            </label>
          </div>
          <div className="platform-form-section platform-form-section-wide">
            <h3>Administrador inicial</h3>
            <p>Esta persona podrá entrar y gestionar únicamente esta institución.</p>
          </div>
          <label>
            Nombres
            <input value={form.nombre_administrador} required onChange={(event) => setForm((prev) => ({ ...prev, nombre_administrador: event.target.value }))} />
          </label>
          <label>
            Apellidos
            <input value={form.apellido_administrador} required onChange={(event) => setForm((prev) => ({ ...prev, apellido_administrador: event.target.value }))} />
          </label>
          <label>
            Correo del administrador
            <input type="email" value={form.correo_administrador} required onChange={(event) => setForm((prev) => ({ ...prev, correo_administrador: event.target.value }))} />
          </label>
          <label>
            Contraseña temporal
            <input type="password" value={form.contrasena_temporal} required onChange={(event) => setForm((prev) => ({ ...prev, contrasena_temporal: event.target.value }))} />
          </label>
          <div className="platform-role-note">Rol asignado: <strong>Administrador institucional</strong></div>
        <button type="submit" disabled={guardando}>{guardando ? "Creando..." : "Crear institución"}</button>
        </form>
      </section>
      {cargando ? <p>Cargando instituciones...</p> : (
        <div className="platform-list">
          {instituciones.map((institucion) => (
            <article key={institucion.id_institucion} className="platform-card">
              <div className="platform-card-title">
                <strong>{institucion.nombre}</strong>
                <small className={institucion.activo ? "status-active" : "status-inactive"}>
                  {institucion.activo ? "Activa" : "Inactiva"}
                </small>
              </div>
              <span>{institucion.correo_administrador || "Administrador vinculado"}</span>
              <code>{institucion.slug}</code>
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
