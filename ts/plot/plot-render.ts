/// <reference path="../helpers/render-helper.ts" />
/// <reference path="../@types/index.d.ts" />

namespace PLOT_RENDER {
  export function plot2D(params: {
    fn: (x: number) => number;
    range: [number, number];
    stepSize?: number;
    xAndY?: [number, number];
  }) {
    RENDER_HELPER.render({
      cameraParams: {
        position: [20, -50, 80],
        lookAt: [0, 0, 0],
      },
      initModel: () => {
        const axisLength = 100;
        RENDER_HELPER.addPlane(axisLength, axisLength, { color: 0xf0f0f0 });
        for (let i = 0; i < 3; i++) {
          const axisNegative: Vec3 = [0, 0, 0];
          const axisPositive: Vec3 = [0, 0, 0];
          axisNegative[i] = -axisLength / 2;
          axisPositive[i] = axisLength / 2;
          RENDER_HELPER.addLine(axisNegative, axisPositive);
        }
        for (
          let x = params.range[0];
          x < params.range[1];
          x += params.stepSize ?? 0.1
        ) {
          RENDER_HELPER.addLine(
            [x, params.fn(x), 0],
            [x, params.fn(x + (params.stepSize ?? 0.1)), 0]
          );
        }
      },
    });
  }
}
