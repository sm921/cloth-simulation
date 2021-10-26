import {
  letAddVec,
  LetKernel,
  letScaleVec,
  letSubVec,
} from "../gpgpu/gpgpuVec";
import { ENABLES_GPU, Matrix } from "./matrix";

/** (x,y) */
export type Vec2 = [number, number];
/** (x,y,z) */
export type Vec3 = [number, number, number];
/** (x,y,z,w) */
export type Vec4 = [number, number, number, number];

type Kernel<T> = (a: Vector, b: T) => Vector;
interface Kernels {
  add: { [n: number]: Kernel<Vector> };
  subtract: { [n: number]: Kernel<Vector> };
  scale: { [n: number]: Kernel<number> };
}

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
    return this.useKernel((kernel) => kernel.add, vec, letAddVec, this.add);
  }

  override clone(): Vector {
    return new Vector(new Float32Array(this.elements));
  }

  dot(vec: Vector): number {
    let sum = 0;
    for (let i = 0; i < this.elements.length; i++) sum += this._(i) * vec._(i);
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
    return this.useKernel(
      (k) => k.scale,
      scalar,
      letScaleVec,
      this.multiplyScalar
    );
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
    return this.useKernel(
      (kernel) => kernel.subtract,
      vec,
      letSubVec,
      this.subtract
    );
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
    for (let i = 0; i < this.elements.length; i++) sum += this._(i) * this._(i);
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

  private kernel: Kernels = {
    add: {},
    subtract: {},
    scale: {},
  };

  private useKernel<T>(
    selectKernel: (kernel: Kernels) => { [n: number]: Kernel<T> },
    b: T,
    letKernel: LetKernel<T>,
    onCpu: ((a: Vector, b: Vector) => Vector) | ((b: number) => Vector)
  ): Vector {
    const n = this.elements.length;
    return !ENABLES_GPU || n < 1e2
      ? onCpu.bind(this.clone())(b)
      : (
          selectKernel(this.kernel)[n] ??
          (selectKernel(this.kernel)[n] = letKernel(n))
        )(this, b);
  }
}
