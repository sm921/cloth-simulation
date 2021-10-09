/// <reference path="matrix.ts" />
namespace MATH {
  /**
   * decompose matrix to A = LL^t (L is lower triangle matrix)
   * @param matrix
   * @returns L (or null if matrix is not positive definite)
   */
  export function cholesky(matrix: Matrix): Matrix | null {
    if (!matrix.isSquare()) return null;
    const L = Matrix.zero(matrix.width, matrix.width);
    /*
      L(i,j) =
        if j < i
          (A(i,j) - Sigma_k(L(i,k)*L(k,j))) / L(j,j) (0<=k<j)
        if j = i
          root( A(i,i) - Sigm_k(L(i,k)^2 ) (0<=k<j)
    */
    for (let i = 0; i < L.height; i++) {
      for (let j = 0; j < i; j++) {
        let sigma = 0;
        for (let k = 0; k < j; k++) sigma += L._(i, k) * L._(j, k);
        const L_jj = L._(j, j);
        if (L_jj === 0) return null;
        L.set(i, j, (matrix._(i, j) - sigma) / L_jj);
      }
      let sigma = 0;
      for (let k = 0; k < i; k++) sigma += L._(i, k) * L._(i, k);
      const diff = matrix._(i, i) - sigma;
      if (diff <= 0) return null;
      L.set(i, i, Math.sqrt(diff));
    }
    return L;
  }

  /**
   * lu decomposition
   * @param A
   * @returns [L, U, P] L is lower triangle matrix, U is upper
   */
  export function lu(A: Matrix): [Matrix, Matrix, Matrix | null] {
    /*
    ```
      Algorithm: PLU decomposition https://johnfoster.pge.utexas.edu/numerical-methods-book/LinearAlgebra_LU.html
      1. Initialize L=P=I dimension nxn and U=A
      2. For i=0, ..., n do Steps 3-4, 8
      3.	   Let k=i,
      4.	   While u_ii = 0, do Steps 5-7
      5.	   Swap row Ui with row U_k+1
      6.	   Swap row Pi with row P_k+1
      7.	   Increment k by 1.
      8.	   For j=i+1, ..., n do Steps 9-10
      9.	   Set l_ji = u_ji/u_ii
      10.	   Perform Uj = Uj - l_ji Ui (where Ui, Uj represent the i and j rows of the matrix U, respectively)
    ```
      */
    const n = A.height;
    let [L, U, P]: [Matrix, Matrix, Matrix | null] = [
      Matrix.identity(n),
      A.clone(),
      null,
    ];
    for (let i = 0; i < n; i++) {
      let k = i;
      while (U._(i, i) === 0) {
        if (P === null) P = Matrix.identity(n);
        U.swapRowIAndJ(i, k + 1);
        P?.swapRowIAndJ(i, k + 1);
        k++;
      }
      for (let j = i + 1; j < n; j++) {
        L.set(j, i, U._(j, i) / U._(i, i));
        U.subtractRowIByJMultipliedByA(j, i, L._(j, i));
      }
    }
    return [L, U, P];
  }

  /**
   * QR decomposition Using the Gramm Schmidt process to return [Q, R]
   * @param matrix
   */
  export function qr(matrix: Matrix): [Matrix, Matrix] {
    const Q = Matrix.zero(matrix.width, matrix.height);
    const R = Q.clone();
    /** a0, a1, ..., an */
    const a: Vector[] = Array(matrix.width);
    for (let columnIndex = 0; columnIndex < matrix.width; columnIndex++)
      a[columnIndex] = matrix.columnVector(columnIndex);
    /** u0, u1, ..., un */
    const u: Vector[] = Array(matrix.width);
    // uk = ak - Sigma_j <uk, ak>/<uk, uk> ak (0 <= j < k)
    for (let k = 0; k < u.length; k++) {
      const ak = a[k];
      const uk = ak.clone();
      const sigma = Vector.zero(uk.height);
      for (let j = 0; j < k; j++) sigma.add(ak.projectTo(u[j]));
      u[k] = uk.subtract(sigma);
    }
    /** ek = uk/|uk| */
    const e: Vector[] = Array(u.length);
    for (let k = 0; k < e.length; k++) {
      e[k] = u[k].normalizeNew();
      // Q is [e0, e1, ..., en]
      for (let row = 0; row < e[k].height; row++) Q.set(row, k, e[k]._(row));
    }
    // R's i-th row is [0, 0, ..., <ei, a[i]>, <ei, a[i+1]>, ...]
    for (let i = 0; i < R.height; i++)
      for (let column = i; column < R.width; column++)
        R.set(i, column, e[i].dot(a[column]));
    return [Q, R];
  }
}
