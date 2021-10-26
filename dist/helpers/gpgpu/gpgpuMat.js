"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.letSubMat = exports.letScaleMat = exports.letMulMat = exports.letAddMat = void 0;
var gpu_js_1 = require("gpu.js");
var input = require("gpu.js").input;
var matrix_1 = require("../math/matrix");
var gpu = new gpu_js_1.GPU();
var letAddMat = function (height, width) {
    var add = gpu.createKernel(function (A, B) {
        return A[this.thread.y][this.thread.x] + B[this.thread.y][this.thread.x];
    }, { output: [height * width] });
    return function (A, B) {
        var mxn = [A.height, A.width];
        return new matrix_1.Matrix(add(input(A.elements, mxn), input(B.elements, mxn)), A.height, A.width);
    };
};
exports.letAddMat = letAddMat;
var letMulMat = function (m, n, k) {
    var multiply = gpu.createKernel(function (A, B) {
        var sum = 0;
        for (var i = 0; i < this.constants.n; i++) {
            sum += A[this.thread.y][i] * B[i][this.thread.x];
        }
        return sum;
    }, { output: [m * k], constants: { n: n } });
    return function (A, B) {
        var mxn = [A.height, A.width];
        return new matrix_1.Matrix(multiply(input(A.elements, mxn), input(B.elements, mxn)), A.height, B.width);
    };
};
exports.letMulMat = letMulMat;
var letScaleMat = function (height, width) {
    var scale = gpu.createKernel(function (A, b) {
        return A[this.thread.y][this.thread.x] * b;
    }, { output: [height * width] });
    return function (A, b) {
        var mxn = [A.height, A.width];
        return new matrix_1.Matrix(scale(input(A.elements, mxn), b), A.height, A.width);
    };
};
exports.letScaleMat = letScaleMat;
var letSubMat = function (height, width) {
    var subtract = gpu.createKernel(function (A, B) {
        return A[this.thread.y][this.thread.x] - B[this.thread.y][this.thread.x];
    }, { output: [height * width] });
    return function (A, B) {
        var mxn = [A.height, A.width];
        return new matrix_1.Matrix(subtract(input(A.elements, mxn), input(B.elements, mxn)), A.height, A.width);
    };
};
exports.letSubMat = letSubMat;
//# sourceMappingURL=gpgpuMat.js.map