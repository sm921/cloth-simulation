import { expectElementsEqualTo } from "./matrix.test";
import { eigenvalues, eigenvectorOf } from "./matrix-eigen";
import { Matrix } from "./matrix";

describe("matrix eigenvalues & eigenvectors", () => {
  test("eigen values 1", () => {
    expectElementsEqualTo(
      eigenvalues(
        new Matrix([-5, 2, 1, 2, -9, 7, 3, 1, 3, 2, 8, -1, 1, 4, 5, -3], 4, 4)
      ),
      [9.336, 3.582, -5.557, -0.361],
      1
    );
  });

  test("eigen values 2", () => {
    expectElementsEqualTo(
      eigenvalues(new Matrix([-5, 2, 1, -9, 7, 3, 3, 2, 8], 3, 3)),
      [9.677, 3.788, -3.465],
      1
    );
  });

  test("eigen values 3", () => {
    expectElementsEqualTo(
      eigenvalues(new Matrix([-5, 2, -9, 7], 2, 2)),
      [5.24, -3.24]
    );
  });

  test("eigen values 4", () => {
    expectElementsEqualTo(
      eigenvalues(
        new Matrix(
          [
            -0.44629, 4.9063, -0.87871, 6.3036, -6.3941, 13.354, 1.6668, 11.945,
            3.6842, -6.6617, -0.060021, -7.0043, 3.1209, -5.2052, -1.413,
            -2.8484,
          ],
          4,
          4
        )
      ),
      [3, 1, 4, 2],
      1
    );
  });

  test("eigen values 5", () => {
    const A = new Matrix(
      [2, 1, 0, 2, 1, 2, 0, 2, 0, 0, 0, 0, 2, 2, 0, 4],
      4,
      4
    );
    const eyeVal = eigenvalues(A);
    expectElementsEqualTo(eyeVal, [0, 0.6277186767309857, 6.3722813232, 1]);
    [
      [0, 0, -1, 0],
      [-0.5417743201637786, -0.5417743201637786, 0, 0.6426205505756496],
      [0.4544013490418746, 0.4544013490418746, 0, 0.7661845913210791],
      [-0.7071067811865475, 0.7071067811865475, 0, 0],
    ].forEach((expectedEigenvector, i) =>
      expectElementsEqualTo(
        eigenvectorOf(A, eyeVal[i]).elements,
        expectedEigenvector
      )
    );
  });
});
