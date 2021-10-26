"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multigrid = void 0;
var matrix_1 = require("../math/matrix");
var other_1 = require("../math/other");
var solver_1 = require("../math/solver");
var vector_1 = require("../math/vector");
var Multigrid = (function () {
    function Multigrid(points, depth, gridRatio) {
        if (gridRatio === void 0) { gridRatio = 12; }
        this.A = [];
        this.blockSize = 12;
        this.r = [];
        this.U = [];
        this.Ut = [];
        var positions = pointsToVectors(points);
        this.grids = buildGrids(positions, 1 !== null && 1 !== void 0 ? 1 : depth, 5 !== null && 5 !== void 0 ? 5 : gridRatio);
        this.initR(points);
        this.initA();
        this.fineIndexToCoarseControlIndex = interpolationMappings(positions, this.grids);
        this.coarseIndexToFineIndices = restrictionMappings(this.fineIndexToCoarseControlIndex, this.grids);
        this.initUn(positions);
    }
    Multigrid.prototype.interpolate = function (coarseLevel, e_coarse, e_fine) {
        var blockWidth = 12;
        var blockHeigt = coarseLevel === 1 ? 3 : blockWidth;
        var I3 = matrix_1.Matrix.identity(3);
        for (var i = 0; i < e_fine.height / blockHeigt; i++) {
            var ithBlockOfCoarseResidual = getIthBlockOfVector(this.fineIndexToCoarseControlIndex[coarseLevel - 1][i], e_coarse, blockWidth);
            setIthBlockOfVector(i, e_fine, coarseLevel === 1
                ? new vector_1.Vector([
                    e_fine._(3 * i),
                    e_fine._(3 * i + 1),
                    e_fine._(3 * i + 2),
                    1,
                ])
                    .transpose()
                    .kroneckerProduct(I3)
                    .multiplyVector(ithBlockOfCoarseResidual, vector_1.Vector)
                : ithBlockOfCoarseResidual, true);
        }
    };
    Multigrid.prototype.restrict = function (coarseLevel) {
        var _a = [this.r[coarseLevel], this.r[coarseLevel - 1]], r_coarse = _a[0], r_fine = _a[1];
        var blockHeight = 12;
        var mk = this.coarseIndexToFineIndices[coarseLevel - 1];
        for (var i = 0; i < r_coarse.height / blockHeight; i++) {
            var sigma = vector_1.Vector.zero(blockHeight);
            for (var _i = 0, _b = mk[i]; _i < _b.length; _i++) {
                var j = _b[_i];
                if (coarseLevel === 1) {
                    var rj = getIthBlockOfVector(j, r_fine, 3);
                    sigma.add(new vector_1.Vector([rj._(0), rj._(1), rj._(2), 1])
                        .kroneckerProduct(matrix_1.Matrix.identity(3))
                        .multiplyVector(rj, vector_1.Vector));
                }
                else
                    sigma.add(getIthBlockOfVector(j, r_fine, blockHeight));
            }
            setIthBlockOfVector(i, r_coarse, sigma.multiplyScalar(1 / mk[i].length));
        }
    };
    Multigrid.prototype.solveBy2LevelMethot = function (A, x, b, smoothCount) {
        var _a;
        if (smoothCount === void 0) { smoothCount = 2; }
        for (var i = 0; i < 3; i++) {
            this.updateA(A);
            this.makeA1FullRank();
            solver_1.Solver.gaussSiedel(A, x, b, smoothCount, undefined);
            var r0 = b.subtractNew(A.multiplyVector(x, vector_1.Vector));
            var r1 = this.Ut[0].multiplyVector(r0, vector_1.Vector);
            var e1 = (_a = this.A[1].inverseNew()) === null || _a === void 0 ? void 0 : _a.multiplyVector(r1, vector_1.Vector);
            var e0 = this.U[0].multiplyVector(e1, vector_1.Vector);
            x.add(e0.multiplyScalar(0.001));
            solver_1.Solver.gaussSiedel(A, x, b, smoothCount, undefined);
        }
    };
    Multigrid.prototype.initA = function () {
        var _this = this;
        this.A = Array(this.grids.length);
        this.r.forEach(function (residual, i) {
            _this.A[i] = matrix_1.Matrix.zero(residual.height, residual.height);
        });
    };
    Multigrid.prototype.initR = function (positions) {
        this.r = this.grids.map(function (grid, i) {
            return vector_1.Vector.zero((i === 0 ? 3 : 12) * grid.length);
        });
        this.r[0] = new vector_1.Vector(positions);
    };
    Multigrid.prototype.initU = function (points) {
        for (var level = 0; level < this.grids.length - 1; level++) {
            var fineGrid = this.grids[level];
            var coarseGrid = this.grids[level + 1];
            var blockWidth = this.blockSize;
            var blockHeight = level === 0 ? 3 : this.blockSize;
            var U = matrix_1.Matrix.zero(blockHeight * fineGrid.length, blockWidth * coarseGrid.length);
            for (var finePointIndex = 0; finePointIndex < fineGrid.length; finePointIndex++) {
                var finePoint = points[fineGrid[finePointIndex]];
                var nearestPointIndex = 0;
                var minDistance = Infinity;
                for (var coarsePointIndex = 0; coarsePointIndex < coarseGrid.length; coarsePointIndex++) {
                    var distance = finePoint
                        .subtractNew(points[coarseGrid[coarsePointIndex]])
                        .squaredNorm();
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestPointIndex = coarsePointIndex;
                        if (distance === 0)
                            break;
                    }
                }
                if (level > 0)
                    for (var rowIndex = 0; rowIndex < blockHeight; rowIndex++)
                        U.set(blockHeight * finePointIndex + rowIndex, blockWidth * nearestPointIndex + rowIndex, 1);
                else
                    for (var xyzw = 0; xyzw < 4; xyzw++)
                        for (var rowIndex = 0; rowIndex < blockHeight; rowIndex++)
                            U.set(blockHeight * finePointIndex + rowIndex, blockWidth * nearestPointIndex + 3 * xyzw + rowIndex, xyzw === 3 ? 1 : finePoint._(xyzw));
            }
            this.U.push(U);
        }
        this.Ut = this.U.map(function (U) { return U.transpose(); });
    };
    Multigrid.prototype.initUn = function (points) {
        for (var level = 0; level < this.grids.length - 1; level++) {
            var fineGrid = this.grids[level];
            var coarseGrid = this.grids[level + 1];
            var blockWidth = this.blockSize;
            var blockHeight = level === 0 ? 3 : this.blockSize;
            var U = matrix_1.Matrix.zero(blockHeight * fineGrid.length, blockWidth * coarseGrid.length);
            for (var finePointIndex = 0; finePointIndex < fineGrid.length; finePointIndex++) {
                var finePoint = points[fineGrid[finePointIndex]];
                var n = 4;
                var nearestPointIndices = other_1.range(n);
                var minDistances = other_1.arrayOf(Infinity, n);
                for (var coarsePointIndex = 0; coarsePointIndex < coarseGrid.length; coarsePointIndex++) {
                    var distance = finePoint
                        .subtractNew(points[coarseGrid[coarsePointIndex]])
                        .squaredNorm();
                    if (distance < minDistances[0]) {
                        for (var i = nearestPointIndices.length - 1; i > 0; i--) {
                            minDistances[i] = minDistances[i - 1];
                            nearestPointIndices[i] = nearestPointIndices[i - 1];
                        }
                        minDistances[0] = distance;
                        nearestPointIndices[0] = coarsePointIndex;
                    }
                    for (var i = 0; i < n; i++)
                        if (coarsePointIndex > 0 && minDistances[i] === Infinity) {
                            minDistances[i] = distance;
                            nearestPointIndices[i] = coarsePointIndex;
                            break;
                        }
                }
                if (level > 0)
                    for (var rowIndex = 0; rowIndex < blockHeight; rowIndex++) {
                        for (var _i = 0, nearestPointIndices_1 = nearestPointIndices; _i < nearestPointIndices_1.length; _i++) {
                            var nearest = nearestPointIndices_1[_i];
                            U.set(blockHeight * finePointIndex + rowIndex, blockWidth * nearest + rowIndex, 1 / nearestPointIndices.length);
                        }
                    }
                else
                    for (var xyzw = 0; xyzw < 4; xyzw++)
                        for (var rowIndex = 0; rowIndex < blockHeight; rowIndex++) {
                            for (var _a = 0, nearestPointIndices_2 = nearestPointIndices; _a < nearestPointIndices_2.length; _a++) {
                                var nearest = nearestPointIndices_2[_a];
                                U.set(blockHeight * finePointIndex + rowIndex, blockWidth * nearest + 3 * xyzw + rowIndex, (xyzw === 3 ? 1 : finePoint._(xyzw)) /
                                    nearestPointIndices.length);
                            }
                        }
            }
            this.U.push(U);
        }
        this.Ut = this.U.map(function (U) { return U.transpose(); });
    };
    Multigrid.prototype.updateA = function (A) {
        this.A[0] = A;
        for (var level = 0; level < this.grids.length - 1; level++) {
            this.A[level + 1] = this.Ut[level]
                .multiply(this.A[level])
                .multiply(this.U[level]);
        }
    };
    Multigrid.prototype.makeA1FullRank = function () {
        var A1 = this.A[1];
        var n = A1.height;
        for (var i = 0; i < n; i++)
            A1.set(i, i, A1._(i, i) - 0.1);
    };
    return Multigrid;
}());
exports.Multigrid = Multigrid;
function buildGrids(points, depth, gridRatio) {
    if (gridRatio === void 0) { gridRatio = 4; }
    var grids = Array(depth);
    var pointsToAddIndices = other_1.range(points.length);
    grids[0] = new Float32Array(pointsToAddIndices);
    var distancesToGrid = new Float32Array(points.length);
    for (var pointIndex = 0; pointIndex < points.length; pointIndex++)
        distancesToGrid[pointIndex] = 1e12;
    var grid = [];
    for (var level = depth; level > 0; level--) {
        if (level === depth)
            addPoint(pointsToAddIndices[0]);
        else
            addPoint(pointsToAddIndices.reduce(function (a, b) {
                return distancesToGrid[a] < distancesToGrid[b] ? b : a;
            }));
        var gridSize = Math.max(2, Math.ceil(points.length / Math.pow(gridRatio, level)));
        while (grid.length < gridSize) {
            var furthestPointIndex = pointsToAddIndices[pointsToAddIndices[0]];
            var furthestDistance = 0;
            var newlyAddedPoint = points[grid[grid.length - 1]];
            for (var _i = 0, pointsToAddIndices_1 = pointsToAddIndices; _i < pointsToAddIndices_1.length; _i++) {
                var pointIndex = pointsToAddIndices_1[_i];
                var distanceToNewlyAddedPoint = newlyAddedPoint
                    .subtractNew(points[pointIndex])
                    .squaredNorm();
                var currentDistanceToS = distancesToGrid[pointIndex];
                if (distanceToNewlyAddedPoint < currentDistanceToS)
                    distancesToGrid[pointIndex] = distanceToNewlyAddedPoint;
                if (furthestDistance < distancesToGrid[pointIndex]) {
                    furthestDistance = distancesToGrid[pointIndex];
                    furthestPointIndex = pointIndex;
                }
            }
            addPoint(furthestPointIndex);
        }
        grids[level] = new Float32Array(grid);
    }
    return grids;
    function addPoint(pointIndex) {
        grid.push(pointsToAddIndices.splice(pointsToAddIndices.indexOf(pointIndex), 1)[0]);
    }
}
function addBlock(block, to, rowBlockIndex, columnBlockIndex) {
    var _a = [
        block.height * rowBlockIndex,
        block.width * columnBlockIndex,
    ], row0 = _a[0], column0 = _a[1];
    for (var row = 0; row < block.width; row++)
        for (var column = 0; column < block.height; column++) {
            var _b = [row0 + row, column0 + column], rowIndex = _b[0], columnIndex = _b[1];
            to.set(rowIndex, columnIndex, to._(rowIndex, columnIndex) + block._(row, column));
        }
}
function getIthBlockOfVector(index, vector, numberOfCoordinates) {
    return new vector_1.Vector(other_1.range(numberOfCoordinates).map(function (coordinate) {
        return vector._(numberOfCoordinates * index + coordinate);
    }));
}
function interpolationMappings(points, grids) {
    var mappings = [];
    for (var level = 1; level < grids.length; level++) {
        var _a = [grids[level - 1], grids[level]], x_fine = _a[0], x_coarse = _a[1];
        var mapping = new Float32Array(x_fine.length);
        for (var i = 0; i < x_fine.length; i++) {
            var x_fine_i = points[x_fine[i]];
            var minSquareNorm = Infinity;
            for (var j = 0; j < x_coarse.length; j++) {
                var squareNorm = x_fine_i
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
function pointsToVectors(points) {
    var vectors = Array(points.length / 3);
    var _loop_1 = function (i) {
        vectors[i] = new vector_1.Vector([0, 1, 2].map(function (xyz) { return points[3 * i + xyz]; }));
    };
    for (var i = 0; i < vectors.length; i++) {
        _loop_1(i);
    }
    return vectors;
}
function restrictionMappings(interpolationMaps, grids) {
    var restrictionMaps = [];
    for (var k = 0; k < interpolationMaps.length; k++) {
        var Mk = interpolationMaps[k];
        var mk = Array(grids[k + 1].length);
        for (var i = 0; i < Mk.length; i++) {
            if (!mk[Mk[i]])
                mk[Mk[i]] = [];
            mk[Mk[i]].push(i);
        }
        restrictionMaps.push(mk);
    }
    return restrictionMaps;
}
function setIthBlockOfVector(index, vector, ithBlock, isAddition) {
    if (isAddition === void 0) { isAddition = false; }
    for (var i = 0; i < ithBlock.height; i++) {
        var globalIndex = index * ithBlock.height + i;
        vector.set(globalIndex, (isAddition ? vector._(globalIndex) : 0) + ithBlock._(i));
    }
}
function block(of, iThBlockRow, jThBlockColumn, blockHeight, blockWidth) {
    var block = matrix_1.Matrix.zero(blockWidth, blockHeight);
    for (var i = 0; i < blockHeight; i++)
        for (var j = 0; j < blockWidth; j++)
            block.set(i, j, of._(blockHeight * iThBlockRow + i, blockWidth * jThBlockColumn + j));
    return block;
}
//# sourceMappingURL=multigrid.js.map