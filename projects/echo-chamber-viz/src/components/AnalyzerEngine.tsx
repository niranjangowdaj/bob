"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  sentiment: number;
  text: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export default function AnalyzerEngine() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [input, setInput] = useState<string>('');
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });

  const processInput = () => {
    // Simulated NLP processing logic
    const words = input.split(' ').filter(w => w.length > 3);
    const nodes: Node[] = words.map((w, i) => ({
      id: w,
      group: i % 3,
      sentiment: Math.random(),
      text: w
    }));
    
    const links: Link[] = nodes.slice(0, -1).map((n, i) => ({
      source: n.id,
      target: nodes[i + 1].id,
      value: 1
    }));

    setData({ nodes, links });
  };

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<Node>(data.nodes)
      .force("link", d3.forceLink<Node, Link>(data.links).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", d => d.sentiment > 0.5 ? "#6366f1" : "#ec4899")
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    simulation.on("tick", () => {
      link.attr("x1", d => (d.source as Node).x!)
          .attr("y1", d => (d.source as Node).y!)
          .attr("x2", d => (d.target as Node).x!)
          .attr("y2", d => (d.target as Node).y!);
      node.attr("cx", d => d.x!)
          .attr("cy", d => d.y!);
    });
  }, [data]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto font-sans">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Content Analyzer</h2>
        <textarea
          className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          placeholder="Paste your social media feed content here for bias analysis..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          onClick={processInput}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Generate Map
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 shadow-xl overflow-hidden">
        <svg ref={svgRef} className="w-full h-[500px]"></svg>
      </div>
    </div>
  );
}