/// <reference path="../helpers/math/math.ts" />
/// <reference path="mgmesh.ts" />

namespace MG {
  export function solve1d(
    f: (x: number) => number,
    phi: (x: number) => number
  ): [number[], Float32Array] {
    const N = 101;
    const xl = 0;
    const xh = 1;
    const dx = (xh - xl) / (N - 1);
    const dx2 = dx * dx;
    const x = Array(N);
    for (let i = 0; i < N; i++) x[i] = xl + i * dx;
    const M = MATH.Matrix.zero(N, N);
    const w = MATH.Vector.zero(N);
    for (let i = 0; i < N; i++) w.set(i, f(x[i]) * dx2);
    w.set(0, w._(0) - phi(0));
    w.set(N - 1, w._(N - 1) - phi(x[N - 1]));
    for (let i = 0; i < N; i++) {
      if (i > 0) M.set(i, i - 1, 1);
      M.set(i, i, -2);
      if (i < N - 1) M.set(i, i + 1, 1);
    }
    const mg = new Mg(M, new MATH.Vector(x), 1, 2);
    const result = MATH.Vector.ones(w.height);
    mg.solve(result, w, 1, 0);
    return [x, result.elements];
  }

  export function solve2d(
    f: (x: number, y: number) => number,
    phi: (x: number, y: number) => number
  ): [number[], number[], Float32Array] {
    const h = 0.05;
    const h2 = h * h;
    const n = Math.ceil(1 / h) + 1;
    const N = n * n;
    const w = MATH.Vector.zero(N);
    const x = Array(N);
    const y = Array(N);
    const M = MATH.Matrix.zero(N, N);
    const positions = MATH.Vector.zero(n * n * 2);
    function ij2idx(i: number, j: number) {
      return i * n + j;
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const idx = ij2idx(i, j);
        const [_x, _y] = [i * h, j * h];
        x[idx] = _x;
        y[idx] = _y;
        positions.set(2 * idx, _x);
        positions.set(2 * idx + 1, _y);
        // suppose phi is known on boundary
        if (i === 0 || i === n - 1 || j === 0 || j === n - 1) {
          M.set(idx, idx, 1);
          w.set(idx, phi(_x, _y));
        } else {
          M.set(idx, idx, -4 / h2);
          for (const [_i, _j] of [
            [i - 1, j],
            [i + 1, j],
            [i, j - 1],
            [i, j + 1],
          ]) {
            const idx2 = ij2idx(_i, _j);
            if (0 <= idx2 && idx2 <= N) M.set(idx, idx2, 1 / h2);
          }
        }
      }
    const mg = new Mg(M, positions, 2, 2);
    const result = MATH.Vector.zero(w.height);
    mg.solve(result, w, 3, 3);
    return [x, y, result.elements];
  }

  class Mg {
    /** system matrices for each level */
    A!: MATH.Matrix[];
    /** index buffers of positions */
    grids!: number[][];
    /** interpolation matrices for each level */
    I!: MATH.Matrix[];
    /** restriction matrices for each level */
    R!: MATH.Matrix[];

    constructor(
      A: MATH.Matrix,
      /** positions */
      public x: MATH.Vector,
      dimenstion: 1 | 2,
      public level: number
    ) {
      this.initGrid(dimenstion);
      this.initI(dimenstion);
      this.initR(dimenstion);
      this.initA(A);
    }

    /**
     * one thing implicit in most papers is that
     * it's necessary to run whole cycle multiple times to solve the equasion
     * @param x
     * @param b
     */
    solve(
      x: MATH.Vector,
      b: MATH.Vector,
      iteration: number,
      smooth: number
    ): void {
      for (let i = 0; i < iteration; i++) {
        MATH.Solver.jacobi(this.A[0], x, b, smooth);
        let r = [b.subtractNew(this.A[0].multiplyVector(x))];
        const e: MATH.Vector[] = [MATH.Vector.zero(0)];
        for (let l = 0; l < this.level - 1; l++) {
          r[l + 1] = this.R[l].multiplyVector(r[l]);
          e[l + 1] = MATH.Vector.zero(r[l + 1].height);
          if (l < this.level - 2)
            MATH.Solver.jacobi(this.A[l + 1], e[l + 1], r[l + 1], smooth);
          else e[l + 1] = MATH.Solver.lu(this.A[l + 1], r[l + 1]);
        }
        for (let l = this.level - 1; l > 1; l--) {
          e[l - 1].add(this.I[l - 1].multiplyVector(e[l]));
          MATH.Solver.jacobi(this.A[l - 1], e[l - 1], r[l - 1], smooth);
        }
        x.add(this.I[0].multiplyVector(e[1]));
        MATH.Solver.jacobi(this.A[0], x, b, smooth);
      }
    }

    /**
     * note that it's not necessary to smooth erros or even to run multiple cycles
     * if multigrid is constructed completely accurate in terms of geometry
     * @param x
     * @param b
     */
    solveCompleteGeometricalMG(x: MATH.Vector, b: MATH.Vector): void {
      const r = b.subtractNew(this.A[0].multiplyVector(x));
      const r1 = this.R[0].multiplyVector(r);
      const e1 = MATH.Vector.zero(r1.height);
      const r2 = this.R[1].multiplyVector(r1);
      const e2 = MATH.Solver.lu(this.A[2], r2);
      e1.add(this.I[1].multiplyVector(e2));
      x.add(this.I[0].multiplyVector(e1));
    }

    private initA(A: MATH.Matrix): void {
      this.A = Array(this.level);
      this.A[0] = A;
      for (let l = 1; l < this.level; l++)
        this.A[l] = this.R[l - 1]
          .multiply(this.A[l - 1])
          .multiply(this.I[l - 1]);
    }

    private initGrid(dimenstion: 1 | 2): void {
      this.grids = Array(this.level);
      this.grids[0] = MATH.range(this.x.height / dimenstion);
      switch (dimenstion) {
        case 1:
          return this.initGrid1d();
        case 2:
          return this.initGrid2d();
      }
    }

    private initGrid1d(): void {
      for (let l = 1; l < this.level; l++) {
        const n = Math.ceil(this.grids[l - 1].length / 2);
        const stride = Math.pow(2, l);
        this.grids[l] = Array(n);
        for (let i = 0; i < this.grids[l].length; i++)
          this.grids[l][i] = stride * i;
      }
    }

    private initGrid2d(): void {
      for (let l = 1; l < this.level; l++) {
        const n = Math.sqrt(this.grids[l - 1].length);
        this.grids[l] = [];
        const stride = l + 1;
        for (let i = 0; i < n; i += stride) {
          for (let j = 0; j < n; j += stride) this.grids[l].push(i * n + j);
        }
      }
    }

    private initI(dimmension: 1 | 2): void {
      this.I = Array(this.level);
      switch (dimmension) {
        case 1:
          return this.initI1d();
        case 2:
          return this.initI2d();
      }
    }

    private initI1d(): void {
      for (let l = 0; l < this.level - 1; l++) {
        this.I[l] = MATH.Matrix.zero(
          this.grids[l].length,
          this.grids[l + 1].length
        );
        for (let i = 0; i < this.I[l].height; i++) {
          if (i % 2 === 0) this.I[l].set(i, i / 2, 1);
          else {
            if ((i - 1) / 2 >= 0) this.I[l].set(i, (i - 1) / 2, 0.5);
            if ((i + 1) / 2 < this.I[l].width)
              this.I[l].set(i, (i + 1) / 2, 0.5);
          }
        }
      }
    }

    private initI2d(): void {
      for (let l = 0; l < this.level - 1; l++) {
        this.I[l] = MATH.Matrix.zero(
          this.grids[l].length,
          this.grids[l + 1].length
        );
        const n = Math.sqrt(this.grids[l].length);
        const ij2idx = (i: number, j: number): number => {
          return i * n + j;
        };
        const exists = (i: number, j: number) =>
          0 < i && i < n - 1 && 0 < j && j < n - 1;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const idx = ij2idx(i, j);
            if (i % 2 === 0 && j % 2 === 0)
              this.I[l].set(idx, this.grids[l + 1].indexOf(idx), 1);
            else if (i % 2 === 1 && j % 2 === 1)
              for (const [i2, j2] of [
                [i - 1, j - 1],
                [i + 1, j - 1],
                [i - 1, j + 1],
                [i + 1, j + 1],
              ])
                if (exists(i2, j2))
                  this.I[l].set(
                    idx,
                    this.grids[l + 1].indexOf(ij2idx(i2, j2)),
                    0.25
                  );
                else if (i % 2 === 1)
                  for (const [i2, j2] of [
                    [i - 1, j],
                    [i + 1, j],
                  ])
                    if (exists(i2, j2))
                      this.I[l].set(
                        idx,
                        this.grids[l + 1].indexOf(ij2idx(i2, j2)),
                        0.5
                      );
                    else if (j % 2 === 1)
                      for (const [i2, j2] of [
                        [i, j - 1],
                        [i, j + 1],
                      ])
                        if (exists(i2, j2))
                          this.I[l].set(
                            idx,
                            this.grids[l + 1].indexOf(ij2idx(i2, j2)),
                            0.5
                          );
          }
        }
      }
    }

    private initR(_dimenstion: 1 | 2): void {
      this.R = Array(this.level);
      for (let l = 0; l < this.level - 1; l++)
        this.R[l] = this.I[l].transpose();
      // switch (dimenstion) {
      //   case 1:
      //     return this.initR1d();
      //   case 2:
      //     return this.initR2d();
      // }
    }

    private initR1d(): void {
      for (let l = 0; l < this.level - 1; l++)
        this.R[l] = this.I[l].transpose().multiplyScalar(2);
    }

    private initR2d(): void {
      for (let l = 0; l < this.level - 1; l++)
        this.R[l] = this.I[l].transpose().multiplyScalar(0.25);
    }
  }
}
