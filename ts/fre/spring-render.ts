namespace SPRING_RENDER {
  let balls: THREE.Mesh[] = [];
  let camera: THREE.PerspectiveCamera;
  let lines: THREE.Line[] = [];
  /** length is (number of the triangles * 3) ([x0,y0,z0, x1,y1,z1, ..., x0,y0,z0]) */
  let renderer: THREE.WebGLRenderer;
  let spring: SPRING.Spring;
  let scene: THREE.Scene;

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  function initCamera() {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / (window.innerHeight * 0.91),
      0.1,
      1000
    );
    camera.position.x = 0;
    camera.position.y = -50;
    camera.position.z = 5;
  }
  function initControls() {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", render);
  }
  function initLight() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    // scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xc0afff, 0.5);
    // scene.add(directionalLight);
    const hemisphereLight = new THREE.HemisphereLight(0x445fbb, 0x080820, 1);
    // scene.add(hemisphereLight);
    const pointLight = new THREE.PointLight(0xafcfef, 1, 10000);
    pointLight.position.set(50, 50, 50);
    // scene.add(pointLight);
    const rectLight = new THREE.RectAreaLight(0xffffff, 1, 10, 10);
    rectLight.position.set(100, 100, 100);
    rectLight.lookAt(0, 0, 0);
    // scene.add(rectLight);
    const spotLight = new THREE.SpotLight(0xaf9f8f);
    spotLight.position.set(100, 100, 100);
    spotLight.castShadow = true;
    scene.add(spotLight);
    const spotLight2 = new THREE.SpotLight(0xf0cfaf);
    spotLight2.position.set(-20, -10, -5);
    scene.add(spotLight2);
  }
  function addBall(x: number, y: number, z: number) {
    // ball
    const geometry = new THREE.SphereGeometry(1, 32, 16);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      specular: 0xbcbcbc,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    sphere.position.set(x, y, z);
    balls.push(sphere);
    scene.add(sphere);
  }
  function addGround() {
    const geometry = new THREE.PlaneGeometry(1000, 1000);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.receiveShadow = true;
    scene.add(ground);
  }
  function addLine(position1: Vec3, position2: Vec3) {
    //line
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
    });
    const points: THREE.Vector3[] = [];
    [position1, position2].forEach((position) =>
      points.push(new THREE.Vector3(...position))
    );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    lines.push(line);
    scene.add(line);
  }
  function initModel() {
    spring = new SPRING.Spring([0, 0, 0], [10, 0, 0], 12);
    addBall(...spring.origin);
    addBall(...spring.end);
    addGround();
    addLine(spring.origin, spring.end);
  }
  function initRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight * 0.91);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
  }
  function initScene() {
    scene = new THREE.Scene();
  }

  export function main() {
    if (THREE.WEBGL.isWebGLAvailable()) {
      initCamera();
      initRenderer();
      initScene();
      initLight();
      initModel();
      initControls();
      animate();
    } else
      document
        .getElementById("container")
        ?.appendChild(THREE.WEBGL.getWebGLErrorMessage());
  }

  function render() {
    spring.simulate();
    balls[0].position.set(...spring.origin);
    balls[1].position.set(...spring.end);
    lines[0].geometry.setFromPoints([balls[0].position, balls[1].position]);
    renderer.render(scene, camera);
  }
}
