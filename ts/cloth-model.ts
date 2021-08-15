namespace CLOTH_MODEL {
  /**
   * Cloth simulation using mass-spring-model
   */
  class ClothModel {
    /**
     * damping force coefficient
     */
    damping_i = 1.0;
    /**
     * array of array of forces (fx,fy,fz) applied to each particle
     */
    forces_aaa3i: Array<Array<Vec3>> = [];
    /**
     * mass of a particle in killogram
     */
    mass_i = 1.5;
    /**
     * array of positions in 3d space
     * unit is millimeter
     */
    particles_aaa3i: Array<Array<Vec3>> = [];
    /**
     * attributes for particles
     */
    particles_attributes_aao: Array<Array<{ hides: boolean; fixed: boolean }>> =
      [
        [
          {
            /** hide the particle */
            hides: false,
            /** fix the position if true*/
            fixed: false,
          },
        ],
      ];
    /**
     * array of previous positions in 3d space
     * unit is millimeter
     */
    previous_particles_aaa3i: Array<Array<Vec3>> = [];
    /**
     * rest length for mass-spring-model,
     * which is the distance between 2 consecutive particles
     * unit is millimeter
     */
    restLen_i: number;
    /**
     * stiffness of sprintg which adds drawing effect to the animation (0.0 <= K <= 1.0)
     */
    stiffness_i = 0.75;

    /**
     * @param {Array<Array<number, number, number>>} particles_aa3i array of positions in 3d space
     * @param {Array<Array<{hides: boolean, fixed: boolean}>>} particles_attributes_aao array of attributes for each particle
     * - hides: hide the particle if true
     * - ficed: fix the point if true
     * @param {{
     * damping_i: number,
     * mass_i: number,
     * stiffness_i: number,
     * }} options_o following options
     * - stiffness of cloth which adds drawing effect to the animation (0.0 <= K <= 1.0)
     * - mass of a particle in killogram
     */
    constructor(
      particles_aa3i: Array<Array<Vec3>>,
      particles_attributes_aao: Array<
        Array<{ hides: boolean; fixed: boolean }>
      >,
      options_o: {
        damping_i: number;
        mass_i: number;
        stiffness_i: number;
      } = {
        damping_i: 0.23,
        mass_i: 1.5,
        stiffness_i: 0.75,
      }
    ) {
      this.particles_aaa3i = particles_aa3i;
      this.particles_attributes_aao = particles_attributes_aao;
      this.previous_particles_aaa3i = [
        ...particles_aa3i.map((a) => a.map((a3i) => [...a3i] as Vec3)), // deep copy
      ];
      this.damping_i = options_o.damping_i;
      this.mass_i = options_o.mass_i;
      const p1_a3i = this.particles_aaa3i[0][0];
      const p2_a3i = this.particles_aaa3i[0][1];
      const dx_i = p1_a3i[0] - p2_a3i[0];
      const dy_i = p1_a3i[1] - p2_a3i[1];
      const dz_i = p1_a3i[2] - p2_a3i[2];
      this.restLen_i = Math.sqrt(dx_i * dx_i + dy_i * dy_i + dz_i * dz_i);
      this.stiffness_i = options_o.stiffness_i;
      this._initForcesAndVelocities();
    }

    /**
     * @private
     * add damping force to a particle (resist fast move and rest quickly)
     * @param {number} dt_i
     * @returns {void}
     */
    _addDampingForce(dt_i: number) {
      const maxY_i = this.particles_aaa3i.length - 1;
      const maxX_i = this.particles_aaa3i[maxY_i].length - 1;
      for (let y_i = 0; y_i <= maxY_i; y_i++) {
        for (let x_i = 0; x_i <= maxX_i; x_i++) {
          const attribute_o = this.particles_attributes_aao[y_i][x_i];
          if (attribute_o.hides || attribute_o.fixed) continue;
          const x1_a3i = this.particles_aaa3i[y_i][x_i];
          const x0_a3i = this.previous_particles_aaa3i[y_i][x_i];
          this._addForce_iia3i_v(
            x_i,
            y_i,
            [0, 1, 2].map(
              (i) => -(this.damping_i * (x1_a3i[i] - x0_a3i[i])) / dt_i
            ) as Vec3
          );
        }
      }
    }

    /**
     * @private
     * add force to a particle specified by horiozntal and vertical index
     * @param {number} x_i horizontal index in cloth mass-spring-model, not x coordinates in 3d space
     * @param {number} y_i vertical index in cloth mass-spring-model, not y coordinates in 3d space
     * @param {Array<Vec3>} f_a3i
     * @returns {void}
     */
    _addForce_iia3i_v(x_i: number, y_i: number, f_a3i: Vec3) {
      const [fx_i, fy_i, fz_i] = f_a3i.map((f_i) =>
        Math.abs(f_i) < 0.001 ? 0 : f_i
      );
      if (fx_i == 0 && fy_i == 0 && fz_i == 0) return;
      this.forces_aaa3i[y_i][x_i][0] += fx_i;
      this.forces_aaa3i[y_i][x_i][1] += fy_i;
      this.forces_aaa3i[y_i][x_i][2] += fz_i;
    }

    /**
     * @private
     * add gravity forces to all the particles
     * @description this could be executed in gpu
     */
    _addGravityForce() {
      // F = ma, hence gravity = mg
      const gravity = -this.mass_i * gravity_i;
      const maxY_i = this.particles_aaa3i.length - 1;
      const maxX_i = this.particles_aaa3i[maxY_i].length - 1;
      for (let y_i = 0; y_i <= maxY_i; y_i++) {
        for (let x_i = 0; x_i <= maxX_i; x_i++) {
          const attribute_o = this.particles_attributes_aao[y_i][x_i];
          if (attribute_o.hides || attribute_o.fixed) continue;
          this.forces_aaa3i[y_i][x_i][2] = gravity;
        }
      }
    }

    /**
     * @private
     * add spring forces to all the particles using mass-spring-model
     * @description this could be executed in gpu
     */
    _addSpringForce() {
      const maxY_i = this.particles_aaa3i.length - 1;
      const maxX_i = this.particles_aaa3i[maxY_i].length - 1;
      for (let y_i = 0; y_i <= maxY_i; y_i++) {
        for (let x_i = 0; x_i <= maxX_i; x_i++) {
          const attribute_o = this.particles_attributes_aao[y_i][x_i];
          if (attribute_o.hides || attribute_o.fixed) continue;
          const p = this.particles_aaa3i[y_i][x_i];
          /*
          1. Structual springs
                p
                |
            p - p - p
                |
                p
          culculate the sum of the forces that are applied to the center particle
        */

          for (let info of [
            { x: x_i + 1, y: y_i },
            { x: x_i - 1, y: y_i },
            { x: x_i, y: y_i + 1 },
            { x: x_i, y: y_i - 1 },
          ]) {
            if (
              info.x < 0 ||
              info.x > maxX_i ||
              info.y < 0 ||
              info.y > maxY_i ||
              this.particles_attributes_aao[info.y][info.x].hides
            )
              continue;
            const p2 = this.particles_aaa3i[info.y][info.x];
            const f = this._calcSpringForce_a3ia3in_a3i(p, p2, this.restLen_i);
            this._addForce_iia3i_v(
              x_i,
              y_i,
              // add extra stiffness to fixedf particles
              (this.particles_attributes_aao[info.y][info.x].fixed
                ? f.map((i) => i * 2)
                : f) as Vec3
            );
          }
          /*
          2. Shear springs
             p     p
              \   / 
                p
              /   \
             p     p
          culculate the sum of the forces that are applied to the center particle
        */
          for (let info of [
            { x: x_i + 1, y: y_i + 1 },
            { x: x_i - 1, y: y_i + 1 },
            { x: x_i - 1, y: y_i - 1 },
            { x: x_i + 1, y: y_i - 1 },
          ]) {
            if (
              info.x < 0 ||
              info.x > maxX_i ||
              info.y < 0 ||
              info.y > maxY_i ||
              this.particles_attributes_aao[info.y][info.x].hides
            )
              continue;
            const f = this._calcSpringForce_a3ia3in_a3i(
              p,
              this.particles_aaa3i[info.y][info.x],
              1.414 * this.restLen_i
            );
            this._addForce_iia3i_v(
              x_i,
              y_i,
              // add extra stiffness to fixedf particles
              (this.particles_attributes_aao[info.y][info.x].fixed
                ? f.map((i) => i * 2)
                : f) as Vec3
            );
          }
          /*
          3. Bending springs
                     p
                     |
                     
                     |
              p -  - p -  - p
                     |
                     
                     |
                     p
          culculate the sum of the forces that are applied to the center particle
        */
          for (let info of [
            { x: x_i, y: y_i + 2 },
            { x: x_i, y: y_i - 2 },
            { x: x_i - 2, y: y_i },
            { x: x_i + 2, y: y_i },
          ]) {
            if (
              info.y >= 0 &&
              info.y <= maxY_i &&
              info.x >= 0 &&
              info.x <= maxX_i &&
              this.particles_attributes_aao[info.y][info.x].hides
            )
              continue;
            // if the particle does not exist, then select the next particle to avoid unreal elastic effect at the edges
            const modifiedX_i =
              info.x < 0 ? 0 : info.x > maxX_i ? maxX_i : info.x;
            const modifiedY_i =
              info.y < 0 ? 0 : info.y > maxY_i ? maxY_i : info.y;
            const f = this._calcSpringForce_a3ia3in_a3i(
              p,
              this.particles_aaa3i[modifiedY_i][modifiedX_i],
              info.y < 0 || info.y > maxY_i || info.x < 0 || info.x > maxX_i
                ? this.restLen_i
                : 2 * this.restLen_i
            );
            this._addForce_iia3i_v(
              x_i,
              y_i,
              // add extra stiffness to fixedf particles
              (this.particles_attributes_aao[modifiedY_i][modifiedX_i].fixed
                ? f.map((i) => i * 2)
                : f) as Vec3
            );
          }
        }
      }
    }

    /**
     * @private
     * calculate a structural spring force between two particles
     * F = K(L - |p-q|)/|p-q| * (p-q)
     * where
     *  - F is force
     *  - K is stiffness constant
     *  - L is rest length constant
     *  - p is a particle on which a force is applied
     *  - q is another particle which causes a force to p
     *  - p - q is vector and |p-q| is the length of the vector
     * @param {number} p1_a3i
     * @param {number} p2_a3i
     * @param {number} restLen_i
     * @returns {Vec3}
     */
    _calcSpringForce_a3ia3in_a3i(
      p1_a3i: Vec3,
      p2_a3i: Vec3,
      restLen_i: number
    ) {
      const dx_i = p1_a3i[0] - p2_a3i[0];
      const dy_i = p1_a3i[1] - p2_a3i[1];
      const dz_i = p1_a3i[2] - p2_a3i[2];
      if (dx_i === 0 && dy_i === 0 && dz_i === 0) return [0, 0, 0];
      const p1p2Len_i = Math.sqrt(dx_i * dx_i + dy_i * dy_i + dz_i * dz_i);
      if (p1p2Len_i === 0) return [0, 0, 0];
      const scale_i = (this.stiffness_i * (restLen_i - p1p2Len_i)) / p1p2Len_i;
      return [scale_i * dx_i, scale_i * dy_i, scale_i * dz_i];
    }

    /**
     * @returns {Array<Array<[number,number,number]>>} array of array of postions (x, y, z)
     */
    animate_i_aaa3i(dt_i: number) {
      /**
       * because the implementation of mass-spring-model does not refer to real physical units like time, mass, and accelaration
       * it'd be unstable to set dt_i to a number but 1
       */
      dt_i = 1;

      // add forces to each particle
      this._addGravityForce();
      this._addSpringForce();
      this._addDampingForce(dt_i);

      this._updatePositions_i_v(dt_i);

      this._resetForces();
      return this.particles_aaa3i;
    }

    /**
     * @private
     * init forces
     * @description this could be executed in gpu
     */
    _initForcesAndVelocities() {
      const maxY_i = this.particles_aaa3i.length - 1;
      const maxX_i = this.particles_aaa3i[maxY_i].length - 1;
      for (let y_i = 0; y_i <= maxY_i; y_i++) {
        const forces_of_this_row_ai: Vec3[] = [];
        for (let x_i = 0; x_i <= maxX_i; x_i++) {
          forces_of_this_row_ai.push([0, 0, 0]);
        }
        this.forces_aaa3i.push(forces_of_this_row_ai);
      }
    }

    /**
     * @private
     * set zeros to forces
     * @description this could be executed in gpu
     */
    _resetForces() {
      const maxY_i = this.particles_aaa3i.length - 1;
      const maxX_i = this.particles_aaa3i[maxY_i].length - 1;
      for (let y_i = 0; y_i <= maxY_i; y_i++)
        for (let x_i = 0; x_i <= maxX_i; x_i++)
          this.forces_aaa3i[y_i][x_i] = [0, 0, 0];
    }

    /**
     * update positions using forces accumulated to each particle
     *  x2 = x1 + v1*t + 1/2*at^2
     *     = x1 + (x1-x0)/t * t + 1/2*at^2
     *     = 2*x1 - x0 + 1/2*at^2
     *  where
     *    x2 = new position
     *    x1 = current position
     *    x0 = previous position
     *    a = accelaration (= F/m = force / mass)
     *    t = elapsed time
     * @private
     * @param {number} dt_i elapsed time
     * @description this could be executed in gpu
     */
    _updatePositions_i_v(dt_i: number) {
      const t2Half = (dt_i * dt_i) / 2;
      const maxY_i = this.particles_aaa3i.length - 1;
      const maxX_i = this.particles_aaa3i[maxY_i].length - 1;

      for (let y_i = 0; y_i <= maxY_i; y_i++) {
        for (let x_i = 0; x_i <= maxX_i; x_i++) {
          const attribute_o = this.particles_attributes_aao[y_i][x_i];
          if (attribute_o.hides || attribute_o.fixed) continue;
          const x1_a3i: Vec3 = [...this.particles_aaa3i[y_i][x_i]]; // deep copy
          const x0_a3i = this.previous_particles_aaa3i[y_i][x_i];
          const f_a3i = this.forces_aaa3i[y_i][x_i];
          const a_3i = [f_a3i[0], f_a3i[1], f_a3i[2]].map(
            (f_i) => f_i / this.mass_i
          );
          const x2_a3i = [0, 1, 2].map(
            (i) => 2 * x1_a3i[i] - x0_a3i[i] + a_3i[i] * t2Half
          );
          this.particles_aaa3i[y_i][x_i][0] = x2_a3i[0];
          this.particles_aaa3i[y_i][x_i][1] = x2_a3i[1];
          // collision with a table
          // x2_a3i[2] =
          //   a <= x2_a3i[0] && x2_a3i[0] <= d && c <= x2_a3i[1] && x2_a3i[1] <= f
          //     ? Math.max(x2_a3i[2], e)
          //     : x2_a3i[2];
          // collision with the floor
          x2_a3i[2] = Math.max(-250, x2_a3i[2]);
          this.particles_aaa3i[y_i][x_i][2] = x2_a3i[2];
          this.previous_particles_aaa3i[y_i][x_i] = x1_a3i;
        }
      }
    }
  }

  export let cloth2: ClothModel;

  /** length of a cloth */
  export let len_i = 500;
  /**
   * length of each spring that connects betwen two consecutive particles
   * which determins the accuracy of simulation
   */
  export let springLen_i = 8;
  export const setSpringLen_i = (i: number) => {
    springLen_i = i;
    [setSizeX_i, setSizeY_i].forEach((setSize) =>
      setSize(Math.floor(len_i / springLen_i))
    );
    setDamping_i(Math.min(springLen_i * 0.03, 0.6));
    setStiffness_i(Math.min(springLen_i * 0.09375, 0.2));
    setGravity_i(springLen_i * springLen_i * (0.12 / 64));
  };
  export const setLen_i = (i: number) => {
    len_i = i;
    [setSizeX_i, setSizeY_i].forEach((setSize) =>
      setSize(Math.floor(len_i / springLen_i))
    );
  };
  /** number of vertices in a horizontal spring */
  export let sizex_i = Math.floor(len_i / springLen_i);
  export const setSizeX_i = (i: number) => (sizex_i = i);
  /** number of vertices in a vertical spring */
  export let sizey_i = Math.floor(len_i / springLen_i);
  export const setSizeY_i = (i: number) => (sizey_i = i);
  export let damping_i = springLen_i * 0.03;
  export const setDamping_i = (i: number) => (damping_i = i);
  export let mass_i = 1.5;
  export const setMass_i = (i: number) => (mass_i = i);
  export let stiffness_i = 0.09375 * springLen_i;
  export const setStiffness_i = (i: number) => (stiffness_i = i);
  export let gravity_i = springLen_i * springLen_i * (0.12 / 64);
  export const setGravity_i = (i: number) => (gravity_i = i);

  export function initCloth() {
    const particles: Vec3[][] = [];
    const attributes = [];
    /** length of each horizontal spring between two vertices */
    const stepx_i = len_i / (sizex_i - 1);
    /** length of each vertical spring between two vertices */
    const stepy_i = len_i / (sizey_i - 1);
    for (let y = 0; y < sizey_i; y++) {
      const row: Vec3[] = [];
      const row_attributes = [];
      for (let x = 0; x < sizex_i; x++) {
        row.push([-len_i / 2 + x * stepx_i, -len_i / 2 + y * stepy_i, 125]);
        row_attributes.push({
          hides: false,
          fixed:
            (x === 0 && y === 0) ||
            (x === 0 && y === sizey_i - 1) ||
            (x === sizex_i - 1 && y === 0) ||
            (x === sizex_i - 1 && y === sizey_i - 1),
        });
      }
      particles.push(row);
      attributes.push(row_attributes);
    }

    cloth2 = new ClothModel(particles, attributes, {
      damping_i,
      mass_i,
      stiffness_i,
    });
  }
}
