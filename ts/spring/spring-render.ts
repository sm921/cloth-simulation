/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/render-helper.ts" />
/// <reference path="spring-simulator.ts" />

namespace SPRING_RENDER {
  let balls: THREE.Mesh[] = [];
  let lines: THREE.Line[] = [];
  let simulator: SPRING_SIMULALTOR.Simulator;

  export function clearLinesAndBalls(): void {
    RENDER_HELPER.clear(balls);
    RENDER_HELPER.clear(lines);
  }

  export function initSimulator(params: InitParams = {}) {
    const length = params.length ?? 80;
    const numberOfPoints =
      params.numberOfPoints ?? Math.max(2, Math.floor(length / 5));
    const mass = params.mass ?? 0.01;
    const restlength = params.restlength ?? length / numberOfPoints;
    simulator = new SPRING_SIMULALTOR.Simulator(
      range(numberOfPoints, 0, restlength)
        .map((num) => [num, 0, 40])
        .flat(),
      (positionIndex) => (params.fixedPoints ?? [0]).includes(positionIndex),
      params.connectedPoints ??
        range(numberOfPoints - 1, 0, 1).map((num) => [num, num + 1]),
      new Float32Array(arrayOf(mass, numberOfPoints)),
      new Float32Array(arrayOf(restlength, numberOfPoints)),
      new Float32Array(arrayOf(params.springConstant ?? 1, numberOfPoints)),
      0
    );
  }

  export function initLinesAndBalls() {
    simulator.springs.forEach((spring) => {
      const [origin, end] = [spring.origin, spring.end].map(
        (endpoint) => simulator.getPositionOfEndpointOfSpring(endpoint).elements
      );
      balls.push(RENDER_HELPER.addBall(origin[0], origin[1], origin[2]));
      balls.push(RENDER_HELPER.addBall(end[0], end[1], end[2]));
      lines.push(
        RENDER_HELPER.addLine(
          [origin[0], origin[1], origin[2]],
          [end[0], end[1], end[2]]
        )
      );
    });
  }

  export function render() {
    initSimulator();
    RENDER_HELPER.render({
      cameraParams: { position: [0, -100, 2] },
      simulate: () => {
        simulator.simulate();
        simulator.springs.forEach((spring, i) => {
          const [origin, end] = [spring.origin, spring.end].map(
            (endpoint) =>
              simulator.getPositionOfEndpointOfSpring(endpoint).elements
          );
          const [ball1, ball2] = [balls[2 * i], balls[2 * i + 1]];
          ball1.position.set(origin[0], origin[1], origin[2]);
          ball2.position.set(end[0], end[1], end[2]);
          lines[i].geometry.setFromPoints([
            new THREE.Vector3(origin[0], origin[1], origin[2]),
            new THREE.Vector3(end[0], end[1], end[2]),
          ]);
        });
      },
      initModel: () => {
        RENDER_HELPER.addPlane(1000, 1000, { position: [0, 0, -100] });
        initLinesAndBalls();
      },
    });
  }

  function arrayOf(value: number, size: number): number[] {
    return [...Array(size)].map((_) => value);
  }
  function range(size: number, from: number, step: number): number[] {
    return [...Array(size)].map((_, i) => from + i * step);
  }

  export interface InitParams {
    /** indices of 2 endpoints of springs */
    connectedPoints?: Vec2[];
    /** indices of fixed points */
    fixedPoints?: number[];
    length?: number;
    numberOfPoints?: number;
    mass?: number;
    restlength?: number;
    springConstant?: number;
  }
}
