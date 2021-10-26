"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spring = void 0;
var matrix_1 = require("../math/matrix");
var Spring = (function () {
    function Spring() {
    }
    Spring.energy = function (point1, point2, restlength, springConstant) {
        var diff = point1.subtractNew(point2).norm() - restlength;
        return 0.5 * springConstant * diff * diff;
    };
    Spring.energyGradient = function (point1, point2, restlength, springConstant) {
        var vectorFromP2ToP1 = point1.subtractNew(point2);
        return vectorFromP2ToP1.multiplyScalar(springConstant * (1 - restlength / vectorFromP2ToP1.norm()));
    };
    Spring.energyHessian = function (point1, point2, restlength, springConstant) {
        var identity = matrix_1.Matrix.identity(3);
        var vectorFromP2ToP1 = point1.subtractNew(point2);
        var squaredNorm = vectorFromP2ToP1.squaredNorm();
        return identity
            .subtract(identity
            .subtractNew(vectorFromP2ToP1
            .outerProduct(vectorFromP2ToP1.transposeNew())
            .multiplyScalar(1 / squaredNorm))
            .multiplyScalar(restlength / Math.sqrt(squaredNorm)))
            .multiplyScalar(-springConstant);
    };
    return Spring;
}());
exports.Spring = Spring;
//# sourceMappingURL=spring.js.map