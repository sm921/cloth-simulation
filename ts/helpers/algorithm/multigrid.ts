/// <reference path="../math/math.ts" />

namespace MULTIGRID {
  export class Multigrid {
    /** system matrices A0, A1, ..., An */
    A: MATH.Matrix[] = [];
    blockSize = 12;
    /** indices of positions */
    grids: Float32Array[];

    /** residuals, r0, r1, ..., rn (r0 = Ax-b, r1 = Ur, ..., rn = U_n-1 r_n-1) */
    r: MATH.Vector[] = [];

    /** interpolation matrices for each level U0, U1, ..., Un */
    U: MATH.Matrix[] = [];
    /** restriction matrices for each level U0^t, U1^t, ..., Un^t */
    Ut: MATH.Matrix[] = [];

    /** for each l-th level, a map from i1 of a coaser grid to [i,j,...] of a finer grid */
    coarseIndexToFineIndices: number[][][];
    /** for each l-th level, a map from i of a finer grid to i1 of a coareser grid */
    fineIndexToCoarseControlIndex: Float32Array[];

    constructor(
      points: number[] | Float32Array,
      depth: number,
      gridRatio = 12
    ) {
      const positions = pointsToVectors(points);
      this.grids = buildGrids(positions, 1 ?? depth, 5 ?? gridRatio);
      this.initR(points);
      this.initA();
      this.fineIndexToCoarseControlIndex = interpolationMappings(
        positions,
        this.grids
      );
      this.coarseIndexToFineIndices = restrictionMappings(
        this.fineIndexToCoarseControlIndex,
        this.grids
      );
      // this.initU(positions);
      this.initUn(positions);
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
          this.fineIndexToCoarseControlIndex[coarseLevel - 1][i],
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
      const [r_coarse, r_fine] = [this.r[coarseLevel], this.r[coarseLevel - 1]];
      const blockHeight = 12;
      const mk = this.coarseIndexToFineIndices[coarseLevel - 1];
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
      smoothCount = 2
    ): void {
      for (let i = 0; i < 3; i++) {
        this.updateA(A);
        this.makeA1FullRank();
        MATH.Solver.gaussSiedel(A, x, b, smoothCount, undefined);
        const r0 = b.subtractNew(A.multiplyVector(x));
        const r1 = this.Ut[0].multiplyVector(r0);
        const e1 = this.A[1].inverseNew()?.multiplyVector(r1) as MATH.Vector;
        const e0 = this.U[0].multiplyVector(e1);
        x.add(e0.multiplyScalar(0.001));
        MATH.Solver.gaussSiedel(A, x, b, smoothCount, undefined);
      }
    }

    private initA(): void {
      this.A = Array(this.grids.length);
      this.r.forEach((residual, i) => {
        this.A[i] = MATH.Matrix.zero(residual.height, residual.height);
      });
    }

    /**
     * residuals  = [r, r1, r2, ..., rn]
     *  such that r= Ax-b, r1 = U^t r, r2 = U^t r1, ..., rn = U^t r_n-1
     */
    private initR(positions: Float32Array | number[]): void {
      this.r = this.grids.map((grid, i) =>
        MATH.Vector.zero((i === 0 ? 3 : 12) * grid.length)
      );
      this.r[0] = new MATH.Vector(positions);
    }

    private initU(points: MATH.Vector[]): void {
      for (let level = 0; level < this.grids.length - 1; level++) {
        const fineGrid = this.grids[level];
        const coarseGrid = this.grids[level + 1];
        const blockWidth = this.blockSize;
        const blockHeight = level === 0 ? 3 : this.blockSize;
        const U = MATH.Matrix.zero(
          blockHeight * fineGrid.length,
          blockWidth * coarseGrid.length
        );
        for (
          let finePointIndex = 0;
          finePointIndex < fineGrid.length;
          finePointIndex++
        ) {
          const finePoint = points[fineGrid[finePointIndex]];
          // find nearest point index
          let nearestPointIndex = 0;
          let minDistance = Infinity;
          for (
            let coarsePointIndex = 0;
            coarsePointIndex < coarseGrid.length;
            coarsePointIndex++
          ) {
            const distance = finePoint
              .subtractNew(points[coarseGrid[coarsePointIndex]])
              .squaredNorm();
            if (distance < minDistance) {
              minDistance = distance;
              nearestPointIndex = coarsePointIndex;
              if (distance === 0) break;
            }
          }
          if (level > 0)
            // set 12x12 identity matrix
            for (let rowIndex = 0; rowIndex < blockHeight; rowIndex++)
              U.set(
                blockHeight * finePointIndex + rowIndex,
                blockWidth * nearestPointIndex + rowIndex,
                1
              );
          // set 3 x 12 matrix such that (x,y,z,1) x I3 (x is kronecker product)
          else
            for (let xyzw = 0; xyzw < 4; xyzw++)
              for (let rowIndex = 0; rowIndex < blockHeight; rowIndex++)
                U.set(
                  blockHeight * finePointIndex + rowIndex,
                  blockWidth * nearestPointIndex + 3 * xyzw + rowIndex,
                  xyzw === 3 ? 1 : finePoint._(xyzw)
                );
        }
        this.U.push(U);
      }
      this.Ut = this.U.map((U) => U.transpose());
    }

    private initUn(points: MATH.Vector[]): void {
      for (let level = 0; level < this.grids.length - 1; level++) {
        const fineGrid = this.grids[level];
        const coarseGrid = this.grids[level + 1];
        const blockWidth = this.blockSize;
        const blockHeight = level === 0 ? 3 : this.blockSize;
        const U = MATH.Matrix.zero(
          blockHeight * fineGrid.length,
          blockWidth * coarseGrid.length
        );
        for (
          let finePointIndex = 0;
          finePointIndex < fineGrid.length;
          finePointIndex++
        ) {
          const finePoint = points[fineGrid[finePointIndex]];
          // find n nearest points
          const n = 4;
          let nearestPointIndices = MATH.range(n);
          let minDistances = MATH.arrayOf(Infinity, n);
          for (
            let coarsePointIndex = 0;
            coarsePointIndex < coarseGrid.length;
            coarsePointIndex++
          ) {
            const distance = finePoint
              .subtractNew(points[coarseGrid[coarsePointIndex]])
              .squaredNorm();
            if (distance < minDistances[0]) {
              for (let i = nearestPointIndices.length - 1; i > 0; i--) {
                minDistances[i] = minDistances[i - 1];
                nearestPointIndices[i] = nearestPointIndices[i - 1];
              }
              minDistances[0] = distance;
              nearestPointIndices[0] = coarsePointIndex;
            }
            for (let i = 0; i < n; i++)
              if (coarsePointIndex > 0 && minDistances[i] === Infinity) {
                minDistances[i] = distance;
                nearestPointIndices[i] = coarsePointIndex;
                break;
              }
          }
          if (level > 0)
            // set 12x12 identity matrix
            for (let rowIndex = 0; rowIndex < blockHeight; rowIndex++) {
              for (const nearest of nearestPointIndices)
                U.set(
                  blockHeight * finePointIndex + rowIndex,
                  blockWidth * nearest + rowIndex,
                  1 / nearestPointIndices.length
                );
            }
          // set 3 x 12 matrix such that (x,y,z,1) x I3 (x is kronecker product)
          else
            for (let xyzw = 0; xyzw < 4; xyzw++)
              for (let rowIndex = 0; rowIndex < blockHeight; rowIndex++) {
                for (const nearest of nearestPointIndices)
                  U.set(
                    blockHeight * finePointIndex + rowIndex,
                    blockWidth * nearest + 3 * xyzw + rowIndex,
                    (xyzw === 3 ? 1 : finePoint._(xyzw)) /
                      nearestPointIndices.length
                  );
              }
        }
        this.U.push(U);
      }
      this.Ut = this.U.map((U) => U.transpose());
    }

    /**
     * update system matrices
     * @param A
     */
    private updateA(A: MATH.Matrix): void {
      /*
      updating (i,j)-th block of system matrix of a fine level ends of with updating 12x12 (i1,j1)-th block of the syste mmatrix of a coarse level 
      by (xi^t, 1)^t (xj^t, 1) * A_ij for the 1st level, and A_ij for others 
        such that
          i1 is argmin_k ||x_fine[i] - x_coarse[k]||
          and j1 is argmin_k ||x_fine[j] - x_coarse[k]||
      */
      this.A[0] = A;
      for (let level = 0; level < this.grids.length - 1; level++) {
        this.A[level + 1] = this.Ut[level]
          .multiply(this.A[level])
          .multiply(this.U[level]);
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

    /**
     * make A1 full-ranked by adding I
     */
    private makeA1FullRank(): void {
      const A1 = this.A[1];
      const n = A1.height;
      for (let i = 0; i < n; i++) A1.set(i, i, A1._(i, i) - 0.1);
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
