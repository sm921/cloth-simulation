/// <reference path="matrix.ts" />

namespace MATH {
  /**
   * @param matrix
   * @param to
   * @param tolerance round float to this digit
   */
  export function expectElementsEqualTo(
    elements: Float32Array,
    to: number[],
    tolerance = 2
  ): void {
    let mat: number[] = [];
    elements.forEach((el) => mat.push(Number(el.toFixed(tolerance))));
    mat = mat.map((el) => (el === -0 ? 0 : el));
    expect(mat).toEqual(to.map((el) => Number(el.toFixed(tolerance))));
  }

  describe("matrix", () => {
    test("multiplication", () => {
      const A = new Matrix([1, 2, 3, 0], 2, 2);
      const B = new Matrix([1, 2, 3, 0], 2, 2);
      const C = A.multiply(B);
      expect(C).toEqual(new Matrix([7, 2, 3, 6], 2, 2));
    });

    test("inverse", () => {
      const A = new Matrix([1, 2, 3, 0, 1, -4, 4, 8, 7], 3, 3);
      const invA = A.inverseNew();
      const identity = A.multiply(invA as Matrix);
      for (let i = 0; i < identity.height; i++)
        for (let j = 0; j < identity.width; j++)
          expect(Math.abs((i === j ? 1 : 0) - identity._(i, j)) < 0.0001).toBe(
            true
          );
    });

    test("transpose", () => {
      expect(
        new Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3).transpose().elements
      ).toEqual(new Float32Array([1, 4, 7, 2, 5, 8, 3, 6, 9]));
    });
  });
}
