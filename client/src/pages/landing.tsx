import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Define the CSS styles
const styles = {
  container: {
    margin: 0,
    padding: 0,
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    backgroundColor: '#000',
    fontFamily: 'Arial, sans-serif',
  },
  canvas: {
    display: 'block',
    width: '100vw',
    height: '100vh',
  },
  info: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '20px',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '14px',
    pointerEvents: 'none' as const,
  },
  imageUpload: {
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '14px',
  }
};

interface NoiseShader extends THREE.Shader {
  uniforms: {
    tDiffuse: { value: THREE.Texture | null };
    amount: { value: number };
    time: { value: number };
  };
}

interface ThreeJSDraggableSceneProps {
  imageUrl?: string;
}

const ThreeJSDraggableScene: React.FC<ThreeJSDraggableSceneProps> = ({ imageUrl = '/api/placeholder/800/500' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string>(imageUrl);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const imageBaseRef = useRef<THREE.Mesh | null>(null);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setCustomImageUrl(e.target.result);
          
          // Update the texture if the scene is already created
          if (sceneRef.current && imageBaseRef.current) {
            const texture = new THREE.TextureLoader().load(e.target.result);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            const material = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.7,
              metalness: 0.2,
            });
            
            if (imageBaseRef.current.material instanceof THREE.Material) {
              imageBaseRef.current.material.dispose();
            }
            
            imageBaseRef.current.material = material;
          }
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Colors
    const colors = {
      teal: 0x38B2AC,
      purple: 0x9F7AEA,
      pink: 0xED64A6,
      orange: 0xED8936,
      green: 0x48BB78,
      blue: 0x4299E1,
      yellow: 0xECC94B,
      red: 0xF56565
    };

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050505);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Position camera at an angle
    camera.position.set(5, 8, 12);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvasRef.current = renderer.domElement;
    mountRef.current.appendChild(renderer.domElement);

    // Orbit controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.target.set(0, 0, 0);
    
    // Lock camera position by disabling pan and zoom
    orbitControls.enablePan = false;
    orbitControls.enableZoom = false;
    orbitControls.minPolarAngle = Math.PI / 4; // 45 degrees
    orbitControls.maxPolarAngle = Math.PI / 3; // 60 degrees
    orbitControls.minAzimuthAngle = -Math.PI / 4; // -45 degrees
    orbitControls.maxAzimuthAngle = Math.PI / 4; // 45 degrees

    // Create Image Base
    const createImageBase = () => {
      // Load the image as a texture
      const texture = new THREE.TextureLoader().load(customImageUrl);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      
      // Create a flat plane for the image
      const baseGeometry = new THREE.PlaneGeometry(10, 7, 10, 10);
      const baseMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      
      const imagePlane = new THREE.Mesh(baseGeometry, baseMaterial);
      imagePlane.rotation.x = -Math.PI / 2; // Lay flat on the ground
      imagePlane.position.y = -2; // Position below the objects
      imagePlane.receiveShadow = true;
      
      imageBaseRef.current = imagePlane;
      scene.add(imagePlane);
      
      return imagePlane;
    };
    
    const imagePlane = createImageBase();

    // Lighting
    // Spotlight from top right corner
    const spotlight = new THREE.SpotLight(0xFFD966, 2000);
    spotlight.position.set(8, 12, -5); // Adjusted position for better lighting
    scene.add(spotlight);
    
    spotlight.angle = 0.35;
    spotlight.penumbra = 0.7;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    spotlight.shadow.bias = -0.0001;
    
    // To change spotlight direction, update the target position
    spotlight.target.position.set(-2, 0, 2); // This aims the light toward the left side of the scene
    scene.add(spotlight.target); // Important: add the target to the scene
    
    // Add a less intense secondary light
    const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.5);
    secondaryLight.position.set(-5, 8, 5);
    secondaryLight.castShadow = true;
    scene.add(secondaryLight);

    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Helper function to create random position
    const randomPosition = (range = 3): [number, number, number] => {
      return [
        (Math.random() - 0.5) * range,
        Math.random() * 3 + 1, // Keep objects above the image
        (Math.random() - 0.5) * range
      ];
    };

    // Create shapes
    const objects: THREE.Object3D[] = [];

    // Function to create a shape
    function createShape(
      type: string,
      position: [number, number, number],
      color: number,
      scale: number | [number, number, number]
    ): THREE.Mesh {
      let geometry: THREE.BufferGeometry;

      switch (type) {
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.8, 32, 32);
          break;
        case 'cube':
          geometry = new THREE.BoxGeometry(1, 1, 1);
          break;
        case 'cuboid':
          geometry = new THREE.BoxGeometry(1.5, 1, 0.5);
          break;
        case 'torus':
          geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
          break;
        case 'octahedron':
          geometry = new THREE.OctahedronGeometry(0.8);
          break;
        case 'tetrahedron':
          geometry = new THREE.TetrahedronGeometry(0.8);
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      // Create different materials based on index
      let material: THREE.Material;
      const materialType = Math.floor(Math.random() * 3);

      if (materialType === 0) {
        // Glass-like material
        material = new THREE.MeshPhysicalMaterial({
          color: color,
          metalness: 0.1,
          roughness: 0.2,
          transmission: 0.95,
          thickness: 0.5,
          clearcoat: 1,
          clearcoatRoughness: 0.1
        });
      } else if (materialType === 1) {
        // Metallic material
        material = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.8,
          roughness: 0.4,
          envMapIntensity: 1
        });
      } else {
        // Standard material
        material = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.3,
          roughness: 0.7
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Apply scale
      if (typeof scale === 'number') {
        mesh.scale.set(scale, scale, scale);
      } else {
        mesh.scale.set(...scale);
      }

      // Add animation data
      mesh.userData.floatSpeed = 0.5 + Math.random() * 1.5;
      mesh.userData.rotationSpeed = 0.005 + Math.random() * 0.01;
      mesh.userData.floatAmplitude = 0.1 + Math.random() * 0.2;
      mesh.userData.originalY = position[1];
      mesh.userData.timeOffset = Math.random() * Math.PI * 2;
      mesh.userData.isDragging = false;

      scene.add(mesh);
      objects.push(mesh);

      return mesh;
    }

    // Create curved arrow
    function createCurvedArrow(
      position: [number, number, number],
      rotation: [number, number, number],
      color: number,
      scale: [number, number, number] = [1, 1, 1]
    ): THREE.Group {
      const group = new THREE.Group();

      // Create torus for the curve
      const torusGeometry = new THREE.TorusGeometry(0.6, 0.1, 16, 100, Math.PI * 1.5);
      const torusMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.8
      });
      const torus = new THREE.Mesh(torusGeometry, torusMaterial);
      torus.castShadow = true;
      group.add(torus);

      // Create cone for the arrowhead
      const coneGeometry = new THREE.ConeGeometry(0.2, 0.5, 32);
      const coneMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.8
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.set(0, 0.6, -0.4);
      cone.rotation.x = Math.PI / 4;
      cone.castShadow = true;
      group.add(cone);

      group.position.set(...position);
      group.rotation.set(...rotation);
      group.scale.set(...scale);

      // Add animation data
      group.userData.rotationSpeed = 0.01;
      group.userData.timeOffset = Math.random() * Math.PI * 2;
      group.userData.isDragging = false;

      scene.add(group);
      objects.push(group);

      return group;
    }

    // Create curvy T shape
    function createCurvyT(
      position: [number, number, number],
      rotation: [number, number, number],
      color: number,
      scale: [number, number, number] = [1, 1, 1]
    ): THREE.Group {
      const group = new THREE.Group();

      // Create vertical tube (slightly curved)
      const verticalCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.8, 0),
        new THREE.Vector3(0.1, -0.4, 0.1),
        new THREE.Vector3(-0.1, 0, -0.1),
        new THREE.Vector3(0, 0.8, 0)
      ]);

      const verticalGeometry = new THREE.TubeGeometry(verticalCurve, 64, 0.1, 8, false);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.7
      });
      const verticalTube = new THREE.Mesh(verticalGeometry, material);
      verticalTube.castShadow = true;
      group.add(verticalTube);

      // Create horizontal tube (curved)
      const horizontalCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.8, 0.7, 0),
        new THREE.Vector3(-0.4, 0.8, 0.1),
        new THREE.Vector3(0, 0.75, 0),
        new THREE.Vector3(0.4, 0.8, -0.1),
        new THREE.Vector3(0.8, 0.7, 0)
      ]);

      const horizontalGeometry = new THREE.TubeGeometry(horizontalCurve, 64, 0.08, 8, false);
      const horizontalTube = new THREE.Mesh(horizontalGeometry, material);
      horizontalTube.castShadow = true;
      group.add(horizontalTube);

      // Add small sphere decorations at ends
      const sphereGeometry = new THREE.SphereGeometry(0.12, 16, 16);
      
      const topSphere = new THREE.Mesh(sphereGeometry, material);
      topSphere.position.set(0, 0.8, 0);
      topSphere.castShadow = true;
      group.add(topSphere);
      
      const leftSphere = new THREE.Mesh(sphereGeometry, material);
      leftSphere.position.set(-0.8, 0.7, 0);
      leftSphere.castShadow = true;
      group.add(leftSphere);
      
      const rightSphere = new THREE.Mesh(sphereGeometry, material);
      rightSphere.position.set(0.8, 0.7, 0);
      rightSphere.castShadow = true;
      group.add(rightSphere);
      
      const bottomSphere = new THREE.Mesh(sphereGeometry, material);
      bottomSphere.position.set(0, -0.8, 0);
      bottomSphere.castShadow = true;
      group.add(bottomSphere);

      group.position.set(...position);
      group.rotation.set(...rotation);
      group.scale.set(...scale);

      // Add animation data
      group.userData.floatSpeed = 0.6 + Math.random() * 0.5;
      group.userData.rotationSpeed = 0.007;
      group.userData.floatAmplitude = 0.15;
      group.userData.originalY = position[1];
      group.userData.timeOffset = Math.random() * Math.PI * 2;
      group.userData.isDragging = false;

      scene.add(group);
      objects.push(group);

      return group;
    }

    // Create a wavy ring shape
    function createWavyRing(
      position: [number, number, number],
      rotation: [number, number, number],
      color: number,
      scale: [number, number, number] = [1, 1, 1]
    ): THREE.Group {
      const group = new THREE.Group();
      
      // Create points for a wavy circle
      const points: THREE.Vector3[] = [];
      const segments = 64;
      const radius = 0.6;
      const waveHeight = 0.15;
      const waveFrequency = 8;
      
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const waveOffset = Math.sin(theta * waveFrequency) * waveHeight;
        const x = Math.cos(theta) * (radius + waveOffset);
        const y = Math.sin(theta) * (radius + waveOffset);
        const z = Math.cos(theta * 2) * 0.05; // Add some z-axis variation
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      // Create a closed curve
      const curve = new THREE.CatmullRomCurve3(points);
      curve.closed = true;
      
      // Create tube geometry
      const tubeGeometry = new THREE.TubeGeometry(curve, 72, 0.08, 8, true);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.7
      });
      
      const tubeMesh = new THREE.Mesh(tubeGeometry, material);
      tubeMesh.castShadow = true;
      group.add(tubeMesh);
      
      group.position.set(...position);
      group.rotation.set(...rotation);
      group.scale.set(...scale);
      
      // Add animation data
      group.userData.floatSpeed = 0.5 + Math.random() * 0.4;
      group.userData.rotationSpeed = 0.005;
      group.userData.floatAmplitude = 0.12;
      group.userData.originalY = position[1];
      group.userData.timeOffset = Math.random() * Math.PI * 2;
      group.userData.isDragging = false;
      
      scene.add(group);
      objects.push(group);
      
      return group;
    }

    // Distribute objects in a balanced pattern to avoid interference
    // Create regular shapes at carefully selected positions
    const shapes = [
      { type: 'sphere', position: [2.5, 1.2, 2.5], color: colors.pink, scale: 1.2 },
      { type: 'cube', position: [-2.5, 1.5, 2.5], color: colors.teal, scale: 1 },
      { type: 'torus', position: [2.5, 1.3, -2.5], color: colors.orange, scale: 0.8 },
      { type: 'octahedron', position: [-2.5, 1.4, -2.5], color: colors.green, scale: 1.1 },
      { type: 'tetrahedron', position: [0, 1.7, 3], color: colors.blue, scale: 1.3 }
    ];

    shapes.forEach(shape => createShape(shape.type, shape.position, shape.color, shape.scale));

    // Create curved arrows at specific positions
    createCurvedArrow([3.5, 1.2, 0], [0, Math.PI / 2, 0], colors.yellow, [1.2, 1.2, 1.2]);
    createCurvedArrow([-3.5, 1.5, 0], [0, -Math.PI / 2, 0], colors.purple, [1.2, 1.2, 1.2]);

    // Create curvy T shapes at specific positions
    // createCurvyT([0, 1.5, -3], [0, 0, 0], colors.red, [1.3, 1.3, 1.3]);
    // createCurvyT([0, 1.4, 0], [Math.PI / 6, Math.PI / 4, 0], colors.green, [1.2, 1.2, 1.2]);

    // Create wavy rings at specific positions
    createWavyRing([-1.8, 1.2, 0], [Math.PI / 2, 0, 0], colors.pink, [1, 1, 1]);
    createWavyRing([1.8, 1.3, 0], [Math.PI / 2, Math.PI / 3, 0], colors.blue, [1, 1, 1]);

    // Create 3D text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', function(font) {
      const textGeometry = new TextGeometry('DRAG ME', {
        font: font,
        size: 0.5,
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
      });

      textGeometry.center();

      const textMaterial = new THREE.MeshStandardMaterial({
        color: colors.pink,
        metalness: 0.3,
        roughness: 0.5
      });

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(0, 0.8, 2.5); // Position text at front for visibility
      textMesh.castShadow = true;

      // Add animation data
      textMesh.userData.floatSpeed = 0.7;
      textMesh.userData.rotationSpeed = 0.003;
      textMesh.userData.floatAmplitude = 0.15;
      textMesh.userData.originalY = 0.8;
      textMesh.userData.timeOffset = Math.random() * Math.PI * 2;
      textMesh.userData.isDragging = false;

    //   scene.add(textMesh);
      objects.push(textMesh);
    });

    // Setup drag controls
    const dragControls = new DragControls(objects, camera, renderer.domElement);

    dragControls.addEventListener('dragstart', function(event) {
      orbitControls.enabled = false;
      event.object.userData.isDragging = true;
    });

    dragControls.addEventListener('dragend', function(event) {
      orbitControls.enabled = true;
      event.object.userData.isDragging = false;
    });

    // Post-processing setup
    // Create composer
    const composer = new EffectComposer(renderer);

    // Add render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Add bloom pass
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    composer.addPass(bloomPass);

    // Add noise shader pass
    const noiseShader: NoiseShader = {
      uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0.08 },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        uniform float time;
        varying vec2 vUv;

        float random(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Add film grain
          float grain = random(vUv * time) * amount;
          
          // Apply grain
          color.rgb += grain;
          
          gl_FragColor = color;
        }
      `
    };

    const noisePass = new ShaderPass(noiseShader);
    composer.addPass(noisePass);

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Animate objects
      objects.forEach(obj => {
        if (!obj.userData.isDragging) {
          // Apply floating animation
          if (obj.userData.floatSpeed && obj.userData.originalY !== undefined) {
            obj.position.y = obj.userData.originalY +
              Math.sin(time * obj.userData.floatSpeed + obj.userData.timeOffset) *
              obj.userData.floatAmplitude;
          }

          // Apply rotation
          if (obj.userData.rotationSpeed) {
            obj.rotation.x += obj.userData.rotationSpeed;
            obj.rotation.y += obj.userData.rotationSpeed * 1.3;
          }
        }
      });

      // Update noise shader time
      noisePass.uniforms.time.value = time;

      // Update controls
      orbitControls.update();

      // Render scene with post-processing
      composer.render();
    }

    animate();

    // Cleanup function
    return () => {
      if (mountRef.current && canvasRef.current) {
        window.removeEventListener('resize', handleResize);
        mountRef.current.removeChild(canvasRef.current);
      }
      
      // Dispose of resources
      scene.clear();
      renderer.dispose();
      objects.forEach(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(material => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [customImageUrl]);

  return (
    <div style={styles.container} ref={mountRef}>
      <div style={styles.info}>Click and drag objects to move them</div>
      <div style={styles.imageUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          id="image-upload"
          style={{ color: 'white' }}
        />
        <label htmlFor="image-upload">Upload Base Image</label>
      </div>
    </div>
  );
};

export default ThreeJSDraggableScene;