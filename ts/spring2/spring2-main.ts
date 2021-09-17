/// <reference path="../helpers/ui.ts" />
/// <reference path="spring2-render.ts" />

namespace SPRING2_MAIN {
  let params: SPRING2_RENDER.InitParams = {};
  initUI();
  SPRING2_RENDER.render();

  function initUI() {
    UI.init("Spring Simulation by Energy Minimization");
    UI.addBtn("restart", () => SPRING2_RENDER.initSimulator(params));
    UI.addLinebreak();
    UI.addInputNumber("spring constant = ", 0, 100, 1, 0.1, (springConstant) =>
      restartSimulator((params) => (params.springConstant = springConstant))
    );
    UI.addLinebreak();
    UI.addInputNumber(
      "number of endpoints = ",
      2,
      200,
      16,
      1,
      (numberOfPoints) => {
        restartSimulator((params) => (params.numberOfPoints = numberOfPoints));
      }
    );
    UI.addLinebreak();
    UI.addInputNumber("length = ", 1, 500, 80, 1, (length) =>
      restartSimulator((params) => (params.length = length))
    );
    UI.addLinebreak();
    UI.addInputNumber("mass = ", 0.01, 100, 0.01, 0.01, (mass) =>
      restartSimulator((params) => (params.mass = mass))
    );
    UI.addLinebreak();
    UI.addInputNumber("rest length = ", 0, 100, 5, 1, (restlength) =>
      restartSimulator((params) => (params.restlength = restlength))
    );
    UI.addLinebreak();
    UI.addInputText("fixed points = ", "0", (fixedPoints) =>
      restartSimulator(
        (params) =>
          (params.fixedPoints = fixedPoints
            .split(",")
            .map((index) => Number(index)))
      )
    );
    UI.addLinebreak();
    UI.addInputText(
      "connect points = ",
      "0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15",
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
  }
  function restartSimulator(
    setProperty: (params: SPRING2_RENDER.InitParams) => void
  ) {
    SPRING2_RENDER.clearLinesAndBalls();
    setProperty(params);
    SPRING2_RENDER.initSimulator(params);
    SPRING2_RENDER.initLinesAndBalls();
  }
}
