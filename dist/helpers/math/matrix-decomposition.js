"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qr = exports.lu = exports.cholesky = void 0;
var matrix_1 = require("./matrix");
var vector_1 = require("./vector");
function cholesky(matrix) {
    if (!matrix.isSquare())
        return null;
    var L = matrix_1.Matrix.zero(matrix.width, matrix.width);
    for (var i = 0; i < L.height; i++) {
        for (var j = 0; j < i; j++) {
            var sigma_1 = 0;
            for (var k = 0; k < j; k++)
                sigma_1 += L._(i, k) * L._(j, k);
            var L_jj = L._(j, j);
            if (L_jj === 0)
                return null;
            L.set(i, j, (matrix._(i, j) - sigma_1) / L_jj);
        }
        var sigma = 0;
        for (var k = 0; k < i; k++)
            sigma += L._(i, k) * L._(i, k);
        var diff = matrix._(i, i) - sigma;
        if (diff <= 0)
            return null;
        L.set(i, i, Math.sqrt(diff));
    }
    return L;
}
exports.cholesky = cholesky;
function lu(A) {
    var n = A.height;
    var _a = [
        matrix_1.Matrix.identity(n),
        A.clone(),
        null,
    ], L = _a[0], U = _a[1], P = _a[2];
    for (var i = 0; i < n; i++) {
        var k = i;
        while (U._(i, i) === 0) {
            if (P === null)
                P = matrix_1.Matrix.identity(n);
            U.swapRowIAndJ(i, k + 1);
            P === null || P === void 0 ? void 0 : P.swapRowIAndJ(i, k + 1);
            k++;
        }
        for (var j = i + 1; j < n; j++) {
            L.set(j, i, U._(j, i) / U._(i, i));
            U.subtractRowIByJMultipliedByA(j, i, L._(j, i));
        }
    }
    return [L, U, P];
}
exports.lu = lu;
function qr(matrix) {
    var Q = matrix_1.Matrix.zero(matrix.width, matrix.height);
    var R = Q.clone();
    var a = Array(matrix.width);
    for (var columnIndex = 0; columnIndex < matrix.width; columnIndex++)
        a[columnIndex] = matrix.columnVector(columnIndex, vector_1.Vector);
    var u = Array(matrix.width);
    for (var k = 0; k < u.length; k++) {
        var ak = a[k];
        var uk = ak.clone();
        var sigma = vector_1.Vector.zero(uk.height);
        for (var j = 0; j < k; j++)
            sigma.add(ak.projectTo(u[j]));
        u[k] = uk.subtract(sigma);
    }
    var e = Array(u.length);
    for (var k = 0; k < e.length; k++) {
        e[k] = u[k].normalizeNew();
        for (var row = 0; row < e[k].height; row++)
            Q.set(row, k, e[k]._(row));
    }
    for (var i = 0; i < R.height; i++)
        for (var column = i; column < R.width; column++)
            R.set(i, column, e[i].dot(a[column]));
    return [Q, R];
}
exports.qr = qr;
//# sourceMappingURL=matrix-decomposition.js.map