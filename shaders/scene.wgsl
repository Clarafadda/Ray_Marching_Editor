// ============================================
// SCENE STRUCTURES
// ============================================

struct Sphere {
    center: vec3<f32>,
    radius: f32,
    color: vec3<f32>,
    _padding: f32,
}

struct Box {
    center: vec3<f32>,
    _padding1: f32,
    size: vec3<f32>,
    _padding2: f32,
    color: vec3<f32>,
    _padding3: f32,
}

struct Torus {
  center: vec3<f32>,
  _pad0: f32,
  radii: vec2<f32>,  // x=major, y=minor
  _pad1: vec2<f32>,
  color: vec3<f32>,
  _pad2: f32
}

struct Plane {
  normal: vec3<f32>,
  _pad0: f32,
  distance: f32,
  _pad1: vec3<f32>,
  color: vec3<f32>,
  _pad2: f32
}

struct SceneData {
    spheres: array<Sphere, 5>,
    boxes: array<Box, 3>,
    num_spheres: u32,
    num_boxes: u32,
    _padding: vec2<u32>,
}

@group(0) @binding(1) var<storage, read> scene: SceneData;