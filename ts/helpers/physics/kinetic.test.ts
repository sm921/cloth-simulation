/// <reference path="kinetic.ts" />
/// <reference path="../math/math.ts" />
const p1 = new MATH.Vector([0, 0, 0]);
const p2 = new MATH.Vector([5, 0, 0]);
const mass3 = new MATH.Vector([1, 1, 1]);
const velocity = new MATH.Vector([0, 0, 0]);
const timestep = 0.1;

describe("kinetic", () => {
  test("energy", () => {
    expect(
      PHYSICS_KINETIC.energyGain(p1, p1, velocity, timestep, mass3)
    ).toEqual(0);
  });
  test("gradient", () => {
    expect(
      PHYSICS_KINETIC.gradientEnergyGain(p1, p1, velocity, timestep, mass3)
        .elements
    ).toEqual(new Float32Array([0, 0, 0]));
    expect(
      PHYSICS_KINETIC.gradientEnergyGain(p1, p2, velocity, timestep, mass3)
        .elements
    ).toEqual(new Float32Array([-500, 0, 0]));
    expect(
      PHYSICS_KINETIC.gradientEnergyGain(
        p1,
        p2,
        new MATH.Vector([-30, 0, -10]),
        timestep,
        mass3
      ).elements
    ).toEqual(new Float32Array([-200, 0, 100]));
  });
  test("hessian", () => {
    const mh2 = mass3.multiplyScalarNew(1 / timestep / timestep);
    expect(PHYSICS_KINETIC.hessianEnergyGain(timestep, mass3).elements).toEqual(
      new Float32Array([mh2._(0), 0, 0, 0, mh2._(1), 0, 0, 0, mh2._(2)])
    );
  });
});
