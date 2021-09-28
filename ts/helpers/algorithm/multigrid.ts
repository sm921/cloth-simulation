/// <reference path="../math/math.ts" />

namespace MULTIGRID {
  export function build(
    points: number[] | Float32Array,
    depth: number
  ): [number[][], MATH.Matrix[], MATH.Matrix[]] {
    const [grids, memoOfPointVectors] = buildGridHierchy(points, depth);
    const interpolatinos = calculateInterpolationMatrices(
      points,
      grids,
      memoOfPointVectors
    );
    const restrictions = calculateRestrictionMatrices(interpolatinos);
    return [grids, interpolatinos, restrictions];
  }

  /**
   * using furthest point sampling method,
   * choose points uniformally  to create coarse grid
   * ```
   * ### Algorithm ###
   * 1. add a random point to empty set S
   * 2. add to S another point which is the furthest to S
   * 3. repeat 2 until S has desired number of elements
   * 4. repeat 1~3 for all levels
   * ```
   *
   * @returns coarse grid and points which are not included in grid
   */
  function buildGridHierchy(
    points: number[] | Float32Array,
    depth: number
  ): [number[][], MATH.Vector[]] {
    // init
    const gridHierchy = Array(depth);
    const numberOfPoints = points.length / 3;
    const pointsToAddIndices = MATH.range(numberOfPoints);
    gridHierchy[0] = [...pointsToAddIndices];
    const distancesToGrid = new Float32Array(numberOfPoints);
    const memoOfPointVectors = Array(pointsToAddIndices.length);
    for (let pointIndex = 0; pointIndex < numberOfPoints; pointIndex++)
      distancesToGrid[pointIndex] = 1e12;
    const grid: number[] = [];
    // 4. repeat for all levels
    for (let level = depth; level > 0; level--) {
      // 1. add a random point
      if (level === depth) addPoint(pointsToAddIndices[0]);
      else
        addPoint(
          pointsToAddIndices.reduce((a, b) =>
            distancesToGrid[a] < distancesToGrid[b] ? a : b
          )
        );
      const gridSize = Math.ceil(numberOfPoints / Math.pow(2, level));
      // 3. repeat until size is large enough
      while (grid.length < gridSize) {
        let furthestPointIndex = pointsToAddIndices[pointsToAddIndices[0]];
        let furthestDistance = 0;
        // update distnaces to S if necessary
        const newlyAddedPoint = getPointVectorByIndex(
          grid[grid.length - 1],
          points,
          memoOfPointVectors
        );
        for (let pointIndex of pointsToAddIndices) {
          const distanceToNewlyAddedPoint = newlyAddedPoint
            .subtractNew(
              getPointVectorByIndex(pointIndex, points, memoOfPointVectors)
            )
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
      gridHierchy[level] = [...grid];
    }
    return [gridHierchy, memoOfPointVectors];

    function addPoint(pointIndex: number): void {
      grid.push(
        pointsToAddIndices.splice(pointsToAddIndices.indexOf(pointIndex), 1)[0]
      );
    }
  }

  /**
   * find matrix U such that  x_finer = U x_coaser
   * see "A Scalable Galerkin Multigrid Method for Real-time Simulation ofDeformable Objects" by ZANGYUEYANG XIAN et al for detail
   * ```
   * ### Description in a nutshell ###
   * U is 3n x 12k matrix for level 1
   *     (n and k are the numbers of points in level 0 and 1)
   *     i-th row-block of U is 3 x 12k matrix
   *         j-th block of i-th row-block of U is 3 x 12 zero matrix
   *         for every j but j=l such that l is the point in level 1 that is nearest to j-th point in the finest level
   *         for j=l  the block is 3x12 matrix such that
   *         [pl_x, pl_y, pl_z, 1]^t <kronecker> I3
   *         (<kronecker> is kronecker product and I3 is 3x3 matrix)
   *
   * U is 12n x 12k matrix for deeper levels
   *     (n and k are the numbers of points in finer and coaser levels)
   *     i-th row-block of U is 12 x 12k matrix
   *         j-th block of i-th row-block of U is 12 x 12 zero matrix
   *         for every j but j=l such that l is the point in level 1 that is nearest to j-th point in the finest level,
   *         for j=l  the block is 12x12 identity matrix
   * ```
   */
  function calculateInterpolationMatrices(
    points: number[] | Float32Array,
    grids: number[][],
    memoOfPointVectors: MATH.Vector[]
  ): MATH.Matrix[] {
    const interpolations: MATH.Matrix[] = [];
    for (let level = 0; level < grids.length - 1; level++) {
      const [n, k] = [0, 1].map(
        (fineOrCoarse) => grids[level + fineOrCoarse].length
      );
      const blockSize = level === 0 ? 3 : 12;
      const U = MATH.Matrix.zero(blockSize * n, 12 * k);
      for (let finePointIndex of grids[level]) {
        const finePoint = getPointVectorByIndex(
          finePointIndex,
          points,
          memoOfPointVectors
        );
        // find nearest point l
        let l = finePointIndex;
        let distance = 1e9;
        for (let coarsePointIndex of grids[level + 1]) {
          const anotherDistance = finePoint
            .subtractNew(
              getPointVectorByIndex(
                coarsePointIndex,
                points,
                memoOfPointVectors
              )
            )
            .squaredNorm();
          if (anotherDistance < distance) {
            distance = anotherDistance;
            l = coarsePointIndex;
          }
        }
        if (level > 0) {
          // set 12x12 identity matrix
          for (let rowIndex = 0; rowIndex < U.height; rowIndex++)
            U.set(
              blockSize * finePointIndex + rowIndex,
              U.height * l + rowIndex,
              1
            );
        } else {
          // set 3 x 12 matrix such that (x,y,z,1) x I3 (x is kronecker product)
          for (const xyzw of [0, 1, 2, 3]) // homogeneous coordinate of lth point (x,y,z,1)
            for (let rowIndex = 0; rowIndex < U.height; rowIndex++)
              U.set(
                blockSize * finePointIndex + rowIndex,
                U.height * l + U.width * xyzw + rowIndex,
                xyzw === 3 ? 1 : points[3 * l + xyzw] // homogeneouse coordinates of lth point (x,y,z,1)
              );
        }
      }
      interpolations.push(U);
    }
    return interpolations;
  }

  function calculateRestrictionMatrices(
    interpolatinos: MATH.Matrix[]
  ): MATH.Matrix[] {
    return interpolatinos.map((U) => U.transpose());
  }

  function getPointVectorByIndex(
    index: number,
    points: number[] | Float32Array,
    memo: MATH.Vector[]
  ): MATH.Vector {
    if (memo[index]) return memo[index];
    return (memo[index] = new MATH.Vector(
      [0, 1, 2].map((xyz) => points[3 * index + xyz])
    ));
  }

  /**
   * update system matrices based on finest level system matrix
   *
   * see 4.3 of the paper for detail ()
   * ```
   * ### Algorithm in a nutshell ###
   *
   * A1 = U^t A0 U
   *    = A1_ij x ((xi,yi,zi,1)^t (xj,yj,zj,1))
   *
   * Al+1 = U^t Al U
   *      = Al_ij x I12
   * ```
   * @param systemMatrices
   * @param grids
   * @param interpolatinos
   * @param restrictions
   */
  function updateSystemMatrices(
    systemMatrices: MATH.Matrix[],
    grids: number[][],
    interpolatinos: MATH.Matrix[],
    restrictions: MATH.Matrix[]
  ): void {
    for (let level = 0; level < grids.length - 1; level) {
      const [A0, A1] = [0, 1].map(
        (fineOrCoarse) => systemMatrices[level + fineOrCoarse]
      );
    }
  }
}
