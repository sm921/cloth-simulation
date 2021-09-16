/// <reference path="../helpers/math/matrix.ts" />
/// <reference path="../helpers/math/math.ts" />
/// <reference path="../helpers/algorithm/descent-method.ts" />

namespace SPRING2_SIMULALTOR {
  const gravityAccelaration = 9.8;
  const timestep = 0.03;

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

  export class Simulator {
    dynamicPositions: MATH_MATRIX.Vector;
    fixedPositions: MATH_MATRIX.Vector;
    /** masses of dynamic positions */
    masses: number[] = [];
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
      springConstants?: Float32Array
    ) {
      const [dynamicPositions, fixedPositions]: [number[], number[]] = [[], []];
      let [dynamicPositionIndex, fixedPositionIndex] = [0, 0];
      const [dynamicPositionIndices, fixedPositionIndices]: [
        number[],
        number[]
      ] = [[], []];
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
        if (!isFixedPosition) this.masses.push(masses[positionIndex]);
      }
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
        this.triesOrthogonalDirections
      );
      this.updateVelocities(previousPositions);
      // this.avoidSaddlePoint(previousPositions);
    }

    getPositionOfEndpointOfSpring(
      endpoint: EndpointOfSpring,
      of?: MATH_MATRIX.Vector
    ): MATH_MATRIX.Vector {
      return (
        endpoint.isFixed ? this.getFixedPosition : this.getDynamicPosition
      ).bind(this)(endpoint.index, of);
    }

    /** saddle point guard. replace zero elements of gradient when positions converges */
    triesOrthogonalDirections = 0;
    triedOrthogonalDirections = false;
    private avoidSaddlePoint(previousPositions: MATH_MATRIX.Vector): void {
      if (
        this.dynamicPositions.subtractNew(previousPositions).squaredNorm() <
        1e-6
      ) {
        if (!this.triesOrthogonalDirections) {
          this.triesOrthogonalDirections = 1;
          this.triedOrthogonalDirections = true;
        } else {
          // this.triesOrthogonalDirections = 0;
        }
      }
    }

    private energy(positions: MATH_MATRIX.Vector): number {
      const kineticEergy = MATH.sigma(
        0,
        positions.height / 3,
        (positionIndex) => {
          const [newPosition, currentPosition] = [
            this.getDynamicPosition(positionIndex, positions),
            this.getDynamicPosition(positionIndex),
          ];
          return (
            (0.5 / timestep / timestep) *
            this.masses[positionIndex] *
            newPosition
              .subtractNew(currentPosition)
              .subtract(this.getVelocity(positionIndex).multiplyNew(timestep))
              .squaredNorm()
          );
        }
      );
      const gravityEnergy = MATH.sigma(
        0,
        positions.height / 3,
        (positionIndex) =>
          gravityAccelaration * (positions._(positionIndex * 3 + 2) + 1e6)
      );
      const springEnergy = MATH.sigma(0, this.springs.length, (springIndex) => {
        const spring = this.springs[springIndex];
        const diff =
          this.getPositionOfEndpointOfSpring(spring.origin, positions)
            .subtractNew(
              this.getPositionOfEndpointOfSpring(spring.end, positions)
            )
            .norm() - spring.restlength;
        return 0.5 * spring.springConstant * diff * diff;
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

    private getVelocity(index: number): MATH_MATRIX.Vector {
      return new MATH_MATRIX.Vector([
        this.velocities._(index * 3),
        this.velocities._(index * 3 + 1),
        this.velocities._(index * 3 + 2),
      ]);
    }

    private gradient(positions: MATH_MATRIX.Vector): MATH_MATRIX.Vector {
      const gradient = MATH_MATRIX.Vector.zero(this.dynamicPositions.height);
      for (
        let positionIndex = 0;
        positionIndex < positions.height / 3;
        positionIndex++
      ) {
        const [position, oldPosition] = [
          this.getDynamicPosition(positionIndex, positions),
          this.getDynamicPosition(positionIndex),
        ];
        const kineticGradient = position
          .subtractNew(oldPosition)
          .subtractNew(this.getVelocity(positionIndex).multiplyNew(timestep))
          .multiplyNew(this.masses[positionIndex] / timestep / timestep);
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
          const qi_pk = position.subtractNew(
            this.getPositionOfEndpointOfSpring(
              connectedEndpoint,
              connectedEndpoint.isFixed ? this.fixedPositions : positions
            )
          );
          const norm = qi_pk.norm();
          const gradSpringEnergy_wrt_qipk = qi_pk.multiplyNew(
            spring.springConstant * (1 - spring.restlength / norm)
          );
          springGradient.add(gradSpringEnergy_wrt_qipk);
        }
        const totalGradient = kineticGradient
          .add(gravitationalGradient)
          .add(springGradient);
        for (let xyz = 0; xyz < 3; xyz++)
          gradient.set(positionIndex * 3 + xyz, totalGradient._(xyz));
      }
      return gradient;
    }

    private hessian(positions: MATH_MATRIX.Vector): MATH_MATRIX.Matrix {
      const kineticHessian = this.hessianKinetic(positions);
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
          const vecFromPointToConnectedPoint =
            point.subtractNew(connectedPoint);
          const norm = vecFromPointToConnectedPoint.norm();
          const identity = MATH_MATRIX.Matrix.identity(3);
          const hessian_ij = identity
            .subtract(
              identity
                .subtractNew(
                  vecFromPointToConnectedPoint
                    .multiply(vecFromPointToConnectedPoint.transposeNew())
                    .multiply(1 / norm / norm)
                )
                .multiply(spring.restlength / norm)
            )
            .multiply(spring.springConstant);
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

    private hessianKinetic(positions: MATH_MATRIX.Vector): MATH_MATRIX.Matrix {
      const hessian = MATH_MATRIX.Matrix.zero(
        positions.height,
        positions.height
      );
      for (let i = 0; i < hessian.height; i++)
        for (let j = 0; j < 3; j++)
          hessian.set(
            3 * i + j,
            3 * i + j,
            this.masses[i] / (timestep * timestep)
          );
      return hessian;
    }

    private updateVelocities(previousPositions: MATH_MATRIX.Vector): void {
      for (
        let positionIndex = 0;
        positionIndex < this.dynamicPositions.height / 3;
        positionIndex++
      ) {
        const velocity = this.getDynamicPosition(positionIndex)
          .subtractNew(
            this.getDynamicPosition(positionIndex, previousPositions)
          )
          .multiply(1 / timestep);
        for (let xyz = 0; xyz < 3; xyz++)
          this.velocities.set(positionIndex * 3 + xyz, velocity._(xyz));
      }
    }
  }
}
