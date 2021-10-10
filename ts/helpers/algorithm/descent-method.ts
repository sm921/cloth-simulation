import { Matrix } from "../math/matrix";
import { hessianModification } from "../math/matrix-modification";
import { Vector } from "../math/vector";
import { Solver } from "../math/solver";
import { findStepsizeByWolfConditions } from "./line-search";
import { Multigrid } from "./multigrid";
/**
 * x1 = x0 + a * D * pk
 *  - x1 is updated value
 *  - x0 is current value
 *  - a is stepsize
 *  - D is modification matrix
 *  - pk is direction vector
 */
/**
 * update x by x + stepsize * H^-1 (- grad f)
 *  so that x converges to local minimum of fx
 * @param x
 * @param fx
 * @param gradFx
 * @param hessianOfFx
 * @param simulatesInertia x osciliates around local minumum until convergence as if it has inertia
 * @param triesOrthogonalDirections saddle point guard (set non-zero value ONLY IF x converges to saddle point)
 * @returns
 */
export function updateByNewtonRaphson(
  x: Vector,
  fx: (x: Vector) => number,
  gradFx: (x: Vector) => Vector,
  hessianOfFx: (x: Vector) => Matrix,
  simulatesInertia = false,
  triesOrthogonalDirections = 0
): void {
  const _H = hessianOfFx(x);
  const H = hessianModification(_H);
  let grad = gradFx(x)
    .multiplyScalar(-1)
    /* ############ Saddle Point Guard ##########
     * since if elements are zero, then H^'1 grad may have zero element (in cases like H is diagonal)
     * which makes update direction orthogonal to some descent directions corresponding to zero element.
     * to make it NOT orthogonal to such directions, simply replace zero elements of gradient with 1.*/
    .elements.map((el) =>
      triesOrthogonalDirections !== 0 && el === 0
        ? triesOrthogonalDirections
        : el
    ); // avoid converges to saddle point
  const _pk = Solver.cholesky(H, grad, true);
  if (_pk === null) return;
  const pk = new Vector(_pk);
  if (pk.norm() === 0) return;
  const stepsize = simulatesInertia
    ? 1
    : findStepsizeByWolfConditions(
        (stepsize) => fx(x.addNew(pk.multiplyScalarNew(stepsize))),
        (stepsize) => gradFx(x.addNew(pk.multiplyScalarNew(stepsize))).dot(pk),
        1e3,
        undefined,
        undefined,
        1
      );
  x.add(pk.multiplyScalar(stepsize));
}

/**
 * update x by x + stepsize * H^-1 (- grad f)
 *  so that x converges to local minimum of fx
 * @param x
 * @param fx
 * @param gradFx
 * @param hessianOfFx
 * @param simulatesInertia x osciliates around local minumum until convergence as if it has inertia
 * @param triesOrthogonalDirections saddle point guard (set non-zero value ONLY IF x converges to saddle point)
 * @returns
 */
export function updateByNewtonMultigrid(
  multigrid: Multigrid,
  x: Vector,
  gradFx: (x: Vector) => Vector,
  hessianOfFx: (x: Vector) => Matrix,
  velocity: Vector,
  timestep: number
): void {
  const H = hessianOfFx(x);
  x.add(velocity.multiplyScalarNew(timestep));
  multigrid.solveBy2LevelMethot(H, x, gradFx(x).multiplyScalarNew(-1));
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
  x: Vector[],
  getHessian: (x: Vector[]) => Matrix,
  getGradient: (x: Vector[]) => Vector,
  isFixed: (index: number) => boolean,
  objectiveFuncionOfStepsize: (
    stepsize: number,
    descentDirections: Vector[]
  ) => number,
  gradientOfObjectiveFunctionOfStepsize: (
    stepsize: number,
    descentDirections: Vector[]
  ) => Vector,
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
      x_i.add(descentDirectionPerPosition[i].multiplyScalar(stepsize));
  });
}

function _findDescentDirection(
  x: Vector[],
  hessian: Matrix,
  gradient: Matrix,
  isFixed: (index: number) => boolean,
  tolerance = 1e-6
): [Vector, number] | [null, null] {
  let descentDirection = Solver.cholesky(
    hessian,
    gradient.multiplyScalarNew(-1).elements,
    true
  );
  if (descentDirection === null) return [null, null];
  for (let i = 0; i < x.length; i++)
    if (isFixed(i)) for (let j = 0; j < 3; j++) descentDirection[3 * i + j] = 0;
  const descentDirectionsFlat = new Vector(descentDirection);
  const norm = descentDirectionsFlat.norm();
  if (norm < tolerance) return [null, null];
  return [descentDirectionsFlat, norm];
}

function _findStepsize(
  descentDirections: Vector,
  objectiveFunction: (stepsize: number, descentDirections: Vector[]) => number,
  gradientOfObjectiveFunction: (
    stepsize: number,
    descentDirections: Vector[]
  ) => Vector
): [number, Vector[]] {
  const descentDirectionPerPosition = Array(descentDirections.height);
  for (let i = 0; i < descentDirections.height / 3; i++)
    descentDirectionPerPosition[i] = new Vector([
      descentDirections._(i * 3),
      descentDirections._(i * 3 + 1),
      descentDirections._(i * 3 + 2),
    ]);
  return [
    findStepsizeByWolfConditions(
      (stepsize) => objectiveFunction(stepsize, descentDirectionPerPosition),
      (stepsize) =>
        gradientOfObjectiveFunction(stepsize, descentDirectionPerPosition).dot(
          descentDirections
        ), // directional derivative
      1e3,
      0.1,
      0.9,
      10
    ),
    descentDirectionPerPosition,
  ];
}
