namespace FREE_FALL_RENDER {
  let balls: THREE.Mesh[] = [];
  export function render() {
    const groundZValue = -90;
    const simulatorImplicit = new FREE_FALL_SIMULATOR.Simulator(
      [-10, 0, 40],
      groundZValue
    );
    const simulatorExplicit = new FREE_FALL_SIMULATOR.Simulator(
      [10, 0, 40],
      groundZValue
    );
    RENDER_HELPER.render({
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
          balls.push(RENDER_HELPER.addBall(...simulator.position))
        );
        RENDER_HELPER.addPlane(1000, 1000, {
          position: [0, 0, groundZValue],
        });
      },
    });
  }

  export function restart() {
    RENDER_HELPER.clear();
  }
}
