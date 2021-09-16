/// <reference path="../math/matrix.ts" />

namespace PHYSICS_SPRING {
  /**
   * k/2 * (|qi-pi| - r)^2
   * @param point1
   * @param point2
   * @param restlength
   * @param springConstant
   * @returns
   */
  export function energy(
    point1: MATH_MATRIX.Vector,
    point2: MATH_MATRIX.Vector,
    restlength: number,
    springConstant: number
  ): number {
    const diff = point1.subtractNew(point2).norm() - restlength;
    return 0.5 * springConstant * diff * diff;
  }

  /**
   * k(1 - r/|qi-pi|) (qi-pi)
   * @param point1
   * @param point2
   * @param restlength
   * @param springConstant
   * @returns
   */
  export function energyGradient(
    point1: MATH_MATRIX.Vector,
    point2: MATH_MATRIX.Vector,
    restlength: number,
    springConstant: number
  ): MATH_MATRIX.Vector {
    const vectorFromP2ToP1 = point1.subtractNew(point2);
    return vectorFromP2ToP1.multiply(
      springConstant * (1 - restlength / vectorFromP2ToP1.norm())
    );
  }

  /**
   * k ( I - r/|qi-pi| ( I - (qi-pi)(qi-pi)^t / |qi-pi|^2 ) )
   * @param point1
   * @param point2
   * @param restlength
   * @param springConstant
   * @returns
   */
  export function energyHessian(
    point1: MATH_MATRIX.Vector,
    point2: MATH_MATRIX.Vector,
    restlength: number,
    springConstant: number
  ): MATH_MATRIX.Matrix {
    const identity = MATH_MATRIX.Matrix.identity(3);
    const vectorFromP2ToP1 = point1.subtractNew(point2);
    const squaredNorm = vectorFromP2ToP1.squaredNorm();
    return identity
      .subtract(
        identity
          .subtractNew(
            vectorFromP2ToP1
              .multiply(vectorFromP2ToP1.transposeNew())
              .multiply(1 / squaredNorm)
          )
          .multiply(restlength / Math.sqrt(squaredNorm))
      )
      .multiply(springConstant);
  }
}
