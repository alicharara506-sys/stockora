import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseDayRange, startOfDay, endOfDay } from "@/lib/reports/date-range";

describe("parseDayRange", () => {
  test("covers the whole final day, not just its first instant", () => {
    // Regression: a bare "YYYY-MM-DD" parses to midnight, so using it as the
    // upper bound excluded everything sold that day — on a payroll period
    // that silently underpaid every sale on the last day.
    const range = parseDayRange("2026-08-01", "2026-08-05");
    assert.ok(range);
    assert.equal(range.to.getHours(), 23);
    assert.equal(range.to.getMinutes(), 59);
    assert.equal(range.to.getSeconds(), 59);

    const lateSale = new Date("2026-08-05T15:40:00");
    assert.ok(lateSale <= range.to, "a sale late on the final day must fall inside the range");
  });

  test("starts at the first instant of the opening day", () => {
    const range = parseDayRange("2026-08-01", "2026-08-05");
    assert.ok(range);
    assert.equal(range.from.getHours(), 0);
    const earlySale = new Date("2026-08-01T00:00:01");
    assert.ok(earlySale >= range.from);
  });

  test("a single-day period still spans that full day", () => {
    const range = parseDayRange("2026-08-05", "2026-08-05");
    assert.ok(range);
    const midday = new Date("2026-08-05T12:00:00");
    assert.ok(midday >= range.from && midday <= range.to);
  });

  test("rejects a reversed range", () => {
    assert.equal(parseDayRange("2026-08-05", "2026-08-01"), null);
  });

  test("rejects unparseable input", () => {
    assert.equal(parseDayRange("not-a-date", "2026-08-05"), null);
    assert.equal(parseDayRange("2026-08-01", ""), null);
  });
});

describe("startOfDay / endOfDay", () => {
  test("bracket the same calendar day", () => {
    const d = new Date("2026-08-05T13:45:12");
    assert.equal(startOfDay(d).getDate(), 5);
    assert.equal(endOfDay(d).getDate(), 5);
    assert.ok(startOfDay(d) < endOfDay(d));
  });

  test("do not mutate the input", () => {
    const d = new Date("2026-08-05T13:45:12");
    const snapshot = d.getTime();
    startOfDay(d);
    endOfDay(d);
    assert.equal(d.getTime(), snapshot);
  });
});
