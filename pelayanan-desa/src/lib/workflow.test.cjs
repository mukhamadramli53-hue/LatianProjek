require("ts-node").register({ compilerOptions: { module: "CommonJS" } });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { canTransition, getAllowedTransitions } = require("./workflow.ts");

describe("application workflow authorization", () => {
  it("allows the defined happy path only for the owning role", () => {
    const path = [
      ["DIAJUKAN", "DIVERIFIKASI", "STAF"],
      ["DIVERIFIKASI", "DIPROSES", "STAF"],
      ["DIPROSES", "MENUNGGU_APPROVAL", "STAF"],
      ["MENUNGGU_APPROVAL", "DISETUJUI", "KEPALA_DESA"],
      ["DISETUJUI", "SELESAI", "STAF"],
    ];

    for (const [from, to, role] of path) {
      assert.equal(canTransition(role, from, to), true);
      for (const otherRole of ["WARGA", "STAF", "SUPERVISOR", "KEPALA_DESA"]) {
        if (otherRole !== role) assert.equal(canTransition(otherRole, from, to), false);
      }
    }
  });

  it("allows repair requests and warga resubmission, but no warga status edit", () => {
    assert.equal(canTransition("STAF", "DIAJUKAN", "PERLU_PERBAIKAN"), true);
    assert.equal(canTransition("STAF", "DIPROSES", "PERLU_PERBAIKAN"), true);
    assert.equal(canTransition("KEPALA_DESA", "MENUNGGU_APPROVAL", "PERLU_PERBAIKAN"), true);
    assert.equal(canTransition("WARGA", "PERLU_PERBAIKAN", "DIAJUKAN"), true);
    assert.equal(canTransition("WARGA", "DIAJUKAN", "DIPROSES"), false);
  });

  it("exposes only transitions allowed from the current state", () => {
    assert.deepEqual(getAllowedTransitions("STAF", "DIAJUKAN"), [
      "DIVERIFIKASI",
      "PERLU_PERBAIKAN",
    ]);
    assert.deepEqual(getAllowedTransitions("WARGA", "DIAJUKAN"), []);
  });
});