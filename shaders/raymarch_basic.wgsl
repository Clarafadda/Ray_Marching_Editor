// ==============================
// Basic Ray Marching - Scene Uniform
// ==============================

// Constants
const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;
const MAX_STEPS: i32 = 256;

// Sky color
const MAT_SKY_COLOR: vec3<f32> = vec3<f32>(0.7, 0.8, 0.9);

// ==============================
// Bindings
// ==============================
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> scene: Scene;

// ==============================
// SDF utilities (optional)
// ==============================
fn sdSphere(p: vec3<f32>, r: f32) -> f32 {
    return length(p) - r;
}
fn sdBox(p: vec3<f32>, b: vec3<f32>) -> f32 {
    let q = abs(p) - b;
    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}
fn sdPlane(p: vec3<f32>, n: vec3<f32>, h: f32) -> f32 {
    return dot(p, n) + h;
}

// ==============================
// Scene SDF / Materials
// ==============================
fn get_dist(p: vec3<f32>) -> vec2<f32> {
    return sceneSDF(p); // utilise la structure Scene
}

fn get_material_color(matID: f32) -> vec3<f32> {
    return getMaterialColor(matID);
}

// ==============================
// Ray Marching
// ==============================
fn ray_march(ro: vec3<f32>, rd: vec3<f32>) -> vec2<f32> {
    var t = 0.0;
    var matID = -1.0;

    for(var i = 0; i < MAX_STEPS; i++) {
        let p = ro + rd * t;
        let result = get_dist(p);
        t += result.x;
        matID = result.y;

        if(result.x < SURF_DIST || t > MAX_DIST) {
            break;
        }
    }

    return vec2<f32>(t, matID);
}

// ==============================
// Normals
// ==============================
fn get_normal(p: vec3<f32>) -> vec3<f32> {
    let e = 0.001;
    return normalize(vec3<f32>(
        get_dist(p + vec3<f32>(e,0,0)).x - get_dist(p - vec3<f32>(e,0,0)).x,
        get_dist(p + vec3<f32>(0,e,0)).x - get_dist(p - vec3<f32>(0,e,0)).x,
        get_dist(p + vec3<f32>(0,0,e)).x - get_dist(p - vec3<f32>(0,0,e)).x
    ));
}

// ==============================
// Camera
// ==============================
fn get_camera_dir(uv: vec2<f32>, eye: vec3<f32>, target: vec3<f32>) -> vec3<f32> {
    let forward = normalize(target - eye);
    let right = normalize(cross(forward, vec3<f32>(0.0,1.0,0.0)));
    let up = cross(right, forward);
    return normalize(forward + uv.x * right + uv.y * up);
}

// ==============================
// Shading
// ==============================
fn shade(p: vec3<f32>, rd: vec3<f32>, matID: f32) -> vec3<f32> {
    let normal = get_normal(p);
    let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let baseColor = get_material_color(matID);

    let diffuse = max(dot(normal, lightDir), 0.0);
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(reflectDir, -rd), 0.0), 32.0);
    let ambient = 0.1;

    return baseColor * (ambient + diffuse * 0.7 + specular * 0.3);
}

// ==============================
// Gamma Correction
// ==============================
fn gamma_correct(color: vec3<f32>) -> vec3<f32> {
    return pow(color, vec3<f32>(1.0 / 2.2));
}

// ==============================
// Fragment Shader
// ==============================
@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = (fragCoord.xy - uniforms.resolution * 0.5) / uniforms.resolution.y;

    // Camera orbit
    let camDist = 8.0;
    let camAngle = uniforms.time * 0.3;
    let eye = vec3<f32>(cos(camAngle) * camDist, 2.0, sin(camAngle) * camDist);
    let target = vec3<f32>(0.0, 0.0, 0.0);
    let rd = get_camera_dir(uv, eye, target);

    // Ray marching
    let result = ray_march(eye, rd);
    let t = result.x;
    let matID = result.y;

    var color = vec3<f32>(0.0);

    if(matID >= 0.0) {
        let p = eye + rd * t;
        color = shade(p, rd, matID);
    } else {
        color = vec3<f32>(0.1, 0.1, 0.15) * (1.0 - uv.y * 0.5);
    }

    color = gamma_correct(color);
    return vec4<f32>(color, 1.0);
}
