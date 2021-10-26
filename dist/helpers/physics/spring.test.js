"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vector_1 = require("../math/vector");
var spring_1 = require("./spring");
var p1 = new vector_1.Vector([0, 0, 0]);
var p2 = new vector_1.Vector([5, 0, 0]);
var restlength = 5;
var springConstant = 1;
describe("spring", function () {
    test("energy", function () {
        expect(spring_1.Spring.energy(p1, p2, restlength, springConstant)).toEqual(0);
    });
    test("gradient", function () {
        spring_1.Spring.energyGradient(p1, p2, restlength, springConstant).elements.forEach(function (el) { return expect(Math.abs(el)).toEqual(0); });
    });
    test("hessian", function () {
        spring_1.Spring.energyHessian(p1, p2, restlength, springConstant).elements.forEach(function (el, i) { return expect(Math.abs(el)).toEqual(i === 0 ? 1 : 0); });
    });
});
//# sourceMappingURL=spring.test.js.map