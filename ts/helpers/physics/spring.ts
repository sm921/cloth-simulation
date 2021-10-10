import { Matrix } from "../math/matrix";
import { Vector } from "../math/vector";

export class Spring {
  /**
   * k/2 * (|qi-pi| - r)^2
   * @param point1
   * @param point2
   * @param restlength
   * @param springConstant
   * @returns
   */
  static energy(
    point1: Vector,
    point2: Vector,
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
  static energyGradient(
    point1: Vector,
    point2: Vector,
    restlength: number,
    springConstant: number
  ): Vector {
    const vectorFromP2ToP1 = point1.subtractNew(point2);
    return vectorFromP2ToP1.multiplyScalar(
      springConstant * (1 - restlength / vectorFromP2ToP1.norm())
    );
  }

  /**
   * -k ( I - r/|qi-pi| ( I - (qi-pi)(qi-pi)^t / |qi-pi|^2 ) )
   * @param point1
   * @param point2
   * @param restlength
   * @param springConstant
   * @returns
   */
  static energyHessian(
    point1: Vector,
    point2: Vector,
    restlength: number,
    springConstant: number
  ): Matrix {
    const identity = Matrix.identity(3);
    const vectorFromP2ToP1 = point1.subtractNew(point2);
    const squaredNorm = vectorFromP2ToP1.squaredNorm();
    return identity
      .subtract(
        identity
          .subtractNew(
            vectorFromP2ToP1
              .outerProduct(vectorFromP2ToP1.transposeNew())
              .multiplyScalar(1 / squaredNorm)
          )
          .multiplyScalar(restlength / Math.sqrt(squaredNorm))
      )
      .multiplyScalar(-springConstant);
  }
}
