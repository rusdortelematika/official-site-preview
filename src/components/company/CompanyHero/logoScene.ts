import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import logoUrl from "../../../assets/models/company/rdt-logo.glb?url";
import reflection from "./reflection.json";

/** Six solids built from a shared planar construction of the styled film.
 * The GLB has exact mating edges, in-plane assembly, and one common film pose.
 * The moving studio reflection is procedural; no movie frames are rendered.
 */
export async function createLogoScene(host: HTMLDivElement) {
  // Fetch before allocating a WebGL context. The matching rendered poster
  // remains visible until the first real 3D frame has finished drawing.
  const asset = await new GLTFLoader().loadAsync(logoUrl);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(18, 1, .1, 60);
  camera.position.set(0, 0, 24);
  camera.lookAt(0, 0, 0);
  camera.layers.enable(1);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, .03);
  scene.environment = environment.texture;
  scene.environmentIntensity = .85;
  studio.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xf6faff, 1.5);
  key.position.set(-3, 6, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.camera.near = .1;
  key.shadow.camera.far = 35;
  key.shadow.normalBias = .016;
  key.shadow.bias = -.00005;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 8;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9ddff, .55);
  fill.position.set(5, -1, 8);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8cabc9, .40));
  // A lower softbox lights only the metal extrusion, preserving the saturated
  // blue face while giving the visible lower/inner walls an icy studio glint.
  const rim = new THREE.DirectionalLight(0xc9e6ff, 3.2);
  rim.position.set(-4, -5, 9);
  rim.layers.set(1);
  scene.add(rim);

  const stripe = {
    center: { value: reflection.centerStart },
    width: { value: reflection.halfWidth },
  };
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  asset.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if (material.name === "RDT_ice_metal_edge") {
        object.layers.enable(1);
        const edge = material as THREE.MeshPhysicalMaterial;
        edge.envMapIntensity = 1.25;
        edge.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying float vLogoDepth;")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLogoDepth = position.z;");
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\nvarying float vLogoDepth;")
            .replace("#include <color_fragment>", `#include <color_fragment>
              float depthT = clamp(-vLogoDepth / .538, 0.0, 1.0);
              diffuseColor.rgb *= .80 + .25 * cos(depthT * 6.28318 + .25);
              float blueRim = smoothstep(-.042, -.022, vLogoDepth);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.004, .026, .092), blueRim);
            `)
            .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
              totalEmissiveRadiance += (1.0 - blueRim) * vec3(.012, .045, .095) * (.80 + .20 * cos(depthT * 6.28318));
            `);
        };
        edge.customProgramCacheKey = () => "rdt-machined-blue-rim-v1";
        continue;
      }
      if (material.name !== "RDT_blue_face") continue;
      const face = material as THREE.MeshPhysicalMaterial;
      face.envMapIntensity = .30;
      face.onBeforeCompile = (shader) => {
        shader.uniforms.uStripeCenter = stripe.center;
        shader.uniforms.uStripeWidth = stripe.width;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec2 vLogoSurface;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLogoSurface = vec2(position.x, position.y * .86) * (24.0 / (24.0 + position.y * .510294));");
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying vec2 vLogoSurface;\nuniform float uStripeCenter;\nuniform float uStripeWidth;")
          .replace("#include <color_fragment>", `#include <color_fragment>
            float stripDistance = abs(vLogoSurface.x - vLogoSurface.y - uStripeCenter);
            float studioStrip = 1.0 - smoothstep(uStripeWidth - .04, uStripeWidth + .04, stripDistance);
            float faceGradient = .66 + .66 * clamp((vLogoSurface.y - vLogoSurface.x + 4.0) / 8.0, 0.0, 1.0);
            diffuseColor.rgb *= faceGradient;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.46, .61, .79), studioStrip);
          `)
          .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .25, studioStrip);")
          .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, .60, studioStrip);");
      };
      face.customProgramCacheKey = () => "rdt-styled-film-reflection-v1";
    }
  });
  const placement = new THREE.Group();
  // The rightward offset belongs to the styled reference, not the source film.
  placement.position.set(.22, .12, 0);
  placement.add(asset.scene);
  scene.add(placement);
  const mixer = new THREE.AnimationMixer(asset.scene);
  const clip = asset.animations[0];
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();

  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .13, color: "#4a6283" });
  const ground = new THREE.Mesh(groundGeometry, shadowMaterial);
  ground.rotation.x = -Math.acos(.86);
  ground.position.set(.22, -.21, -.55);
  ground.receiveShadow = true;
  scene.add(ground);

  let disposed = false;
  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    // Match the square poster's object-fit: contain exactly at every ratio.
    const halfHeight = 3.8 * Math.max(1, height / width);
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / 24));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize();
  const render = (value: number) => {
    if (disposed) return;
    const progress = THREE.MathUtils.clamp(value, 0, 1);
    action.paused = false;
    action.enabled = true;
    mixer.setTime(progress * clip.duration);
    stripe.center.value = THREE.MathUtils.lerp(reflection.centerStart, reflection.centerEnd, progress);
    renderer.render(scene, camera);
  };
  return {
    resize,
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(asset.scene);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      groundGeometry.dispose();
      shadowMaterial.dispose();
      environment.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
