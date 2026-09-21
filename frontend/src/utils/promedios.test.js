import { calcularPromedioInteractivo, getPesosInteractivos } from "./promedios";

const insumo = (tipo, id_insumo) => ({ tipo_insumo: tipo, id_insumo });

test("redistribuye el peso cuando solo hay actividades", () => {
  const resultado = calcularPromedioInteractivo(
    [insumo("actividad", 1), insumo("actividad", 2)],
    (item) => (item.id_insumo === 1 ? 8 : 10),
  );

  expect(resultado.pesos).toEqual({ actividades: 100, proyecto: 0, examen: 0 });
  expect(resultado.promedio).toBe(9);
});

test("usa 70/10/20 cuando existen los tres componentes", () => {
  const resultado = calcularPromedioInteractivo(
    [insumo("actividad", 1), insumo("proyecto", 2), insumo("examen", 3)],
    (item) => ({ 1: 8, 2: 10, 3: 6 }[item.id_insumo]),
  );

  expect(resultado.pesos).toEqual({ actividades: 70, proyecto: 10, examen: 20 });
  expect(resultado.promedio).toBeCloseTo(7.8);
});

test("los tipos desconocidos se tratan como actividades", () => {
  expect(getPesosInteractivos([insumo("tarea", 1)])).toEqual({
    actividades: 100,
    proyecto: 0,
    examen: 0,
  });
});

test("mantiene los promedios definidos cuando no hay insumos", () => {
  expect(calcularPromedioInteractivo([], () => null)).toEqual({
    promedio: null,
    pesos: { actividades: 0, proyecto: 0, examen: 0 },
    promedios: { actividades: null, proyecto: null, examen: null },
  });
});
