/// <reference path="../helpers/math/matrix.ts" />
/// <reference path="../helpers/math/math.ts" />
/// <reference path="../helpers/algorithm/descent-method.ts" />
/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/physics/spring.ts" />
/// <reference path="../helpers/physics/kinetic.ts" />

namespace SPRING_SIMULALTOR_TRUE {
  const gravityAccelaration = 9.8;
  const timestep = 0.1;

  type Spring = {
    originIndex: number;
    endIndex: number;
    restlength: number;
    springConstant: number;
  };

  /**
   * the most accurate simulation of springs in this project
   */
  export class SimulatorTrue {
    positions: MATH_MATRIX.Vector;
    /** masses of positions */
    mass3: MATH_MATRIX.Vector;
    springs: Spring[] = [];
    /** map position index to array of strings connected to that position */
    springsConnectedTo: number[][];
    /** velocities of dynamic positions */
    velocities: MATH_MATRIX.Vector;
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
      this.positions = new MATH_MATRIX.Vector(positions);
      this.mass3 = MATH_MATRIX.Vector.zero(positions.length);
      this.velocities = MATH_MATRIX.Vector.zero(positions.length);
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

    private energy(positions: MATH_MATRIX.Vector): number {
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

    getPosition(index: number, of?: MATH_MATRIX.Vector): MATH_MATRIX.Vector {
      return new MATH_MATRIX.Vector([
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

    private gradient(positions: MATH_MATRIX.Vector): MATH_MATRIX.Vector {
      const gradient = MATH_MATRIX.Vector.zero(this.positions.height);
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
        const gravitationalGradient = new MATH_MATRIX.Vector([
          0,
          0,
          this.mass3._(positionIndex * 3) * gravityAccelaration,
        ]);
        const springGradient = MATH_MATRIX.Vector.zero(3);
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

    private hessian(positions: MATH_MATRIX.Vector): MATH_MATRIX.Matrix {
      const kineticHessian = PHYSICS_KINETIC.hessianEnergyGain(
        timestep,
        this.mass3
      );
      const springHessian = this.getHessianOfSpringEnergy(positions);
      return kineticHessian.add(springHessian);
    }

    private getHessianOfSpringEnergy(
      positions: MATH_MATRIX.Vector
    ): MATH_MATRIX.Matrix {
      const hessian = MATH_MATRIX.Matrix.zero(
        positions.height,
        positions.height
      );
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

    private unmoveFixedPoints(previousPositions: MATH_MATRIX.Vector): void {
      for (let i = 0; i < this.positions.height / 3; i++)
        for (let xyz = 0; xyz < 3; xyz++)
          if (this.isFixed[i])
            this.positions.set(3 * i + xyz, previousPositions._(3 * i + xyz));
    }
  }
}
