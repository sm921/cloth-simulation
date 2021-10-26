"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Matrix = exports.ENABLES_GPU = void 0;
exports.ENABLES_GPU = false;
var gpgpuMat_1 = require("../gpgpu/gpgpuMat");
var Matrix = (function () {
    function Matrix(elements, height, width) {
        this.height = height;
        this.width = width;
        this._kernel = {
            add: {},
            subtract: {},
            scale: {},
            multiply: {},
        };
        if (typeof elements === "number") {
            this.elements = new Float32Array(width * height);
            for (var i = 0; i < Math.min(width, height); i++)
                this.set(i, i, elements);
        }
        else
            this.elements =
                elements instanceof Float32Array
                    ? elements
                    : new Float32Array(elements);
    }
    Matrix.prototype.add = function (anotherMattrix) {
        for (var i = 0; i < this.elements.length; i++)
            this.elements[i] += anotherMattrix.elements[i];
        return this;
    };
    Matrix.prototype.addNew = function (B) {
        return this._useKernel(function (kernel) { return kernel.add; }, B, gpgpuMat_1.letAddMat, this.add);
    };
    Matrix.prototype.columnVector = function (columnIndex, Vector) {
        var columnVector = new Vector(new Float32Array(this.height));
        for (var i = 0; i < columnVector.height; i++)
            columnVector.set(i, this._(i, columnIndex), 0);
        return columnVector;
    };
    Matrix.prototype.clearRow = function (rowIndex) {
        for (var column = 0; column < this.width; column++)
            this.set(rowIndex, column, 0);
        return this;
    };
    Matrix.prototype.clone = function () {
        return new Matrix(new Float32Array(this.elements), this.width, this.height);
    };
    Matrix.prototype.forEach = function (callback) {
        for (var row = 0; row < this.height; row++)
            for (var column = 0; column < this.width; column++)
                callback(row, column, this._(row, column));
    };
    Matrix.prototype.kroneckerProduct = function (matrix) {
        var product = Matrix.zero(this.height * matrix.height, this.width * matrix.width);
        for (var row = 0; row < this.height; row++)
            for (var column = 0; column < this.width; column++) {
                var productBlock = matrix.multiplyScalarNew(this._(row, column));
                for (var rowBlockIndex = 0; rowBlockIndex < productBlock.height; rowBlockIndex++)
                    for (var columnBlockIndex = 0; columnBlockIndex < productBlock.width; columnBlockIndex++) {
                        product.set(rowBlockIndex + row * matrix.height, columnBlockIndex + column * matrix.width, productBlock._(rowBlockIndex, columnBlockIndex));
                    }
            }
        return product;
    };
    Matrix.prototype.multiply = function (by) {
        var _this = this;
        return this._useKernel(function (kernel) { return kernel.multiply; }, by, gpgpuMat_1.letMulMat, function () {
            var product = new Matrix(new Float32Array(by.width * _this.height), _this.height, by.width);
            for (var rowIndex = 0; rowIndex < product.height; rowIndex++) {
                for (var columnIndex = 0; columnIndex < product.width; columnIndex++) {
                    for (var k = 0; k < _this.width; k++)
                        product.elements[product.getFlatArrayIndex(rowIndex, columnIndex)] += _this._(rowIndex, k) * by._(k, columnIndex);
                }
            }
            return product;
        });
    };
    Matrix.prototype.multiplyScalar = function (scalar) {
        for (var i = 0; i < this.elements.length; i++)
            this.elements[i] *= scalar;
        return this;
    };
    Matrix.prototype.multiplyScalarNew = function (scalar) {
        return this._useKernel(function (kernel) { return kernel.scale; }, scalar, gpgpuMat_1.letScaleMat, this.multiplyScalar);
    };
    Matrix.prototype.multiplyVector = function (v, P) {
        var _a;
        var productAsMatrix = this.multiply(v);
        var product = new P(productAsMatrix.elements);
        _a = [
            productAsMatrix.height,
            productAsMatrix.width,
        ], product.height = _a[0], product.width = _a[1];
        return product;
    };
    Matrix.identity = function (size) {
        var zero = Matrix.zero(size, size);
        for (var diagonalIndex = 0; diagonalIndex < size; diagonalIndex++)
            zero.elements[zero.getFlatArrayIndex(diagonalIndex, diagonalIndex)] = 1;
        return zero;
    };
    Matrix.prototype.isSquare = function () {
        return this.width === this.height;
    };
    Matrix.zero = function (height, width) {
        return new Matrix(new Float32Array(width * height), height, width);
    };
    Matrix.prototype.inverse = function () {
        var identity = Matrix.identity(this.width);
        for (var column = 0; column < this.width; column++) {
            var nonZeroRow = column;
            var nonZeroElement = this._(nonZeroRow, column);
            if (nonZeroElement === 0) {
                for (nonZeroRow = column + 1; nonZeroRow < this.height; nonZeroRow++) {
                    nonZeroElement = this._(nonZeroRow, column);
                    if (nonZeroElement !== 0) {
                        this.swapRowIAndJ(column, nonZeroRow);
                        identity.swapRowIAndJ(column, nonZeroRow);
                        break;
                    }
                    if (nonZeroRow === this.height - 1)
                        return null;
                }
            }
            if (nonZeroElement !== 1) {
                this.multiplyRowIByA(nonZeroRow, 1 / nonZeroElement);
                identity.multiplyRowIByA(nonZeroRow, 1 / nonZeroElement);
            }
            for (var row = 0; row < this.height; row++)
                if (row !== nonZeroRow) {
                    var element = this._(row, column);
                    if (element !== 0) {
                        this.subtractRowIByJMultipliedByA(row, nonZeroRow, element);
                        identity.subtractRowIByJMultipliedByA(row, nonZeroRow, element);
                    }
                }
        }
        return identity;
    };
    Matrix.prototype.inverseNew = function () {
        var clone = this.clone();
        return clone.inverse();
    };
    Matrix.prototype.toString = function (digit, toFixed) {
        var _this = this;
        if (digit === void 0) { digit = 2; }
        if (toFixed === void 0) { toFixed = 0; }
        var string = "";
        this.forEach(function (i, j, el) {
            string += String(el.toFixed(toFixed)).padStart(digit, " ") + " ";
            if (j === _this.width - 1)
                string += "\n";
        });
        return string;
    };
    Matrix.prototype.set = function (rowIndex, columnIndex, element) {
        this.elements[this.getFlatArrayIndex(rowIndex, columnIndex)] = element;
    };
    Matrix.prototype.subtract = function (anotherMattrix) {
        for (var i = 0; i < this.elements.length; i++)
            this.elements[i] -= anotherMattrix.elements[i];
        return this;
    };
    Matrix.prototype.subtractNew = function (B) {
        return this._useKernel(function (kernel) { return kernel.subtract; }, B, gpgpuMat_1.letSubMat, this.subtract);
    };
    Matrix.prototype._ = function (rowIndex, columnIndex) {
        return this.elements[this.getFlatArrayIndex(rowIndex, columnIndex)];
    };
    Matrix.prototype.transpose = function () {
        var t = Matrix.zero(this.width, this.height);
        for (var row = 0; row < t.height; row++)
            for (var column = 0; column < t.width; column++)
                t.set(row, column, this._(column, row));
        return t;
    };
    Matrix.prototype.getFlatArrayIndex = function (rowIndex, columnIndex) {
        return this.width * rowIndex + columnIndex;
    };
    Matrix.prototype.swapRowIAndJ = function (rowI, rowJ) {
        for (var column = 0; column < this.width; column++) {
            var rowIIndex = this.getFlatArrayIndex(rowI, column);
            var rowJIndex = this.getFlatArrayIndex(rowJ, column);
            var rowIElement = this.elements[rowIIndex];
            this.elements[rowIIndex] = this.elements[rowJIndex];
            this.elements[rowJIndex] = rowIElement;
        }
    };
    Matrix.prototype.multiplyRowIByA = function (rowI, byA) {
        for (var column = 0; column < this.width; column++)
            this.elements[this.getFlatArrayIndex(rowI, column)] =
                this._(rowI, column) * byA;
    };
    Matrix.prototype.subtractRowIByJMultipliedByA = function (rowI, rowJ, multipliedByA) {
        for (var column = 0; column < this.width; column++) {
            this.elements[this.getFlatArrayIndex(rowI, column)] -=
                this.elements[this.getFlatArrayIndex(rowJ, column)] * multipliedByA;
        }
    };
    Matrix.prototype._useKernel = function (selectKernel, B, letKernel, onCpu) {
        var _a;
        var _b = [this.height, this.width], height = _b[0], width = _b[1];
        var mxn = height + "x" + width;
        return !exports.ENABLES_GPU || this.elements.length < 1e2
            ? onCpu.bind(this.clone())(B)
            : ((_a = selectKernel(this._kernel)[mxn]) !== null && _a !== void 0 ? _a : (selectKernel(this._kernel)[mxn] = letKernel(height, width, B instanceof Matrix ? B.width : 0)))(this, B);
    };
    return Matrix;
}());
exports.Matrix = Matrix;
//# sourceMappingURL=matrix.js.map