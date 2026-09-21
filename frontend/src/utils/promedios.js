const getTipo = (insumo) => String(insumo?.tipo_insumo || "").toLowerCase();

// En la vista diaria mostramos lo que ya existe: si falta un tipo de insumo,
// repartimos el peso entre los tipos disponibles para no penalizar al usuario.
export function getPesosInteractivos(insumos) {
  const tiene = (tipo) => insumos.some((insumo) => getTipo(insumo).includes(tipo));
  const actividades = tiene("actividad") || insumos.some((insumo) => {
    const tipo = getTipo(insumo);
    return !tipo.includes("proyecto") && !tipo.includes("examen");
  });
  const proyecto = tiene("proyecto");
  const examen = tiene("examen");
  const tiposActivos = [actividades, proyecto, examen].filter(Boolean).length;

  if (tiposActivos === 0) return { actividades: 0, proyecto: 0, examen: 0 };
  if (tiposActivos === 1) {
    return {
      actividades: actividades ? 100 : 0,
      proyecto: proyecto ? 100 : 0,
      examen: examen ? 100 : 0,
    };
  }
  if (actividades && proyecto && examen) return { actividades: 70, proyecto: 10, examen: 20 };
  if (actividades && proyecto) return { actividades: 70, proyecto: 30, examen: 0 };
  if (actividades && examen) return { actividades: 70, proyecto: 0, examen: 30 };
  return { actividades: 0, proyecto: 50, examen: 50 };
}

export function calcularPromedioInteractivo(insumos, obtenerNota) {
  const lista = Array.isArray(insumos) ? insumos : [];
  if (!lista.length) {
    return {
      promedio: null,
      pesos: getPesosInteractivos([]),
      // Mantener el mismo contrato evita errores cuando un periodo aún no
      // tiene insumos configurados.
      promedios: { actividades: null, proyecto: null, examen: null },
    };
  }

  const grupos = {
    actividades: lista.filter((insumo) => getTipo(insumo).includes("actividad")),
    proyecto: lista.filter((insumo) => getTipo(insumo).includes("proyecto")),
    examen: lista.filter((insumo) => getTipo(insumo).includes("examen")),
  };
  const desconocidos = lista.filter(
    (insumo) => !Object.values(grupos).some((grupo) => grupo.includes(insumo)),
  );
  grupos.actividades.push(...desconocidos);
  const pesos = getPesosInteractivos(lista);
  const promedioGrupo = (grupo) =>
    grupo.length
      ? grupo.reduce((total, insumo) => total + (Number(obtenerNota(insumo)) || 0), 0) / grupo.length
      : null;
  const promedios = {
    actividades: promedioGrupo(grupos.actividades),
    proyecto: promedioGrupo(grupos.proyecto),
    examen: promedioGrupo(grupos.examen),
  };

  return {
    promedio:
      (promedios.actividades ?? 0) * (pesos.actividades / 100) +
      (promedios.proyecto ?? 0) * (pesos.proyecto / 100) +
      (promedios.examen ?? 0) * (pesos.examen / 100),
    pesos,
    promedios,
  };
}
