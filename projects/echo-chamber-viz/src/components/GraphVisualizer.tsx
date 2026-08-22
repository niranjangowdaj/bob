"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  sentiment: number;
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const GraphVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data: GraphData = useMemo(() => ({
    nodes: [
      { id: "Politics", group: 1, sentiment: 0.2, radius: 20 },
      { id: "Tech", group: 2, sentiment: 0.8, radius: 15 },
      { id: "Climate", group: 1, sentiment: -0.5, radius: 18 },
      { id: "Sports", group: 3, sentiment: 0.9, radius: 12 },
      { id: "Economy", group: 2, sentiment: 0.1, radius: 16 },
    ],
    links: [
      { source: "Politics", target: "Climate" },
      { source: "Tech", target: "Economy" },
      { source: "Politics", target: "Economy" },
    ]
  }), []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<Node>(data.nodes)
      .force("link", d3.forceLink<Node, Link>(data.links).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6);

    const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.sentiment > 0 ? "#3b82f6" : "#ef4444")
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    node.append("title").text((d) => `${d.id}: Sentiment ${d.sentiment}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      node
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!);
    });

  }, [data]);

  return (
    <div ref={containerRef} className="w-full bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
      <h3 className="text-xl font-bold text-slate-800 mb-4 font-sans">Echo Chamber Map</h3>
      <svg ref={svgRef} className="w-full h-[500px] cursor-grab active:cursor-grabbing" />
      <div className="mt-4 flex gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span> Positive Bias
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span> Negative Bias
        </div>
      </div>
    </div>
  );
};

export default GraphVisualizer;