/// <reference path="../math/matrix.test.ts" />
/// <reference path="multigrid.ts" />

namespace MULTIGRID {
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

    const [grids, U, Ut, r, M, m] = MULTIGRID.build(positions, 2);
    test("grids", () => {
      [MATH.range(size * size), [0, 8, 2, 6, 4]].forEach((grid, i) =>
        MATH.expectElementsEqualTo(grids[i], grid)
      );
    });
    test("interpolations", () => {
      r[1] = new MATH.Vector(
        MATH.range(r[1].height / 12)
          .map((i) => MATH.range(12).map((n) => n + i))
          .flat()
      );
      const [r0_original, r1_original, r2_original] = [
        r[0].clone(),
        r[1].clone(),
        r[2].clone(),
      ];
      const r0_true = U[0].multiplyVector(r[1]);
      MULTIGRID.interpolate(r, M, 1);
      MATH.expectElementsEqualTo(r0_true.elements, r[0].elements);
      const r1_true = U[1].multiplyVector(r[2]);
      MULTIGRID.interpolate(r, M, 2);
      MATH.expectElementsEqualTo(r1_true.elements, r[1].elements);
      // restore original state
      [r[0], r[1], r[2]] = [r0_original, r1_original, r2_original];
    });
    test("restrictions", () => {
      const r1_true = Ut[0].multiplyVector(r[0]);
      MULTIGRID.restrict(r, m, 1);
      MATH.expectElementsEqualTo(r1_true.elements, r[1].elements);
      const r2_true = Ut[1].multiplyVector(r[1]);
      MULTIGRID.restrict(r, m, 2);
      MATH.expectElementsEqualTo(r2_true.elements, r[2].elements);
    });
  });
}
