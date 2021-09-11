namespace MATH_MATRIX {
  export class Matrix {
    elements: Float32Array | number[];

    /**
     * e.g. 2x3 matrix
     * ```
     * new Matrix([
     *  1, 2, 3 // column 1
     *  4, 5, 6 // column 2
     * ], 2, 3)
     * ```
     *
     * e.g. diagonal 3x3 matrix
     * ```
     * new Matrix(2, 3, 3)
     * // equql to new Matrix([2,0,0, 0,2,0, 0,0,2], 3, 3)
     * ```
     *
     * @param elements
     * @param width
     * @param height
     */
    constructor(
      elements: Float32Array | number[] | number,
      public width: number,
      public height: number
    ) {
      // elements is element
      if (typeof elements === "number") {
        this.elements = new Float32Array(width * height);
        for (let i = 0; i < Math.min(width, height); i++)
          this.set(i, i, elements);
      } else
        this.elements =
          elements instanceof Float32Array
            ? elements
            : new Float32Array(elements);
    }

    /**
     * addition. overide this elements and return this
     * @param anotherMattrix
     * @returns
     */
    add(anotherMattrix: Matrix): this {
      for (let i = 0; i < this.elements.length; i++)
        this.elements[i] += anotherMattrix.elements[i];
      return this;
    }

    /**
     * addition. not overide this elements and return new instance
     * @param anotherMattrix
     * @returns
     */
    addNew(anothterMatrix: Matrix): Matrix {
      const newMatrix = this.clone();
      return newMatrix.add(anothterMatrix);
    }

    /**
     * set 0 to all elemtns of a row
     */
    clearRow(rowIndex: number): this {
      for (let column = 0; column < this.width; column++)
        this.set(rowIndex, column, 0);
      return this;
    }

    clone(): Matrix {
      return new Matrix(
        new Float32Array(this.elements),
        this.width,
        this.height
      );
    }

    /**
     * multiplication
     * @param anotherMattrix
     * @returns
     */
    multiply(by: Matrix | number): Matrix {
      if (by instanceof Matrix) {
        const product = new Matrix(
          new Float32Array(by.width * this.height),
          by.width,
          this.height
        );
        for (let rowIndex = 0; rowIndex < product.height; rowIndex++) {
          for (
            let columnIndex = 0;
            columnIndex < product.width;
            columnIndex++
          ) {
            for (let k = 0; k < product.height; k++)
              product.elements[
                product.getFlatArrayIndex(rowIndex, columnIndex)
              ] += this._(rowIndex, k) * by._(k, columnIndex);
          }
        }
        return product;
      } else {
        for (let i = 0; i < this.elements.length; i++) this.elements[i] *= by;
        return this;
      }
    }
    multiplyNew(by: Matrix | number): Matrix {
      const clone = this.clone();
      return clone.multiply(by);
    }

    /**
     *  get Identity matrix
     * @param width
     * @returns
     */
    static identity(width: number): Matrix {
      const zero = Matrix.zero(width, width);
      for (let diagonalIndex = 0; diagonalIndex < width; diagonalIndex++)
        zero.elements[zero.getFlatArrayIndex(diagonalIndex, diagonalIndex)] = 1;
      return zero;
    }

    isSquare(): boolean {
      return this.width === this.height;
    }

    /**
     * get zero matrix
     * @param width
     * @param height
     * @returns
     */
    static zero(width: number, height: number): Matrix {
      return new Matrix(
        new Float32Array(width * height), // zeros
        width,
        height
      );
    }

    /**
     * get inverse matrix with Gauss-Jordan-Elimination (override this elements)
     * if this matri is singular, then return null
     * */
    inverse(): Matrix | null {
      const identity = Matrix.identity(this.width);
      for (let column = 0; column < this.width; column++) {
        // 1. find non-zero element of this column vector
        let nonZeroRow = column;
        let nonZeroElement = this._(nonZeroRow, column);
        if (nonZeroElement === 0) {
          for (
            nonZeroRow = column + 1;
            nonZeroRow < this.height;
            nonZeroRow++
          ) {
            nonZeroElement = this._(nonZeroRow, column);
            if (nonZeroElement !== 0) {
              // swap row so that diagonal element is not zero
              this.swapRowIAndJ(column, nonZeroRow);
              identity.swapRowIAndJ(column, nonZeroRow);
              break;
            }
            if (nonZeroRow === this.height - 1) return null;
          }
        }
        // 2. make non-zero element 1
        if (nonZeroElement !== 1) {
          this.multiplyRowIByA(nonZeroRow, 1 / nonZeroElement);
          identity.multiplyRowIByA(nonZeroRow, 1 / nonZeroElement);
        }
        // 3. row reduction (make all elements of this column zero but found no-zero element)
        for (let row = 0; row < this.height; row++)
          if (row !== nonZeroRow) {
            const element = this._(row, column);
            if (element !== 0) {
              this.subtractRowIByJMultipliedByA(row, nonZeroRow, element);
              identity.subtractRowIByJMultipliedByA(row, nonZeroRow, element);
            }
          }
      }
      return identity;
    }

    /**
     * get inverse matrix without overriding this elements
     * @returns
     */
    inverseNew(): Matrix | null {
      const clone = this.clone();
      return clone.inverse();
    }

    /**
     * set new value to element where row = rowIndex and column = columnIndex
     * @param rowIndex
     * @param columnIndex
     * @param element
     */
    set(rowIndex: number, columnIndex: number, element: number): void {
      this.elements[this.getFlatArrayIndex(rowIndex, columnIndex)] = element;
    }

    /**
     * subtraction. overide this elements and return this
     * @param anotherMattrix
     * @returns
     */
    subtract(anotherMattrix: Matrix): this {
      for (let i = 0; i < this.elements.length; i++)
        this.elements[i] -= anotherMattrix.elements[i];
      return this;
    }

    /**
     * subtraction. not overide this elements and return new instance
     * @param anotherMattrix
     * @returns
     */
    subtractNew(anotherMattrix: Matrix): Matrix {
      const clone = this.clone();
      return clone.subtract(anotherMattrix);
    }

    /**
     * get element by index
     * @param rowIndex column index (i >= 0)
     * @param columnIndex row index (j >=0)
     */
    _(rowIndex: number, columnIndex: number): number {
      return this.elements[this.getFlatArrayIndex(rowIndex, columnIndex)];
    }

    private getFlatArrayIndex(rowIndex: number, columnIndex: number): number {
      return this.width * rowIndex + columnIndex;
    }

    private swapRowIAndJ(rowI: number, rowJ: number): void {
      for (let column = 0; column < this.width; column++) {
        const rowIIndex = this.getFlatArrayIndex(rowI, column);
        const rowJIndex = this.getFlatArrayIndex(rowJ, column);
        // temp
        const rowIElement = this.elements[rowIIndex];
        // swap
        this.elements[rowIIndex] = this.elements[rowJIndex];
        this.elements[rowJIndex] = rowIElement;
      }
    }

    /**
     * (row I) = (row I) * a
     * @param rowI
     * @param byA
     */
    private multiplyRowIByA(rowI: number, byA: number): void {
      for (let column = 0; column < this.width; column++)
        this.elements[this.getFlatArrayIndex(rowI, column)] =
          this._(rowI, column) * byA;
    }

    /**
     * (row I) = (row I) - (row J) * (a)
     * @param rowI
     * @param rowJ
     * @param multipliedByA
     */
    private subtractRowIByJMultipliedByA(
      rowI: number,
      rowJ: number,
      multipliedByA: number
    ) {
      for (let column = 0; column < this.width; column++) {
        this.elements[this.getFlatArrayIndex(rowI, column)] -=
          this.elements[this.getFlatArrayIndex(rowJ, column)] * multipliedByA;
      }
    }
  }

  export class Vector extends Matrix {
    constructor(elements: Float32Array | number[]) {
      super(elements, 1, elements.length);
    }

    override _(index: number): number {
      return this.elements[index];
    }

    override clone(): Vector {
      return new Vector(new Float32Array(this.elements));
    }

    override multiply(by: Matrix | number): Vector {
      return super.multiply(by) as Vector;
    }
    override multiplyNew(by: Matrix | number): Vector {
      return super.multiplyNew(by) as Vector;
    }

    /**
     * (x1*x1 + x2*x2 + ... + xn*xn)^1/2
     * @returns
     */
    norm(): number {
      return Math.sqrt(this.squaredNorm());
    }

    /**
     * (x1*x1 + x2*x2 + ... + xn*xn)
     * @returns
     */
    squaredNorm(): number {
      let sum = 0;
      for (let i = 0; i < this.elements.length; i++)
        sum += this._(i) * this._(i);
      return sum;
    }

    override set(index: number, element: number): void {
      this.elements[index] = element;
    }

    transpose(): this {
      [this.width, this.height] = [this.height, this.width];
      return this;
    }

    transposeNew(): Vector {
      const clone = this.clone();
      return (clone as Vector).transpose();
    }

    static override zero(size: number): Vector {
      return new Vector(new Float32Array(size));
    }
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
      Matrix.zero(matrix.width, matrix.height),
      Matrix.zero(matrix.width, matrix.height),
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
      L.set(i, i, Math.sqrt(matrix._(i, i) - sigma));
    }
    return L;
  }

  /**
   * Apply hessian modification to a matrix so that the matrix is positive definite by adding mulltiple of an identity matrix
   * @param matrix
   * @param firstNonZeroShift default value of tau
   * @returns
   */
  export function hessianModification(
    matrix: Matrix,
    firstNonZeroShift = 1e-3
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
      tau = Math.max(2 * tau, firstNonZeroShift);
    }
  }

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
    static lu(A: Matrix, b: Float32Array | number[]): Float32Array | null {
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
      const [L, U] = lu(A);
      if (L === null || U === null) return null;
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

  // tests
  {
    // test("matrix", () => {
    //   const A = new Matrix([1, 2, 3, 0, 1, -4, 4, 8, 7], 3, 3);
    //   const invA = A.inverseNew();
    //   const identity = A.multiply(invA as Matrix);
    //   for (let i = 0; i < identity.height; i++)
    //     for (let j = 0; j < identity.width; j++)
    //       expect(Math.abs((i === j ? 1 : 0) - identity._(i, j)) < 0.0001).toBe(
    //         true
    //       );
    // });
    // test("multiplication", () => {
    //   const A = new Matrix([1, 2, 3, 0], 2, 2);
    //   const B = new Matrix([1, 2, 3, 0], 2, 2);
    //   const C = A.multiply(B);
    //   expect(C).toEqual(new Matrix([7, 2, 3, 6], 2, 2));
    // });
    // const testLU = (A: Matrix, l: number[], u: number[]) => {
    //   test("lu decomposition", () => {
    //     const [L, U] = lu(A) as [Matrix, Matrix];
    //     expect(L.multiply(U)).toEqual(A);
    //     expect(L.elements).toEqual(new Float32Array(l));
    //     expect(U.elements).toEqual(new Float32Array(u));
    //   });
    // };
    // testLU(
    //   new Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
    //   [1, 0, 0, 3, 1, 0, 2, 1, 1],
    //   [1, 2, 4, 0, 2, 2, 0, 0, 3]
    // );
    // testLU(
    //   new Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
    //   [1, 0, 0, -2, 1, 0, 0, 4, 1],
    //   [3, 1, 6, 0, 2, -4, 0, 0, -1]
    // );
    // const testLuSolver = (A: Matrix, b: number[], x: number[]) =>
    //   test("lu solver", () => {
    //     expect(Solver.lu(A, new Vector(b))).toEqual(new Vector(x));
    //   });
    // testLuSolver(
    //   new Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
    //   [3, 13, 4],
    //   [3, 4, -2]
    // );
    // testLuSolver(
    //   new Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
    //   [0, 4, 17],
    //   [2, 0, -1]
    // );
    // test("cholesky", () => {
    //   const A = new Matrix([4, 12, -16, 12, 37, -43, -16, -43, 98], 3, 3);
    //   const L = cholesky(A);
    //   expect(L).toEqual(new Matrix([2, 0, 0, 6, 1, 0, -8, 5, 3], 3, 3));
    // });
    // test("cholesky solver", () => {
    //   const A = new Matrix([1, -1, 2, -1, 5, -4, 2, -4, 6], 3, 3);
    //   expect(Solver.cholesky(A, [17, 31, -5])).toEqual(
    //     new Float32Array([51.5, 4.5, -15])
    //   );
    // });
  }
}
