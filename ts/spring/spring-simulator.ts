namespace SPRING_SIMULALTOR {
  const gravityAccelaration = 9.8;
  const timeStep = 0.971;

  export class Simulator {
    springConstant = 1;
    massOfEndpoint = 2;
    origin: Vec3;
    end: Vec3;
    restLength: number;
    velocityOfEndPoint: Vec3;
    forceToEndpoint: Vec3;

    constructor(origin: Vec3, end: Vec3, restLength?: number) {
      this.origin = origin;
      this.end = end;
      this.restLength = restLength ?? VEC.len(VEC.subtract(end, origin));
      this.velocityOfEndPoint = [0, 0, 0];
      this.forceToEndpoint = [0, 0, 0];
    }

    simulateExplictEuler(): void {
      this.addGravityForce();
      this.addSpringForce();
      const accelerationOfEndpoint = VEC.scale(
        this.forceToEndpoint,
        1 / this.massOfEndpoint
      );
      const newPosition = VEC.add(
        this.end,
        VEC.scale(this.velocityOfEndPoint, timeStep),
        VEC.scale(accelerationOfEndpoint, 0.5 * timeStep * timeStep)
      );
      newPosition[2] = Math.max(newPosition[2], 0);
      this.velocityOfEndPoint = VEC.scale(
        VEC.subtract(newPosition, this.end),
        timeStep
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
     *    E(x) ~= E(x0) + grad E(x0) (x-x0) + 1/2 * (x-x0)^t H (x-x0)
     *    this E(x) satisfies E(x)/dx = 0 when it's minimum
     *    hence grad E(x0) + H x = 0
     *    hence H x = -grad E(x0)
     *      this lenear system cannot be solved directly (maybe because H is singular (not invertible)),
     *      thus approximate x by LU decomposition
     *
     *  ===== 3. Detail: Algebra and Analysys =====
     *    grad E(x0) = 1/h^2 * mass * (x-x0-hv0) - gravity - spring force
     *    H = mass/h^2 - dGravity/dx - dSpringForce/dx
     *      = mass/h^2 - 0 - k ( restLength/|x-a|`| (I - (x-a)(x-a)^t/|x-a|^2) - I )
     *      here,
     *        mass is mass matrix (i.e. diagonal matrix whose element is mass of the end point)
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
     *   Finally, apply LU decomposition to Hx = -grad E(x0) to find better x.
     *   Then update x0 by x
     *   repeat the process 2 and 3 until |x - x_previous| < small torelrance (like 0.1)
     *   if |x - x_previous| < small torelrance, return that x
     */
    simulateByEnergyMinimization(): void {
      this.addGravityForce();
      this.addSpringForce();
      const accelerationOfEndpoint = VEC.scale(
        this.forceToEndpoint,
        1 / this.massOfEndpoint
      );
      const newPosition = VEC.add(
        this.end,
        VEC.scale(this.velocityOfEndPoint, timeStep),
        VEC.scale(accelerationOfEndpoint, 0.5 * timeStep * timeStep)
      );
      newPosition[2] = Math.max(newPosition[2], 0);
      this.velocityOfEndPoint = VEC.scale(
        VEC.subtract(newPosition, this.end),
        timeStep
      );
      this.end = newPosition;
      this.forceToEndpoint = [0, 0, 0];
    }

    private addForce(force: Vec3): void {
      this.forceToEndpoint = VEC.add(this.forceToEndpoint, force);
    }

    private addGravityForce(): void {
      this.addForce([0, 0, -this.massOfEndpoint * gravityAccelaration]);
    }

    private addSpringForce(): void {
      const vectorOriginToEnd = VEC.subtract(this.end, this.origin);
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
      this.addForce(springForce);
    }
  }
}
