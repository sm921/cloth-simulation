/// <reference path="../@types/index.d.ts" />
/// <reference path="../helpers/vector-helper.ts" />
/// <reference path="../@types/gpu.d.ts" />
/// <reference path="../@types/three.d.ts" />
/// <reference path="../helpers/gpu-helper.ts" />
/// <reference path="../helpers/three-helper.ts" />

// signed distance fields
namespace SDF {
  interface SDFData {
    grid: {
      AABB: {
        min: { x: number; y: number; z: number };
        max: { x: number; y: number; z: number };
      };
      count: { x: number; y: number; z: number };
      space: { x: number; y: number; z: number };
    };
    sdf: Vec4[][][]; // [signed distance_0, normal_0x, normal_0y, normal_0z, ..., signed distance_n, normal_nz, normal_ny, normal_nz]
  }

  export interface SDFModel extends SDFData {
    _sdf: (p: Vec3) => Vec4; // [sdf, nomarlx, normaly, normalz]
    forEach: (callback: (gridPoint: Vec3) => void) => void;
    saveAsJSON: () => string;
  }

  function crop(e: number, min: number, max: number) {
    return e < min ? min : e > max ? max : e;
  }

  const inv3 = 1 / 3;

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
    AABB: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    },
    positions: Float32Array,
    faceNormals: Float32Array,
    indexBuffer: Uint16Array,
    gridSpace: number,
    margin: number
  ): SDFModel {
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
    const gridSpaceX = lenX / (gridCountX - 1);
    const gridSpaceY = lenY / (gridCountY - 1);
    const gridSpaceZ = lenZ / (gridCountZ - 1);

    // 3 normals are available via three.js

    // 4. calculate the distance
    GPU_HELPER.gpu.addFunction(crop);
    const findMinDistance = GPU_HELPER.gpu.createKernel<
      number[][][][],
      {
        faceNormals: Float32Array;
        gridSpaceX: number;
        gridSpaceY: number;
        gridSpaceZ: number;
        indexBuffer: Float32Array;
        indexBufferLen: number;
        inv3: number;
        minx: number;
        miny: number;
        minz: number;
        positions: Float32Array;
      }
    >(
      function (grid: number[][][]) {
        const x =
          this.constants.minx + this.constants.gridSpaceX * this.thread.x;
        const y =
          this.constants.miny + this.constants.gridSpaceY * this.thread.y;
        const z =
          this.constants.minz + this.constants.gridSpaceZ * this.thread.z;
        const p: Vec3 = [x, y, z];

        let d = Infinity;
        let sdfNormal: Vec3 = [0, 0, 0];

        const indexBufferLen = this.constants.indexBufferLen;
        for (let i = 0; i < indexBufferLen; i += 3) {
          const faceNormalIndex = i;
          // get vertices
          const v0Index = this.constants.indexBuffer[i] * 3;
          const v0: Vec3 = [
            this.constants.positions[v0Index],
            this.constants.positions[v0Index + 1],
            this.constants.positions[v0Index + 2],
          ];
          const v1Index = this.constants.indexBuffer[i + 1] * 3;
          const v1: Vec3 = [
            this.constants.positions[v1Index],
            this.constants.positions[v1Index + 1],
            this.constants.positions[v1Index + 2],
          ];
          const v2Index = this.constants.indexBuffer[i + 2] * 3;
          const v2: Vec3 = [
            this.constants.positions[v2Index],
            this.constants.positions[v2Index + 1],
            this.constants.positions[v2Index + 2],
          ];
          // get normal of the triangle from 2 vectors that span the plane on which the triangle lies
          const v01 = subtract(v1, v0);
          const v02 = subtract(v2, v0);
          const n = cross(v01, v02);
          // project pv0 to n to get the shortest path to the plane
          const pv0 = subtract(v0, p);
          const dVec = project(pv0, n);
          // a point on the plane on which the triangle lies
          const q: Vec3 = add(p, dVec);
          // if the point is inside the triangle then calculate length
          /*
              If and only if all the normals are in the same direction with the n, q is inside the triangle
                  (q-v0)X(v2-v0) . n >= 0
                  (q-v1)X(v0-v1) . n  >= 0
                  (q-v2)X(v1-v2) . n  >= 0
             */
          const v10 = subtract(v0, v1);
          if (
            dot(cross(subtract(q, v0), v02), n) >= 0 &&
            dot(cross(subtract(q, v1), v10), n) >= 0 &&
            dot(cross(subtract(q, v2), subtract(v1, v2)), n) >= 0
          ) {
            // updateSDF
            const newD = len(dVec);
            if (newD < Math.abs(d)) {
              sdfNormal = normalize(dVec);
              // dot product is negative if dVec originates from outside of the surface, and viceversa
              const faceNormal: Vec3 = [
                this.constants.faceNormals[faceNormalIndex],
                this.constants.faceNormals[faceNormalIndex + 1],
                this.constants.faceNormals[faceNormalIndex + 2],
              ];
              //outside
              if (dot(faceNormal, sdfNormal) <= 0) d = newD;
              //inside
              else d = -newD;
            }
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
            const v0Pow2 = pow2(v0);
            const v1Pow2 = pow2(v1);
            const v2Pow2 = pow2(v2);
            const v20: Vec3 = subtract(v0, v2);
            const inv3 = this.constants.inv3;
            let dqds =
              (-inv3 * v0Pow2 +
                inv3 * v1Pow2 -
                inv3 * dot(v10, v2) +
                dot(v10, p)) *
              2;
            let dqdt =
              (-inv3 * v0Pow2 +
                inv3 * v2Pow2 -
                inv3 * dot(v20, v1) +
                dot(v20, p)) *
              2;
            const norm = Math.sqrt(dqds * dqds + dqdt * dqdt);
            dqds = dqds / norm;
            dqdt = dqdt / norm;
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
            const vertices = [v0, v1, v2];
            const largestVertex: Vec3 = [
              vertices[largestBarycentricParamIndex][0],
              vertices[largestBarycentricParamIndex][1],
              vertices[largestBarycentricParamIndex][2],
            ];
            const secondLargestVertex: Vec3 = [
              vertices[secondLargestBarycentricParamIndex][0],
              vertices[secondLargestBarycentricParamIndex][1],
              vertices[secondLargestBarycentricParamIndex][2],
            ];
            const q = add(
              scale(largestVertex, largestBarycentricParam),
              scale(secondLargestVertex, 1 - largestBarycentricParam)
            );
            // e. approximate d by |q - p|
            const dVec = subtract(q, p);
            const newD = len(dVec);
            if (newD < Math.abs(d)) {
              sdfNormal = normalize(dVec);
              // dot product is negative if dVec originates from outside of the surface, and viceversa
              const faceNormal: Vec3 = [
                this.constants.faceNormals[faceNormalIndex],
                this.constants.faceNormals[faceNormalIndex + 1],
                this.constants.faceNormals[faceNormalIndex + 2],
              ];
              //outside
              if (dot(faceNormal, sdfNormal) <= 0) d = newD;
              //inside
              else d = -newD;
            }
          }
        }
        return [d, sdfNormal[0], sdfNormal[1], sdfNormal[2]];
      },
      {
        output: [gridCountX, gridCountY, gridCountZ, 4],
        tactic: "speed",
        constants: {
          faceNormals,
          gridSpaceX,
          gridSpaceY,
          gridSpaceZ,
          indexBuffer,
          indexBufferLen: indexBuffer.length,
          inv3,
          minx,
          miny,
          minz,
          positions,
        },
      }
    );
    const sdf = findMinDistance(
      GPU.input(new Float32Array(gridCountX * gridCountY * gridCountZ), [
        gridCountX,
        gridCountY,
        gridCountZ,
      ])
    ) as Vec4[][][];

    return getModelFromData({
      grid: {
        AABB: {
          min: { x: minx, y: miny, z: minz },
          max: { x: maxx, y: maxy, z: maxz },
        },
        count: {
          x: gridCountX,
          y: gridCountY,
          z: gridCountZ,
        },
        space: {
          x: gridSpaceX,
          y: gridSpaceY,
          z: gridSpaceZ,
        },
      },
      sdf,
    });
  }

  function findMinDistanceCpu(
    indexBuffer: Uint16Array,
    faceNormals: Float32Array,
    gridCountX: number,
    gridCountY: number,
    gridCountZ: number,
    gridSpaceX: number,
    gridSpaceY: number,
    gridSpaceZ: number,
    minx: number,
    miny: number,
    minz: number,
    positions: Float32Array,
    totalGrid: number
  ): Float32Array {
    const sdf = new Float32Array(totalGrid);
    for (let xIndex = 0; xIndex < gridCountX; xIndex++) {
      const x = minx + gridSpaceX * xIndex;
      for (let yIndex = 0; yIndex < gridCountY; yIndex++) {
        const y = miny + gridSpaceY * yIndex;
        for (let zIndex = 0; zIndex < gridCountZ; zIndex++) {
          log(
            xIndex * gridCountY * gridCountZ + yIndex * gridCountZ + zIndex + 1,
            totalGrid
          );
          const z = minz + gridSpaceZ * zIndex;
          // p=(x,y,z), and solve d = ||nearest_point_on_triangle - p||
          const p: Vec3 = [x, y, z];

          let d = Infinity;
          let sdfNormal: Vec3 = [0, 0, 0];

          const updateSDF = (dVec: Vec3, faceNormalIndex: number) => {
            const newD = VEC.len(dVec);
            if (newD < Math.abs(d)) {
              sdfNormal = VEC.normalize(dVec);
              // dot product is negative if dVec originates from outside of the surface, and viceversa
              const faceNormal = [0, 1, 2].map(
                (axis) => faceNormals[faceNormalIndex + axis]
              ) as Vec3;
              const isOutside = VEC.dot(faceNormal, sdfNormal) <= 0;
              // here sign of the distance denotes which side of the surface the origin of dVec is located, inside or outside
              d = isOutside ? newD : -newD;
            }
          };

          for (let i = 0; i < indexBuffer.length; i += 3) {
            const faceNormalIndex = i;
            // get vertices
            const v0Index = indexBuffer[i] * 3;
            const v0: Vec3 = [
              positions[v0Index],
              positions[v0Index + 1],
              positions[v0Index + 2],
            ];
            const v1Index = indexBuffer[i + 1] * 3;
            const v1: Vec3 = [
              positions[v1Index],
              positions[v1Index + 1],
              positions[v1Index + 2],
            ];
            const v2Index = indexBuffer[i + 2] * 3;
            const v2: Vec3 = [
              positions[v2Index],
              positions[v2Index + 1],
              positions[v2Index + 2],
            ];
            // get normal of the triangle from 2 vectors that span the plane on which the triangle lies
            const v01 = VEC.subtract(v1, v0);
            const v02 = VEC.subtract(v2, v0);
            const n = VEC.cross(v01, v02);
            // project pv0 to n to get the shortest path to the plane
            const pv0 = VEC.subtract(v0, p);
            const dVec = VEC.project(pv0, n);
            // a point on the plane on which the triangle lies
            const q: Vec3 = VEC.add(p, dVec);
            // if the point is inside the triangle then calculate length
            /*
              If and only if all the normals are in the same direction with the n, q is inside the triangle
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
              updateSDF(dVec, faceNormalIndex);
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
                  [v0, v1, v2][largestBarycentricParamIndex],
                  largestBarycentricParam
                ),
                VEC.scale(
                  [v0, v1, v2][secondLargestBarycentricParamIndex],
                  1 - largestBarycentricParam
                )
              );
              // e. approximate d by |q - p|
              updateSDF(VEC.subtract(q, p), faceNormalIndex);
            }
          }

          const gridIndex =
            (xIndex * gridCountY * gridCountZ + yIndex * gridCountZ + zIndex) *
            4;
          sdf[gridIndex] = d;
          sdf[gridIndex + 1] = sdfNormal[0];
          sdf[gridIndex + 2] = sdfNormal[1];
          sdf[gridIndex + 3] = sdfNormal[2];
          const pd = VEC.add(
            p,
            VEC.scale([sdfNormal[0], sdfNormal[1], sdfNormal[2]], Math.abs(d))
          ); // because add the inside and outside d vectors direct to the nearest surface, not multiply sign
        }
      }
    }
    return sdf;
  }

  function getModelFromData(data: SDFData): SDFModel {
    const { AABB, count, space } = data.grid;
    const { min, max } = AABB;
    return {
      ...data,
      _sdf: (p: Vec3): Vec4 => {
        const [x, y, z] = p;
        if (
          (p[0] < min.x && p[1] < min.y && p[2] < min.z) ||
          (p[0] > max.x && p[1] > max.y && p[2] > max.z)
        )
          return [Infinity, 0, 0, 0];
        const xIndex = Math.round((x - min.x) / space.x);
        const yIndex = Math.round((y - min.y) / space.y);
        const zIndex = Math.round((z - min.z) / space.z);
        return data.sdf[zIndex][yIndex][xIndex];
      },
      forEach: (callback: (gridPoint: Vec3) => void): void => {
        for (let xIndex = 0; xIndex < count.x; xIndex++) {
          const x = min.x + space.x * xIndex;
          for (let yIndex = 0; yIndex < count.y; yIndex++) {
            const y = min.y + space.y * yIndex;
            for (let zIndex = 0; zIndex < count.z; zIndex++) {
              const z = min.z + space.z * zIndex;
              callback([x, y, z]);
            }
          }
        }
      },
      saveAsJSON: (): string => {
        return JSON.stringify(data);
      },
    };
  }

  function log(progress: number, totalGrid: number) {
    console.log(
      `progress ${progress}/${totalGrid} (${parseInt(
        String((progress++ / totalGrid) * 100)
      )}%)`
    );
  }

  /** restore SDF model from JSON */
  export function restoreFromJSON(json: string): SDFModel {
    const obj: SDFData = JSON.parse(json);
    return getModelFromData(obj);
  }
}
