// signed distance fields
namespace SDF {
  const crop = (e: number, min: number, max: number) =>
    e < min ? min : e > max ? max : e;
  const debug = false;

  const inv3 = 1 / 3;

  let totalGrid = 0;

  /**
   * 1. calculate AABB of all the triangles
   * 2. create grids based on the AABB
   * 3. calculate normals of all the triangles
   * 4. calculate the shortest distances from all the grids to the nearest triangle
   * 5. save the distances (if inside positive, if outside negative, else 0) in flat array
   * @param AABB axis aligned bounding box
   * @param triangles flat array of positions (e.g. [x0,y0,z0,x1,y1,z1,...] ) where every 9 elements denotes the 3 vertices of a triangle
   * @param faceNormals face normals for each triangle (availabel via THREE.js geometry.faces[i].normal)
   * @param gridSpace the length of each grid
   * @param margin the margin betweewn 6 sides of grids and AABB
   *
   */
  export function createSDF(
    scene: THREE.Scene,
    AABB: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    },
    positions: Float32Array,
    faceNormals: Float32Array,
    indexBuffer: Uint16Array,
    gridSpace: number,
    margin: number
  ): {
    gridSpace: number;
    gridCountX: number;
    gridCountY: number;
    gridCountZ: number;
    sdf: Float32Array; // [signed distance_0, normal_0x, normal_0y, normal_0z, ..., signed distance_n, normal_nz, normal_ny, normal_nz]
  } {
    // 1. AABB is available via Three.js
    let minx = AABB.min.x - margin / 2;
    let miny = AABB.min.y - margin / 2;
    let minz = AABB.min.z - margin / 2;
    let maxx = AABB.max.x + margin / 2;
    let maxy = AABB.max.y + margin / 2;
    let maxz = AABB.max.z + margin / 2;

    // 2. gird to store SDF
    const lenX = Math.abs(maxx - minx);
    const lenY = Math.abs(maxy - miny);
    const lenZ = Math.abs(maxz - minz);
    const [gridCountX, gridCountY, gridCountZ] = [lenX, lenY, lenZ].map(
      (len) => Math.ceil(len / gridSpace) + 1
    );
    /** [signed distance, normal_x, normal_y, normal_z] */
    totalGrid = gridCountX * gridCountY * gridCountZ;
    const sdf = new Float32Array(totalGrid * 4);
    const gridSpaceX = lenX / (gridCountX - 1);
    const gridSpaceY = lenY / (gridCountY - 1);
    const gridSpaceZ = lenZ / (gridCountZ - 1);

    // 3 normals are available via three.js

    // 4. calculate the distance
    for (let xIndex = 0; xIndex < gridCountX; xIndex++) {
      const x = minx + gridSpaceX * xIndex;
      for (let yIndex = 0; yIndex < gridCountY; yIndex++) {
        const y = miny + gridSpaceY * yIndex;
        for (let zIndex = 0; zIndex < gridCountZ; zIndex++) {
          log(
            xIndex * gridCountY * gridCountZ + yIndex * gridCountZ + zIndex + 1
          );
          const z = minz + gridSpaceZ * zIndex;
          // p=(x,y,z), and solve d = ||nearest_point_on_triangle - p||
          const p: Vec3 = [x, y, z];
          const color = THREE_HELPER.sphere(scene, p, 0.02);
          let d = Infinity;
          let normal: Vec3 = [0, 0, 0];
          let nearestV0: Vec3 = [0, 0, 0];
          let nearestV1: Vec3 = [0, 0, 0];
          let nearestV2: Vec3 = [0, 0, 0];
          const updateSDF = (
            dVec: Vec3,
            faceNormalIndex: number,
            v0: Vec3,
            v1: Vec3,
            v2: Vec3
          ) => {
            const newD = VEC.len(dVec);
            if (newD < Math.abs(d)) {
              normal = VEC.normalize(dVec);
              [nearestV0, nearestV1, nearestV2] = [v0, v1, v2];
              // dot product is negative if dVec originates from outside of the surface, and viceversa
              const faceNormal = [0, 1, 2].map(
                (axis) => faceNormals[faceNormalIndex + axis]
              ) as Vec3;
              const isOutside = VEC.dot(faceNormal, normal) <= 0;
              // here sign of the distance denotes which side of the surface the origin of dVec is located, inside or outside
              d = isOutside ? newD : -newD;
            }
          };
          FACE_HANDLER.forEachTriangle(
            positions,
            indexBuffer,
            (positions, i) => {
              if (debug)
                // if (i > 10 || xIndex > 0 || yIndex > 0 || zIndex > 0)
                // if (i > 0 || xIndex > 0 || yIndex > 0 || zIndex > 0)
                // if (i != 7431 || xIndex != 0 || yIndex != 1 || zIndex != 0)
                return;
              const faceNormalIndex = i;
              const [v0, v1, v2] = positions;
              // get normal of the triangle from 2 vectors that span the plane on which the triangle lies
              const v01 = VEC.subtract(v1, v0);
              const v02 = VEC.subtract(v2, v0);
              const n = VEC.cross(v01, v02);
              debug && THREE_HELPER.line(scene, [...v0, ...VEC.add(v0, v01)]);
              debug && THREE_HELPER.line(scene, [...v0, ...VEC.add(v0, v02)]);
              // debug && THREE_HELPER.line(scene, [...v0, ...VEC.add(v0, n)]);
              // project pv0 to n to get the shortest path to the plane
              const pv0 = VEC.subtract(v0, p);
              // debug && THREE_HELPER.line(scene, [...p, ...VEC.add(p, pv0)]);
              const dVec = VEC.project(pv0, n);
              // debug && THREE_HELPER.line(scene, [...p, ...VEC.add(p, dVec)]);
              // a point on the plane on which the triangle lies
              const q: Vec3 = VEC.add(p, dVec);
              // debug && THREE_HELPER.sphere(scene, q, 0.02);
              // if the point is inside the triangle then calculate length
              /*
              Algorithm to detect if a point is located inside or outside of a triangle
              If and only if all the normals are in the same direction with the n, q is inside the triangle
              because cross products reflect directions (as zaxis = xaxis X yaxis)
                  (q-v0)X(v2-v0) . n >= 0
                  (q-v1)X(v0-v1) . n  >= 0
                  (q-v2)X(v1-v2) . n  >= 0
             */
              const v10 = VEC.subtract(v0, v1);
              if (
                VEC.dot(VEC.cross(VEC.subtract(q, v0), v02), n) >= 0 &&
                VEC.dot(VEC.cross(VEC.subtract(q, v1), v10), n) >= 0 &&
                VEC.dot(
                  VEC.cross(VEC.subtract(q, v2), VEC.subtract(v1, v2)),
                  n
                ) >= 0
              ) {
                updateSDF(dVec, faceNormalIndex, v0, v1, v2);
              } else {
                // else search nearest by gradient discent (because distance function is convex, able to solve it in 1 step)
                /*
                  Algorithm
                  ```
                      a. Let q(s,t) be a point on the triangle in barycentric coordinates
                          that is,
                              q(s,t) = (1-s-t)*v0 + s*v1 + t*v2  (s,t>=0, s+t<=1)
                          then, distance d(s,t) is given by (s,t) such that
                              argmin d(s,t)^2 = ((1-s-t)v0 + sv1 + tv2 - p)^2  (p is a point of the grid i.e. (x,y,z) in above code)
                                              = (1-s-t)^2|v0|^2 + s^2|v1|^2 + t^2|v2|^2 + |p|^2 
                                                  + 2(1-s-t)s v0.v1 + 2(1-s-t)t v0.v2 - 2(1-s-t) v0.p + 2st v1.v2 -2s v1.p - 2t v2.p
                      b. calculate gradient (ds,dt) of d(s,t)^2 at (s,t)=(1/3,1/3) (at centroid)
                          d(s,t)^2/ds = { -(1-s-t)|v0|^2 + s|v1|^2 + (1-2s-t) v0.v1 + -t (v0-v1).v2 + (v0-v1).p } * 2
                          d(s,t)^2/dt = { -(1-s-t)|v0|^2 + t|v2|^2 + (1-s-2t) v0.v2 + -s (v0-v2).v1 + (v0-v2).p } * 2
                          hence, 
                            d(1/3, 1/3)^2/ds = { -1/3|v0|^2 + 1/3|v1|^2 -1/3(v0-v1).v2 + (v0-v1).p } * 2
                            d(1/3, 1/3)^2/dt = { -1/3|v0|^2 + 1/3|v2|^2 -1/3(v0-v2).v1 + (v0-v2).p } * 2
                      c. update q by q(s+ds, t+dt)
                      d. comparing barycentric parameters, find the nearest point directely
                          if s = 0.7, t = 0.2, then edge from v1 to v2 is the nearest
                            hence, nearest point is in a form of q(s,t) = 0*v0 + s*v1 + t*v2
                            and instead of finding the solution by iteration, approximate the nearest point by
                              q = s*v1 + (1-s)*v2
                      e. d = |q - p| is the distance
                  ```
              */
                // a. define p(s,t) and d(s,t) as above. no code
                // b. calculate gradient at (s,t)=(1/3, 1/3) as above
                const v0Pow2 = VEC.pow2(v0);
                const v1Pow2 = VEC.pow2(v1);
                const v2Pow2 = VEC.pow2(v2);
                const v20: Vec3 = VEC.subtract(v0, v2);
                let dqds =
                  (-inv3 * v0Pow2 +
                    inv3 * v1Pow2 -
                    inv3 * VEC.dot(v10, v2) +
                    VEC.dot(v10, p)) *
                  2;
                let dqdt =
                  (-inv3 * v0Pow2 +
                    inv3 * v2Pow2 -
                    inv3 * VEC.dot(v20, v1) +
                    VEC.dot(v20, p)) *
                  2;
                const norm = Math.sqrt(dqds * dqds + dqdt * dqdt);
                dqds = dqds / norm;
                dqdt = dqdt / norm;
                if (dqds < 0) {
                }
                // c. upate q by gradient discent (q = q -(dqds, dqdt))
                // q(s,t) = (1-s-t)*v0 + s*v1 + t*v2  (s,t>=0, s+t<=1)
                const s = crop(inv3 - dqds, 0, 1);
                const t = crop(inv3 - dqdt, 0, 1);

                // d. find the nearest point by comparing the s,t,u
                const barycentricParams = [1 - s - t, s, t];
                let largestBarycentricParamIndex = 0;
                let secondLargestBarycentricParamIndex = 1;
                let largestBarycentricParam =
                  barycentricParams[largestBarycentricParamIndex];
                let secondLargestBarycentricParam =
                  barycentricParams[secondLargestBarycentricParamIndex];
                for (let vi = 1; vi < 3; vi++) {
                  if (barycentricParams[vi] > largestBarycentricParam) {
                    secondLargestBarycentricParamIndex =
                      largestBarycentricParamIndex;
                    secondLargestBarycentricParam = largestBarycentricParam;
                    largestBarycentricParam = barycentricParams[vi];
                    largestBarycentricParamIndex = vi;
                  } else if (
                    barycentricParams[vi] > secondLargestBarycentricParam
                  ) {
                    secondLargestBarycentricParamIndex = vi;
                    secondLargestBarycentricParam = barycentricParams[vi];
                  }
                }
                // ignore the smallest param and use only 2 largest params
                const q = VEC.add(
                  VEC.scale(
                    positions[largestBarycentricParamIndex],
                    largestBarycentricParam
                  ),
                  VEC.scale(
                    positions[secondLargestBarycentricParamIndex],
                    1 - largestBarycentricParam
                  )
                );
                debug && THREE_HELPER.sphere(scene, q, 0.01);
                // e. approximate d by |q - p|
                debug &&
                  THREE_HELPER.line(scene, [
                    ...p,
                    ...VEC.add(p, VEC.subtract(q, p)),
                  ]);
                updateSDF(VEC.subtract(q, p), faceNormalIndex, v0, v1, v2);
              }
            }
          );
          const gridIndex =
            (xIndex * gridCountY * gridCountZ + yIndex * gridCountZ + zIndex) *
            4;
          sdf[gridIndex] = d;
          sdf[gridIndex + 1] = normal[0];
          sdf[gridIndex + 2] = normal[1];
          sdf[gridIndex + 3] = normal[2];
          const pd = VEC.add(p, VEC.scale(normal, Math.abs(d))); // because add the inside and outside d vectors direct to the nearest surface, not multiply sign
          if (!debug) {
            THREE_HELPER.triangle(
              scene,
              [...nearestV0, ...nearestV1, ...nearestV2],
              THREE_HELPER.line(scene, [...p, ...pd], color)
            );
          }
        }
      }
    }

    const result = {
      gridSpace,
      gridCountX,
      gridCountY,
      gridCountZ,
      sdf,
    };
    console.log(JSON.stringify(result));
    return result;
  }

  function log(progress: number) {
    console.log(
      `progress ${progress}/${totalGrid} (${parseInt(
        String((progress++ / totalGrid) * 100)
      )}%)`
    );
  }
}
