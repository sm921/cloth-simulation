import { Line, Mesh, Vector3 } from "three";
import { arrayOf, range } from "../helpers/math/other";
import { Vec2 } from "../helpers/math/vector";
import {
  addBall,
  addLine,
  addPlane,
  clear,
  renderHelper,
} from "../helpers/render-helper";
import { Simulator } from "./spring-simulator";

let balls: Mesh[] = [];
const groundHeight = -100;
let lines: Line[] = [];
let simulator: Simulator;

export function clearLinesAndBalls(): void {
  clear(balls);
  clear(lines);
}

export function initSimulator(params: InitParams = {}) {
  const length = params.length ?? 80;
  const numberOfPoints =
    params.numberOfPoints ?? Math.max(2, Math.floor(length / 5));
  const mass = params.mass ?? 0.01;
  const restlength = params.restlength ?? length / numberOfPoints;
  simulator = new Simulator(
    range(numberOfPoints, 0, length / numberOfPoints)
      .map((num) => [num, 0, 40])
      .flat(),
    (positionIndex) => (params.fixedPoints ?? [0]).includes(positionIndex),
    params.connectedPoints ??
      range(numberOfPoints - 1, 0, 1).map((num) => [num, num + 1]),
    new Float32Array(arrayOf(mass, numberOfPoints)),
    new Float32Array(arrayOf(restlength, numberOfPoints)),
    new Float32Array(arrayOf(params.springConstant ?? 1, numberOfPoints)),
    0,
    groundHeight,
    params.constantOfRestitution
  );
}

export function initLinesAndBalls() {
  simulator.springs.forEach((spring) => {
    const [origin, end] = [spring.originIndex, spring.endIndex].map(
      (endpoint) => simulator.getPosition(endpoint).elements
    );
    balls.push(addBall(origin[0], origin[1], origin[2]));
    balls.push(addBall(end[0], end[1], end[2]));
    lines.push(
      addLine([origin[0], origin[1], origin[2]], [end[0], end[1], end[2]])
    );
  });
}

export function render() {
  initSimulator();
  renderHelper({
    cameraParams: { position: [0, groundHeight, 2] },
    simulate: () => {
      simulator.simulate();
      simulator.springs.forEach((spring, i) => {
        const [origin, end] = [spring.originIndex, spring.endIndex].map(
          (endpoint) => simulator.getPosition(endpoint).elements
        );
        const [ball1, ball2] = [balls[2 * i], balls[2 * i + 1]];
        ball1.position.set(origin[0], origin[1], origin[2]);
        ball2.position.set(end[0], end[1], end[2]);
        lines[i].geometry.setFromPoints([
          new Vector3(origin[0], origin[1], origin[2]),
          new Vector3(end[0], end[1], end[2]),
        ]);
      });
    },
    initModel: () => {
      addPlane(1000, 1000, { position: [0, 0, groundHeight] });
      initLinesAndBalls();
    },
  });
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
  constantOfRestitution?: number;
}
