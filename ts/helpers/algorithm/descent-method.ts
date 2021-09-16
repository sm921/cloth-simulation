/// <reference path="line-search.ts" />

/**
 * x1 = x0 + a * D * pk
 *  - x1 is updated value
 *  - x0 is current value
 *  - a is stepsize
 *  - D is modification matrix
 *  - pk is direction vector
 */
namespace DESCENT_METHOD {
  /**
   * update x by x + stepsize * H^-1 (- grad f)
   *
   * @param x
   * @param fx
   * @param gradFx
   * @param hessianOfFx
   * @param triesOrthogonalDirections saddle point guard (set non-zero value ONLY IF x converges to saddle point)
   * @returns
   */
  export function updateByNewtonRaphson(
    x: MATH_MATRIX.Vector,
    fx: (x: MATH_MATRIX.Vector) => number,
    gradFx: (x: MATH_MATRIX.Vector) => MATH_MATRIX.Vector,
    hessianOfFx: (x: MATH_MATRIX.Vector) => MATH_MATRIX.Matrix,
    triesOrthogonalDirections = 0
  ): void {
    const _H = hessianOfFx(x);
    const H = MATH_MATRIX.hessianModification(_H);
    let grad = gradFx(x)
      .multiply(-1)
      /* ############ Saddle Point Guard ##########
       * since if elements are zero, then H^'1 grad may have zero element (in cases like H is diagonal)
       * which makes update direction orthogonal to some descent directions corresponding to zero element.
       * to make it NOT orthogonal to such directions, simply replace zero elements of gradient with 1.*/
      .elements.map((el) =>
        triesOrthogonalDirections !== 0 && el === 0
          ? triesOrthogonalDirections
          : el
      ); // avoid converges to saddle point
    const _pk = MATH_MATRIX.Solver.cholesky(H, grad, true);
    if (_pk === null) return;
    const pk = new MATH_MATRIX.Vector(_pk);
    if (pk.norm() === 0) return;
    const stepsize = LINE_SEARCH.findStepsizeByWolfConditions(
      (stepsize) => fx(x.addNew(pk.multiplyNew(stepsize))),
      (stepsize) => gradFx(x.addNew(pk.multiplyNew(stepsize))).dot(pk),
      1e3,
      undefined,
      undefined,
      1
    );
    x.add(pk.multiply(stepsize));
  }

  /**
   * x1 = x0 + a * H^'1 * (-grad f(x0))
   *  H is hessian of f(x) at x = x0
   * @param x current positions in 3d space
   * @param getHessian hessian of f(x)
   * @param getGradient gradient of f(x)
   * @param objectiveFuncionOfStepsize g(stepsize) = f(x+stepsize*update_direction)
   * @param gradientOfObjectiveFunctionOfStepsize grad g(stepsize) = grad f(x+stepsize*update_direction)
   * @param tolerance
   * @returns
   */
  export function _updateByNewton(
    x: MATH_MATRIX.Vector[],
    getHessian: (x: MATH_MATRIX.Vector[]) => MATH_MATRIX.Matrix,
    getGradient: (x: MATH_MATRIX.Vector[]) => MATH_MATRIX.Vector,
    isFixed: (index: number) => boolean,
    objectiveFuncionOfStepsize: (
      stepsize: number,
      descentDirections: MATH_MATRIX.Vector[]
    ) => number,
    gradientOfObjectiveFunctionOfStepsize: (
      stepsize: number,
      descentDirections: MATH_MATRIX.Vector[]
    ) => MATH_MATRIX.Vector,
    tolerance = 1e-6
  ): void {
    const [descentDirection, norm] = _findDescentDirection(
      x,
      getHessian(x),
      getGradient(x),
      isFixed,
      tolerance
    );
    if (descentDirection === null || norm === null) return;
    const [stepsize, descentDirectionPerPosition] = _findStepsize(
      descentDirection,
      objectiveFuncionOfStepsize,
      gradientOfObjectiveFunctionOfStepsize
    );
    if (norm * stepsize < tolerance) return;
    x.forEach((x_i, i) => {
      if (!isFixed(i))
        x_i.add(descentDirectionPerPosition[i].multiply(stepsize));
    });
  }

  function _findDescentDirection(
    x: MATH_MATRIX.Vector[],
    hessian: MATH_MATRIX.Matrix,
    gradient: MATH_MATRIX.Matrix,
    isFixed: (index: number) => boolean,
    tolerance = 1e-6
  ): [MATH_MATRIX.Vector, number] | [null, null] {
    let descentDirection = MATH_MATRIX.Solver.cholesky(
      hessian,
      gradient.multiplyNew(-1).elements,
      true
    );
    if (descentDirection === null) return [null, null];
    for (let i = 0; i < x.length; i++)
      if (isFixed(i))
        for (let j = 0; j < 3; j++) descentDirection[3 * i + j] = 0;
    const descentDirectionsFlat = new MATH_MATRIX.Vector(descentDirection);
    const norm = descentDirectionsFlat.norm();
    if (norm < tolerance) return [null, null];
    return [descentDirectionsFlat, norm];
  }

  function _findStepsize(
    descentDirections: MATH_MATRIX.Vector,
    objectiveFunction: (
      stepsize: number,
      descentDirections: MATH_MATRIX.Vector[]
    ) => number,
    gradientOfObjectiveFunction: (
      stepsize: number,
      descentDirections: MATH_MATRIX.Vector[]
    ) => MATH_MATRIX.Vector
  ): [number, MATH_MATRIX.Vector[]] {
    const descentDirectionPerPosition = Array(descentDirections.height);
    for (let i = 0; i < descentDirections.height / 3; i++)
      descentDirectionPerPosition[i] = new MATH_MATRIX.Vector([
        descentDirections._(i * 3),
        descentDirections._(i * 3 + 1),
        descentDirections._(i * 3 + 2),
      ]);
    return [
      LINE_SEARCH.findStepsizeByWolfConditions(
        (stepsize) => objectiveFunction(stepsize, descentDirectionPerPosition),
        (stepsize) =>
          gradientOfObjectiveFunction(
            stepsize,
            descentDirectionPerPosition
          ).dot(descentDirections), // directional derivative
        1e3,
        0.1,
        0.9,
        10
      ),
      descentDirectionPerPosition,
    ];
  }
}