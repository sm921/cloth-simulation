namespace FREE_FALL_SIMULATOR {
  const gravityAccelaration = 9.8;
  const timeStep = 1 / 10;

  export class Simulator {
    groundZValue: number;
    /** position of a falling object for implicit euler method */
    position: Vec3;
    /** position of another falling object for explicit euler method */
    coefficientOfRestituion = 0.7;

    constructor(position: Vec3, groundZValue = 0) {
      this.position = position;
      this.groundZValue = groundZValue;
    }

    velocity: number = 0;
    /**
     * solve by x1 = x0 + dx0/dt * dt
     */
    simulateByExplicitEuler(): void {
      const x0 = this.position[2];
      const dx0dt = this.velocity;
      const x1 = x0 + dx0dt * timeStep;
      this.position[2] = x1;
      // accelerate
      this.velocity += -gravityAccelaration * timeStep;
      // collision detection
      if (x1 <= this.groundZValue) {
        this.velocity = -this.velocity * this.coefficientOfRestituion;
        this.position[2] = this.groundZValue;
      }
    }

    time = 0;
    velocity_origin = 0;
    /**
     * solve by x1 = x0 + dx1/dt * dt,
     */
    simulateByImplicitEuler(): void {
      /*
     x = x_origin + v_origin * t - 1/2 * g * t^2
     hence, dxdt = v_origin - g * t
     hence, dx1/dt1 = v_origin - g * t1
     then, x1 = x0 + dx1/dt1 * dt
     */
      const x0 = this.position[2];
      const t1 = this.time + timeStep;
      const dx1dt1 = this.velocity_origin - gravityAccelaration * t1;
      const x1 = x0 + dx1dt1 * timeStep;
      this.position[2] = x1;
      this.time += timeStep;

      // collision detection
      if (x1 <= this.groundZValue) {
        // reset t
        this.time = 0;
        // inverse velocity
        this.velocity_origin = -dx1dt1 * this.coefficientOfRestituion;
        this.position[2] = this.groundZValue;
      }
    }
  }
}
