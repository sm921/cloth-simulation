/// <reference path="matrix.ts" />

namespace MATH {
  /**
   * solve linear system Ax = b
   */
  export class Solver {
    /**
     * sole Ax = b by LU decomposition
     * @param A
     * @param b
     * @returns x as vector
     */
    static lu(
      A: Matrix,
      b: Float32Array | number[],
      L?: Matrix,
      U?: Matrix
    ): Float32Array | null {
      /*
      Algorithm
        Ax = b
        Let LU = A (L is lower triangle and U is upper)
        then LUx = b
        hence, solving Ax = b is equivalent to solve Ly = b and Ux = y
          solve Ly = b
            since L is lower triangle matrix
              y(i) = (b(i) - Sigma_k (L(i,k)*y(k))) / L(i,i)  (0<=k<i)
          solve Ux = y in the same manner
            since U is upper triangle matrix
              x(i) = (y(i) - Sigma_k (U(i,k)*x(k))) / U(i,i) (i<k<=n)
      */
      if (L === undefined || U === undefined) {
        const [_L, _U] = lu(A);
        if (_L === null || _U === null) return null;
        [L, U] = [_L, _U];
      }
      // solve Ly = b
      const y = new Float32Array(L.height);
      for (let i = 0; i < y.length; i++) {
        let sigma = 0;
        for (let k = 0; k < i; k++) sigma += L._(i, k) * y[k];
        y[i] = (b[i] - sigma) / L._(i, i);
      }
      // slve Ux = y
      const x = new Float32Array(U.height);
      for (let i = x.length - 1; i >= 0; i--) {
        let sigma = 0;
        for (let k = i + 1; k <= x.length - 1; k++) sigma += U._(i, k) * x[k];
        x[i] = (y[i] - sigma) / U._(i, i);
      }
      return x;
    }

    /**
     * solve Ax = b using cholesky decomposition
     *
     * return null if cholesky decomposition does not exist
     * @param AorL
     * @param b
     * @param skipsDecomposition set trure if AorL is L
     * @returns
     */
    static cholesky(
      AorL: Matrix,
      b: Float32Array | number[],
      skipsDecomposition?: boolean
    ): Float32Array | null {
      const L = skipsDecomposition ? AorL : cholesky(AorL);
      if (L === null) return null;
      /*
      
      Ax = b
      A = L*L' then LL'x = b
      substituting L'x with y, Ly = b and L'x = y
      solve Ly = b by forward substitution and L'x = y in backward substitution
        y(i) = (b(i) - Sigma_k(L(i,k)*y(k)) / L(i,i)  (0<=k<i)
        x(i) = (y(i) - Sigma_k(L'(i,k)*x(k)) / L'(i,i)  (i<k<=n)
      */
      const y = new Float32Array(b.length);
      for (let i = 0; i < y.length; i++) {
        let sigma = 0;
        for (let k = 0; k < i; k++) sigma += L._(i, k) * y[k];
        y[i] = (b[i] - sigma) / L._(i, i);
      }
      const x = new Float32Array(b.length);
      for (let i = x.length - 1; i >= 0; i--) {
        let sigma = 0;
        for (let k = x.length - 1; k > i; k--) sigma += L._(k, i) * x[k];
        x[i] = (y[i] - sigma) / L._(i, i);
      }
      return x;
    }
  }
}
