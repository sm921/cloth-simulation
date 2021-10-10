import { Matrix } from "../math/matrix";
import { Vector } from "../math/vector";

export class Kinetic {
  /**
   * 1/2h^2 * (p1 - p0 - hv)^t M (p1 - p0 - hv)
   * (= 1/2mv^2 with inertia)
   * @param newPositions
   * @param currentPositions
   * @param velocity
   * @param timestep
   * @param mass
   */
  static energyGain(
    newPositions: Vector,
    currentPositions: Vector,
    velocity: Vector,
    timestep: number,
    mass: Vector
  ) {
    const diff = newPositions
      .subtractNew(currentPositions)
      .subtract(velocity.multiplyScalarNew(timestep));
    return (
      (0.5 / timestep / timestep) * diff.multiplyElementwise(mass).dot(diff)
    );
  }

  /**
   * 1/h^2 M (p1 - p0 - hv)
   * @param newPositions
   * @param currentPositions
   * @param velocity
   * @param timestep
   * @param mass
   */
  static gradientEnergyGain(
    newPositions: Vector,
    currentPositions: Vector,
    velocity: Vector,
    timestep: number,
    mass: Vector
  ): Vector {
    return newPositions
      .subtractNew(currentPositions)
      .subtract(velocity.multiplyScalarNew(timestep))
      .multiplyElementwise(mass)
      .multiplyScalar(1 / timestep / timestep);
  }

  /**
   * 1/h^2 M
   * @param timestep
   * @param mass
   * @returns
   */
  static hessianEnergyGain(timestep: number, mass: Vector): Matrix {
    const hessian = Matrix.zero(mass.height, mass.height);
    const invTimestepSquared = 1 / timestep / timestep;
    for (let i = 0; i < hessian.height; i++)
      hessian.set(i, i, mass._(i) * invTimestepSquared);
    return hessian;
  }
}
