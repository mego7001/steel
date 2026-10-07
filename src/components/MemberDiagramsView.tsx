import React, { useState, useMemo } from 'react';
import {
  MemberCheckResult,
  ProjectData,
  StructuralMember,
} from '../types/engineering';
import { getProfileById } from '../services/catalogService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Maximize2,
  Sliders,
  ChevronDown,
  Info,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

interface MemberDiagramsViewProps {
  project: ProjectData;
  selectedMemberId: string | null;
  onSelectMember: (memberId: string) => void;
  onOpenSectionLibrary?: (memberId: string) => void;
}

export const MemberDiagramsView: React.FC<MemberDiagramsViewProps> = ({
  project,
  selectedMemberId,
  onSelectMember,
  onOpenSectionLibrary,
}) => {
  const [activeDiagramType, setActiveDiagramType] = useState<'BOTH' | 'SHEAR' | 'MOMENT' | 'DEFLECTION'>('BOTH');
  const [invertMoment, setInvertMoment] = useState<boolean>(true); // Structural convention (tension side)

  // Current selected member or fallback to first rafter / column
  const currentMember = useMemo(() => {
    if (selectedMemberId) {
      const found = project.members.find((m) => m.id === selectedMemberId);
      if (found) return found;
    }
    // Prefer rafter or column as primary default
    return (
      project.members.find((m) => m.type === 'rafter') ||
      project.members.find((m) => m.type === 'column') ||
      project.members[0]
    );
  }, [project.members, selectedMemberId]);

  const currentCheck = useMemo(() => {
    if (!currentMember) return null;
    return project.memberChecks.find((c) => c.memberId === currentMember.id) || null;
  }, [project.memberChecks, currentMember]);

  const currentSection = useMemo(() => {
    if (!currentMember) return null;
    return getProfileById(currentMember.sectionId) || null;
  }, [currentMember]);

  // Compute Member Length in meters
  const memberLengthM = useMemo(() => {
    if (!currentMember) return 4.0;
    const sNode = project.nodes.find((n) => n.id === currentMember.startNodeId);
    const eNode = project.nodes.find((n) => n.id === currentMember.endNodeId);
    if (!sNode || !eNode) return 4.0;
    return Number(Math.hypot(eNode.x - sNode.x, eNode.y - sNode.y, eNode.z - sNode.z).toFixed(2));
  }, [project.nodes, currentMember]);

  // Generate Station Data Points along span (25 stations)
  const stationData = useMemo(() => {
    if (!currentMember || !currentCheck) return [];

    const L = memberLengthM;
    const Vu = currentCheck.shearForceKn;
    const Mu = currentCheck.bendingMomentKnM;
    const deltaMax = currentCheck.deflectionRatio * 15; // estimated mm deflection
    const isBeamRafter = currentMember.type === 'rafter' || currentMember.type === 'beam' || currentMember.type === 'purlin';

    const pointsCount = 25;
    const data = [];

    for (let i = 0; i <= pointsCount; i++) {
      const xRatio = i / pointsCount;
      const x = Number((xRatio * L).toFixed(2));

      let shearKn = 0;
      let momentKnm = 0;
      let deflMm = 0;

      if (isBeamRafter) {
        // Simply supported / continuous with distributed gravity load:
        // Shear varies linearly: +Vu at start, 0 at midspan, -Vu at end
        shearKn = Number((Vu * (1 - 2 * xRatio)).toFixed(2));
        // Moment varies parabolically: 0 at supports, max Mu at midspan (or inverted)
        const parabolic = 4 * Mu * xRatio * (1 - xRatio);
        momentKnm = Number((invertMoment ? parabolic : -parabolic).toFixed(2));
        deflMm = Number((deltaMax * Math.sin(Math.PI * xRatio)).toFixed(2));
      } else if (currentMember.type === 'column') {
        // Fixed-base cantilever column under lateral wind shear & moment:
        // Shear is relatively uniform or triangular
        shearKn = Number((Vu * (1 - 0.2 * xRatio)).toFixed(2));
        // Moment is maximum at base (x=0) and decreases to top
        const colMoment = Mu * (1 - xRatio);
        momentKnm = Number((invertMoment ? colMoment : -colMoment).toFixed(2));
        deflMm = Number((deltaMax * (1 - Math.cos((Math.PI / 2) * xRatio))).toFixed(2));
      } else {
        // Bracing / Tie (Axial dominated with small secondary P-delta moment)
        shearKn = Number((Vu * 0.5 * (1 - 2 * xRatio)).toFixed(2));
        momentKnm = Number((Mu * Math.sin(Math.PI * xRatio)).toFixed(2));
        deflMm = Number((1.5 * Math.sin(Math.PI * xRatio)).toFixed(2));
      }

      data.push({
        x,
        stationLabel: `${x} m`,
        stationPct: `${Math.round(xRatio * 100)}%`,
        shearKn,
        momentKnm,
        deflMm,
      });
    }

    return data;
  }, [currentMember, currentCheck, memberLengthM, invertMoment]);

  if (!currentMember || !currentCheck) {
    return (
      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-400">
        لم يتم العثور على نتائج تحليل للعضو المختار.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-5 shadow-xl">
      {/* Header & Member Selector Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                مخططات قوى القص وعزوم الانحناء (SFD & BMD Internal Force Diagrams)
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {currentMember.mark}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              توزيع الإجهادات والقوى الداخلية على طول العضو <span className="font-mono text-amber-300">L = {memberLengthM} م</span> تحت تركيب الحمل الحاكم: <span className="font-mono text-slate-300 font-medium">{currentCheck.governingCombinationId}</span>
            </p>
          </div>
        </div>

        {/* Member Selector Dropdown & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 ml-1.5 font-sans">اختر العضو:</span>
            <select
              value={currentMember.id}
              onChange={(e) => onSelectMember(e.target.value)}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              {project.members.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-100">
                  {m.mark} ({m.type} - {m.sectionId})
                </option>
              ))}
            </select>
          </div>

          {onOpenSectionLibrary && (
            <button
              onClick={() => onOpenSectionLibrary(currentMember.id)}
              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>مكتبة القطاعات</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards for Maximum Values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">أقصى قوى قص (Max Shear Vu)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-sky-400">{Math.abs(currentCheck.shearForceKn).toFixed(1)}</span>
            <span className="text-slate-500 font-mono">kN</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            السعة: ϕVn = {currentCheck.shearCapacityKn.toFixed(0)} kN
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">أقصى عزم انحناء (Max Moment Mu)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-amber-400">{currentCheck.bendingMomentKnM.toFixed(1)}</span>
            <span className="text-slate-500 font-mono">kN·m</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            السعة: ϕMn = {currentCheck.momentCapacityKnM.toFixed(0)} kN·m
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">القوة المحورية (Axial Pu)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-200">{currentCheck.axialForceKn.toFixed(1)}</span>
            <span className="text-slate-500 font-mono">kN ({currentCheck.axialForceKn < 0 ? 'ضغط' : 'شد'})</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            السعة: ϕPn = {currentCheck.axialCapacityKn.toFixed(0)} kN
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">نسبة الاستغلال (Unity Check)</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-bold font-mono ${currentCheck.interactionRatio <= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentCheck.interactionRatio.toFixed(3)}
            </span>
            <span className={`text-[10px] font-bold ${currentCheck.status === 'pass' ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({currentCheck.status.toUpperCase()})
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            AISC H1-1a Limit &le; 1.000
          </span>
        </div>
      </div>

      {/* Diagram Controls Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center gap-1 font-semibold">
          <span className="text-slate-400 ml-2">نوع المخطط:</span>
          <button
            onClick={() => setActiveDiagramType('BOTH')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              activeDiagramType === 'BOTH' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            القص والعزم معًا (SFD + BMD)
          </button>
          <button
            onClick={() => setActiveDiagramType('SHEAR')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              activeDiagramType === 'SHEAR' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            قوى القص فقط (SFD)
          </button>
          <button
            onClick={() => setActiveDiagramType('MOMENT')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              activeDiagramType === 'MOMENT' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            عزوم الانحناء فقط (BMD)
          </button>
          <button
            onClick={() => setActiveDiagramType('DEFLECTION')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              activeDiagramType === 'DEFLECTION' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            منحنى الترخيم (Deflection)
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={invertMoment}
              onChange={(e) => setInvertMoment(e.target.checked)}
              className="accent-amber-500 cursor-pointer"
            />
            <span>رسم العزم على جهة الشد (Structural Tension Side)</span>
          </label>
        </div>
      </div>

      {/* 1. Shear Force Diagram (SFD) */}
      {(activeDiagramType === 'BOTH' || activeDiagramType === 'SHEAR') && (
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <h4 className="text-xs font-bold text-slate-200">
                مخطط قوى القص (Shear Force Diagram - SFD) [kN]
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              V_start = +{Math.abs(currentCheck.shearForceKn).toFixed(1)} kN | V_end = -{Math.abs(currentCheck.shearForceKn).toFixed(1)} kN
            </span>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stationData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="shearGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `${val} m`}
                />
                <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} unit=" kN" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-lg text-xs font-mono">
                          <p className="text-slate-300 font-sans">المسافة x: {data.x} م ({data.stationPct})</p>
                          <p className="text-sky-400 font-bold">قوة القص V: {data.shearKn} kN</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Area
                  type="monotone"
                  dataKey="shearKn"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#shearGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2. Bending Moment Diagram (BMD) */}
      {(activeDiagramType === 'BOTH' || activeDiagramType === 'MOMENT') && (
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h4 className="text-xs font-bold text-slate-200">
                مخطط عزوم الانحناء (Bending Moment Diagram - BMD) [kN·m]
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              M_max = {currentCheck.bendingMomentKnM.toFixed(1)} kN·m (عند منتصف البحر)
            </span>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stationData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="momentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `${val} m`}
                />
                <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} unit=" kN·m" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-lg text-xs font-mono">
                          <p className="text-slate-300 font-sans">المسافة x: {data.x} م ({data.stationPct})</p>
                          <p className="text-amber-400 font-bold">عزم الانحناء M: {data.momentKnm} kN·m</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Area
                  type="monotone"
                  dataKey="momentKnm"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#momentGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Deflection Profile (Optional / Dedicated Tab) */}
      {activeDiagramType === 'DEFLECTION' && (
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200">
                منحنى سهم الترخيم والتشوه (Elastic Deflection Curve) [mm]
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Δ_max = {(currentCheck.deflectionRatio * 15).toFixed(1)} mm (الحد المسموح L/250 = {(memberLengthM * 1000 / 250).toFixed(1)} mm)
            </span>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stationData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="x" stroke="#64748b" fontSize={10} tickFormatter={(val) => `${val} m`} />
                <YAxis stroke="#64748b" fontSize={10} unit=" mm" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-lg text-xs font-mono">
                          <p className="text-slate-300 font-sans">المسافة x: {data.x} م</p>
                          <p className="text-emerald-400 font-bold">الترخيم Δ: {data.deflMm} mm</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="deflMm"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
