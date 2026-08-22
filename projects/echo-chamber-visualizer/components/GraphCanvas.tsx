import React, { useRef, useEffect, useMemo } from 'react';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import { NodeData, LinkData } from '../types/graph';

interface GraphCanvasProps {
  nodes: NodeData[];
  links: LinkData[];
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, links }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph3DInstance | null>(null);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = ForceGraph3D()(containerRef.current)
      .graphData(graphData)
      .nodeLabel('id')
      .nodeAutoColorBy('group')
      .nodeRelSize(6)
      .nodeOpacity(0.9)
      .linkWidth(1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.005)
      .backgroundColor('#050505')
      .enableNodeDrag(true)
      .onNodeClick((node) => {
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(node.x as number, node.y as number, node.z as number);
        graph.cameraPosition(
          { x: (node.x as number) * distRatio, y: (node.y as number) * distRatio, z: (node.z as number) * distRatio },
          { x: node.x, y: node.y, z: node.z },
          2000
        );
      });

    graphRef.current = graph;

    const handleResize = () => {
      if (containerRef.current) {
        graph.width(containerRef.current.clientWidth);
        graph.height(containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      graph._destructor();
    };
  }, [graphData]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-hidden cursor-move"
      style={{ fontFamily: "'Inter', sans-serif" }}
    />
  );
};

export default GraphCanvas;