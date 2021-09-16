/// <reference path="../helpers/math/matrix.ts" />
/// <reference path="../helpers/algorithm/descent-method.ts" />
/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/ui.ts" />

namespace CLOTH_SIMUATOR {
  const gravityAccelaration = 9.8;
  const timestep = 1 / 10;
  const invTimestep = 1 / timestep;

  /** spring features */
  type Spring = {
    /** end point of spring */
    position1Index: number;
    /** the other end point of spring */
    position2Index: number;
    /** spring is stable at this length */
    restlength: number;
    /** number from 0 to 1 which denotes elasticity.
     * the grater the stronger the elastic force will be */
    springConstant: number;
  };

  export class Simulator {
    /** mass of each end points of springs */
    masses: Float32Array;
    /** (x,y,z) coordinate of end points of springs */
    positions: MATH_MATRIX.Vector[];
    /** spring features */
    springs: Spring[];
    /** velocities of end points of springs */
    velocities: MATH_MATRIX.Vector[];
    /**
     * i th row  contains all the indices of springs connected to the i th position
     * */
    positionToSprings: number[][];

    /**
     *
     * @param points positions in 3d space, which can be used as end points of springs as specified by 2nd parameter springIndices
     * @param springIndices denotes which points consists of springs
     * @param isPointFixed array of boolean specifying which points are fixed (true if a point is fixed)
     * @param masses masses of points
     * @param restLengths restlengths of springs
     * @param springConstants springs constants that describes the elasticity of a spring (between 0.0 and 1.0)
     */
    constructor(
      points: Vec3[],
      springIndices: Vec2[],
      public isPointFixed: (pointIndex: number) => boolean,
      masses?: Float32Array,
      restLengths?: Float32Array,
      springConstants?: Float32Array
    ) {
      this.positions = Array(points.length);
      this.velocities = Array(this.positions.length);
      this.masses = new Float32Array(this.positions.length);
      for (let i = 0; i < this.positions.length; i++) {
        this.positions[i] = new MATH_MATRIX.Vector(points[i]);
        this.velocities[i] = MATH_MATRIX.Vector.zero(3);
        this.masses[i] = masses?.[i] ?? 1;
      }

      this.springs = Array(springIndices.length);
      this.positionToSprings = Array(points.length);
      for (let i = 0; i < springIndices.length; i++) {
        const spring = springIndices[i];
        const [position1Index, position2Index] = [spring[0], spring[1]];
        this.springs[i] = {
          position1Index,
          position2Index,
          restlength:
            restLengths?.[i] ??
            this.positions[position1Index]
              .subtractNew(this.positions[position2Index])
              .norm(),
          springConstant: springConstants?.[i] ?? 1,
        };
        // memorize connections to get it faster without using loop later
        [position1Index, position2Index].forEach((position) => {
          if (!this.positionToSprings[position])
            this.positionToSprings[position] = [];
          this.positionToSprings[position].push(i);
        });
      }
    }

    /**
     * q(h+1) = argmin E(q)
     *  = 0.5 * (q-q0-hv0)^t M (q-q0-hv0) + Sigma_i (m_i*g*q_i_height) + Sigma_i (0.5*k*(|q_i2-qi_1|-r_i)^2)
     *
     * solve this problem by descent algorithm (line search with Newton-Raphson method)
     *  Let H be Hessian matrix of E(q)
     *  modify H so that H is positive definite (Hessian modification)
     *  then H^2 multipliedd by - grad E(q)is descent
     *    because  - H^-1 gradE(q) (-gradE(q) < 0 by definition of positive definite matrix,
     *    which means H^-1(-gradE(q)) is oppositve direction to gradE(q)
     *    in which direction E increases by definition of gradient
     *  hence update q <- q + stepsize * search_direction
     *    where
     *       search_direction = - H^-1 gradE(q)
     *    calculate search_direction by solveing linear equasion H(q-q0) = - gradE(q) with cholesky decomposition
     *    calculate stepsize with line search algorithm by wolf conditions
     *  until q converges
     * @returns
     */
    simulateByEnergyMinimization(): void {
      UI.print(1);
      const oldPositions = this.positions.map((position) => position.clone());
      DESCENT_METHOD._updateByNewton(
        this.positions,
        this.getHessianOfEnergy.bind(this),
        this.getGradientOfEnergy.bind(this),
        this.isPointFixed,
        (stepsize, descentDirectionPerPosition) =>
          this.getEnergy(
            this.positions.map((position, i) =>
              this.isPointFixed(i)
                ? position
                : position.addNew(
                    descentDirectionPerPosition[i].multiplyNew(stepsize)
                  )
            )
          ),
        (stepsize, descentDirectionPerPosition) =>
          this.getGradientOfEnergy(
            this.positions.map((position, i) =>
              this.isPointFixed(i)
                ? position
                : position.addNew(
                    descentDirectionPerPosition[i].multiplyNew(stepsize)
                  )
            )
          )
      );
      this.velocities = this.velocities.map((velocity, i) => {
        if (!this.isPointFixed(i))
          return this.positions[i]
            .subtractNew(oldPositions[i])
            .multiply(invTimestep);
        return velocity;
      });
    }

    private getAnotherEndOfSpring(
      spring: Spring,
      positionIndex: number
    ): MATH_MATRIX.Vector {
      return this.positions[
        spring.position1Index === positionIndex
          ? spring.position2Index
          : spring.position1Index
      ];
    }

    /**
     * E(q) = Ek + Eg + Es (kinetic, gravitational, and spring energies)
     * Ek = Sigma_i 1/(2h^2) * mass_i * ||q_i - (q_i_0 + h*v_i)||^2
     * Eg = Sigma_i mass_i * g * q_i
     * Es =  Sigma_i k/2 (|qi-pi|-ri)^2
     *  where 0 <= i <= (number of points  -1)
     *  and pi is points connected to qi
     */
    private getEnergy(positions: MATH_MATRIX.Vector[]): number {
      const kineticEergy = this.sigma(0, positions.length, (k) => {
        const [x, x0] = [positions[k], this.positions[k]];
        return (
          (0.5 / timestep / timestep) *
          this.masses[k] *
          x
            .subtractNew(x0)
            .subtract(this.velocities[k].multiplyNew(timestep))
            .squaredNorm()
        );
      });
      const gravityEnergy = this.sigma(
        0,
        positions.length,
        (k) => gravityAccelaration * (positions[k]._(2) + 1e6)
      );
      const springEnergy = this.sigma(0, this.springs.length, (k) => {
        const spring = this.springs[k];
        const diff =
          positions[spring.position1Index]
            .subtractNew(positions[spring.position2Index])
            .norm() - spring.restlength;
        return 0.5 * spring.springConstant * diff * diff;
      });
      return kineticEergy + gravityEnergy + springEnergy;
    }

    /**
     *  grad E(q) = m/h^2 (q-hv0-q0) + mg + k(||q-p||-r)
     * dEk_i/qi = m_i/(h^2) * (q_i - q_i_0 - h*v_i)
     * dEg_i/qi = mass_i * g
     * dEs_i/qi =  Sigma_j k (1-ri/|qi-pj|) (qi-pj)
     * @param positions position of point
     * @returns
     */
    private getGradientOfEnergy(
      positions: MATH_MATRIX.Vector[]
    ): MATH_MATRIX.Vector {
      const gradientOfEnergy = MATH_MATRIX.Vector.zero(
        this.positions.length * 3 // flat array ([x1,y1,z1,x2,y2,z2,...,xn,yn,zn])
      );
      for (let i = 0; i < positions.length; i++) {
        const [q_i, q0] = [positions[i], this.positions[i]];
        const gradKineticEnergy = q_i
          .subtractNew(q0)
          .subtractNew(this.velocities[i].multiplyNew(timestep))
          .multiplyNew(this.masses[i] / timestep / timestep);
        const gradGravityEnergy = [0, 0, this.masses[i] * gravityAccelaration];
        const gradSpringEnergy = MATH_MATRIX.Vector.zero(3);
        for (let spring of this.getSpringsConnectedToPosition(i)) {
          const qi_pk = q_i.subtractNew(this.getAnotherEndOfSpring(spring, i));
          const norm = qi_pk.norm();
          const gradSpringEnergy_wrt_qipk = qi_pk.multiplyNew(
            spring.springConstant * (1 - spring.restlength / norm)
          );
          gradSpringEnergy.add(gradSpringEnergy_wrt_qipk);
        }
        for (let j = 0; j < 3; j++)
          gradientOfEnergy.set(
            i * 3 + j,
            gradKineticEnergy._(j) +
              gradGravityEnergy[j] +
              gradSpringEnergy._(j)
          );
      }
      return gradientOfEnergy;
    }

    private getHessianOfEnergy(
      positions: MATH_MATRIX.Vector[]
    ): MATH_MATRIX.Matrix {
      const hessianKinetic = this.getHessianOfKineticEnergy(positions);
      const hessianSpring = this.getHessianOfSpringEnergy(positions);
      // modify hessian so that is positive definite
      return MATH_MATRIX.hessianModification(
        hessianKinetic.add(hessianSpring),
        undefined,
        1.001
      );
    }
    private getHessianOfKineticEnergy(
      positions: MATH_MATRIX.Vector[]
    ): MATH_MATRIX.Matrix {
      const hessian = MATH_MATRIX.Matrix.zero(
        positions.length * 3,
        positions.length * 3
      );
      for (let i = 0; i < hessian.height; i++)
        // x, y, and z
        for (let j = 0; j < 3; j++)
          hessian.set(
            3 * i + j,
            3 * i + j,
            this.masses[i] / (timestep * timestep)
          );
      return hessian;
    }
    /**
     * i th row's j th element of H is 3x3 matrix as follows
     * ```
     * dEs / dqj dqi =
     *  case1. j is connected to i
     *    - ki (I - ri/|qi-pj| (I - (qi-pj)(qi-pj)'/|qi-pj|^2) )
     *  case2. if j = i
     *    Sigma_j ki (I - ri/|qi-pj| (I - (qi-pj)(qi-pj)'/|qi-pj|^2) )
     *    = - Sigma_j (dEs/dqj dqi) (negative of sum of case 1)
     *  case3. all other elemtns are
     *    0
     * ```
     */
    private getHessianOfSpringEnergy(
      positions: MATH_MATRIX.Vector[]
    ): MATH_MATRIX.Matrix {
      const hessian = MATH_MATRIX.Matrix.zero(
        positions.length * 3,
        positions.length * 3
      );
      for (
        let positionIndexI = 0;
        positionIndexI < positions.length;
        positionIndexI++
      ) {
        // derivative w.r.t. connected points
        for (let spring of this.getSpringsConnectedToPosition(positionIndexI)) {
          const positionIndexJ =
            spring.position1Index === positionIndexI
              ? spring.position2Index
              : spring.position1Index;
          const [qi, qj] = [
            positions[positionIndexI],
            positions[positionIndexJ],
          ];
          const qi_pj = qi.subtractNew(qj);
          const norm = qi_pj.norm();
          const identity = MATH_MATRIX.Matrix.identity(3);
          const hessian_ij = identity
            .subtract(
              identity
                .subtractNew(
                  qi_pj.multiply(qi_pj.transposeNew()).multiply(1 / norm / norm)
                )
                .multiply(spring.restlength / norm)
            )
            .multiply(spring.springConstant);
          for (let row = 0; row < 3; row++)
            for (let column = 0; column < 3; column++) {
              const [rowI, columnJ] = [
                3 * positionIndexI + row,
                3 * positionIndexJ + column,
              ];
              hessian.set(rowI, columnJ, hessian_ij._(row, column));
              // not need to recalculate derivative w.r.t qi directly since it is sum of negative derivative w.r.t. pj added w.r.t. qi (see comment above)
              const columnI = 3 * positionIndexI + column;
              hessian.set(
                rowI,
                columnI,
                hessian._(rowI, columnI) - hessian_ij._(row, column)
              );
            }
        }
        // derivatiev w.r.t. qi itself
      }
      return hessian;
    }

    private getSpringsConnectedToPosition(positionIndex: number): Spring[] {
      return this.positionToSprings[positionIndex].map(
        (springIndex) => this.springs[springIndex]
      );
    }

    private sigma(from: number, to: number, fn: (k: number) => number): number {
      let sum = 0;
      for (let i = from; i < to; i++) {
        sum += fn(i);
      }
      return sum;
    }
  }
}
