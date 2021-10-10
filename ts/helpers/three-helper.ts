import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshBasicMaterialParameters,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { Vec3 } from "./math/vector";

const pastelColors = [0xf4ccdb, 0xccf5e2, 0xe4c3f4, 0xf4f59b, 0xd3d3f5];

export function geometry(vertices: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(vertices), 3)
  );
  return geometry;
}

export function line(scene: Scene, vertices: number[], color?: number): number {
  const _color = color ?? randomPastelColor();
  const points = [];
  for (let i = 0; i < vertices.length; i += 3)
    points.push(new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
  const geometry = new BufferGeometry().setFromPoints(points);
  const line = new Line(geometry, new LineBasicMaterial({ color: _color }));
  scene.add(line);
  return _color;
}

function mesh(
  scene: Scene,
  vertices: number[],
  Material: new (params?: MeshBasicMaterialParameters) => Material,
  color?: number
): number {
  const _color = color ?? randomPastelColor();
  scene.add(
    new Mesh(
      geometry(vertices),
      new Material({
        color: _color,
      })
    )
  );
  return _color;
}

export function triangle(
  scene: Scene,
  vertices: number[],
  color?: number
): number {
  return mesh(scene, vertices, MeshBasicMaterial, color);
}

export function randomPastelColor() {
  return pastelColors[
    Math.min(
      Math.floor(Math.random() * pastelColors.length),
      pastelColors.length - 1
    )
  ];
}

export function sphere(scene: Scene, pos: Vec3, r = 0.1, color?: number) {
  const _color = color ?? randomPastelColor();
  const geometry = new SphereGeometry(r, 18, 9);
  const material = new MeshBasicMaterial({
    color: _color,
  });
  const sphere = new Mesh(geometry, material);
  sphere.position.add(new Vector3(...pos));
  scene.add(sphere);
  return _color;
}
