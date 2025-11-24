struct Uniforms {
    resolution : vec2<f32>,   // 8 bytes
    time       : f32,         // 12
    deltaTime  : f32,         // 16

    mouse      : vec4<f32>,   // 32

    frame      : u32,         // 36

    // ----- PADDING -----
    // WGSL requires 16-byte alignment for structs in uniform buffers.
    _padding  : u32,          // 40
    _padding2 : u32,          // 44
    _padding3 : u32,          // 48
}

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;
