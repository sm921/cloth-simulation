import { GPU } from "gpu.js";
const { input } = require("gpu.js");
import { Matrix } from "../math/matrix";

export type LetKernel<T> = (
  height: number,
  width: number
) => (a: Matrix, b: T) => Matrix;

export type LetKernelMul<T> = (
  m: number,
  n: number,
  k: number
) => (a: Matrix, b: T) => Matrix;

const gpu = new GPU();

export const letAddMat: LetKernel<Matrix> = (height: number, width: number) => {
  const add = gpu.createKernel(
    function (A: Float32Array, B: Float32Array) {
      return A[this.thread.y][this.thread.x] + B[this.thread.y][this.thread.x];
    },
    { output: [height * width] }
  );
  return (A: Matrix, B: Matrix) => {
    const mxn = [A.height, A.width];
    return new Matrix(
      add(input(A.elements, mxn), input(B.elements, mxn)) as Float32Array,
      A.height,
      A.width
    );
  };
};

/**
 * mxn nxk => mxk
 * @param m
 * @param n
 * @param k
 * @returns
 */
export const letMulMat: LetKernelMul<Matrix> = (
  m: number,
  n: number,
  k: number
) => {
  const multiply = gpu.createKernel(
    function (A: Float32Array, B: Float32Array) {
      let sum = 0;
      for (let i = 0; i < this.constants.n; i++) {
        sum += A[this.thread.y][i] * B[i][this.thread.x];
      }
      return sum;
    },
    { output: [m * k], constants: { n } }
  );
  return (A: Matrix, B: Matrix) => {
    const mxn = [A.height, A.width];
    return new Matrix(
      multiply(input(A.elements, mxn), input(B.elements, mxn)) as Float32Array,
      A.height,
      B.width
    );
  };
};

export const letScaleMat: LetKernel<number> = (
  height: number,
  width: number
) => {
  const scale = gpu.createKernel(
    function (A: Float32Array, b: number) {
      return A[this.thread.y][this.thread.x] * b;
    },
    { output: [height * width] }
  );
  return (A: Matrix, b: number) => {
    const mxn = [A.height, A.width];
    return new Matrix(
      scale(input(A.elements, mxn), b) as Float32Array,
      A.height,
      A.width
    );
  };
};

export const letSubMat: LetKernel<Matrix> = (height: number, width: number) => {
  const subtract = gpu.createKernel(
    function (A: Float32Array, B: Float32Array) {
      return A[this.thread.y][this.thread.x] - B[this.thread.y][this.thread.x];
    },
    { output: [height * width] }
  );
  return (A: Matrix, B: Matrix) => {
    const mxn = [A.height, A.width];
    return new Matrix(
      subtract(input(A.elements, mxn), input(B.elements, mxn)) as Float32Array,
      A.height,
      A.width
    );
  };
};
