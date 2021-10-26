"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hessianModification = exports.hessenbergReduction = void 0;
var matrix_1 = require("./matrix");
var vector_1 = require("./vector");
var matrix_decomposition_1 = require("./matrix-decomposition");
function hessenbergReduction(A) {
    for (var k = 0; k < A.height - 2; k++) {
        var sigma = 0;
        for (var j = k + 1; j < A.height; j++)
            sigma += A._(j, k) * A._(j, k);
        var alpha = -Math.sign(A._(k + 1, k)) * Math.sqrt(sigma);
        var r = Math.sqrt(0.5 * (alpha * alpha - A._(k + 1, k) * alpha));
        var v = vector_1.Vector.zero(A.height);
        for (var j = 0; j < v.height; j++)
            v.set(j, j <= k
                ? 0
                : r === 0
                    ? 0
                    : (j === k + 1 ? A._(k + 1, k) - alpha : A._(j, k)) / (2 * r));
        var P = matrix_1.Matrix.identity(A.height).subtract(v.outerProduct(v.transposeNew()).multiplyScalar(2));
        A = P.multiply(A).multiply(P);
    }
    return A;
}
exports.hessenbergReduction = hessenbergReduction;
function hessianModification(matrix, firstNonZeroShift, step) {
    if (firstNonZeroShift === void 0) { firstNonZeroShift = 1e-3; }
    if (step === void 0) { step = 2; }
    if (!matrix.isSquare())
        return matrix;
    var minDiagonalElements = matrix._(0, 0);
    for (var i = 0; i < matrix.width; i++)
        minDiagonalElements = Math.min(minDiagonalElements, matrix._(0, 0));
    var tau = minDiagonalElements > 0 ? 0 : -minDiagonalElements + firstNonZeroShift;
    while (true) {
        if (tau !== 0)
            for (var i = 0; i < matrix.height; i++)
                matrix.set(i, i, tau);
        var L = matrix_decomposition_1.cholesky(matrix);
        if (L !== null)
            return L;
        tau = Math.max(step * tau, firstNonZeroShift);
    }
}
exports.hessianModification = hessianModification;
//# sourceMappingURL=matrix-modification.js.map