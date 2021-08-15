const _particles: Vec4[][] = [
  // row 1
  [
    [11, 12, 13, 0],
    [14, 15, 16, 0],
    [17, 18, 19, 1],
  ],
  // row 2
  [
    [21, 22, 23, 0],
    [24, 25, 26, 0],
    [27, 28, 29, 1],
  ],
];
const rowSize = _particles[0].length;
const columnSize = _particles.length;
const out = [_particles.flat().length];
const gpu = new GPU();
// particles are automatically flattened by the library
// i.e. particles == [p1, p2, p3, ...]; (each pi == [x, y, z, w])
const applyGravity = gpu
  .createKernel(function (particles: Vec4[]) {
    const x = particles[this.thread.x][0];
    const y = particles[this.thread.x][1];
    let z = particles[this.thread.x][2];
    const fixedOrNot = particles[this.thread.x][3];
    if (fixedOrNot === 0)
      // if not fixed
      z = Math.max(0, z - 5); // move down
    return [x, y, z, fixedOrNot];
  })
  .setPipeline(true)
  .setOutput(out);
const restLength = 1;
const structuralSpring = gpu
  .createKernel<
    Vec4[][],
    { rowSize: number; columnSize: number; restLength: number }
  >(
    function (particles: Vec4[]) {
      const rowSize = this.constants.rowSize;
      const columnSize = this.constants.columnSize;
      const restLength = this.constants.restLength;
      const horizontalIndex = this.thread.x % rowSize;
      const verticalIndex = Math.floor(this.thread.x / rowSize);
      const p1 = particles[this.thread.x];
      let [x1, y1, z1, fixedOrNot1] = p1;
      // skip the last particle
      if (horizontalIndex === rowSize - 1 && verticalIndex == columnSize - 1)
        return p1;
      // if the particles is fixed
      if (fixedOrNot1 == 1) return p1;
      // space the particles in a rest length
      /*
                p1 - p2
            */
      const p2 = particles[this.thread.x + 1];
      const [x2, y2, z2, fixedOrNot2] = p2;
      const [dx, dy, dz] = [x2 - x1, y2 - y1, z2 - z1];
      const d = Math.sqrt(dx * dx + dy * dy + dz + dz);
      const move = restLength / d;
      x1 += move * dx;
      y1 += move * dy;
      z1 += move * dz;
      /*
                p3
                |   
                p1
            */
      if (verticalIndex !== columnSize - 1) {
        const p3 = particles[this.thread.x + 1];
        const [x3, y3, z3, fixedOrNot3] = p3;
        const [dx31, dy31, dz31] = [x3 - x1, y3 - y1, z3 - z1];
        const d31 = Math.sqrt(dx31 * dx31 + dy31 * dy31 + dz31 + dz31);
        const moveTo3 = restLength / d31;
        x1 += moveTo3 * dx31;
        y1 += moveTo3 * dy31;
        z1 += moveTo3 * dz31;
      }
      return [x1, y1, z1, fixedOrNot1];
    },
    {
      constants: {
        restLength,
        rowSize,
        columnSize,
      },
    }
  )
  .setOutput(out);
console.log(structuralSpring(applyGravity(_particles.flat())));
