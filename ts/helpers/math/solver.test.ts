/// <reference path="matrix.test.ts" />
/// <reference path="solver.ts" />

namespace MATH {
  describe("solver", () => {
    test("Cholesky", () => {
      const A = new Matrix([1, -1, 2, -1, 5, -4, 2, -4, 6], 3, 3);
      expect(Solver.cholesky(A, [17, 31, -5])).toEqual(
        new Float32Array([51.5, 4.5, -15])
      );
    });

    test("Gauss-Siedel", () => {
      [undefined, 7].forEach((iterationCount) =>
        expectElementsEqualTo(
          Solver.gaussSiedel(
            new Matrix([16, 3, 7, -11], 2, 2),
            Vector.ones(2),
            new Vector([11, 13]),
            iterationCount
          ).elements,
          [0.8122, -0.665],
          1
        )
      );
      expectElementsEqualTo(
        Solver.gaussSiedel(
          new Matrix(
            [10, -1, 2, 0, -1, 11, -1, 3, 2, -1, 10, -1, 0, 3, -1, 8],
            4,
            4
          ),
          Vector.zero(4),
          new Vector([6, 25, -11, 15])
        ).elements,
        [1, 2, -1, 1],
        1
      );
    });

    test("Jacobi", () => {
      [undefined, 25].forEach((iterationCount) =>
        expectElementsEqualTo(
          Solver.jacobi(
            new Matrix([2, 1, 5, 7], 2, 2),
            Vector.ones(2),
            new Vector([11, 13]),
            iterationCount
          ).elements,
          [7.111, -3.222],
          1
        )
      );
    });

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
  });
}
