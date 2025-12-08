

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

fn sdPlan(p: vec3<f32>, normal: vec3<f32>, distance: f32) -> f32 {
    return dot(p, normal) + distance;
}



// ============================================
// SCENE SDF
// ============================================

fn sceneSDF(p: vec3<f32>) -> vec2<f32> {
    var minDist = 1000.0;
    var matID = 0.0;

    // Test all spheres
    for (var i = 0u; i < scene.num_spheres; i++) {
        let sphere = scene.spheres[i];
        let dist = sdSphere(p, sphere.center, sphere.radius);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i);
        }
    }

    // Test all boxes (offset 100 to distinguish)
    for (var i = 0u; i < scene.num_boxes; i++) {
        let box = scene.boxes[i];
        let dist = sdBox(p, box.center, box.size);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i) + 100.0;
        }
    }

    // Test all plans (offset 200)
    for (var i = 0u; i < scene.num_plans; i++) {
        let plan = scene.plans[i];
        let dist = sdPlan(p, plan.normal, plan.distance);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i) + 200.0;
        }
    }

    // Test all torus (offset 300)
    for (var i = 0u; i < scene.num_torus; i++) {
        let torus = scene.torus[i];
        let p_local = p - torus.center;
        let radii = vec2<f32>(torus.major_radius, torus.minor_radius);
        let dist = sdTorus(p_local, radii);
        if (dist < minDist) {
            minDist = dist;
            matID = f32(i) + 300.0;
        }
    }

    return vec2<f32>(minDist, matID);
}

// ============================================
// MATERIAL COLOR
// ============================================

fn getMaterialColor(matID: f32) -> vec3<f32> {
    if (matID < 100.0) {
        let i = u32(matID);
        if (i < scene.num_spheres) {
            return scene.spheres[i].color;
        }
    } else if (matID < 200.0) {
        let i = u32(matID - 100.0);
        if (i < scene.num_boxes) {
            return scene.boxes[i].color;
        }
    } else if (matID < 300.0) {
        let i = u32(matID - 200.0);
        if (i < scene.num_plans) {
            return scene.plans[i].color;
        }
    } else if (matID < 400.0) {
        let i = u32(matID - 300.0);
        if (i < scene.num_torus) {
            return scene.torus[i].color;
        }
    }

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
        let result = sceneSDF(p);
        let d = result.x;

        if (d < 0.001) {
            matID = result.y;
            break;
        }

        t += d;

        if (t > 100.0) {
            break;
        }
    }

    return vec2<f32>(t, matID);
}

// ============================================
// SHADING
// ============================================

fn shade(p: vec3<f32>, rd: vec3<f32>, matID: f32) -> vec3<f32> {
    let normal = calcNormal(p);
    let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));

    let baseColor = getMaterialColor(matID);

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
    // 1. Normalized UV coordinates [-1, 1]
    let uv = vec2<f32>(
        (fragCoord.x - uniforms.resolution.x * 0.5),
        -(fragCoord.y - uniforms.resolution.y * 0.5)
    ) / min(uniforms.resolution.x, uniforms.resolution.y);

    // 2. Orbital Camera Setup
    let pitch = clamp((uniforms.mouse.y / uniforms.resolution.y) * 3.0, 0.05, 1.5);
    let yaw = uniforms.time * 0.5;

    // Camera positioning
    let cam_dist = 4.0;
    let cam_target = vec3<f32>(0.0, 0.0, 0.0);
    let cam_pos = vec3<f32>(
        sin(yaw) * cos(pitch),
        sin(pitch),
        cos(yaw) * cos(pitch)
    ) * cam_dist;

    // 3. Camera Matrix
    let cam_forward = normalize(cam_target - cam_pos);
    let cam_right = normalize(cross(cam_forward, vec3<f32>(0.0, 1.0, 0.0)));
    let cam_up = cross(cam_right, cam_forward);

    // Ray Direction
    let focal_length = 1.5;
    let rd = normalize(cam_right * uv.x + cam_up * uv.y + cam_forward * focal_length);

    // 4. Ray Marching
    let ro = cam_pos;
    let result = rayMarch(ro, rd);
    let t = result.x;
    let matID = result.y;

    var color = vec3<f32>(0.0);

    if (matID >= 0.0) {
        let p = ro + rd * t;
        color = shade(p, rd, matID);
    } else {
        // Sky Background
        color = vec3<f32>(0.1, 0.1, 0.15) * (1.0 - uv.y * 0.5);
    }

    // Gamma correction
    color = pow(color, vec3<f32>(1.0 / 2.2));

    return vec4<f32>(color, 1.0);
}