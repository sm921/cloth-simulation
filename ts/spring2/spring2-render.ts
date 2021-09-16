/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/render-helper.ts" />
/// <reference path="spring2-simulator.ts" />

namespace SPRING2_RENDER {
  let balls: THREE.Mesh[] = [];
  let lines: THREE.Line[] = [];

  export function render() {
    const length = 10;
    const numberOfPoints = 2;
    const mass = 0.25;
    const restlength = length / numberOfPoints;
    const springConstant = 1;
    const simulator = new SPRING2_SIMULALTOR.Simulator(
      range(numberOfPoints, -40, restlength)
        .map((num) => [num, 0, 50])
        .flat(),
      (positionIndex) => positionIndex === 0,
      range(numberOfPoints - 1, 0, 1).map((num) => [num, num + 1]),
      new Float32Array(arrayOf(mass, numberOfPoints)),
      new Float32Array(arrayOf(restlength, numberOfPoints)),
      new Float32Array(arrayOf(springConstant, numberOfPoints))
    );
    RENDER_HELPER.render({
      cameraParams: { position: [0, -100, 2] },
      simulate: () => {
        simulator.simulate();
        simulator.springs.forEach((spring, i) => {
          const [origin, end] = [spring.origin, spring.end].map(
            (endpoint) =>
              simulator.getPositionOfEndpointOfSpring(endpoint).elements
          );
          const [ball1, ball2] = [balls[2 * i], balls[2 * i + 1]];
          ball1.position.set(origin[0], origin[1], origin[2]);
          ball2.position.set(end[0], end[1], end[2]);
          lines[i].geometry.setFromPoints([
            new THREE.Vector3(origin[0], origin[1], origin[2]),
            new THREE.Vector3(end[0], end[1], end[2]),
          ]);
        });
      },
      initModel: () => {
        RENDER_HELPER.addPlane(1000, 1000, { position: [0, 0, -100] });
        simulator.springs.forEach((spring) => {
          const [origin, end] = [spring.origin, spring.end].map(
            (endpoint) =>
              simulator.getPositionOfEndpointOfSpring(endpoint).elements
          );
          balls.push(RENDER_HELPER.addBall(origin[0], origin[1], origin[2]));
          balls.push(RENDER_HELPER.addBall(end[0], end[1], end[2]));
          lines.push(
            RENDER_HELPER.addLine(
              [origin[0], origin[1], origin[2]],
              [end[0], end[1], end[2]]
            )
          );
        });
      },
    });
  }

  function arrayOf(value: number, size: number): number[] {
    return [...Array(size)].map((_) => value);
  }
  function range(size: number, from: number, step: number): number[] {
    return [...Array(size)].map((_, i) => from + i * step);
  }
}
