"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Scene = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    
    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0c');
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Create Sentiment Nodes
    const nodes = [];
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    
    for (let i = 0; i < 50; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? '#60a5fa' : '#f472b6',
        emissive: '#1e293b',
        shininess: 100
      });
      const sphere = new THREE.Mesh(geometry, material);
      
      sphere.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      );
      
      scene.add(sphere);
      nodes.push(sphere);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      nodes.forEach((node, i) => {
        node.rotation.x += 0.01;
        node.rotation.y += 0.01;
      });
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white tracking-tight">Echo Chamber</h1>
        <p className="text-slate-400">Real-time sentiment clustering analysis</p>
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};

export default Scene;