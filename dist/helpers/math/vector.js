"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vector = void 0;
var gpgpuVec_1 = require("../gpgpu/gpgpuVec");
var matrix_1 = require("./matrix");
var Vector = (function (_super) {
    __extends(Vector, _super);
    function Vector(elements) {
        var _this = _super.call(this, elements, elements.length, 1) || this;
        _this.kernel = {
            add: {},
            subtract: {},
            scale: {},
        };
        return _this;
    }
    Vector.prototype._ = function (index) {
        return this.elements[index];
    };
    Vector.prototype.add = function (vec) {
        _super.prototype.add.call(this, vec);
        return this;
    };
    Vector.prototype.addNew = function (vec) {
        return this.useKernel(function (kernel) { return kernel.add; }, vec, gpgpuVec_1.letAddVec, this.add);
    };
    Vector.prototype.clone = function () {
        return new Vector(new Float32Array(this.elements));
    };
    Vector.prototype.dot = function (vec) {
        var sum = 0;
        for (var i = 0; i < this.elements.length; i++)
            sum += this._(i) * vec._(i);
        return sum;
    };
    Vector.prototype.kroneckerProduct = function (matrix) {
        var product = matrix_1.Matrix.zero(this.height * matrix.height, this.width * matrix.width);
        var isRowVector = this.height === 1;
        for (var i = 0; i < this.elements.length; i++) {
            var productBlock = matrix.multiplyScalarNew(this._(i));
            for (var rowBlockIndex = 0; rowBlockIndex < productBlock.height; rowBlockIndex++)
                for (var columnBlockIndex = 0; columnBlockIndex < productBlock.width; columnBlockIndex++) {
                    product.set(rowBlockIndex + (isRowVector ? 0 : i * productBlock.height), columnBlockIndex + (isRowVector ? i * productBlock.width : 0), productBlock._(rowBlockIndex, columnBlockIndex));
                }
        }
        return product;
    };
    Vector.prototype.multiplyScalar = function (scalar) {
        for (var i = 0; i < this.elements.length; i++)
            this.elements[i] *= scalar;
        return this;
    };
    Vector.prototype.multiplyScalarNew = function (scalar) {
        return this.useKernel(function (k) { return k.scale; }, scalar, gpgpuVec_1.letScaleVec, this.multiplyScalar);
    };
    Vector.prototype.outerProduct = function (vec) {
        var product = matrix_1.Matrix.zero(vec.width, this.height);
        for (var row = 0; row < product.width; row++)
            for (var column = 0; column < product.width; column++)
                product.set(row, column, this._(row) * vec._(column));
        return product;
    };
    Vector.prototype.multiplyElementwise = function (vec) {
        for (var i = 0; i < this.elements.length; i++)
            this.set(i, this._(i) * vec._(i));
        return this;
    };
    Vector.prototype.multiplyElementwiseNew = function (vec) {
        return this.clone().multiplyElementwise(vec);
    };
    Vector.ones = function (size) {
        var v = Vector.zero(size);
        for (var i = 0; i < size; i++)
            v.set(i, 1);
        return v;
    };
    Vector.prototype.subtract = function (vec) {
        return _super.prototype.subtract.call(this, vec);
    };
    Vector.prototype.subtractNew = function (vec) {
        return this.useKernel(function (kernel) { return kernel.subtract; }, vec, gpgpuVec_1.letSubVec, this.subtract);
    };
    Vector.prototype.norm = function () {
        return Math.sqrt(this.squaredNorm());
    };
    Vector.prototype.normalize = function () {
        var norm = this.norm();
        return norm === 0 ? this : this.multiplyScalar(1 / norm);
    };
    Vector.prototype.normalizeNew = function () {
        return this.clone().normalize();
    };
    Vector.prototype.projectTo = function (to) {
        var norm2 = to.squaredNorm();
        return norm2 === 0 ? to : to.multiplyScalarNew(this.dot(to) / norm2);
    };
    Vector.prototype.squaredNorm = function () {
        var sum = 0;
        for (var i = 0; i < this.elements.length; i++)
            sum += this._(i) * this._(i);
        return sum;
    };
    Vector.prototype.set = function (index, element) {
        this.elements[index] = element;
    };
    Vector.prototype.transpose = function () {
        var _a;
        _a = [this.height, this.width], this.width = _a[0], this.height = _a[1];
        return this;
    };
    Vector.prototype.transposeNew = function () {
        var clone = this.clone();
        return clone.transpose();
    };
    Vector.zero = function (size) {
        return new Vector(new Float32Array(size));
    };
    Vector.prototype.useKernel = function (selectKernel, b, letKernel, onCpu) {
        var _a;
        var n = this.elements.length;
        return !matrix_1.ENABLES_GPU || n < 1e2
            ? onCpu.bind(this.clone())(b)
            : ((_a = selectKernel(this.kernel)[n]) !== null && _a !== void 0 ? _a : (selectKernel(this.kernel)[n] = letKernel(n)))(this, b);
    };
    return Vector;
}(matrix_1.Matrix));
exports.Vector = Vector;
//# sourceMappingURL=vector.js.map