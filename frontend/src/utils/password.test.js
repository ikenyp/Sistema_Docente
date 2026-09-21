import { validarContrasena } from "./password";

test("valida la politica minima de contrasena", () => {
  expect(validarContrasena("abc")).toContain("8 caracteres");
  expect(validarContrasena("abcdefgh")).toContain("mayúscula");
  expect(validarContrasena("Abcdefgh")).toContain("número");
  expect(validarContrasena("Abcdefg1")).toBe("");
});
