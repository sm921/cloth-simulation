"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var matrix_1 = require("./matrix");
var matrix_test_1 = require("./matrix.test");
var solver_1 = require("./solver");
var vector_1 = require("./vector");
describe("solver", function () {
    test("Cholesky", function () {
        var A = new matrix_1.Matrix([1, -1, 2, -1, 5, -4, 2, -4, 6], 3, 3);
        expect(solver_1.Solver.cholesky(A, [17, 31, -5])).toEqual(new Float32Array([51.5, 4.5, -15]));
    });
    test("Gauss-Siedel", function () {
        [undefined, 7].forEach(function (iterationCount) {
            return matrix_test_1.expectElementsEqualTo(solver_1.Solver.gaussSiedel(new matrix_1.Matrix([16, 3, 7, -11], 2, 2), vector_1.Vector.ones(2), new vector_1.Vector([11, 13]), iterationCount).elements, [0.8122, -0.665], 1);
        });
        matrix_test_1.expectElementsEqualTo(solver_1.Solver.gaussSiedel(new matrix_1.Matrix([10, -1, 2, 0, -1, 11, -1, 3, 2, -1, 10, -1, 0, 3, -1, 8], 4, 4), vector_1.Vector.zero(4), new vector_1.Vector([6, 25, -11, 15])).elements, [1, 2, -1, 1], 1);
    });
    test("Jacobi", function () {
        [undefined, 25].forEach(function (iterationCount) {
            return matrix_test_1.expectElementsEqualTo(solver_1.Solver.jacobi(new matrix_1.Matrix([2, 1, 5, 7], 2, 2), vector_1.Vector.ones(2), new vector_1.Vector([11, 13]), iterationCount).elements, [7.111, -3.222], 1);
        });
    });
    var testLuSolver = function (A, b, x) {
        return test("LU", function () {
            expect(solver_1.Solver.lu(A, new vector_1.Vector(b)).elements).toEqual(new Float32Array(x));
        });
    };
    testLuSolver(new matrix_1.Matrix([1, 2, 4, 3, 8, 14, 2, 6, 13], 3, 3), [3, 13, 4], [3, 4, -2]);
    testLuSolver(new matrix_1.Matrix([3, 1, 6, -6, 0, -16, 0, 8, -17], 3, 3), [0, 4, 17], [2, 0, -1]);
});
//# sourceMappingURL=solver.test.js.map