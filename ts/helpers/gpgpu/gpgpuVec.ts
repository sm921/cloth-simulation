import { GPU, IKernelFunctionThis } from "gpu.js";
import { Vector } from "../math/vector";

export type LetKernel<T> = (n: number) => (a: Vector, b: T) => Vector;

const gpu = new GPU();

/** define kernel function to add n-d vectors */
export const letAddVec: LetKernel<Vector> = (n) => {
  const add = gpu.createKernel(
    function (a: Float32Array, b: Float32Array) {
      return a[this.thread.x] + b[this.thread.x];
    },
    { output: [n] }
  );
  return (a: Vector, b: Vector) =>
    new Vector(add(a.elements, b.elements) as Float32Array);
};

export const letScaleVec: LetKernel<number> = (n) => {
  const scale = gpu.createKernel(
    function (a: Float32Array, b: number) {
      return a[this.thread.x] * b;
    },
    { output: [n] }
  );
  return (a: Vector, b: number) =>
    new Vector(scale(a.elements, b) as Float32Array);
};

export const letSubVec: LetKernel<Vector> = (n) => {
  const subtract = gpu.createKernel(
    function (a: Float32Array, b: Float32Array) {
      return a[this.thread.x] - b[this.thread.x];
    },
    { output: [n] }
  );
  return (a: Vector, b: Vector) =>
    new Vector(subtract(a.elements, b.elements) as Float32Array);
};
