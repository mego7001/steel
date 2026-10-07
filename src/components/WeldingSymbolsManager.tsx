import React, { useState } from 'react';
import {
  ProjectData,
  WeldingSymbolDefinition,
  WeldType,
  WeldLocation,
  WeldContour,
} from '../types/engineering';
import {
  Flame,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Eye,
  Layers,
  FileCheck,
  PlusCircle,
  Trash2,
  Download,
  Info,
  ExternalLink,
  Table,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface WeldingSymbolsManagerProps {
  project: ProjectData;
  onUpdateWeldingSymbol: (symbolId: string, updated: Partial<WeldingSymbolDefinition>) => void;
  onAddWeldingSymbol?: (symbol: WeldingSymbolDefinition) => void;
  onDeleteWeldingSymbol?: (symbolId: string) => void;
}

export const WeldingSymbolsManager: React.FC<WeldingSymbolsManagerProps> = ({
  project,
  onUpdateWeldingSymbol,
  onAddWeldingSymbol = () => {},
  onDeleteWeldingSymbol = () => {},
}) => {
  const symbols = project.weldingSymbols || [];
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(
    symbols[0]?.id || 'WELD-BP-1'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [activeViewMode, setActiveViewMode] = useState<'CARD' | 'SCHEDULE_TABLE'>('CARD');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New symbol draft state
  const [newSymbolDraft, setNewSymbolDraft] = useState<Partial<WeldingSymbolDefinition>>({
    jointName: '',
    jointNameAr: '',
    connectedEntities: '',
    connectionCategory: 'BASE_PLATE',
    linkedConnectionId: project.basePlates[0]?.id || '',
    weldType: 'FILLET',
    weldLegMm: 8,
    effectiveThroatMm: 5.7,
    weldLocation: 'BOTH_SIDES',
    allAround: true,
    fieldWeld: false,
    weldContour: 'FLAT_FLUSH',
    process: 'GMAW_MIG',
    electrode: 'AWS A5.18 ER70S-6',
    ndtMethod: 'VT',
    ndtCoverage: '100% VT',
    qualifiedWpsNo: 'WPS-MWEC-CUSTOM-01',
    designCapacityKnPerM: 1224,
  });

  const filteredSymbols = symbols.filter((sym) => {
    if (categoryFilter === 'ALL') return true;
    return sym.connectionCategory === categoryFilter;
  });

  const selectedSymbol =
    filteredSymbols.find((s) => s.id === selectedSymbolId) ||
    symbols.find((s) => s.id === selectedSymbolId) ||
    symbols[0];

  // Helper to calculate design capacity per AISC 360-22
  const calculateCapacity = (leg: number, electrodeName: string = 'ER70S-6') => {
    const throat = 0.707 * leg;
    const fexx = electrodeName.includes('70') ? 480 : 430; // MPa
    // Design shear strength per meter: phi * 0.60 * Fexx * te * 1000 / 1000
    const phi = 0.75;
    return Math.round(phi * 0.60 * fexx * throat);
  };

  const handleCreateNewSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `WELD-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const leg = newSymbolDraft.weldLegMm || 8;
    const throat = Number((0.707 * leg).toFixed(1));
    const cap = calculateCapacity(leg, newSymbolDraft.electrode);

    const created: WeldingSymbolDefinition = {
      id,
      jointName: newSymbolDraft.jointName || 'وصلة لحام مخصصة',
      jointNameAr: newSymbolDraft.jointNameAr || 'وصلة لحام مخصصة معتمدة',
      connectedEntities: newSymbolDraft.connectedEntities || 'العناصر المتصلة',
      connectionCategory: newSymbolDraft.connectionCategory || 'BASE_PLATE',
      linkedConnectionId: newSymbolDraft.linkedConnectionId,
      weldType: newSymbolDraft.weldType || 'FILLET',
      weldLegMm: leg,
      effectiveThroatMm: throat,
      weldLocation: newSymbolDraft.weldLocation || 'BOTH_SIDES',
      allAround: Boolean(newSymbolDraft.allAround),
      fieldWeld: Boolean(newSymbolDraft.fieldWeld),
      weldContour: newSymbolDraft.weldContour || 'FLAT_FLUSH',
      process: newSymbolDraft.process || 'GMAW_MIG',
      electrode: newSymbolDraft.electrode || 'AWS A5.18 ER70S-6',
      ndtMethod: newSymbolDraft.ndtMethod || 'VT',
      ndtCoverage: newSymbolDraft.ndtCoverage || '100% VT',
      qualifiedWpsNo: newSymbolDraft.qualifiedWpsNo || 'WPS-MWEC-CUSTOM-01',
      designCapacityKnPerM: cap,
    };

    onAddWeldingSymbol(created);
    setSelectedSymbolId(created.id);
    setIsAddModalOpen(false);
  };

  // Helper to render standard AWS A2.4 / ISO 2553 SVG Welding Symbol
  const renderAwsWeldingSymbolSvg = (symbol: WeldingSymbolDefinition) => {
    if (!symbol) return null;
    const isBothSides = symbol.weldLocation === 'BOTH_SIDES';
    const isArrowSide = symbol.weldLocation === 'ARROW_SIDE' || isBothSides;
    const isOtherSide = symbol.weldLocation === 'OTHER_SIDE' || isBothSides;

    return (
      <svg
        viewBox="0 0 420 180"
        className="w-full max-w-[420px] h-[175px] bg-slate-950 rounded-lg border border-slate-800 cad-grid-dense shadow-inner select-none"
      >
        <defs>
          <filter id="glow-symbol" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#f59e0b" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* CAD Joint schematic on bottom left */}
        <g stroke="#475569" strokeWidth="6" strokeLinecap="round">
          <line x1="30" y1="150" x2="110" y2="150" />
          <line x1="70" y1="150" x2="70" y2="105" />
        </g>
        {/* Weld bead representation */}
        <path d="M 70 150 L 82 150 Q 82 138 70 138 Z" fill="#f59e0b" opacity="0.8" />
        {isBothSides && (
          <path d="M 70 150 L 58 150 Q 58 138 70 138 Z" fill="#f59e0b" opacity="0.8" />
        )}
        <circle cx="70" cy="150" r="3.5" fill="#ef4444" />
        <text x="35" y="170" fill="#64748b" fontSize="9" fontFamily="monospace">JOINT LOCATION</text>

        {/* 1. Leader Arrow line pointing to the joint */}
        <line x1="145" y1="90" x2="75" y2="146" stroke="#f59e0b" strokeWidth="2.5" />
        {/* Arrow head */}
        <polygon points="70,150 82,142 86,149" fill="#f59e0b" />

        {/* 2. Horizontal Reference Line */}
        <line x1="145" y1="90" x2="300" y2="90" stroke="#f59e0b" strokeWidth="2.5" />

        {/* 3. All-Around Symbol (Circle at intersection of arrow & ref line) */}
        {symbol.allAround && (
          <circle cx="145" cy="90" r="10" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        )}

        {/* 4. Field / Site Weld Flag Symbol */}
        {symbol.fieldWeld && (
          <g>
            <line x1="145" y1="90" x2="145" y2="60" stroke="#f59e0b" strokeWidth="2" />
            <polygon points="145,60 162,68 145,76" fill="#ef4444" stroke="#f8fafc" strokeWidth="1" />
          </g>
        )}

        {/* 5. Arrow Side Weld Symbol (BELOW Reference Line) */}
        {isArrowSide && (
          <g transform="translate(205, 90)">
            {symbol.weldType === 'FILLET' && (
              // Right triangle below line for Fillet weld
              <polygon points="0,0 22,0 0,22" fill="none" stroke="#f59e0b" strokeWidth="2.2" />
            )}
            {symbol.weldType === 'V_GROOVE' && (
              <polyline points="0,0 11,20 22,0" fill="none" stroke="#f59e0b" strokeWidth="2.2" />
            )}
            {symbol.weldType === 'SQUARE_GROOVE' && (
              <g stroke="#f59e0b" strokeWidth="2.2">
                <line x1="6" y1="0" x2="6" y2="20" />
                <line x1="16" y1="0" x2="16" y2="20" />
              </g>
            )}
            {symbol.weldType === 'BEVEL_GROOVE' && (
              <polyline points="0,0 0,20 20,0" fill="none" stroke="#f59e0b" strokeWidth="2.2" />
            )}
            {/* Weld Leg Size Annotation */}
            <text x="-26" y="16" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
              {symbol.weldLegMm}
            </text>
            {/* Contour line */}
            {symbol.weldContour === 'FLAT_FLUSH' && (
              <line x1="0" y1="24" x2="22" y2="24" stroke="#cbd5e1" strokeWidth="1.5" />
            )}
            {symbol.weldContour === 'CONVEX' && (
              <path d="M 0 24 Q 11 28 22 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            )}
          </g>
        )}

        {/* 6. Other Side Weld Symbol (ABOVE Reference Line) */}
        {isOtherSide && (
          <g transform="translate(205, 90)">
            {symbol.weldType === 'FILLET' && (
              <polygon points="0,0 22,0 0,-22" fill="none" stroke="#f59e0b" strokeWidth="2.2" />
            )}
            {symbol.weldType === 'V_GROOVE' && (
              <polyline points="0,0 11,-20 22,0" fill="none" stroke="#f59e0b" strokeWidth="2.2" />
            )}
            {symbol.weldType === 'SQUARE_GROOVE' && (
              <g stroke="#f59e0b" strokeWidth="2.2">
                <line x1="6" y1="0" x2="6" y2="-20" />
                <line x1="16" y1="0" x2="16" y2="-20" />
              </g>
            )}
            {symbol.weldType === 'BEVEL_GROOVE' && (
              <polyline points="0,0 0,-20 20,0" fill="none" stroke="#f59e0b" strokeWidth="2.2" />
            )}
            {/* Weld Leg Size Annotation */}
            <text x="-26" y="-7" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
              {symbol.weldLegMm}
            </text>
            {/* Contour line */}
            {symbol.weldContour === 'FLAT_FLUSH' && (
              <line x1="0" y1="-24" x2="22" y2="-24" stroke="#cbd5e1" strokeWidth="1.5" />
            )}
            {symbol.weldContour === 'CONVEX' && (
              <path d="M 0 -24 Q 11 -28 22 -24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            )}
          </g>
        )}

        {/* 7. Reference Tail Fork (> shape) with Process & WPS specification */}
        <line x1="300" y1="90" x2="320" y2="72" stroke="#f59e0b" strokeWidth="2.2" />
        <line x1="300" y1="90" x2="320" y2="108" stroke="#f59e0b" strokeWidth="2.2" />

        <text x="326" y="78" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
          {symbol.process.replace('_', ' ')}
        </text>
        <text x="326" y="93" fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">
          {symbol.ndtMethod} ({symbol.ndtCoverage})
        </text>
        <text x="326" y="108" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
          {symbol.qualifiedWpsNo}
        </text>
      </svg>
    );
  };

  // Helper to render Joint Cross-Section schematic
  const renderJointCrossSection = (symbol: WeldingSymbolDefinition) => {
    return (
      <svg viewBox="0 0 240 140" className="w-full h-32 bg-slate-950 rounded border border-slate-800">
        {/* Horizontal base plate or member */}
        <rect x="20" y="80" width="200" height="24" fill="#334155" stroke="#475569" strokeWidth="1.5" />
        {/* Vertical member or column shaft */}
        <rect x="105" y="20" width="30" height="60" fill="#334155" stroke="#475569" strokeWidth="1.5" />

        {/* Right fillet weld */}
        {(symbol.weldLocation === 'ARROW_SIDE' || symbol.weldLocation === 'BOTH_SIDES') && (
          <path d="M 135 80 L 155 80 Q 155 60 135 60 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        )}
        {/* Left fillet weld */}
        {(symbol.weldLocation === 'OTHER_SIDE' || symbol.weldLocation === 'BOTH_SIDES') && (
          <path d="M 105 80 L 85 80 Q 85 60 105 60 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        )}

        {/* Throat dimension indicator line */}
        <line x1="135" y1="80" x2="147" y2="68" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,2" />
        <circle cx="147" cy="68" r="2.5" fill="#ef4444" />
        <text x="154" y="70" fill="#f8fafc" fontSize="10" fontFamily="monospace">
          te={symbol.effectiveThroatMm}mm
        </text>

        {/* Dimension markings */}
        <text x="140" y="97" fill="#38bdf8" fontSize="10" fontFamily="monospace">
          a={symbol.weldLegMm}mm
        </text>
        <text x="120" y="130" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
          مقطع حقيقي لمظهر اللحام والعمق الفعال (Throat $t_e$)
        </text>
      </svg>
    );
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-6 shadow-2xl">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                رموز وتفاصيل اللحام التنفيذية (AWS A2.4 / ISO 2553 Welding Symbols & Schedule)
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>مربوط مباشرة بأنظمة وصلات التحليل</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              توليد وعرض رموز اللحام القياسية لجميع وصلات المنشأ مع تحديد مقاس الساق ($a$)، العمق الفعال ($t_e$)، شهادات التأهيل (WPS)، ومواصفات الفحص اللاإتلافي (NDT) للورشة.
            </p>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-2">
          {/* Toggle View Mode */}
          <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setActiveViewMode('CARD')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeViewMode === 'CARD'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة الرموز CAD</span>
            </button>
            <button
              onClick={() => setActiveViewMode('SCHEDULE_TABLE')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeViewMode === 'SCHEDULE_TABLE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>جدول حصر اللحامات (Welding Schedule)</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة رمز لحام جديد</span>
          </button>

          {activeViewMode === 'CARD' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isEditing
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditing ? 'حفظ وإنهاء التعديل' : 'تعديل مواصفة اللحام'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-bold ml-1">تصفية حسب نوع الوصلة:</span>
        {[
          { id: 'ALL', label: 'جميع الوصلات' },
          { id: 'BASE_PLATE', label: 'صفائح القواعد (Base Plates)' },
          { id: 'MOMENT_END_PLATE', label: 'وصلات العزم (Moment End Plates)' },
          { id: 'STIFFENER', label: 'ألواح التقوية (Stiffeners)' },
          { id: 'BRACING_GUSSET', label: 'شكالات الرياح (Gusset Plates)' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              categoryFilter === cat.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* MAIN VIEW: Schedule Table OR Visual Symbol Cards */}
      {activeViewMode === 'SCHEDULE_TABLE' ? (
        /* WELDING SCHEDULE TABLE FOR FABRICATION SHOP */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              جدول حصر اللحامات التنفيذي المعتمد للمصنع (Total Welds: {filteredSymbols.length})
            </span>
            <span className="font-mono text-emerald-400">معايير القبول: AWS D1.1 / EN ISO 5817 Level B</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">رمز الوصلة</th>
                  <th className="p-3">اسم الوصلة / العناصر المتصلة</th>
                  <th className="p-3">النوع والموقع</th>
                  <th className="p-3">ساق اللحام ($a$)</th>
                  <th className="p-3">العمق الفعال ($t_e$)</th>
                  <th className="p-3">طريقة اللحام & السلك</th>
                  <th className="p-3">رقم الـ WPS</th>
                  <th className="p-3">فحص الجودة (NDT)</th>
                  <th className="p-3">المقاومة التصميمية</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {filteredSymbols.map((sym) => (
                  <tr key={sym.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3 font-bold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <span>{sym.id}</span>
                        {sym.allAround && <span className="text-[10px] px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">◯ محيطي</span>}
                        {sym.fieldWeld && <span className="text-[10px] px-1 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800">⚑ موقع</span>}
                      </div>
                    </td>
                    <td className="p-3 font-sans">
                      <div className="font-bold text-slate-200">{sym.jointNameAr}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{sym.connectedEntities}</div>
                      {sym.linkedConnectionId && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                          مرتبط بـ: {sym.linkedConnectionId}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700">
                        {sym.weldType === 'FILLET' ? 'زاوي Fillet △' : sym.weldType} ({sym.weldLocation === 'BOTH_SIDES' ? 'الجانبين' : 'جهة السهم'})
                      </span>
                    </td>
                    <td className="p-3 font-bold text-amber-300">{sym.weldLegMm} مم</td>
                    <td className="p-3 text-slate-100">{sym.effectiveThroatMm} مم</td>
                    <td className="p-3 text-emerald-400">
                      <div>{sym.process.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-400">{sym.electrode}</div>
                    </td>
                    <td className="p-3 text-slate-300">{sym.qualifiedWpsNo}</td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[11px]">
                        {sym.ndtMethod} ({sym.ndtCoverage})
                      </span>
                    </td>
                    <td className="p-3 text-emerald-400 font-bold">~{sym.designCapacityKnPerM} kN/m</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedSymbolId(sym.id);
                            setActiveViewMode('CARD');
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                          title="معاينة رمز AWS"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteWeldingSymbol(sym.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-rose-400 transition cursor-pointer"
                          title="حذف الرمز"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISUAL CAD CARD & REAL-TIME AWS INSPECTOR */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of Project Welds (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                وصلات اللحام المسجلة ({filteredSymbols.length} وصلة):
              </span>
              <span className="text-[11px] text-slate-400 font-mono">انقر للاختيار والمعاينة</span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredSymbols.map((sym) => {
                const isSelected = sym.id === selectedSymbol?.id;
                return (
                  <div
                    key={sym.id}
                    onClick={() => setSelectedSymbolId(sym.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500 text-slate-100 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300">{sym.jointNameAr}</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        ساق a = {sym.weldLegMm} mm
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">{sym.connectedEntities}</p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-emerald-400 font-bold">{sym.process.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{sym.allAround ? 'محيطي ◯' : 'خطي'}</span>
                        <span>•</span>
                        <span className="text-sky-300">{sym.ndtMethod}</span>
                      </div>

                      {sym.linkedConnectionId && (
                        <span className="text-amber-400/80 bg-slate-900 px-1 rounded">
                          🔗 {sym.linkedConnectionId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: AWS A2.4 Graphical CAD Diagram & Parameters (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedSymbol ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] text-amber-400 font-mono block">
                      رمز اللحام المعتمد حسب المواصفة الأمريكية AWS A2.4 / ISO 2553
                    </span>
                    <h4 className="text-sm font-bold text-slate-100">{selectedSymbol.jointNameAr}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSymbol.linkedConnectionId && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        وصلة التحليل: {selectedSymbol.linkedConnectionId}
                      </span>
                    )}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedSymbol.id}
                    </span>
                  </div>
                </div>

                {/* Render Visual CAD AWS Welding Symbol */}
                <div className="flex flex-col items-center justify-center py-2">
                  {renderAwsWeldingSymbolSvg(selectedSymbol)}
                </div>

                {/* Cross section and throat visualizer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block mb-1">
                      مقطع الوصلة وعمق اللحام الفعال (Cross-Section & Throat):
                    </span>
                    {renderJointCrossSection(selectedSymbol)}
                  </div>

                  {/* Technical Specifications Matrix */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block mb-1">
                      المواصفات الفنية والهندسية:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">ساق اللحام (Leg a):</span>
                        <span className="text-amber-400 font-bold">{selectedSymbol.weldLegMm} مم</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">العمق الفعال (Throat te):</span>
                        <span className="text-slate-100 font-bold">{selectedSymbol.effectiveThroatMm} مم</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">مقاومة التصميم:</span>
                        <span className="text-emerald-400 font-bold">~{selectedSymbol.designCapacityKnPerM} kN/m</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">سلك اللحام:</span>
                        <span className="text-slate-200">{selectedSymbol.electrode}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">الفحص اللاإتلافي (NDT):</span>
                        <span className="text-sky-400 font-bold">{selectedSymbol.ndtMethod} ({selectedSymbol.ndtCoverage})</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">رقم إجراء اللحام (WPS):</span>
                        <span className="text-slate-300">{selectedSymbol.qualifiedWpsNo}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Editing Controls */}
                {isEditing && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3 text-xs animate-in fade-in duration-150">
                    <span className="font-bold text-slate-100 block border-b border-slate-800 pb-1.5">
                      تعديل مواصفة ساق وطريقة اللحام للوصلة ({selectedSymbol.id}):
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 block mb-1">ساق اللحام Leg a (مم):</span>
                        <select
                          value={selectedSymbol.weldLegMm}
                          onChange={(e) => {
                            const leg = parseInt(e.target.value);
                            const throat = Number((0.707 * leg).toFixed(1));
                            const cap = calculateCapacity(leg, selectedSymbol.electrode);
                            onUpdateWeldingSymbol(selectedSymbol.id, {
                              weldLegMm: leg,
                              effectiveThroatMm: throat,
                              designCapacityKnPerM: cap,
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                        >
                          {[4, 5, 6, 8, 10, 12, 14, 16].map((v) => (
                            <option key={v} value={v}>
                              {v} مم (Throat {(0.707 * v).toFixed(1)} مم)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">نوع اللحام (Weld Type):</span>
                        <select
                          value={selectedSymbol.weldType}
                          onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { weldType: e.target.value as WeldType })}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                        >
                          <option value="FILLET">لحام زاوي Fillet (△)</option>
                          <option value="V_GROOVE">أخدود مفرد Single-V (∨)</option>
                          <option value="SQUARE_GROOVE">أخدود مربع Square (||)</option>
                          <option value="BEVEL_GROOVE">أخدود مائل Bevel Groove</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">موقع اللحام (Location):</span>
                        <select
                          value={selectedSymbol.weldLocation}
                          onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { weldLocation: e.target.value as WeldLocation })}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                        >
                          <option value="BOTH_SIDES">الجانبين معًا (Both Sides)</option>
                          <option value="ARROW_SIDE">جهة السهم فقط (Arrow Side)</option>
                          <option value="OTHER_SIDE">الجهة المقابلة فقط (Other Side)</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">طريقة اللحام (Process):</span>
                        <select
                          value={selectedSymbol.process}
                          onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { process: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                        >
                          <option value="GMAW_MIG">GMAW (MIG/CO2 Gas Metal Arc)</option>
                          <option value="SMAW_STICK">SMAW (Manual Metal Arc Stick)</option>
                          <option value="FCAW">FCAW (Flux Cored Arc)</option>
                          <option value="SAW">SAW (Submerged Arc Welding)</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">فحص الجودة (NDT Method):</span>
                        <select
                          value={selectedSymbol.ndtMethod}
                          onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { ndtMethod: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                        >
                          <option value="VT">فحص بصري VT</option>
                          <option value="UT">موجات فوق صوتية UT</option>
                          <option value="MT">جزيئات مغناطيسية MT</option>
                          <option value="RT">تصوير إشعاعي RT</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">نسبة الفحص (NDT Coverage):</span>
                        <input
                          type="text"
                          value={selectedSymbol.ndtCoverage}
                          onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { ndtCoverage: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-4 pt-2 col-span-2 sm:col-span-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedSymbol.allAround}
                            onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { allAround: e.target.checked })}
                            className="accent-amber-500 cursor-pointer"
                          />
                          <span>لحام محيطي كامل All-Around (◯)</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedSymbol.fieldWeld}
                            onChange={(e) => onUpdateWeldingSymbol(selectedSymbol.id, { fieldWeld: e.target.checked })}
                            className="accent-amber-500 cursor-pointer"
                          />
                          <span>لحام بالموقع Field / Site Weld (⚑)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                لا توجد رموز لحام مسجلة في هذا القسم. انقر على "إضافة رمز لحام جديد".
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW WELDING SYMBOL LINKED TO DESIGNED CONNECTION */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  إضافة رمز لحام جديد وربطه بالتحليل الإنشائي
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSymbol} className="space-y-4 text-xs">
              {/* Linked Connection Selection */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">
                  ربط الرمز بوصلة مصممة من نظام التحليل (Linked Connection):
                </label>
                <select
                  value={newSymbolDraft.linkedConnectionId}
                  onChange={(e) => {
                    const linkedId = e.target.value;
                    const bp = project.basePlates.find((b) => b.id === linkedId);
                    const mep = project.momentEndPlates.find((m) => m.id === linkedId);
                    if (bp) {
                      setNewSymbolDraft({
                        ...newSymbolDraft,
                        linkedConnectionId: bp.id,
                        connectionCategory: 'BASE_PLATE',
                        jointName: `Base Plate Weld ${bp.id}`,
                        jointNameAr: `لحام قاعدة العمود مع صفيحة التثبيت (${bp.id})`,
                        connectedEntities: `العمود ${bp.columnMemberId} مع الصفيحة ${bp.plateWidth}×${bp.plateLength}×${bp.plateThickness} مم`,
                        weldLegMm: bp.weldLeg || 8,
                        allAround: true,
                        fieldWeld: false,
                        qualifiedWpsNo: 'WPS-MWEC-BP-01',
                      });
                    } else if (mep) {
                      setNewSymbolDraft({
                        ...newSymbolDraft,
                        linkedConnectionId: mep.id,
                        connectionCategory: 'MOMENT_END_PLATE',
                        jointName: `Moment End Plate Weld ${mep.id}`,
                        jointNameAr: `لحام كمرة الرافتر مع صفيحة العزم (${mep.id})`,
                        connectedEntities: `الرافتر ${mep.rafterMemberId} مع لوح النهاية ${mep.width}×${mep.height}×${mep.thickness} مم`,
                        weldLegMm: mep.weldFlangeLeg || 8,
                        allAround: false,
                        fieldWeld: false,
                        qualifiedWpsNo: 'WPS-MWEC-MEP-01',
                      });
                    } else {
                      setNewSymbolDraft({
                        ...newSymbolDraft,
                        linkedConnectionId: linkedId,
                      });
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 font-mono"
                >
                  <optgroup label="صفائح القواعد (Base Plates من التحليل)">
                    {project.basePlates.map((bp) => (
                      <option key={bp.id} value={bp.id}>
                        {bp.id} — عمود {bp.columnMemberId} ({bp.plateWidth}x{bp.plateLength}x{bp.plateThickness} مم)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="وصلات العزم (Moment End Plates من التحليل)">
                    {project.momentEndPlates.map((mep) => (
                      <option key={mep.id} value={mep.id}>
                        {mep.id} — رافتر {mep.rafterMemberId} ({mep.width}x{mep.height}x{mep.thickness} مم)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="وصلات أخرى">
                    <option value="STIFF_CUSTOM">لوح تقوية عمود أو كمرة (Stiffener)</option>
                    <option value="GUSS_CUSTOM">لوحة عقدة شكالات رياح (Bracing Gusset)</option>
                    <option value="CUSTOM_JOINT">وصلة حرة مخصصة (Custom Joint)</option>
                  </optgroup>
                </select>
              </div>

              {/* Names & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">اسم الوصلة بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={newSymbolDraft.jointNameAr}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, jointNameAr: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100"
                    placeholder="مثال: لحام صفيحة قاعدة العمود"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">العناصر المتصلة (Connected Entities):</label>
                  <input
                    type="text"
                    required
                    value={newSymbolDraft.connectedEntities}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, connectedEntities: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                    placeholder="مثال: Column HEB 160 to Plate 350x350x20mm"
                  />
                </div>
              </div>

              {/* Welding Properties */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">ساق اللحام Leg a (مم):</label>
                  <select
                    value={newSymbolDraft.weldLegMm}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, weldLegMm: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  >
                    {[4, 5, 6, 8, 10, 12, 14, 16].map((v) => (
                      <option key={v} value={v}>
                        {v} مم (Throat {(0.707 * v).toFixed(1)} مم)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نوع اللحام (Weld Type):</label>
                  <select
                    value={newSymbolDraft.weldType}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, weldType: e.target.value as WeldType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  >
                    <option value="FILLET">لحام زاوي Fillet (△)</option>
                    <option value="V_GROOVE">أخدود V-Groove (∨)</option>
                    <option value="SQUARE_GROOVE">أخدود مربع Square (||)</option>
                    <option value="BEVEL_GROOVE">أخدود مائل Bevel Groove</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">موقع اللحام (Location):</label>
                  <select
                    value={newSymbolDraft.weldLocation}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, weldLocation: e.target.value as WeldLocation })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  >
                    <option value="BOTH_SIDES">الجانبين معًا (Both Sides)</option>
                    <option value="ARROW_SIDE">جهة السهم فقط (Arrow Side)</option>
                    <option value="OTHER_SIDE">الجهة المقابلة فقط (Other Side)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">طريقة اللحام (Process):</label>
                  <select
                    value={newSymbolDraft.process}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, process: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  >
                    <option value="GMAW_MIG">GMAW (MIG/CO2 Gas Metal Arc)</option>
                    <option value="SMAW_STICK">SMAW (Manual Metal Arc Stick)</option>
                    <option value="FCAW">FCAW (Flux Cored Arc)</option>
                    <option value="SAW">SAW (Submerged Arc)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">فحص الجودة (NDT):</label>
                  <select
                    value={newSymbolDraft.ndtMethod}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, ndtMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  >
                    <option value="VT">فحص بصري VT</option>
                    <option value="UT">موجات فوق صوتية UT</option>
                    <option value="MT">جزيئات مغناطيسية MT</option>
                    <option value="RT">تصوير إشعاعي RT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رقم إجراء اللحام (WPS No):</label>
                  <input
                    type="text"
                    value={newSymbolDraft.qualifiedWpsNo}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, qualifiedWpsNo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newSymbolDraft.allAround}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, allAround: e.target.checked })}
                    className="accent-amber-500 cursor-pointer"
                  />
                  <span>لحام محيطي كامل All-Around (◯)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newSymbolDraft.fieldWeld}
                    onChange={(e) => setNewSymbolDraft({ ...newSymbolDraft, fieldWeld: e.target.checked })}
                    className="accent-amber-500 cursor-pointer"
                  />
                  <span>لحام بالموقع Field / Site Weld (⚑)</span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وإضافة رمز اللحام</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
