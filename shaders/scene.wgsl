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
    major_radius: f32,
    minor_radius: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
    color: vec3<f32>,
    _pad3: f32,
}

/*struct Plan {
  normal: vec3<f32>,
  distance: f32,
  _padding1: vec4<f32>,
  color: vec3<f32>,
  _padding2: f32,
};*/

struct Pyramid {
    center: vec3<f32>,
    _padding0: f32,
    base_size: vec2<f32>,
    height: f32,
    _padding1: f32,
    color: vec3<f32>,
    _padding2: f32,
};


struct SceneData {
    spheres: array<Sphere, 5>,
    boxes: array<Box, 3>,
    torus: array<Torus, 3>,
    pyramids: array<Pyramid, 3>,
    //plans: array<Plan, 2>,
    num_spheres: u32,
    num_boxes: u32,
    //num_plans: u32,
    num_pyramids: u32,
    num_torus: u32,
    _final_padding: vec4<f32>,
}

@group(0) @binding(1) var<storage, read> scene: SceneData;