/// <reference path="matrix.ts" />

test("matrix", () => {
  const A = new MATH_MATRIX.Matrix([1, 2, 3, 0, 1, -4, 4, 8, 7], 3, 3);
  const invA = A.inverseNew();
  const identity = A.multiply(invA as MATH_MATRIX.Matrix);
  for (let i = 0; i < identity.height; i++)
    for (let j = 0; j < identity.width; j++)
      expect(Math.abs((i === j ? 1 : 0) - identity._(i, j)) < 0.0001).toBe(
        true
      );
});

test("multiplication", () => {
  const A = new MATH_MATRIX.Matrix([1, 2, 3, 0], 2, 2);
  const B = new MATH_MATRIX.Matrix([1, 2, 3, 0], 2, 2);
  const C = A.multiply(B);
  expect(C).toEqual(new MATH_MATRIX.Matrix([7, 2, 3, 6], 2, 2));
});
const testLU = (A: MATH_MATRIX.Matrix, l: number[], u: number[]) => {
  test("lu decomposition", () => {
    const [L, U] = MATH_MATRIX.lu(A) as [
      MATH_MATRIX.Matrix,
      MATH_MATRIX.Matrix
    ];
    expect(L.multiply(U)).toEqual(A);
    expect(L.elements).toEqual(new Float32Array(l));
    expect(U.elements).toEqual(new Float32Array(u));
  });
};
testLU(
  new MATH_MATRIX.Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
  [1, 0, 0, 3, 1, 0, 2, 1, 1],
  [1, 2, 4, 0, 2, 2, 0, 0, 3]
);
testLU(
  new MATH_MATRIX.Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
  [1, 0, 0, -2, 1, 0, 0, 4, 1],
  [3, 1, 6, 0, 2, -4, 0, 0, -1]
);
const testLuSolver = (A: MATH_MATRIX.Matrix, b: number[], x: number[]) =>
  test("lu solver", () => {
    expect(MATH_MATRIX.Solver.lu(A, b)).toEqual(new Float32Array(x));
  });
testLuSolver(
  new MATH_MATRIX.Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
  [3, 13, 4],
  [3, 4, -2]
);
testLuSolver(
  new MATH_MATRIX.Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
  [0, 4, 17],
  [2, 0, -1]
);
test("cholesky", () => {
  const A = new MATH_MATRIX.Matrix(
    [4, 12, -16, 12, 37, -43, -16, -43, 98],
    3,
    3
  );
  const L = MATH_MATRIX.cholesky(A);
  expect(L).toEqual(new MATH_MATRIX.Matrix([2, 0, 0, 6, 1, 0, -8, 5, 3], 3, 3));
});
test("cholesky solver", () => {
  const A = new MATH_MATRIX.Matrix([1, -1, 2, -1, 5, -4, 2, -4, 6], 3, 3);
  expect(MATH_MATRIX.Solver.cholesky(A, [17, 31, -5])).toEqual(
    new Float32Array([51.5, 4.5, -15])
  );
});
test("cholesky decomposition", () => {
  const nonPositiveDefiniteMatrix = new MATH_MATRIX.Matrix(
    [
      0.2985329031944275, 0.10807351022958755, 0.10807351022958755,
      0.01267128437757492, 0.2985329031944275, 0.01267128437757492,
      -0.2859558165073395, -0.2859558165073395, 0.2985329031944275,
    ],
    3,
    3
  );
  expect(MATH_MATRIX.cholesky(nonPositiveDefiniteMatrix)).toEqual(null);
});
test("transpose", () => {
  expect(
    new MATH_MATRIX.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3).transpose()
      .elements
  ).toEqual(new Float32Array([1, 4, 7, 2, 5, 8, 3, 6, 9]));
});
test("vector", () => {
  const A = new MATH_MATRIX.Matrix(
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
  const x = new MATH_MATRIX.Vector([1, 2, 3]);
  expect(x.multiplyMatrix(A).elements).toEqual(new Float32Array([14, 32, 50]));
  expect(A.multiplyNew(x).elements).toEqual(new Float32Array([14, 32, 50]));
});
