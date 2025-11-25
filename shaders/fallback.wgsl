// ============================================
// FALLBACK FRAGMENT SHADER
// ============================================

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / uniforms.resolution;
    return vec4<f32>(uv, 0.5, 1.0);
}