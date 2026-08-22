"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { ForceGraph3D } from "react-force-graph-3d";

interface Node {
  id: string;
  sentiment: number;
  val: number;
  label: string;
}

interface Link {
  source: string;
  target: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export default function GraphContainer() {
  const fgRef = useRef<any>();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    // Simulated initial data streaming
    const initialNodes: Node[] = Array.from({ length: 20 }, (_, i) => ({
      id: `node-${i}`,
      sentiment: Math.random() * 2 - 1,
      val: Math.random() * 10 + 5,
      label: `Hashtag #${i + 1}`,
    }));

    const initialLinks: Link[] = initialNodes.slice(1).map((node, i) => ({
      source: `node-${i}`,
      target: node.id,
    }));

    setData({ nodes: initialNodes, links: initialLinks });
  }, []);

  const getNodeColor = useCallback((node: Node) => {
    return node.sentiment > 0 ? "#4ade80" : "#f87171";
  }, []);

  return (
    <div className="relative w-full h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeLabel="label"
        nodeColor={getNodeColor}
        nodeRelSize={6}
        backgroundColor="#020617"
        showNavInfo={false}
        enableNodeDrag={true}
        nodeOpacity={0.9}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "#38bdf8"}
        onNodeClick={(node: any) => {
          const distance = 40;
          const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
          fgRef.current.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            2000
          );
        }}
      />
      <div className="absolute top-4 left-4 pointer-events-none">
        <h2 className="text-white font-bold text-lg tracking-tight">Sentiment Clusters</h2>
        <p className="text-slate-400 text-sm">Interactive 3D Force Graph</p>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
          <span className="w-3 h-3 rounded-full bg-green-400"></span>
          <span className="text-xs text-slate-300">Positive</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
          <span className="w-3 h-3 rounded-full bg-red-400"></span>
          <span className="text-xs text-slate-300">Negative</span>
        </div>
      </div>
    </div>
  );
}