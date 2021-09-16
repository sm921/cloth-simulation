/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/vector-helper.ts" />
/// <reference path="../helpers/math/matrix.ts" />
/// <reference path="../helpers/ui.ts" />
/// <reference path="../helpers/algorithm/line-search.ts" />

namespace SPRING_SIMULALTOR {
  const gravityAccelaration = 9.8;
  const timeStepExplicit = 0.971;
  const timeStepImplicit = 0.3;

  export class Simulator {
    springConstant = 1;
    massOfEndpoint = 1;
    restLength: number;
    velocityOfEndPoint: Vec3 = [0, 0, 0];
    forceToEndpoint: Vec3 = [0, 0, 0];

    constructor(public origin: Vec3, public end: Vec3, restLength?: number) {
      this.restLength = restLength ?? VEC.len(VEC.subtract(end, origin));
    }

    simulateExplictEuler(): void {
      this.addGravity();
      this.addSpringForce();
      const accelerationOfEndpoint = VEC.scale(
        this.forceToEndpoint,
        1 / this.massOfEndpoint
      );
      const newPosition = VEC.add(
        this.end,
        VEC.scale(this.velocityOfEndPoint, timeStepExplicit),
        VEC.scale(
          accelerationOfEndpoint,
          0.5 * timeStepExplicit * timeStepExplicit
        )
      );
      newPosition[2] = Math.max(newPosition[2], -80);
      this.velocityOfEndPoint = VEC.scale(
        VEC.subtract(newPosition, this.end),
        timeStepExplicit
      );
      this.end = newPosition;
      this.forceToEndpoint = [0, 0, 0];
    }

    /**
     * ===== 1. Abstract: solve by energy optimization ======
     *  x1 = argmin E(x) = 1/(2h^2) * mass * ||x-(x0+hv0)||^2 + PotentialEnergy(x)
     *    first term is Newton's kinematic energe (1/2 * m * v^2).
     *      and x0+hv0 is inertia, which means that x will be there if there is neither gravity or elastic force
     *    second term is potential energy due to gravity and spring's elastic force.
     *
     * ===== 2. Optimization Method: argmin E(x) is solved by Newton's method =====
     *  by applying 2nd order Taylor approximation,
     *    E(x) ~= E(x0) + grad E(x0) (x-x0-hv0) + 1/2 * (x-x0)^t H (x-x0)
     *    this E(x) satisfies E(x)/dx = 0 when it's minimum
     *    hence grad E(x0) + H(x-x0) = 0
     *    hence H (x-x0) = -grad E(x0)
     *      solve x-x0 directoly using LU decomposition
     *
     *  ===== 3. Detail: Algebra and Analysys =====
     *    grad E(x0) = 1/h^2 * mass * (x0-x0-hv0) - gravity(x0) - spring force(x0)
     *    H = mass/h^2 - dGravity/dx - dSpringForce/dx
     *      = mass/h^2 + k ( restLength/|x-a| (I - (x-a)(x-a)^t/|x-a|^2) - I )
     *    hence H|x=x0 = mass/h^2 + k ( restLength/|x0-a| (I - (x0-a)(x0-a)^t/|x0-a|^2) - I )
     *      here,
     *        mass is mass matrix (i.e. diagonal matrix whose element is mass of the end point and other elements are 0)
     *        h is constant timestep
     *        k is spring coefficient
     *        restLength is restlength of the spring
     *        I is 3x3 identity matrix
     *        (x-a) is vector from springs' origin to spring's end
     *        (x-a)^t is transpose of (x-a)
     *        (x-a)(x-a)^t is 3x3 matrix
     *       hence, H is 3x3 matrix
     *
     *  ===== 4. Solve, Loop, and Return =====
     *   Finally, solve (x-x0) such that H(x-x0) = -grad E(x0) using LU decomposition of H.
     *   Then update x0_new = (x-x0) + x0
     *   repeat the process 2 and 3 until |x - x_0| < small torelrance (like 0.1)
     *   if |E(x) - E(x_0)| < small torelrance, return that x0_new
     *   update v0 = (x-x_old) / h
     */
    simulateByEnergyMinimization(): void {
      const tolerance = 1e-6;
      const invTimestep = 1 / timeStepImplicit;
      const massOverTimestep2 = this.massOfEndpoint * invTimestep * invTimestep;
      // solve
      const H = new MATH_MATRIX.Matrix(massOverTimestep2, 3, 3).subtract(
        this.getDerivativeSpringForce()
      );
      const xOld: Vec3 = [...this.end];
      const L = MATH_MATRIX.hessianModification(H, undefined, 1.1); // make sure that H is positive definite
      const xMinusX0 = MATH_MATRIX.Solver.cholesky(
        L,
        this.getGradientOfEnergy(this.end).multiply(-1).elements,
        true
      );
      if (xMinusX0 === null) return;
      const norm = VEC.len([xMinusX0[0], xMinusX0[1], xMinusX0[2]]);
      if (norm < tolerance) return;
      const stepsize = LINE_SEARCH.findStepsizeByWolfConditions(
        (stepsize) =>
          this.getEnergy(
            VEC.add(this.end, VEC.scale(xMinusX0 as unknown as Vec3, stepsize))
          ),
        (stepsize) =>
          this.getDirectionalDerivativeOfEnergy(
            VEC.add(this.end, VEC.scale(xMinusX0 as unknown as Vec3, stepsize)),
            [xMinusX0[0], xMinusX0[1], xMinusX0[2]]
          ),
        1e3,
        0.1,
        0.9,
        10
      );
      if (stepsize === 0) return;
      // update
      for (let i = 0; i < 3; i++) this.end[i] += stepsize * xMinusX0[i];
      this.velocityOfEndPoint = VEC.scale(
        VEC.subtract(this.end, xOld),
        invTimestep
      );
      UI.liElements[0].innerHTML = `▽f(xk)'u = ${this.getDirectionalDerivativeOfEnergy(
        this.end,
        VEC.scale([xMinusX0[0], xMinusX0[1], xMinusX0[2]], stepsize)
      )}`;
      UI.liElements[1].innerHTML = `|▽f(xk)|: ${Math.abs(
        this.getGradientOfEnergy(this.end).norm()
      )}`;
    }

    private addForce(force: Vec3): void {
      this.forceToEndpoint = VEC.add(this.forceToEndpoint, force);
    }

    private addGravity(): void {
      this.addForce(this.getGravity());
    }

    private addSpringForce(): void {
      this.addForce(this.getSpringForce(this.end));
    }

    private getGravity(): Vec3 {
      return [0, 0, -this.massOfEndpoint * gravityAccelaration];
    }

    private getSpringForce(x: Vec3): Vec3 {
      const vectorOriginToEnd = VEC.subtract(x, this.origin);
      /* 
      spring force in 3d space is -k( ||v|| - r ) v/||v||
       where 
        k is spring coefficient (0 <= k <=1)
        ||v|| is norm of vector v 
        r is restlength
        v is vector from spring's origin to end 
        v/||v|| is normalized vector in the direction of the spring
      */
      const springForce = VEC.scale(
        vectorOriginToEnd,
        -this.springConstant *
          (1 - this.restLength / VEC.len(vectorOriginToEnd))
      );
      return springForce;
    }

    /**
     * get derivative of spring force wrt x at x=current position of endpoint
     * -k ( restLength/|x0-a| (I - (x0-a)(x0-a)^t/|x0-a|^2) - I )
     */
    private getDerivativeSpringForce(): MATH_MATRIX.Matrix {
      const x0a = new MATH_MATRIX.Vector(VEC.subtract(this.end, this.origin));
      const x0a_norm = x0a.norm();
      const identity = MATH_MATRIX.Matrix.identity(3);
      return (
        x0a
          .multiply(x0a.transposeNew())
          .multiply(-1 / x0a_norm / x0a_norm) as MATH_MATRIX.Matrix
      )
        .add(identity)
        .multiply(this.restLength / x0a_norm)
        .subtract(identity)
        .multiply(-this.springConstant);
    }

    private getDirectionalDerivativeOfEnergy(x: Vec3, direction: Vec3): number {
      return VEC.dot(
        this.getGradientOfEnergy(x).elements as unknown as Vec3,
        direction
      );
    }

    /**
     * E(x) = 1/(2h^2) * mass * ||x-(x0+hv0)||^2 + mass*g*z + 1/2 * k(|x-a|-r)^2
     */
    private getEnergy(x: Vec3): number {
      const kineticEergy =
        (0.5 / timeStepImplicit / timeStepImplicit) *
        this.massOfEndpoint *
        VEC.pow2(
          VEC.subtract(
            x,
            this.end,
            VEC.scale(this.velocityOfEndPoint, timeStepImplicit)
          )
        );
      const gravityPotential = gravityAccelaration * x[2];
      const diff = VEC.len(VEC.subtract(x, this.origin)) - this.restLength;
      const springPotential = 0.5 * this.springConstant * diff * diff;
      return kineticEergy + gravityPotential + springPotential;
    }

    private getGradientOfEnergy(x: Vec3) {
      return new MATH_MATRIX.Vector(
        VEC.subtract(
          VEC.scale(
            VEC.subtract(
              x,
              this.end,
              VEC.scale(this.velocityOfEndPoint, timeStepImplicit)
            ),
            this.massOfEndpoint / (timeStepImplicit * timeStepImplicit)
          ),
          this.getGravity(),
          this.getSpringForce(x)
        )
      );
    }
  }
}
