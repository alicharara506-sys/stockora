import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateLineTax, calculateCartTax, type TaxRule } from "@/lib/tax/calculate";
import { allocateCents, toCents, toMajor } from "@/lib/money";

const vat11: TaxRule = { id: "t1", name: "VAT", rate: 11, isCompound: false, treatment: "STANDARD" };
const gst10: TaxRule = { id: "t2", name: "GST", rate: 10, isCompound: false, treatment: "STANDARD" };
const pst5Compound: TaxRule = { id: "t3", name: "PST", rate: 5, isCompound: true, treatment: "STANDARD" };

describe("calculateLineTax", () => {
  test("no rules leaves the amount untouched (tax disabled)", () => {
    const result = calculateLineTax(100, [], false);
    assert.equal(result.net, 100);
    assert.equal(result.tax, 0);
    assert.equal(result.gross, 100);
    assert.deepEqual(result.breakdown, []);
  });

  test("exclusive: tax is added on top", () => {
    const result = calculateLineTax(100, [vat11], false);
    assert.equal(result.net, 100);
    assert.equal(result.tax, 11);
    assert.equal(result.gross, 111);
  });

  test("inclusive: tax is extracted from the price", () => {
    const result = calculateLineTax(111, [vat11], true);
    assert.equal(result.net, 100);
    assert.equal(result.tax, 11);
    assert.equal(result.gross, 111);
  });

  test("inclusive on a round tag price rounds to the cent", () => {
    // $100 tag with 11% VAT baked in: net 90.09, tax 9.91.
    const result = calculateLineTax(100, [vat11], true);
    assert.equal(result.net, 90.09);
    assert.equal(result.tax, 9.91);
    assert.equal(result.gross, 100);
  });

  test("two simple taxes both apply to the net", () => {
    const result = calculateLineTax(100, [gst10, { ...vat11, rate: 5 }], false);
    assert.equal(result.tax, 15);
    assert.equal(result.gross, 115);
  });

  test("compound tax stacks on net plus preceding tax", () => {
    // GST 10% on 100 = 10. PST 5% compound on (100 + 10) = 5.50.
    const result = calculateLineTax(100, [gst10, pst5Compound], false);
    assert.equal(result.gross, 115.5);
    const [gst, pst] = result.breakdown;
    assert.equal(gst.amount, 10);
    assert.equal(pst.amount, 5.5);
  });

  test("compound ordering is independent of input order", () => {
    const a = calculateLineTax(100, [gst10, pst5Compound], false);
    const b = calculateLineTax(100, [pst5Compound, gst10], false);
    assert.equal(a.gross, b.gross);
  });

  test("inclusive compound reverses back to the same net", () => {
    const result = calculateLineTax(115.5, [gst10, pst5Compound], true);
    assert.equal(result.net, 100);
    assert.equal(result.gross, 115.5);
  });

  for (const treatment of ["ZERO_RATED", "EXEMPT", "REVERSE_CHARGE"] as const) {
    test(`${treatment} charges nothing but stays in the breakdown`, () => {
      const rule: TaxRule = { ...vat11, treatment };
      const result = calculateLineTax(100, [rule], false);
      assert.equal(result.tax, 0);
      assert.equal(result.gross, 100);
      assert.equal(result.breakdown.length, 1, "must still be disclosed on the invoice");
      assert.equal(result.breakdown[0].amount, 0);
      assert.equal(result.breakdown[0].treatment, treatment);
    });
  }

  test("net + tax always reconciles to gross across awkward amounts", () => {
    for (const amount of [0.01, 0.05, 3.33, 9.99, 19.95, 33.33, 66.67, 99.99, 1234.56]) {
      for (const inclusive of [true, false]) {
        const result = calculateLineTax(amount, [vat11], inclusive);
        assert.equal(
          toCents(result.net) + toCents(result.tax),
          toCents(result.gross),
          `net + tax !== gross for ${amount} (inclusive=${inclusive})`,
        );
      }
    }
  });

  test("zero amount yields zero tax", () => {
    const result = calculateLineTax(0, [vat11], false);
    assert.equal(result.net, 0);
    assert.equal(result.tax, 0);
    assert.equal(result.gross, 0);
  });
});

describe("calculateCartTax", () => {
  test("totals sum the lines and group tax by rule", () => {
    const result = calculateCartTax(
      [
        { key: "a", unitPrice: 50, quantity: 2, rules: [vat11] },
        { key: "b", unitPrice: 25, quantity: 1, rules: [vat11] },
      ],
      false,
    );
    assert.equal(result.subtotal, 125);
    assert.equal(result.taxTotal, 13.75);
    assert.equal(result.total, 138.75);
    assert.equal(result.summary.length, 1);
    assert.equal(result.summary[0].amount, 13.75);
  });

  test("line discount reduces the taxable base", () => {
    const result = calculateCartTax(
      [{ key: "a", unitPrice: 100, quantity: 1, discountAmount: 20, rules: [vat11] }],
      false,
    );
    assert.equal(result.subtotal, 80);
    assert.equal(result.taxTotal, 8.8);
  });

  test("mixed treatments only charge the standard-rated line", () => {
    const result = calculateCartTax(
      [
        { key: "taxed", unitPrice: 100, quantity: 1, rules: [vat11] },
        { key: "exempt", unitPrice: 100, quantity: 1, rules: [{ ...vat11, id: "t9", treatment: "EXEMPT" }] },
      ],
      false,
    );
    assert.equal(result.subtotal, 200);
    assert.equal(result.taxTotal, 11);
    assert.equal(result.total, 211);
  });

  test("an empty cart is zero, not NaN", () => {
    const result = calculateCartTax([], false);
    assert.equal(result.subtotal, 0);
    assert.equal(result.taxTotal, 0);
    assert.equal(result.total, 0);
  });
});

describe("money", () => {
  test("toCents avoids float drift", () => {
    assert.equal(toCents(0.1 + 0.2), 30);
    assert.equal(toCents(19.99), 1999);
    assert.equal(toCents(1.005), 101);
  });

  test("toMajor round-trips", () => {
    assert.equal(toMajor(toCents(1234.56)), 1234.56);
  });

  test("allocateCents distributes without losing or inventing a cent", () => {
    for (const [total, weights] of [
      [100, [1, 1, 1]],
      [1000, [3, 5, 2]],
      [1, [1, 1]],
      [999, [7, 11, 13]],
    ] as [number, number[]][]) {
      const parts = allocateCents(total, weights);
      assert.equal(
        parts.reduce((sum, p) => sum + p, 0),
        total,
        `allocation of ${total} across ${weights} must sum exactly`,
      );
    }
  });

  test("allocateCents handles zero weights safely", () => {
    assert.deepEqual(allocateCents(100, [0, 0]), [0, 0]);
  });
});
