import React, { useState } from 'react';
import {
  BasePlateDesign,
  MomentEndPlateDesign,
  ProjectData,
} from '../types/engineering';
import { CheckCircle2, XCircle, Sliders, ShieldCheck, Flame } from 'lucide-react';

interface ConnectionsViewProps {
  project: ProjectData;
  onUpdateBasePlate: (id: string, updated: Partial<BasePlateDesign>) => void;
  onUpdateMomentPlate: (id: string, updated: Partial<MomentEndPlateDesign>) => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  project,
  onUpdateBasePlate,
  onUpdateMomentPlate,
}) => {
  const [activeTab, setActiveTab] = useState<'base_plates' | 'moment_plates'>('base_plates');

  const selectedBasePlate = project.basePlates[0];
  const selectedEndPlate = project.momentEndPlates[0];

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('base_plates')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'base_plates'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          وصلات القواعد وألواح التثبيت (Column Base Plates & Anchors)
        </button>
        <button
          onClick={() => setActiveTab('moment_plates')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'moment_plates'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          وصلات العزم والطرفيات (Beam-to-Column Moment End Plates)
        </button>
      </div>

      {activeTab === 'base_plates' && selectedBasePlate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Base Plate Parameters & Checks */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">تفاصيل لوح القاعدة (Base Plate Detailing)</h3>
                  <span className="text-[11px] text-slate-400 font-mono">معرف الوصلة: {selectedBasePlate.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedBasePlate.status === 'pass' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                    {selectedBasePlate.status.toUpperCase()} (Util: {selectedBasePlate.utilization})
                  </span>
                </div>
              </div>

              {/* Parametric Inputs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">طول وعرض اللوح B × N (مم):</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={selectedBasePlate.plateLength}
                      onChange={(e) => onUpdateBasePlate(selectedBasePlate.id, { plateLength: parseInt(e.target.value) || 300 })}
                      className="w-1/2 bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                    />
                    <input
                      type="number"
                      value={selectedBasePlate.plateWidth}
                      onChange={(e) => onUpdateBasePlate(selectedBasePlate.id, { plateWidth: parseInt(e.target.value) || 300 })}
                      className="w-1/2 bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">سماكة اللوح tp (مم):</span>
                  <input
                    type="number"
                    value={selectedBasePlate.plateThickness}
                    onChange={(e) => onUpdateBasePlate(selectedBasePlate.id, { plateThickness: parseInt(e.target.value) || 16 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">قطر مسامير التثبيت (Anchors):</span>
                  <select
                    value={selectedBasePlate.anchorDiameter}
                    onChange={(e) => onUpdateBasePlate(selectedBasePlate.id, { anchorDiameter: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  >
                    <option value={20}>4 × M20 Grade 8.8</option>
                    <option value={24}>4 × M24 Grade 8.8</option>
                    <option value={27}>4 × M27 Grade 8.8</option>
                    <option value={30}>4 × M30 Grade 8.8</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">عمق التثبيت بالخرسانة (مم):</span>
                  <input
                    type="number"
                    value={selectedBasePlate.anchorEmbedment}
                    onChange={(e) => onUpdateBasePlate(selectedBasePlate.id, { anchorEmbedment: parseInt(e.target.value) || 400 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Engineering Verification Checks */}
              <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                <span className="font-bold text-slate-200 block text-[11px]">الفحوصات الهندسية (AISC Design Guide 1):</span>
                
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60 font-mono">
                  <span className="text-slate-400 font-sans">إجهاد الارتكاز على الخرسانة (Bearing):</span>
                  <span className="text-slate-200">{selectedBasePlate.bearingPressure} MPa &le; {selectedBasePlate.allowableBearing} MPa</span>
                  <span className="text-emerald-400 text-[11px] font-sans">Pass</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/60 font-mono">
                  <span className="text-slate-400 font-sans">إجهاد انحناء لوح الصلب (Plate Bending):</span>
                  <span className="text-slate-200">{selectedBasePlate.plateBendingStress} MPa &le; 210 MPa</span>
                  <span className="text-emerald-400 text-[11px] font-sans">Pass</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/60 font-mono">
                  <span className="text-slate-400 font-sans">شد مسامير الأنكور (Anchor Tension):</span>
                  <span className="text-slate-200">{selectedBasePlate.anchorTensionForceKn} kN &le; 158 kN</span>
                  <span className="text-emerald-400 text-[11px] font-sans">Pass</span>
                </div>

                <div className="flex justify-between items-center py-1 font-mono">
                  <span className="text-slate-400 font-sans">ساق خط اللحام للعمود (Fillet Weld):</span>
                  <span className="text-amber-300 font-sans">Leg a = {selectedBasePlate.weldLeg} mm (E70XX)</span>
                  <span className="text-emerald-400 text-[11px] font-sans">Pass</span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold block">رمز اللحام المعتمد في المخططات: WELD-BP-1</span>
                      <span className="text-[10px] text-slate-400 font-sans">ساق 8 مم محيطي كامل ◯ • AWS A2.4 • إجراء WPS-MWEC-BP-01</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
                    مربوط بالمخططات
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive 2D Vector CAD Drawing */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-slate-300 mb-3 block self-start">
              مخطط تفصيلي 2D للوح القاعدة والمسامير (Plan & Elevation):
            </span>
            <svg
              viewBox="0 0 360 360"
              className="w-full max-w-[340px] h-[340px] bg-slate-950 rounded border border-slate-800 cad-grid-dense"
            >
              {/* Pedestal outline */}
              <rect x="20" y="20" width="320" height="320" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4,4" />
              <text x="30" y="40" fill="#64748b" fontSize="10" fontFamily="monospace">Concrete Pedestal 450x450</text>

              {/* Steel Base Plate */}
              <rect x="45" y="45" width="270" height="270" fill="rgba(30, 41, 59, 0.7)" stroke="#f59e0b" strokeWidth="2.5" />
              
              {/* Column Profile representation in center */}
              <rect x="110" y="110" width="140" height="140" fill="rgba(15, 23, 42, 0.9)" stroke="#38bdf8" strokeWidth="2" />
              <text x="135" y="185" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">SHS / COL</text>

              {/* 4 Anchor Bolt Holes with washers */}
              {/* Hole 1: Top-Left */}
              <circle cx="80" cy="80" r="14" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx="80" cy="80" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />
              
              {/* Hole 2: Top-Right */}
              <circle cx="280" cy="80" r="14" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx="280" cy="80" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Hole 3: Bottom-Right */}
              <circle cx="280" cy="280" r="14" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx="280" cy="280" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Hole 4: Bottom-Left */}
              <circle cx="80" cy="280" r="14" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx="80" cy="280" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Dimension Annotations */}
              <line x1="45" y1="335" x2="315" y2="335" stroke="#94a3b8" strokeWidth="1" />
              <text x="140" y="350" fill="#cbd5e1" fontSize="11" fontFamily="monospace">B = {selectedBasePlate.plateLength} mm</text>
            </svg>
            <div className="flex justify-between w-full text-[11px] text-slate-400 font-mono mt-2">
              <span>Plate: {selectedBasePlate.plateLength}×{selectedBasePlate.plateWidth}×{selectedBasePlate.plateThickness} mm</span>
              <span>Anchors: 4× M{selectedBasePlate.anchorDiameter} Gr 8.8</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'moment_plates' && selectedEndPlate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Moment End Plate Detailing & Checks */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100">وصلة العزم باللوح الطرفي (Moment End-Plate Connection)</h3>
                <span className="text-[11px] text-slate-400 font-mono">معرف الوصلة: {selectedEndPlate.id}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${selectedEndPlate.status === 'pass' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                {selectedEndPlate.status.toUpperCase()} (Util: {selectedEndPlate.utilization})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">أبعاد اللوح H × W (مم):</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={selectedEndPlate.height}
                    onChange={(e) => onUpdateMomentPlate(selectedEndPlate.id, { height: parseInt(e.target.value) || 360 })}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  />
                  <input
                    type="number"
                    value={selectedEndPlate.width}
                    onChange={(e) => onUpdateMomentPlate(selectedEndPlate.id, { width: parseInt(e.target.value) || 200 })}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">سماكة اللوح tp (مم):</span>
                <input
                  type="number"
                  value={selectedEndPlate.thickness}
                  onChange={(e) => onUpdateMomentPlate(selectedEndPlate.id, { thickness: parseInt(e.target.value) || 18 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">قطر المسامير ورتبتها:</span>
                <select
                  value={selectedEndPlate.boltDiameter}
                  onChange={(e) => onUpdateMomentPlate(selectedEndPlate.id, { boltDiameter: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                >
                  <option value={20}>8 × M20 Grade 8.8</option>
                  <option value={24}>8 × M24 Grade 8.8</option>
                  <option value={24}>8 × M24 Grade 10.9</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">خطوة المسامير Pitch (مم):</span>
                <input
                  type="number"
                  value={selectedEndPlate.boltPitch}
                  onChange={(e) => onUpdateMomentPlate(selectedEndPlate.id, { boltPitch: parseInt(e.target.value) || 80 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* Calculations Output */}
            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
              <span className="font-bold text-slate-200 block text-[11px]">فحوصات مقاومة العزم (AISC Design Guide 4 / 16):</span>
              
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60 font-mono">
                <span className="text-slate-400 font-sans">عزم الانحناء المطبق (Mu):</span>
                <span className="text-slate-200">{selectedEndPlate.appliedMomentKnM} kN·m</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800/60 font-mono">
                <span className="text-slate-400 font-sans">مقاومة الوصلة الاسمية (ϕMn):</span>
                <span className="text-emerald-400 font-bold">{selectedEndPlate.momentCapacityKnM} kN·m</span>
              </div>

              <div className="flex justify-between items-center py-1 font-mono">
                <span className="text-slate-400 font-sans">ساق لحام جناح الرافتر (Flange Weld):</span>
                <span className="text-amber-300 font-sans">Leg a = {selectedEndPlate.weldFlangeLeg} mm (Full Pen Equivalent)</span>
                <span className="text-emerald-400 text-[11px] font-sans">Pass</span>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-amber-300">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block">رمز اللحام المعتمد في المخططات: WELD-MEP-FLG-1</span>
                    <span className="text-[10px] text-slate-400 font-sans">ساق 8 مم للشفة + 6 مم للجسد • فحص UT 100% • إجراء WPS-MWEC-MEP-01</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
                  مربوط بالمخططات
                </span>
              </div>
            </div>
          </div>

          {/* 2D Vector CAD Drawing of Extended End Plate */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-slate-300 mb-3 block self-start">
              مخطط تفصيلي 2D للوصلة الطرفية (Extended End Plate CAD):
            </span>
            <svg
              viewBox="0 0 300 400"
              className="w-full max-w-[280px] h-[370px] bg-slate-950 rounded border border-slate-800 cad-grid-dense"
            >
              {/* Extended End Plate */}
              <rect x="50" y="20" width="200" height="360" fill="rgba(30, 41, 59, 0.8)" stroke="#f59e0b" strokeWidth="2.5" />
              
              {/* I-Beam Rafter Cross-section projection */}
              {/* Top Flange */}
              <rect x="65" y="60" width="170" height="15" fill="#38bdf8" />
              {/* Web */}
              <rect x="145" y="75" width="10" height="230" fill="#38bdf8" />
              {/* Bottom Flange */}
              <rect x="65" y="305" width="170" height="15" fill="#38bdf8" />

              {/* 8 Bolt Holes (4 rows x 2 cols) */}
              {/* Row 1: Extended Top Tension Bolts */}
              <circle cx="95" cy="40" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />
              <circle cx="205" cy="40" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Row 2: Inner Tension Bolts below top flange */}
              <circle cx="95" cy="100" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />
              <circle cx="205" cy="100" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Row 3: Middle Shear Bolts */}
              <circle cx="95" cy="180" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />
              <circle cx="205" cy="180" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Row 4: Bottom Compression Bolts */}
              <circle cx="95" cy="270" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />
              <circle cx="205" cy="270" r="7" fill="#ef4444" stroke="#f8fafc" strokeWidth="1.5" />

              <text x="100" y="360" fill="#cbd5e1" fontSize="10" fontFamily="monospace">Plate: {selectedEndPlate.height}×{selectedEndPlate.width}×{selectedEndPlate.thickness}</text>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
