import { Simulator } from "./free-fall-simulator";
import { addBall, addPlane, renderHelper } from "../helpers/render-helper";

let balls: THREE.Mesh[] = [];
export function render() {
  const groundZValue = -90;
  const simulatorImplicit = new Simulator([-10, 0, 40], groundZValue);
  const simulatorExplicit = new Simulator([10, 0, 40], groundZValue);
  renderHelper({
    cameraParams: { position: [0, -120, 0] },
    simulate: () => {
      simulatorImplicit.simulateByImplicitEuler();
      simulatorExplicit.simulateByExplicitEuler();
      [simulatorImplicit, simulatorExplicit].forEach((simulator, i) =>
        balls[i].position.set(...simulator.position)
      );
    },
    initModel: () => {
      [simulatorImplicit, simulatorExplicit].forEach((simulator, i) =>
        balls.push(addBall(...simulator.position))
      );
      addPlane(1000, 1000, {
        position: [0, 0, groundZValue],
      });
    },
  });
}
