import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mantiene compatibles los tests existentes durante la migración desde CRA.
globalThis.jest = vi;
