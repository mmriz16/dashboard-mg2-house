"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type NodeProps,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Image from "next/image";

/* ── Types ─────────────────────────────────────────────────── */

type AgentNodeData = {
  role: string;
  model: string;
  task: string;
  accentColor: string;
  icon: "user" | "ceo" | "backend" | "frontend" | "qa";
  isMain?: boolean;
};

/* ── Custom Agent Node ────────────────────────────────────── */

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const handleClass = "!bg-transparent !border-0 !w-0 !h-0";

  return (
    <>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass} />
      {/* Extra target handles for feedback edges coming in from bottom */}
      <Handle type="target" position={Position.Bottom} id="bottom-in" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left-in" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right-in" className={handleClass} />

      <div className="w-[340px] rounded-[14px] border border-white/10 bg-[#151618] p-[4px] overflow-hidden shadow-lg shadow-black/20">
        {/* Header */}
        <div className="flex items-center gap-[10px] p-[16px]">
          <Image
            src={`/icons/${data.icon}.svg`}
            alt={data.role}
            width={24}
            height={24}
            className="shrink-0"
            aria-hidden
          />
          <p className="flex-1 font-manrope text-[16px] font-normal text-white capitalize leading-normal">
            {data.role}
          </p>
        </div>

        {/* Task Area */}
        <div className="rounded-[10px] bg-[#111214] p-[8px]">
          <div
            className="flex items-center gap-[10px] rounded-[8px] p-[12px]"
            style={{ backgroundColor: `${data.accentColor}1A` }}
          >
            <div className="flex flex-1 flex-col gap-[4px] min-w-0">
              <p className="font-ibm-plex-mono text-[12px] uppercase text-white/50 whitespace-nowrap">
                {data.model}
              </p>
              <p
                className="font-manrope text-[16px] font-normal overflow-hidden text-ellipsis line-clamp-3"
                style={{ color: data.accentColor }}
              >
                {data.task || "No active task"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Node & Edge definitions ──────────────────────────────── */

const nodeTypes = { agent: AgentNode };

const initialNodes: Node<AgentNodeData>[] = [
  {
    id: "owner",
    type: "agent",
    position: { x: 380, y: 0 },
    data: {
      role: "Owner",
      model: "Miftakhul Rizky",
      task: "Oversee and direct the entire organization's strategy and vision.",
      accentColor: "#22C55E",
      icon: "user",
      isMain: true,
    },
  },
  {
    id: "ceo",
    type: "agent",
    position: { x: 380, y: 240 },
    data: {
      role: "Chief Executive Officer",
      model: "Qwen3.5-plus",
      task: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      accentColor: "#00A6F4",
      icon: "ceo",
    },
  },
  {
    id: "backend",
    type: "agent",
    position: { x: 0, y: 480 },
    data: {
      role: "Backend Developer",
      model: "Qwen3.5-plus",
      task: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      accentColor: "#B558FF",
      icon: "backend",
    },
  },
  {
    id: "frontend",
    type: "agent",
    position: { x: 380, y: 480 },
    data: {
      role: "Frontend Developer",
      model: "Qwen3.5-plus",
      task: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      accentColor: "#FB2C36",
      icon: "frontend",
    },
  },
  {
    id: "qa",
    type: "agent",
    position: { x: 760, y: 480 },
    data: {
      role: "Quality Assurance",
      model: "Qwen3.5-plus",
      task: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      accentColor: "#F0B100",
      icon: "qa",
    },
  },
];

const dashedStyle = { stroke: "rgba(255,255,255,0.15)", strokeWidth: 2, strokeDasharray: "8 6" };
const arrowMarker = { type: MarkerType.ArrowClosed as const, color: "rgba(255,255,255,0.15)", width: 16, height: 16 };
const feedbackStyle = { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1.5, strokeDasharray: "8 6" };
const feedbackArrow = { type: MarkerType.ArrowClosed as const, color: "rgba(255,255,255,0.1)", width: 14, height: 14 };

const initialEdges: Edge[] = [
  // Owner bottom → CEO top
  {
    id: "owner-ceo",
    source: "owner",
    sourceHandle: "bottom",
    target: "ceo",
    targetHandle: "top",
    type: "smoothstep",
    animated: true,
    style: dashedStyle,
    markerEnd: arrowMarker,
  },
  // CEO left side → Backend top
  {
    id: "ceo-backend",
    source: "ceo",
    sourceHandle: "left",
    target: "backend",
    targetHandle: "top",
    type: "smoothstep",
    animated: true,
    style: dashedStyle,
    markerEnd: arrowMarker,
  },
  // CEO bottom → Frontend top
  {
    id: "ceo-frontend",
    source: "ceo",
    sourceHandle: "bottom",
    target: "frontend",
    targetHandle: "top",
    type: "smoothstep",
    animated: true,
    style: dashedStyle,
    markerEnd: arrowMarker,
  },
  // CEO right side → QA top
  {
    id: "ceo-qa",
    source: "ceo",
    sourceHandle: "right",
    target: "qa",
    targetHandle: "top",
    type: "smoothstep",
    animated: true,
    style: dashedStyle,
    markerEnd: arrowMarker,
  },
  // Feedback loop: Backend bottom → Frontend bottom-in
  {
    id: "backend-frontend",
    source: "backend",
    sourceHandle: "bottom",
    target: "frontend",
    targetHandle: "bottom-in",
    type: "smoothstep",
    animated: true,
    style: feedbackStyle,
    markerEnd: feedbackArrow,
  },
  // Feedback loop: Frontend bottom → QA bottom-in
  {
    id: "frontend-qa",
    source: "frontend",
    sourceHandle: "bottom",
    target: "qa",
    targetHandle: "bottom-in",
    type: "smoothstep",
    animated: true,
    style: feedbackStyle,
    markerEnd: feedbackArrow,
  },
];

/* ── Flow Wrapper with custom styling ─────────────────────── */

const proOptions = { hideAttribution: true };

function HierarchyFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: "rgba(255,255,255,0.15)", strokeWidth: 2 },
    }),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      proOptions={proOptions}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnDrag={true}
      zoomOnScroll={true}
      snapToGrid={true}
      snapGrid={[24, 24]}
      minZoom={0.3}
      maxZoom={1.5}
      className="hierarchy-flow"
    >
      <Controls
        showInteractive={false}
        position="bottom-right"
        orientation="horizontal"
        style={{
          background: "rgba(21, 22, 24, 0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex",
          color: "rgba(237, 237, 237, 1)",
        }}
      />
    </ReactFlow>
  );
}

/* ── Page Component ────────────────────────────────────────── */

export default function AgentHierarchyPage() {
  return (
    <main className="relative h-full w-full overflow-hidden rounded-[14px]">
      {/* Custom CSS overrides for React Flow to match our dark theme */}
      <style jsx global>{`
        .hierarchy-flow .react-flow__pane {
          cursor: grab;
        }
        .hierarchy-flow .react-flow__pane:active {
          cursor: grabbing;
        }
        .hierarchy-flow .react-flow__background {
          background-color: transparent !important;
        }
        .hierarchy-flow .react-flow__node {
          cursor: grab;
        }
        .hierarchy-flow .react-flow__node:active {
          cursor: grabbing;
        }
        .hierarchy-flow .react-flow__node.selected {
          outline: none;
          box-shadow: none;
        }
        .hierarchy-flow .react-flow__node:focus {
          outline: none;
          box-shadow: none;
        }
        .hierarchy-flow .react-flow__edge-path {
          stroke-dasharray: 8 6;
        }
        .hierarchy-flow .react-flow__controls {
          background: rgba(21, 22, 24, 0.98);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          color: rgba(237, 237, 237, 1);
        }
        .hierarchy-flow .react-flow__controls button {
          background: rgba(21, 22, 24, 0.98);
          border-color: rgba(238, 238, 238, 0.1) !important;
          color: rgba(255,255,255,0.5);
          width: 32px;
          height: 32px;
        }
        .hierarchy-flow .react-flow__controls button:hover {
          background: #1a1b1e;
          color: white;
        }
        .hierarchy-flow .react-flow__controls button svg {
          fill: currentColor;
        }
        .hierarchy-flow .react-flow__minimap {
          background: #111214 !important;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>

      {/* Dot-grid background */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* React Flow canvas */}
      <ReactFlowProvider>
        <HierarchyFlow />
      </ReactFlowProvider>
    </main>
  );
}
