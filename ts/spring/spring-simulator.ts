import { updateByNewtonRaphson } from "../helpers/algorithm/descent-method";
import { Matrix } from "../helpers/math/matrix";
import { sigma } from "../helpers/math/other";
import { Vec2, Vector } from "../helpers/math/vector";
import { Kinetic } from "../helpers/physics/kinetic";
import { Spring } from "../helpers/physics/spring";

const gravityAccelaration = 9.8;
const timestep = 0.1;

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
  /** masses of positions */
  mass3: Vector;
  springs: SpringData[] = [];
  /** map position index to array of strings connected to that position */
  springsConnectedTo: number[][];
  /** velocities of dynamic positions */
  velocities: Vector;
  /** whether position is fixed or not */
  isFixed: boolean[] = [];

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
    public constantOfRestitution = 0.9
  ) {
    this.positions = new Vector(positions);
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
  }

  simulate(): void {
    const previousPositions = this.positions.clone();
    updateByNewtonRaphson(
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

  private energy(positions: Vector): number {
    const kineticEergy = Kinetic.energyGain(
      positions,
      this.positions,
      this.velocities,
      timestep,
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
    return kineticEergy + gravityEnergy + springEnergy;
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
      timestep,
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

  private hessian(positions: Vector): Matrix {
    const kineticHessian = Kinetic.hessianEnergyGain(timestep, this.mass3);
    const springHessian = this.getHessianOfSpringEnergy(positions);
    return kineticHessian.add(springHessian);
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
}
