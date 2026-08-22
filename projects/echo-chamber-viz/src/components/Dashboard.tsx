"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  group: number;
  sentiment: number;
  radius: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const Dashboard: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [biasScore, setBiasScore] = useState<number>(68);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 500;

    const data: GraphData = {
      nodes: [
        { id: "Tech", group: 1, sentiment: 0.8, radius: 20 },
        { id: "Politics", group: 2, sentiment: -0.4, radius: 25 },
        { id: "AI", group: 1, sentiment: 0.9, radius: 15 },
        { id: "Economy", group: 2, sentiment: -0.2, radius: 18 },
        { id: "Environment", group: 3, sentiment: 0.5, radius: 22 },
      ],
      links: [
        { source: "Tech", target: "AI", value: 1 },
        { source: "Politics", target: "Economy", value: 1 },
        { source: "Tech", target: "Politics", value: 0.2 },
      ],
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(data.nodes as any)
      .force("link", d3.forceLink(data.links).id((d: any) => d.id))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#4a5568")
      .attr("stroke-opacity", 0.6);

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => (d.sentiment > 0 ? "#48bb78" : "#f56565"))
      .call(d3.drag<SVGCircleElement, Node>().on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      }) as any);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    });
  }, []);

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-6 space-y-8 font-sans">
      <header className="flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Echo Chamber Visualizer</h1>
          <p className="text-gray-400">Privacy-first cognitive mapping</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
          <span className="text-sm text-gray-400 block">Bias Index</span>
          <span className="text-2xl font-mono text-emerald-400">{biasScore}%</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-900 rounded-2xl p-4 shadow-2xl border border-gray-800">
          <svg ref={svgRef} className="w-full h-[500px]"></svg>
        </div>

        <aside className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-4">Live Insights</h2>
            <ul className="space-y-4">
              <li className="flex justify-between">
                <span className="text-gray-400">Diversity Score</span>
                <span className="font-bold text-blue-400">Moderate</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">Processing Mode</span>
                <span className="font-bold text-emerald-400">Local WASM</span>
              </li>
            </ul>
            <button 
              onClick={() => setBiasScore(Math.floor(Math.random() * 100))}
              className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white rounded-lg font-medium"
            >
              Re-scan Feed
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Dashboard;