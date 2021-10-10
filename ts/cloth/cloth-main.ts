import {
  addBtn,
  addInputNumber,
  addInputRadio,
  addInputText,
  addLinebreak,
  init,
} from "../helpers/ui";
import { range } from "../helpers/math/other";
import { Mode } from "./cloth-simulator";
import {
  clearLinesAndBalls,
  initLinesAndBalls,
  InitParams,
  initSimulator,
  render,
} from "./cloth-render";

let params: InitParams = {
  springConstant: 1,
  numberOfPoints: 10,
  length: 80,
  mass: 1e-2,
  fixedPoints: undefined,
  constantOfRestitution: 0.3,
  mode: Mode.Newton,
};

initUI();
render();

function initUI() {
  init(
    "Cloth Simulation (Implicit Newton, Projective Dynamics, and Multigrid)"
  );
  addBtn("restart", () => restartSimulator());
  addInputRadio(
    [
      { label: "Newton", value: Mode.Newton },
      {
        label: "Projective Dynamics",
        value: Mode.ProjectiveDynamics,
      },
      {
        label: "Multigrid (still in progress)",
        value: Mode.Multigrid,
      },
    ],
    (mode) => restartSimulator((params) => (params.mode = Number(mode)))
  );
  addLinebreak();
  addInputNumber(
    "spring constant = ",
    0,
    100,
    params.springConstant ?? 1,
    0.1,
    (springConstant) =>
      restartSimulator((params) => (params.springConstant = springConstant))
  );
  addLinebreak();
  addInputNumber(
    "number of endpoints = ",
    2,
    200,
    params.numberOfPoints ?? 10,
    1,
    (numberOfPoints) => {
      restartSimulator((params) => {
        params.numberOfPoints = numberOfPoints;
        params.connectedPoints = range(numberOfPoints - 1).map((i) => [
          i,
          i + 1,
        ]);
      });
    }
  );
  addLinebreak();
  addInputNumber("length = ", 1, 500, params.length ?? 80, 1, (length) =>
    restartSimulator((params) => {
      params.length = length;
      params.restlength = length / (params?.numberOfPoints ?? 16);
    })
  );
  addLinebreak();
  addInputNumber("mass = ", 0.01, 100, params.mass ?? 0.01, 0.01, (mass) =>
    restartSimulator((params) => (params.mass = mass))
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
  addInputNumber(
    "constant of restitution =",
    0,
    1,
    params.constantOfRestitution ?? 0.3,
    0.1,
    (constantOfRestitution) =>
      restartSimulator(
        (params) => (params.constantOfRestitution = constantOfRestitution)
      )
  );
}
function restartSimulator(setProperty?: (params: InitParams) => void) {
  clearLinesAndBalls();
  setProperty?.(params);
  initSimulator(params);
  initLinesAndBalls();
}
