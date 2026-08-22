import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const EchoVisualizer = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    // Mock data representing social media topics
    const initialData = {
      nodes: [
        { id: "Tech", group: 1, sentiment: 0.8 },
        { id: "Politics", group: 2, sentiment: -0.5 },
        { id: "AI", group: 1, sentiment: 0.9 },
        { id: "Climate", group: 3, sentiment: 0.2 },
        { id: "Economy", group: 2, sentiment: -0.1 }
      ],
      links: [
        { source: "Tech", target: "AI" },
        { source: "Politics", target: "Economy" },
        { source: "AI", target: "Economy" }
      ]
    };
    setData(initialData);
  }, []);

  useEffect(() => {
    if (!data.nodes.length || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 500;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 2);

    const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 15)
      .attr("fill", d => d.sentiment > 0 ? "#6366f1" : "#f43f5e")
      .on("mouseover", (event, d) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null));

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });
  }, [data]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 font-sans">Echo Chamber Analysis</h2>
      <div className="w-full h-[500px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      {hoveredNode && (
        <div className="mt-4 p-4 bg-slate-800 text-white rounded-lg animate-fade-in">
          <p className="font-semibold">{hoveredNode.id}</p>
          <p className="text-sm opacity-80">Sentiment Score: {hoveredNode.sentiment}</p>
        </div>
      )}
      {!hoveredNode && (
        <p className="mt-4 text-slate-400 text-sm italic">Hover over a cluster to analyze bias metrics</p>
      )}
    </div>
  );
};

export default EchoVisualizer;