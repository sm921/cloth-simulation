import { Vector } from "../math/vector";
import { Spring } from "./spring";

const p1 = new Vector([0, 0, 0]);
const p2 = new Vector([5, 0, 0]);
const restlength = 5;
const springConstant = 1;
describe("spring", () => {
  test("energy", () => {
    expect(Spring.energy(p1, p2, restlength, springConstant)).toEqual(0);
  });
  test("gradient", () => {
    Spring.energyGradient(p1, p2, restlength, springConstant).elements.forEach(
      (el) => expect(Math.abs(el)).toEqual(0)
    );
  });
  test("hessian", () => {
    Spring.energyHessian(p1, p2, restlength, springConstant).elements.forEach(
      (el, i) => expect(Math.abs(el)).toEqual(i === 0 ? 1 : 0)
    );
  });
});
