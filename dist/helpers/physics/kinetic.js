"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kinetic = void 0;
var matrix_1 = require("../math/matrix");
var Kinetic = (function () {
    function Kinetic() {
    }
    Kinetic.energyGain = function (newPositions, currentPositions, velocity, timestep, mass) {
        var diff = newPositions
            .subtractNew(currentPositions)
            .subtract(velocity.multiplyScalarNew(timestep));
        return ((0.5 / timestep / timestep) * diff.multiplyElementwise(mass).dot(diff));
    };
    Kinetic.gradientEnergyGain = function (newPositions, currentPositions, velocity, timestep, mass) {
        return newPositions
            .subtractNew(currentPositions)
            .subtract(velocity.multiplyScalarNew(timestep))
            .multiplyElementwise(mass)
            .multiplyScalar(1 / timestep / timestep);
    };
    Kinetic.hessianEnergyGain = function (timestep, mass) {
        var hessian = matrix_1.Matrix.zero(mass.height, mass.height);
        var invTimestepSquared = 1 / timestep / timestep;
        for (var i = 0; i < hessian.height; i++)
            hessian.set(i, i, mass._(i) * invTimestepSquared);
        return hessian;
    };
    return Kinetic;
}());
exports.Kinetic = Kinetic;
//# sourceMappingURL=kinetic.js.map