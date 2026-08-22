import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './index.css';

const EchoChamberVisualizer = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data fetching for local WASM processing initialization
    const mockData = {
      nodes: Array.from({ length: 20 }, (_, i) => ({
        id: i,
        group: Math.floor(Math.random() * 3),
        sentiment: Math.random(),
        label: `Topic ${i + 1}`
      })),
      links: Array.from({ length: 30 }, () => ({
        source: Math.floor(Math.random() * 20),
        target: Math.floor(Math.random() * 20)
      }))
    };
    setData(mockData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 600;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#4a5568')
      .attr('stroke-opacity', 0.6);

    const node = svg.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', 10)
      .attr('fill', d => d.group === 0 ? '#6366f1' : d.group === 1 ? '#ec4899' : '#10b981')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
    });
  }, [data, loading]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Echo Chamber Visualizer</h1>
        <p>Analyze your digital footprint for cognitive bias.</p>
      </header>
      
      <main className="visualization-area">
        <div className="controls">
          <button className="analyze-btn" onClick={() => alert('Initiating WASM Analysis...')}>
            Scan Feed Clusters
          </button>
        </div>
        <svg ref={svgRef} className="d3-canvas" />
      </main>

      <footer className="footer">
        <p>Privacy-first: All data processed locally via WebAssembly.</p>
      </footer>
    </div>
  );
};

export default EchoChamberVisualizer;