/// <reference path="matrix.ts" />
/// <reference path="matrix-modification.ts" />
/// <reference path="matrix-decomposition.ts" />

namespace MATH {
  function deflation(
    matrix: Matrix,
    rowIndexToRemove = matrix.height - 1,
    columnIndexToRemove = matrix.width - 1
  ): Matrix {
    const newMat = Matrix.zero(matrix.width - 1, matrix.height - 1);
    for (let rowIndex = 0; rowIndex < newMat.width; rowIndex++)
      for (let columnIndex = 0; columnIndex < newMat.height; columnIndex++)
        newMat.set(
          rowIndex,
          columnIndex,
          matrix._(
            rowIndex + (rowIndex >= rowIndexToRemove ? 1 : 0),
            columnIndex + (columnIndex >= columnIndexToRemove ? 1 : 0)
          )
        );
    return newMat;
  }

  /**
   * find eigenvalues of matrix
   * ```
   * Algorithm: QR Algorithm with shift
   * 0. H = hessenberg reduction of A
   * 1. QR decomposition of H-uI (u is a scalar (wilkinson shift))
   * 2. update H by RQ+uI
   * 3. repeat 1 and 2 until H(n,n-1) converges to zero
   * 4. save H(n,n) as a n-th eigenvalue (n = width of H = height of H)
   * 5. deflation (remove n-th row and n-th column from H)
   * 6. repeat 1 to 5 until H becomes 2x2 matrix
   * 7. performt QR algorithm without shift to 2x2 H to find the 1st and 2nd eigenvalues
   * see https://people.inf.ethz.ch/arbenz/ewp/Lnotes/chapter4.pdf
   * ```
   * Wilkinson shift https://web.stanford.edu/class/cme335/lecture5
   * detailed explanations and improvements https://addi.ehu.es/bitstream/handle/10810/26427/TFG_Erana_Robles_Gorka.pdf?sequence=1
   * @param A
   */
  export function eigenvalues(A: Matrix, tolerance = 1e-2): number[] {
    if (A.height <= 2) return eigenvaluesWithoutShift(A);
    // make A hessenberg matrix for faster convergence
    let H = hessenbergReduction(A);
    const lambda: number[] = [];
    // if some rows and columns contain only zeros, then the eigenvalue is zero
    for (let row = 0; row < H.height - 1; row++)
      for (let column = 0; column < H.width; column++) {
        if (H._(row, column) !== 0) break;
        if (column === H.width - 2) {
          lambda.push(0);
          H = deflation(H, row, row);
        }
      }
    // QR Algorithm
    for (let m = H.height - 1; m > 1; m--) {
      do {
        const shift = wilkinsonShift(
          H._(m - 1, m - 1),
          H._(m, m - 1),
          H._(m, m)
        );
        const shiftI = new Matrix(shift, H.height, H.height);
        const [Q, R] = qr(H.subtract(shiftI));
        H = R.multiply(Q).add(shiftI);
      } while (H._(m, m - 1) > tolerance);
      const hmm = H._(m, m);
      if (!lambda.includes(hmm)) lambda.push(hmm);
      H = deflation(H);
    }
    eigenvaluesWithoutShift(H).forEach((lam) => {
      if (!lambda.includes(lam)) lambda.push(lam);
    });
    return lambda;
  }

  /**
   * given eigenvalue, find eigenvector by inverse iteration
   * ```
   * Algorithm: Invere iteration
   *  let x0 = e (= vector whose all elements are ones)
   *  update x1 = k1 (A - lambda I)^-1 x0 (k1 is normalization)
   *  until  || (A - lambda I) x || is small enough
   * https://www.jstor.org/stable/2029572
   * ```
   * notice that this algorithm does not work if lambda is zero
   * however, the method still works by approximating zero by small number near zero
   *
   * @param A
   * @param eigenvalue
   * @param isEigenvalueAccurate then directly solve x = (A-lambda I)^-1
   * @returns
   */
  export function eigenvectorOf(
    A: Matrix,
    eigenvalue: number,
    approximateZeroBy = 1e-6
  ): Vector {
    let x = Vector.ones(A.height);
    const shift = A.subtractNew(
      Matrix.identity(A.height).multiplyScalar(
        eigenvalue < approximateZeroBy ? approximateZeroBy : eigenvalue
      )
    );
    const shiftInv = shift.inverseNew() as Matrix;
    while (true) {
      x = shiftInv.multiplyVector(x).normalize();
      if (shift.multiplyVector(x).squaredNorm() <= 1e-2) return x;
    }
  }

  function eigenvaluesWithoutShift(A: Matrix): number[] {
    const lambda = [];
    for (let i = 0; i < 70; i++) {
      const [Q, R] = qr(A);
      A = R.multiply(Q);
    }
    for (let i = 0; i < A.height; i++) lambda.push(A._(i, i));
    return lambda;
  }

  function wilkinsonShift(
    topLeft: number,
    bottomLeft: number,
    bottomRight: number
  ): number {
    const d = (topLeft - bottomRight) / 2;
    return (
      bottomRight +
      d -
      Math.sign(d) * Math.sqrt(d * d + bottomLeft * bottomLeft)
    );
  }
}
