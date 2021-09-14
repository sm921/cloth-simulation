namespace STRING_RENDER {
  let balls: THREE.Mesh[] = [];
  let lines: THREE.Line[] = [];

  export function render() {
    const numberOfPoints = 50;
    const mass = 0.5;
    const restlength = 0.2;
    const springConstant = 3;
    const simulator = new STRING_SIMULATOR.Simulator(
      range(numberOfPoints, -10, 10).map((num) => [num, 0, 50]),
      range(numberOfPoints - 1, 0, 1).map((num) => [num, num + 1]),
      (i) => i === 0,
      new Float32Array(arrayOf(mass, numberOfPoints)),
      new Float32Array(arrayOf(restlength, numberOfPoints)),
      new Float32Array(arrayOf(springConstant, numberOfPoints))
    );
    RENDER_HELPER.render({
      cameraParams: { position: [0, -100, 2] },
      simulate: () => {
        simulator.simulateByEnergyMinimization();
        simulator.springs.forEach((spring, i) => {
          const [origin, end] = [
            spring.position1Index,
            spring.position2Index,
          ].map((positionIndex) => simulator.positions[positionIndex].elements);
          const [ball1, ball2] = [balls[2 * i], balls[2 * i + 1]];
          ball1.position.set(origin[0], origin[1], origin[2]);
          ball2.position.set(end[0], end[1], end[2]);
          lines[i].geometry.setFromPoints([ball1.position, ball2.position]);
        });
      },
      initModel: () => {
        RENDER_HELPER.addPlane(1000, 1000);
        simulator.springs.forEach((spring) => {
          const [origin, end] = [
            spring.position1Index,
            spring.position2Index,
          ].map((positionIndex) => simulator.positions[positionIndex].elements);
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
