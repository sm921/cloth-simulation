/// <reference path="spring.ts" />

namespace SPRINGTEST {
  const p1 = new MATH.Vector([0, 0, 0]);
  const p2 = new MATH.Vector([5, 0, 0]);
  const restlength = 5;
  const springConstant = 1;
  describe("spring", () => {
    test("energy", () => {
      expect(PHYSICS_SPRING.energy(p1, p2, restlength, springConstant)).toEqual(
        0
      );
    });
    test("gradient", () => {
      PHYSICS_SPRING.energyGradient(
        p1,
        p2,
        restlength,
        springConstant
      ).elements.forEach((el) => expect(Math.abs(el)).toEqual(0));
    });
    test("hessian", () => {
      PHYSICS_SPRING.energyHessian(
        p1,
        p2,
        restlength,
        springConstant
      ).elements.forEach((el, i) =>
        expect(Math.abs(el)).toEqual(i === 0 ? 1 : 0)
      );
    });
  });
}
