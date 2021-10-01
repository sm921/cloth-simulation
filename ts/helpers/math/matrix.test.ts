/// <reference path="matrix.ts" />
/// <reference path="vector.ts" />

namespace MATH {
  /**
   * @param matrix
   * @param to
   * @param tolerance round float to this digit
   */
  export function expectElementsEqualTo(
    elements: Float32Array,
    to: number[] | Float32Array,
    tolerance = 2
  ): void {
    let mat: number[] = [];
    elements.forEach((el) => mat.push(Number(el.toFixed(tolerance))));
    mat = mat.map((el) => (el === -0 ? 0 : el));
    expect(mat.toString()).toEqual(
      to.map((el) => Number(el.toFixed(tolerance))).toString()
    );
  }

  describe("matrix", () => {
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

    test("multiplication", () => {
      const A = new Matrix([1, 2, 3, 0], 2, 2);
      const B = new Matrix([1, 2, 3, 0], 2, 2);
      const C = A.multiply(B);
      expect(C).toEqual(new Matrix([7, 2, 3, 6], 2, 2));
    });

    test("transpose", () => {
      expect(
        new Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3).transpose().elements
      ).toEqual(new Float32Array([1, 4, 7, 2, 5, 8, 3, 6, 9]));
    });

    describe("kronecker product", () => {
      const A = new Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3);
      const x = new Vector([1, 2, 3]);
      const xt = x.transposeNew();
      const I3 = Matrix.identity(3);
      const xtI3 = xt.kroneckerProduct(I3);
      test("I3", () => {
        expectElementsEqualTo(
          A.kroneckerProduct(I3).elements,
          [
            1, 0, 0, 2, 0, 0, 3, 0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 0, 1, 0, 0,
            2, 0, 0, 3, 4, 0, 0, 5, 0, 0, 6, 0, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0, 0,
            0, 4, 0, 0, 5, 0, 0, 6, 7, 0, 0, 8, 0, 0, 9, 0, 0, 0, 7, 0, 0, 8, 0,
            0, 9, 0, 0, 0, 7, 0, 0, 8, 0, 0, 9,
          ]
        );
        expectElementsEqualTo(
          x.kroneckerProduct(I3).elements,
          [
            1, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0, 0, 2, 0, 0, 0, 2, 3, 0, 0, 0, 3,
            0, 0, 0, 3,
          ]
        );
      });
      test("(x^t * I3)^t = x * I3", () => {
        expectElementsEqualTo(
          xtI3.transpose().elements,
          x.kroneckerProduct(I3).elements
        );
        // ingeneral (x^t * A)^t = x * A^t
        expectElementsEqualTo(
          xt.kroneckerProduct(A).transpose().elements,
          x.kroneckerProduct(A.transpose()).elements
        );
      });
      test("(x^t * I3)^t A (x^t * I3) = xx^t * A", () => {
        expectElementsEqualTo(
          xtI3.transpose().multiply(A).multiply(xtI3).elements,
          x.outerProduct(xt).kroneckerProduct(A).elements
        );
      });
    });
  });
}
