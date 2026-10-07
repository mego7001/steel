import React, { useState } from 'react';
import {
  NonConformanceReport,
  ProjectData,
  QualityITPItem,
} from '../types/engineering';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileCheck,
  PlusCircle,
} from 'lucide-react';

interface QualityTrackerViewProps {
  project: ProjectData;
  onUpdateITPStatus: (id: string, newStatus: QualityITPItem['status']) => void;
  onAddNCR: (ncr: NonConformanceReport) => void;
}

export const QualityTrackerView: React.FC<QualityTrackerViewProps> = ({
  project,
  onUpdateITPStatus,
  onAddNCR,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'itp' | 'ncr' | 'traveller'>('itp');
  const [showNewNcrModal, setShowNewNcrModal] = useState<boolean>(false);

  // New NCR Form State
  const [ncrPartMark, setNcrPartMark] = useState<string>('P-COL-A1-BP');
  const [ncrDesc, setNcrDesc] = useState<string>('عدم تطابق المسافة بين مراكز ثقوب مسامير التثبيت (+4 مم تفاوت)');
  const [ncrDisposition, setNcrDisposition] = useState<NonConformanceReport['disposition']>('REWORK');

  const handleCreateNCR = () => {
    const newReport: NonConformanceReport = {
      id: `NCR-${Date.now()}`,
      reportNumber: `NCR-2026-${project.ncrs.length + 1}`,
      partOrAssemblyMark: ncrPartMark,
      date: new Date().toISOString().slice(0, 10),
      deficiencyDescription: ncrDesc,
      rootCause: 'خطأ معايرة نقطة الصفر في ماكينة القص اليدوية',
      disposition: ncrDisposition,
      dispositionApprovedBy: 'Eng. QA Lead Inspector',
      resolutionStatus: 'OPEN',
    };
    onAddNCR(newReport);
    setShowNewNcrModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('itp')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeSubTab === 'itp'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          خطة الفحص والاختبار (ITP - Inspection & Test Plan)
        </button>
        <button
          onClick={() => setActiveSubTab('ncr')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeSubTab === 'ncr'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          تقارير عدم المطابقة (NCR Register)
        </button>
        <button
          onClick={() => setActiveSubTab('traveller')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeSubTab === 'traveller'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          بطاقة متابعة التشغيل والباركود (Shop Traveller & QR)
        </button>
      </div>

      {/* 1. ITP Checklist Tab */}
      {activeSubTab === 'itp' && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                خطة فحص الجودة المعتمدة بالورشة (Inspection & Test Plan)
              </h3>
              <span className="text-xs text-slate-400">
                وفقًا للمواصفة REQ-QA-01: نقاط توقف وفحص إجبارية (Hold & Witness Points) لضمان مطابقة الكود.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">المرحلة</th>
                  <th className="py-2.5 px-3">بند الفحص والمطلوب</th>
                  <th className="py-2.5 px-3">معيار القبول والتفاوت</th>
                  <th className="py-2.5 px-3">طريقة الفحص</th>
                  <th className="py-2.5 px-3">المسؤول</th>
                  <th className="py-2.5 px-3">حالة الفحص</th>
                  <th className="py-2.5 px-3">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {project.itpChecklist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50">
                    <td className="py-2 px-3 font-bold text-amber-300">{item.stageAr}</td>
                    <td className="py-2 px-3 font-medium text-slate-100">{item.itemDescription}</td>
                    <td className="py-2 px-3 text-slate-400">{item.acceptanceCriteria}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-sky-400">{item.inspectionMethod}</td>
                    <td className="py-2 px-3 text-slate-300">{item.responsibleParty}</td>
                    <td className="py-2 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.status === 'passed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : item.status === 'hold'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateITPStatus(item.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                      >
                        <option value="passed">Pass (مطابق)</option>
                        <option value="pending">Pending (معلق)</option>
                        <option value="hold">Hold (نقطة توقف)</option>
                        <option value="ncr">NCR (غير مطابق)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. NCR Register Tab */}
      {activeSubTab === 'ncr' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                سجل حالات عدم المطابقة (Non-Conformance Reports - NCR)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                وفقًا للمواصفة REQ-QA-02: لا يُسمح بإغلاق أو اعتماد Use-As-Is إلا بموافقة هندسية موثقة ومعلنة.
              </p>
            </div>
            <button
              onClick={() => setShowNewNcrModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-100 font-bold rounded text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تسجيل تقرير NCR جديد</span>
            </button>
          </div>

          <div className="space-y-3">
            {project.ncrs.map((ncr) => (
              <div key={ncr.id} className="p-4 rounded-lg bg-slate-900 border border-rose-900/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-400">{ncr.reportNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      القطعة: {ncr.partOrAssemblyMark}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">
                    القرار: {ncr.disposition}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <p><span className="text-slate-400">وصف العيب:</span> {ncr.deficiencyDescription}</p>
                  <p><span className="text-slate-400">السبب الجذري:</span> {ncr.rootCause}</p>
                  <p><span className="text-slate-400">المعتمد:</span> {ncr.dispositionApprovedBy || 'قيد المراجعة'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Shop Traveller & QR Tab */}
      {activeSubTab === 'traveller' && (
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center">
          <div className="w-full max-w-md bg-slate-950 border-2 border-slate-700 rounded-lg p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 font-mono block">MWEC DIGITAL SHOP TRAVELLER</span>
                <h4 className="text-sm font-bold text-slate-100">تجميعة: AS-COL-01</h4>
              </div>
              <div className="w-16 h-16 bg-white rounded p-1 flex items-center justify-center">
                <QrCode className="w-14 h-14 text-slate-950" />
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">المشروع:</span>
                <span>{project.projectNumber} (Rev.{project.revision})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الوزن الإجمالي:</span>
                <span>{project.assemblies[0]?.totalWeightKg || 120} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الدهان المعتمد:</span>
                <span>Sa 2.5 + Epoxy 80µm</span>
              </div>
            </div>

            {/* Check-off Stations */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <span className="text-xs font-bold text-slate-200 block">محطات متابعة التنفيذ بالورشة:</span>
              {[
                { name: '1. قص المنشار والليزر (Cutting)', done: true },
                { name: '2. الثقب والتشغيل (CNC Drill)', done: true },
                { name: '3. التجميع واللحام (Fit-up & Weld)', done: true },
                { name: '4. فحص الجودة واللحامات (VT / UT)', done: false },
                { name: '5. السف ع والدهان (Blast & Paint)', done: false },
                { name: '6. الشحن للموقع (Dispatch)', done: false },
              ].map((st, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-900">
                  <span className={st.done ? 'text-slate-200' : 'text-slate-500'}>{st.name}</span>
                  <span className={`font-mono text-[11px] ${st.done ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                    {st.done ? 'COMPLETED ✓' : 'QUEUED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New NCR Modal */}
      {showNewNcrModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">تسجيل تقرير عدم مطابقة جديد (New NCR)</h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">رقم القطعة / التجميعة:</span>
                <input
                  type="text"
                  value={ncrPartMark}
                  onChange={(e) => setNcrPartMark(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">وصف العيب أو التجاوز:</span>
                <textarea
                  rows={3}
                  value={ncrDesc}
                  onChange={(e) => setNcrDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">قرار المعالجة المقترح (Disposition):</span>
                <select
                  value={ncrDisposition}
                  onChange={(e) => setNcrDisposition(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                >
                  <option value="REWORK">إعادة تشغيل وتعديل (REWORK)</option>
                  <option value="REPAIR">إصلاح هندسي معتمد (REPAIR)</option>
                  <option value="REJECT">رفض وتكهين القطعة (REJECT)</option>
                  <option value="USE_AS_IS">قبول كما هي بعد دراسة الأمان (USE_AS_IS)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowNewNcrModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateNCR}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-slate-100 text-xs font-bold cursor-pointer"
              >
                حفظ التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
