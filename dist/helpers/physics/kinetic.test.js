"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vector_1 = require("../math/vector");
var kinetic_1 = require("./kinetic");
var p1 = new vector_1.Vector([0, 0, 0]);
var p2 = new vector_1.Vector([5, 0, 0]);
var mass3 = new vector_1.Vector([1, 1, 1]);
var velocity = new vector_1.Vector([0, 0, 0]);
var timestep = 0.1;
describe("kinetic", function () {
    test("energy", function () {
        expect(kinetic_1.Kinetic.energyGain(p1, p1, velocity, timestep, mass3)).toEqual(0);
    });
    test("gradient", function () {
        expect(kinetic_1.Kinetic.gradientEnergyGain(p1, p1, velocity, timestep, mass3).elements).toEqual(new Float32Array([0, 0, 0]));
        expect(kinetic_1.Kinetic.gradientEnergyGain(p1, p2, velocity, timestep, mass3).elements).toEqual(new Float32Array([-500, 0, 0]));
        expect(kinetic_1.Kinetic.gradientEnergyGain(p1, p2, new vector_1.Vector([-30, 0, -10]), timestep, mass3).elements).toEqual(new Float32Array([-200, 0, 100]));
    });
    test("hessian", function () {
        var mh2 = mass3.multiplyScalarNew(1 / timestep / timestep);
        expect(kinetic_1.Kinetic.hessianEnergyGain(timestep, mass3).elements).toEqual(new Float32Array([mh2._(0), 0, 0, 0, mh2._(1), 0, 0, 0, mh2._(2)]));
    });
});
//# sourceMappingURL=kinetic.test.js.map