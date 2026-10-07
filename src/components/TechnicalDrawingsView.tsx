import React, { useState } from 'react';
import { ProjectData, WeldingSymbolDefinition } from '../types/engineering';
import {
  downloadTextFile,
  generateDxfForPart,
  generateNC1ForPart,
  generateReleaseManifest,
} from '../services/exportService';
import { AssemblySequenceViewer } from './AssemblySequenceViewer';
import { WeldingSymbolsManager } from './WeldingSymbolsManager';
import {
  FileText,
  Download,
  Layers,
  Printer,
  Maximize2,
  CheckCircle2,
  HardHat,
  Play,
  Flame,
  Info,
  ExternalLink,
  Tag,
} from 'lucide-react';

interface TechnicalDrawingsViewProps {
  project: ProjectData;
  onUpdateWeldingSymbol?: (symbolId: string, updated: Partial<WeldingSymbolDefinition>) => void;
  onAddWeldingSymbol?: (symbol: WeldingSymbolDefinition) => void;
  onDeleteWeldingSymbol?: (symbolId: string) => void;
}

export const TechnicalDrawingsView: React.FC<TechnicalDrawingsViewProps> = ({
  project,
  onUpdateWeldingSymbol = () => {},
  onAddWeldingSymbol = () => {},
  onDeleteWeldingSymbol = () => {},
}) => {
  const [selectedDrawingType, setSelectedDrawingType] = useState<
    'GA' | 'ERECTION' | 'ASSEMBLY' | 'PART' | 'SEQUENCE' | 'WELDING'
  >('GA');
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(0);
  const [showWeldingCallouts, setShowWeldingCallouts] = useState<boolean>(true);
  const [activeCalloutModal, setActiveCalloutModal] = useState<string | null>(null);

  const selectedPart = project.parts[selectedPartIndex] || project.parts[0];

  const handleDownloadDxf = () => {
    if (!selectedPart) return;
    const dxfContent = generateDxfForPart(selectedPart);
    downloadTextFile(`${selectedPart.mark}_profile.dxf`, dxfContent, 'application/dxf');
  };

  const handleDownloadNC1 = () => {
    if (!selectedPart) return;
    const ncContent = generateNC1ForPart(selectedPart);
    downloadTextFile(`${selectedPart.mark}.nc1`, ncContent, 'text/plain');
  };

  const handleDownloadManifest = () => {
    const manifestJson = generateReleaseManifest(project);
    downloadTextFile(
      `RELEASE_MANIFEST_${project.projectNumber}_REV${project.revision}.json`,
      manifestJson,
      'application/json'
    );
  };

  const bpWeld = project.weldingSymbols?.find((w) => w.connectionCategory === 'BASE_PLATE') || {
    id: 'WELD-BP-1',
    jointNameAr: 'لحام قاعدة العمود مع الصفيحة الأساسية',
    weldLegMm: 8,
    effectiveThroatMm: 5.7,
    process: 'GMAW_MIG',
    qualifiedWpsNo: 'WPS-MWEC-BP-01',
    allAround: true,
    linkedConnectionId: project.basePlates[0]?.id || 'BP_1',
  };

  const mepWeld = project.weldingSymbols?.find((w) => w.connectionCategory === 'MOMENT_END_PLATE') || {
    id: 'WELD-MEP-1',
    jointNameAr: 'لحام أجنحة الرافتر مع صفيحة العزم',
    weldLegMm: 8,
    effectiveThroatMm: 5.7,
    process: 'GMAW_MIG',
    qualifiedWpsNo: 'WPS-MWEC-MEP-01',
    allAround: false,
    linkedConnectionId: project.momentEndPlates[0]?.id || 'MEP_1',
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Drawing Selector & Export Actions */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              المخططات التنفيذية وحزمة الورشة (Shop Drawings & Production Release Pack)
            </h3>
            <span className="text-xs text-slate-400">
              جميع الأبعاد ومواصفات ورموز اللحام مستخرجة مباشرة من الهندسة وحسابات الوصلات.
            </span>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadDxf}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>تصدير DXF للماكينات</span>
          </button>
          <button
            onClick={handleDownloadNC1}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>تصدير DSTV / NC1</span>
          </button>
          <button
            onClick={handleDownloadManifest}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير حزمة الإطلاق (Manifest)</span>
          </button>
        </div>
      </div>

      {/* Sub-selector for Drawing Types */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDrawingType('GA')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              selectedDrawingType === 'GA'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            مخطط المسقط العام (GA Drawing)
          </button>
          <button
            onClick={() => setSelectedDrawingType('ERECTION')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              selectedDrawingType === 'ERECTION'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            مخطط واجهة التركيب (Erection Elevation)
          </button>
          <button
            onClick={() => setSelectedDrawingType('ASSEMBLY')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              selectedDrawingType === 'ASSEMBLY'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            رسم تجميعة العمود والقاعدة (Assembly AS-COL)
          </button>
          <button
            onClick={() => setSelectedDrawingType('PART')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              selectedDrawingType === 'PART'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            رسم القطع المنفردة (Single Part DXF Sheet)
          </button>
          <button
            onClick={() => setSelectedDrawingType('SEQUENCE')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDrawingType === 'SEQUENCE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>تسلسل تجميع الهيكل (Assembly Animation)</span>
          </button>
          <button
            onClick={() => setSelectedDrawingType('WELDING')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDrawingType === 'WELDING'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-amber-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>رموز ومواصفات اللحام التنفيذية (Welding Symbols AWS A2.4)</span>
          </button>
        </div>

        {/* CAD Layer Annotations Toggle (Shown when in CAD views) */}
        {selectedDrawingType !== 'SEQUENCE' && selectedDrawingType !== 'WELDING' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowWeldingCallouts(!showWeldingCallouts)}
              className={`px-2.5 py-1.5 rounded border transition cursor-pointer flex items-center gap-1.5 ${
                showWeldingCallouts
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>رموز اللحام على المخطط: {showWeldingCallouts ? 'ظاهرة' : 'مخفية'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {selectedDrawingType === 'WELDING' ? (
        <WeldingSymbolsManager
          project={project}
          onUpdateWeldingSymbol={onUpdateWeldingSymbol}
          onAddWeldingSymbol={onAddWeldingSymbol}
          onDeleteWeldingSymbol={onDeleteWeldingSymbol}
        />
      ) : selectedDrawingType === 'SEQUENCE' ? (
        <AssemblySequenceViewer project={project} />
      ) : (
        /* Vector Drawing Canvas with CAD Border & Title Block */
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center relative">
          <div className="w-full max-w-[900px] bg-slate-950 rounded border-2 border-slate-700 p-3 cad-grid text-slate-100 flex flex-col justify-between shadow-2xl relative">
            {/* Main Drawing Area */}
            <div className="w-full h-[470px] flex items-center justify-center relative overflow-hidden select-none">
              {/* 1. GA DRAWING */}
              {selectedDrawingType === 'GA' && (
                <svg viewBox="0 0 800 400" className="w-full h-full">
                  {/* Outer grid boundary */}
                  <rect x="50" y="50" width="700" height="280" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6,6" />
                  
                  {/* Gridlines */}
                  <line x1="50" y1="50" x2="50" y2="330" stroke="#475569" strokeWidth="1" />
                  <line x1="283" y1="50" x2="283" y2="330" stroke="#475569" strokeWidth="1" />
                  <line x1="516" y1="50" x2="516" y2="330" stroke="#475569" strokeWidth="1" />
                  <line x1="750" y1="50" x2="750" y2="330" stroke="#475569" strokeWidth="1" />

                  {/* Grid Bubbles */}
                  <circle cx="50" cy="30" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="46" y="34" fill="#f59e0b" fontSize="12" fontWeight="bold">1</text>

                  <circle cx="283" cy="30" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="279" y="34" fill="#f59e0b" fontSize="12" fontWeight="bold">2</text>

                  <circle cx="516" cy="30" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="512" y="34" fill="#f59e0b" fontSize="12" fontWeight="bold">3</text>

                  <circle cx="750" cy="30" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="746" y="34" fill="#f59e0b" fontSize="12" fontWeight="bold">4</text>

                  {/* Columns marks at intersections */}
                  {[50, 283, 516, 750].map((x, i) => (
                    <React.Fragment key={i}>
                      <rect x={x - 10} y={40} width="20" height="20" fill="#38bdf8" />
                      <rect x={x - 10} y={320} width="20" height="20" fill="#38bdf8" />
                    </React.Fragment>
                  ))}

                  {/* Longitudinal roof purlins */}
                  <line x1="50" y1="50" x2="750" y2="50" stroke="#cbd5e1" strokeWidth="2.5" />
                  <line x1="50" y1="140" x2="750" y2="140" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" />
                  <line x1="50" y1="240" x2="750" y2="240" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" />
                  <line x1="50" y1="330" x2="750" y2="330" stroke="#cbd5e1" strokeWidth="2.5" />

                  {/* Cross Bracing in Bay 1 */}
                  <line x1="50" y1="50" x2="283" y2="330" stroke="#ef4444" strokeWidth="1.5" />
                  <line x1="50" y1="330" x2="283" y2="50" stroke="#ef4444" strokeWidth="1.5" />

                  {/* Welding Callout Marker on GA (Column Base) */}
                  {showWeldingCallouts && (
                    <g
                      className="cursor-pointer transition hover:opacity-90"
                      onClick={() => setActiveCalloutModal('BP')}
                    >
                      <circle cx="50" cy="330" r="12" fill="#0284c7" opacity="0.2" />
                      <line x1="50" y1="330" x2="110" y2="360" stroke="#f59e0b" strokeWidth="1.5" />
                      <line x1="110" y1="360" x2="190" y2="360" stroke="#f59e0b" strokeWidth="1.5" />
                      <circle cx="110" cy="360" r="5" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="115" y="355" fill="#f59e0b" fontSize="10" fontFamily="monospace">FW 8 ◯</text>
                      <text x="115" y="372" fill="#38bdf8" fontSize="8" fontFamily="monospace">BP-01 (WPS-01)</text>
                    </g>
                  )}

                  {/* Dimension line */}
                  <line x1="50" y1="385" x2="750" y2="385" stroke="#94a3b8" strokeWidth="1" />
                  <text x="360" y="398" fill="#f8fafc" fontSize="12" fontFamily="monospace">
                    L = {project.dimensions.lengthM * 1000} mm
                  </text>
                </svg>
              )}

              {/* 2. ERECTION ELEVATION */}
              {selectedDrawingType === 'ERECTION' && (
                <svg viewBox="0 0 800 400" className="w-full h-full">
                  {/* Ground Line */}
                  <line x1="80" y1="340" x2="720" y2="340" stroke="#f59e0b" strokeWidth="3" />
                  <text x="90" y="360" fill="#94a3b8" fontSize="11" fontFamily="monospace">LEVEL ±0.00 (FINISH FLOOR)</text>

                  {/* Columns */}
                  <rect x="180" y="100" width="20" height="240" fill="#38bdf8" />
                  <rect x="580" y="100" width="20" height="240" fill="#38bdf8" />

                  {/* Pitch Rafters */}
                  <line x1="190" y1="100" x2="390" y2="40" stroke="#cbd5e1" strokeWidth="6" />
                  <line x1="390" y1="40" x2="590" y2="100" stroke="#cbd5e1" strokeWidth="6" />

                  {/* Eaves & Ridge Dimensions */}
                  <text x="110" y="105" fill="#f8fafc" fontSize="11" fontFamily="monospace">Eaves +{project.dimensions.eaveHeightM}m</text>
                  <text x="370" y="30" fill="#f8fafc" fontSize="11" fontFamily="monospace">Apex +{project.dimensions.ridgeHeightM}m</text>

                  {/* Base Plate & Foundation */}
                  <rect x="165" y="335" width="50" height="10" fill="#f59e0b" />
                  <rect x="565" y="335" width="50" height="10" fill="#f59e0b" />

                  {/* Welding Callout Annotations on Erection Elevation */}
                  {showWeldingCallouts && (
                    <>
                      {/* Eaves Moment Knee Joint Callout */}
                      <g
                        className="cursor-pointer transition hover:opacity-90"
                        onClick={() => setActiveCalloutModal('MEP')}
                      >
                        <line x1="190" y1="100" x2="130" y2="60" stroke="#f59e0b" strokeWidth="1.5" />
                        <polygon points="190,100 182,93 186,99" fill="#f59e0b" />
                        <line x1="130" y1="60" x2="40" y2="60" stroke="#f59e0b" strokeWidth="1.8" />
                        {/* Fillet symbol triangles */}
                        <polygon points="90,60 100,60 90,50" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                        <polygon points="90,60 100,60 90,70" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="75" y="58" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">8</text>
                        {/* Tail */}
                        <line x1="40" y1="60" x2="25" y2="50" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="40" y1="60" x2="25" y2="70" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="28" y="46" fill="#10b981" fontSize="9" fontFamily="monospace">MEP-01</text>
                        <text x="28" y="78" fill="#94a3b8" fontSize="8" fontFamily="monospace">WPS-FLG</text>
                      </g>

                      {/* Base Plate Weld Callout at Column Base */}
                      <g
                        className="cursor-pointer transition hover:opacity-90"
                        onClick={() => setActiveCalloutModal('BP')}
                      >
                        <line x1="180" y1="335" x2="110" y2="300" stroke="#f59e0b" strokeWidth="1.5" />
                        <polygon points="180,335 170,330 174,337" fill="#f59e0b" />
                        <line x1="110" y1="300" x2="20" y2="300" stroke="#f59e0b" strokeWidth="1.8" />
                        <circle cx="110" cy="300" r="7" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                        {/* Fillet triangles both sides */}
                        <polygon points="70,300 80,300 70,290" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                        <polygon points="70,300 80,300 70,310" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="55" y="298" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">8</text>
                        {/* Tail */}
                        <line x1="20" y1="300" x2="5" y2="290" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="20" y1="300" x2="5" y2="310" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="10" y="286" fill="#10b981" fontSize="9" fontFamily="monospace">BP-01</text>
                        <text x="10" y="322" fill="#94a3b8" fontSize="8" fontFamily="monospace">WPS-BP-01</text>
                      </g>
                    </>
                  )}
                </svg>
              )}

              {/* 3. ASSEMBLY DRAWING AS-COL-01 (DETAILED SHOP DRAWING) */}
              {selectedDrawingType === 'ASSEMBLY' && (
                <svg viewBox="0 0 800 440" className="w-full h-full">
                  {/* Grid layout background */}
                  <rect x="40" y="30" width="720" height="380" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Assembly Column (H-Profile in elevation) */}
                  <rect x="360" y="90" width="40" height="240" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="2.5" />
                  <line x1="380" y1="90" x2="380" y2="330" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6,4" />

                  {/* Top Cap plate */}
                  <rect x="340" y="75" width="80" height="15" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
                  {/* Top Stiffener plates */}
                  <line x1="360" y1="120" x2="400" y2="120" stroke="#cbd5e1" strokeWidth="3" />
                  <line x1="360" y1="140" x2="400" y2="140" stroke="#cbd5e1" strokeWidth="3" />

                  {/* Base Plate welded at bottom */}
                  <rect x="310" y="330" width="140" height="20" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
                  {/* Holes in base plate */}
                  <circle cx="330" cy="340" r="5" fill="#ef4444" stroke="#f8fafc" strokeWidth="1" />
                  <circle cx="430" cy="340" r="5" fill="#ef4444" stroke="#f8fafc" strokeWidth="1" />

                  {/* Dimension Annotations */}
                  <line x1="480" y1="90" x2="480" y2="330" stroke="#94a3b8" strokeWidth="1" />
                  <line x1="475" y1="90" x2="485" y2="90" stroke="#94a3b8" strokeWidth="1" />
                  <line x1="475" y1="330" x2="485" y2="330" stroke="#94a3b8" strokeWidth="1" />
                  <text x="490" y="215" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                    H = {project.dimensions.eaveHeightM * 1000} mm
                  </text>

                  <line x1="310" y1="365" x2="450" y2="365" stroke="#94a3b8" strokeWidth="1" />
                  <text x="350" y="380" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                    B = {project.basePlates[0]?.plateLength || 350} mm
                  </text>

                  {/* Column Mark Tag */}
                  <text x="210" y="200" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">
                    MARK: AS-COL-01
                  </text>
                  <text x="210" y="220" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
                    الكمية الإجمالية: {project.dimensions.baysCount + 1} أطقم
                  </text>

                  {/* TRUE AWS A2.4 WELDING SYMBOL LEADER CALLOUT (BOTTOM BASE PLATE) */}
                  {showWeldingCallouts && (
                    <g
                      className="cursor-pointer group"
                      onClick={() => setActiveCalloutModal('BP')}
                    >
                      {/* Leader arrow from joint to reference line */}
                      <line x1="400" y1="330" x2="520" y2="300" stroke="#f59e0b" strokeWidth="2.2" />
                      <polygon points="400,330 412,323 416,330" fill="#f59e0b" />

                      {/* All-around circle at knee */}
                      <circle cx="520" cy="300" r="9" fill="none" stroke="#38bdf8" strokeWidth="2" />

                      {/* Horizontal Reference Line */}
                      <line x1="520" y1="300" x2="660" y2="300" stroke="#f59e0b" strokeWidth="2.5" />

                      {/* Fillet symbol below reference line (arrow side) */}
                      <polygon points="570,300 588,300 570,318" fill="none" stroke="#f59e0b" strokeWidth="2" />
                      {/* Fillet symbol above reference line (other side) */}
                      <polygon points="570,300 588,300 570,282" fill="none" stroke="#f59e0b" strokeWidth="2" />

                      {/* Size annotation */}
                      <text x="548" y="296" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        {bpWeld.weldLegMm}
                      </text>
                      <text x="548" y="315" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        {bpWeld.weldLegMm}
                      </text>

                      {/* Reference line tail fork */}
                      <line x1="660" y1="300" x2="675" y2="285" stroke="#f59e0b" strokeWidth="2" />
                      <line x1="660" y1="300" x2="675" y2="315" stroke="#f59e0b" strokeWidth="2" />

                      {/* Process & WPS in Tail */}
                      <text x="682" y="292" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        GMAW ER70S-6
                      </text>
                      <text x="682" y="306" fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">
                        VT 100%
                      </text>
                      <text x="682" y="320" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                        {bpWeld.qualifiedWpsNo}
                      </text>

                      {/* Interactive click badge */}
                      <rect x="525" y="326" width="130" height="20" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" opacity="0.9" />
                      <text x="590" y="340" fill="#f59e0b" fontSize="10" textAnchor="middle" fontFamily="sans-serif">
                        🔍 انقر لمعاينة فحص اللحام
                      </text>
                    </g>
                  )}

                  {/* TOP CAP PLATE WELD CALLOUT */}
                  {showWeldingCallouts && (
                    <g
                      className="cursor-pointer group"
                      onClick={() => setActiveCalloutModal('STIFF')}
                    >
                      <line x1="400" y1="90" x2="520" y2="60" stroke="#f59e0b" strokeWidth="2" />
                      <polygon points="400,90 412,83 416,90" fill="#f59e0b" />

                      <line x1="520" y1="60" x2="650" y2="60" stroke="#f59e0b" strokeWidth="2.2" />

                      {/* Fillet symbol */}
                      <polygon points="565,60 580,60 565,46" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                      <polygon points="565,60 580,60 565,74" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                      <text x="548" y="58" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">6</text>

                      {/* Tail */}
                      <line x1="650" y1="60" x2="665" y2="48" stroke="#f59e0b" strokeWidth="1.8" />
                      <line x1="650" y1="60" x2="665" y2="72" stroke="#f59e0b" strokeWidth="1.8" />
                      <text x="670" y="55" fill="#10b981" fontSize="9.5" fontFamily="monospace">CAP PLATE</text>
                      <text x="670" y="68" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">WPS-STIFF-01</text>
                    </g>
                  )}
                </svg>
              )}

              {/* 4. SINGLE PART DXF SHEET */}
              {selectedDrawingType === 'PART' && selectedPart && (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-amber-300">
                      معاينة القطعة المنفردة: {selectedPart.mark} ({selectedPart.description})
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedPart.widthMm} × {selectedPart.lengthMm} × {selectedPart.thickness} mm
                    </span>
                  </div>

                  <svg viewBox="0 0 400 280" className="w-80 h-60 bg-slate-900 rounded border border-slate-800">
                    <rect x="50" y="40" width="300" height="190" fill="none" stroke="#f59e0b" strokeWidth="2" />
                    <circle cx="90" cy="80" r="8" fill="#ef4444" />
                    <circle cx="310" cy="80" r="8" fill="#ef4444" />
                    <circle cx="310" cy="190" r="8" fill="#ef4444" />
                    <circle cx="90" cy="190" r="8" fill="#ef4444" />
                    <text x="140" y="140" fill="#cbd5e1" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      {selectedPart.mark}
                    </text>
                    <text x="140" y="160" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                      Thk: {selectedPart.thickness}mm • {selectedPart.material}
                    </text>

                    {/* Edge prep weld bevel note */}
                    <text x="55" y="30" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      Edge Prep: Laser Cut SQ / Bevel 30° if t &gt; 12mm
                    </text>
                  </svg>

                  {/* Part Selector Carousel */}
                  <div className="flex items-center gap-1.5 mt-3 overflow-x-auto max-w-lg p-1">
                    {project.parts.slice(0, 10).map((pt, idx) => (
                      <button
                        key={pt.id}
                        onClick={() => setSelectedPartIndex(idx)}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                          idx === selectedPartIndex
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pt.mark}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Standard CAD Title Block */}
            <div className="border-t-2 border-slate-700 pt-2 grid grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/80 p-2 rounded">
              <div className="border-l border-slate-700 pl-2">
                <span className="text-slate-400 block text-[10px]">المشروع:</span>
                <span className="font-bold text-slate-100">{project.title}</span>
              </div>
              <div className="border-l border-slate-700 pl-2">
                <span className="text-slate-400 block text-[10px]">كود التصميم & المراجعة:</span>
                <span className="text-amber-300 font-bold">
                  {project.designCode} | Rev.{project.revision}
                </span>
              </div>
              <div className="border-l border-slate-700 pl-2">
                <span className="text-slate-400 block text-[10px]">مواصفة اللحام & NDT:</span>
                <span className="text-emerald-400 font-bold">AWS D1.1 / ISO 2553</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">التاريخ & المقياس:</span>
                <span className="text-slate-200">2026-10-07 | Scale: 1:50</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CALLOUT INSPECTOR POPUP MODAL */}
      {activeCalloutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Flame className="w-5 h-5" />
                <span>
                  تفاصيل رمز اللحام المرتبط ({activeCalloutModal === 'BP' ? 'قاعدة العمود' : activeCalloutModal === 'MEP' ? 'وصلة العزم' : 'لوح التقوية'})
                </span>
              </div>
              <button
                onClick={() => setActiveCalloutModal(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">رمز الوصلة المرتبط:</span>
                  <span className="text-amber-300 font-bold">
                    {activeCalloutModal === 'BP' ? bpWeld.id : mepWeld.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ساق اللحام (Leg $a$):</span>
                  <span className="text-slate-100 font-bold">
                    {activeCalloutModal === 'BP' ? bpWeld.weldLegMm : mepWeld.weldLegMm} مم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">العمق الفعال (Throat $t_e$):</span>
                  <span className="text-emerald-400 font-bold">
                    {activeCalloutModal === 'BP' ? bpWeld.effectiveThroatMm : mepWeld.effectiveThroatMm} مم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">طريقة اللحام & السلك:</span>
                  <span className="text-sky-300">GMAW (CO2/MIG) • ER70S-6</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم اعتماد الـ WPS:</span>
                  <span className="text-amber-400">{activeCalloutModal === 'BP' ? bpWeld.qualifiedWpsNo : mepWeld.qualifiedWpsNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">مواصفة الفحص اللاإتلافي:</span>
                  <span className="text-slate-200">100% Visual (VT) + 10% UT AWS D1.1</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setActiveCalloutModal(null);
                    setSelectedDrawingType('WELDING');
                  }}
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في محرر رموز اللحام (Welding Manager)</span>
                </button>
                <button
                  onClick={() => setActiveCalloutModal(null)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
