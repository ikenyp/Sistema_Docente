import React, { useEffect, useMemo, useState } from "react";
import { Eye, FileSpreadsheet } from "lucide-react";
import CustomSelect from "../../../components/admin/CustomSelect";
import { asistenciaAPI, insumosAPI, notasAPI } from "../../../services/api";
import { notify } from "../../../components/notify";
import { calcularPromedioInteractivo } from "../../../utils/promedios";

let XLSX;

const loadXlsx = async () => {
  if (!XLSX) {
    const module = await import("xlsx-js-style");
    XLSX = module.default || module;
  }
  return XLSX;
};

const COL_BORDER = { style: "thin", color: { rgb: "C9D4E6" } };
const DARK_BLUE = "2F5597";
const MID_BLUE = "D9E2F3";
const LIGHT_BLUE = "EDF3FB";
const LIGHT_GREEN = "EAF6EE";
const LIGHT_GRAY = "F3F6FB";
const TEXT = "1F2D3D";

const sheetNameByPeriod = (periodo, index = 0) => {
  const n = Number(periodo?.numero_periodo || index + 1);
  if (n === 1) return "1ER TRIMESTRE";
  if (n === 2) return "2DO TRIMESTRE";
  if (n === 3) return "3ER TRIMESTRE";
  return `TRIMESTRE ${n}`;
};

const studentLabel = (est) => [est?.apellido, est?.nombre].filter(Boolean).join(" ").trim();

const toNumber = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const scoreOrZero = (value) => {
  const n = toNumber(value);
  return n === null ? 0 : n;
};

const resumenAnual = (periodScores) => {
  const valid = periodScores.filter((score) => score !== null);
  const sum = valid.reduce((total, score) => total + score, 0);
  return {
    sum,
    // Los periodos sin notas aportan 0 al promedio anual. El divisor siempre
    // corresponde a la periodización configurada, no solo a notas existentes.
    avg: valid.length && periodScores.length ? sum / periodScores.length : null,
    hasScores: valid.length > 0,
  };
};

const promedioFijoTrimestre = (insumos, notasPorInsumo, periodoId) => {
  const delPeriodo = (insumos || []).filter(
    (insumo) => String(insumo.id_periodo) === String(periodoId),
  );
  if (!delPeriodo.length) return null;

  return calcularPromedioInteractivo(
    delPeriodo,
    (insumo) => notasPorInsumo.get(String(insumo.id_insumo)),
  ).promedio;
};

const qualitative = (value) => {
  if (value === null || value === undefined) return "";
  if (value >= 9) return "DAR";
  if (value >= 7) return "AAR";
  if (value >= 5) return "PAAR";
  return "NAAR";
};

const getTipoBase = (tipo) => String(tipo || "").toLowerCase();

const splitGroups = (insumos) => {
  const activities = [];
  const projects = [];
  const exams = [];

  (insumos || [])
    .slice()
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"))
    .forEach((insumo) => {
      const tipo = getTipoBase(insumo.tipo_insumo);
      if (tipo.includes("actividad")) activities.push(insumo);
      else if (tipo.includes("proyecto")) projects.push(insumo);
      else if (tipo.includes("examen")) exams.push(insumo);
      else activities.push(insumo);
    });

  return [
    { key: "activities", title: "DEBERES", subtitle: "INSUMOS", items: activities },
    { key: "projects", title: "PROYECTO INTERDISCIPLINARIO", subtitle: "", items: projects },
    { key: "exams", title: "EVALUACION", subtitle: "", items: exams },
  ].filter((group) => group.items.length > 0);
};

const buildNotaMap = (notasPorEstudiante) => {
  const map = new Map();
  Object.values(notasPorEstudiante || {}).forEach((lista) => {
    (lista || []).forEach((registro) => {
      const insumoId = registro?.insumo?.id_insumo ?? registro?.id_insumo;
      const estudianteId = registro?.id_estudiante ?? registro?.estudiante?.id_estudiante;
      if (estudianteId && insumoId) {
        map.set(`${estudianteId}:${insumoId}`, scoreOrZero(registro.valor ?? registro.calificacion));
      }
    });
  });
  return map;
};

const groupNeedsAverage = (groupKey) => groupKey === "activities";

const computePeriodResults = ({ estudiantes, insumos, notaMap }) => {
  const groups = splitGroups(insumos);
  const results = [...(estudiantes || [])]
    .slice()
    .sort((a, b) => studentLabel(a).localeCompare(studentLabel(b), "es"))
    .map((estudiante, index) => {
      const grouped = { activities: [], projects: [], exams: [] };
      const cellValues = [];
      const contributions = [];
      const calculoPeriodo = calcularPromedioInteractivo(
        insumos,
        (insumo) => notaMap.get(`${estudiante.id_estudiante}:${insumo.id_insumo}`),
      );
      const pesosPorGrupo = {
        activities: calculoPeriodo.pesos.actividades,
        projects: calculoPeriodo.pesos.proyecto,
        exams: calculoPeriodo.pesos.examen,
      };

      groups.forEach((group) => {
        group.items.forEach((insumo) => {
          const value = notaMap.get(`${estudiante.id_estudiante}:${insumo.id_insumo}`);
          cellValues.push(value === undefined ? null : value);
          const tipo = getTipoBase(insumo.tipo_insumo);
          const item = { nota: value === undefined ? null : value };
          if (tipo.includes("actividad")) grouped.activities.push(item);
          else if (tipo.includes("proyecto")) grouped.projects.push(item);
          else if (tipo.includes("examen")) grouped.exams.push(item);
          else grouped.activities.push(item);
        });

        const avg = group.items.length
          ? group.items.reduce((acc, insumo) => acc + scoreOrZero(notaMap.get(`${estudiante.id_estudiante}:${insumo.id_insumo}`)), 0) / group.items.length
          : null;

        const maxGroupScore = (pesosPorGrupo[group.key] || 0) / 10;
        const weightedContribution = avg === null ? null : (avg / 10) * maxGroupScore;
        if (groupNeedsAverage(group.key)) {
          cellValues.push(avg);
        }
        cellValues.push(weightedContribution);
        contributions.push(weightedContribution);
      });

      const finalScore = contributions.some((value) => value !== null)
        ? calculoPeriodo.promedio
        : null;

      return {
        estudiante,
        index,
        cellValues,
        finalScore,
        qualitative: qualitative(finalScore),
      };
    });

  return { groups, results };
};

const setCell = (ws, row, col, value, style) => {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const type = typeof value === "number" ? "n" : "s";
  ws[addr] = { t: type, v: value ?? "", s: style };
  return addr;
};

const mergeRange = (ws, sRow, sCol, eRow, eCol) => {
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r: sRow, c: sCol }, e: { r: eRow, c: eCol } });
};

const styleRange = (ws, sRow, eRow, sCol, eCol, style) => {
  for (let r = sRow; r <= eRow; r += 1) {
    for (let c = sCol; c <= eCol; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };
      ws[addr].s = { ...(ws[addr].s || {}), ...style };
    }
  }
};

const borderAll = {
  top: COL_BORDER,
  bottom: COL_BORDER,
  left: COL_BORDER,
  right: COL_BORDER,
};

const styles = {
  title: {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: DARK_BLUE } },
    border: borderAll,
  },
  meta: {
    font: { bold: true, color: { rgb: TEXT } },
    alignment: { horizontal: "left", vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: LIGHT_BLUE } },
    border: borderAll,
  },
  group: {
    font: { bold: true, color: { rgb: TEXT } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: MID_BLUE } },
    border: borderAll,
  },
  subgroup: {
    font: { bold: true, color: { rgb: TEXT } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: LIGHT_BLUE } },
    border: borderAll,
  },
  leaf: {
    font: { bold: true, color: { rgb: TEXT } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: LIGHT_GRAY } },
    border: borderAll,
  },
  final: {
    font: { bold: true, color: { rgb: TEXT } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: LIGHT_GREEN } },
    border: borderAll,
  },
  text: {
    alignment: { horizontal: "left", vertical: "center" },
    border: borderAll,
  },
  center: {
    alignment: { horizontal: "center", vertical: "center" },
    border: borderAll,
  },
};

const strongBorderAll = {
  top: { style: "medium", color: { rgb: "000000" } },
  bottom: { style: "medium", color: { rgb: "000000" } },
  left: { style: "medium", color: { rgb: "000000" } },
  right: { style: "medium", color: { rgb: "000000" } },
};

const finalStyles = {
  title: { ...styles.title, border: strongBorderAll },
  meta: { ...styles.meta, border: strongBorderAll },
  group: { ...styles.group, border: strongBorderAll },
  subgroup: { ...styles.subgroup, border: strongBorderAll },
  leaf: { ...styles.leaf, border: strongBorderAll },
  final: { ...styles.final, border: strongBorderAll },
  text: { ...styles.text, border: strongBorderAll },
  center: { ...styles.center, border: strongBorderAll },
};

const buildPeriodSheet = ({ periodo, estudiantes, insumosMateria, notasPorEstudiante, materiaSeleccionada, cursoDetalle }) => {
  const notaMap = buildNotaMap(notasPorEstudiante);
  const periodoId = String(periodo.id_periodo);
  const insumosPeriodo = (insumosMateria || []).filter((insumo) => String(insumo.id_periodo) === periodoId);
  const { groups, results } = computePeriodResults({ estudiantes, insumos: insumosPeriodo, notaMap });

  const columns = [
    { key: "no", label: "No.", span: 1 },
    { key: "nomina", label: "NÓMINA", span: 1 },
  ];

  groups.forEach((group) => {
    group.items.forEach((insumo) => columns.push({ key: `i_${insumo.id_insumo}`, label: insumo.nombre, span: 1 }));
    if (groupNeedsAverage(group.key)) {
      columns.push({ key: `avg_${group.key}`, label: "PROM DE.", span: 1 });
    }
    columns.push({ key: `weighted_${group.key}`, label: "PROM", span: 1 });
  });

  columns.push({ key: "promedio", label: "PROMEDIO TRIMESTRAL", span: 1 });
  columns.push({ key: "cualitativa", label: "CUALITATIVA", span: 1 });

  const totalCols = columns.length;
  const rows = [
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
  ];

  rows[0][0] = `INFORME ACADEMICO: ${periodo.nombre_periodo || `TRIMESTRE ${periodo.numero_periodo}`}                     PERIODO LECTIVO: ${cursoDetalle?.anio_lectivo || ""}                                  ${cursoDetalle?.nombre || ""}`;
  rows[1][1] = `${materiaSeleccionada?.materia?.nombre || materiaSeleccionada?.nombre || "MATERIA"} - ${periodo.nombre_periodo || `TRIMESTRE ${periodo.numero_periodo}`}`;

  rows[2][0] = "No.";
  rows[2][1] = "NÓMINA";
  rows[3][0] = "";
  rows[3][1] = "";
  rows[4][0] = "";
  rows[4][1] = "";

  let col = 2;
  groups.forEach((group) => {
    const start = col;
    rows[2][start] = group.title;
    if (group.subtitle) {
      rows[3][start] = group.subtitle;
    }
    group.items.forEach((insumo, idx) => {
      rows[4][col + idx] = insumo.nombre;
    });
    let footerCol = col + group.items.length;
    if (groupNeedsAverage(group.key)) {
      rows[4][footerCol] = "PROM DE.";
      footerCol += 1;
    }
    rows[4][footerCol] = "PROM";
    col = footerCol + 1;
  });
  rows[2][col] = "PROMEDIO TRIMESTRAL";
  rows[2][col + 1] = "CUALITATIVA";

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = [];
  const lastCol = totalCols - 1;
  mergeRange(sheet, 0, 0, 0, lastCol);
  mergeRange(sheet, 1, 1, 1, lastCol);
  mergeRange(sheet, 2, 0, 4, 0);
  mergeRange(sheet, 2, 1, 4, 1);

  setCell(sheet, 0, 0, rows[0][0], styles.title);

  setCell(sheet, 1, 1, rows[1][1], styles.meta);

  setCell(sheet, 2, 0, "No.", styles.group);
  setCell(sheet, 2, 1, "NÓMINA", styles.group);
  setCell(sheet, 3, 0, "", styles.group);
  setCell(sheet, 3, 1, "", styles.group);
  setCell(sheet, 4, 0, "", styles.group);
  setCell(sheet, 4, 1, "", styles.group);

  col = 2;
  groups.forEach((group) => {
    const start = col;
    const end = col + group.items.length + (groupNeedsAverage(group.key) ? 1 : 0);
    setCell(sheet, 2, start, group.title, styles.group);
    if (group.subtitle) {
      setCell(sheet, 3, start, group.subtitle, styles.subgroup);
    }
    group.items.forEach((insumo, idx) => setCell(sheet, 4, col + idx, insumo.nombre, styles.leaf));
    let footerCol = col + group.items.length;
    if (groupNeedsAverage(group.key)) {
      setCell(sheet, 4, footerCol, "PROM DE.", styles.final);
      footerCol += 1;
    }
    setCell(sheet, 4, footerCol, "PROM", styles.final);
    if (group.subtitle) {
      mergeRange(sheet, 2, start, 2, end);
      mergeRange(sheet, 3, start, 3, end);
    } else {
      mergeRange(sheet, 2, start, 3, end);
    }
    col = footerCol + 1;
  });
  setCell(sheet, 2, col, "PROMEDIO TRIMESTRAL", styles.final);
  setCell(sheet, 2, col + 1, "CUALITATIVA", styles.final);
  mergeRange(sheet, 2, col, 4, col);
  mergeRange(sheet, 2, col + 1, 4, col + 1);

  results.forEach((row, idx) => {
    const r = 5 + idx;
    setCell(sheet, r, 0, idx + 1, styles.center);
    setCell(sheet, r, 1, studentLabel(row.estudiante), styles.text);

    let c = 2;
    let valueIndex = 0;
    groups.forEach((group) => {
      group.items.forEach(() => {
        setCell(sheet, r, c, row.cellValues[valueIndex] === null ? "-" : row.cellValues[valueIndex], styles.center);
        c += 1;
        valueIndex += 1;
      });
      if (groupNeedsAverage(group.key)) {
        setCell(sheet, r, c, row.cellValues[valueIndex] === null ? "-" : row.cellValues[valueIndex], styles.center);
        c += 1;
        valueIndex += 1;
      }
      setCell(sheet, r, c, row.cellValues[valueIndex] === null ? "-" : row.cellValues[valueIndex], styles.center);
      c += 1;
      valueIndex += 1;
    });

    setCell(sheet, r, c, row.finalScore === null ? "-" : row.finalScore, styles.center);
    setCell(sheet, r, c + 1, row.qualitative || "", styles.center);
  });

  sheet["!cols"] = [
    { wch: 6 },
    { wch: 34 },
    ...groups.flatMap((group) => [
      ...group.items.map(() => ({ wch: 12 })),
      ...(groupNeedsAverage(group.key) ? [{ wch: 12 }] : []),
      { wch: 12 },
    ]),
    { wch: 14 },
    { wch: 12 },
  ];

  styleRange(sheet, 0, 4, 0, lastCol, styles.group);
  styleRange(sheet, 0, 0, 0, lastCol, styles.title);
  styleRange(sheet, 1, 1, 1, lastCol, styles.meta);
  styleRange(sheet, 2, 4, 0, lastCol, styles.leaf);
  styleRange(sheet, 5, 5 + results.length - 1, 0, lastCol, styles.center);
  sheet["!rows"] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 22 }, { hpt: 20 }, { hpt: 20 }];
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: 5 + results.length - 1, c: lastCol },
  });

  return {
    sheet,
    sheetName: sheetNameByPeriod(periodo),
    finalCol: XLSX.utils.encode_col(columns.length - 2),
    results,
  };
};

const buildFinalSheet = ({ estudiantes, periodResults, cursoDetalle, materiaSeleccionada }) => {
  const periodNames = periodResults.map((r) => r.sheetName);
  const totalCols = 2 + periodResults.length + 3;
  const rows = [
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
    Array(totalCols).fill(""),
  ];

  rows[0][0] = `INFORME ACADEMICO:             FINAL DE AÑO                     PERIODO LECTIVO:         ${cursoDetalle?.anio_lectivo || ""}                                  ${cursoDetalle?.nombre || ""}`;
  rows[1][1] = `${materiaSeleccionada?.materia?.nombre || materiaSeleccionada?.nombre || "MATERIA"} `;
  rows[2][0] = "No.";
  rows[2][1] = "NÓMINA";
  rows[2][2] = "PERIODOS";
  rows[3][2] = "CALIFICACIONES POR PERIODO";
  periodNames.forEach((name, index) => {
    rows[4][2 + index] = `${index + 1}T`;
  });
  const sumaCol = 2 + periodResults.length;
  const promCol = 3 + periodResults.length;
  const cualCol = 4 + periodResults.length;
  rows[2][sumaCol] = `SUMA ${periodResults.length} PERIODOS`;
  rows[2][promCol] = "PROM TRI 100%";
  rows[2][cualCol] = "CUALITATIVA";

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = [];
  mergeRange(sheet, 0, 0, 0, totalCols - 1);
  mergeRange(sheet, 1, 1, 1, totalCols - 1);
  mergeRange(sheet, 2, 0, 4, 0);
  mergeRange(sheet, 2, 1, 4, 1);
  mergeRange(sheet, 2, 2, 2, 1 + periodResults.length);
  mergeRange(sheet, 3, 2, 3, 1 + periodResults.length);
  mergeRange(sheet, 2, sumaCol, 4, sumaCol);
  mergeRange(sheet, 2, promCol, 4, promCol);
  mergeRange(sheet, 2, cualCol, 4, cualCol);

  setCell(sheet, 0, 0, rows[0][0], finalStyles.title);
  setCell(sheet, 1, 1, rows[1][1], finalStyles.meta);
  setCell(sheet, 2, 0, "No.", finalStyles.group);
  setCell(sheet, 2, 1, "NÓMINA", finalStyles.group);
  setCell(sheet, 2, 2, "PERIODOS", finalStyles.group);
  setCell(sheet, 3, 2, "CALIFICACIONES POR PERIODO", finalStyles.subgroup);
  periodNames.forEach((name, index) => {
    setCell(sheet, 4, 2 + index, name, finalStyles.leaf);
  });
  setCell(sheet, 2, sumaCol, `SUMA ${periodResults.length} PERIODOS`, finalStyles.final);
  setCell(sheet, 2, promCol, "PROM TRI 100%", finalStyles.final);
  setCell(sheet, 2, cualCol, "CUALITATIVA", finalStyles.final);

  const studentOrder = [...estudiantes].sort((a, b) => studentLabel(a).localeCompare(studentLabel(b), "es"));

  studentOrder.forEach((est, idx) => {
    const row = 5 + idx;
    setCell(sheet, row, 0, idx + 1, finalStyles.center);
    setCell(sheet, row, 1, studentLabel(est), finalStyles.text);

    const periodScores = periodResults.map((periodResult, periodIdx) => {
      const result = periodResult.results.find((r) => String(r.estudiante.id_estudiante) === String(est.id_estudiante));
      return result?.finalScore ?? null;
    });

    periodScores.forEach((score, i) => setCell(sheet, row, 2 + i, score === null ? "-" : score, finalStyles.center));
    const { sum, avg, hasScores } = resumenAnual(periodScores);
    setCell(sheet, row, sumaCol, hasScores ? sum : "-", finalStyles.center);
    setCell(sheet, row, promCol, avg === null ? "-" : avg, finalStyles.center);
    setCell(sheet, row, cualCol, qualitative(avg), finalStyles.center);
  });

  sheet["!cols"] = [
    { wch: 6 },
    { wch: 34 },
    ...periodResults.map(() => ({ wch: 12 })),
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];

  styleRange(sheet, 0, 4, 0, 7, finalStyles.group);
  styleRange(sheet, 0, 0, 0, 7, finalStyles.title);
  styleRange(sheet, 1, 1, 1, 7, finalStyles.meta);
  styleRange(sheet, 5, 5 + studentOrder.length - 1, 0, 7, finalStyles.center);
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: 5 + studentOrder.length - 1, c: 7 },
  });

  return { sheet, sheetName: "FINAL" };
};

const formatPreviewValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
};

const buildPeriodPreviewModel = ({ periodo, estudiantes, insumosMateria, notasPorEstudiante, materiaSeleccionada, cursoDetalle }) => {
  const notaMap = buildNotaMap(notasPorEstudiante);
  const periodoId = String(periodo.id_periodo);
  const insumosPeriodo = (insumosMateria || []).filter((insumo) => String(insumo.id_periodo) === periodoId);
  const { groups, results } = computePeriodResults({ estudiantes, insumos: insumosPeriodo, notaMap });
  const totalCols = 2 + groups.reduce((acc, group) => acc + group.items.length + (groupNeedsAverage(group.key) ? 2 : 1), 0) + 2;

  const headerRows = [
    [{ label: `INFORME ACADEMICO: ${periodo.nombre_periodo || `TRIMESTRE ${periodo.numero_periodo}`} · PERIODO LECTIVO: ${cursoDetalle?.anio_lectivo || ""}`, colSpan: totalCols, className: "preview-title" }],
    [{ label: `${materiaSeleccionada?.materia?.nombre || materiaSeleccionada?.nombre || "MATERIA"} - ${periodo.nombre_periodo || `TRIMESTRE ${periodo.numero_periodo}`}`, colSpan: totalCols, className: "preview-meta" }],
    [
      { label: "No.", rowSpan: 3, className: "preview-head" },
      { label: "NÓMINA", rowSpan: 3, className: "preview-head" },
      ...groups.map((group) => ({
        label: group.title,
        colSpan: group.items.length + (groupNeedsAverage(group.key) ? 2 : 1),
        rowSpan: group.subtitle ? 1 : 2,
        className: "preview-head",
      })),
      { label: "PROMEDIO TRIMESTRAL", rowSpan: 3, className: "preview-final-head" },
      { label: "CUALITATIVA", rowSpan: 3, className: "preview-final-head" },
    ],
    [
      ...groups
        .filter((group) => group.subtitle)
        .map((group) => ({ label: group.subtitle, colSpan: group.items.length + (groupNeedsAverage(group.key) ? 2 : 1), className: "preview-subhead" })),
    ],
    [
      ...groups.flatMap((group) => [
        ...group.items.map((insumo) => ({ label: insumo.nombre, className: "preview-leaf" })),
        ...(groupNeedsAverage(group.key) ? [{ label: "PROM DE.", className: "preview-final-head" }] : []),
        { label: "PROM", className: "preview-final-head" },
      ]),
    ],
  ];

  const bodyRows = results.map((row) => {
    const values = [String(row.index + 1), studentLabel(row.estudiante)];
    let valueIndex = 0;
    groups.forEach((group) => {
      group.items.forEach(() => {
        values.push(formatPreviewValue(row.cellValues[valueIndex]));
        valueIndex += 1;
      });
      if (groupNeedsAverage(group.key)) {
        values.push(formatPreviewValue(row.cellValues[valueIndex]));
        valueIndex += 1;
      }
      values.push(formatPreviewValue(row.cellValues[valueIndex]));
      valueIndex += 1;
    });
    values.push(formatPreviewValue(row.finalScore));
    values.push(row.qualitative || "");
    return values;
  });

  return { type: "trimestre", headerRows, bodyRows, totalCols };
};

const buildGeneralPreviewModel = ({ estudiantes, periodosOrdenados, insumosMateria, notasPorEstudiante, materiaSeleccionada, cursoDetalle }) => {
  const notaMap = buildNotaMap(notasPorEstudiante);
  const periodResults = periodosOrdenados.map((periodo) =>
    computePeriodResults({
      estudiantes,
      insumos: (insumosMateria || []).filter((insumo) => String(insumo.id_periodo) === String(periodo.id_periodo)),
      notaMap,
    }),
  );

  const totalCols = 2 + periodResults.length + 3;
  const headerRows = [
    [{ label: `INFORME ACADEMICO:             FINAL DE AÑO                     PERIODO LECTIVO:         ${cursoDetalle?.anio_lectivo || ""}`, colSpan: totalCols, className: "preview-title" }],
    [{ label: `${materiaSeleccionada?.materia?.nombre || materiaSeleccionada?.nombre || "MATERIA"}`, colSpan: totalCols, className: "preview-meta" }],
    [
      { label: "No.", rowSpan: 3, className: "preview-head" },
      { label: "NÓMINA", rowSpan: 3, className: "preview-head" },
      { label: "PERIODOS", colSpan: periodResults.length, className: "preview-head" },
      { label: `SUMA ${periodResults.length} PERIODOS`, rowSpan: 3, className: "preview-final-head" },
      { label: "PROM TRI 100%", rowSpan: 3, className: "preview-final-head" },
      { label: "CUALITATIVA", rowSpan: 3, className: "preview-final-head" },
    ],
    [{ label: "CALIFICACIONES TRIMESTRALES", colSpan: periodResults.length, className: "preview-subhead" }],
    periodResults.map((periodResult, index) => ({ label: `${index + 1}T`, className: "preview-leaf" })),
  ];

  const studentOrder = [...estudiantes].sort((a, b) => studentLabel(a).localeCompare(studentLabel(b), "es"));
  const bodyRows = studentOrder.map((est, idx) => {
    const periodScores = periodResults.map((periodResult) => {
      const result = periodResult.results.find((r) => String(r.estudiante.id_estudiante) === String(est.id_estudiante));
      return result?.finalScore ?? null;
    });
    const { sum, avg, hasScores } = resumenAnual(periodScores);
    return [
      String(idx + 1),
      studentLabel(est),
      ...periodScores.map((v) => formatPreviewValue(v)),
      hasScores ? formatPreviewValue(sum) : "-",
      formatPreviewValue(avg),
      qualitative(avg),
    ];
  });

  return { type: "general", headerRows, bodyRows, totalCols };
};

const PreviewTable = ({ model, compact = false }) => {
  if (!model) return null;

  return (
    <div className={`reportes-preview-wrap${compact ? " reportes-preview-wrap-compact" : ""}`}>
      <table className={`reportes-preview-table${compact ? " reportes-preview-table-compact" : ""}`}>
        <colgroup>
          {Array.from({ length: model.totalCols }).map((_, idx) => (
            <col
              key={idx}
              className={idx === 0 ? "preview-col-number" : idx === 1 ? "preview-col-name" : "preview-col-default"}
            />
          ))}
        </colgroup>
        <thead>
          {model.headerRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <th
                  key={cellIndex}
                  colSpan={cell.colSpan || 1}
                  rowSpan={cell.rowSpan || 1}
                  className={cell.className}
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {model.bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cellIndex === 1 ? "preview-name-cell" : "preview-cell"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const TabReportes = ({
  activeTab,
  estudiantesCurso,
  periodos = [],
  insumosMateria = [],
  notasPorEstudiante = {},
  materiaSeleccionada,
  materiasCurso = [],
  cursoDetalle,
  compactPreview = false,
  soloLecturaTutor = false,
}) => {
  // Genera el resultado oficial y mantiene siempre las ponderaciones 70/10/20.
  const [periodoId, setPeriodoId] = useState("");
  const [generando, setGenerando] = useState(false);
  const [reportType, setReportType] = useState("trimestre");
  const [estudianteReporteId, setEstudianteReporteId] = useState("");
  const [reporteIndividualPreview, setReporteIndividualPreview] = useState(null);

  const periodosOrdenados = useMemo(
    () => [...periodos].sort((a, b) => Number(a.numero_periodo) - Number(b.numero_periodo)),
    [periodos],
  );

  useEffect(() => {
    if (!periodoId && periodosOrdenados.length > 0) {
      setPeriodoId(String(periodosOrdenados[0].id_periodo));
    }
  }, [periodosOrdenados, periodoId]);

  const previewTrimestreModel = useMemo(() => {
    const periodo = periodosOrdenados.find((p) => String(p.id_periodo) === String(periodoId));
    if (!periodo) return null;
    return buildPeriodPreviewModel({
      periodo,
      estudiantes: estudiantesCurso,
      insumosMateria,
      notasPorEstudiante,
      materiaSeleccionada,
      cursoDetalle,
    });
  }, [periodoId, periodosOrdenados, estudiantesCurso, insumosMateria, notasPorEstudiante, materiaSeleccionada, cursoDetalle]);

  const previewGeneralModel = useMemo(() => {
    if (!periodosOrdenados.length) return null;
    return buildGeneralPreviewModel({
      estudiantes: estudiantesCurso,
      periodosOrdenados,
      insumosMateria,
      notasPorEstudiante,
      materiaSeleccionada,
      cursoDetalle,
    });
  }, [periodosOrdenados, estudiantesCurso, insumosMateria, notasPorEstudiante, materiaSeleccionada, cursoDetalle]);

  const previewModel = reportType === "anual" ? previewGeneralModel : previewTrimestreModel;

  if (activeTab !== "reportes") return null;

  const exportarTrimestre = async () => {
    if (!periodoId) return;
    setGenerando(true);
    try {
      await loadXlsx();
      const periodo = periodosOrdenados.find((p) => String(p.id_periodo) === String(periodoId));
      const wb = XLSX.utils.book_new();
      const report = buildPeriodSheet({
        periodo,
        estudiantes: estudiantesCurso,
        insumosMateria,
        notasPorEstudiante,
        materiaSeleccionada,
        cursoDetalle,
      });
      XLSX.utils.book_append_sheet(wb, report.sheet, report.sheetName);
      XLSX.writeFile(wb, `${materiaSeleccionada?.materia?.nombre || materiaSeleccionada?.nombre || "Materia"} - ${cursoDetalle?.anio_lectivo || ""} - ${report.sheetName}.xlsx`);
    } finally {
      setGenerando(false);
    }
  };

  const exportarGeneral = async () => {
    setGenerando(true);
    try {
      await loadXlsx();
      const wb = XLSX.utils.book_new();
      const periodResults = periodosOrdenados.map((periodo) =>
        buildPeriodSheet({
          periodo,
          estudiantes: estudiantesCurso,
          insumosMateria,
          notasPorEstudiante,
          materiaSeleccionada,
          cursoDetalle,
        }),
      );

      const finalReport = buildFinalSheet({
        estudiantes: estudiantesCurso,
        periodResults,
        cursoDetalle,
        materiaSeleccionada,
      });
      XLSX.utils.book_append_sheet(wb, finalReport.sheet, finalReport.sheetName);

      periodResults.forEach((report) => {
        XLSX.utils.book_append_sheet(wb, report.sheet, report.sheetName);
      });

      XLSX.writeFile(wb, `${materiaSeleccionada?.materia?.nombre || materiaSeleccionada?.nombre || "Materia"} - ${cursoDetalle?.anio_lectivo || ""} - GENERAL.xlsx`);
    } finally {
      setGenerando(false);
    }
  };

  const cargarReporteIndividual = async (idEstudiante = estudianteReporteId) => {
      const estudiante = estudiantesCurso.find(
        (item) => String(item.id_estudiante) === String(idEstudiante),
      );
      const [asistencias, insumosPorMateria] = await Promise.all([
        asistenciaAPI.listar({ id_estudiante: idEstudiante, size: 100 }),
        Promise.all(
          materiasCurso.map(async (asignacion) => [
            asignacion,
            await insumosAPI.listarPorCMD(asignacion.id_cmd),
          ]),
        ),
      ]);
      const todosLosInsumos = insumosPorMateria.flatMap(([, insumos]) => insumos || []);
      const respuestasNotas = await Promise.all(
        todosLosInsumos.map((insumo) => notasAPI.obtenerNotaEstudiante(idEstudiante, insumo.id_insumo)),
      );
      const notas = respuestasNotas.flat();
      const notasPorInsumo = new Map(
        (notas || []).map((nota) => [
          String(nota.id_insumo),
          nota.valor ?? nota.calificacion,
        ]),
      );
      const filas = insumosPorMateria.map(([asignacion, insumos]) => {
        const promedios = periodosOrdenados.map((periodo) =>
          promedioFijoTrimestre(insumos, notasPorInsumo, periodo.id_periodo),
        );
        return [
          asignacion.materia?.nombre || asignacion.nombre_materia || "Materia",
          ...promedios.map((valor) => valor === null ? "" : Number(valor.toFixed(2))),
          Number((promedios.reduce((total, valor) => total + (valor ?? 0), 0) / Math.max(periodosOrdenados.length, 1)).toFixed(2)),
        ];
      });
      const totalAsistencia = (asistencias || []).length;
      const justificadas = (asistencias || []).filter((item) => item.estado === "justificado").length;
      const ausencias = (asistencias || []).filter((item) => item.estado === "ausente").length;
      const presentes = (asistencias || []).filter((item) => item.estado === "presente").length;
      return {
        estudiante,
        filas,
        asistencia: { totalAsistencia, justificadas, ausencias, presentes },
      };
  };

  const previsualizarReporteIndividual = async (idEstudiante = estudianteReporteId) => {
    if (!idEstudiante || !cursoDetalle?.id_curso) return;
    setGenerando(true);
    try {
      setReporteIndividualPreview(await cargarReporteIndividual(idEstudiante));
    } catch (error) {
      notify("error", error.message || "No se pudo cargar el reporte individual");
    } finally {
      setGenerando(false);
    }
  };

  const exportarReporteIndividual = async () => {
    if (!estudianteReporteId || !cursoDetalle?.id_curso) return;
    setGenerando(true);
    try {
      await loadXlsx();
      const reporte = reporteIndividualPreview || await cargarReporteIndividual();
      const { estudiante, filas, asistencia } = reporte;
      const ws = XLSX.utils.aoa_to_sheet([
        ["REPORTE INDIVIDUAL"],
        ["Nombre", studentLabel(estudiante)],
        ["Curso", cursoDetalle.nombre || ""],
        ["Año lectivo", cursoDetalle.anio_lectivo || ""],
        [],
        ["MATERIA", "PERIODOS", "", "", "PROMEDIO ANUAL"],
        ["", "PRIMERO", "SEGUNDO", "TERCERO", ""],
        ...filas,
        [],
        ["ASISTENCIA", "JUSTIFICACIÓN", "INJUSTIFICADO", "TOTAL ASISTENCIA"],
        ["", asistencia.justificadas, asistencia.ausencias, asistencia.totalAsistencia],
      ]);
      ws["A1"].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: DARK_BLUE } } };
      ws["A6"].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: DARK_BLUE } }, alignment: { horizontal: "center" } };
      ws["B6"].s = ws["A6"].s;
      ws["C6"].s = ws["A6"].s;
      ws["D6"].s = ws["A6"].s;
      ws["E6"].s = ws["A6"].s;
      ["A7", "B7", "C7", "D7", "E7"].forEach((cell) => { ws[cell].s = ws["A6"].s; });
      ws["!merges"] = [
        { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } },
        { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
        { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } },
      ];
      ws["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte individual");
      XLSX.writeFile(wb, `reporte_${studentLabel(estudiante).replace(/\s+/g, "_") || "estudiante"}.xlsx`);
    } catch (error) {
      notify("error", error.message || "No se pudo generar el reporte individual");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3><FileSpreadsheet size={18} /> Reportes</h3>
          <p className="panel-sub">{soloLecturaTutor ? "Consulta la previsualización de los reportes del curso" : "Exporta reportes en Excel con el formato académico del curso"}</p>
        </div>
      </div>

      <div className="reportes-box reportes-selector-cards">
        <div role="button" tabIndex="0" className={`reportes-card reportes-card-selectable ${reportType === "individual" ? "active" : ""}`} onClick={() => setReportType("individual")} onKeyDown={(event) => event.key === "Enter" && setReportType("individual")}>
          <h4>Reporte individual</h4>
          <p>Un estudiante, todas sus materias y sus tres periodos.</p>
          {reportType === "individual" && (
            <CustomSelect
              value={estudianteReporteId}
              onChange={(value) => {
                setReportType("individual");
                setEstudianteReporteId(value);
                setReporteIndividualPreview(null);
                previsualizarReporteIndividual(value);
              }}
              options={[...estudiantesCurso]
                .sort((a, b) => studentLabel(a).localeCompare(studentLabel(b), "es"))
                .map((estudiante) => ({
                  value: String(estudiante.id_estudiante),
                  label: studentLabel(estudiante),
                }))}
              placeholder="Selecciona estudiante"
              className="custom-select-white"
              searchable
              searchPlaceholder="Buscar estudiante..."
            />
          )}
        </div>

        <div role="button" tabIndex="0" className={`reportes-card reportes-card-selectable ${reportType === "trimestre" ? "active" : ""}`} onClick={() => setReportType("trimestre")} onKeyDown={(event) => event.key === "Enter" && setReportType("trimestre")}>
          <h4>Reporte por periodo</h4>
          <p>Todos los estudiantes de la materia y un periodo.</p>
          {reportType === "trimestre" && (
            <CustomSelect
              value={periodoId}
              onChange={setPeriodoId}
              options={periodosOrdenados.map((periodo) => ({ value: String(periodo.id_periodo), label: periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}` }))}
              placeholder="Selecciona periodo"
              className="custom-select-white"
            />
          )}
        </div>

        <div role="button" tabIndex="0" className={`reportes-card reportes-card-selectable ${reportType === "anual" ? "active" : ""}`} onClick={() => setReportType("anual")} onKeyDown={(event) => event.key === "Enter" && setReportType("anual")}>
          <h4>Reporte anual</h4>
          <p>Todos los estudiantes y periodos de la materia.</p>
        </div>
      </div>

      <div className="reportes-preview-card">
        <div className="reportes-preview-head">
          <div>
              <h4>Previsualización {reportType === "individual" ? "individual" : reportType === "anual" ? "anual" : "por periodo"}</h4>
              <p>Vista previa del reporte seleccionado antes de exportarlo.</p>
          </div>
          <button
            type="button"
            className="btn-primary btn-inline-icon"
            onClick={reportType === "individual" ? exportarReporteIndividual : reportType === "anual" ? exportarGeneral : exportarTrimestre}
            disabled={soloLecturaTutor || generando || (reportType === "individual" && !estudianteReporteId) || (reportType === "trimestre" && !periodoId)}
          >
            {soloLecturaTutor ? <Eye size={16} /> : <FileSpreadsheet size={16} />}
            {soloLecturaTutor ? "Solo lectura" : generando ? "Generando..." : reportType === "individual" ? "Exportar Excel individual" : reportType === "anual" ? "Exportar Excel anual" : "Exportar Excel del periodo"}
          </button>
        </div>
        {reportType === "individual" && reporteIndividualPreview ? (
          <>
            <div className="individual-report-student-info">
              <p><strong>Nombre:</strong> {studentLabel(reporteIndividualPreview.estudiante)}</p>
              <p><strong>Curso:</strong> {cursoDetalle?.nombre || "-"}</p>
            </div>
            <div className="reportes-preview-table-wrap">
              <table className="reportes-preview-table individual-report-table">
                <thead>
                  <tr>
                    <th rowSpan="2">Materia</th>
                    <th colSpan="3">Periodos</th>
                    <th rowSpan="2">Promedio anual</th>
                  </tr>
                  <tr>
                    <th>Primero</th>
                    <th>Segundo</th>
                    <th>Tercero</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteIndividualPreview.filas.map((fila) => (
                    <tr key={fila[0]}>
                      {fila.map((valor, index) => <td key={`${fila[0]}-${index}`}>{valor === "" ? "-" : valor}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <table className="reportes-preview-table reportes-attendance-table">
              <thead>
                <tr>
                  <th>Asistencia</th>
                  <th>Justificación</th>
                  <th>Injustificado</th>
                  <th>Total asistencia</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td />
                  <td>{reporteIndividualPreview.asistencia.justificadas}</td>
                  <td>{reporteIndividualPreview.asistencia.ausencias}</td>
                  <td>{reporteIndividualPreview.asistencia.totalAsistencia}</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : previewModel ? (
          <PreviewTable model={previewModel} compact={compactPreview} />
        ) : (
          <div className="reportes-preview-empty">No hay datos suficientes para mostrar la previsualización.</div>
        )}
      </div>
    </div>
  );
};

export default TabReportes;
