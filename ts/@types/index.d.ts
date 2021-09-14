/** (x,y) */
type Vec2 = [number, number];
/** (x,y,z) */
type Vec3 = [number, number, number];
/** (x,y,z,w) */
type Vec4 = [number, number, number, number];

// for detector-js
namespace Detector {
  let webgl: boolean;
  const addGetWebGLMessage: Function;
}

function clothInitialPosition(_x: number, _y: number, _z: THREE.Vector3): void;
