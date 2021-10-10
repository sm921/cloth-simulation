export function arrayOf(value: number, size: number): number[] {
  return [...Array(size)].map((_) => value);
}

export function sigma(
  from: number,
  to: number,
  fn: (k: number) => number
): number {
  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += fn(i);
  }
  return sum;
}

export function range(size: number, from = 0, step = 1): number[] {
  return [...Array(size)].map((_, i) => from + i * step);
}

export function segment(from = 0, to: number, step = 1): number[] {
  return [...Array((to - from) / step + 1)].map((_, i) => from + i * step);
}
