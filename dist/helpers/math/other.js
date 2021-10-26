"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.segment = exports.range = exports.sigma = exports.arrayOf = void 0;
function arrayOf(value, size) {
    return __spreadArray([], Array(size)).map(function (_) { return value; });
}
exports.arrayOf = arrayOf;
function sigma(from, to, fn) {
    var sum = 0;
    for (var i = from; i < to; i++) {
        sum += fn(i);
    }
    return sum;
}
exports.sigma = sigma;
function range(size, from, step) {
    if (from === void 0) { from = 0; }
    if (step === void 0) { step = 1; }
    return __spreadArray([], Array(size)).map(function (_, i) { return from + i * step; });
}
exports.range = range;
function segment(from, to, step) {
    if (from === void 0) { from = 0; }
    if (step === void 0) { step = 1; }
    return __spreadArray([], Array((to - from) / step + 1)).map(function (_, i) { return from + i * step; });
}
exports.segment = segment;
//# sourceMappingURL=other.js.map