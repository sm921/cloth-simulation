import { Matrix } from "./matrix";
import { expectElementsEqualTo } from "./matrix.test";
import { Vector } from "./vector";

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
    expectElementsEqualTo(A.multiplyVector(x, Vector).elements, [14, 32, 50]);
    expectElementsEqualTo(A.multiplyVector(x, Vector).elements, [14, 32, 50]);
  });
});
