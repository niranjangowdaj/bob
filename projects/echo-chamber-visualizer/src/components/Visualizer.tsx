"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface NodeData {
  id: string;
  sentiment: number; // -1 to 1
  label: string;
}

const generateNodes = (count: number): NodeData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    sentiment: Math.random() * 2 - 1,
    label: `#Topic${i}`,
  }));
};

const Node = ({ node }: { node: NodeData }) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const color = node.sentiment > 0 ? '#4ade80' : '#f87171';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mesh.current.position.y += Math.sin(t + node.sentiment) * 0.002;
  });

  return (
    <group>
      <mesh ref={mesh} position={[Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>
    </group>
  );
};

export default function Visualizer() {
  const nodes = useMemo(() => generateNodes(20), []);

  return (
    <div className="w-full h-screen bg-slate-950">
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white tracking-tight">Echo Chamber</h1>
        <p className="text-slate-400">Real-time sentiment clustering</p>
      </div>
      
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          {nodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </Float>

        <OrbitControls 
          enablePan={false} 
          minDistance={5} 
          maxDistance={20} 
          autoRotate 
          autoRotateSpeed={0.5} 
        />
      </Canvas>

      <div className="absolute bottom-8 right-8 flex gap-4">
        <div className="bg-slate-900/80 backdrop-blur p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-3 h-3 rounded-full bg-green-400" /> Positive
            <div className="w-3 h-3 rounded-full bg-red-400 ml-4" /> Negative
          </div>
        </div>
      </div>
    </div>
  );
}