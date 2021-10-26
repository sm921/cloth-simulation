import { Vector } from "../math/vector";
import { Kinetic } from "./kinetic";

const p1 = new Vector([0, 0, 0]);
const p2 = new Vector([5, 0, 0]);
const mass3 = new Vector([1, 1, 1]);
const velocity = new Vector([0, 0, 0]);
const timestep = 0.1;

describe("kinetic", () => {
  test("energy", () => {
    expect(Kinetic.energyGain(p1, p1, velocity, timestep, mass3)).toEqual(0);
  });
  test("gradient", () => {
    expect(
      Kinetic.gradientEnergyGain(p1, p1, velocity, timestep, mass3).elements
    ).toEqual(new Float32Array([0, 0, 0]));
    expect(
      Kinetic.gradientEnergyGain(p1, p2, velocity, timestep, mass3).elements
    ).toEqual(new Float32Array([-500, 0, 0]));
    expect(
      Kinetic.gradientEnergyGain(
        p1,
        p2,
        new Vector([-30, 0, -10]),
        timestep,
        mass3
      ).elements
    ).toEqual(new Float32Array([-200, 0, 100]));
  });
  test("hessian", () => {
    const mh2 = mass3.multiplyScalarNew(1 / timestep / timestep);
    expect(Kinetic.hessianEnergyGain(timestep, mass3).elements).toEqual(
      new Float32Array([mh2._(0), 0, 0, 0, mh2._(1), 0, 0, 0, mh2._(2)])
    );
  });
});
