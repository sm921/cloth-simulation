namespace MATH {
  export class Matrix {
    elements: Float32Array;

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
      public height: number,
      public width: number
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
     * get column vector
     * @param columnIndex
     * @returns
     */
    columnVector(columnIndex: number): Vector {
      const columnVector = Vector.zero(this.height);
      for (let i = 0; i < columnVector.height; i++)
        columnVector.set(i, this._(i, columnIndex));
      return columnVector;
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

    forEach(
      callback: (rowIndex: number, columnIndex: number, element: number) => void
    ): void {
      for (let row = 0; row < this.height; row++)
        for (let column = 0; column < this.width; column++)
          callback(row, column, this._(row, column));
    }

    kroneckerProduct(matrix: Matrix): Matrix {
      const product = Matrix.zero(
        this.height * matrix.height,
        this.width * matrix.width
      );
      for (let row = 0; row < this.height; row++)
        for (let column = 0; column < this.width; column++) {
          const productBlock = matrix.multiplyScalarNew(this._(row, column));
          for (
            let rowBlockIndex = 0;
            rowBlockIndex < productBlock.height;
            rowBlockIndex++
          )
            for (
              let columnBlockIndex = 0;
              columnBlockIndex < productBlock.width;
              columnBlockIndex++
            ) {
              product.set(
                rowBlockIndex + row * matrix.height,
                columnBlockIndex + column * matrix.width,
                productBlock._(rowBlockIndex, columnBlockIndex)
              );
            }
        }
      return product;
    }

    /**
     * multiplication
     * @param anotherMattrix
     * @returns
     */
    multiply(by: Matrix): Matrix {
      const product = new Matrix(
        new Float32Array(by.width * this.height),
        this.height,
        by.width
      );
      for (let rowIndex = 0; rowIndex < product.height; rowIndex++) {
        for (let columnIndex = 0; columnIndex < product.width; columnIndex++) {
          for (let k = 0; k < this.width; k++)
            product.elements[
              product.getFlatArrayIndex(rowIndex, columnIndex)
            ] += this._(rowIndex, k) * by._(k, columnIndex);
        }
      }
      return product;
    }

    multiplyScalar(scalar: number): this {
      for (let i = 0; i < this.elements.length; i++) this.elements[i] *= scalar;
      return this;
    }

    multiplyScalarNew(scalar: number): Matrix {
      return this.clone().multiplyScalar(scalar);
    }

    multiplyVector(v: Vector): Vector {
      const productAsMatrix = this.multiply(v);
      const product = new Vector(productAsMatrix.elements);
      [product.height, product.width] = [
        productAsMatrix.height,
        productAsMatrix.width,
      ];
      return product;
    }

    /**
     *  get Identity matrix
     * @param size
     * @returns
     */
    static identity(size: number): Matrix {
      const zero = Matrix.zero(size, size);
      for (let diagonalIndex = 0; diagonalIndex < size; diagonalIndex++)
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
    static zero(height: number, width: number): Matrix {
      return new Matrix(
        new Float32Array(width * height), // zeros
        height,
        width
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
     * print elemtns in console for debug
     */
    toString(digit = 2, toFixed = 0): string {
      let string = "";
      this.forEach((i, j, el) => {
        string += `${String(el.toFixed(toFixed)).padStart(digit, " ")} `;
        if (j === this.width - 1) string += "\n";
      });
      return string;
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

    transpose(): Matrix {
      const t = Matrix.zero(this.width, this.height);
      for (let row = 0; row < t.height; row++)
        for (let column = 0; column < t.width; column++)
          t.set(row, column, this._(column, row));
      return t;
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
}
