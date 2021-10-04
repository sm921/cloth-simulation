/// <reference path="matrix.ts" />

namespace MATH {
  export class Vector extends Matrix {
    constructor(elements: Float32Array | number[]) {
      super(elements, elements.length, 1);
    }

    override _(index: number): number {
      return this.elements[index];
    }

    override add(vec: Vector): this {
      super.add(vec);
      return this;
    }
    override addNew(vec: Vector): Vector {
      return super.addNew(vec) as Vector;
    }

    override clone(): Vector {
      return new Vector(new Float32Array(this.elements));
    }

    dot(vec: Vector): number {
      let sum = 0;
      for (let i = 0; i < this.elements.length; i++)
        sum += this._(i) * vec._(i);
      return sum;
    }

    override kroneckerProduct(matrix: Matrix): Matrix {
      const product = Matrix.zero(
        this.height * matrix.height,
        this.width * matrix.width
      );
      const isRowVector = this.height === 1;
      for (let i = 0; i < this.elements.length; i++) {
        const productBlock = matrix.multiplyScalarNew(this._(i));
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
              rowBlockIndex + (isRowVector ? 0 : i * productBlock.height),
              columnBlockIndex + (isRowVector ? i * productBlock.width : 0),
              productBlock._(rowBlockIndex, columnBlockIndex)
            );
          }
      }
      return product;
    }

    override multiplyScalar(scalar: number): this {
      for (let i = 0; i < this.elements.length; i++) this.elements[i] *= scalar;
      return this;
    }

    override multiplyScalarNew(scalar: number): Vector {
      const product = this.clone();
      for (let i = 0; i < this.elements.length; i++)
        product.elements[i] *= scalar;
      return product;
    }

    /** column vec x row vec */
    outerProduct(vec: Vector): Matrix {
      const product = Matrix.zero(vec.width, this.height);
      for (let row = 0; row < product.width; row++)
        for (let column = 0; column < product.width; column++)
          product.set(row, column, this._(row) * vec._(column));
      return product;
    }

    multiplyElementwise(vec: Vector): this {
      for (let i = 0; i < this.elements.length; i++)
        this.set(i, this._(i) * vec._(i));
      return this;
    }

    multiplyElementwiseNew(vec: Vector): Vector {
      return this.clone().multiplyElementwise(vec);
    }

    static ones(size: number): Vector {
      const v = Vector.zero(size);
      for (let i = 0; i < size; i++) v.set(i, 1);
      return v;
    }

    override subtract(vec: Vector): this {
      return super.subtract(vec);
    }
    override subtractNew(vec: Vector): Vector {
      return super.subtractNew(vec) as Vector;
    }

    /**
     * (x1*x1 + x2*x2 + ... + xn*xn)^1/2
     * @returns
     */
    norm(): number {
      return Math.sqrt(this.squaredNorm());
    }
    normalize(): this {
      const norm = this.norm();
      return norm === 0 ? this : this.multiplyScalar(1 / norm);
    }
    normalizeNew(): Vector {
      return this.clone().normalize();
    }

    projectTo(to: Vector): Vector {
      const norm2 = to.squaredNorm();
      return norm2 === 0 ? to : to.multiplyScalarNew(this.dot(to) / norm2);
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

    override transpose(): this {
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
}
