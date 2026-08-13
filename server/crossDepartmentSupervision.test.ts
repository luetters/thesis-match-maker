import { describe, expect, it } from "vitest";
import { buildCrossDepartmentSupervisionOverview, buildCrossDepartmentSupervisionTimeSeries } from "../shared/crossDepartmentSupervision";

describe("fachbereichsübergreifende Betreuungen", () => {
  const records = [
    { requestId: 1, studentDepartment: "FB3", examinerDepartment: "FB3", studentName: "A", examinerName: "P1", title: "Intern", status: "MATCHED", targetSemester: "WS2026" },
    { requestId: 2, studentDepartment: "FB3", examinerDepartment: "FB2", studentName: "B", examinerName: "P2", title: "Überkreuz", status: "MATCHED", targetSemester: "WS2026" },
    { requestId: 3, studentDepartment: "FB1", examinerDepartment: "FB4", studentName: "C", examinerName: "P3", title: "Überkreuz 2", status: "COMPLETED", targetSemester: "SS2027" },
  ];

  it("trennt hausinterne und fachbereichsübergreifende Fälle in der Kreuztabelle", () => {
    const overview = buildCrossDepartmentSupervisionOverview(records);
    expect(overview.total).toBe(3);
    expect(overview.internalCount).toBe(1);
    expect(overview.crossDepartmentCount).toBe(2);
    expect(overview.matrix.find((row) => row.studentDepartment === "FB3")?.values.find((cell) => cell.examinerDepartment === "FB2")?.count).toBe(1);
  });

  it("beschränkt Fachbereichsverwaltungen auf Fälle aus dem eigenen Herkunftsfachbereich", () => {
    const overview = buildCrossDepartmentSupervisionOverview(records, "FB3");
    expect(overview.total).toBe(2);
    expect(overview.crossDepartmentCount).toBe(1);
    expect(overview.cases[0]?.requestId).toBe(2);
  });

  it("grenzt Kreuztabelle und Volumen nach Semester ein", () => {
    const overview = buildCrossDepartmentSupervisionOverview(records, null, "WS2026");
    expect(overview.availableSemesters).toEqual(["WS2026", "SS2027"]);
    expect(overview.selectedSemester).toBe("WS2026");
    expect(overview.total).toBe(2);
    expect(overview.workloadByExaminerDepartment.find((item) => item.department === "FB3")).toMatchObject({ total: 1, internal: 1, incoming: 0 });
    expect(overview.workloadByExaminerDepartment.find((item) => item.department === "FB2")).toMatchObject({ total: 1, internal: 0, incoming: 1 });
  });

  it("bereitet die Volumen je Fachbereich chronologisch für die Zeitreihe auf", () => {
    const series = buildCrossDepartmentSupervisionTimeSeries(records);

    expect(series.semesters).toEqual(["WS2026", "SS2027"]);
    expect(series.points.map((point) => point.semester)).toEqual(["WS2026", "SS2027"]);
    expect(series.points[0]?.workloadByExaminerDepartment.find((item) => item.department === "FB3")).toMatchObject({ total: 1, internal: 1, incoming: 0 });
    expect(series.points[0]?.workloadByExaminerDepartment.find((item) => item.department === "FB2")).toMatchObject({ total: 1, internal: 0, incoming: 1 });
    expect(series.points[1]?.workloadByExaminerDepartment.find((item) => item.department === "FB4")).toMatchObject({ total: 1, internal: 0, incoming: 1 });
  });
});
