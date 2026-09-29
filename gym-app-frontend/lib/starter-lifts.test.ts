import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_REPS,
  MAX_WEIGHT_KG,
  parseStarterLifts,
  pickStarterExercises,
} from "./starter-lifts.ts";

type Ex = Parameters<typeof pickStarterExercises>[0][number];

const ex = (
  id: string,
  name: string,
  type: Ex["type"],
  over: Partial<Ex> = {},
): Ex => ({
  id,
  name,
  type,
  muscle_group: "push",
  weight_coefficient: 1.3,
  weekly_eligible: false,
  ...over,
});

const SQUAT = ex("squat", "Back Squat", "weighted", { weekly_eligible: true });
const BENCH = ex("bench", "Bench Press", "weighted", { weekly_eligible: true });
const PUSHUP = ex("pushup", "Push-up", "bodyweight");
const CURL = ex("curl", "Bicep Curl", "weighted");
const ALL = [SQUAT, BENCH, PUSHUP, CURL];

/** Minimal FormData stand-in: fields is a flat name -> value map; exercise_id can repeat. */
function form(fields: Record<string, string>, exerciseIds: string[]) {
  return {
    get: (name: string) => (name in fields ? fields[name] : null),
    getAll: (name: string) => (name === "exercise_id" ? exerciseIds : []),
  };
}

const parse = (fields: Record<string, string>, ids = ["squat", "bench", "pushup"]) =>
  parseStarterLifts(form(fields, ids), "gym-1", ALL);

describe("pickStarterExercises", () => {
  it("takes the big three from weekly_eligible and bodyweight movements by name", () => {
    const picked = pickStarterExercises(ALL);
    assert.deepEqual(picked.bigThree.map((e) => e.id), ["squat", "bench"]);
    assert.deepEqual(picked.bodyweight.map((e) => e.id), ["pushup"]);
  });

  it("skips starter bodyweight names that aren't in the database", () => {
    assert.deepEqual(pickStarterExercises([SQUAT]).bodyweight, []);
  });

  it("does not treat a weighted exercise that shares a bodyweight name as bodyweight", () => {
    const impostor = ex("x", "Push-up", "weighted");
    assert.deepEqual(pickStarterExercises([impostor]).bodyweight, []);
  });
});

describe("parseStarterLifts", () => {
  it("builds items for filled rows and skips blank ones", () => {
    const result = parse({ weight_squat: "100", reps_squat: "5", rid_squat: "r1" });
    assert.ok(result.ok);
    assert.deepEqual(result.items, [
      { gym_id: "gym-1", exercise_id: "squat", weight_kg: 100, reps: 5, client_request_id: "r1" },
    ]);
  });

  it("sends bodyweight rows with weight_kg 0 and the optional added weight", () => {
    const result = parse({ reps_pushup: "20", added_pushup: "10", rid_pushup: "r2" });
    assert.ok(result.ok);
    assert.deepEqual(result.items[0], {
      gym_id: "gym-1", exercise_id: "pushup", weight_kg: 0, reps: 20, added_weight_kg: 10, client_request_id: "r2",
    });
  });

  it("omits added_weight_kg entirely for a plain bodyweight set", () => {
    const result = parse({ reps_pushup: "20" });
    assert.ok(result.ok);
    assert.equal("added_weight_kg" in result.items[0], false);
  });

  it("accepts decimal weights", () => {
    const result = parse({ weight_bench: "62.5", reps_bench: "8" });
    assert.ok(result.ok);
    assert.equal(result.items[0].weight_kg, 62.5);
  });

  it("errors when nothing is filled in", () => {
    const result = parse({});
    assert.ok(!result.ok);
    assert.match(result.error, /at least one lift/i);
  });

  it("errors on a half-filled row, naming the exercise, instead of dropping it", () => {
    const noReps = parse({ weight_squat: "100" });
    assert.ok(!noReps.ok);
    assert.match(noReps.error, /Back Squat/);

    const noWeight = parse({ reps_squat: "5" });
    assert.ok(!noWeight.ok);
    assert.match(noWeight.error, /Back Squat/);
  });

  it("errors on added weight with no reps", () => {
    const result = parse({ added_pushup: "10" });
    assert.ok(!result.ok);
    assert.match(result.error, /Push-up/);
  });

  it("rejects a bad row even when another row is valid", () => {
    const result = parse({ weight_squat: "100", reps_squat: "5", weight_bench: "60" });
    assert.ok(!result.ok);
    assert.match(result.error, /Bench Press/);
  });

  for (const bad of ["0", "-5", "abc", "1e3", "", "5.5", " "]) {
    it(`rejects reps ${JSON.stringify(bad)}`, () => {
      const result = parse({ weight_squat: "100", reps_squat: bad });
      assert.ok(!result.ok);
    });
  }

  for (const bad of ["0", "-20", "abc", "1e3", "0.0"]) {
    it(`rejects weight ${JSON.stringify(bad)} for a weighted lift`, () => {
      const result = parse({ weight_squat: bad, reps_squat: "5" });
      assert.ok(!result.ok);
    });
  }

  it("enforces the sanity ceilings on weight, reps and added weight", () => {
    assert.ok(parse({ weight_squat: String(MAX_WEIGHT_KG), reps_squat: "1" }).ok);
    assert.ok(!parse({ weight_squat: String(MAX_WEIGHT_KG + 1), reps_squat: "1" }).ok);
    assert.ok(parse({ weight_squat: "100", reps_squat: String(MAX_REPS) }).ok);
    assert.ok(!parse({ weight_squat: "100", reps_squat: String(MAX_REPS + 1) }).ok);
    assert.ok(!parse({ reps_pushup: "10", added_pushup: String(MAX_WEIGHT_KG + 1) }).ok);
  });

  it("ignores exercise ids that aren't real exercises", () => {
    const result = parse({ weight_ghost: "100", reps_ghost: "5" }, ["ghost"]);
    assert.ok(!result.ok);
    assert.match(result.error, /at least one lift/i);
  });

  it("does not submit the same exercise twice if its id is repeated", () => {
    const result = parse({ weight_squat: "100", reps_squat: "5" }, ["squat", "squat"]);
    assert.ok(result.ok);
    assert.equal(result.items.length, 1);
  });

  it("generates an idempotency key when the form didn't carry one", () => {
    const result = parse({ weight_squat: "100", reps_squat: "5" });
    assert.ok(result.ok);
    assert.match(result.items[0].client_request_id, /^[0-9a-f-]{36}$/);
  });

  it("does not let a weighted lift carry an added weight", () => {
    const result = parse({ weight_squat: "100", reps_squat: "5", added_squat: "20" });
    assert.ok(result.ok);
    assert.equal("added_weight_kg" in result.items[0], false);
  });
});
