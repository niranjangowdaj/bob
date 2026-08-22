import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Task } from '../types';

interface GravityCanvasProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const GravityCanvas: React.FC<GravityCanvasProps> = ({ tasks, onTaskClick }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectsRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 30;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x6366f1, 2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Core Star (The Focus)
    const coreGeometry = new THREE.SphereGeometry(2, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1, emissive: 0x4f46e5, emissiveIntensity: 0.5 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    const animate = () => {
      requestAnimationFrame(animate);
      core.rotation.y += 0.005;
      
      tasks.forEach((task, index) => {
        const mesh = objectsRef.current.get(task.id);
        if (mesh) {
          const time = Date.now() * 0.001;
          const orbitRadius = 8 + (index * 2);
          mesh.position.x = Math.cos(time + index) * orbitRadius;
          mesh.position.z = Math.sin(time + index) * orbitRadius;
          mesh.rotation.y += 0.01;
        }
      });
      
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    tasks.forEach(task => {
      if (!objectsRef.current.has(task.id)) {
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0xec4899 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { id: task.id };
        sceneRef.current?.add(mesh);
        objectsRef.current.set(task.id, mesh);
      }
    });
  }, [tasks]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-[500px] cursor-pointer rounded-xl overflow-hidden shadow-2xl border border-white/10"
      onClick={(e) => {
        // Simple raycasting logic could be added here for click detection
      }}
    />
  );
};

export default GravityCanvas;