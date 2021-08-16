namespace GPU_HELPER {
  /** gpu instance with vector operations */
  export const gpu = new GPU();
  [
    add,
    add3,
    cross,
    dot,
    len,
    normalize,
    pow2,
    project,
    scale,
    subtract,
    // @ts-ignore library's type definition is wrong
  ].forEach((fn) => gpu.addFunction(fn));

  function test() {
    const findSDF = gpu.createKernel<(Vec3[] | Float32Array)[], {}>(
      // @ts-ignore
      function (indexBuffer: Vec3[], positions: Float32Array) {
        const indexV0 = indexBuffer[this.thread.x][0] * 3;
        const indexV1 = indexBuffer[this.thread.x][1] * 3;
        const indexV2 = indexBuffer[this.thread.x][2] * 3;
        const v0: Vec3 = [
          positions[indexV0],
          positions[indexV0 + 1],
          positions[indexV0 + 2],
        ];
        const v1: Vec3 = [
          positions[indexV1],
          positions[indexV1 + 1],
          positions[indexV1 + 2],
        ];
        const v2: Vec3 = [
          positions[indexV2],
          positions[indexV2 + 1],
          positions[indexV2 + 2],
        ];
        const p: Vec3 = [0, 0, 0];
        return len(add3(v0, v1, v2));
      },
      { output: [2] }
    );
    const result = findSDF(
      [
        [0, 1, 2],
        [3, 4, 5],
      ],
      [
        0,
        0,
        0, //v0
        1,
        0,
        0, //v1
        0,
        1,
        0, //v2
        0,
        0,
        1, //v3
        1,
        0,
        1, //v4
        0,
        1,
        1, //v5
      ]
    );
    console.log(result);
  }

  testkernel();
  function testkernel() {
    const [width, height, depth] = [2, 2, 2];
    const kernel = gpu.createKernel<
      number[][][][],
      { indexBuffer: Float32Array; indexBufferLen: number }
    >(
      function (grid: number[][][]) {
        const ib = this.constants.indexBuffer[0];
        const length = this.constants.indexBufferLen;
        return [
          grid[this.thread.z][this.thread.y][this.thread.x],
          this.constants.indexBuffer[4],
          this.constants.indexBuffer[5],
          this.constants.indexBufferLen,
        ];
      },
      {
        output: [width, height, depth, 4],
        constants: {
          indexBuffer: [0, 1, 2, 3, 4, 5, 6],
          indexBufferLen: 7,
        },
      }
    );
    const result = kernel(
      GPU.input(
        [
          //x=0
          [
            //y=0
            [
              //z=0
              1000,
              //z=1
              1001,
            ],
            //y=1
            [
              //z=0
              1010,
              //z=1
              1011,
            ],
          ],
          // x=1
          [
            //y=0
            [
              //z=0
              1100,
              //z=1
              1101,
            ],
            //y=1
            [
              //z=0
              1110,
              //z=1
              1111,
            ],
          ],
        ]
          .flat()
          .flat(),
        [width, height, depth]
      )
    );
    console.log((result as [][]).flat(Infinity).reduce((a, b) => [...a, ...b]));
  }

  export function test2() {
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
        function (particles) {
          const rowSize = this.constants.rowSize;
          const columnSize = this.constants.columnSize;
          const restLength = this.constants.restLength;
          const horizontalIndex = this.thread.x % rowSize;
          const verticalIndex = Math.floor(this.thread.x / rowSize);
          const p1 = particles[this.thread.x];
          let [x1, y1, z1, fixedOrNot1] = p1;
          // skip the last particle
          if (
            horizontalIndex === rowSize - 1 &&
            verticalIndex == columnSize - 1
          )
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
  }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function add3(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function len(a: Vec3): number {
  return Math.sqrt(pow2(a));
}
function normalize(v: Vec3): Vec3 {
  const vp2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const a = 1 / Math.sqrt(vp2);
  return [a * v[0], a * v[1], a * v[2]];
}
function pow2(a: Vec3): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}
function project(v: Vec3, to: Vec3) {
  const e = normalize(to);
  return scale(e, dot(v, e));
}
function scale(v: Vec3, a: number): Vec3 {
  return [a * v[0], a * v[1], a * v[2]];
}
function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
