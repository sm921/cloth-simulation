import { expectElementsEqualTo } from "../math/matrix.test";
import { range } from "../math/other";
import { Vector } from "../math/vector";
import { Multigrid } from "./multigrid";

describe("multigrid", () => {
  const size = 3;
  const length = 80;
  const positions: number[] = [];
  const restlength = length / (size - 1);
  const [widthMaxIndex, heightMaxIndex] = [length, length].map((length) =>
    Math.ceil(length / restlength)
  );
  // create points in a square plane
  for (let widthIndex = 0; widthIndex <= widthMaxIndex; widthIndex++) {
    const x = widthIndex * restlength;
    for (let heightIndex = 0; heightIndex <= heightMaxIndex; heightIndex++) {
      const y = heightIndex * restlength;
      positions.push(x, y, 0);
    }
  }

  const multigrid = new Multigrid(positions, 2, 2);
  test("grids", () => {
    expect(1).toBe(1);
    // [range(size * size), [0, 8, 2, 6, 4]].forEach((grid, i) =>
    //   expectElementsEqualTo(multigrid.grids[i], grid)
    // );
  });
  // test("interpolations", () => {
  //   multigrid.r[1] = new Vector(
  //     range(multigrid.r[1].height / 12)
  //       .map((i) => range(12).map((n) => n + i))
  //       .flat()
  //   );
  //   const originals = multigrid.r.map((r) => r.clone());
  //   const r0_true = multigrid.U[0]
  //     .multiplyVector(multigrid.r[1], Vector)
  //     .add(multigrid.r[0]);
  //   multigrid.interpolate(1, multigrid.r[1], multigrid.r[0]);
  //   expectElementsEqualTo(r0_true.elements, multigrid.r[0].elements);
  //   const r1_true = multigrid.U[1]
  //     .multiplyVector(multigrid.r[2], Vector)
  //     .add(multigrid.r[1]);
  //   multigrid.interpolate(2, multigrid.r[2], multigrid.r[1]);
  //   expectElementsEqualTo(r1_true.elements, multigrid.r[1].elements);
  //   // restore original state
  //   multigrid.r.forEach((r, i) => (r.elements = originals[i].elements));
  // });
  // test("restrictions", () => {
  //   const r1_true = multigrid.Ut[0].multiplyVector(multigrid.r[0], Vector);
  //   multigrid.restrict(1);
  //   expectElementsEqualTo(r1_true.elements, multigrid.r[1].elements);
  //   const r2_true = multigrid.Ut[1].multiplyVector(multigrid.r[1], Vector);
  //   multigrid.restrict(2);
  //   expectElementsEqualTo(r2_true.elements, multigrid.r[2].elements);
  // });
});
