/// <reference path="matrix-modification.ts" />
/// <reference path="matrix.test.ts" />

namespace MATH {
  describe("matrix modification", () => {
    test("hessenberge reduction", () => {
      expectElementsEqualTo(
        hessenbergReduction(
          new Matrix(
            [
              0.2815, 0.1386, 0.5038, 0.4494, 0.7311, 0.5882, 0.4896, 0.9635,
              0.1378, 0.3662, 0.877, 0.0423, 0.8367, 0.8068, 0.3531, 0.973,
            ],
            4,
            4
          )
        ).elements,
        [
          0.2815, -0.4884, -0.4152, 0.2532, -1.1196, 1.7764, 0.4547, -0.1854, 0,
          0.1629, 0.822, 0.1283, 0, 0, /*-0.0017*/ 0, -0.1603,
        ]
      );
    });
  });
}
