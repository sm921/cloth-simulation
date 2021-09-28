/// <reference path="vector.ts" />

namespace MATH {
  describe("vector", () => {
    test("multiplication", () => {
      const A = new Matrix(
        [
          1,
          2,
          3, //1
          4,
          5,
          6, //2
          7,
          8,
          9,
        ], //3
        3,
        3
      );
      const x = new Vector([1, 2, 3]);
      expect(x.multiplyMatrix(A).elements).toEqual(
        new Float32Array([14, 32, 50])
      );
      expect(A.multiplyNew(x).elements).toEqual(new Float32Array([14, 32, 50]));
    });
  });
}
