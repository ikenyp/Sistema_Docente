export async function requestHttp(url, method = "GET", body = null, extraHeaders = {}) {
  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
  // Login y refresh también usan este cliente para mantener un único manejo de errores.
  const headers = {
    "X-App-Mode": (localStorage.getItem("app_mode") || "institucional").toLowerCase(),
    ...extraHeaders,
  };
  const modo = (localStorage.getItem("app_mode") || "institucional").toLowerCase();
  const contexto = localStorage.getItem("contexto_activo") || "sin-contexto";
  const anio = localStorage.getItem(`anio_lectivo_activo:${modo}:${contexto}`) || localStorage.getItem("anio_lectivo_activo");
  const contextoActivo = localStorage.getItem("contexto_activo");
  const token = localStorage.getItem("token");
  if (anio) headers["X-Anio-Lectivo"] = anio;
  if (contextoActivo) headers["X-Contexto-Id"] = contextoActivo;
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

  const config = { method, headers };
  if (body !== null && method !== "GET" && method !== "HEAD") {
    const esFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const esUrlEncoded = typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
    if (!esFormData && !esUrlEncoded) {
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(body);
    } else {
      config.body = esUrlEncoded ? body.toString() : body;
    }
  }

  try {
    const response = await fetch(url, config);
    if (import.meta.env.DEV) {
      console.info(
        `[API] ${method} ${url} -> ${response.status} (${Math.round(performance.now() - startedAt)} ms)`,
      );
    }
    if (response.status === 204) return null;
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        message = typeof error?.detail === "string" ? error.detail : String(error || message);
      } catch {
        // Algunas respuestas de error no incluyen JSON.
      }
      const apiError = new Error(message);
      apiError.status = response.status;
      throw apiError;
    }
    return await response.json();
  } catch (error) {
    if (error?.status === 401) {
      const { endSession } = await import("./session");
      endSession("unauthorized");
    }
    if (error instanceof TypeError && /failed to fetch/i.test(error.message || "")) {
      throw new Error("No se pudo conectar con el servidor");
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
