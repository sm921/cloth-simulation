import { Mode, Simulator } from "./cloth-simulator";
import {
  addBall,
  addLine,
  addPlane,
  clear,
  renderHelper,
} from "../helpers/render-helper";
import { arrayOf } from "../helpers/math/other";
import { Vec2 } from "../helpers/math/vector";
import { Line, Mesh, Vector3 } from "three";

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
  const numberOfPoints = params.numberOfPoints ?? 10;
  const mass = params.mass ?? 0.01;
  const restlength = length / (numberOfPoints - 1);
  const [positions, springs] = initPositions(
    length,
    length,
    restlength
    // params.mode === Mode.Multigrid ? true : false
  );
  simulator = new Simulator(
    positions,
    (positionIndex) =>
      (
        params.fixedPoints ?? [
          // left edge
          // 0,
          Math.sqrt(positions.length / 3) - 1,
          // right edge
          // numberOfPoints * (numberOfPoints - 1),
          positions.length / 3 - 1,
        ]
      ).includes(positionIndex),
    springs,
    new Float32Array(arrayOf(mass, positions.length)),
    new Float32Array(arrayOf(restlength, springs.length)),
    new Float32Array(arrayOf(params.springConstant ?? 1, springs.length)),
    50 / (length * length),
    groundHeight,
    params.constantOfRestitution ?? 0.1,
    params.mode
  );
}

function initPositions(
  width: number,
  height: number,
  restlength: number,
  isRandomHeight = false
): [number[], Vec2[]] {
  const positions: number[] = [];
  const springs: Vec2[] = [];
  const [widthMaxIndex, heightMaxIndex] = [width, height].map((length) =>
    Math.ceil(length / restlength)
  );
  // create a square cloth
  for (let widthIndex = 0; widthIndex <= widthMaxIndex; widthIndex++) {
    const x = widthIndex * restlength;
    for (let heightIndex = 0; heightIndex <= heightMaxIndex; heightIndex++) {
      const y = heightIndex * restlength;
      positions.push(x, y, isRandomHeight ? Math.random() * 40 : 40);
    }
  }
  const getPositionIndex = (widthIndex: number, heightIndex: number): number =>
    (heightMaxIndex + 1) * widthIndex + heightIndex;
  // create springs that connect all the possible adjacent positions
  // store created springs to avoid duplication
  const alreadyCreatedSpring = Array(
    (widthMaxIndex + 1) * (heightMaxIndex + 1)
  );
  for (let i = 0; i < alreadyCreatedSpring.length; i++)
    alreadyCreatedSpring[i] = Array(heightMaxIndex + 1);
  for (let widthIndex = 0; widthIndex <= widthMaxIndex; widthIndex++) {
    for (let heightIndex = 0; heightIndex <= heightMaxIndex; heightIndex++) {
      const positionIndex = getPositionIndex(widthIndex, heightIndex);
      for (let springDirection of [
        [1, 0],
        [0, 1],
      ]) {
        const [nextWidthIndex, nextHeightIndex] = [widthIndex, heightIndex].map(
          (index, i) => index + springDirection[i]
        );
        if (
          nextWidthIndex < 0 ||
          nextWidthIndex > widthMaxIndex ||
          nextHeightIndex < 0 ||
          nextHeightIndex > heightMaxIndex
        )
          continue;
        const nextPositionIndex = getPositionIndex(
          widthIndex + springDirection[0],
          heightIndex + springDirection[1]
        );
        if (
          positions[nextPositionIndex * 3] !== undefined &&
          alreadyCreatedSpring[positionIndex][nextPositionIndex] ===
            undefined &&
          alreadyCreatedSpring[nextPositionIndex][positionIndex] === undefined
        ) {
          springs.push([positionIndex, nextPositionIndex]);
          alreadyCreatedSpring[positionIndex][nextPositionIndex] = true;
          alreadyCreatedSpring[nextPositionIndex][positionIndex] = true;
        }
      }
    }
  }
  return [positions, springs];
}

export function initLinesAndBalls() {
  simulator.springs.forEach((spring) => {
    const [origin, end] = [spring.originIndex, spring.endIndex].map(
      (endpoint) => simulator.getPosition(endpoint).elements
    );
    balls.push(
      addBall(
        origin[0],
        origin[1],
        origin[2],
        simulator.multigrid.grids[1].includes(spring.originIndex)
          ? 0xff0000
          : 0x0000ff
      )
    );
    balls.push(
      addBall(
        end[0],
        end[1],
        end[2],
        simulator.multigrid.grids[1].includes(spring.endIndex)
          ? 0xff0000
          : 0x0000ff
      )
    );
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
  mode?: Mode;
}
