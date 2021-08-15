// override namespace of THREE to use custom modules

// use default modules
export * from "three/src/Three";

// add custom modules
/*
  note that only declarations are imported by the following lines
  must add script tag to import real codes to html file like <script src="https://some-CDV/.../module-name"></script>
*/
export * from "three/examples/jsm/controls/OrbitControls";
export * from "three/examples/jsm/controls/TrackballControls";
export * from "three/examples/jsm/controls/TransformControls";
export * from "three/examples/jsm/helpers/VertexNormalsHelper";
export * from "three/examples/jsm/lights/LightProbeGenerator";
export * from "three/examples/jsm/loaders/GLTFLoader";
export * from "three/examples/jsm/loaders/OBJLoader";
export * from "three/examples/jsm/WEBGL";

// use all the above modules as THREE.module
export as namespace THREE;
