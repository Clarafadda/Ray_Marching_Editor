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

struct Plane {
  center: vec3<f32>,
  @align(16) // Padding to ensure the next member starts at 16
  normal: vec3<f32>,
  color: vec3<f32>,
  _padding: f32, // Padding to make the total size 48 bytes (3 * 16-byte chunks)
};

struct SceneData {
    spheres: array<Sphere, 5>,
    boxes: array<Box, 3>,
    plane: Plane,
    num_spheres: u32,
    num_boxes: u32,
    num_planes: u32,
    _padding: u32,
}

@group(0) @binding(1) var<storage, read> scene: SceneData;