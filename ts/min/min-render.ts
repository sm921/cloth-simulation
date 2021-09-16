/// <reference path="min-simulator.ts" />
/// <reference path="../helpers/render-helper.ts" />

namespace MIN_RENDER {
  let balls: THREE.Mesh[] = [];
  let lines: THREE.Line[] = [];

  export function render() {
    const simulator = new MIN_SIMULATOR.Simulator(
      (p) => {
        const [x, y] = [p._(0), p._(1)];
        // return x * x * x - 9 * x * x + 24 * x - 17;
        return Math.sin(x) + Math.cos(y);
      },
      (p) => {
        const [x, y] = [p._(0), p._(1)];
        const grad = [Math.cos(x), -Math.sin(y)];
        // return new MATH_MATRIX.Vector([3 * x * x - 18 * x + 24]);
        return new MATH_MATRIX.Vector(grad);
      },
      (p) => {
        const [x, y] = [p._(0), p._(1)];
        // return new MATH_MATRIX.Matrix([6 * x - 18], 1, 1);
        return new MATH_MATRIX.Matrix([-Math.sin(x), 0, 0, -Math.cos(y)], 2, 2);
      },
      new MATH_MATRIX.Vector([2, 0]),
      -100,
      100,
      1
    );
    RENDER_HELPER.render({
      cameraParams: { position: [0, 100, 2] },
      simulate: () => {
        simulator.minimize();
        // balls[0].position.set(...simulator.minPosition());
      },
      initModel: () => {
        // for (let i = 0; i < simulator.positions.length - 2; i++) {
        // const [p1, p2] = [simulator.positions[i], simulator.positions[i + 1]];
        // lines.push(RENDER_HELPER.addLine(p1, p2));
        // }
        RENDER_HELPER.addParametrixSurface((u, v, dest) => {
          const [x, y, z] = [u, v, u + v];
          dest.set(x, y, z);
        });
        // balls.push(RENDER_HELPER.addBall(...simulator.minPosition()));
      },
    });
  }
}
