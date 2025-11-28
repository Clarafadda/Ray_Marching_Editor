// main.js

// ============================================
// SCENE CONFIGURATION
// ============================================

const MAX_SPHERES = 5;
const MAX_BOXES = 3;

const SPHERE_SIZE = 32;
const BOX_SIZE = 48;
const SCENE_HEADER_SIZE = 16;
const SCENE_SIZE = (SPHERE_SIZE * MAX_SPHERES) + (BOX_SIZE * MAX_BOXES) + SCENE_HEADER_SIZE;

const sceneData = {
    spheres: [
        { center: [0, 1, 0], radius: 1.0, color: [1.0, 0.3, 0.3] },
        { center: [2.5, 0.7, 0], radius: 0.7, color: [0.3, 1.0, 0.3] },
        { center: [-2.5, 0.5, 0], radius: 0.5, color: [0.3, 0.3, 1.0] },
    ],
    boxes: [
        { center: [0, -0.5, 0], size: [5, 0.1, 5], color: [0.5, 0.5, 0.5] },
    ],
    num_spheres: 3,
    num_boxes: 1,
};

function createSceneArrayBuffer(data) {
    const buffer = new ArrayBuffer(SCENE_SIZE);
    const view = new DataView(buffer);
    let offset = 0;

    for (let i = 0; i < MAX_SPHERES; i++) {
        if (i < data.num_spheres && data.spheres[i]) {
            const sphere = data.spheres[i];
            view.setFloat32(offset + 0, sphere.center[0], true);
            view.setFloat32(offset + 4, sphere.center[1], true);
            view.setFloat32(offset + 8, sphere.center[2], true);
            view.setFloat32(offset + 12, sphere.radius, true);
            view.setFloat32(offset + 16, sphere.color[0], true);
            view.setFloat32(offset + 20, sphere.color[1], true);
            view.setFloat32(offset + 24, sphere.color[2], true);
            view.setFloat32(offset + 28, 0, true);
        } else {
            for (let j = 0; j < SPHERE_SIZE; j += 4) {
                view.setFloat32(offset + j, 0, true);
            }
        }
        offset += SPHERE_SIZE;
    }

    for (let i = 0; i < MAX_BOXES; i++) {
        if (i < data.num_boxes && data.boxes[i]) {
            const box = data.boxes[i];
            view.setFloat32(offset + 0, box.center[0], true);
            view.setFloat32(offset + 4, box.center[1], true);
            view.setFloat32(offset + 8, box.center[2], true);
            view.setFloat32(offset + 12, 0, true);
            view.setFloat32(offset + 16, box.size[0], true);
            view.setFloat32(offset + 20, box.size[1], true);
            view.setFloat32(offset + 24, box.size[2], true);
            view.setFloat32(offset + 28, 0, true);
            view.setFloat32(offset + 32, box.color[0], true);
            view.setFloat32(offset + 36, box.color[1], true);
            view.setFloat32(offset + 40, box.color[2], true);
            view.setFloat32(offset + 44, 0, true);
        } else {
            for (let j = 0; j < BOX_SIZE; j += 4) {
                view.setFloat32(offset + j, 0, true);
            }
        }
        offset += BOX_SIZE;
    }

    view.setUint32(offset + 0, data.num_spheres, true);
    view.setUint32(offset + 4, data.num_boxes, true);
    view.setUint32(offset + 8, 0, true);
    view.setUint32(offset + 12, 0, true);

    return buffer;
}

function updateScene() {
    if (device && sceneBuffer) {
        device.queue.writeBuffer(sceneBuffer, 0, createSceneArrayBuffer(sceneData));
    }
}

window.sceneData = sceneData;
window.updateScene = updateScene;

// ============================================
// SHADER LOADING
// ============================================

async function loadInitialShaders() {
  try {
    const vertexResp = await fetch("./shaders/vertex.wgsl");
    const vertexShader = await vertexResp.text();

    const uniformsResp = await fetch("./shaders/uniforms.wgsl");
    const uniformsStruct = await uniformsResp.text();

    const sceneResp = await fetch("./shaders/scene.wgsl");
    const sceneStruct = await sceneResp.text();

    const fallbackResp = await fetch("./shaders/fallback.wgsl");
    const fallbackShader = await fallbackResp.text();

    return {
      vertexShader,
      uniformsStruct,
      sceneStruct,
      fallbackShader
    };

  } catch (e) {
    console.error("Failed to load initial shaders:", e);
    return {
      vertexShader: "",
      uniformsStruct: "",
      sceneStruct: "",
      fallbackShader: ""
    };
  }
}

async function loadMainShader() {
  try {
    const response = await fetch("./shaders/raymarch_scene.wgsl");
    if (response.ok) {
      const mainShader = await response.text();
      editor.setValue(mainShader);
      await compileShader(vertexShader, uniformsStruct, sceneStruct, mainShader);
      console.log("✅ Loaded raymarch_scene.wgsl");
    } else {
      console.warn("Failed to load raymarch_scene.wgsl, using fallback");
      editor.setValue(fallbackShader);
      await compileShader(vertexShader, uniformsStruct, sceneStruct, fallbackShader);
    }
  } catch(e) {
    console.error("Error loading main shader:", e);
    editor.setValue(fallbackShader);
    await compileShader(vertexShader, uniformsStruct, sceneStruct, fallbackShader);
  }
}

// ============================================
// CODEMIRROR SETUP
// ============================================

function initCodeMirror() {
  CodeMirror.defineSimpleMode("wgsl", {
    start: [
      { regex: /\b(fn|let|var|const|if|else|for|while|loop|return|break|continue|discard|switch|case|default|struct|type|alias)\b/, token: "keyword" },
      { regex: /\b(bool|i32|u32|f32|f16|vec2|vec3|vec4|mat2x2|mat3x3|mat4x4|array|sampler|texture_2d|texture_3d)\b/, token: "type" },
      { regex: /\b(vec2|vec3|vec4|mat2x2|mat3x3|mat4x4|array)<[^>]+>/, token: "type" },
      { regex: /\b(abs|acos|all|any|asin|atan|atan2|ceil|clamp|cos|cosh|cross|degrees|determinant|distance|dot|exp|exp2|faceforward|floor|fma|fract|frexp|inversesqrt|ldexp|length|log|log2|max|min|mix|modf|normalize|pow|radians|reflect|refract|round|sign|sin|sinh|smoothstep|sqrt|step|tan|tanh|transpose|trunc)\b/, token: "builtin" },
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

// ============================================
// WEBGPU VARIABLES
// ============================================

let device, context, pipeline, uniformBuffer, bindGroup, sceneBuffer;
let startTime = performance.now();
let lastFrameTime = startTime;
let frameCount = 0;
let lastFpsUpdate = startTime;
let mouseX = 0, mouseY = 0, mouseDown = false;
let isPanelOpen = true, isFullscreen = false;

// ============================================
// DOM SHORTCUTS
// ============================================

const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const errorMsg = $("error-message");
const compileBtn = $("compile-btn");
const fullscreenBtn = $("fullscreen-btn");
const fullscreenEnterIcon = $("fullscreen-enter-icon");
const fullscreenExitIcon = $("fullscreen-exit-icon");
const canvasContainer = $("canvas-container");
const editorContainer = $("editor-container");

// ============================================
// UNIFORMS DISPLAY
// ============================================

const uniforms = {
  resolution: { label: "resolution", initial: "0 × 0", update: (w,h)=>`${w} × ${h}` },
  time: { label: "time", initial: "0.00s", update: (t)=>`${t.toFixed(2)}s` },
  deltaTime: { label: "deltaTime", initial: "0.00ms", update: (dt)=>`${(dt*1000).toFixed(2)}ms` },
  mousexy: { label: "mouse.xy", initial: "0,0", update: (x,y)=>`${Math.round(x)}, ${Math.round(y)}` },
  mousez: {
    label: "mouse.z",
    initial: '<span class="inline-block w-2 h-2 rounded-full" id="mouse-ind" style="background:#928374"></span>',
    update: (down) => { $("mouse-ind").style.background = down ? "#b8bb26" : "#928374"; return null; }
  },
  frame: { label: "frame", initial:"0", update: (f)=>f.toString() }
};

$("uniforms-table").innerHTML = Object.entries(uniforms).map(([key,u])=>
  `<tr class="border-b" style="border-color:#3c3836"><td class="py-1.5 font-semibold" style="color:#fe8019">${u.label}</td><td class="py-1.5 text-right font-mono" id="u-${key}">${u.initial}</td></tr>`
).join("");

// ============================================
// MOUSE HANDLING
// ============================================

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  [mouseX, mouseY] = [(e.clientX - rect.left)*dpr, (e.clientY - rect.top)*dpr];
});
canvas.addEventListener("mousedown", ()=>mouseDown=true);
canvas.addEventListener("mouseup", ()=>mouseDown=false);
canvas.addEventListener("mouseleave", ()=>mouseDown=false);

// ============================================
// PANEL TOGGLE
// ============================================

$("panel-toggle").onclick = () => {
  isPanelOpen = !isPanelOpen;
  $("scene-editor-panel").style.width = isPanelOpen ? "300px" : "20px";
  $("panel-content").style.display = isPanelOpen ? "flex" : "none";
  $("toggle-arrow").textContent = isPanelOpen ? "▶" : "◀";
};

// ============================================
// WEBGPU INIT
// ============================================

async function initWebGPU() {
  if(!navigator.gpu) {
    errorMsg.textContent="WebGPU not supported";
    errorMsg.classList.remove("hidden");
    return false;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if(!adapter) {
    errorMsg.textContent="No GPU adapter";
    errorMsg.classList.remove("hidden");
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

  device.queue.writeBuffer(sceneBuffer, 0, createSceneArrayBuffer(sceneData));

  return true;
}

// ============================================
// COMPILE SHADER
// ============================================

async function compileShader(vertexShader, uniformsStruct, sceneStruct, fragmentCode) {
  const start = performance.now();
  try {
    errorMsg.classList.add("hidden");

    const code = vertexShader + "\n" + uniformsStruct + "\n" + sceneStruct + "\n" + fragmentCode;

    const shaderModule = device.createShaderModule({ code });
    const info = await shaderModule.getCompilationInfo();
    const lineOffset = (vertexShader + "\n" + uniformsStruct + "\n" + sceneStruct).split("\n").length;

    const errors = info.messages.filter(m=>m.type==="error").map(m=>{
      const fragLine = m.lineNum - lineOffset;
      return fragLine>0? `Line ${fragLine}: ${m.message}` : `Line ${m.lineNum}: ${m.message}`;
    }).join("\n");

    if(errors) {
      errorMsg.textContent="Shader error:\n"+errors;
      errorMsg.classList.remove("hidden");
      return;
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: "read-only-storage" }
          }
        ],
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

    // Optional: display compile time if element exists
    const compileTimeEl = $("compile-time");
    if (compileTimeEl) {
      compileTimeEl.textContent = `${(performance.now() - start).toFixed(2)}ms`;
    }

  } catch(e) {
    errorMsg.textContent = "Compile error: "+e.message;
    errorMsg.classList.remove("hidden");
    console.error("Compile error:", e);
  }
}

// ============================================
// RENDER LOOP
// ============================================

function render() {
  if(!pipeline) return;
  const currentTime = performance.now();
  const deltaTime = (currentTime-lastFrameTime)/1000;
  const elapsedTime = (currentTime-startTime)/1000;

  const data = [
    canvas.width, canvas.height,
    elapsedTime, deltaTime,
    mouseX, mouseY, mouseDown?1:0, 0,
    frameCount, 0, 0, 0
  ];
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array(data));

  // Update uniforms display (check if elements exist)
  const resEl = $("u-resolution");
  const timeEl = $("u-time");
  const deltaEl = $("u-deltaTime");
  const mouseEl = $("u-mousexy");
  const frameEl = $("u-frame");

  if (resEl) resEl.textContent = uniforms.resolution.update(canvas.width,canvas.height);
  if (timeEl) timeEl.textContent = uniforms.time.update(elapsedTime);
  if (deltaEl) deltaEl.textContent = uniforms.deltaTime.update(deltaTime);
  if (mouseEl) mouseEl.textContent = uniforms.mousexy.update(mouseX,mouseY);
  if (frameEl) frameEl.textContent = uniforms.frame.update(frameCount);
  uniforms.mousez.update(mouseDown);

  lastFrameTime = currentTime;

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments:[{
      view: context.getCurrentTexture().createView(),
      loadOp:"clear",
      clearValue:{r:0,g:0,b:0,a:1},
      storeOp:"store"
    }]
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);

  if(++frameCount && currentTime-lastFpsUpdate>100) {
    const fps = Math.round(frameCount/((currentTime-lastFpsUpdate)/1000));
    $("fps").textContent = fps;
    $("frame-time").textContent = `${((currentTime-lastFpsUpdate)/frameCount).toFixed(1)}ms`;
    frameCount=0;
    lastFpsUpdate=currentTime;
  }

  requestAnimationFrame(render);
}

// ============================================
// CANVAS RESIZE
// ============================================

function resizeCanvas() {
  const dpr = devicePixelRatio||1;
  canvas.width = canvasContainer.clientWidth*dpr;
  canvas.height = canvasContainer.clientHeight*dpr;
  canvas.style.width = canvasContainer.clientWidth+"px";
  canvas.style.height = canvasContainer.clientHeight+"px";
}

window.addEventListener("resize", resizeCanvas);

compileBtn.onclick = () => {
  compileShader(vertexShader, uniformsStruct, sceneStruct, editor.getValue());
};

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    compileShader(vertexShader, uniformsStruct, sceneStruct, editor.getValue());
  }
});

// ============================================
// FULLSCREEN HANDLING
// ============================================

function toggleFullscreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement &&
      !document.mozFullScreenElement && !document.msFullscreenElement) {
    const elem = canvasContainer;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

function updateFullscreenUI() {
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement ||
                            document.mozFullScreenElement || document.msFullscreenElement;

  isFullscreen = !!fullscreenElement;
  if (isFullscreen) {
    fullscreenEnterIcon.classList.add("hidden");
    fullscreenExitIcon.classList.remove("hidden");
    editorContainer.style.display = "none";
    canvasContainer.classList.remove("landscape:w-1/2", "portrait:h-1/2");
    canvasContainer.classList.add("w-full", "h-full");
  } else {
    fullscreenEnterIcon.classList.remove("hidden");
    fullscreenExitIcon.classList.add("hidden");
    editorContainer.style.display = "";
    canvasContainer.classList.remove("w-full", "h-full");
    canvasContainer.classList.add("landscape:w-1/2", "portrait:h-1/2");
  }

  setTimeout(resizeCanvas, 50);
}

fullscreenBtn.onclick = toggleFullscreen;
document.addEventListener("fullscreenchange", updateFullscreenUI);
document.addEventListener("webkitfullscreenchange", updateFullscreenUI);
document.addEventListener("mozfullscreenchange", updateFullscreenUI);
document.addEventListener("MSFullscreenChange", updateFullscreenUI);

document.addEventListener("keydown", (e) => {
  if (e.key === "f" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    if (document.activeElement !== editor.getInputField()) {
      e.preventDefault();
      toggleFullscreen();
    }
  }
});

// ============================================
// MAIN INITIALIZATION
// ============================================

let editor, vertexShader, uniformsStruct, sceneStruct, fallbackShader;

(async () => {
  console.log("🚀 Starting initialization...");

  // Load shaders
  ({ vertexShader, uniformsStruct, sceneStruct, fallbackShader } = await loadInitialShaders());
  console.log("✅ Initial shaders loaded");

  // Initialize editor
  editor = initCodeMirror();
  console.log("✅ CodeMirror initialized");

  // Setup canvas
  resizeCanvas();
  console.log("✅ Canvas resized");

  // Initialize WebGPU
  const gpuReady = await initWebGPU();
  console.log("✅ WebGPU initialized:", gpuReady);

  if (gpuReady) {
    // Load main shader
    await loadMainShader();

    // Start rendering
    render();
    console.log("✅ Render loop started");
  }
})();