/// <reference path="../helpers/algorithm/descent-method.ts" />
/// <reference path="../helpers/ui.ts" />
/// <reference path="../helpers/math/matrix.ts" />
/// <reference path="../@types/index.d.ts" />

namespace MIN_SIMULATOR {
  export class Simulator {
    iteration = 0;
    /** (x,y,z) coordinate of end points of springs */
    positions: Vec3[] = [];
    p: MATH_MATRIX.Vector;

    /**
     *
     * @param points positions in 3d space, which can be used as end points of springs as specified by 2nd parameter springIndices
     */
    constructor(
      public fx: (p: MATH_MATRIX.Vector) => number,
      public grad: (p: MATH_MATRIX.Vector) => MATH_MATRIX.Vector,
      public hessian: (p: MATH_MATRIX.Vector) => MATH_MATRIX.Matrix,
      initialGuess: MATH_MATRIX.Vector,
      minX = -100,
      maxX = 100,
      step = 0.1
    ) {
      this.p = initialGuess;
      UI.printTo(
        3,
        `initial guess: (${initialGuess._(0)} ${initialGuess._(1)})`
      );
      // for (let x = minX; x <= maxX; x += step)
      // this.positions.push([x, 0, this.fx(new MATH_MATRIX.Vector([x]))]);
      UI.printTo(0, `objective function: ${this.fx}}`);
    }

    minPosition(): Vec3 {
      return [this.p._(0), 0, this.fx(this.p)];
    }

    minimize(): void {
      const x0 = this.p._(0);
      DESCENT_METHOD.updateByNewtonRaphson(
        this.p,
        this.fx,
        this.grad,
        this.hessian,
        1
      );
      const x1 = this.p._(0);
      if (x1 !== x0) this.iteration++;
      UI.printTo(1, `min f(p) = ${this.fx(this.p)} at x = ${this.p._(0)}`);
      UI.printTo(2, `iteration: ${this.iteration}`);
    }
  }
}
