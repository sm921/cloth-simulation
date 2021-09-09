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
     * @param elements
     * @param width
     * @param height
     */
    constructor(
      elements: Float32Array | number[],
      public width: number,
      public height: number
    ) {
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
        const product = Matrix.zero(this.width, this.height);
        for (let i = 0; i < product.elements.length; i++)
          product.elements[i] *= by;
        return product;
      }
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
      return super.clone() as Vector;
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
   * solve linear system Ax = b
   */
  export class Solver {
    /**
     * sole Ax = b by LU decomposition
     * @param A
     * @param b
     * @returns x as vector
     */
    static lu(A: Matrix, b: Vector): Vector | null {
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
      const y = Vector.zero(L.height);
      for (let i = 0; i < y.height; i++) {
        let sigma = 0;
        for (let k = 0; k < i; k++) sigma += L._(i, k) * y._(k);
        y.set(i, (b._(i) - sigma) / L._(i, i));
      }
      // slve Ux = y
      const x = Vector.zero(U.height);
      for (let i = x.height - 1; i >= 0; i--) {
        let sigma = 0;
        for (let k = i + 1; k <= x.height - 1; k++) sigma += U._(i, k) * x._(k);
        x.set(i, (y._(i) - sigma) / U._(i, i));
      }
      return x;
    }
  }

  test("matrix", () => {
    const A = new Matrix([1, 2, 3, 0, 1, -4, 4, 8, 7], 3, 3);
    const invA = A.inverseNew();
    const identity = A.multiply(invA as Matrix);
    for (let i = 0; i < identity.height; i++)
      for (let j = 0; j < identity.width; j++)
        expect(Math.abs((i === j ? 1 : 0) - identity._(i, j)) < 0.0001).toBe(
          true
        );
  });

  test("multiplication", () => {
    const A = new Matrix([1, 2, 3, 0], 2, 2);
    const B = new Matrix([1, 2, 3, 0], 2, 2);
    const C = A.multiply(B);
    expect(C).toEqual(new Matrix([7, 2, 3, 6], 2, 2));
  });

  const testLU = (A: Matrix, l: number[], u: number[]) => {
    test("lu decomposition", () => {
      const [L, U] = lu(A) as [Matrix, Matrix];
      expect(L.multiply(U)).toEqual(A);
      expect(L.elements).toEqual(new Float32Array(l));
      expect(U.elements).toEqual(new Float32Array(u));
    });
  };
  testLU(
    new Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
    [1, 0, 0, 3, 1, 0, 2, 1, 1],
    [1, 2, 4, 0, 2, 2, 0, 0, 3]
  );
  testLU(
    new Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
    [1, 0, 0, -2, 1, 0, 0, 4, 1],
    [3, 1, 6, 0, 2, -4, 0, 0, -1]
  );

  const testLuSolver = (A: Matrix, b: number[], x: number[]) =>
    test("lu solver", () => {
      expect(Solver.lu(A, new Vector(b))).toEqual(new Vector(x));
    });
  testLuSolver(
    new Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3),
    [3, 13, 4],
    [3, 4, -2]
  );
  testLuSolver(
    new Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3),
    [0, 4, 17],
    [2, 0, -1]
  );
}
