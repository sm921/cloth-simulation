/// <reference path="solver.ts" />
namespace MATH {
  describe("solver", () => {
    const testLuSolver = (A: Matrix, b: number[], x: number[]) =>
      test("LU", () => {
        expect(Solver.lu(A, b)).toEqual(new Float32Array(x));
      });
    testLuSolver(
      new Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
      [3, 13, 4],
      [3, 4, -2]
    );
    testLuSolver(
      new Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
      [0, 4, 17],
      [2, 0, -1]
    );

    test("Cholesky", () => {
      const A = new Matrix([1, -1, 2, -1, 5, -4, 2, -4, 6], 3, 3);
      expect(Solver.cholesky(A, [17, 31, -5])).toEqual(
        new Float32Array([51.5, 4.5, -15])
      );
    });
  });
}
