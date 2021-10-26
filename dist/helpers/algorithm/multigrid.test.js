"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var multigrid_1 = require("./multigrid");
describe("multigrid", function () {
    var size = 3;
    var length = 80;
    var positions = [];
    var restlength = length / (size - 1);
    var _a = [length, length].map(function (length) {
        return Math.ceil(length / restlength);
    }), widthMaxIndex = _a[0], heightMaxIndex = _a[1];
    for (var widthIndex = 0; widthIndex <= widthMaxIndex; widthIndex++) {
        var x = widthIndex * restlength;
        for (var heightIndex = 0; heightIndex <= heightMaxIndex; heightIndex++) {
            var y = heightIndex * restlength;
            positions.push(x, y, 0);
        }
    }
    var multigrid = new multigrid_1.Multigrid(positions, 2, 2);
    test("grids", function () {
        expect(1).toBe(1);
    });
});
//# sourceMappingURL=multigrid.test.js.map