import { range } from "../helpers/math/other";
import {
  addBtn,
  addInputNumber,
  addInputText,
  addLinebreak,
  init,
} from "../helpers/ui";
import {
  clearLinesAndBalls,
  initLinesAndBalls,
  InitParams,
  initSimulator,
  render,
} from "./spring-render";

let params: InitParams = {
  springConstant: 1,
  numberOfPoints: 16,
  length: 80,
  mass: 1e-2,
  restlength: 5,
  fixedPoints: [0],
  connectedPoints: range(15).map((i) => [i, i + 1]),
  constantOfRestitution: 0.3,
};
let input: {
  restlength?: HTMLInputElement;
  connectedPoints?: HTMLInputElement;
} = {};
initUI();
render();

function initUI() {
  init("Spring Simulation by Energy Minimization");
  addBtn("restart", () => initSimulator(params));
  addLinebreak();
  addInputNumber("spring constant = ", 0, 100, 1, 0.1, (springConstant) =>
    restartSimulator((params) => (params.springConstant = springConstant))
  );
  addLinebreak();
  addInputNumber("number of endpoints = ", 2, 200, 16, 1, (numberOfPoints) => {
    restartSimulator((params) => {
      params.numberOfPoints = numberOfPoints;
      params.connectedPoints = range(numberOfPoints - 1).map((i) => [i, i + 1]);
      if (input.connectedPoints)
        input.connectedPoints.value = params.connectedPoints.flat().join();
    });
  });
  addLinebreak();
  addInputNumber("length = ", 1, 500, 80, 1, (length) =>
    restartSimulator((params) => {
      params.length = length;
      params.restlength = length / (params?.numberOfPoints ?? 16);
      if (input.restlength) input.restlength.value = String(params.restlength);
    })
  );
  addLinebreak();
  addInputNumber("mass = ", 0.01, 100, 0.01, 0.01, (mass) =>
    restartSimulator((params) => (params.mass = mass))
  );
  addLinebreak();
  input.restlength = addInputNumber(
    "rest length = ",
    0,
    100,
    5,
    1,
    (restlength) =>
      restartSimulator((params) => (params.restlength = restlength))
  );
  addLinebreak();
  addInputText("fixed points = ", "0", (fixedPoints) =>
    restartSimulator(
      (params) =>
        (params.fixedPoints = fixedPoints
          .split(",")
          .map((index) => Number(index)))
    )
  );
  addLinebreak();
  input.connectedPoints = addInputText(
    "connect points = ",
    params.connectedPoints?.flat()?.join() ?? "",
    (connectedPoints) =>
      restartSimulator((params) => {
        const flatConnectedPoints = connectedPoints
          .split(",")
          .map((index) => Number(index));
        params.connectedPoints = [];
        for (let i = 0; i < flatConnectedPoints.length / 2; i++)
          params.connectedPoints[i] = [
            flatConnectedPoints[2 * i],
            flatConnectedPoints[2 * i + 1],
          ];
      })
  );
  addLinebreak();
  addInputNumber(
    "constant of restitution =",
    0,
    1,
    0.3,
    0.1,
    (constantOfRestitution) =>
      restartSimulator(
        (params) => (params.constantOfRestitution = constantOfRestitution)
      )
  );
}
function restartSimulator(setProperty: (params: InitParams) => void) {
  clearLinesAndBalls();
  setProperty(params);
  initSimulator(params);
  initLinesAndBalls();
}
