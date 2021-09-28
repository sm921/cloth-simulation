/// <reference path="matrix.ts" />

namespace MATH {
  export class Vector extends Matrix {
    constructor(elements: Float32Array | number[]) {
      super(elements, 1, elements.length);
    }

    override _(index: number): number {
      return this.elements[index];
    }

    override add(vec: Vector): this {
      for (let i = 0; i < this.elements.length; i++)
        this.elements[i] += vec.elements[i];
      return this;
    }
    override addNew(vec: Vector): Vector {
      return this.clone().add(vec);
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

    multiplyScalar(scalar: number): this {
      for (let i = 0; i < this.elements.length; i++) this.elements[i] *= scalar;
      return this;
    }
    multiplyScalarNew(scalar: number): Vector {
      const product = this.clone();
      for (let i = 0; i < this.elements.length; i++)
        product.elements[i] *= scalar;
      return product;
    }
    /** column vec x row vec */
    multiplyVector(vec: Vector): Matrix {
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
    /** return Ax */
    multiplyMatrix(matrix: Matrix): Vector {
      const product = Vector.zero(matrix.height);
      for (let row = 0; row < product.height; row++)
        for (let column = 0; column < matrix.width; column++)
          product.elements[row] += matrix._(row, column) * this._(column);
      return product;
    }
    /**
     * @deprecated use multiplyScalar, multiplyVector, or multiplyMatrix instead
     */
    override multiply(by: Matrix | number): Vector {
      return super.multiply(by) as Vector;
    }
    /**
     * @deprecated use multiplyScalar, multiplyVector, or multiplyMatrix instead
     */
    override multiplyNew(by: Matrix | number): Vector {
      return super.multiplyNew(by) as Vector;
    }

    static ones(size: number): Vector {
      const v = Vector.zero(size);
      for (let i = 0; i < size; i++) v.set(i, 1);
      return v;
    }

    override subtract(vec: Vector): this {
      for (let i = 0; i < this.elements.length; i++)
        this.elements[i] -= vec.elements[i];
      return this;
    }
    override subtractNew(vec: Vector): Vector {
      return this.clone().subtract(vec);
    }

    /**
     * (x1*x1 + x2*x2 + ... + xn*xn)^1/2
     * @returns
     */
    norm(): number {
      return Math.sqrt(this.squaredNorm());
    }
    normalize(): this {
      return this.multiplyScalar(1 / this.norm());
    }
    normalizeNew(): Vector {
      return this.clone().normalize();
    }

    projectTo(to: Vector): Vector {
      return to.multiplyScalarNew(this.dot(to) / to.dot(to));
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
