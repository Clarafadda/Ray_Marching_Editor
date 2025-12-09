// main.js
// Module entry - option A: Scene Editor + CodeMirror + WebGPU + shader loader
// Defensive and corrected to avoid null.textContent errors
//compilation update
// --------------------------------------------
// CONFIG
// --------------------------------------------
const MAX_SPHERES = 5;
const MAX_BOXES = 3;
const MAX_TORUS = 3;
const MAX_PYRAMIDS = 3;
//const MAX_PLANS = 2;


const SPHERE_SIZE = 32;
const BOX_SIZE = 48;
const TORUS_SIZE = 48;
//const PLAN_SIZE = 48;
const PYRAMID_SIZE = 48;
const SCENE_HEADER_SIZE = 16;
const FINAL_PADDING = 16;

const SCENE_SIZE =
  (SPHERE_SIZE * MAX_SPHERES) +
  (BOX_SIZE * MAX_BOXES)  +
  (TORUS_SIZE * MAX_TORUS) +
  (PYRAMID_SIZE * MAX_PYRAMIDS) +
  //(PLAN_SIZE * MAX_PLANS) +
  SCENE_HEADER_SIZE + FINAL_PADDING;

console.log("✅ Correct SCENE_SIZE:", SCENE_SIZE, "bytes");
// --------------------------------------------
// SCENE DATA BUFFER
// --------------------------------------------
const sceneData = {
  spheres: [],
  boxes: [],
  pyramids: [],
  torus: [],
  /*plans: [{
    normal: [0, 1, 0],    // Pointing up
    distance: 0.5,        // Ground plane at y = -0.5
    color: [0.7, 0.7, 0.7] // Gray
  }],*/

  num_spheres: 0,
  num_boxes: 0,
  num_pyramids: 0,
  num_torus: 0,
  //num_plans: 0
};

function createSceneArrayBuffer(data) {
  const buffer = new ArrayBuffer(SCENE_SIZE);
  const view = new DataView(buffer);
  let offset = 0; // Initialize offset at 0

  // 1. SPHERES (5 * 32 bytes = 160 bytes total)
  for (let i = 0; i < MAX_SPHERES; i++) {
    const itemOffset = offset + (i * SPHERE_SIZE);

    if (i < data.spheres.length) {
      const s = data.spheres[i];
      // center: vec3<f32> (Offset 0, 4, 8)
      view.setFloat32(itemOffset + 0, s.center[0], true);
      view.setFloat32(itemOffset + 4, s.center[1], true);
      view.setFloat32(itemOffset + 8, s.center[2], true);
      // radius: f32 (Offset 12)
      view.setFloat32(itemOffset + 12, s.radius, true);
      // color: vec3<f32> (Offset 16, 20, 24)
      view.setFloat32(itemOffset + 16, s.color[0], true);
      view.setFloat32(itemOffset + 20, s.color[1], true);
      view.setFloat32(itemOffset + 24, s.color[2], true);
      // _padding: f32 (Offset 28)
    }
  }
  offset += SPHERE_SIZE * MAX_SPHERES; // CRITICAL: Advance offset

  // 2. BOXES (3 * 48 bytes = 144 bytes total)
  for (let i = 0; i < MAX_BOXES; i++) {
    const itemOffset = offset + (i * BOX_SIZE);

    if (i < data.boxes.length) {
      const b = data.boxes[i];
      view.setFloat32(itemOffset + 0, b.center[0], true);
      view.setFloat32(itemOffset + 4, b.center[1], true);
      view.setFloat32(itemOffset + 8, b.center[2], true);

      view.setFloat32(itemOffset + 16, b.size[0], true);
      view.setFloat32(itemOffset + 20, b.size[1], true);
      view.setFloat32(itemOffset + 24, b.size[2], true);

      view.setFloat32(itemOffset + 32, b.color[0], true);
      view.setFloat32(itemOffset + 36, b.color[1], true);
      view.setFloat32(itemOffset + 40, b.color[2], true);
    }
  }
  offset += BOX_SIZE * MAX_BOXES;

  for (let i = 0; i < MAX_TORUS; i++) {

    const itemOffset = offset + i * TORUS_SIZE;

    if (i < data.num_torus && data.torus[i]) {
        const t = data.torus[i];

        view.setFloat32(itemOffset + 0, t.center[0], true);
        view.setFloat32(itemOffset + 4, t.center[1], true);
        view.setFloat32(itemOffset + 8, t.center[2], true);
        view.setFloat32(itemOffset + 12, t.major_radius, true);
        view.setFloat32(itemOffset + 16, t.minor_radius, true);

        view.setFloat32(itemOffset + 32, t.color[0], true);
        view.setFloat32(itemOffset + 36, t.color[1], true);
        view.setFloat32(itemOffset + 40, t.color[2], true);

    } else {
        // zero-fill the torus struct
        for (let j = 0; j < TORUS_SIZE; j += 4) {
            view.setFloat32(itemOffset + j, 0, true);
        }
    }
  }
  offset += TORUS_SIZE * MAX_TORUS;  // correct placement


/*// 3. PLANS (2 * 48 bytes = 96 bytes total)
  for (let i = 0; i < MAX_PLANS; i++) {
    const itemOffset = offset + (i * PLAN_SIZE);

    if (i < data.plans.length) {
        const p = data.plans[i];

        view.setFloat32(itemOffset + 0, p.normal[0], true);
        view.setFloat32(itemOffset + 4, p.normal[1], true);
        view.setFloat32(itemOffset + 8, p.normal[2], true);

        view.setFloat32(itemOffset + 12, p.distance, true);

        view.setFloat32(itemOffset + 32, p.color[0], true);
        view.setFloat32(itemOffset + 36, p.color[1], true);
        view.setFloat32(itemOffset + 40, p.color[2], true);
    }
  }
  offset += PLAN_SIZE * MAX_PLANS;*/

    // 4. PYRAMIDS (3 * 48 bytes = 144 bytes total)
  for (let i = 0; i < MAX_PYRAMIDS; i++) {
    const itemOffset = offset + (i * PYRAMID_SIZE);

    if (i < data.pyramids.length) {
      const p = data.pyramids[i];
      // center: vec3<f32> (Offset 0, 4, 8)
      view.setFloat32(itemOffset + 0, p.center[0], true);
      view.setFloat32(itemOffset + 4, p.center[1], true);
      view.setFloat32(itemOffset + 8, p.center[2], true);
      // _padding1: f32 (Offset 12)

      // height: f32 (Offset 16)
      view.setFloat32(itemOffset + 16, p.height, true);
      // _padding2: f32 (Offset 20)
      // _padding3: f32 (Offset 24)
      // _padding4: f32 (Offset 28)

      // color: vec3<f32> (Offset 32, 36, 40)
      view.setFloat32(itemOffset + 32, p.color[0], true);
      view.setFloat32(itemOffset + 36, p.color[1], true);
      view.setFloat32(itemOffset + 40, p.color[2], true);
      // _padding5: f32 (Offset 44)
    }
  }
  offset += PYRAMID_SIZE * MAX_PYRAMIDS;

  // 5. SCENE HEADER (16 bytes total) - This is where the error occurred before
  view.setUint32(offset + 0, data.num_spheres, true);
  view.setUint32(offset + 4, data.num_boxes, true);
  //view.setUint32(offset + 8, data.num_plans, true);
  view.setUint32(offset + 8, data.num_pyramids, true);
  view.setUint32(offset + 12, data.num_torus, true);
  offset += SCENE_HEADER_SIZE;

  return buffer;
}

function updateScene() {
  if (device && sceneBuffer) {
    device.queue.writeBuffer(sceneBuffer, 0, createSceneArrayBuffer(sceneData));
  }
}

// --------------------------------------------
// BASIC HELPERS
// --------------------------------------------
const $ = id => document.getElementById(id);

function safeSet(id, value) {
  const el = $(id);
  if (!el) return false;
  if (value === null || value === undefined) {
    // if a function returns null to indicate "no text" (like mouse-ind update), skip
    return true;
  }
  el.textContent = value;
  return true;
}

// rgb <0..1> -> hex
function rgbToHex(rgb) {
  const r = Math.round((rgb[0] || 0) * 255).toString(16).padStart(2, '0');
  const g = Math.round((rgb[1] || 0) * 255).toString(16).padStart(2, '0');
  const b = Math.round((rgb[2] || 0) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
function hexToRgb(hex) {
  if (!hex || hex[0] !== '#') return [1,1,1];
  const bigint = parseInt(hex.slice(1), 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r,g,b];
}

// --------------------------------------------
// SCENE MANIPULATION (UI-friendly)
// --------------------------------------------
function addSphere() {
  if (sceneData.num_spheres >= MAX_SPHERES) {
    alert(`Maximum ${MAX_SPHERES} spheres reached!`);
    return;
  }
  sceneData.spheres.push({
    center: [0.0, 0.5, 0.0],
    radius: 0.5,
    color: [Math.random(), Math.random(), Math.random()]
  });
  sceneData.num_spheres++;
  updateScene();
  updateSceneUI();
  console.log(`✅ Added sphere ${sceneData.num_spheres - 1}`);
}
function addBox() {
  if (sceneData.num_boxes >= MAX_BOXES) {
    alert(`Maximum ${MAX_BOXES} boxes reached!`);
    return;
  }
  sceneData.boxes.push({
    center: [0.0, 0.5, 0.0],
    size: [0.5, 0.5, 0.5],
    color: [Math.random(), Math.random(), Math.random()]
  });
  sceneData.num_boxes++;
  updateScene();
  updateSceneUI();
  console.log(`✅ Added box ${sceneData.num_boxes - 1}`);
}

/*function addPlan() {
  if (sceneData.num_plans >= MAX_PLANS) {
    alert(`Maximum ${MAX_PLANS} plans reached!`);
    return;
  }
  sceneData.plans.push({
    normal: [0, 1, 0],    // Pointing up (horizontal plan)
    distance: 0,          // At origin height
    color: [0.5, 0.5, 0.5] // Gray
  });
  sceneData.num_plans++;
  updateScene();
  updateSceneUI();
  console.log(`✅ Added plan ${sceneData.num_plans - 1}`);
}*/

function addPyramid() {
  if (sceneData.num_pyramids >= MAX_PYRAMIDS) {
    alert(`Maximum ${MAX_PYRAMIDS} pyramids reached!`);
    return;
  }
  sceneData.pyramids.push({
    center: [0.0, 0.0, 0.0],
    height: 1.0,
    color: [Math.random(), Math.random(), Math.random()]
  });
  sceneData.num_pyramids++;
  updateScene();
  updateSceneUI();
  console.log(`✅ Added pyramid ${sceneData.num_pyramids - 1}`);
}

function addTorus() {
  if (sceneData.num_torus >= MAX_TORUS) {
    alert(`Maximum ${MAX_TORUS} torus reached!`);
    return;
  }
  sceneData.torus.push({
    center: [0.0, 0.5, 0.0],    // Pointing up (horizontal plan)
    major_radius: 1,
    minor_radius: 0.3,
    color: [Math.random(), Math.random(), Math.random()] // Gray
  });
  sceneData.num_torus++;
  updateScene();
  updateSceneUI();
  console.log(`✅ Added torus ${sceneData.num_torus - 1}`);
}

function removeSphere(index) {
  if (index >= 0 && index < sceneData.num_spheres) {
    sceneData.spheres.splice(index, 1);
    sceneData.num_spheres--;
    updateScene();
    updateSceneUI();
    console.log(`Removed sphere ${index}`);
  }
}
function removeBox(index) {
  if (index >= 0 && index < sceneData.num_boxes) {
    sceneData.boxes.splice(index, 1);
    sceneData.num_boxes--;
    updateScene();
    updateSceneUI();
    console.log(`Removed box ${index}`);
  }
}

/*function removePlan(index) {
  if (index >= 0 && index < sceneData.num_plans) {
    sceneData.plans.splice(index, 1);
    sceneData.num_plans--;
    updateScene();
    updateSceneUI();
    console.log(`Removed plan ${index}`);
  }
}*/

function removePyramid(index) {
  if (index >= 0 && index < sceneData.num_pyramids) {
    sceneData.pyramids.splice(index, 1);
    sceneData.num_pyramids--;
    updateScene();
    updateSceneUI();
    console.log(`Removed pyramid ${index}`);
  }
}

function removeTorus(index) {
  if (index >= 0 && index < sceneData.num_torus) {
    sceneData.torus.splice(index, 1);
    sceneData.num_torus--;
    updateScene();
    updateSceneUI();
    console.log(`Removed torus ${index}`);
  }
}

window.addSphere = addSphere;
window.addBox = addBox;
//window.addPlan = addPlan;
window.addPyramid = addPyramid;
window.addTorus = addTorus;
window.removeSphere = removeSphere;
window.removeBox = removeBox;
window.removePyramid = removePyramid;
//window.removePlan = removePlan;
window.removeTorus = removeTorus;

// --------------------------------------------
// CODEMIRROR (simple mode for wgsl)
// --------------------------------------------
function initCodeMirror() {
  CodeMirror.defineSimpleMode("wgsl", {
    start: [
      { regex: /\b(fn|let|var|const|if|else|for|while|loop|return|break|continue|discard|switch|case|default|struct|type|alias)\b/, token: "keyword" },
      { regex: /\b(bool|i32|u32|f32|f16|vec2|vec3|vec4|mat2x2|mat3x3|mat4x4|array|sampler|texture_2d|texture_3d)\b/, token: "type" },
      { regex: /@(vertex|fragment|compute|builtin|location|binding|group|stage|workgroup_size|interpolate|invariant)/, token: "attribute" },
      { regex: /\b\d+\.?\d*[fu]?\b|0x[0-9a-fA-F]+[ul]?/, token: "number" },
      { regex: /\/\/.*/, token: "comment" },
      { regex: /\/\*/, token: "comment", next: "comment" },
      { regex: /[+\-*/%=<>!&|^~?:]/, token: "operator" },
      { regex: /[{}()\[\];,\.]/, token: "punctuation" },
    ],
    comment: [
      { regex: /.*?\*\//, token: "comment", next: "start" },
      { regex: /.*/, token: "comment" },
    ],
  });

  const editor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
    mode: "wgsl",
    theme: "gruvbox-dark-hard",
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    viewportMargin: Infinity,
    scrollbarStyle: "native",
  });

  return editor;
}

// --------------------------------------------
// WEBGPU: variables and init
// --------------------------------------------
let device = null;
let context = null;
let pipeline = null;
let uniformBuffer = null;
let sceneBuffer = null;
let bindGroup = null;

let startTime = performance.now();
let lastFrameTime = startTime;
let isCameraPaused = false;
let frameCount = 0;
let lastFpsUpdate = startTime;
let mouseX = 0, mouseY = 0, mouseDown = false;
let editor, vertexShader = "", uniformsStruct = "", sceneStruct = "", fallbackShader = "";

const canvas = $("canvas");
const compileBtn = $("compile-btn");
const canvasContainer = $("canvas-container");
const editorContainer = $("editor-container");

// uniforms descriptor used to generate stable ids in the table
const uniforms = {
  resolution: { label: "resolution", initial: "0 × 0", update: (w,h)=>`${w} × ${h}` },
  time: { label: "time", initial: "0.00s", update: (t)=>`${t.toFixed(2)}s` },
  deltaTime: { label: "deltaTime", initial: "0.00ms", update: (dt)=>`${(dt*1000).toFixed(2)}ms` },
  mousexy: { label: "mouse.xy", initial: "0,0", update: (x,y)=>`${Math.round(x)}, ${Math.round(y)}` },
  mousez: { label: "mouse.z", initial: '<span id="mouse-ind-inline"></span>', update: (down)=>{ const el = $("mouse-ind"); if (el) el.style.background = down ? "#b8bb26" : "#928374"; return null; } },
  frame: { label: "frame", initial:"0", update: (f)=>f.toString() }
};

// create the uniforms table rows with stable IDs (once)
function buildUniformsTable() {
  const tbody = $("uniforms-table");
  if (!tbody) return;
  const rows = [];
  for (const key of Object.keys(uniforms)) {
    const id = `u-${key}`;
    rows.push(
      `<tr class="border-b" style="border-color:#3c3836">
        <td class="py-1.5 font-semibold" style="color:#fe8019">${uniforms[key].label}</td>
        <td class="py-1.5 text-right font-mono" id="${id}">${uniforms[key].initial}</td>
      </tr>`
    );
  }
  tbody.innerHTML = rows.join("");
}

// --------------------------------------------
// MOUSE / INPUT
// --------------------------------------------
if (canvas) {
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    mouseX = (e.clientX - rect.left) * dpr;
    mouseY = (e.clientY - rect.top) * dpr;
  });
  canvas.addEventListener("mousedown", ()=>mouseDown=true);
  canvas.addEventListener("mouseup", ()=>mouseDown=false);
  canvas.addEventListener("mouseleave", ()=>mouseDown=false);
}

// --------------------------------------------
// PANEL TOGGLE
// --------------------------------------------
let isPanelOpen = true;
$("panel-toggle").onclick = () => {
  isPanelOpen = !isPanelOpen;
  const panel = $("scene-editor-panel");
  const content = $("panel-content");
  const arrow = $("toggle-arrow");
  if (panel) panel.style.width = isPanelOpen ? "300px" : "20px";
  if (content) content.style.display = isPanelOpen ? "flex" : "none";
  if (arrow) arrow.textContent = isPanelOpen ? "▶" : "◀";
};

// --------------------------------------------
// WEBGPU INIT
// --------------------------------------------
async function initWebGPU() {
  if(!navigator.gpu) {
    const em = $("error-message");
    if (em) { em.textContent = "WebGPU not supported"; em.classList.remove("hidden"); }
    return false;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if(!adapter) {
    const em = $("error-message");
    if (em) { em.textContent = "No GPU adapter"; em.classList.remove("hidden"); }
    return false;
  }
  device = await adapter.requestDevice();
  context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  uniformBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  sceneBuffer = device.createBuffer({
    size: SCENE_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // initialize scene buffer with current (empty) data
  device.queue.writeBuffer(sceneBuffer, 0, createSceneArrayBuffer(sceneData));

  return true;
}

// --------------------------------------------
// SHADER LOADING
// --------------------------------------------
async function loadInitialShaders() {
  // 1. Define a standard Full-Screen Triangle vertex shader
  const defaultVertexShader = `
    struct VertexOutput {
      @builtin(position) Position : vec4<f32>,
      @location(0) uv : vec2<f32>,
    }

    @vertex
    fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
      var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0)
      );

      var output : VertexOutput;
      output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
      output.uv = pos[VertexIndex] * 0.5 + 0.5;
      return output;
    }
  `;

  try {
    const vertexResp = await fetch("./shaders/vertex.wgsl");
    // Use the fetched text if successful, otherwise use the defaultVertexShader
    vertexShader = vertexResp.ok ? await vertexResp.text() : defaultVertexShader;
  } catch (e) {
    console.error("vertex load:", e);
    vertexShader = defaultVertexShader;
  }

  try {
    const uResp = await fetch("./shaders/uniforms.wgsl");
    uniformsStruct = uResp.ok ? await uResp.text() : "";
  } catch (e) {
    console.error("uniforms load:", e);
    uniformsStruct = "";
  }

  try {
    const sResp = await fetch("./shaders/scene.wgsl");
    sceneStruct = sResp.ok ? await sResp.text() : "";
  } catch (e) {
    console.error("scene load:", e);
    sceneStruct = "";
  }

  try {
    const fbResp = await fetch("./shaders/fallback.wgsl");
    fallbackShader = fbResp.ok ? await fbResp.text() : `@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(1.0,0.0,1.0,1.0); }`;
  } catch (e) {
    console.error("fallback load:", e);
    fallbackShader = `@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(1.0,0.0,1.0,1.0); }`;
  }

  return { vertexShader, uniformsStruct, sceneStruct, fallbackShader };
}

async function loadMainShader() {
  try {
    const response = await fetch("./shaders/raymarch_scene.wgsl");
    let fragmentCode;
    if (response.ok) {
      fragmentCode = await response.text();
      editor.setValue(fragmentCode);
      await compileShader(vertexShader, uniformsStruct, sceneStruct, fragmentCode);
      console.log("✅ Loaded raymarch_scene.wgsl");
    } else {
      console.warn("raymarch_scene.wgsl not found, using fallback");
      fragmentCode = fallbackShader;
      editor.setValue(fragmentCode);
      await compileShader(vertexShader, uniformsStruct, sceneStruct, fragmentCode);
    }
  } catch (e) {
    console.error("Error loading main shader:", e);
    editor.setValue(fallbackShader);
    await compileShader(vertexShader, uniformsStruct, sceneStruct, fallbackShader);
  }
}

// --------------------------------------------
// COMPILE PIPELINE
// --------------------------------------------
async function compileShader(vertex, uStruct, sceneStr, fragmentCode) {
  if (!device) return;
  try {
    const start = performance.now();
    const code = (vertex || "") + "\n" + (uStruct || "") + "\n" + (sceneStr || "") + "\n" + (fragmentCode || "");
    const shaderModule = device.createShaderModule({ code });
    const info = await shaderModule.getCompilationInfo();
    const msgs = info.messages || [];
    const lineOffset = ((vertex || "") + "\n" + (uStruct || "") + "\n" + (sceneStr || "")).split("\n").length;
    const errors = msgs.filter(m=>m.type==="error").map(m=>{
      const fragLine = m.lineNum - lineOffset;
      return fragLine>0 ? `Line ${fragLine}: ${m.message}` : `Line ${m.lineNum}: ${m.message}`;
    }).join("\n");

    if (errors) {
      const em = $("error-message");
      if (em) { em.textContent = "Shader error:\n" + errors; em.classList.remove("hidden"); }
      return;
    } else {
      const em = $("error-message");
      if (em) { em.classList.add("hidden"); }
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }
      ]
    });

    pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: { module: shaderModule, entryPoint: "vs_main" },
      fragment: { module: shaderModule, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" }
    });

    bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: sceneBuffer } }
      ]
    });

    const compileTimeEl = $("compile-time");
    if (compileTimeEl) compileTimeEl.textContent = `${(performance.now() - start).toFixed(2)}ms`;

    console.log("Pipeline compiled successfully");
  } catch (e) {
    const em = $("error-message");
    if (em) { em.textContent = "Compile error: " + (e.message || e.toString()); em.classList.remove("hidden"); }
    console.error("Compile error:", e);
  }
}

// --------------------------------------------
// SCENE EDITOR UI
// --------------------------------------------
let selected = { type: 'none', index: -1 };

function updateSceneUI() {
  const container = $("scene-objects-list");
  if (!container) return;

  const parts = [];

  // spheres
  for (let i = 0; i < sceneData.num_spheres; i++) {
    const s = sceneData.spheres[i];
    const hex = rgbToHex(s.color);
    parts.push(`<div class="flex items-center gap-2 p-2 bg-[#1d2021] rounded hover:bg-[#32302f] transition-colors row" data-type="sphere" data-index="${i}">
      <div class="w-3 h-3 rounded-full" style="background: ${hex}"></div>
      <span class="text-xs flex-1">Sphere ${i}</span>
      <button data-remove="sphere-${i}" class="text-xs text-red-400 hover:text-red-300">✕</button>
    </div>`);
  }

  // boxes
  for (let i = 0; i < sceneData.num_boxes; i++) {
    const b = sceneData.boxes[i];
    const hex = rgbToHex(b.color);
    parts.push(`<div class="flex items-center gap-2 p-2 bg-[#1d2021] rounded hover:bg-[#32302f] transition-colors row" data-type="box" data-index="${i}">
      <div class="w-3 h-3" style="background: ${hex}"></div>
      <span class="text-xs flex-1">Box ${i}</span>
      <button data-remove="box-${i}" class="text-xs text-red-400 hover:text-red-300">✕</button>
    </div>`);
  }


  //plans
 /* for (let i = 0; i < sceneData.num_plans; i++) {
    const p = sceneData.plans[i];
    const hex = rgbToHex(p.color);
    parts.push(`<div class="flex items-center gap-2 p-2 bg-[#1d2021] rounded hover:bg-[#32302f] transition-colors row" data-type="plan" data-index="${i}">
      <div class="w-3 h-0.5" style="background: ${hex}"></div>
      <span class="text-xs flex-1">Plan ${i}</span>
      <button data-remove="plan-${i}" class="text-xs text-red-400 hover:text-red-300">✕</button>
    </div>`);
  }*/

  // pyramids
  for (let i = 0; i < sceneData.num_pyramids; i++) {
    const p = sceneData.pyramids[i];
    const hex = rgbToHex(p.color);
    parts.push(`<div class="flex items-center gap-2 p-2 bg-[#1d2021] rounded hover:bg-[#32302f] transition-colors row" data-type="pyramid" data-index="${i}">
      <div class="w-3 h-3" style="background: ${hex}"></div>
      <span class="text-xs flex-1">Pyramid ${i}</span>
      <button data-remove="pyramid-${i}" class="text-xs text-red-400 hover:text-red-300">✕</button>
    </div>`);
  }


  //torus
  for (let i = 0; i < sceneData.num_torus; i++) {
    const t = sceneData.torus[i];
    const hex = rgbToHex(t.color);
    parts.push(`<div class="flex items-center gap-2 p-2 bg-[#1d2021] rounded hover:bg-[#32302f] transition-colors row" data-type="torus" data-index="${i}">
      <div class="w-3 h-3 rounded-full" style="background: ${hex}"></div>
      <span class="text-xs flex-1">Torus ${i}</span>
      <button data-remove="torus-${i}" class="text-xs text-red-400 hover:text-red-300">✕</button>
    </div>`);
  }

  if (parts.length === 0) {
    container.innerHTML = `<div class="text-xs text-gray-500 text-center py-4">No objects in scene<br>Click to add</div>`;
  } else {
    container.innerHTML = parts.join("");
  }

  // wire up rows
  const rows = container.querySelectorAll("div.row");
  rows.forEach(row => {
    const type = row.getAttribute("data-type");
    const index = Number(row.getAttribute("data-index"));
    row.onclick = (ev) => {
      ev.stopPropagation();
      selectObject(type, index);
    };
    const btn = row.querySelector('button[data-remove]');
    if (btn) {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const removeKey = btn.getAttribute('data-remove') || '';
        if (removeKey.startsWith('sphere-')) {
          const i = Number(removeKey.split('-')[1]);
          removeSphere(i);
        } else if (removeKey.startsWith('box-')) {
          const i = Number(removeKey.split('-')[1]);
          removeBox(i);
        } else if (removeKey.startsWith('torus-')) {
          const i = Number(removeKey.split('-')[1]);
          removeTorus(i);
        }else if (removeKey.startsWith('pyramid-')) {
          const i = Number(removeKey.split('-')[1]);
          removePyramid(i);
        }//else if (removeKey.startsWith('plan-')) removePlan(Number(removeKey.split('-')[1]));
        //selectObject('none', -1);
      };
    }
  });

  // auto-select if none
  if (selected.type === 'none') {
    if (sceneData.num_spheres > 0) selectObject('sphere', 0);
    else if (sceneData.num_boxes > 0) selectObject('box', 0);
    else if (sceneData.num_torus > 0) selectObject('torus', 0);
    else if (sceneData.num_pyramids > 0) selectObject ('pyramid', 0);
    //else if (sceneData.num_plans > 0) selectObject('plan', 0);

  }
}

// selection
function selectObject(type, index) {
  selected.type = type;
  selected.index = index;

  // visual highlight
  document.querySelectorAll("#scene-objects-list > div.row").forEach(r => r.classList.remove("selected"));
  const sel = document.querySelector(`#scene-objects-list > div.row[data-type="${type}"][data-index="${index}"]`);
  if (sel) sel.classList.add("selected");

  const info = $("editor-active-info");

  // --- toggle sliders ---
  const radiusSlider = $("slider-radius");
  const min_radSlier = $("slider-min_rad");
  const maj_radSlider = $("slider-maj_rad");
  //const distanceSlider = $("slider-dist");
  const longSlider   = $("slider-long");
  const widthSlider  = $("slider-width");
  const heightSlider = $("slider-height");

  if (type === 'sphere') {
    if (radiusSlider) radiusSlider.style.display = 'flex';
    if (min_radSlier) min_radSlier.style.display = 'none';
    if (maj_radSlider) maj_radSlider.style.display = 'none';
    //if (distanceSlider) distanceSlider.style.display = 'none';
    if (longSlider) longSlider.style.display = 'none';
    if (widthSlider) widthSlider.style.display = 'none';
    if (heightSlider) heightSlider.style.display = 'none';

    const s = sceneData.spheres[index];
    if (!s) { if (info) info.textContent = 'Editing: none'; return; }
    if (info) info.textContent = `Editing: Sphere [${index}]`;
    $("input-pos-x").value = s.center[0];
    $("val-pos-x").textContent = Number(s.center[0]).toFixed(1);
    $("input-pos-y").value = s.center[1];
    $("val-pos-y").textContent = Number(s.center[1]).toFixed(1);
    $("input-pos-z").value = s.center[2];
    $("val-pos-z").textContent = Number(s.center[2]).toFixed(1);
    $("input-rad").value = s.radius;
    $("val-rad").textContent = Number(s.radius).toFixed(1);
    $("input-color").value = rgbToHex(s.color);

  } else if (type === 'box') {
    if (radiusSlider) radiusSlider.style.display = 'none';
    if (min_radSlier) min_radSlier.style.display = 'none';
    if (maj_radSlider) maj_radSlider.style.display = 'none';
    //if (distanceSlider) distanceSlider.style.display = 'none';
    if (longSlider) longSlider.style.display = 'flex';
    if (widthSlider) widthSlider.style.display = 'flex';
    if (heightSlider) heightSlider.style.display = 'flex';

    const b = sceneData.boxes[index];
    if (!b) { if (info) info.textContent = 'Editing: none'; return; }
    if (info) info.textContent = `Editing: Box [${index}]`;
    $("input-pos-x").value = b.center[0];
    $("val-pos-x").textContent = Number(b.center[0]).toFixed(1);
    $("input-pos-y").value = b.center[1];
    $("val-pos-y").textContent = Number(b.center[1]).toFixed(1);
    $("input-pos-z").value = b.center[2];
    $("val-pos-z").textContent = Number(b.center[2]).toFixed(1);
    $("input-long").value = b.size[0];
    $("val-long").textContent = Number(b.size[0]).toFixed(1);
    $("input-width").value = b.size[1];
    $("val-width").textContent = Number(b.size[1]).toFixed(1);
    $("input-height").value = b.size[2];
    $("val-height").textContent = Number(b.size[2]).toFixed(1);
    $("input-color").value = rgbToHex(b.color);

    } else if (type === 'pyramid') {
    // Show only height slider for pyramids
    if (radiusSlider) radiusSlider.style.display = 'none';
    if (min_radSlier) min_radSlier.style.display = 'none';
    if (maj_radSlider) maj_radSlider.style.display = 'none';
    //if (distanceSlider) distanceSlider.style.display = 'none';
    if (longSlider) longSlider.style.display = 'none';
    if (widthSlider) widthSlider.style.display = 'none';
    if (heightSlider) heightSlider.style.display = 'flex';

    const p = sceneData.pyramids[index];
    if (!p) { if (info) info.textContent = 'Editing: none'; return; }
    if (info) info.textContent = `Editing: Pyramid [${index}]`;

    $("input-pos-x").value = p.center[0];
    $("val-pos-x").textContent = Number(p.center[0]).toFixed(1);
    $("input-pos-y").value = p.center[1];
    $("val-pos-y").textContent = Number(p.center[1]).toFixed(1);
    $("input-pos-z").value = p.center[2];
    $("val-pos-z").textContent = Number(p.center[2]).toFixed(1);
    $("input-height").value = p.height;
    $("val-height").textContent = Number(p.height).toFixed(1);
    $("input-color").value = rgbToHex(p.color);

  /*} else if (type === 'plan') {

    if (radiusSlider) radiusSlider.style.display = 'none';
    if (min_radSlier) min_radSlier.style.display = 'none';
    if (maj_radSlider) maj_radSlider.style.display = 'none';
    if (distanceSlider) distanceSlider.style.display = 'flex';
    if (longSlider) longSlider.style.display = 'none';
    if (widthSlider) widthSlider.style.display = 'none';
    if (heightSlider) heightSlider.style.display = 'none';

    const p = sceneData.plans[index];
    if (!p) { if (info) info.textContent = 'Editing: none'; return; }
    if (info) info.textContent = `Editing: Plan [${index}]`;
    $("input-pos-x").value = p.normal[0];
    $("val-pos-x").textContent = Number(p.normal[0]).toFixed(1);
    $("input-pos-y").value = p.normal[1];
    $("val-pos-y").textContent = Number(p.normal[1]).toFixed(1);
    $("input-pos-z").value = p.normal[2];
    $("val-pos-z").textContent = Number(p.normal[2]).toFixed(1);
    $("input-dist").value = p.distance;
    $("val-dist").textContent = Number(p.distance).toFixed(1);
    $("input-color").value = rgbToHex(p.color);*/

  } else if (type === 'torus') {

    radiusSlider.style.display = 'none';
    min_radSlier.style.display = 'flex';
    maj_radSlider.style.display = 'flex';
    //distanceSlider.style.display = 'none';
    longSlider.style.display = 'none';
    widthSlider.style.display = 'none';
    heightSlider.style.display = 'none';

    const t = sceneData.torus[index];
    if (!t) { info.textContent = 'Editing: none'; return; }

    info.textContent = `Editing: Torus [${index}]`;

    $("input-pos-x").value = t.center[0];
    $("val-pos-x").textContent = Number(t.center[0]).toFixed(1);
    $("input-pos-y").value = t.center[1];
    $("val-pos-y").textContent = Number(t.center[1]).toFixed(1);
    $("input-pos-z").value = t.center[2];
    $("val-pos-z").textContent = Number(t.center[2]).toFixed(1);
    $("input-min_rad").value = t.minor_radius;
    $("val-min_rad").textContent = Number(t.minor_radius).toFixed(1);
    $("input-maj_rad").value = t.major_radius;
    $("val-maj_rad").textContent = Number(t.major_radius).toFixed(1);
    $("input-color").value = rgbToHex(t.color);

  } else {
    // fallback
    if (radiusSlider) radiusSlider.style.display = 'flex';
    //if (distanceSlider) distanceSlider.style.display = 'flex';
    if (longSlider) longSlider.style.display = 'flex';
    if (widthSlider) widthSlider.style.display = 'flex';
    if (heightSlider) heightSlider.style.display = 'flex';

    if (info) info.textContent = 'Editing: none';
    $("input-pos-x").value = 0; $("val-pos-x").textContent = "0.0";
    $("input-pos-y").value = 0; $("val-pos-y").textContent = "0.0";
    $("input-pos-z").value = 0; $("val-pos-z").textContent = "0.0";
    $("input-long").value = 1; $("val-long").textContent = "1.0";
    $("input-color").value = "#ff4d4d";
  }
}
window.selectObject = selectObject;


// wire inputs
(function wireInputs() {
  const ipx = $("input-pos-x");
  const ipy = $("input-pos-y");
  const ipz = $("input-pos-z");
  const irad=$("input-rad");
  const ilong = $("input-long");
  const iwidth = $("input-width");
  const iheight = $("input-height");
  //const idist = $("input-dist");
  const imajrad = $("input-maj_rad");
  const iminrad = $("input-min_rad");
  const ic = $("input-color");
  const vpx = $("val-pos-x");
  const vpy = $("val-pos-y");
  const vpz = $("val-pos-z");
  const vrad= $("val-rad");
  const vmajrad = $("val-maj_rad");
  const vminrad = $("val-min_rad");
  const vlong = $("val-long");
  const vwidth = $("val-width");
  const vheight = $("val-height");
  //const vdist = $("val-dist");

  if (!ipx || !ipy || !ipz || !ilong || !iwidth || !iheight || !ic ||
    !vpx || !vpy || !vpz || !vlong || !vwidth || !vheight) return;

  function writeAndRefresh() {
    updateScene();
    updateSceneUI();
    console.log("Scene updated (selected):", selected);
  }

  ipx.oninput = () => {
    vpx.textContent = Number(ipx.value).toFixed(1);
    if (selected.type === 'sphere' && sceneData.spheres[selected.index]) {
      sceneData.spheres[selected.index].center[0] = parseFloat(ipx.value);
      writeAndRefresh();
    } else if (selected.type === 'box' && sceneData.boxes[selected.index]) {
      sceneData.boxes[selected.index].center[0] = parseFloat(ipx.value);
      writeAndRefresh();
    } else if (selected.type === 'torus' && sceneData.torus[selected.index]) {
      sceneData.torus[selected.index].center[0] = parseFloat(ipx.value); // CHANGED to .normal[0]
      writeAndRefresh();
    } else if (selected.type === 'pyramid' && sceneData.pyramids[selected.index]) {
      sceneData.pyramids[selected.index].center[0] = parseFloat(ipx.value);
      writeAndRefresh();
      /*else if (selected.type === 'plan' && sceneData.plans[selected.index]) {
      sceneData.plans[selected.index].normal[0] = parseFloat(ipx.value); // CHANGED to .normal[0]
      writeAndRefresh();*/
    }
  };

  ipy.oninput = () => {
    vpy.textContent = Number(ipy.value).toFixed(1);
    const invertedY = parseFloat(ipy.value);
    if (selected.type === 'sphere' && sceneData.spheres[selected.index]) {
      sceneData.spheres[selected.index].center[1] = invertedY;
      writeAndRefresh();
    } else if (selected.type === 'box' && sceneData.boxes[selected.index]) {
      sceneData.boxes[selected.index].center[1] = invertedY;
      writeAndRefresh();
    } else if (selected.type === 'torus' && sceneData.torus[selected.index]) {
      sceneData.torus[selected.index].center[1] = invertedY;
      writeAndRefresh();
    } else if (selected.type === 'pyramid' && sceneData.pyramids[selected.index]) {
      sceneData.pyramids[selected.index].center[1] = invertedY;
      writeAndRefresh();
    }

    /*}
    else if (selected.type === 'plan' && sceneData.plans[selected.index]) {
      sceneData.plans[selected.index].normal[1] = invertedY; // CHANGED to .normal[1]
      writeAndRefresh();
    }*/
  };

  ipz.oninput = () => {
    vpz.textContent = Number(ipz.value).toFixed(1);
    const invertedZ = parseFloat(ipz.value);
    if (selected.type === 'sphere' && sceneData.spheres[selected.index]) {
      sceneData.spheres[selected.index].center[2] = invertedZ;
      writeAndRefresh();
    } else if (selected.type === 'box' && sceneData.boxes[selected.index]) {
      sceneData.boxes[selected.index].center[2] = invertedZ;
      writeAndRefresh();
    } else if (selected.type === 'torus' && sceneData.torus[selected.index]) {
      sceneData.torus[selected.index].center[2] = invertedZ;
      writeAndRefresh();
    } else if (selected.type === 'pyramid' && sceneData.pyramids[selected.index]) {
      sceneData.pyramids[selected.index].center[2] = invertedZ;
      writeAndRefresh();
    }
     /*}else if (selected.type === 'plan' && sceneData.plans[selected.index]) {
      sceneData.plans[selected.index].normal[2] = invertedZ;
      writeAndRefresh();
    }*/
   };

   if (irad && vrad) {
    irad.oninput = () => {
      vrad.textContent = Number(irad.value).toFixed(1);
      if (selected.type === 'sphere' && sceneData.spheres[selected.index]) {
        sceneData.spheres[selected.index].radius = parseFloat(irad.value);
        writeAndRefresh();
      }
    };
  }

  if (iminrad && vminrad) {
    iminrad.oninput = () => {
      vminrad.textContent = Number(iminrad.value).toFixed(1);
      if (selected.type === 'torus' && sceneData.torus[selected.index]) {
        sceneData.torus[selected.index].minor_radius = parseFloat(iminrad.value);
        writeAndRefresh();
      }
    };
  }

  if (imajrad && vmajrad) {
    imajrad.oninput = () => {
      vmajrad.textContent = Number(imajrad.value).toFixed(1);
      if (selected.type === 'torus' && sceneData.torus[selected.index]) {
        sceneData.torus[selected.index].major_radius = parseFloat(imajrad.value);
        writeAndRefresh();
      }
    };
  }

  if (ilong && vlong) {
    ilong.oninput = () => {
      vlong.textContent = Number(ilong.value).toFixed(1);
      if (selected.type === 'box' && sceneData.boxes[selected.index]) {
        sceneData.boxes[selected.index].size[0] = parseFloat(ilong.value);
        writeAndRefresh();
      }
    };
  }

  if (iwidth && vwidth) {
    iwidth.oninput = () => {
      vwidth.textContent = Number(iwidth.value).toFixed(1);
      if (selected.type === 'box' && sceneData.boxes[selected.index]) {
        sceneData.boxes[selected.index].size[1] = parseFloat(iwidth.value);
        writeAndRefresh();
      }
    };
  }

  // Handler for Box Height (size[2])
  if (iheight && vheight) {
    iheight.oninput = () => {
      vheight.textContent = Number(iheight.value).toFixed(1);
      if (selected.type === 'box' && sceneData.boxes[selected.index]) {
        sceneData.boxes[selected.index].size[2] = parseFloat(iheight.value);
        writeAndRefresh();
      } else if (selected.type === 'pyramid' && sceneData.pyramids[selected.index]) {
        sceneData.pyramids[selected.index].height = parseFloat(iheight.value);
        writeAndRefresh();
      }
    };
  }

  /*if (idist && vdist) {
    idist.oninput = () => {
      vdist.textContent = Number(idist.value).toFixed(1);
      if (selected.type === 'plan' && sceneData.plans[selected.index]) {
        sceneData.plans[selected.index].distance = parseFloat(idist.value);
        writeAndRefresh();
      }
    };
  }*/

  if (ic) {
    ic.oninput = () => {
      const c = hexToRgb(ic.value);
      if (selected.type === 'sphere' && sceneData.spheres[selected.index]) {
        sceneData.spheres[selected.index].color = c;
        writeAndRefresh();
      } else if (selected.type === 'box' && sceneData.boxes[selected.index]) {
        sceneData.boxes[selected.index].color = c;
        writeAndRefresh();
      /*} else if (selected.type === 'plan' && sceneData.plans[selected.index]) {
        sceneData.plans[selected.index].color = c;
        writeAndRefresh();*/
      } else if (selected.type === 'torus' && sceneData.torus[selected.index]) {
        sceneData.torus[selected.index].color = c;
        writeAndRefresh();

      } else if (selected.type === 'pyramid' && sceneData.pyramids[selected.index]) {
        sceneData.pyramids[selected.index].color = c;
        writeAndRefresh();
      }
    };
  }
})();

// --------------------------------------------
// RENDER LOOP
// --------------------------------------------
function resizeCanvas() {
  const dpr = devicePixelRatio || 1;
  if (!canvas || !canvasContainer) return;
  canvas.width = Math.max(1, Math.floor(canvasContainer.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvasContainer.clientHeight * dpr));
  canvas.style.width = canvasContainer.clientWidth + "px";
  canvas.style.height = canvasContainer.clientHeight + "px";
}

window.addEventListener("resize", resizeCanvas);

function render() {
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  let elapsedTime;
    if (!isCameraPaused) {
        elapsedTime = (currentTime - startTime) / 1000.0;
        // Store the time when paused to maintain a consistent view
        window.staticTime = elapsedTime;
    } else {
        // Use the time recorded right before pausing
        elapsedTime = window.staticTime;
    }

  // update uniforms buffer (float32)
  if (device && uniformBuffer) {
    try {
      const data = new Float32Array([
        canvas.width, canvas.height,
        elapsedTime, deltaTime,
        mouseX, mouseY, mouseDown ? 1 : 0, 0,
        frameCount, 0, 0, 0
      ]);
      device.queue.writeBuffer(uniformBuffer, 0, data.buffer);
    } catch (e) {
      // ignore write errors if device not ready
    }
  }

  // update uniforms UI safely
  safeSet("u-resolution", uniforms.resolution.update(canvas.width, canvas.height));
  safeSet("u-time", uniforms.time.update(elapsedTime));
  safeSet("u-deltaTime", uniforms.deltaTime.update(deltaTime));
  safeSet("u-mousexy", uniforms.mousexy.update(mouseX, mouseY));
  safeSet("u-frame", uniforms.frame.update(frameCount));
  // mouse indicator (updates style)
  const mi = $("mouse-ind");
  if (mi) {
    if (uniforms.mousez.update) uniforms.mousez.update(mouseDown);
  }

  lastFrameTime = currentTime;

  // draw using WebGPU pipeline
  if (pipeline && device && context) {
    try {
      const encoder = device.createCommandEncoder();
      const view = context.getCurrentTexture().createView();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view,
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store"
        }]
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
      device.queue.submit([encoder.finish()]);
    } catch (e) {
      // if frame submission fails, log once
      // console.warn("render submit failed:", e);
    }
  }

  // FPS display (throttled)
  if (++frameCount && (currentTime - lastFpsUpdate) > 100) {
    const fps = Math.round(frameCount / ((currentTime - lastFpsUpdate) / 1000));
    safeSet("fps", fps.toString());
    safeSet("frame-time", `${((currentTime - lastFpsUpdate) / frameCount).toFixed(1)}ms`);
    frameCount = 0;
    lastFpsUpdate = currentTime;
  }

  requestAnimationFrame(render);
}

window.staticTime = 0;

// --------------------------------------------
// FULLSCREEN UI
// --------------------------------------------
function toggleFullscreen() {
  const elem = canvasContainer || document.documentElement;
  if (!document.fullscreenElement) elem.requestFullscreen?.();
  else document.exitFullscreen?.();
}
$("fullscreen-btn")?.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  const enter = $("fullscreen-enter-icon");
  const exit = $("fullscreen-exit-icon");
  const editorC = editorContainer;
  const canvasC = canvasContainer;
  if (document.fullscreenElement) {
    enter?.classList.add("hidden");
    exit?.classList.remove("hidden");
    if (editorC) editorC.style.display = "none";
    if (canvasC) { canvasC.classList.add("w-full"); canvasC.classList.add("h-full"); }
  } else {
    enter?.classList.remove("hidden");
    exit?.classList.add("hidden");
    if (editorC) editorC.style.display = "";
    if (canvasC) { canvasC.classList.remove("w-full"); canvasC.classList.remove("h-full"); }
  }
  setTimeout(resizeCanvas, 50);
});

// --------------------------------------------
// KEYBINDS
// --------------------------------------------
document.addEventListener("keydown", (e) => {
  // ctrl/cmd+enter: compile
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    const code = editor?.getValue?.() || "";
    compileShader(vertexShader, uniformsStruct, sceneStruct, code);
  }
  // f fullscreen toggle (avoid if editing)
  if (e.key === "f" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    if (!editor || document.activeElement !== editor.getInputField()) {
      e.preventDefault();
      toggleFullscreen();
    }
  }
});

// --------------------------------------------
// INITIALIZE EVERYTHING
// --------------------------------------------
(async function mainInit() {
  console.log("🚀 Starting initialization...");

  // build uniforms table rows (stable ids)
  buildUniformsTable();

  // load initial shaders
  const initial = await loadInitialShaders();
  // variables vertexShader, uniformsStruct, sceneStruct, fallbackShader are set by loader

  // init editor
  editor = initCodeMirror();
  console.log("✅ CodeMirror initialized");

  // set fallback / initial content in editor
  editor.setValue(fallbackShader || "// fallback shader loaded");

  // resize canvas to layout
  resizeCanvas();
  console.log("✅ Canvas resized");

  // init WebGPU
  const gpuReady = await initWebGPU();
  console.log("✅ WebGPU initialized:", gpuReady);

  // wire compile button
  if (compileBtn) {
    compileBtn.onclick = async () => {

        // 1. Stop/Start the camera turning
        isCameraPaused = !isCameraPaused;
        compileBtn.textContent = isCameraPaused ? "▶ Start Camera" : "⏸ Pause Camera";

        // 2. Compile the shader (original functionality)
        const userCode = editor.getValue();
        const fullShaderCode = `${uniformsStruct}\n${sceneStruct}\n${userCode}`;
        await compileShader(vertexShader, uniformsStruct, sceneStruct, userCode);
    };

    // Set initial text for clarity
    compileBtn.textContent = "⏸ Pause Camera";
  }

  // load main shader (will compile)
  if (gpuReady) {
    await loadMainShader();
  }

  // start UI and render
  updateSceneUI();
  requestAnimationFrame(render);

  console.log("✅ Init complete");
})();
