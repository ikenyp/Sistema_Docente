import { cursosAPI } from "./api";
import { requestHttp } from "./http";

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

test("envía modo, año y filtros en una consulta API", async () => {
  localStorage.setItem("token", "token-test");
  localStorage.setItem("app_mode", "personal");
  localStorage.setItem("anio_lectivo_activo", "2026-2027");
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  });

  await cursosAPI.listar({ page: 2, size: 20 });

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/cursos/?page=2&size=20"),
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer token-test",
        "X-App-Mode": "personal",
        "X-Anio-Lectivo": "2026-2027",
      }),
    }),
  );
});

test("limpia la sesión cuando la API responde 401", async () => {
  localStorage.setItem("token", "token-test");
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ detail: "Token inválido" }),
  });

  await expect(cursosAPI.obtenerCurso(1)).rejects.toThrow("Token inválido");
  expect(localStorage.getItem("token")).toBeNull();
});

test.each([
  [400, "Datos inválidos"],
  [403, "No tienes permisos"],
  [404, "Recurso no encontrado"],
  [500, "Error interno"],
])("expone el detalle del backend para HTTP %i", async (status, detail) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ detail }),
  });

  await expect(cursosAPI.obtenerCurso(1)).rejects.toThrow(detail);
});

test("maneja respuestas 204 sin intentar leer JSON", async () => {
  const response = {
    ok: true,
    status: 204,
    json: jest.fn(),
  };
  global.fetch = jest.fn().mockResolvedValue(response);

  await expect(cursosAPI.eliminar(1)).resolves.toBeNull();
  expect(response.json).not.toHaveBeenCalled();
});

test("convierte un error de red en un mensaje amigable", async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

  await expect(cursosAPI.obtenerCurso(1)).rejects.toThrow(
    "No se pudo conectar con el servidor",
  );
});

test("el cliente HTTP común maneja respuestas exitosas de autenticación", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ access_token: "nuevo-token" }),
  });

  await expect(requestHttp("http://localhost:8000/auth/refresh", "POST"))
    .resolves.toEqual({ access_token: "nuevo-token" });
});

test("serializa el cuerpo JSON aunque el header se indique explícitamente", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
  });

  await requestHttp("http://localhost:8000/auth/register-personal", "POST", { nombre: "Ana" }, {
    "Content-Type": "application/json",
  });

  expect(global.fetch.mock.calls[0][1].body).toBe('{"nombre":"Ana"}');
});

test("el cliente HTTP común conserva el detalle de errores de autenticación", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 422,
    json: async () => ({ detail: "Correo inválido" }),
  });

  await expect(requestHttp("http://localhost:8000/auth/register-personal", "POST", {}))
    .rejects.toThrow("Correo inválido");
});
