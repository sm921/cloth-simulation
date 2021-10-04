/// <reference path="../math/math.ts" />

/**
 * Implementation of "A Scalable Galerkin Multigrid Method for Real-time Simulation of Deformable Objects"
 * by ZANGYUEYANG XIAN, Shanghai Jiao Tong University and Microsoft Research Asia XIN TONG, Microsoft Research Asia TIANTIAN LIU, Microsoft Research Asia
 * https://tiantianliu.cn/papers/xian2019multigrid/xian2019multigrid.pdf
 *
 * one modification is to optimize interpolations and restrictions in the same manner with the fast update of system matrix
 * ```
 * Algorithm: Galerkin Multigrid with 0-1 weight
 *
 * ## goal: solve Ax=b
 *  A is 3n　x　3n, x is 3n　x　1, b is 3n　x　1
 *
 * ## initialization
 *
 * ### 1. grids = [x, x1, x2, ..., xn]
 *  x is 3n by 1, x1 is 12k by　1, x2 is 12k2 by 1, ..., xn is 12kn by 12kn
 *  where k1 > k2 > ... > kn
 *   and x contains all positions, x1 contains some positions in x, x2 contains some positions in x2, ..., xn contains some positions in x_n-1
 *  xk is sampled uniformally by furthest point sampling
 *
 * ### 2. interpolation matrices with 0-1 weight
 *  U1 is 3n x　12k1, U2 is 12k1 x 12k2, ..., Un is 12kn x 12k_n-1
 *  such that Uk's i-th row-block's only non-zero block is i1-th block (i1 = argmin_i1(|| x[i]-x_k+1[i1] ||) )
 *  and such non-zero block is (xk[i]^t, 1) * I3 for k=1, and I12 for k=2,...,n
 * however, hence Uk's i-th block's only non-zero block is i1-th block, multiplication of U to residual is very fast as follows
 * let interpolation mappings be [null, M1, M2, ..., Mn]
 *  where M1 = [0_1, 1_1, 2_1, ..., i1, ..., n1] (i-th element is the nearest index in a coarse grid to the fine grid)
 *  then, interpolation is x[i] = (x[i]^t, 1) * I r1[M1[i]] and r_k-1[i] = I r_k[Mk[i]] for k=2,3,...,n
 *  interpolate b in the same manner as r
 *
 * ### 3. restriction matrices with 0-1 weight
 * use Uk^t as restrictions
 * r1 = Ax-b, r2 = U1^t r1, ..., rn = Un^t r_n-1
 * since Uk's i-th row-block has only one non-zero block, Uk^t's i-th row-block is likely to have few non-zero blocks
 * hence, instead of using Uk^t, let restriction mappings be [null, m1, m2, ..., mn]
 *  mk is created by pushing i to mk[i1] (for i from 0 to len(Mk), and i1 = Mk[i])
 *  then, restriction is r1[i] = Sigma_k((x[k], 1) * I)r1 (k of mk[1]), rk[i] = ( len(mk[i]) I )r_k-1 (k of mk[i])
 *  restrict b in the same manner as r
 *
 * ## iterations
 * 1. (pre-smooth) update x by appling Gauss-Siedel or Jacobian method with small fixed iteration count like 3 to Ax = b
 * 2. (restriction) r1 = Ax-b. apply restiction to r1 and b1 using restriction mappings above
 * repeat 1 and 2 until it reaches to the coarsest level
 * 3. solve An rn = bn by LU decomposition
 * 4. (interpolation) apply interpolation to rn and bn using interpolation mappings above
 * 5. (smooth) update x by appling Gauss-Siedel or Jacobian method with small fixed iteration count like 3 to Ak rk = bk
 * repeat 4 and 5 until it reaches to the finest level
 * 6. update system matrices using restriction mappings
 * Ak_ij = Sigma Ak+1_mk[i]mk[j] (sum of mk[i] x mk[j]'s all combinations)
 * A1_ij = Sigma ((x[i]^t, 1)^t (x[j]^t, 1)) * A_m1[i]m1[j] (sum of m1[i] x m1[j]'s all combinations)
 * (addaptive smoother) if x[i]'s not changed since previous tierations, then skip calculations related to i-th position
 * repeat 1 to 6 until x converges
 * ```
 */
namespace MULTIGRID {
  export class Multigrid {
    blockSize = 12;
    /** indices of positions */
    grids: Float32Array[];
    /** residuals, r0, r1, ..., rn */
    residuals: MATH.Vector[];
    /** system matrices A0, A1, ..., An */
    A!: MATH.Matrix[];

    /** U0, U1, ..., Un */
    interpolations: MATH.Matrix[];
    /** U0^t, U1^t, ..., Un^t */
    restrictions: MATH.Matrix[];

    /** use this instead of multiplying U0^t, U1^t, ..., Un^t for fast update */
    restrictionMappings: number[][][];
    /** use this instead of multiplying U0, U1, ..., Un for fast update */
    interpolationMappings: Float32Array[];

    constructor(points: number[] | Float32Array, depth: number, gridRatio = 4) {
      const positions = pointsToVectors(points);
      this.grids = buildGrids(positions, depth, gridRatio);
      this.residuals = buildResiduals(this.grids, points);
      this.interpolationMappings = interpolationMappings(positions, this.grids);
      this.restrictionMappings = restrictionMappings(
        this.interpolationMappings,
        this.grids
      );
      this.interpolations = interpolationMatrices(positions, this.grids);
      this.restrictions = restrictionMatrices(this.interpolations);
      this.initiSystemMatrices();
      this.initRegularizations(positions);
    }

    initiSystemMatrices(): void {
      this.A = Array(this.grids.length);
      this.residuals.forEach((residual, i) => {
        this.A[i] = MATH.Matrix.zero(residual.height, residual.height);
      });
    }

    /**
     * interpolate residual from coarse to fine using interpolation mapping.
     * interpolation is r[i] = (x[i]^t, 1) * I r1[M1[i]] and r_k-1[i] = I r_k[Mk[i]] for k=2,3,...,n
     */
    interpolate(
      coarseLevel: number,
      e_coarse: MATH.Vector,
      e_fine: MATH.Vector
    ): void {
      const blockWidth = 12;
      const blockHeigt = coarseLevel === 1 ? 3 : blockWidth;
      const I3 = MATH.Matrix.identity(3);
      for (let i = 0; i < e_fine.height / blockHeigt; i++) {
        const ithBlockOfCoarseResidual = getIthBlockOfVector(
          this.interpolationMappings[coarseLevel - 1][i],
          e_coarse,
          blockWidth
        );
        setIthBlockOfVector(
          i,
          e_fine,
          coarseLevel === 1
            ? new MATH.Vector([
                e_fine._(3 * i),
                e_fine._(3 * i + 1),
                e_fine._(3 * i + 2),
                1,
              ])
                .transpose()
                .kroneckerProduct(I3)
                .multiplyVector(ithBlockOfCoarseResidual)
            : ithBlockOfCoarseResidual,
          true
        );
      }
    }

    /**
     * restrict a residual and b vector, using restrictions mapping
     * r = Ax-b, r1 = U1^t r, ..., rn = Un^t r_n-1
     *  r1[i] = Sigma_j Rj
     *    for j of mk[1]
     *    and Rj = (r0_j^t, 1)^t * I3 * r0_j is 12x3 block matrix of U1^t
     *      here, r0_j is r0's j-th block vector (3x1)
     *  rk[i] = Sigma_j r_k-1[j]
     *    for j of mk[i]
     *    and r_k-1[j] 12x3 block matrix of Uk^t
     *  restrict b in the same manner as r
     */
    restrict(coarseLevel: number): void {
      const [r_coarse, r_fine] = [
        this.residuals[coarseLevel],
        this.residuals[coarseLevel - 1],
      ];
      const blockHeight = 12;
      const mk = this.restrictionMappings[coarseLevel - 1];
      for (let i = 0; i < r_coarse.height / blockHeight; i++) {
        let sigma = MATH.Vector.zero(blockHeight);
        for (const j of mk[i]) {
          if (coarseLevel === 1) {
            const rj = getIthBlockOfVector(j, r_fine, 3);
            sigma.add(
              new MATH.Vector([rj._(0), rj._(1), rj._(2), 1])
                .kroneckerProduct(MATH.Matrix.identity(3))
                .multiplyVector(rj)
            );
          } else sigma.add(getIthBlockOfVector(j, r_fine, blockHeight));
        }
        setIthBlockOfVector(
          i,
          r_coarse,
          sigma.multiplyScalar(1 / mk[i].length)
        );
      }
    }

    /**
     * solve Ax = b
     * ```
     * ### Algorithm: n-grid V-cycle to solve Ax = b
     * 0. (initial guess) set x1 based (e.g. x1 = x0 + hv0 is guess by current position with inertia)
     * 1. (smooth) Ax1 = b
     * 2. r = Ax1-b
     * 3. (restrict)r1 = Ur
     * 4. (smooth) A1 e1 = r1 (e1 is initialized with zeros or ones)
     *  repeat 3 and 4 until it reaches to the coarsest level
     * 5. (solve) An en = rn
     * 6. (interpolate) e_n-1 += U^t en
     * 7. (smooth) A e_n-1 = r_n-1
     *  repeat 6 and 7 until it reaches to the finest level
     * 8. x = x1 + e1
     * 9. (smooth) Ax1 = b
     * 10. return x1
     * ```
     * @param A
     * @param x0 initial guess of x
     * @param b
     * @param  smoothCount how many iterations to run per smooth
     */
    solveBy2LevelMethot(
      A: MATH.Matrix,
      x: MATH.Vector,
      b: MATH.Vector,
      smoothCount = 5
    ): MATH.Vector {
      const x1 = x.clone();
      this.updateSystemMatrix(A, x1);
      this.regularize();
      x1.elements = MATH.Solver.jacobi(
        this.A[0],
        x1,
        b,
        smoothCount,
        undefined
      ).elements;
      const _b = block(A, 5, 5, 12, 12);
      const r0 = b.subtractNew(A.multiplyVector(x1));
      const r1 = this.restrictions[0].multiplyVector(r0);
      const e1 = this.A[1].inverseNew()?.multiplyVector(r1) as MATH.Vector;
      const e0 = this.interpolations[0].multiplyVector(e1);
      // const e1 = new MATH.Vector(
      //   MATH.Solver.cholesky(
      //     MATH.hessianModification(this.systemMatrices[1]),
      //     this.restrictions[0].multiplyVector(r0).elements
      //   ) as Float32Array
      // );
      x1.add(e0);
      x1.elements = MATH.Solver.jacobi(
        A,
        x1,
        b,
        smoothCount,
        undefined
      ).elements;
      const dx = x1.subtract(x);
      return dx;
    }

    /**
     * update a system matrix of a coarse level
     * @param A
     * @param x
     */
    private updateSystemMatrix(A: MATH.Matrix, x: MATH.Vector): void {
      this.A[0] = MATH.hessianModification(A);
      /*
      updating (i,j)-th block of system matrix of a fine level ends of with updating 12x12 (i1,j1)-th block of the syste mmatrix of a coarse level 
      by (xi^t, 1)^t (xj^t, 1) * A_ij for the 1st level, and A_ij for others 
        such that
          i1 is argmin_k ||x_fine[i] - x_coarse[k]||
          and j1 is argmin_k ||x_fine[j] - x_coarse[k]||
      */
      for (let level = 0; level < this.grids.length - 1; level++) {
        this.A[level + 1] = this.restrictions[level]
          .multiply(this.A[level])
          .multiply(this.interpolations[level]);
        // const [A_fine, A_coarse] = [
        //   this.systemMatrices[level],
        //   this.systemMatrices[level + 1],
        // ];
        // const restrictionMapping = this.restrictionMappings[level];
        // const blockSize = 12;
        // for (let i1 = 0; i1 < A_coarse.width / blockSize; i1++)
        //   for (let j1 = 0; j1 < A_coarse.width / blockSize; j1++) {
        // const sigma = MATH.Matrix.zero(blockSize, blockSize);
        // for (const i of restrictionMapping[i1])
        //   for (const j of restrictionMapping[j1]) {
        //     if (level === 0) {
        //       const [xi, xj] = [i, j].map((index) => {
        //         const xyz = getIthBlockOfVector(index, x, 3);
        //         return new MATH.Vector([xyz._(0), xyz._(1), xyz._(2), 1]);
        //       });
        //       sigma.add(
        //         xi
        //           .outerProduct(xj.transpose())
        //           .kroneckerProduct(block(A_fine, i, j, 3, 3))
        //       );
        //     } else sigma.add(block(A_fine, i, j, blockSize, blockSize));
        //   }
      }
    }

    private initRegularizations(x: MATH.Vector[]): void {
      const A1 = this.A[1];
      const mappings = this.restrictionMappings[0];
      for (let i1 = 0; i1 < A1.width / this.blockSize; i1++) {
        const nb = mappings[i1].length;
        const Ub = MATH.Matrix.zero(nb, 4);
        let row = 0;
        for (let i of mappings[i1]) {
          for (let xyz = 0; xyz < 3; xyz++) Ub.set(row, xyz, x[i]._(xyz));
          Ub.set(row, 3, 1);
        }
        const UbtUb = Ub.transpose().multiply(Ub);
        const eigenvalues = MATH.eigenvalues(UbtUb);
        for (const eigenvalue of eigenvalues) {
          if (eigenvalue < 1e-6) {
            const n = MATH.eigenvectorOf(UbtUb, eigenvalue, 1e-3);
            const nntI3 = n
              .outerProduct(n.transposeNew())
              .kroneckerProduct(MATH.Matrix.identity(3));
            this.regularizations.push({ index: i1, nntI3 });
          }
        }
      }
    }

    /** regularize A1 to make it non-singular (see 4.4 in the paper for detail)*/
    regularizations: {
      /** n n^t * I3 (12x12 matrix) */
      nntI3: MATH.Matrix;
      /** add nntI3 to the i-th diagonal 12x12 block matrix of A1 */
      index: number;
    }[] = [];

    private regularize(): void {
      for (const regularization of this.regularizations)
        addBlock(
          regularization.nntI3,
          this.A[1],
          regularization.index,
          regularization.index
        );
    }
  }
  /**
   * grids = [x, x1, x2, ..., xn]
   *  x is 3n by 1, x1 is 12k by　1, x2 is 12k2 by 1, ..., xn is 12kn by 12kn
   *  where k1 > k2 > ... > kn
   *   and x contains all positions, x1 contains some positions in x, x2 contains some positions in x2, ..., xn contains some positions in x_n-1
   *  xk is sampled uniformally by furthest point sampling
   * ```
   * ### Algorithm: Furthest point sampling method ###
   * 1. add a random point to empty set S
   * 2. add to S another point which is the furthest to S
   * 3. repeat 2 until S has desired number of elements
   * 4. repeat 1~3 for all levels
   * ```
   * @returns coarse grid and points which are not included in grid
   */
  function buildGrids(
    points: MATH.Vector[],
    depth: number,
    gridRatio = 4
  ): Float32Array[] {
    // init
    const grids: Float32Array[] = Array(depth);
    const pointsToAddIndices = MATH.range(points.length);
    grids[0] = new Float32Array(pointsToAddIndices);
    const distancesToGrid = new Float32Array(points.length);
    for (let pointIndex = 0; pointIndex < points.length; pointIndex++)
      distancesToGrid[pointIndex] = 1e12;
    const grid: number[] = [];
    // 4. repeat for all levels
    for (let level = depth; level > 0; level--) {
      // 1. add a random point for the first time
      if (level === depth) addPoint(pointsToAddIndices[0]);
      // add a furthest point
      else
        addPoint(
          pointsToAddIndices.reduce((a, b) =>
            distancesToGrid[a] < distancesToGrid[b] ? b : a
          )
        );
      const gridSize = Math.max(
        2,
        Math.ceil(points.length / Math.pow(gridRatio, level))
      );
      // 3. repeat until size is large enough
      while (grid.length < gridSize) {
        let furthestPointIndex = pointsToAddIndices[pointsToAddIndices[0]];
        let furthestDistance = 0;
        // update distnaces to S if necessary
        const newlyAddedPoint = points[grid[grid.length - 1]];
        for (let pointIndex of pointsToAddIndices) {
          const distanceToNewlyAddedPoint = newlyAddedPoint
            .subtractNew(points[pointIndex])
            .squaredNorm();
          const currentDistanceToS = distancesToGrid[pointIndex];
          if (distanceToNewlyAddedPoint < currentDistanceToS)
            distancesToGrid[pointIndex] = distanceToNewlyAddedPoint;
          if (furthestDistance < distancesToGrid[pointIndex]) {
            furthestDistance = distancesToGrid[pointIndex];
            furthestPointIndex = pointIndex;
          }
        }
        // 2. add furthest point to S
        addPoint(furthestPointIndex);
      }
      grids[level] = new Float32Array(grid);
    }
    return grids;

    function addPoint(pointIndex: number): void {
      grid.push(
        pointsToAddIndices.splice(pointsToAddIndices.indexOf(pointIndex), 1)[0]
      );
    }
  }

  /**
   * add small matrix to large matrix to update small portion of whole matrix
   * @param block
   * @param to
   * @param rowBlockIndex
   * @param columnBlockIndex
   */
  function addBlock(
    block: MATH.Matrix,
    to: MATH.Matrix,
    rowBlockIndex: number,
    columnBlockIndex: number
  ): void {
    const [row0, column0] = [
      block.height * rowBlockIndex,
      block.width * columnBlockIndex,
    ];
    for (let row = 0; row < block.width; row++)
      for (let column = 0; column < block.height; column++) {
        const [rowIndex, columnIndex] = [row0 + row, column0 + column];
        to.set(
          rowIndex,
          columnIndex,
          to._(rowIndex, columnIndex) + block._(row, column)
        );
      }
  }

  /**
   * residuals  = [r, r1, r2, ..., rn]
   *  such that r= Ax-b, r1 = U^t r, r2 = U^t r1, ..., rn = U^t r_n-1
   */
  function buildResiduals(
    grids: Float32Array[],
    positions: Float32Array | number[]
  ): MATH.Vector[] {
    const r = grids.map((grid, i) =>
      MATH.Vector.zero((i === 0 ? 3 : 12) * grid.length)
    );
    r[0] = new MATH.Vector(positions);
    return r;
  }

  /**
   * get i-th block of a vector, block is either 3x1 or 12x1
   * @param index
   * @param vector
   * @param numberOfCoordinates 3 for x,y,z, 12 for linear transformation of x -> Ax (A is 3 by 4 matrix that represents shear, rotation, move, and scale)
   * @returns
   */
  function getIthBlockOfVector(
    index: number,
    vector: MATH.Vector,
    numberOfCoordinates: number
  ): MATH.Vector {
    return new MATH.Vector(
      MATH.range(numberOfCoordinates).map((coordinate) =>
        vector._(numberOfCoordinates * index + coordinate)
      )
    );
  }

  /**
   * map form index of a fine grid to the nearest index of coarser grid
   * mappings = [M1, M2, ..., Mn]
   *  where M1 = [0_1, 1_1, 2_1, ..., i1, ..., n1] (i-th element is the nearest index in a coarse grid to the fine grid)
   * @param points
   * @param grids
   * @param memoOfPointVectors
   * @returns each element is a map from i to j such that j is argmin_j (||x_fine[i]-x_coarse[j]||)
   */
  function interpolationMappings(
    points: MATH.Vector[],
    grids: Float32Array[]
  ): Float32Array[] {
    const mappings: Float32Array[] = [];
    for (let level = 1; level < grids.length; level++) {
      const [x_fine, x_coarse] = [grids[level - 1], grids[level]];
      const mapping = new Float32Array(x_fine.length);
      for (let i = 0; i < x_fine.length; i++) {
        const x_fine_i = points[x_fine[i]];
        let minSquareNorm = Infinity;
        for (let j = 0; j < x_coarse.length; j++) {
          const squareNorm = x_fine_i
            .subtractNew(points[x_coarse[j]])
            .squaredNorm();
          if (squareNorm < minSquareNorm) {
            mapping[i] = j;
            minSquareNorm = squareNorm;
          }
        }
      }
      mappings.push(mapping);
    }
    return mappings;
  }

  function interpolationMatrices(
    points: MATH.Vector[],
    grids: Float32Array[]
  ): MATH.Matrix[] {
    const interpolations: MATH.Matrix[] = [];
    for (let level = 0; level < grids.length - 1; level++) {
      const [n, k] = [0, 1].map(
        (fineOrCoarse) => grids[level + fineOrCoarse].length
      );
      const blockWidth = 12;
      const blockHeight = level === 0 ? 3 : blockWidth;
      const U = MATH.Matrix.zero(blockHeight * n, blockWidth * k);
      for (
        let finePointIndex = 0;
        finePointIndex < grids[level].length;
        finePointIndex++
      ) {
        const finePoint = points[grids[level][finePointIndex]];
        // find nearest point index
        let nearestPointIndex = 0;
        let distance = Infinity;
        for (
          let coarsePointIndex = 0;
          distance > 0 && coarsePointIndex < grids[level + 1].length;
          coarsePointIndex++
        ) {
          const anotherDistance = finePoint
            .subtractNew(points[grids[level + 1][coarsePointIndex]])
            .squaredNorm();
          if (anotherDistance < distance) {
            distance = anotherDistance;
            nearestPointIndex = coarsePointIndex;
          }
        }
        if (level > 0) {
          // set 12x12 identity matrix
          for (let rowIndex = 0; rowIndex < blockHeight; rowIndex++)
            U.set(
              blockHeight * finePointIndex + rowIndex,
              blockWidth * nearestPointIndex + rowIndex,
              1
            );
        } else {
          // set 3 x 12 matrix such that (x,y,z,1) x I3 (x is kronecker product)
          for (const xyzw of [0, 1, 2, 3]) // homogeneous coordinate of lth point (x,y,z,1)
            for (let rowIndex = 0; rowIndex < blockHeight; rowIndex++)
              U.set(
                blockHeight * finePointIndex + rowIndex,
                blockWidth * nearestPointIndex + 3 * xyzw + rowIndex,
                xyzw === 3 ? 1 : finePoint._(xyzw)
              );
        }
      }
      interpolations.push(U);
    }
    return interpolations;
  }

  function pointsToVectors(points: number[] | Float32Array): MATH.Vector[] {
    const vectors: MATH.Vector[] = Array(points.length / 3);
    for (let i = 0; i < vectors.length; i++)
      vectors[i] = new MATH.Vector([0, 1, 2].map((xyz) => points[3 * i + xyz]));
    return vectors;
  }
  /**
   *  restriction mappings = [m1, m2, ..., mn]
   *   mk is a map from index in a coarse grid to multiple indices in ther fine grid
   *   mk is created by pushing i to mk[i1] (for i from 0 to len(Mk), and i1 = Mk[i])
   *    then, restriction is r1[i] = Sigma_k((x[k], 1) * I)r1 (k of mk[1]), rk[i] = ( len(mk[i]) I )r_k-1 (k of mk[i])
   */
  function restrictionMappings(
    interpolationMaps: Float32Array[],
    grids: Float32Array[]
  ): number[][][] {
    const restrictionMaps: number[][][] = [];
    for (let k = 0; k < interpolationMaps.length; k++) {
      const Mk = interpolationMaps[k];
      const mk: number[][] = Array(grids[k + 1].length); // number of points in k-th level
      for (let i = 0; i < Mk.length; i++) {
        if (!mk[Mk[i]]) mk[Mk[i]] = [];
        mk[Mk[i]].push(i);
      }
      restrictionMaps.push(mk);
    }
    return restrictionMaps;
  }

  function restrictionMatrices(interpolatinos: MATH.Matrix[]): MATH.Matrix[] {
    return interpolatinos.map((U) => U.transpose());
  }

  /**
   * set i-th block of a vector, block is either 3x1 or 12x1
   * @param index
   * @param ithBlock3 3x1 for x,y,z, 12x1 for linear transformation of x -> Ax (A is 3 by 4 matrix that represents shear, rotation, move, and scale)
   * @returns
   */
  function setIthBlockOfVector(
    index: number,
    vector: MATH.Vector,
    ithBlock: MATH.Vector,
    isAddition = false
  ): void {
    for (let i = 0; i < ithBlock.height; i++) {
      const globalIndex = index * ithBlock.height + i;
      vector.set(
        globalIndex,
        (isAddition ? vector._(globalIndex) : 0) + ithBlock._(i)
      );
    }
  }

  /**
   * get a block matrix of a whole matrix
   * @param of a whole matrix
   * @param iThBlockRow i-th block of rows
   * @param jThBlockColumn j-th block of columns
   * @param blockHeight
   * @param blockWidth
   */
  function block(
    of: MATH.Matrix,
    iThBlockRow: number,
    jThBlockColumn: number,
    blockHeight: number,
    blockWidth: number
  ): MATH.Matrix {
    const block = MATH.Matrix.zero(blockWidth, blockHeight);
    for (let i = 0; i < blockHeight; i++)
      for (let j = 0; j < blockWidth; j++)
        block.set(
          i,
          j,
          of._(blockHeight * iThBlockRow + i, blockWidth * jThBlockColumn + j)
        );
    return block;
  }
}
