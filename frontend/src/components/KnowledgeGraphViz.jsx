import { useEffect, useState, useRef } from 'react';

function KnowledgeGraphViz({ graphData, graphRisks = [] }) {
  const [ForceGraph, setForceGraph] = useState(null);
  const containerRef = useRef();

  useEffect(() => {
    let cancelled = false;
    import('react-force-graph-2d').then(mod => {
      if (!cancelled) setForceGraph(() => mod.default);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!graphData || !graphData.nodes?.length) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-text-muted">No knowledge graph data available</p>
      </div>
    );
  }

  const nodeColors = {
    lab_test: '#10b981',
    disease: '#ef4444',
    symptom: '#f97316',
    medication: '#22c55e',
    organ: '#34d399',
  };

  const fgData = {
    nodes: graphData.nodes.map(n => ({
      id: n.id,
      label: n.label || n.id,
      type: n.type,
      color: nodeColors[n.type] || '#64748b',
      val: n.type === 'disease' ? 3 : n.type === 'lab_test' ? 2 : 1.5,
    })),
    links: graphData.edges?.map(e => ({
      source: e.source,
      target: e.target,
      label: e.relationship,
    })) || [],
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Knowledge Graph</h3>
        <div className="flex gap-3">
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[0.6rem] text-text-muted capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="rounded-lg overflow-hidden bg-bg-primary border border-border-subtle" style={{ height: 500 }}>
        {ForceGraph ? (
          <ForceGraph
            graphData={fgData}
            width={containerRef.current?.clientWidth || 800}
            height={500}
            backgroundColor="#0a0e1a"
            nodeLabel={(n) => `${n.label} (${n.type})`}
            nodeColor={(n) => n.color}
            nodeRelSize={5}
            linkColor={() => 'rgba(100,116,139,0.3)'}
            linkWidth={1}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            enableNodeDrag={true}
            cooldownTicks={100}
            nodeCanvasObject={(node, ctx, globalScale) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val * 2.5, 0, 2 * Math.PI);
              ctx.fillStyle = node.color;
              ctx.fill();
              if (globalScale > 1.5) {
                ctx.font = `${10 / globalScale}px Inter, sans-serif`;
                ctx.fillStyle = '#f1f5f9';
                ctx.textAlign = 'center';
                ctx.fillText(node.label, node.x, node.y + node.val * 3 + 4);
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="spinner" />
            <p className="text-text-muted text-sm">Loading graph renderer...</p>
          </div>
        )}
      </div>

      {graphRisks.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Downstream Risk Paths</h4>
          <div className="flex flex-wrap gap-2">
            {graphRisks.map((risk, i) => (
              <span key={i} className="px-2 py-1 rounded text-xs bg-accent-red/10 text-accent-red border border-accent-red/20">
                {risk.source} → {risk.target}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeGraphViz;
