namespace SPRING_RENDER {
  let balls: THREE.Mesh[] = [];
  let lines: THREE.Line[] = [];

  export function render() {
    const implicitSimulator = new SPRING_SIMULALTOR.Simulator(
      [-10, 0, 50],
      [0, 0, 50],
      12
    );
    const explicitSimulator = new SPRING_SIMULALTOR.Simulator(
      [10, 0, 50],
      [20, 0, 50],
      12
    );
    RENDER_HELPER.render({
      cameraParams: { position: [0, -100, 2] },
      simulate: () => {
        implicitSimulator.simulateByEnergyMinimization();
        explicitSimulator.simulateExplictEuler();
        [explicitSimulator, implicitSimulator].forEach((simulator, i) => {
          const [ball1, ball2] = [balls[2 * i], balls[2 * i + 1]];
          ball1.position.set(...simulator.origin);
          ball2.position.set(...simulator.end);
          lines[i].geometry.setFromPoints([ball1.position, ball2.position]);
        });
      },
      initModel: () => {
        RENDER_HELPER.addPlane(1000, 1000);
        [explicitSimulator, implicitSimulator].forEach((simulator) => {
          balls.push(RENDER_HELPER.addBall(...simulator.origin));
          balls.push(RENDER_HELPER.addBall(...simulator.end));
          lines.push(RENDER_HELPER.addLine(simulator.origin, simulator.end));
        });
      },
    });
  }
}
