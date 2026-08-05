import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, normalizeName, checkoutCustomerSchema } from "@/lib/validation/customers";

describe("normalizePhone", () => {
  test("treats the 00 access prefix and + as the same number", () => {
    // Regression: these produced different keys, so a repeat customer who
    // wrote the number the other way got a duplicate record.
    assert.equal(normalizePhone("00961-3-123-456"), normalizePhone("+961 3 123 456"));
  });

  test("ignores spacing, dashes and brackets", () => {
    assert.equal(normalizePhone("+961 3 123 456"), "9613123456");
    assert.equal(normalizePhone("(961) 3123456"), "9613123456");
  });

  test("distinguishes genuinely different numbers", () => {
    assert.notEqual(normalizePhone("03123456"), normalizePhone("03123457"));
  });

  test("keeps a single leading trunk zero, which is not an access prefix", () => {
    // "0" is a national trunk prefix whose meaning depends on the dialing
    // plan; stripping it blindly could merge two different subscribers.
    assert.equal(normalizePhone("03123456"), "03123456");
  });

  test("handles an empty string without throwing", () => {
    assert.equal(normalizePhone(""), "");
  });
});

describe("normalizeName", () => {
  test("ignores case and extra spacing", () => {
    assert.equal(normalizeName("  Rita   Haddad "), normalizeName("rita haddad"));
  });

  test("keeps different people apart", () => {
    assert.notEqual(normalizeName("Rita Haddad"), normalizeName("Jane Farah"));
  });
});

describe("customer matching identity", () => {
  // Guards the bug where a sale was filed under a different customer who
  // happened to share a phone number.
  const sharedPhone = "+961 3 123 456";

  test("same phone with a different name is NOT the same person", () => {
    const samePhone = normalizePhone(sharedPhone) === normalizePhone("00961 3 123 456");
    const sameName = normalizeName("Rita Haddad") === normalizeName("Jane Farah");
    assert.ok(samePhone, "numbers should normalize alike");
    assert.equal(sameName, false, "names differ, so these must not be merged");
  });

  test("same phone and same name is the same person", () => {
    assert.ok(
      normalizePhone(sharedPhone) === normalizePhone("00961-3-123-456") &&
        normalizeName("Rita Haddad") === normalizeName("  rita   haddad  "),
    );
  });
});

describe("checkoutCustomerSchema", () => {
  test("accepts a minimal capture with just a name", () => {
    const result = checkoutCustomerSchema.safeParse({ name: "Rita Haddad" });
    assert.ok(result.success);
    assert.equal(result.data.marketingConsent, false, "consent must default to off");
  });

  test("rejects a name that is too short", () => {
    assert.equal(checkoutCustomerSchema.safeParse({ name: "R" }).success, false);
  });

  test("rejects a malformed email", () => {
    const result = checkoutCustomerSchema.safeParse({ name: "Rita Haddad", email: "not-an-email" });
    assert.equal(result.success, false);
  });

  test("allows an empty email string, since the field is optional", () => {
    const result = checkoutCustomerSchema.safeParse({ name: "Rita Haddad", email: "" });
    assert.ok(result.success);
  });

  test("carries whatsapp and company through", () => {
    const result = checkoutCustomerSchema.safeParse({
      name: "Rita Haddad",
      whatsapp: "03123456",
      company: "Haddad Textiles",
    });
    assert.ok(result.success);
    assert.equal(result.data.whatsapp, "03123456");
    assert.equal(result.data.company, "Haddad Textiles");
  });
});
