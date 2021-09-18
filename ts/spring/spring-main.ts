/// <reference path="../helpers/ui.ts" />
/// <reference path="spring-render.ts" />

namespace SPRING_MAIN {
  let params: SPRING_RENDER.InitParams = {
    springConstant: 1,
    numberOfPoints: 16,
    length: 80,
    mass: 1e-2,
    restlength: 5,
    fixedPoints: [0],
    connectedPoints: [...Array(15)].map((_, i) => [i, i + 1]),
    constantOfRestitution: 0.3,
  };
  let input: {
    restlength?: HTMLInputElement;
    connectedPoints?: HTMLInputElement;
  } = {};
  initUI();
  SPRING_RENDER.render();

  function initUI() {
    UI.init("Spring Simulation by Energy Minimization");
    UI.addBtn("restart", () => SPRING_RENDER.initSimulator(params));
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
        restartSimulator((params) => {
          params.numberOfPoints = numberOfPoints;
          params.connectedPoints = [...Array(numberOfPoints - 1)].map(
            (_, i) => [i, i + 1]
          );
          if (input.connectedPoints)
            input.connectedPoints.value = params.connectedPoints.flat().join();
        });
      }
    );
    UI.addLinebreak();
    UI.addInputNumber("length = ", 1, 500, 80, 1, (length) =>
      restartSimulator((params) => {
        params.length = length;
        params.restlength = length / (params?.numberOfPoints ?? 16);
        if (input.restlength)
          input.restlength.value = String(params.restlength);
      })
    );
    UI.addLinebreak();
    UI.addInputNumber("mass = ", 0.01, 100, 0.01, 0.01, (mass) =>
      restartSimulator((params) => (params.mass = mass))
    );
    UI.addLinebreak();
    input.restlength = UI.addInputNumber(
      "rest length = ",
      0,
      100,
      5,
      1,
      (restlength) =>
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
    input.connectedPoints = UI.addInputText(
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
    UI.addLinebreak();
    UI.addInputNumber(
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
  function restartSimulator(
    setProperty: (params: SPRING_RENDER.InitParams) => void
  ) {
    SPRING_RENDER.clearLinesAndBalls();
    setProperty(params);
    SPRING_RENDER.initSimulator(params);
    SPRING_RENDER.initLinesAndBalls();
  }
}
