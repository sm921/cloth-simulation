"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eigenvectorOf = exports.eigenvalues = void 0;
var matrix_1 = require("./matrix");
var vector_1 = require("./vector");
var matrix_decomposition_1 = require("./matrix-decomposition");
var matrix_modification_1 = require("./matrix-modification");
function deflation(matrix, rowIndexToRemove, columnIndexToRemove) {
    if (rowIndexToRemove === void 0) { rowIndexToRemove = matrix.height - 1; }
    if (columnIndexToRemove === void 0) { columnIndexToRemove = matrix.width - 1; }
    var newMat = matrix_1.Matrix.zero(matrix.width - 1, matrix.height - 1);
    for (var rowIndex = 0; rowIndex < newMat.width; rowIndex++)
        for (var columnIndex = 0; columnIndex < newMat.height; columnIndex++)
            newMat.set(rowIndex, columnIndex, matrix._(rowIndex + (rowIndex >= rowIndexToRemove ? 1 : 0), columnIndex + (columnIndex >= columnIndexToRemove ? 1 : 0)));
    return newMat;
}
function eigenvalues(A, tolerance) {
    if (tolerance === void 0) { tolerance = 1e-2; }
    if (A.height <= 2)
        return eigenvaluesWithoutShift(A);
    var H = matrix_modification_1.hessenbergReduction(A);
    var lambda = [];
    for (var row = 0; row < H.height - 1; row++)
        for (var column = 0; column < H.width; column++) {
            if (H._(row, column) !== 0)
                break;
            if (column === H.width - 2) {
                lambda.push(0);
                H = deflation(H, row, row);
            }
        }
    for (var m = H.height - 1; m > 1; m--) {
        do {
            var shift = wilkinsonShift(H._(m - 1, m - 1), H._(m, m - 1), H._(m, m));
            var shiftI = new matrix_1.Matrix(shift, H.height, H.height);
            var _a = matrix_decomposition_1.qr(H.subtract(shiftI)), Q = _a[0], R = _a[1];
            H = R.multiply(Q).add(shiftI);
        } while (H._(m, m - 1) > tolerance);
        var hmm = H._(m, m);
        if (!lambda.includes(hmm))
            lambda.push(hmm);
        H = deflation(H);
    }
    eigenvaluesWithoutShift(H).forEach(function (lam) {
        if (!lambda.includes(lam))
            lambda.push(lam);
    });
    return lambda;
}
exports.eigenvalues = eigenvalues;
function eigenvectorOf(A, eigenvalue, approximateZeroBy) {
    if (approximateZeroBy === void 0) { approximateZeroBy = 1e-6; }
    var x = vector_1.Vector.ones(A.height);
    var shift = A.subtractNew(matrix_1.Matrix.identity(A.height).multiplyScalar(eigenvalue < approximateZeroBy ? approximateZeroBy : eigenvalue));
    var shiftInv = shift.inverseNew();
    while (true) {
        x = shiftInv.multiplyVector(x, vector_1.Vector).normalize();
        if (shift.multiplyVector(x, vector_1.Vector).squaredNorm() <= 1e-2)
            return x;
    }
}
exports.eigenvectorOf = eigenvectorOf;
function eigenvaluesWithoutShift(A) {
    var lambda = [];
    for (var i = 0; i < 70; i++) {
        var _a = matrix_decomposition_1.qr(A), Q = _a[0], R = _a[1];
        A = R.multiply(Q);
    }
    for (var i = 0; i < A.height; i++)
        lambda.push(A._(i, i));
    return lambda;
}
function wilkinsonShift(topLeft, bottomLeft, bottomRight) {
    var d = (topLeft - bottomRight) / 2;
    return (bottomRight + d - Math.sign(d) * Math.sqrt(d * d + bottomLeft * bottomLeft));
}
//# sourceMappingURL=matrix-eigen.js.map