namespace FREE_FALL {
  const gravityAccelaration = 9.8;
  const springConstant = 1;
  const massOfEndpoint = 10;
  const timeStep = 1;

  export class FreeFall {
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

    addForce(force: Vec3): void {
      this.forceToEndpoint = VEC.add(this.forceToEndpoint, force);
    }

    addGravityForce(): void {
      this.addForce([0, 0, -massOfEndpoint * gravityAccelaration]);
    }

    addSpringForce(): void {
      const vectorOriginToEnd = VEC.subtract(this.end, this.origin);
      const springForce = VEC.scale(
        vectorOriginToEnd,
        -springConstant * (1 - this.restLength / VEC.len(vectorOriginToEnd))
      );
      this.addForce(springForce);
    }

    explicitEuler(): void {
      this.addGravityForce();
      this.addSpringForce();
      const accelerationOfEndpoint = VEC.scale(
        this.forceToEndpoint,
        1 / massOfEndpoint
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

    simulate(): void {
      this.explicitEuler();
    }
  }
}
