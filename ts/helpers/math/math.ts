namespace MATH {
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
}
