import { segment } from "../helpers/math/other";
import { solve1d, solve2d } from "./mg";
import { mesh } from "./mgmesh";
import { initUI, addDescription, plot3d, plot2d } from "./mgui";

initUI();
example1d();
example2d();

function example2d(): void {
  const phi = (x: number, y: number) => y * (1 - y) * x * x * x;
  const f = (x: number, y: number) => 6 * x * y * (1 - y) - 2 * x * x * x;
  const [x_true, y_true, z_true] = mesh(phi);
  const [x, y, z] = solve2d(f, phi);
  addDescription(phi, f, 3);
  plot3d(phi, [
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
  const x_true = segment(0, 1, 0.01);
  const y_true = x_true.map(phi);
  const [x, y] = solve1d(f, phi);
  addDescription(phi, f);
  plot2d(phi, [
    { x: x_true, y: y_true, name: "true φ" },
    { x, y, name: "solved φ" },
  ]);
}
