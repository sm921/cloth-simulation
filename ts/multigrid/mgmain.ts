/// <reference path="mgui.ts" />
/// <reference path="mgmesh.ts" />
/// <reference path="mg.ts" />

namespace MG {
  MGUI.initUI();
  example1d();
  example2d();

  function example2d(): void {
    const phi = (x: number, y: number) => y * (1 - y) * x * x * x;
    const f = (x: number, y: number) => 6 * x * y * (1 - y) - 2 * x * x * x;
    const [x_true, y_true, z_true] = MGMESH.mesh(phi);
    const [x, y, z] = MG.solve2d(f, phi);
    MGUI.addDescription(phi, f, 3);
    MGUI.plot3d(phi, [
      { x: x_true, y: y_true, z: z_true, name: "true φ" },
      { x, y, z, name: "solved φ" },
    ]);
  }

  function example1d(): void {
    const phi = (x: number) => {
      const x2 = x * x;
      const x4 = x2 * x2;
      return x2 / 2 - x4 / 6;
    };
    const f = (x: number) => 1 - 2 * x * x;
    const x_true = MATH.segment(0, 1, 0.01);
    const y_true = x_true.map(phi);
    const [x, y] = MG.solve1d(f, phi);
    MGUI.addDescription(phi, f);
    MGUI.plot2d(phi, [
      { x: x_true, y: y_true, name: "true φ" },
      { x, y, name: "solved φ" },
    ]);
  }
}
