import { Matrix } from "./matrix";
import { expectElementsEqualTo } from "./matrix.test";
import { cholesky, lu, qr } from "./matrix-decomposition";

describe("matrix decomposition", () => {
  test("Cholesky", () => {
    const nonPositiveDefiniteMatrix = new Matrix(
      [
        0.2985329031944275, 0.10807351022958755, 0.10807351022958755,
        0.01267128437757492, 0.2985329031944275, 0.01267128437757492,
        -0.2859558165073395, -0.2859558165073395, 0.2985329031944275,
      ],
      3,
      3
    );
    expect(cholesky(nonPositiveDefiniteMatrix)).toEqual(null);

    const A = new Matrix([4, 12, -16, 12, 37, -43, -16, -43, 98], 3, 3);
    const L = cholesky(A);
    expect(L).toEqual(new Matrix([2, 0, 0, 6, 1, 0, -8, 5, 3], 3, 3));
  });

  const testLU = (A: Matrix, l: number[], u: number[]) => {
    test("LU", () => {
      const [L, U, P] = lu(A);
      expect(L.multiply(U)).toEqual(A);
      expect(L.elements).toEqual(new Float32Array(l));
      expect(U.elements).toEqual(new Float32Array(u));
    });
  };
  testLU(
    new Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
    [1, 0, 0, 3, 1, 0, 2, 1, 1],
    [1, 2, 4, 0, 2, 2, 0, 0, 3]
  );
  testLU(
    new Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
    [1, 0, 0, -2, 1, 0, 0, 4, 1],
    [3, 1, 6, 0, 2, -4, 0, 0, -1]
  );

  test("QR", () => {
    const testQR = (A: Matrix, Q: number[], R: number[]) => {
      const [q, r] = qr(A);
      expectElementsEqualTo(q.elements, Q);
      expectElementsEqualTo(r.elements, R);
    };
    testQR(
      new Matrix([12, -51, 4, 6, 167, -68, -4, 24, -41], 3, 3),
      [
        6 / 7,
        -69 / 175,
        -58 / 175,
        3 / 7,
        158 / 175,
        6 / 175,
        -2 / 7,
        6 / 35,
        -33 / 35,
      ],
      [14, 21, -14, 0, 175, -70, 0, 0, 35]
    );
    const r2 = 1.41421356;
    const r3 = 1.7320508;
    const r6 = Math.sqrt(6);
    testQR(
      new Matrix([1, 1, 0, 1, 0, 1, 0, 1, 1], 3, 3),
      [1 / r2, 1 / r6, -1 / r3, 1 / r2, -1 / r6, 1 / r3, 0, 2 / r6, 1 / r3],
      [2 / r2, 1 / r2, 1 / r2, 0, 3 / r6, 1 / r6, 0, 0, 2 / r3]
    );
  });
});
