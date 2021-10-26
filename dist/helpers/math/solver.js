"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Solver = void 0;
var gpu_js_1 = require("gpu.js");
var matrix_decomposition_1 = require("./matrix-decomposition");
var vector_1 = require("./vector");
var Solver = (function () {
    function Solver() {
    }
    Solver.cholesky = function (AorL, b, skipsDecomposition) {
        var L = skipsDecomposition ? AorL : matrix_decomposition_1.cholesky(AorL);
        if (L === null)
            return null;
        var y = new Float32Array(b.length);
        for (var i = 0; i < y.length; i++) {
            var sigma = 0;
            for (var k = 0; k < i; k++)
                sigma += L._(i, k) * y[k];
            y[i] = (b[i] - sigma) / L._(i, i);
        }
        var x = new Float32Array(b.length);
        for (var i = x.length - 1; i >= 0; i--) {
            var sigma = 0;
            for (var k = x.length - 1; k > i; k--)
                sigma += L._(k, i) * x[k];
            x[i] = (y[i] - sigma) / L._(i, i);
        }
        return x;
    };
    Solver.gaussSiedel = function (A, x, b, iterationCount, tolerance) {
        if (tolerance === void 0) { tolerance = 1e-3; }
        if (iterationCount === 0)
            return x;
        var k = 0;
        while (true) {
            for (var i = 0; i < A.height; i++) {
                var sigma = 0;
                for (var j = 0; j < A.width; j++)
                    if (j !== i)
                        sigma += A._(i, j) * x._(j);
                x.set(i, (b._(i) - sigma) / A._(i, i));
            }
            k++;
            if (iterationCount === undefined) {
                if (A.multiplyVector(x, vector_1.Vector).subtractNew(b).squaredNorm() < tolerance)
                    break;
            }
            else if (k > iterationCount)
                break;
        }
        return x;
    };
    Solver.jacobi = function (A, x, b, iterationCount, tolerance) {
        if (tolerance === void 0) { tolerance = 1e-3; }
        if (iterationCount === 0)
            return x;
        var k = 0;
        while (true) {
            var x_new = x.clone();
            for (var i = 0; i < A.height; i++) {
                if (A._(i, i) === 0)
                    continue;
                var sigma = 0;
                for (var j = 0; j < A.width; j++)
                    if (j !== i)
                        sigma += A._(i, j) * x._(j);
                x_new.set(i, (b._(i) - sigma) / A._(i, i));
            }
            x.elements = x_new.elements;
            k++;
            if (iterationCount === undefined) {
                if (A.multiplyVector(x, vector_1.Vector).subtractNew(b).squaredNorm() < tolerance)
                    break;
            }
            else if (k > iterationCount)
                break;
        }
        return x;
    };
    Solver.kernel__jacobi = function (A, x, b, iterationCount, tolerance) {
        if (tolerance === void 0) { tolerance = 1e-3; }
        var x_new = x.clone();
        var kernel = Solver.gpu.createKernel(function (A, x) {
            if (A[this.thread.x][this.thread.x] === 0)
                return x[this.thread.x];
            var sigma = 0;
        }, { output: [A.height] });
        for (var i = 0; i < A.height; i++) {
            if (A._(i, i) === 0)
                continue;
            var sigma = 0;
            for (var j = 0; j < A.width; j++)
                if (j !== i)
                    sigma += A._(i, j) * x._(j);
            x_new.set(i, (b._(i) - sigma) / A._(i, i));
        }
        x.elements = x_new.elements;
    };
    Solver.lu = function (A, b, L, U, P) {
        var _a;
        if (P === void 0) { P = null; }
        if (L === undefined || U === undefined)
            _a = matrix_decomposition_1.lu(A), L = _a[0], U = _a[1], P = _a[2];
        if (P)
            b = P.multiplyVector(b, vector_1.Vector);
        var y = new Float32Array(L.height);
        for (var i = 0; i < y.length; i++) {
            if (L._(i, i) === 0)
                continue;
            var sigma = 0;
            for (var k = 0; k < i; k++)
                sigma += L._(i, k) * y[k];
            y[i] = (b._(i) - sigma) / L._(i, i);
        }
        var x = vector_1.Vector.zero(U.height);
        for (var i = x.height - 1; i >= 0; i--) {
            if (U._(i, i) === 0)
                continue;
            var sigma = 0;
            for (var k = i + 1; k <= x.height - 1; k++)
                sigma += U._(i, k) * x._(k);
            x.set(i, (y[i] - sigma) / U._(i, i));
        }
        return x;
    };
    Solver.gpu = new gpu_js_1.GPU();
    return Solver;
}());
exports.Solver = Solver;
//# sourceMappingURL=solver.js.map