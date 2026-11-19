export type Point3 = readonly [number, number, number];
type Project = (point: Point3) => readonly [number, number];
type Pose = (point: Point3) => Point3;

export interface MeshPart {
  color: Point3;
  positions: number[];
}

export interface PackedMesh {
  // Each vertex contains three 16-bit coordinates, three signed normal bytes and three RGB bytes.
  vertices: string;
  indices: string;
  // Optional normalized 16-bit UV pairs in the same order as vertices.
  uv?: string;
}

export type MeshInstance = { pose?: Pose; unlit?: boolean; texture?: HTMLImageElement } & (
  { parts: readonly MeshPart[]; packed?: never } | { parts?: never; packed: PackedMesh }
);

const fromBase64 = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0));
const origin: Point3 = [0, 0, 0];
const axes: Point3[] = [[1,0,0],[0,1,0],[0,0,1]];
const identity = (point: Point3) => point;
const dot = (a: Point3, b: Point3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

export function createDepthRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: true, depth: true, premultipliedAlpha: false,
  });
  if (!gl) return;

  const program = gl.createProgram();
  if (!program) return;
  const shaders = [
    [gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec3 color;
      attribute vec2 texCoord;
      uniform mat4 projection;
      uniform mat3 rotation;
      uniform float positionScale;
      uniform float lighting;
      uniform bool textured;
      varying vec3 surface;
      varying mediump vec2 textureUV;
      void main() {
        vec3 facing = normalize(rotation * normal);
        float light = max(0.0, dot(facing, normalize(vec3(-0.44,-0.20,0.87))));
        vec3 base = textured ? vec3(1.0) : color;
        surface = min(vec3(1.0), base * mix(1.0, 0.70 + 0.37 * light, lighting));
        textureUV = texCoord;
        gl_Position = projection * vec4(position * positionScale, 1.0);
      }
    `],
    [gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 surface;
      varying mediump vec2 textureUV;
      uniform bool textured;
      uniform sampler2D atlas;
      void main() {
        vec3 base = textured ? texture2D(atlas, textureUV).rgb : vec3(1.0);
        gl_FragColor = vec4(base * surface, 1.0);
      }
    `],
  ] as const;
  for (const [type, source] of shaders) {
    const shader = gl.createShader(type);
    if (!shader) return;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return;
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  const position = gl.getAttribLocation(program,'position');
  const normal = gl.getAttribLocation(program,'normal');
  const color = gl.getAttribLocation(program,'color');
  const texCoord = gl.getAttribLocation(program,'texCoord');
  for (const attribute of [position, normal, color]) gl.enableVertexAttribArray(attribute);
  const projection = gl.getUniformLocation(program,'projection');
  const rotation = gl.getUniformLocation(program,'rotation');
  const positionScale = gl.getUniformLocation(program,'positionScale');
  const lighting = gl.getUniformLocation(program,'lighting');
  const textured = gl.getUniformLocation(program,'textured');
  const atlas = gl.createTexture();
  if (!atlas) {
    gl.deleteProgram(program);
    return;
  }
  gl.bindTexture(gl.TEXTURE_2D,atlas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
  gl.uniform1i(gl.getUniformLocation(program,'atlas'),0);
  let loadedTexture: HTMLImageElement | undefined;
  const buffers = new WeakMap<readonly MeshPart[], { buffer: WebGLBuffer | null; count: number }>();
  const vertexBuffers = new Map<string, WebGLBuffer>();
  const uvBuffers = new Map<string, WebGLBuffer>();
  const indexedBuffers = new WeakMap<PackedMesh, { buffer: WebGLBuffer | null; indices: WebGLBuffer | null; count: number }>();
  const allocated: WebGLBuffer[] = [];

  function upload(parts: readonly MeshPart[]) {
    const cached = buffers.get(parts);
    if (cached) return cached;
    const values: number[] = [];
    for (const { color, positions } of parts) {
      for (let i=0; i<positions.length; i+=9) {
        const ux=positions[i+3]-positions[i], uy=positions[i+4]-positions[i+1], uz=positions[i+5]-positions[i+2];
        const vx=positions[i+6]-positions[i], vy=positions[i+7]-positions[i+1], vz=positions[i+8]-positions[i+2];
        const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
        if (Math.hypot(nx,ny,nz) < 1e-8) continue;
        for (let j=0; j<9; j+=3) values.push(positions[i+j],positions[i+j+1],positions[i+j+2],nx,ny,nz,...color);
      }
    }
    const buffer = gl!.createBuffer();
    if (buffer) allocated.push(buffer);
    gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);
    gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(values),gl!.STATIC_DRAW);
    const result = { buffer, count: values.length/9 };
    buffers.set(parts,result);
    return result;
  }

  function uploadPacked(packed: PackedMesh) {
    const cached = indexedBuffers.get(packed);
    if (cached) return cached;
    let buffer = vertexBuffers.get(packed.vertices);
    if (!buffer) {
      buffer = gl!.createBuffer() ?? undefined;
      if (!buffer) throw new Error('Could not allocate vertex buffer');
      allocated.push(buffer);
      vertexBuffers.set(packed.vertices,buffer);
      gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER,fromBase64(packed.vertices),gl!.STATIC_DRAW);
    }
    const indices = gl!.createBuffer();
    if (indices) allocated.push(indices);
    const elements = fromBase64(packed.indices);
    gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER,indices);
    gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER,elements,gl!.STATIC_DRAW);
    const result = { buffer, indices, count: elements.byteLength / 2 };
    indexedBuffers.set(packed,result);
    return result;
  }

  function bindCoordinates(coordinates: string) {
    let buffer = uvBuffers.get(coordinates);
    if (!buffer) {
      buffer = gl!.createBuffer() ?? undefined;
      if (!buffer) throw new Error('Could not allocate UV buffer');
      allocated.push(buffer);
      uvBuffers.set(coordinates,buffer);
      gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER,fromBase64(coordinates),gl!.STATIC_DRAW);
    } else {
      gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);
    }
    gl!.enableVertexAttribArray(texCoord);
    gl!.vertexAttribPointer(texCoord,2,gl!.UNSIGNED_SHORT,true,4,0);
  }

  return {
    canvas,
    dispose() {
      for (const buffer of allocated) gl.deleteBuffer(buffer);
      vertexBuffers.clear();
      uvBuffers.clear();
      gl.deleteTexture(atlas);
      gl.deleteProgram(program);
    },
    draw(width: number, height: number, logicalWidth: number, logicalHeight: number, project: Project,
      view: Point3, instances: readonly MeshInstance[]) {
      if (gl.isContextLost()) return false;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0,0,width,height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const depthRange = 5000;
      for (const instance of instances) {
        const pose = instance.pose ?? identity;
        const packed = instance.packed && uploadPacked(instance.packed);
        const mesh = packed ?? upload(instance.parts!);
        gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
        if (packed) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,packed.indices);
          gl.vertexAttribPointer(position,3,gl.SHORT,false,12,0);
          gl.vertexAttribPointer(normal,3,gl.BYTE,true,12,6);
          gl.vertexAttribPointer(color,3,gl.UNSIGNED_BYTE,true,12,9);
        } else {
          gl.vertexAttribPointer(position,3,gl.FLOAT,false,36,0);
          gl.vertexAttribPointer(normal,3,gl.FLOAT,false,36,12);
          gl.vertexAttribPointer(color,3,gl.FLOAT,false,36,24);
        }
        const coordinates = instance.packed?.uv;
        const texture = instance.texture;
        if (coordinates && texture) {
          bindCoordinates(coordinates);
          if (texture !== loadedTexture) {
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texture);
            gl.generateMipmap(gl.TEXTURE_2D);
            loadedTexture = texture;
          }
        } else {
          gl.disableVertexAttribArray(texCoord);
        }
        gl.uniform1i(textured,coordinates && texture ? 1 : 0);
        gl.uniform1f(positionScale,packed ? .01 : 1);
        gl.uniform1f(lighting,instance.unlit ? 0 : 1);
        const start = pose(origin);
        const [sx,sy] = project(start);
        const transformed = axes.map(axis => pose(axis));
        const directions = transformed.map(point => point.map((value,i) => value-start[i]) as unknown as Point3);
        const columns = transformed.flatMap((point,i) => {
          const [x,y] = project(point);
          return [2*(x-sx)/logicalWidth,-2*(y-sy)/logicalHeight,-dot(directions[i],view)/depthRange,0];
        });
        const [a,b,c] = directions;
        const cross = (u: Point3,v: Point3) => [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        gl.uniformMatrix4fv(projection,false,[...columns,2*sx/logicalWidth-1,1-2*sy/logicalHeight,-dot(start,view)/depthRange,1]);
        gl.uniformMatrix3fv(rotation,false,[...cross(b,c),...cross(c,a),...cross(a,b)]);
        if (packed) gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
        else gl.drawArrays(gl.TRIANGLES,0,mesh.count);
      }
      return true;
    },
  };
}
