import { GPU } from "gpu.js";
import { Matrix } from "./matrix";
import { cholesky, lu } from "./matrix-decomposition";
import { Vector } from "./vector";

/**
 * solve linear system Ax = b
 */
export class Solver {
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

  /**
   * solve A x = b by Gauss-Seidel method
   * ```
   *  A = L + U
   *    where L and U are lower and strictly upper triangular components of A
   *  update x by L^-1 (b - Ux)
   *    or in element-based, xi = 1/a_ii (b_i - Sigma_j(0 to j-2) a_ij * x_j - Sigma_j(i to n-1) a_ij * x_j)
   *  until A x - b is nearly equal to zero
   * ```
   * @param A
   * @param x initial guess (ones or zeros of more acurate x, whatever)
   * @param b
   * @param iterationCount
   * @returns
   */
  static gaussSiedel(
    A: Matrix,
    x: Vector,
    b: Vector,
    iterationCount?: number,
    tolerance = 1e-3
  ): Vector {
    if (iterationCount === 0) return x;
    let k = 0;
    while (true) {
      for (let i = 0; i < A.height; i++) {
        let sigma = 0;
        for (let j = 0; j < A.width; j++)
          if (j !== i) sigma += A._(i, j) * x._(j);
        x.set(i, (b._(i) - sigma) / A._(i, i));
      }
      k++;
      if (iterationCount === undefined) {
        if (
          A.multiplyVector(x, Vector).subtractNew(b).squaredNorm() < tolerance
        )
          break;
      } else if (k > iterationCount) break;
    }
    return x;
  }

  /**
   * solve A x = b by Jacobi method
   * ```
   *  A = D + L + U
   *  update x by D^-1 (b - (L+U)x )
   *    or in element-based, 1/a_ii (bi - Sigma_j a_ij * x_j)
   *  until Ax - b is nealy equal to zero
   * ```
   * @param A
   * @param x initial guess (ones or zeros of more acurate x, whatever)
   * @param b
   * @param iterationCount
   * @returns
   */
  static jacobi(
    A: Matrix,
    x: Vector,
    b: Vector,
    iterationCount?: number,
    tolerance = 1e-3
  ): Vector {
    if (iterationCount === 0) return x;
    let k = 0;
    while (true) {
      const x_new = x.clone();
      for (let i = 0; i < A.height; i++) {
        if (A._(i, i) === 0) continue;
        let sigma = 0;
        for (let j = 0; j < A.width; j++)
          if (j !== i) sigma += A._(i, j) * x._(j);
        x_new.set(i, (b._(i) - sigma) / A._(i, i));
      }
      x.elements = x_new.elements;
      k++;
      if (iterationCount === undefined) {
        if (
          A.multiplyVector(x, Vector).subtractNew(b).squaredNorm() < tolerance
        )
          break;
      } else if (k > iterationCount) break;
    }
    return x;
  }

  private static gpu = new GPU();
  private static kernel__jacobi(
    A: Matrix,
    x: Vector,
    b: Vector,
    iterationCount?: number,
    tolerance = 1e-3
  ): void {
    const x_new = x.clone();
    const kernel = Solver.gpu.createKernel(
      function (A: Float32Array, x: Float32Array) {
        if (A[this.thread.x][this.thread.x] === 0) return x[this.thread.x];
        let sigma = 0;
      },
      { output: [A.height] }
    );
    for (let i = 0; i < A.height; i++) {
      if (A._(i, i) === 0) continue;
      let sigma = 0;
      for (let j = 0; j < A.width; j++)
        if (j !== i) sigma += A._(i, j) * x._(j);
      x_new.set(i, (b._(i) - sigma) / A._(i, i));
    }
    x.elements = x_new.elements;
  }

  /**
   * sole Ax = b by LU decomposition
   * @param A
   * @param b
   * @returns x as vector
   */
  static lu(
    A: Matrix,
    b: Vector,
    L?: Matrix,
    U?: Matrix,
    P: Matrix | null = null
  ): Vector {
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
    if (L === undefined || U === undefined) [L, U, P] = lu(A);
    if (P) b = P.multiplyVector(b, Vector);
    // solve Ly = b
    const y = new Float32Array(L.height);
    for (let i = 0; i < y.length; i++) {
      if (L._(i, i) === 0) continue;
      let sigma = 0;
      for (let k = 0; k < i; k++) sigma += L._(i, k) * y[k];
      y[i] = (b._(i) - sigma) / L._(i, i);
    }
    // slve Ux = y
    const x = Vector.zero(U.height);
    for (let i = x.height - 1; i >= 0; i--) {
      if (U._(i, i) === 0) continue;
      let sigma = 0;
      for (let k = i + 1; k <= x.height - 1; k++) sigma += U._(i, k) * x._(k);
      x.set(i, (y[i] - sigma) / U._(i, i));
    }
    return x;
  }
}
