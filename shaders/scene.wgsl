// ============================================
// STRUCTURES DE SCENE
// ============================================

struct Sphere {
    center: vec3<f32>,
    radius: f32,
    color: vec3<f32>,
    _padding: f32, // align vec3 -> 16 bytes
};

struct Box {
    center: vec3<f32>,
    _padding1: f32,
    size: vec3<f32>,
    _padding2: f32,
    color: vec3<f32>,
    _padding3: f32,
};

struct Scene {
    spheres: array<Sphere, 5>,
    boxes: array<Box, 3>,
    num_spheres: u32,
    num_boxes: u32,
    _padding: vec2<u32>,
};

// ============================================
// BINDINGS
// ============================================

@group(0) @binding(1)
var<uniform> scene: Scene;

// ============================================
// SIGNED DISTANCE FUNCTIONS
// ============================================

fn sdSphere(p: vec3<f32>, center: vec3<f32>, radius: f32) -> f32 {
    return length(p - center) - radius;
}

fn sdBox(p: vec3<f32>, center: vec3<f32>, size: vec3<f32>) -> f32 {
    let q = abs(p - center) - size;
    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// ============================================
// SCENE SDF avec ID de matériau
// ============================================

fn sceneSDF(p: vec3<f32>) -> vec2<f32> {
    var minDist = 1000.0;
    var matID = 0.0;

    // Test toutes les sphères
    for (var i = 0u; i < scene.num_spheres; i++) {
        let sphere = scene.spheres[i];
        let dist = sdSphere(p, sphere.center, sphere.radius);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i); // ID = index de la sphère
        }
    }

    // Test toutes les boxes (offset de 100 pour les distinguer)
    for (var i = 0u; i < scene.num_boxes; i++) {
        let box = scene.boxes[i];
        let dist = sdBox(p, box.center, box.size);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i) + 100.0; // ID = 100 + index de la box
        }
    }

    return vec2<f32>(minDist, matID);
}

// ============================================
// RECUPERER LA COULEUR D'UN MATERIAU
// ============================================

fn getMaterialColor(matID: f32) -> vec3<f32> {
    // Sphères (ID < 100)
    if (matID < 100.0) {
        let i = u32(matID);
        if (i < scene.num_spheres) {
            return scene.spheres[i].color;
        }
    }
    // Boxes (ID >= 100)
    else {
        let i = u32(matID - 100.0);
        if (i < scene.num_boxes) {
            return scene.boxes[i].color;
        }
    }
    return vec3<f32>(1.0, 1.0, 1.0); // Couleur par défaut
}

// ============================================
// CALCUL DE LA NORMALE
// ============================================

fn calcNormal(p: vec3<f32>) -> vec3<f32> {
    let eps = 0.0001;
    let h = vec2<f32>(eps, 0.0);
    return normalize(vec3<f32>(
        sceneSDF(p + h.xyy).x - sceneSDF(p - h.xyy).x,
        sceneSDF(p + h.yxy).x - sceneSDF(p - h.yxy).x,
        sceneSDF(p + h.yyx).x - sceneSDF(p - h.yyx).x
    ));
}
