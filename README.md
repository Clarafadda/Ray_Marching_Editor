# WebGPU Ray Marching Editor


### Click the image below to launch the demo video:

[![Démonstration vidéo de l'éditeur](screen.png)](https://youtu.be/yge2YFIpTds)

---
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#key-features">Key Features</a></li>
    <li><a href="#technology-stack">Technology Stack</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## About The Project

This project is an interactive 3D scene editor built on the modern **WebGPU** graphics API. It leverages **Ray Marching** using **Signed Distance Functions (SDFs)** to render complex procedural geometry in real-time within the browser. The goal is to provide a unified environment where users can build 3D scenes using common primitives and simultaneously edit the underlying WGSL shader code.

The editor is designed for immediacy and interactivity, allowing for real-time manipulation of object dimensions, positions, and materials.

 🔗 [**View Live Demo**](https://clarafadda.github.io/Ray_Marching_Editor/)
---

## Key Features

The application provides a comprehensive set of tools for developing and editing ray-marched scenes:

* **Real-Time Shader Editing:** Instantaneous compilation and rendering of user-written **WGSL** fragment shader code.


* **Dynamic Object Primitives:** Supports addition and deletion of core SDF primitives: **Spheres, Boxes, Torus, and Pyramids.**


* **Full Dimension Control:** All object parameters (position, color, and dimensions—including **Length, Width, and Height for Pyramids/Boxes**) are dynamically editable via dedicated UI sliders.


* **Contextual Interface:** The editing panel automatically adapts to display only the relevant parameters for the currently selected object.


* **Visual Orientation Widget:** Includes a dynamic 3D axis orientation widget, similar to Unity's, that moves with the camera to provide clear spatial context.


* **Visual Aids:** Includes a **transparent, non-intrusive grid overlay** on the XZ plane to provide clear ground reference and aid in object positioning.


* **Advanced SDF Operations:** Implements the **Smooth Union** function to create organic, seamless blending between overlapping objects.


* **Camera Navigation:** Allows for free-look camera movement using the mouse to fully inspect the scene from any angle.


* **Camera Control Toggling:** Added the ability to **pause and resume the automatic camera rotation** directly from the UI, enabling users to freeze the viewport for detailed inspection or static screenshots.

---

## Technology Stack

| Category | Technology | Role |
| :--- | :--- | :--- |
| **Graphics API** | **WebGPU** | High-performance 3D rendering pipeline. |
| **Shading Language** | **WGSL** | GPU kernel programming and SDF implementation. |
| **Core Logic** | **JavaScript** | UI management, data serialization, and WebGPU setup. |
| **User Interface** | **Tailwind CSS** | Utility-first styling for a responsive, clean design. |
| **Code Editor** | **CodeMirror** | Provides syntax-highlighting for the WGSL editor panel. |

---

## Getting Started

To run the project locally, you must use a local HTTP server due to WebGPU and browser security restrictions.

### Instructions

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/clarafadda/Ray_Marching_Editor.git](https://github.com/clarafadda/Ray_Marching_Editor.git)
    cd Ray_Marching_Editor
    ```

2.  **Start the Local Server (Using Python):**
    Execute the following command in the project root directory:
    ```bash
    python -m http.server 8000
    ```

3.  **Access the Application:**
    Open your web browser and navigate to the local server address:
    ```
    http://localhost:8000/
    ```

---

## License

This project is distributed under the MIT License. See the `LICENSE` file for more information.

**Author:** Clara Fadda 