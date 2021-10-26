"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var matrix_1 = require("./matrix");
var matrix_test_1 = require("./matrix.test");
var matrix_modification_1 = require("./matrix-modification");
describe("matrix modification", function () {
    test("hessenberge reduction", function () {
        matrix_test_1.expectElementsEqualTo(matrix_modification_1.hessenbergReduction(new matrix_1.Matrix([
            0.2815, 0.1386, 0.5038, 0.4494, 0.7311, 0.5882, 0.4896, 0.9635,
            0.1378, 0.3662, 0.877, 0.0423, 0.8367, 0.8068, 0.3531, 0.973,
        ], 4, 4)).elements, [
            0.2815, -0.4884, -0.4152, 0.2532, -1.1196, 1.7764, 0.4547, -0.1854, 0,
            0.1629, 0.822, 0.1283, 0, 0, 0, -0.1603,
        ]);
    });
});
//# sourceMappingURL=matrix-modification.test.js.map