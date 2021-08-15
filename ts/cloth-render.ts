namespace CLOTH_RENDER {
  if (!THREE.WEBGL.isWebGLAvailable())
    document.body.appendChild(THREE.WEBGL.getWebGLErrorMessage());

  var container;
  var controls: THREE.TrackballControls;
  var camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer;

  var clothGeometry: THREE.BufferGeometry;

  var table;
  var boundingBox;
  var clothMesh: THREE.Mesh;

  var clothMaterial: THREE.MeshPhongMaterial;
  initGUI(restartCloth);
  CLOTH_MODEL.initCloth();
  initRenderer();
  animate();

  function initRenderer() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 0.1, 0);

    camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      1,
      1e9
    );
    camera.position.y = 450;
    camera.position.z = 1500;

    renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color);
    container.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;

    controls = new THREE.TrackballControls(camera, renderer.domElement);

    var light;
    scene.add(new THREE.AmbientLight(0xffffff));
    light = new THREE.DirectionalLight(0xffffff, 1.75);
    light.position.set(50, 200, 100);
    light.position.multiplyScalar(1.3);
    light.castShadow = true;
    light.shadow.bias = -0.0001;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    var d = 300;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.far = 1000;
    scene.add(light);

    var loader = new THREE.TextureLoader();
    const img = "fab1.jpg";
    var clothTexture = loader.load(`images/${img}`);
    clothTexture.wrapS = clothTexture.wrapT = THREE.RepeatWrapping;
    clothTexture.anisotropy = 16;
    clothTexture.repeat.set(3, 3);

    clothMaterial = new THREE.MeshPhongMaterial({
      color: 0x919191,
      specular: 0x030303,
      wireframe: true,
      wireframeLinewidth: 2,
      map: clothTexture,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });

    clothGeometry = new THREE.BufferGeometry();
    clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
    clothMesh.position.set(0, 0, 0);
    clothMesh.castShadow = true;
    clothMesh.receiveShadow = true;
    scene.add(clothMesh);

    var boxGeo = new THREE.BoxGeometry(250, 100, 250);
    table = new THREE.Mesh(
      boxGeo,
      new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.11,
      })
    );
    table.position.x = 0;
    table.position.y = 0;
    table.position.z = 0;
    table.receiveShadow = true;
    table.castShadow = true;
    scene.add(table);
    boxGeo.computeBoundingBox();
    boundingBox = table.geometry.boundingBox?.clone();
    window.addEventListener("resize", onWindowResize, false);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  let lastTime: number;
  function animate() {
    requestAnimationFrame(animate);
    if (!lastTime) return (lastTime = Date.now());
    const time = Date.now();
    CLOTH_MODEL.cloth2.animate_i_aaa3i((time - lastTime) / 1000);
    render();
    controls.update();
  }

  function restartCloth() {
    scene.remove(clothMesh);
    CLOTH_MODEL.initCloth();
    clothGeometry = new THREE.BufferGeometry();
    clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
    clothMesh.position.set(0, 0, 0);
    clothMesh.castShadow = true;
    scene.add(clothMesh);
  }

  function render() {
    const positions = CLOTH_MODEL.cloth2.particles_aaa3i.flat();
    clothGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions.flat()), 3)
    );
    clothGeometry.computeVertexNormals();
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }
}
