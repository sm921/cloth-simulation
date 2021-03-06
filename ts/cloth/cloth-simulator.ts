import { Vec2, Vector } from "../helpers/math/vector";
import { Multigrid } from "../helpers/algorithm/multigrid";
import { sigma } from "../helpers/math/other";
import { Matrix } from "../helpers/math/matrix";
import { Solver } from "../helpers/math/solver";
import {
  updateByNewtonMultigrid,
  updateByNewtonRaphson,
} from "../helpers/algorithm/descent-method";
import { Kinetic } from "../helpers/physics/kinetic";
import { Spring } from "../helpers/physics/spring";
import { hessianModification } from "../helpers/math/matrix-modification";

const gravityAccelaration = 9.8;
const fixPointConstant = 1e4;

export enum Mode {
  Newton,
  ProjectiveDynamics,
  Multigrid,
}

type SpringData = {
  originIndex: number;
  endIndex: number;
  restlength: number;
  springConstant: number;
};

/**
 * not the most accurate but relatively simple simulation of springs in this project
 */
export class Simulator {
  positions: Vector;
  originalPositions: Vector;
  /** masses of positions */
  mass3: Vector;
  springs: SpringData[] = [];
  /** map position index to array of strings connected to that position */
  springsConnectedTo: number[][];
  /** velocities of dynamic positions */
  velocities: Vector;
  /** whether position is fixed or not */
  isFixed: boolean[] = [];
  timestep: number;

  multigrid: Multigrid;

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
    public mode = Mode.Newton
  ) {
    this.multigrid = new Multigrid(positions, 2, 6);
    this.positions = new Vector(positions);
    this.originalPositions = this.positions.clone();
    this.mass3 = Vector.zero(positions.length);
    this.velocities = Vector.zero(positions.length);
    for (let i = 0; i < positions.length; i++)
      for (let xyz = 0; xyz < 3; xyz++) this.mass3.set(3 * i + xyz, masses[i]);
    for (let i = 0; i < positions.length / 3; i++) this.isFixed[i] = isFixed(i);
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
    switch (this.mode) {
      case Mode.Multigrid:
        this.timestep = 0.1;
        break;
      case Mode.Newton:
      case Mode.ProjectiveDynamics:
        this.timestep = 0.1;
    }
  }

  simulate(): void {
    const previousPositions = this.positions.clone();
    switch (this.mode) {
      case Mode.ProjectiveDynamics:
        this.updateByProjectiveDynamics();
        this.unmoveFixedPoints(previousPositions);
        break;
      case Mode.Newton:
        updateByNewtonRaphson(
          this.positions,
          this.energy.bind(this),
          this.gradient.bind(this),
          this.hessian.bind(this),
          true
        );
        break;
      case Mode.Multigrid:
        updateByNewtonMultigrid(
          this.multigrid,
          this.positions,
          this.gradient.bind(this),
          this.hessian.bind(this),
          this.velocities,
          this.timestep
        );
        this.unmoveFixedPoints(previousPositions);
        break;
    }
    this.velocities = this.positions
      .subtractNew(previousPositions)
      .multiplyScalar((1 / this.timestep) * (1 - this.airResistance));
    this.handleCollisions();
  }

  private energy(positions: Vector): number {
    const kineticEergy = Kinetic.energyGain(
      positions,
      this.positions,
      this.velocities,
      this.timestep,
      this.mass3
    );
    const gravityEnergy = sigma(
      0,
      positions.height / 3,
      (positionIndex) =>
        gravityAccelaration * positions._(positionIndex * 3 + 2)
    );
    const springEnergy = sigma(0, this.springs.length, (springIndex) => {
      const spring = this.springs[springIndex];
      return Spring.energy(
        this.getPosition(spring.originIndex, positions),
        this.getPosition(spring.endIndex, positions),
        spring.restlength,
        spring.springConstant
      );
    });
    const fixPointEnergy = sigma(
      0,
      this.positions.height / 3,
      (positionIndex) =>
        this.isFixed[positionIndex]
          ? 0.5 *
            fixPointConstant *
            this.getPosition(positionIndex)
              .subtractNew(
                this.getPosition(positionIndex, this.originalPositions)
              )
              .squaredNorm()
          : 0
    );
    return kineticEergy + gravityEnergy + springEnergy + fixPointEnergy;
  }

  private getConnectedEndpointTo(
    positionIndex: number,
    spring: SpringData
  ): number {
    return spring.originIndex === positionIndex
      ? spring.endIndex
      : spring.originIndex;
  }

  getPosition(index: number, of?: Vector): Vector {
    return new Vector([
      (of ?? this.positions)._(index * 3),
      (of ?? this.positions)._(index * 3 + 1),
      (of ?? this.positions)._(index * 3 + 2),
    ]);
  }

  private getSpringsConnectedToPosition(positionIndex: number): SpringData[] {
    return this.springsConnectedTo[positionIndex].map(
      (springIndex) => this.springs[springIndex]
    );
  }

  private gradient(positions: Vector): Vector {
    const gradient = Vector.zero(this.positions.height);
    const kineticGradient = Kinetic.gradientEnergyGain(
      positions,
      this.positions,
      this.velocities,
      this.timestep,
      this.mass3
    );
    for (
      let positionIndex = 0;
      positionIndex < positions.height / 3;
      positionIndex++
    ) {
      const position = this.getPosition(positionIndex, positions);
      const gravitationalGradient = new Vector([
        0,
        0,
        this.mass3._(positionIndex * 3) * gravityAccelaration,
      ]);
      const springGradient = Vector.zero(3);
      for (let spring of this.getSpringsConnectedToPosition(positionIndex)) {
        const connectedEndpointIndex = this.getConnectedEndpointTo(
          positionIndex,
          spring
        );
        springGradient.add(
          Spring.energyGradient(
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
    const fixPointGradient = Vector.zero(this.positions.height);
    for (let i = 0; i < fixPointGradient.height / 3; i++) {
      if (this.isFixed[i]) {
        const grad = this.getPosition(i)
          .subtract(this.getPosition(i, this.originalPositions))
          .multiplyScalar(fixPointConstant * 0.5);
        for (let xyz = 0; xyz < 3; xyz++)
          fixPointGradient.set(i * 3 + xyz, grad._(xyz));
      }
    }
    return gradient.add(kineticGradient).add(fixPointGradient);
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

  private hessian(positions: Vector): Matrix {
    const kineticHessian = Kinetic.hessianEnergyGain(this.timestep, this.mass3);
    const springHessian = this.getHessianOfSpringEnergy(positions);
    const fixPointHessian = Matrix.zero(
      this.positions.height,
      this.positions.height
    );
    for (
      let pointIndex = 0;
      pointIndex < this.positions.height / 3;
      pointIndex++
    ) {
      if (this.isFixed[pointIndex])
        for (let row = 0; row < 3; row++)
          fixPointHessian.set(
            3 * pointIndex + row,
            3 * pointIndex + row,
            fixPointConstant
          );
    }
    return kineticHessian.add(springHessian).add(fixPointHessian);
  }

  private getHessianOfSpringEnergy(positions: Vector): Matrix {
    const hessian = Matrix.zero(positions.height, positions.height);
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
        const hessian_ij = Spring.energyHessian(
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

  private unmoveFixedPoints(previousPositions: Vector): void {
    for (let i = 0; i < this.positions.height / 3; i++)
      for (let xyz = 0; xyz < 3; xyz++)
        if (this.isFixed[i])
          this.positions.set(3 * i + xyz, previousPositions._(3 * i + xyz));
  }

  /**
   * 3nx3n constant matrix
   * mass matrix multiplied by 1/h^2 */
  private Mh2!: Matrix;
  /** 3nx3n constant matrix (lower triangle positive definite)
   * L' = M/h^2 + Sigma_i (k_i * S_i^t A_i^t A_i S_i)
   * L = modify L' so that L is positive definite and let L be L'^t L'
   * see LHS of exp 10 in the paper
   */
  private L!: Matrix;
  /**
   * 3nx3 constant matrix
   * Sigma_i (k_i S_i^t A_i^t B_i)
   * see RHS of exp 10 in the paper
   */
  private kSAB: Matrix[] = [];

  private updateByProjectiveDynamics(): void {
    if (this.Mh2 === undefined) this.prefactorMatricesForProjectiveDynamics();
    this.localSolve();
    this.globalSolve();
  }

  // projective dynamics. for detail read section 3.3 of https://www.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf
  private prefactorMatricesForProjectiveDynamics(): void {
    /** 3n x 3n matrix (mass matrix devided by timestep^2) */
    this.Mh2 = Matrix.zero(this.positions.height, this.positions.height);
    for (let i = 0; i < this.Mh2.height; i++)
      this.Mh2.set(i, i, this.mass3._(i) / this.timestep / this.timestep);
    this.L = this.Mh2.clone();
    for (let spring of this.springs) {
      const k_i = spring.springConstant;
      /** 3x3n selection matrix of endpoints of an i th spring (see exp 10 in the paper)*/
      const S_i = Matrix.zero(3, this.positions.height);
      for (let xyz of [0, 1, 2]) {
        S_i.set(xyz, spring.originIndex * 3 + xyz, 1);
        S_i.set(xyz, spring.endIndex * 3 + xyz, -1);
      }
      /** 3x3 linear map matrix of endpoints of an i th spring  (see exp 10 in the paper)*/
      const A_i = new Matrix(0.5, 3, 3);
      /** 3x3 linear map matrix of auxiliary poiint of an i th spring  (see exp 10 in the paper)*/
      const B_i = A_i.clone();
      this.L.add(
        S_i.transpose()
          .multiply(A_i.transpose())
          .multiply(A_i)
          .multiply(S_i)
          .multiplyScalar(k_i)
      );
      this.kSAB.push(
        S_i.transpose()
          .multiply(A_i.transpose())
          .multiply(B_i)
          .multiplyScalar(k_i)
      );
    }
    this.L = hessianModification(this.L); // cholesky decomposition with modification
  }
  /** solve p_i for all springs (see exp 10 in the paper)
   * paper https://www.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf
   */
  private localSolve(): Vector[] {
    /* minimizing p is achieved by making p restlength vectors in directions of springs */
    const p: Vector[] = [];
    for (let spring of this.springs) {
      const [[x1, y1, z1], [x2, y2, z2]] = [
        spring.originIndex,
        spring.endIndex,
      ].map((springIndex) =>
        [0, 1, 2].map((xyz) => this.positions._(springIndex * 3 + xyz))
      );
      const springVector = new Vector([x1 - x2, y1 - y2, z1 - z2]);
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
    const g = Vector.zero(this.positions.height);
    for (let i = 0; i < g.height / 3; i++)
      g.set(3 * i + 2, -gravityAccelaration * this.mass3._(3 * i));
    // update q to sn (= qn + hvn + h^2M^-1fext)
    const sn = this.positions
      .add(this.velocities.multiplyScalarNew(this.timestep))
      .add(
        (this.Mh2.inverseNew() as Matrix).multiplyVector(g, Vector) as Vector
      );
    // set MH2 sn
    const Mh2SnAddedBySigmakSABp = this.Mh2.multiplyVector(sn, Vector);
    /** auxiliary points. see exp 10 in the paper */
    const p = this.localSolve();
    /** RHS of exp 10 in the paper */
    for (let i = 0; i < p.length; i++)
      Mh2SnAddedBySigmakSABp.add(this.kSAB[i].multiplyVector(p[i], Vector));
    this.positions.elements =
      Solver.cholesky(this.L, Mh2SnAddedBySigmakSABp.elements, true) ??
      this.positions.elements;
  }
}
