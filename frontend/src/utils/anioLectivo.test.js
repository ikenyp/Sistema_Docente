import {
  formatearAnioLectivoInput,
  normalizarAnioLectivo,
  validarAnioLectivo,
} from "./anioLectivo";

test("normaliza un año corto al rango siguiente", () => {
  expect(normalizarAnioLectivo("2026")).toBe("2026-2027");
});

test("formatea la entrada del año lectivo", () => {
  expect(formatearAnioLectivoInput("20262027")).toBe("2026-2027");
});

test("rechaza rangos que no sean consecutivos", () => {
  expect(validarAnioLectivo("2026-2028")).toMatch(/\+1/);
  expect(validarAnioLectivo("2026-2027")).toBeNull();
});
