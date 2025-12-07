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

fn sd_plane(p: vec3<f32>, n: vec3<f32>, h: f32) -> f32 {
    return dot(p, n) + h;
}


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

    if (scene.num_planes > 0u) {
        let plane = scene.plane; // Access the single struct

        // Calculate 'h' for sd_plane: h = -dot(center, normal)
        let n = normalize(plane.normal);
        let h_param = -dot(plane.center, n);
        let plane_dist = sd_plane(p, n, h_param);
        if (plane_dist < minDist) {
            minDist = plane_dist;
            matID = 200.0; // Material ID for the plane
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
    }

    // Plane handled in shade()
    return vec3<f32>(1.0, 1.0, 1.0);
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
// SHADING (Kept from your current code)
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
// FRAGMENT SHADER (Uses the camera setup from raymarch_basic.wgsl)
// ============================================

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    // 1. Normalized UV coordinates [-1, 1]
    // Use min(res.x, res.y) for aspect ratio correction, matching raymarch_basic
    let uv = vec2<f32>((fragCoord.x - uniforms.resolution.x * 0.5),-(fragCoord.y - uniforms.resolution.y * 0.5)) / min(uniforms.resolution.x, uniforms.resolution.y);


    // 2. Orbital Camera Setup (from raymarch_basic.wgsl)

    // Pitch/Yaw setup: uses time for rotation and mouse for pitch control
    let pitch = clamp((uniforms.mouse.y / uniforms.resolution.y) * 3.0, 0.05, 1.5); // 0.05 to 1.5 radians
    let yaw = uniforms.time * 0.5; // Auto-orbits around the center

    // Camera Coords
    let cam_dist = 4.0;
    let cam_target = vec3<f32>(0.0, 0.0, 0.0);
    // Calculate cam_pos on the orbit
    let cam_pos = vec3<f32>(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * cam_dist;

    // 3. Camera Matrix (Ray Direction setup)
    // Create the coordinate system based on camera position and target
    let cam_forward = normalize(cam_target - cam_pos);
    let cam_right = normalize(cross(cam_forward, vec3<f32>(0.0, 1.0, 0.0)));
    let cam_up = cross(cam_right, cam_forward); // Re-orthogonalized up

    // Ray Direction
    let focal_length = 1.5;
    // Note: The sign for cam_up * uv.y is inverted here to match the common
    // raymarching convention (Y up is positive screen Y, not inverted like some APIs)
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
        // Sky Background (Simple dark gradient)
        color = vec3<f32>(0.1, 0.1, 0.15) * (1.0 - uv.y * 0.5);
    }

    // Gamma correction
    color = pow(color, vec3<f32>(1.0 / 2.2));

    return vec4<f32>(color, 1.0);
}