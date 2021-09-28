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
   * @param matrix
   * @returns [L, U] L is lower triangle matrix, U is upper
   */
  export function lu(matrix: Matrix): [Matrix, Matrix] | [null, null] {
    if (!matrix.isSquare()) return [null, null];
    /*
      Algorithm https://learn.lboro.ac.uk/archive/olmp/olmp_resources/pages/workbooks_1_50_jan2008/Workbook30/30_3_lu_decmp.pdf
      find LU = A (nxn matrix), P = 0 (zero vector of n dimension)
        calculate row by row 
            find L and U of row i
                1. find L(i,j) (1 <= j < i)
                    L(i,j) = 1/U(j,j) * { A(i,j) - Sigma_k (L(i,k) * U(k,i-1)) }     (sigma's k is in [1,j-2] )
                and L(i,i) = 1
                2. find U(i,j) (i <= j <= n)
                        U(i,j) = A(i,j) - Sigma_k (L(i,k) * U(k,j)) (sigma's k is in [1,i-1])
                        if i = j and U(i,j) = 0 then return null
      */
    const [L, U] = [
      Matrix.zero(matrix.height, matrix.width),
      Matrix.zero(matrix.height, matrix.width),
    ];
    // find L(i,j) and U(i,j) row by row
    for (let row = 0; row < matrix.height; row++) {
      // find L(i,j)
      for (let column = 0; column < row; column++) {
        let sigma = 0;
        for (let k = 0; k < column; k++) sigma += L._(row, k) * U._(k, row - 1);
        L.set(
          row,
          column,
          (matrix._(row, column) - sigma) / U._(column, column)
        );
      }
      // L(i,i)=1
      L.set(row, row, 1);
      // find U(i,j)
      for (let column = row; column < matrix.width; column++) {
        let sigma = 0;
        for (let k = 0; k < row; k++) sigma += L._(row, k) * U._(k, column);
        const u = matrix._(row, column) - sigma;
        U.set(row, column, u);
        if (row === column && u === 0) return [null, null];
      }
    }
    return [L, U];
  }

  /**
   * QR decomposition Using the Gram‚Äö√Ñ√¨Schmidt process to return [Q, R]
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
