"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
});

const Visualizer = () => {
  const fgRef = useRef();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    // Simulated real-time streaming data
    const gData = {
      nodes: [
        { id: 'tech', val: 20, sentiment: 0.8 },
        { id: 'ai', val: 15, sentiment: 0.9 },
        { id: 'crypto', val: 10, sentiment: -0.2 },
        { id: 'politics', val: 25, sentiment: -0.6 },
        { id: 'climate', val: 18, sentiment: 0.4 },
      ],
      links: [
        { source: 'tech', target: 'ai' },
        { source: 'tech', target: 'crypto' },
        { source: 'politics', target: 'ai' },
      ]
    };
    setData(gData);
  }, []);

  const getNodeColor = (node) => {
    return node.sentiment > 0 ? '#34d399' : '#f87171';
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white tracking-tight">Echo Chamber</h1>
        <p className="text-slate-400 mt-2">Real-time sentiment clustering</p>
      </div>

      {hoveredNode && (
        <div className="absolute bottom-8 right-8 z-10 bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 text-white shadow-2xl">
          <h2 className="text-xl font-bold mb-2">#{hoveredNode.id}</h2>
          <p className="text-sm text-slate-300">Sentiment Score: {hoveredNode.sentiment}</p>
        </div>
      )}

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeLabel="id"
        nodeColor={getNodeColor}
        nodeRelSize={6}
        nodeOpacity={0.9}
        backgroundColor="transparent"
        enableNodeDrag={true}
        onNodeHover={setHoveredNode}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#ffffff'}
        nodeThreeObject={(node) => {
          const sprite = document.createElement('div');
          sprite.style.color = getNodeColor(node);
          sprite.innerHTML = `●`;
          return null; 
        }}
      />
    </div>
  );
};

export default Visualizer;