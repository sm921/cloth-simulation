/// <reference path="../helpers/math/matrix.ts" />
/// <reference path="../helpers/math/math.ts" />
/// <reference path="../helpers/algorithm/descent-method.ts" />
/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/physics/spring.ts" />
/// <reference path="../helpers/physics/kinetic.ts" />

namespace SPRING_SIMULALTOR {
  const gravityAccelaration = 9.8;
  const timestep = 0.1;

  type EndpointOfSpring = {
    /** index for positions array */
    index: number;
    /** specifies which array is refered, dynamiPositions or fixedPositions */
    isFixed: boolean;
  };
  type Spring = {
    origin: EndpointOfSpring;
    end: EndpointOfSpring;
    restlength: number;
    springConstant: number;
  };

  /**
   * the most accurate simulation of springs in this project
   */
  export class Simulator {
    dynamicPositions: MATH_MATRIX.Vector;
    fixedPositions: MATH_MATRIX.Vector;
    /** masses of dynamic positions */
    masses: number[] = [];
    mass3: MATH_MATRIX.Vector;
    springs: Spring[] = [];
    /** map dynamic position index to array of strings connected to that position */
    springsConnectedTo: number[][];
    /** velocities of dynamic positions */
    velocities: MATH_MATRIX.Vector;

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
      const [dynamicPositions, fixedPositions]: [number[], number[]] = [[], []];
      let [dynamicPositionIndex, fixedPositionIndex] = [0, 0];
      const [dynamicPositionIndices, fixedPositionIndices, mass3]: [
        number[],
        number[],
        number[]
      ] = [[], [], []];
      for (
        let positionIndex = 0;
        positionIndex < positions.length / 3;
        positionIndex++
      ) {
        const isFixedPosition = isFixed(positionIndex);
        (isFixedPosition ? fixedPositions : dynamicPositions).push(
          positions[3 * positionIndex],
          positions[3 * positionIndex + 1],
          positions[3 * positionIndex + 2]
        );
        dynamicPositionIndices.push(
          isFixedPosition ? -1 : dynamicPositionIndex++
        );
        fixedPositionIndices.push(isFixedPosition ? fixedPositionIndex++ : -1);
        if (!isFixedPosition) {
          const mass = masses[positionIndex];
          this.masses.push(mass);
          mass3.push(mass, mass, mass);
        }
      }
      this.mass3 = new MATH_MATRIX.Vector(mass3);
      this.dynamicPositions = new MATH_MATRIX.Vector(dynamicPositions);
      this.fixedPositions = new MATH_MATRIX.Vector(fixedPositions);
      this.velocities = MATH_MATRIX.Vector.zero(dynamicPositions.length);

      this.springsConnectedTo = Array(dynamicPositions.length / 3);
      for (
        let springIndex = 0;
        springIndex < springIndices.length;
        springIndex++
      ) {
        const springEndpoints = [0, 1]
          .map((originOrEnd) => springIndices[springIndex][originOrEnd])
          .map((positionIndex) => {
            const _isFixed = isFixed(positionIndex);
            return {
              index: (_isFixed ? fixedPositionIndices : dynamicPositionIndices)[
                positionIndex
              ],
              isFixed: _isFixed,
            };
          });
        this.springs.push({
          origin: springEndpoints[0],
          end: springEndpoints[1],
          restlength:
            restLengths?.[springIndex] ??
            this.getPositionOfEndpointOfSpring(springEndpoints[0])
              .subtractNew(
                this.getPositionOfEndpointOfSpring(springEndpoints[1])
              )
              .norm(),
          springConstant: springConstants?.[springIndex] ?? 1,
        });
        springEndpoints.forEach((endpoint) => {
          if (endpoint.isFixed) return;
          if (!this.springsConnectedTo[endpoint.index])
            this.springsConnectedTo[endpoint.index] = [];
          this.springsConnectedTo[endpoint.index].push(springIndex);
        });
      }
    }

    simulate(): void {
      const previousPositions = this.dynamicPositions.clone();
      DESCENT_METHOD.updateByNewtonRaphson(
        this.dynamicPositions,
        this.energy.bind(this),
        this.gradient.bind(this),
        this.hessian.bind(this),
        true
      );
      this.velocities = this.dynamicPositions
        .subtractNew(previousPositions)
        .multiplyScalar((1 / timestep) * (1 - this.airResistance));
      this.handleCollisions();
    }

    getPositionOfEndpointOfSpring(
      endpoint: EndpointOfSpring,
      of?: MATH_MATRIX.Vector
    ): MATH_MATRIX.Vector {
      return (
        endpoint.isFixed ? this.getFixedPosition : this.getDynamicPosition
      ).bind(this)(endpoint.index, of);
    }

    private energy(positions: MATH_MATRIX.Vector): number {
      const kineticEergy = PHYSICS_KINETIC.energyGain(
        positions,
        this.dynamicPositions,
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
          this.getPositionOfEndpointOfSpring(spring.origin, positions),
          this.getPositionOfEndpointOfSpring(spring.end, positions),
          spring.restlength,
          spring.springConstant
        );
      });
      return kineticEergy + gravityEnergy + springEnergy;
    }

    private getConnectedEndpointTo(
      positionIndex: number,
      spring: Spring
    ): EndpointOfSpring {
      return spring.origin.isFixed
        ? spring.origin // since at least one of tow endpoints must be dynamic
        : spring.end.isFixed
        ? spring.end // since at least one of tow endpoints must be dynamic
        : spring.origin.index === positionIndex
        ? spring.end // since two endpoints cam not be the same point
        : spring.origin;
    }

    private getDynamicPosition(
      index: number,
      of?: MATH_MATRIX.Vector
    ): MATH_MATRIX.Vector {
      return new MATH_MATRIX.Vector([
        (of ?? this.dynamicPositions)._(index * 3),
        (of ?? this.dynamicPositions)._(index * 3 + 1),
        (of ?? this.dynamicPositions)._(index * 3 + 2),
      ]);
    }

    private getFixedPosition(
      index: number,
      of?: MATH_MATRIX.Vector
    ): MATH_MATRIX.Vector {
      return new MATH_MATRIX.Vector([
        (of ?? this.fixedPositions)._(index * 3),
        (of ?? this.fixedPositions)._(index * 3 + 1),
        (of ?? this.fixedPositions)._(index * 3 + 2),
      ]);
    }

    private getSpringsConnectedToPosition(positionIndex: number): Spring[] {
      return this.springsConnectedTo[positionIndex].map(
        (springIndex) => this.springs[springIndex]
      );
    }

    private gradient(positions: MATH_MATRIX.Vector): MATH_MATRIX.Vector {
      const gradient = MATH_MATRIX.Vector.zero(this.dynamicPositions.height);
      const kineticGradient = PHYSICS_KINETIC.gradientEnergyGain(
        positions,
        this.dynamicPositions,
        this.velocities,
        timestep,
        this.mass3
      );
      for (
        let positionIndex = 0;
        positionIndex < positions.height / 3;
        positionIndex++
      ) {
        const position = this.getDynamicPosition(positionIndex, positions);
        const gravitationalGradient = new MATH_MATRIX.Vector([
          0,
          0,
          this.masses[positionIndex] * gravityAccelaration,
        ]);
        const springGradient = MATH_MATRIX.Vector.zero(3);
        for (let spring of this.getSpringsConnectedToPosition(positionIndex)) {
          const connectedEndpoint = this.getConnectedEndpointTo(
            positionIndex,
            spring
          );
          springGradient.add(
            PHYSICS_SPRING.energyGradient(
              position,
              this.getPositionOfEndpointOfSpring(
                connectedEndpoint,
                connectedEndpoint.isFixed ? this.fixedPositions : positions
              ),
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
        positionIndex < this.dynamicPositions.height;
        positionIndex++
      ) {
        if (
          this.dynamicPositions._(positionIndex * 3 + 2) < this.groundHeight
        ) {
          this.dynamicPositions.set(3 * positionIndex + 2, this.groundHeight);
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
          const connectedEndpoint = this.getConnectedEndpointTo(
            positionIndex,
            spring
          );
          const [point, connectedPoint] = [
            this.getDynamicPosition(positionIndex, positions),
            this.getPositionOfEndpointOfSpring(
              connectedEndpoint,
              connectedEndpoint.isFixed ? this.fixedPositions : positions
            ),
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
                3 * connectedEndpoint.index + column,
              ];
              // change of point does not contribute to derivative 'cause it does  not change
              if (!connectedEndpoint.isFixed)
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
  }
}
