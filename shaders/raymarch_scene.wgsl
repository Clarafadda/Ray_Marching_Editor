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
    // Coordonnées UV normalisées [-1, 1]
    let uv = (fragCoord.xy - uniforms.resolution * 0.5) / uniforms.resolution.y;

    // Position de la caméra (orbite)
    let camDist = 8.0;
    let camAngle = uniforms.time * 0.3;
    let eye = vec3<f32>(
        cos(camAngle) * camDist,
        2.0,
        sin(camAngle) * camDist
    );
    let lookAt = vec3<f32>(0.0, 0.0, 0.0);

    // Direction du rayon
    let rd = getCamera(uv, eye, lookAt);

    // Ray marching
    let result = rayMarch(eye, rd);
    let t = result.x;
    let matID = result.y;

    var color = vec3<f32>(0.0);

    if (matID >= 0.0) {
        let p = eye + rd * t;
        color = shade(p, rd, matID);
    } else {
        // Fond dégradé
        color = vec3<f32>(0.1, 0.1, 0.15) * (1.0 - uv.y * 0.5);
    }

    // Gamma correction
    color = pow(color, vec3<f32>(1.0 / 2.2));

    return vec4<f32>(color, 1.0);
}