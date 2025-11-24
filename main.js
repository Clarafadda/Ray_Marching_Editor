// main.js

const shaders = {};
let fallbackShader = "";

async function loadInitialShaders() {
  // Charger le shader de fallback
  try {
    const response = await fetch("./shaders/fallback.wgsl");
    fallbackShader = await response.text();
  } catch (e) {
    console.error("Failed to load fallback shader:", e);
    fallbackShader = `
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord.xy / vec2<f32>(800.0, 600.0);
  return vec4<f32>(uv, 0.5, 1.0);
}`;
  }

  // Charger vertexShader
  let vertexShader = "";
  try {
    const vtxResp = await fetch("./shaders/vertex.wgsl");
    vertexShader = await vtxResp.text();
  } catch (e) {
    console.warn("Vertex shader not loaded, using default");
    vertexShader = `
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}`;
  }

  // Charger uniformsStruct
  let uniformsStruct = "";
  try {
    const uniResp = await fetch("./shaders/uniforms.wgsl");
    uniformsStruct = await uniResp.text();
  } catch (e) {
    console.warn("Uniforms struct not loaded, using default");
    uniformsStruct = `
struct Uniforms {
  resolution: vec2<f32>;
  time: f32;
  deltaTime: f32;
  mousexy: vec2<f32>;
  mousez: f32;
  frame: f32;
};`;
  }

  return { vertexShader, uniformsStruct };
}

// Après avoir chargé fallbackShader, vertexShader et uniformsStruct
async function loadShaders() {
  let manifest = null;

  try {
    const manifestResp = await fetch("./shaders/manifest.json");
    if (manifestResp.ok) manifest = await manifestResp.json();
  } catch(e) { console.warn("No manifest found"); }

  const shaderList = manifest?.shaders || [
    { file: "mouse.wgsl", name: "Mouse Interaction" }
  ];

  for(const shaderInfo of shaderList) {
    try {
      const response = await fetch(`./shaders/${shaderInfo.file}`);
      if(response.ok) {
        const content = await response.text();
        shaders[shaderInfo.file] = {
          content,
          name: shaderInfo.name || shaderInfo.file.replace(".wgsl",""),
          description: shaderInfo.description || ""
        };
      }
    } catch(e) { console.error(`Failed to load shader ${shaderInfo.file}`, e); }
  }

  // Mettre à jour le select
  while(shaderSelector.options.length>1) shaderSelector.remove(1);
  Object.keys(shaders).forEach(file => {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = shaders[file].name;
    if(shaders[file].description) option.title = shaders[file].description;
    shaderSelector.appendChild(option);
  });

  // Choisir le premier shader ou fallback
  const firstShader = Object.keys(shaders)[0];
  if(firstShader) {
    editor.setValue(shaders[firstShader].content);
    compileShader(vertexShader, uniformsStruct, shaders[firstShader].content);
    shaderSelector.value = firstShader;
  } else {
    editor.setValue(fallbackShader);
    compileShader(vertexShader, uniformsStruct, fallbackShader);
  }
}


// Initialisation de CodeMirror
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
    value: fallbackShader,
    tabSize: 2,
    indentUnit: 2,
    viewportMargin: Infinity,
    scrollbarStyle: "native",
  });

  editor.setValue(fallbackShader);
  return editor;
}

// Variables WebGPU
let device, context, pipeline, uniformBuffer, bindGroup;
let startTime = performance.now();
let lastFrameTime = startTime;
let frameCount = 0;
let lastFpsUpdate = startTime;
let mouseX = 0, mouseY = 0, mouseDown = false;
let isPanelOpen = true, isFullscreen = false;

// Raccourcis DOM
const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const errorMsg = $("error-message");
const compileBtn = $("compile-btn");
const fullscreenBtn = $("fullscreen-btn");
const fullscreenEnterIcon = $("fullscreen-enter-icon");
const fullscreenExitIcon = $("fullscreen-exit-icon");
const canvasContainer = $("canvas-container");
const editorContainer = $("editor-container");
const shaderSelector = $("shader-selector");

// Uniforms
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

// Gestion de la souris
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  [mouseX, mouseY] = [(e.clientX - rect.left)*dpr, (e.clientY - rect.top)*dpr];
});
canvas.addEventListener("mousedown", ()=>mouseDown=true);
canvas.addEventListener("mouseup", ()=>mouseDown=false);
canvas.addEventListener("mouseleave", ()=>mouseDown=false);

// Toggle panel
$("panel-toggle").onclick = () => {
  isPanelOpen = !isPanelOpen;
  $("uniforms-panel").style.width = isPanelOpen ? "250px" : "24px";
  $("panel-content").style.display = isPanelOpen ? "flex" : "none";
  $("toggle-arrow").textContent = isPanelOpen ? "▶" : "◀";
};

// WebGPU init
async function initWebGPU() {
  if(!navigator.gpu) return (errorMsg.textContent="WebGPU not supported", false);
  const adapter = await navigator.gpu.requestAdapter();
  if(!adapter) return (errorMsg.textContent="No GPU adapter", false);
  device = await adapter.requestDevice();
  context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });
  uniformBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  return true;
}

// Compile shader
async function compileShader(vertexShader, uniformsStruct, fragmentCode) {
  try {
    errorMsg.classList.add("hidden");
    const code = vertexShader + "\n" + uniformsStruct + "\n" + fragmentCode;
    const shaderModule = device.createShaderModule({ code });
    const info = await shaderModule.getCompilationInfo();
    const lineOffset = (vertexShader + "\n" + uniformsStruct).split("\n").length;
    const errors = info.messages.filter(m=>m.type==="error").map(m=>{
      const fragLine = m.lineNum - lineOffset;
      return fragLine>0? `Line ${fragLine}: ${m.message}` : `Line ${m.lineNum}: ${m.message}`;
    }).join("\n");
    if(errors) return (errorMsg.textContent="Shader error:\n"+errors,errorMsg.classList.remove("hidden"));

    const format = navigator.gpu.getPreferredCanvasFormat();
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type:"uniform" } }],
    });

    pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: { module: shaderModule, entryPoint: "vs_main" },
      fragment: { module: shaderModule, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" }
    });

    bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });

  } catch(e) {
    errorMsg.textContent = "Compile error: "+e.message;
    errorMsg.classList.remove("hidden");
  }
}

// Render loop
function render() {
  if(!pipeline) return;
  const currentTime = performance.now();
  const deltaTime = (currentTime-lastFrameTime)/1000;
  const elapsedTime = (currentTime-startTime)/1000;

  const data = [canvas.width, canvas.height, elapsedTime, deltaTime, mouseX, mouseY, mouseDown?1:0,0, frameCount,0,0,0];
  device.queue.writeBuffer(uniformBuffer,0,new Float32Array(data));

  $("u-resolution").textContent = uniforms.resolution.update(canvas.width,canvas.height);
  $("u-time").textContent = uniforms.time.update(elapsedTime);
  $("u-deltaTime").textContent = uniforms.deltaTime.update(deltaTime);
  $("u-mousexy").textContent = uniforms.mousexy.update(mouseX,mouseY);
  $("u-frame").textContent = uniforms.frame.update(frameCount);
  uniforms.mousez.update(mouseDown);

  lastFrameTime = currentTime;

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments:[{
      view: context.getCurrentTexture().createView(),
      loadOp:"clear", clearValue:{r:0,g:0,b:0,a:1}, storeOp:"store"
    }]
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0,bindGroup);
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);

  if(++frameCount && currentTime-lastFpsUpdate>100) {
    const fps = Math.round(frameCount/((currentTime-lastFpsUpdate)/1000));
    $("fps").textContent = fps;
    $("frame-time").textContent = `${((currentTime-lastFpsUpdate)/frameCount).toFixed(1)}ms`;
    frameCount=0; lastFpsUpdate=currentTime;
  }

  requestAnimationFrame(render);
}

// Resize canvas
function resizeCanvas() {
  const dpr = devicePixelRatio||1;
  canvas.width = canvasContainer.clientWidth*dpr;
  canvas.height = canvasContainer.clientHeight*dpr;
  canvas.style.width = canvasContainer.clientWidth+"px";
  canvas.style.height = canvasContainer.clientHeight+"px";
}

// Shader selection
shaderSelector.addEventListener("change", e=>{
  const selected = e.target.value;
  if(selected && shaders[selected]) {
    editor.setValue(shaders[selected].content);
    compileShader(vertexShader, uniformsStruct, shaders[selected].content);
  }
});

// Main
let editor, vertexShader, uniformsStruct;

(async () => {
  ({ vertexShader, uniformsStruct } = await loadInitialShaders());
  editor = initCodeMirror();
  resizeCanvas();
  await initWebGPU();
  await compileShader(vertexShader, uniformsStruct, fallbackShader);
  await loadShaders();
  render();
})();
