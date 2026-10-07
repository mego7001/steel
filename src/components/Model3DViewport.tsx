import React, { useEffect, useRef, useState } from 'react';
import {
  MemberCheckResult,
  ProjectData,
  StructuralMember,
  StructuralNode,
} from '../types/engineering';
import { getProfileById } from '../services/catalogService';
import {
  Maximize2,
  RotateCcw,
  Eye,
  Sliders,
  Layers,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react';

interface Model3DViewportProps {
  project: ProjectData;
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
  onOpenSectionLibrary?: (memberId: string) => void;
}

export const Model3DViewport: React.FC<Model3DViewportProps> = ({
  project,
  selectedMemberId,
  onSelectMember,
  onOpenSectionLibrary,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera State
  const [rotationX, setRotationX] = useState<number>(25); // degrees
  const [rotationY, setRotationY] = useState<number>(-35); // degrees
  const [zoom, setZoom] = useState<number>(45); // scale factor
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(20);

  // Display Mode
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'stresses' | 'deformed'>('stresses');
  const [showNodes, setShowNodes] = useState<boolean>(true);
  const [showMarks, setShowMarks] = useState<boolean>(true);
  const [showSupports, setShowSupports] = useState<boolean>(true);
  const [deformScale, setDeformScale] = useState<number>(30); // 30x magnification

  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset view
  const handleResetCamera = () => {
    setRotationX(25);
    setRotationY(-35);
    setZoom(45);
    setPanX(0);
    setPanY(20);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Center point in view
    const originX = width / 2 + panX;
    const originY = height / 2 + panY;

    // Model center offset to center around bounding box
    const midX = project.dimensions.widthM / 2;
    const midY = project.dimensions.eaveHeightM / 2;
    const midZ = project.dimensions.lengthM / 2;

    const radX = (rotationX * Math.PI) / 180;
    const radY = (rotationY * Math.PI) / 180;

    // 3D to 2D projection function
    const project3D = (x: number, y: number, z: number, dy: number = 0) => {
      // Offset to center
      const cx = x - midX;
      const cy = (y + dy) - midY;
      const cz = z - midZ;

      // Rotate Y
      const x1 = cx * Math.cos(radY) - cz * Math.sin(radY);
      const z1 = cx * Math.sin(radY) + cz * Math.cos(radY);

      // Rotate X
      const y2 = cy * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = cy * Math.sin(radX) + z1 * Math.cos(radX);

      // Perspective projection
      const fov = 600;
      const distance = 500 - z2 * (zoom * 0.15);
      const scale = (fov / Math.max(100, distance)) * (zoom / 25);

      const screenX = originX + x1 * scale * 8;
      const screenY = originY - y2 * scale * 8; // Invert Y for canvas

      return { x: screenX, y: screenY, depth: z2 };
    };

    // Draw Ground CAD Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    const gridMax = Math.max(project.dimensions.widthM, project.dimensions.lengthM) + 4;
    const step = 1.0;

    for (let gx = -2; gx <= project.dimensions.widthM + 2; gx += step) {
      const p1 = project3D(gx, 0, -2);
      const p2 = project3D(gx, 0, project.dimensions.lengthM + 2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gz = -2; gz <= project.dimensions.lengthM + 2; gz += step) {
      const p1 = project3D(-2, 0, gz);
      const p2 = project3D(project.dimensions.widthM + 2, 0, gz);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw Supports at Fixed/Pinned nodes
    if (showSupports) {
      project.nodes
        .filter((n) => n.support !== 'free')
        .forEach((node) => {
          const pt = project3D(node.x, node.y, node.z);
          ctx.fillStyle = node.support === 'fixed' ? '#f59e0b' : '#3b82f6';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;

          // Triangle support symbol
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x - 7, pt.y + 12);
          ctx.lineTo(pt.x + 7, pt.y + 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Base line
          ctx.beginPath();
          ctx.moveTo(pt.x - 10, pt.y + 14);
          ctx.lineTo(pt.x + 10, pt.y + 14);
          ctx.stroke();
        });
    }

    // Sort members by average depth for correct rendering order
    const sortedMembers = [...project.members].map((m) => {
      const sNode = project.nodes.find((n) => n.id === m.startNodeId);
      const eNode = project.nodes.find((n) => n.id === m.endNodeId);
      if (!sNode || !eNode) return { member: m, depth: 0, sNode, eNode };

      const p1 = project3D(sNode.x, sNode.y, sNode.z);
      const p2 = project3D(eNode.x, eNode.y, eNode.z);
      const avgDepth = (p1.depth + p2.depth) / 2;
      return { member: m, depth: avgDepth, sNode, eNode };
    });

    sortedMembers.sort((a, b) => b.depth - a.depth);

    // Draw Members
    sortedMembers.forEach(({ member, sNode, eNode }) => {
      if (!sNode || !eNode) return;

      const check = project.memberChecks.find((c) => c.memberId === member.id);
      const isSelected = selectedMemberId === member.id;
      const section = getProfileById(member.sectionId);

      // Deformed shape deflection calculation if mode is 'deformed'
      let deflOffset = 0;
      if (renderMode === 'deformed' && (member.type === 'rafter' || member.type === 'beam')) {
        deflOffset = -0.015 * deformScale; // visual deflection in meters
      }

      const p1 = project3D(sNode.x, sNode.y, sNode.z);
      const p2 = project3D(eNode.x, eNode.y, eNode.z);
      const pMid = project3D(
        (sNode.x + eNode.x) / 2,
        (sNode.y + eNode.y) / 2,
        (sNode.z + eNode.z) / 2,
        deflOffset
      );

      // Stroke Color determination
      let strokeColor = '#94a3b8';
      let lineWidth = 2.5;

      if (isSelected) {
        strokeColor = '#38bdf8'; // vibrant cyan
        lineWidth = 5;
      } else if (renderMode === 'stresses' && check) {
        const ratio = check.interactionRatio;
        if (ratio > 1.0) {
          strokeColor = '#ef4444'; // Red (Fail)
          lineWidth = 4;
        } else if (ratio >= 0.70) {
          strokeColor = '#f59e0b'; // Amber (High Utilization)
          lineWidth = 3.5;
        } else {
          strokeColor = '#10b981'; // Green (Safe)
          lineWidth = 2.5;
        }
      } else if (renderMode === 'solid') {
        strokeColor = member.type === 'column' ? '#64748b' : member.type === 'rafter' ? '#cbd5e1' : '#475569';
        lineWidth = Math.max(3, (section?.h || 160) / 45);
      }

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      if (renderMode === 'deformed' && deflOffset !== 0) {
        // Quadratic curve to show beam deflection sag
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(pMid.x, pMid.y, p2.x, p2.y);
      } else {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      // Draw Member Mark Text label
      if (showMarks) {
        ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(203, 213, 225, 0.75)';
        ctx.font = isSelected ? 'bold 11px Cairo, sans-serif' : '10px Cairo, sans-serif';
        ctx.fillText(member.mark, pMid.x + 4, pMid.y - 4);
      }
    });

    // Draw Nodes
    if (showNodes) {
      project.nodes.forEach((node) => {
        const pt = project3D(node.x, node.y, node.z);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [
    project,
    rotationX,
    rotationY,
    zoom,
    panX,
    panY,
    renderMode,
    showNodes,
    showMarks,
    showSupports,
    deformScale,
    selectedMemberId,
  ]);

  // Mouse interaction handlers for 3D camera
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    if (e.shiftKey || e.buttons === 2) {
      // Pan
      setPanX((prev) => prev + dx * 0.6);
      setPanY((prev) => prev + dy * 0.6);
    } else {
      // Orbit
      setRotationY((prev) => prev + dx * 0.45);
      setRotationX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.45)));
    }

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.max(15, Math.min(120, prev - e.deltaY * 0.04)));
  };

  const selectedMember = project.members.find((m) => m.id === selectedMemberId);
  const selectedCheck = selectedMember ? project.memberChecks.find((c) => c.memberId === selectedMember.id) : null;
  const selectedSection = selectedMember ? getProfileById(selectedMember.sectionId) : null;

  return (
    <div className="relative w-full h-[520px] rounded-lg border border-slate-800 bg-slate-950 overflow-hidden flex flex-col">
      {/* 3D Canvas Top Toolbar */}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between z-10 pointer-events-none">
        {/* Left tools: Render mode & options */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-800 rounded p-1 pointer-events-auto shadow-md">
          <button
            onClick={() => setRenderMode('stresses')}
            className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              renderMode === 'stresses' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            خريطة الإجهاد (Stress)
          </button>
          <button
            onClick={() => setRenderMode('solid')}
            className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              renderMode === 'solid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            مجسم (Solid 3D)
          </button>
          <button
            onClick={() => setRenderMode('deformed')}
            className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              renderMode === 'deformed' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            شكل التشوه (Deformed)
          </button>
        </div>

        {/* Right tools: Viewport controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-800 rounded p-1 pointer-events-auto shadow-md">
          <button
            onClick={() => setShowMarks(!showMarks)}
            title="إظهار مسميات الأعضاء"
            className={`p-1.5 rounded text-xs transition cursor-pointer ${
              showMarks ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.min(120, prev + 8))}
            title="تكبير Zoom In"
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 text-xs transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(15, prev - 8))}
            title="تصغير Zoom Out"
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 text-xs transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCamera}
            title="إعادة ضبط الكاميرا"
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing cad-grid"
      />

      {/* Stress Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded p-2 text-xs flex flex-col gap-1 pointer-events-none shadow-md">
        <span className="font-semibold text-slate-300 text-[11px]">نسبة الاستغلال الكودية (Unity Ratio):</span>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-emerald-400">&le; 0.70 آمن</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-amber-400">0.70 - 0.99 استغلال عالٍ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="text-rose-400">&gt; 1.00 حرج (فشل)</span>
          </div>
        </div>
      </div>

      {/* Member Inspector Panel (Bottom Center or Top Center if selected) */}
      {selectedMember && (
        <div className="absolute top-16 right-3 bg-slate-900/95 backdrop-blur border border-sky-500/40 rounded-lg p-3 w-80 text-xs shadow-xl z-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="font-bold text-slate-100 text-sm">{selectedMember.mark}</span>
              <span className="text-slate-400 font-mono">({selectedMember.type})</span>
            </div>
            <button
              onClick={() => onSelectMember(null)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">القطاع الإنشائي:</span>
              <span className="font-mono text-amber-300 font-medium">{selectedSection?.name || selectedMember.sectionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">رتبة الصلب:</span>
              <span className="font-mono">{selectedMember.materialGrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">تجميعة الورشة:</span>
              <span className="font-mono text-slate-200">{selectedMember.assemblyMark}</span>
            </div>
            {selectedCheck && (
              <>
                <div className="border-t border-slate-800 pt-1.5 mt-1.5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">القوة المحورية (Pu):</span>
                    <span className="font-mono text-slate-200">{selectedCheck.axialForceKn} kN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">عزم الانحناء (Mu):</span>
                    <span className="font-mono text-slate-200">{selectedCheck.bendingMomentKnM} kN·m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">نسبة التفاعل (Unity Check):</span>
                    <span className={`font-mono font-bold ${selectedCheck.interactionRatio <= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedCheck.interactionRatio} ({selectedCheck.status === 'pass' ? 'PASS' : 'FAIL'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">سهم الانحناء (Deflection):</span>
                    <span className="font-mono text-slate-200">{selectedCheck.deflectionRatio} (Limit &le; 1.0)</span>
                  </div>
                </div>
              </>
            )}

            {/* Quick Open Section Library Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onOpenSectionLibrary && onOpenSectionLibrary(selectedMember.id)}
                className="w-full py-1.5 px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-500/20"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>مكتبة القطاعات (HEB, IPE, UPN...)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
