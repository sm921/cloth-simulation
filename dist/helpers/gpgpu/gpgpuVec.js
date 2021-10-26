"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.letSubVec = exports.letScaleVec = exports.letAddVec = void 0;
var gpu_js_1 = require("gpu.js");
var vector_1 = require("../math/vector");
var gpu = new gpu_js_1.GPU();
var letAddVec = function (n) {
    var add = gpu.createKernel(function (a, b) {
        return a[this.thread.x] + b[this.thread.x];
    }, { output: [n] });
    return function (a, b) {
        return new vector_1.Vector(add(a.elements, b.elements));
    };
};
exports.letAddVec = letAddVec;
var letScaleVec = function (n) {
    var scale = gpu.createKernel(function (a, b) {
        return a[this.thread.x] * b;
    }, { output: [n] });
    return function (a, b) {
        return new vector_1.Vector(scale(a.elements, b));
    };
};
exports.letScaleVec = letScaleVec;
var letSubVec = function (n) {
    var subtract = gpu.createKernel(function (a, b) {
        return a[this.thread.x] - b[this.thread.x];
    }, { output: [n] });
    return function (a, b) {
        return new vector_1.Vector(subtract(a.elements, b.elements));
    };
};
exports.letSubVec = letSubVec;
//# sourceMappingURL=gpgpuVec.js.map