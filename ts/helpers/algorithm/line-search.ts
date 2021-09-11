/**
 * calculate optimal stepsize of line search of any multivariable functions
 */
namespace LINE_SEARCH {
  /**
   * derivative of objective function of line search
   * f: Rn -> R
   * df(x + stepsize * search_direction)/dx = scalar
   */
  type dFdX = (stepsize: number) => number;

  /**
   * objective function of line search
   * f: Rn -> R
   * f(x + stepsize * search_direction) = scalar
   */
  type F = (stepsize: number) => number;

  /**
   * find optimal stepsize of line search that satisfies strong wolf conditions
   *
   * see https://www.csie.ntu.edu.tw/~r97002/temp/num_optimization.pdf Algorithm 3.5 and 3.6 for detail
   * @param upperbound
   * @param f objective function of line search
   * ```
   * // e.g. to find stepsize = argmin E(xk + stepsize * u)
   * // where E(x) = hx + k||x-a||
   * (stepsize: number) => h(xk+stepsize*u) + k||xk+stepsize*u||
   * ```
   * @param dfdx derivative of objective function
   * (directional derivative if f is vector valued function,
   * i.e. dfdx = ▽f(x)^t . u (= scalar)
   *
   * here, '.' denotes dot product and 'u' is vector of search direction
   * ```
   * // e.g. to find stepsize = argmin E(xk + stepsize * u)
   * // where dE(x)/dx = h + k(x-a)/||x-a||
   * (stepsize: number) => h + k(xk+stepsize*u)/||xk+stepsize*u|| . u
   * // here . denotes dot product
   * ```
   * @param c1 parameter of 1st wolf condition that eliminates too large stepsize
   *    and make sure that f decreases well as stepsize gets grater.
   *    0 < c1 < 0.5 (the larger the grater the effect becomes)
   * @param c2 parameter of 2nd wolf condition that eliminates too small stepsize
   *    and make sure that derivative converges to 0.
   *    0.5 < c2 < 1 (the smaller the stronger the effect becomes)
   * @returns
   */
  export function findStepsizeByWolfConditions(
    f: F,
    dfdx: dFdX,
    upperbound = 1e9,
    c1 = 1e-1,
    c2 = 0.9
  ): number {
    let stepsize = interpolateStepsizeQuodratic(0, upperbound, f, dfdx);
    let previousStepsize = stepsize;
    let i = 1;
    const f0 = f(0);
    const dfdxAt0 = dfdx(0);
    while (true) {
      // case 1/3. stepsize is outside of upperbound, hence invalid
      if (
        !satisfiesWolfCondition1(
          c1,
          stepsize,
          f(stepsize),
          f0,
          dfdxAt0,
          i > 1 ? f(previousStepsize) : undefined
        )
      )
        return findStepsizeByWolfConditionsBetween(
          previousStepsize,
          stepsize,
          f,
          dfdx,
          c1,
          c2,
          f0,
          dfdxAt0
        );
      const dfdxAtStepsize = dfdx(stepsize);
      // case 2/3. stepsize is inside upperbound and lowerbound, hence valid
      if (satisfiesWolfCondition2(c2, dfdxAtStepsize, dfdxAt0)) return stepsize;
      // case 3/3. i don't know why and when thw following case occurs but specified in https://www.csie.ntu.edu.tw/~r97002/temp/num_optimization.pdf p.60 Algorithm 3.5
      if (dfdxAtStepsize >= 0)
        return findStepsizeByWolfConditionsBetween(
          stepsize,
          previousStepsize,
          f,
          dfdx,
          c1,
          c2,
          f0,
          dfdxAt0
        );
      previousStepsize = stepsize;
      stepsize = interpolateStepsizeQuodratic(stepsize, upperbound, f, dfdx);
      i++;
    }
  }

  /**
   * find an optimal stepsize inside an interval
   * that satisfies wolf conditions
   * @param lowerbound of stepsize
   * @param upperbound of stepsize
   * @param f objective function
   * @param dfdx derivative of objective function
   * @param c1 parameter of 1st wolf cond
   * @param c2 param of 2nd wold cond
   * @param f0 value of objective fuction at stepsize = 0
   * @param dfdxAt0 value of derivative of objective function at stepsize = 0
   * @returns
   */
  function findStepsizeByWolfConditionsBetween(
    lowerbound: number,
    upperbound: number,
    f: F,
    dfdx: dFdX,
    c1: number,
    c2: number,
    f0: number,
    dfdxAt0: number
  ): number {
    while (true) {
      const stepsize = interpolateStepsizeQuodratic(
        lowerbound,
        upperbound,
        f,
        dfdx
      );
      // stepsize is outside upperbound, hence invalide
      if (!satisfiesWolfCondition1(c1, stepsize, f(stepsize), f0, dfdxAt0))
        upperbound = stepsize;
      // stepside is inside upperbound, hence valid
      else {
        const dfdxAtStepsize = dfdx(stepsize);
        // stepside is inside lowerbound, hence valide
        if (satisfiesWolfCondition2(c2, dfdxAtStepsize, dfdxAt0))
          return stepsize;
        // stepsize is outside lowerbound, hence invalid
        else {
          // if f is not descent, then swap bounds to make it descent
          if (dfdxAtStepsize * (upperbound - lowerbound) >= 0)
            upperbound = lowerbound;
          lowerbound = stepsize;
        }
      }
    }
  }

  /**
   * interpolate stepsize of line search between lowerbound and upperbound
   * by taking stationary point of quodratic curve
   * that passs through known 2 points at lowerbound and upperbound
   * and has known tangent at lowerbound
   * @param lowerbound of stepsize
   * @param upperbound of stepsize
   * @param f objective function
   * @param dfdx derivative of objective function
   * @returns
   */
  function interpolateStepsizeQuodratic(
    lowerbound = 0,
    upperbound: number,
    f: F,
    dfdx: dFdX
  ): number {
    /*
        see https://www.csie.ntu.edu.tw/~r97002/temp/num_optimization.pdf p.58
        or search quodratic interpolation of line search for detail
            quodratic curve = (f(upperbound)-f(lowerbound)-upperbound*dfdx(lowerbound) / upperbound^2)*alpha^2 + dfdx*alpha + f(lowerbound) 
            hence,
                argmin_alpha of quodratic curve
                    = - dfdx(lowerbound) * upperbound^2 / 2 { f(upperbound)-f(lowerbound)-dfdx(lowerbound)*upperbound }
        */
    return (
      (-dfdx(lowerbound) * upperbound * upperbound) /
      (2 * (f(upperbound) - f(lowerbound) - dfdx(lowerbound) * upperbound))
    );
  }

  /**
   * check whether objective function satisfies the 1st wolf condition
   *
   * i.e. sufficient decrease condition
   *
   * @param c1 parameter of wolf condition (0 < c1 < 0.5). greater the narrower interval in which the stepsize is allowed to take value
   * @param stepsize
   * @param fAtStepsize value of objective function. f(xk + stepsize * search_direction)
   * @param f0 value of objective function. f(xk)
   * @param dfdxAt0 value of derivative of objective function. dfdx(xk)
   * @param fAtPreviousStepsize value of objective function. f(xk + stepsize_previous * search_direction)
   * @returns
   */
  function satisfiesWolfCondition1(
    c1: number,
    stepsize: number,
    fAtStepsize: number,
    f0: number,
    dfdxAt0: number,
    fAtPreviousStepsize?: number
  ): boolean {
    return (
      fAtStepsize > f0 + c1 * stepsize * dfdxAt0 ||
      (fAtPreviousStepsize !== undefined && fAtStepsize >= fAtPreviousStepsize)
    );
  }

  /**
   * check whether objective function satisfies the 2nd wolf condition
   *
   * i.e. choose stepsize such that derivative of objective function gets smaller
   * @param c2 parameter of wolf condition (0.5 < c2 < 1) smaller the narrower interval in which the stepsize is allowerd to take value in
   * @param dfdxAtStepsize derivative of objective function at x = xk + stepsize * search_direction
   * @param dfdxAt0 derivative of objective function at x = xk
   * @returns
   */
  function satisfiesWolfCondition2(
    c2: number,
    dfdxAtStepsize: number,
    dfdxAt0: number
  ): boolean {
    // |dfdx(a)| / |dfdx(0)| <= c2 (< 1)
    // it says that 'a' is updated such that dfdx converges to zero at local minimum
    // note that dfdx(0) is negative with descent algorithm, thus follows
    return Math.abs(dfdxAtStepsize) <= -c2 * dfdxAt0;
  }
}
