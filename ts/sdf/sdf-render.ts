namespace SDF_RENDER {
  main();

  let camera: THREE.PerspectiveCamera;
  /** length is (number of the triangles * 3) ([x0,y0,z0, x1,y1,z1, ..., x0,y0,z0]) */
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  function initCamera() {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.x = 13;
    camera.position.y = 22;
    camera.position.z = 23;
  }
  function initControls() {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", render);
  }
  function initLight() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(directionalLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(hemisphereLight);
    const pointLight = new THREE.PointLight(0xffffff, 1, 10000);
    pointLight.position.set(50, 50, 50);
    const rectLight = new THREE.RectAreaLight(0xffffff, 1, 10, 10);
    rectLight.position.set(5, 5, 0);
    rectLight.lookAt(0, 0, 0);
    scene.add(rectLight);
    const spotLight = new THREE.SpotLight(0xffffff);
    scene.add(spotLight);
  }
  async function initModel() {
    const gltf = await FACE_HANDLER.loadGLTF("/assets/body2.gltf");
    const faceNormals = FACE_HANDLER.calculateFaceNormals(
      gltf.normals,
      gltf.indexBuffer
    );
    document.body.querySelector("#run")?.addEventListener("click", (e) => {
      const sdf = SDF.createSDF(
        gltf.boundingBox,
        gltf.positions,
        faceNormals,
        gltf.indexBuffer,
        0.1,
        1
      );
      const savebtn: HTMLButtonElement | null =
        document.body.querySelector("#save");
      if (savebtn) {
        savebtn.style.display = "block";
        savebtn.addEventListener("click", () => {
          const blob = new Blob([sdf.saveAsJSON()], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.download = "sdf.json";
          a.href = url;
          a.click();
          a.remove();
        });
      }
      sdf.forEach((p) => {
        // const color = THREE_HELPER.sphere(scene, p);
        const [d, nx, ny, nz] = sdf._sdf(p);
        THREE_HELPER.line(
          scene,
          [...p, ...VEC.add(p, VEC.scale([nx, ny, nz], Math.abs(d)))]
          // color
        );
      });
    });
    new THREE.GLTFLoader().load("/assets/body2.gltf", (gltf) => {
      scene.add(gltf.scene);
    });
  }
  function initRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
  }
  function initScene() {
    scene = new THREE.Scene();
  }

  function main() {
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
    renderer.render(scene, camera);
  }
}
