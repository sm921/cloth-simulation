namespace VEC {
  export function add(...a: Vec3[]): Vec3 {
    let sum: Vec3 = [0, 0, 0];
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < 3; j++) sum[j] += a[i][j];
    return sum;
  }
  export function cross(a: Vec3, b: Vec3): Vec3 {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
  export function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  export function len(a: Vec3): number {
    return Math.sqrt(pow2(a));
  }
  export function normalize(a: Vec3): Vec3 {
    return scale(a, 1 / len(a));
  }
  export function pow2(a: Vec3): number {
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
  }
  export function project(v: Vec3, to: Vec3) {
    const e = VEC.normalize(to);
    return VEC.scale(e, VEC.dot(v, e));
  }
  export function scale(v: Vec3, a: number): Vec3 {
    return [a * v[0], a * v[1], a * v[2]];
  }
  export function subtract(...a: Vec3[]): Vec3 {
    // deep copy
    let result: Vec3 = [...a[0]];
    for (let i = 1; i < a.length; i++)
      for (let j = 0; j < 3; j++) result[j] -= a[i][j];
    return result;
  }
}
