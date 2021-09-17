/// <reference path="../math/matrix.ts" />

namespace PHYSICS_KINETIC {
  /**
   * 1/2h^2 * (p1 - p0 - hv)^t M (p1 - p0 - hv)
   * (= 1/2mv^2 with inertia)
   * @param newPositions
   * @param currentPositions
   * @param velocity
   * @param timestep
   * @param mass
   */
  export function energyGain(
    newPositions: MATH_MATRIX.Vector,
    currentPositions: MATH_MATRIX.Vector,
    velocity: MATH_MATRIX.Vector,
    timestep: number,
    mass: MATH_MATRIX.Vector
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
  export function gradientEnergyGain(
    newPositions: MATH_MATRIX.Vector,
    currentPositions: MATH_MATRIX.Vector,
    velocity: MATH_MATRIX.Vector,
    timestep: number,
    mass: MATH_MATRIX.Vector
  ): MATH_MATRIX.Vector {
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
  export function hessianEnergyGain(
    timestep: number,
    mass: MATH_MATRIX.Vector
  ): MATH_MATRIX.Matrix {
    const hessian = MATH_MATRIX.Matrix.zero(mass.height, mass.height);
    const invTimestepSquared = 1 / timestep / timestep;
    for (let i = 0; i < hessian.height; i++)
      hessian.set(i, i, mass._(i) * invTimestepSquared);
    return hessian;
  }
}
