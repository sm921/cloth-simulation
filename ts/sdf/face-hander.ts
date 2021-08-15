namespace FACE_HANDLER {
  export function calculateFaceNormals(
    vertexNormals: Float32Array,
    indexBuffer: Uint16Array
  ) {
    return traverseTriangles(
      vertexNormals,
      indexBuffer,
      (indexBufferIndex, vertexNormals, faceNormals) => {
        // face noraml is equal to normalized sum of vertex normals
        const faceNormal = VEC.normalize(VEC.add(...vertexNormals));
        for (
          let ei = 0; // axis index. x, y, or z
          ei < 3;
          ei++
        )
          faceNormals[indexBufferIndex + ei] = faceNormal[ei];
      }
    );
  }

  export async function loadGLTF(filePath: string): Promise<{
    boundingBox: {
      max: { x: number; y: number; z: number };
      min: { x: number; y: number; z: number };
    };
    indexBuffer: Uint16Array;
    normals: Float32Array;
    positions: Float32Array;
  }> {
    const gltf = await new THREE.GLTFLoader().loadAsync(filePath);
    const geometry = (gltf.scene.children[0] as any).geometry;
    return {
      positions: geometry.attributes.position.array, // vertex positions
      normals: geometry.attributes.normal.array, // vertex normals
      indexBuffer: geometry.index.array, // index buffer (tell which 3 indices each triangle consists of)
      boundingBox: geometry.boundingBox, // AABB
    };
  }

  /**
   * @param allVertexPositionsOrNormals
   * @param indexBuffer
   * @param forEachTriangle convert 3 vertices and set converted data to result array
   * @returns
   */
  function traverseTriangles(
    allVertexPositionsOrNormals: Float32Array,
    indexBuffer: Uint16Array,
    forEachTriangle: (
      indexBufferIndex: number,
      vertexPositionsOrNormals: Vec3[],
      result: Float32Array
    ) => void
  ): Float32Array {
    const len = indexBuffer.length;
    const result = new Float32Array(len);
    for (let i = 0; i < len; i += 3) {
      // get vertex normals for a triangle
      const vertexPositionsOrNormals = [0, 1, 2].map(
        (
          vi // vertex, v0, v1, or v2
        ) =>
          [0, 1, 2].map(
            (
              ei // axis x, y, or z
            ) => allVertexPositionsOrNormals[indexBuffer[i + vi] * 3 + ei]
          ) as Vec3
      );
      forEachTriangle(i, vertexPositionsOrNormals, result);
    }
    return result;
  }

  export function forEachTriangle(
    allVertexPositionsOrNormals: Float32Array,
    indexBuffer: Uint16Array,
    callback: (vertexPositionsOrNormals: Vec3[], i: number) => void,
    buffer?: Float32Array
  ) {
    const len = indexBuffer.length;
    for (let i = 0; i < len; i += 3) {
      // get vertex normals for a triangle
      const vertexPositionsOrNormals = [0, 1, 2].map(
        (
          vi // vertex, v0, v1, or v2
        ) =>
          [0, 1, 2].map(
            (
              ei // axis x, y, or z
            ) => allVertexPositionsOrNormals[indexBuffer[i + vi] * 3 + ei]
          ) as Vec3
      );
      callback(vertexPositionsOrNormals, i);
    }
  }
}
