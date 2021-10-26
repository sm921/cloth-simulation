"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var matrix_1 = require("./matrix");
var matrix_test_1 = require("./matrix.test");
var vector_1 = require("./vector");
describe("vector", function () {
    test("multiplication", function () {
        var A = new matrix_1.Matrix([
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
        ], 3, 3);
        var x = new vector_1.Vector([1, 2, 3]);
        matrix_test_1.expectElementsEqualTo(A.multiplyVector(x, vector_1.Vector).elements, [14, 32, 50]);
        matrix_test_1.expectElementsEqualTo(A.multiplyVector(x, vector_1.Vector).elements, [14, 32, 50]);
    });
});
//# sourceMappingURL=vector.test.js.map