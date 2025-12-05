// ============================================
// CONSTANTS
// ============================================

const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;
const MAX_STEPS: i32 = 256;
const MAT_SKY_COLOR: vec3<f32> = vec3<f32>(0.5, 0.7, 1.0);

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

fn sdTorus(p: vec3<f32>, t: vec2<f32>) -> f32 {
  let q = vec2<f32>(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

fn sdPlane(p: vec3<f32>, n: vec3<f32>, h: f32) -> f32 {
  return dot(p, n) + h;
}

// ============================================
// SDF Operations
// ============================================

/*
fn op_union(d1: f32, d2: f32) -> f32 {
  return min(d1, d2);
}

fn op_subtract(d1: f32, d2: f32) -> f32 {
  return max(-d1, d2);
}

fn op_intersect(d1: f32, d2: f32) -> f32 {
  return max(d1, d2);
}

fn op_smooth_union(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}
*/

// ============================================
// SCENE SDF
// ============================================

fn sceneSDF(p: vec3<f32>) -> vec2<f32> {
    var minDist = 1000.0;
    var matID = 0.0;

    // Tester toutes les sphères
    for (var i = 0u; i < scene.num_spheres; i++) {
        let sphere = scene.spheres[i];
        let dist = sdSphere(p, sphere.center, sphere.radius);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i);
        }
    }

    // Tester toutes les boxes (offset de 100 pour les distinguer)
    for (var i = 0u; i < scene.num_boxes; i++) {
        let box = scene.boxes[i];
        let dist = sdBox(p, box.center, box.size);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i) + 100.0;
        }
    }

    return vec2<f32>(minDist, matID);
}

// ============================================
// MATERIAL COLOR
// ============================================

fn getMaterialColor(matID: f32, p: vec3<f32>) -> vec3<f32> {
    // Spheres (ID < 100)
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
    return vec3<f32>(0.5, 0.5, 0.5);
}

// ============================================
// NORMAL CALCULATION
// ============================================

// Calculate normal using gradient
fn get_normal(p: vec3<f32>) -> vec3<f32> {
    let eps = 0.001;
    let h = vec2<f32>(eps, 0.0);
    return normalize(vec3<f32>(
        sceneSDF(p + h.xyy).x - sceneSDF(p - h.xyy).x,
        sceneSDF(p + h.yxy).x - sceneSDF(p - h.yxy).x,
        sceneSDF(p + h.yyx).x - sceneSDF(p - h.yyx).x
    ));
}

// ============================================
// RAY MARCHING
// ============================================

fn ray_march(ro: vec3<f32>, rd: vec3<f32>) -> vec2<f32> {
    var t = 0.0;
    var matID = -1.0;

    for (var i = 0; i < 100; i++) {
        let p = ro + rd * t;
        let result = sceneSDF(p);
        let d = result.x;

        if (d < 0.001) {
            matID = result.y;
            break;
        }

        t += d;

        if (t > MAX_DIST) {
            break;
        }
    }

    return vec2<f32>(t, matID);
}

// ============================================
// CAMERA
// ============================================

fn getCamera(uv: vec2<f32>, eye: vec3<f32>, lookAt: vec3<f32>) -> vec3<f32> {
    let forward = normalize(lookAt - eye);
    let right = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), forward));
    let up = cross(forward, right);
    return normalize(forward + uv.x * right + uv.y * up);
}

// ============================================
// SHADING
// ============================================

fn shade(p: vec3<f32>, rd: vec3<f32>, matID: f32) -> vec3<f32> {
    let normal = get_normal(p);
    let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));

    let baseColor = getMaterialColor(matID, p);

    // Diffuse
    let diffuse = max(dot(normal, lightDir), 0.0);

    // Specular
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(reflectDir, -rd), 0.0), 32.0);

    // Ambient
    let ambient = 0.1;

    return baseColor * (ambient + diffuse * 0.7 + specular * 0.3);
}

// ============================================
// FRAGMENT SHADER
// ============================================
@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = (fragCoord.xy - uniforms.resolution * 0.5) / min(uniforms.resolution.x, uniforms.resolution.y);


  let pitch = clamp((uniforms.mouse.y / uniforms.resolution.y), 0.05, 1.5);
  let yaw = uniforms.time * 0.5; // Auto-orbits around the center

  // Camera Coords
  let cam_dist = 4.0; // Distance from the target
  let cam_target = vec3<f32>(0.0, 0.0, 0.0);
  let cam_pos = vec3<f32>(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * cam_dist;

  // Camera Matrix
  let cam_forward = normalize(cam_target - cam_pos);
  let cam_right = normalize(cross(cam_forward, vec3<f32>(0.0, 1.0, 0.0)));
  let cam_up = cross(cam_right, cam_forward); // Re-orthogonalized up

  // Ray Direction
  // 1.5 is the "focal length" or distance to the projection plane
  let focal_length = 1.5;
  let rd = normalize(cam_right * uv.x - cam_up * uv.y + cam_forward * focal_length);

  // Ray march
  let result = ray_march(cam_pos, rd);

  if (result.x < MAX_DIST) {
    // Hit something - calculate lighting
    let hit_pos = cam_pos + rd * result.x;
    let normal = get_normal(hit_pos);

    // Diffuse Lighting
    let light_pos = vec3<f32>(2.0, 5.0, -1.0);
    let light_dir = normalize(light_pos - hit_pos);
    let diffuse = max(dot(normal, light_dir), 0.0);

    // Shadow Casting
    let shadow_origin = hit_pos + normal * 0.01;
    let shadow_result = ray_march(shadow_origin, light_dir);
    let shadow = select(0.3, 1.0, shadow_result.x > length(light_pos - shadow_origin));

    // Phong Shading
    let ambient = 0.2;
    var albedo = getMaterialColor(result.y, hit_pos);
    let phong = albedo * (ambient + diffuse * shadow * 0.8);

    // Exponential Fog
    let fog = exp(-result.x * 0.02);
    let color = mix(MAT_SKY_COLOR, phong, fog);

    return vec4<f32>(gamma_correct(color), 1.0);
  }

  // Sky gradient
  let sky = mix(MAT_SKY_COLOR, MAT_SKY_COLOR * 0.9, uv.y * 0.5 + 0.5);
  return vec4<f32>(gamma_correct(sky), 1.0);
}


// Gamma Correction
fn gamma_correct(color: vec3<f32>) -> vec3<f32> {
  return pow(color, vec3<f32>(1.0 / 2.2));
}

