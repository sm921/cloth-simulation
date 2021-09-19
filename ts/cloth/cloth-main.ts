/// <reference path="../helpers/ui.ts" />
/// <reference path="cloth-render.ts" />

/// <reference path="../helpers/ui.ts" />
/// <reference path="cloth-render.ts" />
/// <reference path="../spring/spring-render.ts" />

namespace CLOTH_MAIN {
  let params: SPRING_RENDER.InitParams = {
    springConstant: 1,
    numberOfPoints: 5,
    length: 80,
    mass: 1e-2,
    fixedPoints: undefined,
    constantOfRestitution: 0.3,
  };
  initUI();
  CLOTH_RENDER.render();

  function initUI() {
    UI.init("Cloth (by Mass-Spring model)");
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
      5,
      1,
      (numberOfPoints) => {
        restartSimulator((params) => {
          params.numberOfPoints = numberOfPoints;
          params.connectedPoints = MATH.range(numberOfPoints - 1).map((i) => [
            i,
            i + 1,
          ]);
        });
      }
    );
    UI.addLinebreak();
    UI.addInputNumber("length = ", 1, 500, 80, 1, (length) =>
      restartSimulator((params) => {
        params.length = length;
        params.restlength = length / (params?.numberOfPoints ?? 16);
      })
    );
    UI.addLinebreak();
    UI.addInputNumber("mass = ", 0.01, 100, 0.01, 0.01, (mass) =>
      restartSimulator((params) => (params.mass = mass))
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
    CLOTH_RENDER.clearLinesAndBalls();
    setProperty(params);
    CLOTH_RENDER.initSimulator(params);
    CLOTH_RENDER.initLinesAndBalls();
  }
}
