import React, { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import CustomSelect from "../../../components/admin/CustomSelect";

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

const getGroupMaxScore = (groupKey) => {
  if (groupKey === "activities") return 7;
  if (groupKey === "projects") return 1;
  if (groupKey === "exams") return 2;
  return 0;
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

        const maxGroupScore = getGroupMaxScore(group.key);
        const weightedContribution = avg === null ? null : (avg / 10) * maxGroupScore;
        if (groupNeedsAverage(group.key)) {
          cellValues.push(avg);
        }
        cellValues.push(weightedContribution);
        contributions.push(weightedContribution);
      });

      const finalScore = contributions.some((value) => value !== null)
        ? contributions.reduce((acc, value) => acc + (value ?? 0), 0)
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
  rows[2][2] = "TRIMESTRES";
  rows[3][2] = "CALIFICACIONES TRIMESTRALES";
  periodNames.forEach((name, index) => {
    rows[4][2 + index] = `${index + 1}T`;
  });
  const sumaCol = 2 + periodResults.length;
  const promCol = 3 + periodResults.length;
  const cualCol = 4 + periodResults.length;
  rows[2][sumaCol] = "SUMA 3 TRIMESTRES";
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
  setCell(sheet, 2, 2, "TRIMESTRES", finalStyles.group);
  setCell(sheet, 3, 2, "CALIFICACIONES TRIMESTRALES", finalStyles.subgroup);
  periodNames.forEach((name, index) => {
    setCell(sheet, 4, 2 + index, name, finalStyles.leaf);
  });
  setCell(sheet, 2, sumaCol, "SUMA 3 TRIMESTRES", finalStyles.final);
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
    const valid = periodScores.filter((v) => v !== null);
    const sum = valid.reduce((acc, val) => acc + val, 0);
    const avg = valid.length ? sum / valid.length : null;
    setCell(sheet, row, sumaCol, sum === 0 && valid.length === 0 ? "-" : sum, finalStyles.center);
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
      { label: "TRIMESTRES", colSpan: periodResults.length, className: "preview-head" },
      { label: "SUMA 3 TRIMESTRES", rowSpan: 3, className: "preview-final-head" },
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
    const valid = periodScores.filter((v) => v !== null);
    const sum = valid.reduce((acc, val) => acc + val, 0);
    const avg = valid.length ? sum / valid.length : null;
    return [
      String(idx + 1),
      studentLabel(est),
      ...periodScores.map((v) => formatPreviewValue(v)),
      formatPreviewValue(sum),
      formatPreviewValue(avg),
      qualitative(avg),
    ];
  });

  return { type: "general", headerRows, bodyRows, totalCols };
};

const PreviewTable = ({ model }) => {
  if (!model) return null;

  return (
    <div className="reportes-preview-wrap">
      <table className="reportes-preview-table">
        <colgroup>
          {Array.from({ length: model.totalCols }).map((_, idx) => (
            <col key={idx} className={idx === 1 ? "preview-col-name" : "preview-col-default"} />
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
  cursoDetalle,
}) => {
  const [periodoId, setPeriodoId] = useState("");
  const [generando, setGenerando] = useState(false);
  const [previewMode, setPreviewMode] = useState("trimestre");

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

  const previewModel = previewMode === "general" ? previewGeneralModel : previewTrimestreModel;

  if (activeTab !== "reportes") return null;

  const exportarTrimestre = () => {
    if (!periodoId) return;
    setGenerando(true);
    try {
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

  const exportarGeneral = () => {
    setGenerando(true);
    try {
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

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3>🧾 Reportes</h3>
          <p className="panel-sub">Exporta reportes en Excel con el formato académico del curso</p>
        </div>
      </div>

      <div className="reportes-box">
        <div className="reportes-card">
          <h4>Reporte por trimestre</h4>
          <p>Genera una hoja Excel con encabezados agrupados y calificaciones por insumo.</p>
          <div style={{ marginBottom: "1rem" }}>
            <CustomSelect
              value={periodoId}
              onChange={setPeriodoId}
              options={periodosOrdenados.map((periodo) => ({
                value: String(periodo.id_periodo),
                label: periodo.nombre_periodo || `Trimestre ${periodo.numero_periodo}`,
              }))}
              placeholder="Selecciona trimestre"
              className="custom-select-white"
            />
          </div>
          <button type="button" className="btn-primary btn-inline-icon" onClick={exportarTrimestre} disabled={generando || !periodoId}>
            <Download size={16} />
            Exportar Excel
          </button>
        </div>

        <div className="reportes-card">
          <h4>Reporte general</h4>
          <p>Exporta todos los trimestres y un consolidado final en un mismo archivo.</p>
          <button type="button" className="btn-success btn-inline-icon" onClick={exportarGeneral} disabled={generando}>
            <FileSpreadsheet size={16} />
            Exportar Excel general
          </button>
        </div>
      </div>

      <div className="reportes-preview-card">
        <div className="reportes-preview-head">
          <div>
            <h4>Previsualización</h4>
            <p>Vista previa de cómo quedará el Excel antes de exportarlo.</p>
          </div>
          <div className="reportes-preview-toggle">
            <button type="button" className={`preview-toggle-btn ${previewMode === "trimestre" ? "active" : ""}`} onClick={() => setPreviewMode("trimestre")}>
              Trimestre
            </button>
            <button type="button" className={`preview-toggle-btn ${previewMode === "general" ? "active" : ""}`} onClick={() => setPreviewMode("general")}>
              General
            </button>
          </div>
        </div>
        {previewModel ? (
          <PreviewTable model={previewModel} />
        ) : (
          <div className="reportes-preview-empty">No hay datos suficientes para mostrar la previsualización.</div>
        )}
      </div>
    </div>
  );
};

export default TabReportes;
