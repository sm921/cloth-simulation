/// <reference path="../helpers/math/math.ts" />
/// <reference path="../helpers/math/math.ts" />
/// <reference path="../helpers/algorithm/descent-method.ts" />
/// <reference path="../helpers/algorithm/multigrid.ts" />
/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/physics/spring.ts" />
/// <reference path="../helpers/physics/kinetic.ts" />

namespace CLOTH_SIMULATOR {
  const gravityAccelaration = 9.8;
  const timestep = 0.1;

  type Spring = {
    originIndex: number;
    endIndex: number;
    restlength: number;
    springConstant: number;
  };

  /**
   * not the most accurate but relatively simple simulation of springs in this project
   */
  export class Simulator {
    positions: MATH.Vector;
    /** masses of positions */
    mass3: MATH.Vector;
    springs: Spring[] = [];
    /** map position index to array of strings connected to that position */
    springsConnectedTo: number[][];
    /** velocities of dynamic positions */
    velocities: MATH.Vector;
    /** whether position is fixed or not */
    isFixed: boolean[] = [];

    grids: Float32Array[];

    constructor(
      positions: number[],
      isFixed: (positionIndex: number) => boolean,
      springIndices: Vec2[],
      masses: Float32Array,
      restLengths?: Float32Array,
      springConstants?: Float32Array,
      /** from 0 to 1, the grater the heavier the mover becomes */
      public airResistance = 1,
      public groundHeight = 0,
      public constantOfRestitution = 0.9,
      public usesProjectiveDynamics = false
    ) {
      const [grids, interpolatinos, restrictions] = MULTIGRID.build(
        positions,
        2
      );
      this.grids = grids;
      this.positions = new MATH.Vector(positions);
      this.mass3 = MATH.Vector.zero(positions.length);
      this.velocities = MATH.Vector.zero(positions.length);
      for (let i = 0; i < positions.length; i++)
        for (let xyz = 0; xyz < 3; xyz++)
          this.mass3.set(3 * i + xyz, masses[i]);
      for (let i = 0; i < positions.length / 3; i++)
        this.isFixed[i] = isFixed(i);
      this.springsConnectedTo = Array(positions.length / 3);
      for (
        let springIndex = 0;
        springIndex < springIndices.length;
        springIndex++
      ) {
        const [originIndex, endIndex] = [0, 1].map(
          (originOrEnd) => springIndices[springIndex][originOrEnd]
        );
        this.springs.push({
          originIndex,
          endIndex,
          restlength:
            restLengths?.[springIndex] ??
            this.getPosition(originIndex)
              .subtractNew(this.getPosition(endIndex))
              .norm(),
          springConstant: springConstants?.[springIndex] ?? 1,
        });
        [originIndex, endIndex].forEach((endpointIndex) => {
          if (!this.springsConnectedTo[endpointIndex])
            this.springsConnectedTo[endpointIndex] = [];
          this.springsConnectedTo[endpointIndex].push(springIndex);
        });
      }
    }

    simulate(): void {
      const previousPositions = this.positions.clone();
      if (this.usesProjectiveDynamics) this.updateByProjectiveDynamics();
      else
        DESCENT_METHOD.updateByNewtonRaphson(
          this.positions,
          this.energy.bind(this),
          this.gradient.bind(this),
          this.hessian.bind(this),
          true
        );
      this.unmoveFixedPoints(previousPositions);
      this.velocities = this.positions
        .subtractNew(previousPositions)
        .multiplyScalar((1 / timestep) * (1 - this.airResistance));
      this.handleCollisions();
    }

    private energy(positions: MATH.Vector): number {
      const kineticEergy = PHYSICS_KINETIC.energyGain(
        positions,
        this.positions,
        this.velocities,
        timestep,
        this.mass3
      );
      const gravityEnergy = MATH.sigma(
        0,
        positions.height / 3,
        (positionIndex) =>
          gravityAccelaration * positions._(positionIndex * 3 + 2)
      );
      const springEnergy = MATH.sigma(0, this.springs.length, (springIndex) => {
        const spring = this.springs[springIndex];
        return PHYSICS_SPRING.energy(
          this.getPosition(spring.originIndex, positions),
          this.getPosition(spring.endIndex, positions),
          spring.restlength,
          spring.springConstant
        );
      });
      return kineticEergy + gravityEnergy + springEnergy;
    }

    private getConnectedEndpointTo(
      positionIndex: number,
      spring: Spring
    ): number {
      return spring.originIndex === positionIndex
        ? spring.endIndex
        : spring.originIndex;
    }

    getPosition(index: number, of?: MATH.Vector): MATH.Vector {
      return new MATH.Vector([
        (of ?? this.positions)._(index * 3),
        (of ?? this.positions)._(index * 3 + 1),
        (of ?? this.positions)._(index * 3 + 2),
      ]);
    }

    private getSpringsConnectedToPosition(positionIndex: number): Spring[] {
      return this.springsConnectedTo[positionIndex].map(
        (springIndex) => this.springs[springIndex]
      );
    }

    private gradient(positions: MATH.Vector): MATH.Vector {
      const gradient = MATH.Vector.zero(this.positions.height);
      const kineticGradient = PHYSICS_KINETIC.gradientEnergyGain(
        positions,
        this.positions,
        this.velocities,
        timestep,
        this.mass3
      );
      for (
        let positionIndex = 0;
        positionIndex < positions.height / 3;
        positionIndex++
      ) {
        const position = this.getPosition(positionIndex, positions);
        const gravitationalGradient = new MATH.Vector([
          0,
          0,
          this.mass3._(positionIndex * 3) * gravityAccelaration,
        ]);
        const springGradient = MATH.Vector.zero(3);
        for (let spring of this.getSpringsConnectedToPosition(positionIndex)) {
          const connectedEndpointIndex = this.getConnectedEndpointTo(
            positionIndex,
            spring
          );
          springGradient.add(
            PHYSICS_SPRING.energyGradient(
              position,
              this.getPosition(connectedEndpointIndex, positions),
              spring.restlength,
              spring.springConstant
            )
          );
        }
        const totalGradient = gravitationalGradient.add(springGradient);
        for (let xyz = 0; xyz < 3; xyz++)
          gradient.set(positionIndex * 3 + xyz, totalGradient._(xyz));
      }
      return gradient.add(kineticGradient);
    }

    private handleCollisions(): void {
      // against ground
      for (
        let positionIndex = 0;
        positionIndex < this.positions.height;
        positionIndex++
      ) {
        if (this.positions._(positionIndex * 3 + 2) < this.groundHeight) {
          this.positions.set(3 * positionIndex + 2, this.groundHeight);
          for (let xyz = 0; xyz < 3; xyz++)
            this.velocities.elements[3 * positionIndex + xyz] *=
              (xyz === 2 ? -1 : 1) * this.constantOfRestitution;
        }
      }
    }

    private hessian(positions: MATH.Vector): MATH.Matrix {
      const kineticHessian = PHYSICS_KINETIC.hessianEnergyGain(
        timestep,
        this.mass3
      );
      const springHessian = this.getHessianOfSpringEnergy(positions);
      return kineticHessian.add(springHessian);
    }

    private getHessianOfSpringEnergy(positions: MATH.Vector): MATH.Matrix {
      const hessian = MATH.Matrix.zero(positions.height, positions.height);
      for (
        let positionIndex = 0;
        positionIndex < positions.height / 3;
        positionIndex++
      ) {
        // derivative w.r.t. connected points
        for (let spring of this.getSpringsConnectedToPosition(positionIndex)) {
          const connectedEndpointIndex = this.getConnectedEndpointTo(
            positionIndex,
            spring
          );
          const [point, connectedPoint] = [
            this.getPosition(positionIndex, positions),
            this.getPosition(connectedEndpointIndex, positions),
          ];
          const hessian_ij = PHYSICS_SPRING.energyHessian(
            point,
            connectedPoint,
            spring.restlength,
            spring.springConstant
          );
          for (let row = 0; row < 3; row++)
            for (let column = 0; column < 3; column++) {
              const [rowI, columnJ] = [
                3 * positionIndex + row,
                3 * connectedEndpointIndex + column,
              ];
              // change of point does not contribute to derivative 'cause it does  not change
              if (!this.isFixed[connectedEndpointIndex])
                hessian.set(rowI, columnJ, hessian_ij._(row, column));
              // derivatiev w.r.t. qi itself
              // not need to recalculate derivative w.r.t qi directly since it is sum of negative derivative w.r.t. pj added w.r.t. qi (see comment above)
              const columnI = 3 * positionIndex + column;
              hessian.set(
                rowI,
                columnI,
                hessian._(rowI, columnI) - hessian_ij._(row, column)
              );
            }
        }
      }
      return hessian;
    }

    private unmoveFixedPoints(previousPositions: MATH.Vector): void {
      for (let i = 0; i < this.positions.height / 3; i++)
        for (let xyz = 0; xyz < 3; xyz++)
          if (this.isFixed[i])
            this.positions.set(3 * i + xyz, previousPositions._(3 * i + xyz));
    }

    /**
     * 3nx3n constant matrix
     * mass matrix multiplied by 1/h^2 */
    private Mh2!: MATH.Matrix;
    /** 3nx3n constant matrix (lower triangle positive definite)
     * L' = M/h^2 + Sigma_i (k_i * S_i^t A_i^t A_i S_i)
     * L = modify L' so that L is positive definite and let L be L'^t L'
     * see LHS of exp 10 in the paper
     */
    private L!: MATH.Matrix;
    /**
     * 3nx3 constant matrix
     * Sigma_i (k_i S_i^t A_i^t B_i)
     * see RHS of exp 10 in the paper
     */
    private kSAB: MATH.Matrix[] = [];

    private updateByProjectiveDynamics(): void {
      if (this.Mh2 === undefined) this.prefactorMatricesForProjectiveDynamics();
      this.localSolve();
      this.globalSolve();
    }

    // projective dynamics. for detail read section 3.3 of https://www.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf
    private prefactorMatricesForProjectiveDynamics(): void {
      /** 3n x 3n matrix (mass matrix devided by timestep^2) */
      this.Mh2 = MATH.Matrix.zero(this.positions.height, this.positions.height);
      for (let i = 0; i < this.Mh2.height; i++)
        this.Mh2.set(i, i, this.mass3._(i) / timestep / timestep);
      this.L = this.Mh2.clone();
      for (let spring of this.springs) {
        const k_i = spring.springConstant;
        /** 3x3n selection matrix of endpoints of an i th spring (see exp 10 in the paper)*/
        const S_i = MATH.Matrix.zero(3, this.positions.height);
        for (let xyz of [0, 1, 2]) {
          S_i.set(xyz, spring.originIndex * 3 + xyz, 1);
          S_i.set(xyz, spring.endIndex * 3 + xyz, -1);
        }
        /** 3x3 linear map matrix of endpoints of an i th spring  (see exp 10 in the paper)*/
        const A_i = new MATH.Matrix(0.5, 3, 3);
        /** 3x3 linear map matrix of auxiliary poiint of an i th spring  (see exp 10 in the paper)*/
        const B_i = A_i.clone();
        this.L.add(
          S_i.transpose()
            .multiply(A_i.transpose())
            .multiply(A_i)
            .multiply(S_i)
            .multiply(k_i)
        );
        this.kSAB.push(
          S_i.transpose()
            .multiply(A_i.transpose())
            .multiply(B_i)
            .multiplyScalar(k_i)
        );
      }
      this.L = MATH.hessianModification(this.L); // cholesky decomposition with modification
    }
    /** solve p_i for all springs (see exp 10 in the paper)
     * paper https://www.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf
     */
    private localSolve(): MATH.Vector[] {
      /* minimizing p is achieved by making p restlength vectors in directions of springs */
      const p: MATH.Vector[] = [];
      for (let spring of this.springs) {
        const [[x1, y1, z1], [x2, y2, z2]] = [
          spring.originIndex,
          spring.endIndex,
        ].map((springIndex) =>
          [0, 1, 2].map((xyz) => this.positions._(springIndex * 3 + xyz))
        );
        const springVector = new MATH.Vector([x1 - x2, y1 - y2, z1 - z2]);
        p.push(
          springVector.multiplyScalar(spring.restlength / springVector.norm())
        );
      }
      return p;
    }

    /**
     * paper https://www.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf
     */
    private globalSolve(): void {
      const g = MATH.Vector.zero(this.positions.height);
      for (let i = 0; i < g.height / 3; i++)
        g.set(3 * i + 2, -gravityAccelaration * this.mass3._(3 * i));
      // update q to sn (= qn + hvn + h^2M^-1fext)
      const sn = this.positions
        .add(this.velocities.multiplyScalarNew(timestep))
        .add(
          (this.Mh2.inverseNew() as MATH.Matrix).multiplyVector(
            g
          ) as MATH.Vector
        );
      // set MH2 sn
      const Mh2SnAddedBySigmakSABp = this.Mh2.multiplyVector(sn);
      /** auxiliary points. see exp 10 in the paper */
      const p = this.localSolve();
      /** RHS of exp 10 in the paper */
      for (let i = 0; i < p.length; i++)
        Mh2SnAddedBySigmakSABp.add(this.kSAB[i].multiplyVector(p[i]));
      this.positions.elements =
        MATH.Solver.cholesky(this.L, Mh2SnAddedBySigmakSABp.elements, true) ??
        this.positions.elements;
    }
  }
}
