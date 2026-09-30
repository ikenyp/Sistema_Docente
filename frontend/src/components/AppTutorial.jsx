import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/tutorial.css";
import { getAdminRecentCoursesKey } from "../utils/adminRecentCourses";

const TUTORIAL_EVENT = "sistema-docente:abrir-tutorial";
const TUTORIAL_YEAR_CREATED = "sistema-docente:tutorial-year-created";
const TUTORIAL_PERIODIZATION_SAVED = "sistema-docente:tutorial-periodization-saved";
const TUTORIAL_COURSE_CREATED = "sistema-docente:tutorial-course-created";
const TUTORIAL_COURSE_TAB = "sistema-docente:tutorial-course-tab";
const TUTORIAL_COURSE_READY = "sistema-docente:tutorial-course-ready";

const PERSONAL_DOCENTE_STEPS = [
  {
    title: "Bienvenido a tu espacio personal",
    text: "Este panel te permite preparar tu año lectivo, organizar materias y cursos, y después gestionar la información de tus estudiantes.",
  },
  {
    title: "Crea tu año lectivo",
    text: "Comienza creando el año que vas a trabajar. Pulsa Nuevo año, escribe el formato, por ejemplo 2026-2027, y confirma.",
    target: "crear-anio",
  },
  {
    title: "Selecciona el año activo",
    text: "Elige aquí el año lectivo con el que vas a trabajar. El dashboard, las materias, los cursos y la periodización dependen de esta selección.",
    target: "selector-anio-personal",
  },
  {
    title: "Configura la periodización",
    text: "Cuando tengas un año activo, abre Periodización para definir los periodos que usarás al registrar notas y actividades.",
    target: "periodizacion",
  },
  {
    title: "Conoce Configurar",
    text: "Este botón permite activar, inactivar o eliminar el año lectivo seleccionado. Úsalo para administrar su estado.",
    target: "configurar-anio",
  },
  {
    title: "Tu resumen de trabajo",
    text: "Estas cuatro cards muestran cursos visibles, materias creadas, si eres tutor y los pendientes que todavía debes resolver.",
    target: "dashboard-cards",
  },
  {
    title: "Configura tus materias",
    text: "Crea las materias que impartirás en este contexto. Después podrás editarlas o eliminarlas desde el mismo panel.",
    target: "configurar-materias",
  },
  {
    title: "Crea un curso",
    text: "Pulsa Crear curso para registrar un curso, indicar su nombre y definir si serás su tutor.",
    target: "crear-curso",
  },
  {
    title: "Administra tus cursos",
    text: "Cada card representa un curso. Desde sus opciones puedes editarlo o eliminarlo, y con Ver curso entras a toda su información académica.",
    target: "curso-card",
  },
  {
    title: "Panel listo",
    text: "Ya conoces el flujo principal. Dentro de cada curso encontrarás una guía adicional para estudiantes, insumos, notas y reportes.",
  },
];

const INSTITUTIONAL_DOCENTE_STEPS = [
  { title: "Bienvenido al panel docente", text: "Desde aquí puedes consultar tus cursos institucionales y revisar la información académica que tienes asignada." },
  { title: "Tu resumen de trabajo", text: "Estas cards muestran los cursos visibles, materias asignadas, estudiantes a cargo y tu condición de tutor.", target: "dashboard-cards" },
  { title: "Tus cursos", text: "Cada card representa un curso disponible para ti. Revisa su información y pulsa Ver curso para entrar.", target: "curso-card" },
  { title: "Panel listo", text: "Dentro de cada curso encontrarás una guía para recorrer estudiantes, insumos, asistencia, notas, reportes y periodización." },
];

const ADMIN_COURSE_STEPS = [
  { title: "Bienvenido al curso", text: "Desde esta vista puedes consultar y administrar los datos académicos del curso." },
  { title: "Información del curso", text: "La cabecera identifica el curso y el año lectivo al que pertenece.", target: "admin-course-info" },
  { title: "Indicadores del curso", text: "Aquí ves estudiantes, materias asignadas, estructura y tutor responsable.", target: "admin-course-dashboard" },
  { title: "Secciones del curso", text: "Usa estas pestañas para administrar estudiantes, materias y docentes, notas, reportes y consultas académicas.", target: "admin-course-tabs" },
  { title: "Estudiantes", text: "Importa estudiantes desde Excel, crea uno directamente en este curso o busca entre los ya inscritos.", tab: "estudiantes", target: "admin-course-students-tools" },
  { title: "Estudiantes inscritos", text: "Revisa quiénes pertenecen al curso, busca un registro y administra su matrícula.", tab: "estudiantes", target: "admin-course-students-list" },
  { title: "Materias y docentes", text: "Consulta las materias del curso y asigna, cambia o retira al docente responsable.", tab: "materias", target: "admin-course-subjects" },
  { title: "Notas", text: "Revisa promedios por materia y consulta calificaciones por estudiante.", tab: "notas", target: "admin-course-grades" },
  { title: "Reportes", text: "Selecciona una materia para previsualizar y exportar los reportes del curso.", tab: "reportes", target: "admin-course-reports" },
  { title: "Consulta académica", text: "Selecciona un estudiante para consultar su información académica en modo de solo lectura.", tab: "consulta", target: "admin-course-consultation" },
  { title: "Elige qué consultar", text: "Cambia entre notas, asistencia, comportamiento y promedios del estudiante seleccionado.", tab: "consulta", target: "admin-course-consultation-tabs" },
  { title: "Análisis académico", text: "Abre el análisis para revisar el rendimiento del curso, detectar pendientes y reconocer situaciones que requieren atención.", target: "admin-course-analysis" },
  { title: "Curso listo para administrar", text: "Ya conoces las secciones principales del curso. Puedes volver a ver esta guía desde el botón de ayuda." },
];

const ADMIN_STEPS = [
  { title: "Bienvenido al panel administrativo", text: "Desde aquí organizas la institución, sus años lectivos, cursos, estudiantes y estructuras académicas." },
  { title: "Crea un año lectivo", text: "Usa este botón para crear un nuevo año lectivo y comenzar a organizar la información académica de ese periodo.", target: "admin-crear-anio" },
  { title: "Selecciona el año de trabajo", text: "Elige el año lectivo para que los datos y acciones del panel correspondan al periodo correcto.", target: "admin-selector-anio" },
  { title: "Configura la periodización", text: "Define los periodos académicos del año seleccionado.", target: "admin-periodizacion" },
  { title: "Administra el año", text: "Usa Configuración para activar, inactivar o administrar el año lectivo.", target: "admin-configuracion-anio" },
  { title: "Indicadores institucionales", text: "Estas cards muestran usuarios, estudiantes, cursos y estructuras disponibles.", target: "admin-indicadores" },
  { title: "Administración del sistema", text: "Estas cuatro opciones permiten gestionar usuarios, materias, cursos y estudiantes.", target: "admin-acciones" },
  { title: "Navegación rápida", text: "El menú lateral te permite cambiar rápidamente entre las secciones administrativas.", target: "admin-sidebar" },
  { title: "Cursos recientes", text: "Aquí aparecen los últimos cursos abiertos desde el panel administrativo para volver a acceder rápidamente.", target: "admin-cursos-recientes" },
  { title: "Ya conoces el panel", text: "Con estos pasos ya conoces el funcionamiento principal del panel administrativo. Puedes volver a ver este tutorial desde el menú de usuario cuando lo necesites." },
];

const COURSE_STEPS = [
  { title: "Bienvenido dentro del curso", text: "Aquí se concentra el trabajo académico de un curso: estudiantes, materias, insumos, asistencia y notas." },
  { title: "Información del curso", text: "En esta cabecera puedes identificar el nombre del curso y el año lectivo activo.", target: "curso-resumen" },
  { title: "Indicadores principales", text: "Estas cards resumen materias, estudiantes, insumos y periodos configurados.", target: "curso-indicadores" },
  { title: "Selecciona una materia", text: "Elige la materia sobre la que vas a registrar o consultar información. Si eres tutor, también puedes ver materias de solo lectura que imparte otro docente; solo podrás gestionar directamente las materias que tienes asignadas.", target: "curso-materia" },
  { title: "Navega por las pestañas", text: "Las pestañas separan estudiantes, insumos, asistencia, comportamiento, notas, promedios, reportes y periodización.", target: "curso-pestanas" },
  { title: "Estudiantes", text: "Administra la matrícula del curso: añade estudiantes, importa una lista y consulta o retira registros.", tab: "estudiantes", target: "curso-tab-estudiantes" },
  { title: "Insumos y notas", text: "Crea actividades, proyectos y exámenes, define su ponderación y registra sus notas.", tab: "insumos", target: "curso-tab-insumos" },
  { title: "Asistencia", text: "Registra la asistencia de los estudiantes por fecha y revisa su historial.", tab: "asistencia", target: "curso-tab-asistencia" },
  { title: "Comportamiento", text: "Consulta y registra valoraciones de comportamiento del curso durante el periodo seleccionado.", tab: "comportamiento", target: "curso-tab-comportamiento" },
  { title: "Notas por estudiante", text: "Consulta el detalle de notas de un estudiante específico, separado del resto del curso.", tab: "notasEstudiante", target: "curso-tab-notasEstudiante" },
  { title: "Promedios", text: "Revisa los promedios del curso por estudiante y por periodo, según la información registrada.", tab: "promedios", target: "curso-tab-promedios" },
  { title: "Reportes", text: "Genera y consulta reportes académicos del curso para analizar sus resultados.", tab: "reportes", target: "curso-tab-reportes" },
  { title: "Periodización", text: "Consulta los periodos configurados para este año lectivo y verifica que estén disponibles para trabajar.", tab: "periodizacion", target: "curso-tab-periodizacion" },
  { title: "Análisis académico", text: "Este botón abre un análisis del curso para revisar rendimiento, asistencia, actividades pendientes y situaciones que requieren seguimiento.", target: "curso-analisis" },
  { title: "Curso listo para trabajar", text: "Selecciona una pestaña y sigue las acciones disponibles para gestionar la información del curso." },
];

const GENERIC_STEPS = {
  administrativo: [
    { title: "Bienvenido al Sistema Docente", text: "Desde aquí puedes organizar la estructura académica y acompañar la gestión de toda la institución." },
    { title: "Configura la institución", text: "Empieza creando o revisando las materias, cursos y años lectivos que utilizará tu institución." },
    { title: "Administra estudiantes y usuarios", text: "En Estudiantes puedes matricular y asignar estudiantes a cursos. En Usuarios puedes gestionar los accesos del sistema." },
    { title: "Abre un curso para consultar", text: "Desde Cursos puedes entrar a cada curso y revisar sus estudiantes, materias, insumos, notas y reportes." },
    { title: "Ya puedes comenzar", text: "Utiliza el menú lateral para moverte por el sistema. Puedes volver a ver este tutorial desde tu menú de usuario." },
  ],
  docente: [
    { title: "Bienvenido al Panel de Gestión Docente", text: "Aquí puedes consultar tus cursos y organizar la información académica de tus estudiantes." },
    { title: "Selecciona tu contexto de trabajo", text: "Si tienes varios años lectivos o modos de trabajo, utiliza los selectores para elegir el contexto que deseas gestionar." },
    { title: "Organiza tus cursos", text: "Desde cada curso puedes revisar estudiantes, materias e insumos. Los pendientes te ayudan a identificar lo que falta configurar." },
    { title: "Registra la información académica", text: "En las pestañas del curso puedes gestionar asistencia, comportamiento, notas, periodización y reportes." },
    { title: "Ya puedes comenzar", text: "Explora tu panel y usa el menú de usuario para volver a ver este tutorial cuando lo necesites." },
  ],
};

function getTutorialKey(role, mode, scope = "panel") {
  let userKey = "anonimo";
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
    userKey = usuario?.id_usuario || usuario?.id || usuario?.correo || "anonimo";
  } catch {
    // Mantener una clave segura si la sesión aún no tiene usuario serializado.
  }
  const base = `sistema-docente-tutorial:${userKey}:${role}:${mode}`;
  return scope === "panel" ? base : `${base}:${scope}:v2`;
}

function tieneConfiguracionExistente(role, mode) {
  const contexto = localStorage.getItem("contexto_activo") || "sin-contexto";
  const anioActivo = localStorage.getItem(`anio_lectivo_activo:${mode}:${contexto}`);
  if (anioActivo) return true;
  if (role === "administrativo") {
    try {
      const cursos = JSON.parse(localStorage.getItem(getAdminRecentCoursesKey()) || "[]");
      return Array.isArray(cursos) && cursos.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

export function abrirTutorial() {
  window.dispatchEvent(new Event(TUTORIAL_EVENT));
}

export function avanzarTutorial(eventName = TUTORIAL_YEAR_CREATED) {
  window.dispatchEvent(new Event(eventName));
}

function AppTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardLayout, setCardLayout] = useState(null);
  const cardRef = useRef(null);
  const role = (localStorage.getItem("role") || "docente").toLowerCase();
  const mode = (localStorage.getItem("app_mode") || "institucional").toLowerCase();
  const pathname = window.location.pathname;
  const esCursoAdmin = pathname.startsWith("/admin/cursos/");
  const esCursoDocente = pathname.startsWith("/curso/");
  const esCurso = esCursoAdmin || esCursoDocente;
  const tutorialScope = esCursoAdmin ? "curso-admin" : esCursoDocente ? "curso" : "panel";
  const steps = useMemo(() => (
    esCursoAdmin
      ? ADMIN_COURSE_STEPS
      : esCursoDocente
      ? COURSE_STEPS
        .filter((item) => mode === "personal" || item.tab !== "estudiantes")
        .map((item) => mode === "personal" && item.target === "curso-materia"
          ? { ...item, text: "Elige la materia que vas a gestionar dentro de este curso para consultar o registrar su información académica." }
          : item)
      : role === "docente" && mode === "personal"
      ? PERSONAL_DOCENTE_STEPS
      : role === "docente" && mode === "institucional"
      ? INSTITUTIONAL_DOCENTE_STEPS
      : role === "administrativo"
      ? ADMIN_STEPS
      : GENERIC_STEPS[role] || GENERIC_STEPS.docente
  ), [esCursoAdmin, esCursoDocente, mode, role]);
  const currentStep = steps[step] || steps[0];

  const cambiarPaso = (nextStep) => {
    const next = steps[nextStep];
    if (next?.tab) {
      window.dispatchEvent(new CustomEvent(TUTORIAL_COURSE_TAB, { detail: next.tab }));
    }
    setStep(nextStep);
  };

  useEffect(() => {
    const irAlResumenAdmin = () => {
      if (window.location.pathname.startsWith("/admin/cursos/")) {
        window.dispatchEvent(new CustomEvent(TUTORIAL_COURSE_TAB, { detail: "resumen" }));
      }
    };
    const abrir = () => {
      irAlResumenAdmin();
      setStep(0);
      setVisible(true);
    };
    const abrirCursoListo = () => {
      const path = window.location.pathname;
      const esCursoAdminListo = path.startsWith("/admin/cursos/") && role === "administrativo";
      const scope = esCursoAdminListo ? "curso-admin" : "curso";
      const esCursoDocenteListo = path.startsWith("/curso/") && role === "docente";
      if ((esCursoAdminListo || esCursoDocenteListo) && !localStorage.getItem(getTutorialKey(role, mode, scope))) {
        irAlResumenAdmin();
        setStep(0);
        setVisible(true);
      }
    };
    const avanzarEnPaso = (target) => {
      if (!visible || role !== "docente" || mode !== "personal") return;
      if (currentStep?.target !== target) return;
      setStep((current) => Math.min(current + 1, steps.length - 1));
    };
    window.addEventListener(TUTORIAL_EVENT, abrir);
    window.addEventListener(TUTORIAL_COURSE_READY, abrirCursoListo);
    const alCrearAnio = () => avanzarEnPaso("crear-anio");
    const alGuardarPeriodizacion = () => avanzarEnPaso("periodizacion");
    const alCrearCurso = () => avanzarEnPaso("crear-curso");
    window.addEventListener(TUTORIAL_YEAR_CREATED, alCrearAnio);
    window.addEventListener(TUTORIAL_PERIODIZATION_SAVED, alGuardarPeriodizacion);
    window.addEventListener(TUTORIAL_COURSE_CREATED, alCrearCurso);
    return () => {
      window.removeEventListener(TUTORIAL_EVENT, abrir);
      window.removeEventListener(TUTORIAL_COURSE_READY, abrirCursoListo);
      window.removeEventListener(TUTORIAL_YEAR_CREATED, alCrearAnio);
      window.removeEventListener(TUTORIAL_PERIODIZATION_SAVED, alGuardarPeriodizacion);
      window.removeEventListener(TUTORIAL_COURSE_CREATED, alCrearCurso);
    };
  }, [currentStep, mode, role, steps.length, visible]);

  useEffect(() => {
    if (pathname === "/" || !localStorage.getItem("token")) return;
    if (esCurso) return;
    // El tutorial del curso es independiente y debe aparecer al entrar,
    // incluso si el usuario ya tiene configurado su panel.
    if (!esCurso && tieneConfiguracionExistente(role, mode)) return;
    if (!localStorage.getItem(getTutorialKey(role, mode, tutorialScope))) {
      setStep(0);
      setVisible(true);
    }
  }, [esCurso, mode, pathname, role, tutorialScope]);

  useEffect(() => {
    if (!visible || !currentStep?.target) {
      setTargetRect(null);
      return undefined;
    }
    let targetElement = null;
    let targetPositioned = false;
    const updatePosition = () => {
      const nextTarget = document.querySelector(`[data-tutorial="${currentStep.target}"]`);
      if (nextTarget) {
        targetElement = nextTarget;
        if (window.getComputedStyle(targetElement).position === "static") {
          targetElement.classList.add("tutorial-target-positioned");
        }
        targetElement.classList.add("tutorial-active-target");
        let rect = targetElement.getBoundingClientRect();
        const targetIsTall = rect.height > window.innerHeight * 0.75;
        if (!targetPositioned && targetIsTall) {
          const cardHeight = cardRef.current?.getBoundingClientRect().height || 250;
          const targetTop = Math.min(
            window.innerHeight - 80,
            cardHeight + 28 + 24 + 14,
          );
          window.scrollTo({
            top: Math.max(0, window.scrollY + rect.top - targetTop),
            behavior: "auto",
          });
          rect = targetElement.getBoundingClientRect();
        } else if (!targetPositioned && (rect.top < 16 || rect.bottom > window.innerHeight - 16)) {
          targetElement.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
          rect = targetElement.getBoundingClientRect();
        }
        targetPositioned = true;
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };
    const frame = window.requestAnimationFrame(updatePosition);
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      targetElement?.classList.remove("tutorial-target-positioned");
      targetElement?.classList.remove("tutorial-active-target");
    };
  }, [currentStep, visible]);

  useLayoutEffect(() => {
    if (!visible || !targetRect || !cardRef.current) {
      setCardLayout(null);
      return;
    }

    const card = cardRef.current.getBoundingClientRect();
    const margin = 24;
    const gap = 28;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetIsWide = targetRect.width > viewportWidth * 0.6;
    const wideTargetGap = 12;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
    let left;
    let top;
    let placement;

    if (targetIsWide && targetRect.top >= card.height + wideTargetGap + 16) {
      placement = "top";
      left = clamp(targetRect.left + (targetRect.width - card.width) / 2, margin, viewportWidth - card.width - margin);
      top = Math.max(16, targetRect.top - card.height - wideTargetGap);
    } else if (targetIsWide) {
      placement = "bottom";
      left = clamp(targetRect.left + (targetRect.width - card.width) / 2, margin, viewportWidth - card.width - margin);
      top = clamp(targetRect.bottom + gap + 36, margin, viewportHeight - card.height - margin);
    } else if (targetRect.left >= card.width + gap) {
      placement = "left";
      left = targetRect.left - card.width - gap;
      top = clamp(targetRect.top + (targetRect.height - card.height) / 2, margin, viewportHeight - card.height - margin);
    } else if (viewportWidth - targetRect.right >= card.width + gap) {
      placement = "right";
      left = targetRect.right + gap;
      top = clamp(targetRect.top + (targetRect.height - card.height) / 2, margin, viewportHeight - card.height - margin);
    } else if (viewportHeight - targetRect.bottom >= card.height + gap) {
      placement = "bottom";
      left = clamp(targetRect.left + (targetRect.width - card.width) / 2, margin, viewportWidth - card.width - margin);
      top = targetRect.bottom + gap;
    } else {
      placement = "top";
      left = clamp(targetRect.left + (targetRect.width - card.width) / 2, margin, viewportWidth - card.width - margin);
      top = clamp(targetRect.top - card.height - gap, margin, viewportHeight - card.height - margin);
    }

    setCardLayout({ left, top, placement });
  }, [targetRect, visible, currentStep]);

  if (!visible) return null;

  const isLastStep = step === steps.length - 1;
  const finish = () => {
    localStorage.setItem(getTutorialKey(role, mode, tutorialScope), "completed");
    setVisible(false);
  };
  const cardStyle = targetRect
    ? cardLayout
      ? { top: cardLayout.top, left: cardLayout.left }
      : { top: 24, left: 24, visibility: "hidden" }
    : undefined;
  const spotlightStyle = targetRect
    ? { top: Math.max(4, targetRect.top - 8), left: Math.max(4, targetRect.left - 8), width: targetRect.width + 16, height: targetRect.height + 16 }
    : undefined;

  return (
    <>
      <div className={`tutorial-overlay${targetRect ? " tutorial-overlay-contextual" : ""}`}>
        {targetRect && <div className="tutorial-spotlight" style={spotlightStyle} aria-hidden="true" />}
      </div>
      {createPortal(<section ref={cardRef} role="dialog" aria-modal="false" aria-labelledby="tutorial-title" className={`tutorial-card${targetRect ? ` tutorial-card-contextual tutorial-card-placement-${cardLayout?.placement || "bottom"}${targetRect.width > window.innerWidth * 0.6 ? " tutorial-card-wide" : ""}` : " tutorial-card-intro"}`} style={cardStyle}>
        <p className="tutorial-kicker">
          <span className="tutorial-icon" aria-hidden="true">
            {isLastStep ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
          </span>
          <span>Guía rápida · Paso {step + 1} de {steps.length}</span>
        </p>
        <h2 id="tutorial-title">{currentStep.title}</h2>
        <p className="tutorial-text">{currentStep.text}</p>
        <div className="tutorial-progress" aria-label={`Paso ${step + 1} de ${steps.length}`}>
          {steps.map((item, index) => <span key={item.title} className={index <= step ? "active" : ""} />)}
        </div>
        <div className="tutorial-actions">
          <button type="button" className="tutorial-skip" onClick={finish}>Omitir</button>
          {step > 0 && <button type="button" className="tutorial-back" onClick={() => cambiarPaso(step - 1)}><ChevronLeft size={16} /> Atrás</button>}
          <button type="button" className="tutorial-next" onClick={isLastStep ? finish : () => cambiarPaso(step + 1)}>
            {isLastStep ? "Entendido" : "Siguiente"}{!isLastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </section>, document.body)}
    </>
  );
}

export default AppTutorial;
