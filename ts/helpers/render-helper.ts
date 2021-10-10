import {
  AmbientLight,
  BufferGeometry,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Object3D,
  ParametricGeometry,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RectAreaLight,
  Scene,
  SphereGeometry,
  SpotLight,
  Vector3,
  WebGLRenderer,
} from "three";
import { Vec3 } from "./math/vector";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { WEBGL } from "three/examples/jsm/WebGL";

let camera: PerspectiveCamera;
/** length is (number of the triangles * 3) ([x0,y0,z0, x1,y1,z1, ..., x0,y0,z0]) */
let renderer: WebGLRenderer;
let simulate: (() => void) | undefined;
let scene: Scene;

function animate() {
  simulate?.();
  requestAnimationFrame(animate);
  drawFrame();
}

export function clear<T extends Object3D>(meshes: T[]) {
  meshes.forEach((mesh) => mesh.clear());
  scene.remove(...meshes);
  meshes.length = 0; // make meshes empty
}

function initCamera(params: { position?: Vec3; lookAt?: Vec3 } = {}) {
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / (window.innerHeight * 0.91),
    0.1,
    1000
  );
  if (params.position !== undefined) {
    camera.position.x = params.position[0];
    camera.position.y = params.position[1];
    camera.position.z = params.position[2];
  }
  if (params.lookAt !== undefined) camera.lookAt(...params.lookAt);
}
function initControls() {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", drawFrame);
}
function initLight() {
  const ambientLight = new AmbientLight(0x404040);
  scene.add(ambientLight);
  // const directionalLight = new DirectionalLight(0xc0afff, 0.5);
  // scene.add(directionalLight);
  // const hemisphereLight = new HemisphereLight(0x445fbb, 0x080820, 1);
  // scene.add(hemisphereLight);
  const pointLight = new PointLight(0xafcfef, 1, 10000);
  pointLight.position.set(50, -50, 50);
  // scene.add(pointLight);
  const rectLight = new RectAreaLight(0xffffff, 1, 10, 10);
  rectLight.position.set(100, -100, 100);
  rectLight.lookAt(0, 0, 0);
  // scene.add(rectLight);
  const spotLight = new SpotLight(0xaf9f8f);
  spotLight.position.set(100, -100, 100);
  spotLight.castShadow = true;
  scene.add(spotLight);
  const spotLight2 = new SpotLight(0xf0cfaf);
  spotLight2.position.set(-20, -10, -5);
  scene.add(spotLight2);
}
export function addBall(
  x: number,
  y: number,
  z: number,
  color = 0xffff00
): Mesh {
  // ball
  const geometry = new SphereGeometry(1, 32, 16);
  const material = new MeshPhongMaterial({
    color,
    specular: 0xbcbcbc,
  });
  const sphere = new Mesh(geometry, material);
  sphere.castShadow = true;
  sphere.position.set(x, y, z);
  scene.add(sphere);
  return sphere;
}
export function addPlane(
  width: number,
  height: number,
  options: { color?: number; position?: Vec3 } = {}
): void {
  const geometry = new PlaneGeometry(width, height);
  const material = new MeshPhongMaterial({
    color: options.color ?? 0xffff00,
    side: DoubleSide,
  });
  const plane = new Mesh(geometry, material);
  plane.position.set(...(options.position ?? [0, 0, 0]));
  plane.receiveShadow = true;
  scene.add(plane);
}
export function addLine(position1: Vec3, position2: Vec3): Line {
  //line
  const material = new LineBasicMaterial({
    color: 0x00ffff,
  });
  const points: Vector3[] = [];
  [position1, position2].forEach((position) =>
    points.push(new Vector3(...position))
  );
  const geometry = new BufferGeometry().setFromPoints(points);
  const line = new Line(geometry, material);
  scene.add(line);
  return line;
}
export function addParametrixSurface(
  expression: (u: number, v: number, dest: Vector3) => void
): void {
  const geometry = new ParametricGeometry(expression, 250, 25);
  const material = new MeshBasicMaterial({ color: 0x00ff00 });
  const surface = new Mesh(geometry, material);
  scene.add(surface);
}
function initRenderer() {
  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight * 0.91);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
}
function initScene() {
  scene = new Scene();
}

/**
 *
 * @param _simulate update positions
 * @param initModel add objects to the scene using RENDER_HELPER.addBall, addLine, and addGround
 */
export function renderHelper(params: {
  cameraParams?: { position?: Vec3; lookAt?: Vec3 };
  initModel?: () => void;
  simulate?: () => void;
}) {
  if (WEBGL.isWebGLAvailable()) {
    initCamera(params.cameraParams);
    initRenderer();
    initScene();
    initLight();
    params.initModel?.();
    initControls();
    simulate = params.simulate;
    animate();
  } else
    document
      .getElementById("container")
      ?.appendChild(WEBGL.getWebGLErrorMessage());
}

function drawFrame() {
  renderer.render(scene, camera);
}
