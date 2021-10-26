"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectElementsEqualTo = void 0;
var matrix_1 = require("./matrix");
var vector_1 = require("./vector");
function expectElementsEqualTo(elements, to, tolerance) {
    if (tolerance === void 0) { tolerance = 2; }
    var mat = [];
    elements.forEach(function (el) { return mat.push(Number(el.toFixed(tolerance))); });
    mat = mat.map(function (el) { return (el === -0 ? 0 : el); });
    expect(mat.toString()).toEqual(to.map(function (el) { return Number(el.toFixed(tolerance)); }).toString());
}
exports.expectElementsEqualTo = expectElementsEqualTo;
describe("matrix", function () {
    test("inverse", function () {
        var A = new matrix_1.Matrix([1, 2, 3, 0, 1, -4, 4, 8, 7], 3, 3);
        var invA = A.inverseNew();
        var identity = A.multiply(invA);
        for (var i = 0; i < identity.height; i++)
            for (var j = 0; j < identity.width; j++)
                expect(Math.abs((i === j ? 1 : 0) - identity._(i, j)) < 0.0001).toBe(true);
    });
    test("multiplication", function () {
        var A = new matrix_1.Matrix([1, 2, 3, 0], 2, 2);
        var B = new matrix_1.Matrix([1, 2, 3, 0], 2, 2);
        var C = A.multiply(B);
        expectElementsEqualTo(C.elements, [7, 2, 3, 6]);
    });
    test("add", function () {
        expectElementsEqualTo(new matrix_1.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3).addNew(new matrix_1.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3)).elements, [2, 4, 6, 8, 10, 12, 14, 16, 18]);
    });
    test("transpose", function () {
        expect(new matrix_1.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3).transpose().elements).toEqual(new Float32Array([1, 4, 7, 2, 5, 8, 3, 6, 9]));
    });
    describe("kronecker product", function () {
        var A = new matrix_1.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3);
        var x = new vector_1.Vector([1, 2, 3]);
        var xt = x.transposeNew();
        var I3 = matrix_1.Matrix.identity(3);
        var xtI3 = xt.kroneckerProduct(I3);
        test("I3", function () {
            expectElementsEqualTo(A.kroneckerProduct(I3).elements, [
                1, 0, 0, 2, 0, 0, 3, 0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 0, 1, 0, 0,
                2, 0, 0, 3, 4, 0, 0, 5, 0, 0, 6, 0, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0, 0,
                0, 4, 0, 0, 5, 0, 0, 6, 7, 0, 0, 8, 0, 0, 9, 0, 0, 0, 7, 0, 0, 8, 0,
                0, 9, 0, 0, 0, 7, 0, 0, 8, 0, 0, 9,
            ]);
            expectElementsEqualTo(x.kroneckerProduct(I3).elements, [
                1, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0, 0, 2, 0, 0, 0, 2, 3, 0, 0, 0, 3,
                0, 0, 0, 3,
            ]);
        });
        test("(x^t * I3)^t = x * I3", function () {
            expectElementsEqualTo(xtI3.transpose().elements, x.kroneckerProduct(I3).elements);
            expectElementsEqualTo(xt.kroneckerProduct(A).transpose().elements, x.kroneckerProduct(A.transpose()).elements);
        });
        test("(x^t * I3)^t A (x^t * I3) = xx^t * A", function () {
            expectElementsEqualTo(xtI3.transpose().multiply(A).multiply(xtI3).elements, x.outerProduct(xt).kroneckerProduct(A).elements);
        });
    });
});
//# sourceMappingURL=matrix.test.js.map