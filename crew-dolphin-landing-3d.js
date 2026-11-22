import {
  AmbientLight, AnimationMixer, DirectionalLight, OrthographicCamera,
  Scene, WebGLRenderer, GLTFLoader
} from './vendor/dolphin-three-r180.js';

const asset = new URL('./assets/dolphin-forms-v2.glb', import.meta.url);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export async function createDolphinModel(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'dcl-model';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  const context = canvas.getContext('webgl2', {
    alpha: true, antialias: true, powerPreference: 'low-power'
  });
  if (!context) return null;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1.78, 1.78, 1.78, -1.78, .1, 20);
  camera.position.set(0, .32, 6);
  camera.lookAt(0, .24, 0);
  scene.add(new AmbientLight(0xe0efff, 1.12));
  const mainLight = new DirectionalLight(0xfff3dd, 2.85);
  mainLight.position.set(-3, 4, 5);
  scene.add(mainLight);
  const rim = new DirectionalLight(0x9b9fff, 2);
  rim.position.set(2, 2.6, -3.8);
  scene.add(rim);

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(asset.href);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  const model = gltf.scene.getObjectByName('Dolphin');
  const swimmer = gltf.animations.find(clip => clip.name === 'Swim');
  const materials = new Map();
  const parts = [];
  gltf.scene.traverse(object => {
    if (object.userData.part) parts.push(object);
    if (!object.isSkinnedMesh) return;
    // The bounds of a skinned mesh change with its pose. Our small scene
    // always shows the whole character, so it needs no per-mesh culling.
    object.frustumCulled = false;
    const material = object.material;
    if (!materials.has(material.name)) materials.set(material.name, new Set());
    materials.get(material.name).add(material);
  });
  scene.add(gltf.scene);
  const mixer = new AnimationMixer(gltf.scene);
  mixer.clipAction(swimmer).play();

  let currentForm = -1;
  let lastFrame;
  let viewWidth = 0;
  let viewRatio = 0;
  const moodSpeed = { cheerful: 1.12, calm: .85, sleepy: .64 };

  function show(visible) {
    canvas.hidden = !visible;
    host.dataset.modelReady = String(visible);
  }

  function setForm(formIndex) {
    if (currentForm === formIndex) return;
    const variant = model.userData.forms[formIndex];
    for (const [name, color] of Object.entries(variant.colors)) {
      for (const material of materials.get(name) ?? []) material.color.fromArray(color);
    }
    const selection = new Set(variant.parts);
    for (const part of parts) part.visible = selection.has(part.userData.part);
    rim.color.fromArray(variant.colors.wingTip).lerp(mainLight.color,.28);
    rim.intensity = 1.55+formIndex*.14;
    currentForm = formIndex;
    canvas.dataset.level = String(variant.level);
  }

  function draw({ now, size, facing, dx, dy, mood, reaction }) {
    if (context.isContextLost()) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (size !== viewWidth || ratio !== viewRatio) {
      renderer.setPixelRatio(ratio);
      renderer.setSize(size, size, false);
      viewWidth = size;
      viewRatio = ratio;
    }
    const dt = lastFrame === undefined ? 0 : clamp((now-lastFrame)/1000, 0, .05);
    const ease = lastFrame === undefined ? 1 : 1-Math.exp(-9*dt);
    lastFrame = now;
    const yaw = facing > 0 ? Math.PI-.28 : .28;
    const rotation = gltf.scene.rotation;
    const turn = yaw-rotation.y;
    rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn))*ease;
    const pitch = clamp(-Math.atan2(dy, Math.abs(dx)+.01)*facing*.26, -.34, .34);
    rotation.z += (pitch-rotation.z)*ease;
    mixer.timeScale = reaction ? 1.45 : moodSpeed[mood] ?? 1;
    mixer.update(dt);
    renderer.render(scene, camera);
    if (canvas.hidden && !context.isContextLost()) show(true);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    show(false);
  });
  canvas.addEventListener('webglcontextrestored', () => { lastFrame = undefined; });
  host.append(canvas);
  return {
    setForm,
    draw,
    pause() { lastFrame = undefined; show(false); },
    dispose() {
      show(false);
      mixer.stopAllAction();
      const geometries = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
      for (const geometry of geometries) geometry.dispose();
      for (const group of materials.values()) {
        for (const material of group) material.dispose();
      }
      renderer.dispose();
      canvas.remove();
    }
  };
}
