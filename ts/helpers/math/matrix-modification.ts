/// <reference path="math.ts" />
namespace MATH {
  /**
   * calculate Hessenberg of A and return new instance of matrix
   * @param A
   * @returns
   */
  export function hessenbergReduction(A: Matrix): Matrix {
    // for notations and detail about algorithm, see https://pages.mtu.edu/~struther/Courses/OLD/Other/Sp2012/5627/BlockQR/Work/MA5629%20presentation.pdf
    for (let k = 0; k < A.height - 2; k++) {
      let sigma = 0;
      for (let j = k + 1; j < A.height; j++) sigma += A._(j, k) * A._(j, k);
      const alpha = -Math.sign(A._(k + 1, k)) * Math.sqrt(sigma);
      const r = Math.sqrt(0.5 * (alpha * alpha - A._(k + 1, k) * alpha));
      const v = Vector.zero(A.height);
      for (let j = 0; j < v.height; j++)
        v.set(
          j,
          j <= k
            ? 0
            : r === 0
            ? 0
            : (j === k + 1 ? A._(k + 1, k) - alpha : A._(j, k)) / (2 * r)
        );
      const P = Matrix.identity(A.height).subtract(
        v.outerProduct(v.transposeNew()).multiplyScalar(2)
      );
      A = P.multiply(A).multiply(P);
    }
    return A;
  }

  /**
   * Apply hessian modification to a matrix so that the matrix is positive definite by adding mulltiple of an identity matrix
   * @param matrix
   * @param firstNonZeroShift default value of tau
   * @returns
   */
  export function hessianModification(
    matrix: Matrix,
    firstNonZeroShift = 1e-3,
    step = 2
  ): Matrix {
    if (!matrix.isSquare()) return matrix;

    let minDiagonalElements = matrix._(0, 0);
    for (let i = 0; i < matrix.width; i++)
      minDiagonalElements = Math.min(minDiagonalElements, matrix._(0, 0));
    let tau =
      minDiagonalElements > 0 ? 0 : -minDiagonalElements + firstNonZeroShift;
    while (true) {
      // add multiple of identity matrix
      if (tau !== 0)
        for (let i = 0; i < matrix.height; i++) matrix.set(i, i, tau);
      const L = cholesky(matrix);
      if (L !== null) return L;
      tau = Math.max(step * tau, firstNonZeroShift);
    }
  }
}
