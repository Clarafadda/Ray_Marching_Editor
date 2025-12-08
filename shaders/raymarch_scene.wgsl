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
    return dot(p, normalize(n)) + h;
}

/*fn op_smooth_union(d1: f32, d2: f32, k: f32) -> f32 {
    // avoid division by zero
    let kk = max(k, 0.0001);

    let h = clamp(0.5 + 0.5 * (d2 - d1) / kk, 0.0, 1.0);
    return mix(d2, d1, h) - kk * h * (1.0 - h);
}*/

fn smoothUnionSDF(d1: f32, mat1: f32, d2: f32, mat2: f32, k: f32) -> vec2<f32> {
    let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    let d = mix(d2, d1, h) - k * h * (1.0 - h);
    let mat = select(mat1, mat2, d2 < d1);
    return vec2<f32>(d, mat);
}




// ============================================
// SCENE SDF
// ============================================

// Scene SDF with smooth unions
fn sceneSDF(p: vec3<f32>) -> vec2<f32> {
    var minDist: f32 = 1000.0;
    var matID: f32 = 0.0;
    let k: f32 = 0.3; // smoothness factor

    // Spheres
    for (var i = 0u; i < scene.num_spheres; i = i + 1u) {
        let s = scene.spheres[i];
        let d = sdSphere(p, s.center, s.radius);
        let result = smoothUnionSDF(minDist, matID, d, f32(i), k);
        minDist = result.x;
        matID = result.y;
    }

    // Boxes (offset +100)
    for (var i = 0u; i < scene.num_boxes; i = i + 1u) {
        let b = scene.boxes[i];
        let d = sdBox(p, b.center, b.size);
        let result = smoothUnionSDF(minDist, matID, d, f32(i) + 100.0, k);
        minDist = result.x;
        matID = result.y;
    }

    // Planes (offset +200)
    for (var i = 0u; i < scene.num_plans; i = i + 1u) {
        let pl = scene.plans[i];
        let d = sdPlane(p, pl.normal, pl.distance);
        let result = smoothUnionSDF(minDist, matID, d, f32(i) + 200.0, k);
        minDist = result.x;
        matID = result.y;
    }

    // Torus (offset +300)
    for (var i = 0u; i < scene.num_torus; i = i + 1u) {
        let t = scene.torus[i];
        let p_local = p - t.center;
        let d = sdTorus(p_local, vec2<f32>(t.major_radius, t.minor_radius));
        let result = smoothUnionSDF(minDist, matID, d, f32(i) + 300.0, k);
        minDist = result.x;
        matID = result.y;
    }

    return vec2<f32>(minDist, matID);
}



// ============================================
// MATERIAL COLOR
// ============================================

fn getMaterialColor(matID: f32) -> vec3<f32> {

    // Sphere range 0–99
    if (matID < 100.0) {
        let i = u32(matID);
        if (i < scene.num_spheres) {
            return scene.spheres[i].color;
        }
    }

    // Boxes 100–199
    if (matID < 200.0) {
        let i = u32(matID - 100.0);
        if (i < scene.num_boxes) {
            return scene.boxes[i].color;
        }
    }

    // Planes 200–299
    if (matID < 300.0) {
        let i = u32(matID - 200.0);
        if (i < scene.num_plans) {
            return scene.plans[i].color;
        }
    }

    // Torus 300–399
    if (matID < 400.0) {
        let i = u32(matID - 300.0);
        if (i < scene.num_torus) {
            return scene.torus[i].color;
        }
    }

    // Fallback color (grey)
    return vec3<f32>(0.5, 0.5, 0.5);
}

// ============================================
// NORMAL CALCULATION
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

// ============================================
// RAY MARCHING
// ============================================

fn rayMarch(ro: vec3<f32>, rd: vec3<f32>) -> vec2<f32> {
    var t = 0.0;
    var matID = -1.0;

    for (var i = 0; i < 100; i++) {
        let p = ro + rd * t;
        let d = sceneSDF(p).x;

        if (d < 0.001) {
            matID = sceneSDF(p).y;
            break;
        }

        t += d;

        if (t > 100.0) { break; }
    }

    return vec2<f32>(t, matID);
}

// ============================================
// DISTANCE TO LINE SEGMENT
// ============================================

fn distanceToLineSegment(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// ============================================
// AXIS INDICATOR
// ============================================

fn drawAxisIndicator(
    uv: vec2<f32>,
    cam_right: vec3<f32>,
    cam_up: vec3<f32>,
    cam_forward: vec3<f32>
) -> vec4<f32> {

    let indicator_pos = vec2<f32>(-0.8, -0.7);
    let indicator_size = 0.15;

    let local_uv = uv - indicator_pos;

    if (length(local_uv) > indicator_size) {
        return vec4<f32>(0.0);
    }

    let axis_x = vec3<f32>(1.0, 0.0, 0.0);
    let axis_y = vec3<f32>(0.0, 1.0, 0.0);
    let axis_z = vec3<f32>(0.0, 0.0, 1.0);

    let screen_x = vec2<f32>(dot(axis_x, cam_right), dot(axis_x, cam_up)) * 0.12;
    let screen_y = vec2<f32>(dot(axis_y, cam_right), dot(axis_y, cam_up)) * 0.12;
    let screen_z = vec2<f32>(dot(axis_z, cam_right), dot(axis_z, cam_up)) * 0.12;

    let line_width = 0.008;
    var color = vec3<f32>(0.0);
    var alpha = 0.0;

    if (dot(axis_x, cam_forward) > -0.2) {
        let d = distanceToLineSegment(local_uv, vec2<f32>(0.0), screen_x);
        if (d < line_width) { color = vec3<f32>(1.0, 0.2, 0.2); alpha = 1.0; }
    }

    if (dot(axis_y, cam_forward) > -0.2) {
        let d = distanceToLineSegment(local_uv, vec2<f32>(0.0), screen_y);
        if (d < line_width) { color = vec3<f32>(0.2, 1.0, 0.2); alpha = 1.0; }
    }

    if (dot(axis_z, cam_forward) > -0.2) {
        let d = distanceToLineSegment(local_uv, vec2<f32>(0.0), screen_z);
        if (d < line_width) { color = vec3<f32>(0.2, 0.5, 1.0); alpha = 1.0; }
    }

    if (length(local_uv) < 0.015) {
        color = vec3<f32>(0.8); alpha = 1.0;
    }

    if (alpha == 0.0 && length(local_uv) < indicator_size * 0.9) {
        color = vec3<f32>(0.1); alpha = 0.5;
    }

    return vec4<f32>(color, alpha);
}

// ============================================
// SHADING
// ============================================

fn shade(p: vec3<f32>, rd: vec3<f32>, matID: f32) -> vec3<f32> {
    let normal = calcNormal(p);
    let lightPos = vec3<f32>(2.0, 5.0, -1.0);
    let lightDir = normalize(lightPos - p);

    let baseColor = getMaterialColor(matID);
    let diffuse = max(dot(normal, lightDir), 0.0);

    // Shadow
    let shadowOrigin = p + normal * 0.01;
    let shadowHit = rayMarch(shadowOrigin, lightDir);
    let distToLight = length(lightPos - shadowOrigin);
    let shadow = select(0.3, 1.0, shadowHit.x > distToLight);

    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(reflectDir, -rd), 0.0), 32.0);
    let ambient = 0.2;

    return baseColor * (ambient + diffuse * shadow * 0.7 + specular * 0.3);
}

// ============================================
// FRAGMENT SHADER
// ============================================

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {

    let min_res = min(uniforms.resolution.x, uniforms.resolution.y);

    let scene_uv = vec2<f32>(
        (fragCoord.x - uniforms.resolution.x * 0.5),
        -(fragCoord.y - uniforms.resolution.y * 0.5)
    ) / min_res;

    let indicator_uv = (fragCoord.xy / uniforms.resolution.xy) * 2.0 - 1.0;
    let indicator_uv_flipped = vec2<f32>(indicator_uv.x, -indicator_uv.y);

    let pitch = clamp((uniforms.mouse.y / uniforms.resolution.y) * 1.5, 0.1, 1.4);
    let yaw = (uniforms.mouse.x / uniforms.resolution.x) * 6.283185 + uniforms.time * 0.5;


    let cam_dist = 4.0;
    let cam_target = vec3<f32>(0.0);
    let cam_pos = vec3<f32>(
        sin(yaw) * cos(pitch),
        sin(pitch),
        cos(yaw) * cos(pitch)
    ) * cam_dist;

    let cam_forward = normalize(cam_target - cam_pos);
    let cam_right = normalize(cross(cam_forward, vec3<f32>(0.0, 1.0, 0.0)));
    let cam_up = cross(cam_right, cam_forward);

    let focal = 1.5;
    let rd = normalize(cam_right * scene_uv.x +
                       cam_up * scene_uv.y +
                       cam_forward * focal);

    let ro = cam_pos;
    let hit = rayMarch(ro, rd);
    let t = hit.x;
    let matID = hit.y;

    var color = vec3<f32>(0.0);

    if (matID >= 0.0) {
        let p = ro + rd * t;
        color = shade(p, rd, matID);
    } else {
        color = vec3<f32>(0.1, 0.1, 0.15) * (1.0 - scene_uv.y * 0.5);
    }

    color = pow(color, vec3<f32>(1.0 / 2.2));

    let axis = drawAxisIndicator(indicator_uv_flipped, cam_right, cam_up, cam_forward);
    color = mix(color, axis.rgb, axis.a);

    return vec4<f32>(color, 1.0);
}
