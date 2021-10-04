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

    const multigrid = new MULTIGRID.Multigrid(positions, 2, 2);
    test("grids", () => {
      [MATH.range(size * size), [0, 8, 2, 6, 4]].forEach((grid, i) =>
        MATH.expectElementsEqualTo(multigrid.grids[i], grid)
      );
    });
    test("interpolations", () => {
      multigrid.residuals[1] = new MATH.Vector(
        MATH.range(multigrid.residuals[1].height / 12)
          .map((i) => MATH.range(12).map((n) => n + i))
          .flat()
      );
      const originals = multigrid.residuals.map((r) => r.clone());
      const r0_true = multigrid.interpolations[0]
        .multiplyVector(multigrid.residuals[1])
        .add(multigrid.residuals[0]);
      multigrid.interpolate(1, multigrid.residuals[1], multigrid.residuals[0]);
      MATH.expectElementsEqualTo(
        r0_true.elements,
        multigrid.residuals[0].elements
      );
      const r1_true = multigrid.interpolations[1]
        .multiplyVector(multigrid.residuals[2])
        .add(multigrid.residuals[1]);
      multigrid.interpolate(2, multigrid.residuals[2], multigrid.residuals[1]);
      MATH.expectElementsEqualTo(
        r1_true.elements,
        multigrid.residuals[1].elements
      );
      // restore original state
      multigrid.residuals.forEach(
        (r, i) => (r.elements = originals[i].elements)
      );
    });
    test("restrictions", () => {
      const r1_true = multigrid.restrictions[0].multiplyVector(
        multigrid.residuals[0]
      );
      multigrid.restrict(1);
      MATH.expectElementsEqualTo(
        r1_true.elements,
        multigrid.residuals[1].elements
      );
      const r2_true = multigrid.restrictions[1].multiplyVector(
        multigrid.residuals[1]
      );
      multigrid.restrict(2);
      MATH.expectElementsEqualTo(
        r2_true.elements,
        multigrid.residuals[2].elements
      );
    });
  });
}
