// ============================================
// UNIFORMS
// ============================================

struct Uniforms {
    resolution: vec2<f32>,
    time: f32,
    deltaTime: f32,
    mouse: vec4<f32>,
    frame: u32,
    _padding: u32,
    _padding2: u32,
    _padding3: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;