/// <reference path="../helpers/math/math.ts" />

namespace MGMESH {
  export function mesh(
    f: (x: number, y: number) => number,
    step = 1e-2
  ): [number[], number[], number[]] {
    const d = 1 / step + 1;
    const n = d * d;
    const x = Array(n);
    const y = Array(n);
    const z = Array(n);
    let i = 0;
    for (let xi of MATH.segment(0, 1, step))
      for (let yi of MATH.segment(0, 1, step)) {
        x[i] = xi;
        y[i] = yi;
        z[i] = f(xi, yi);
        i++;
      }
    return [x, y, z];
  }
}
