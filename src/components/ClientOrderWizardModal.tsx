import React, { useState } from 'react';
import { DesignCode, SteelGrade } from '../types/engineering';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ClientOrderWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
}

export const ClientOrderWizardModal: React.FC<ClientOrderWizardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [clientName, setClientName] = useState<string>('شركة النيل للصناعات المعدنية');
  const [projectTitle, setProjectTitle] = useState<string>('مقصورة تفتيش ومحطة تشغيل معدنية');
  const [location, setLocation] = useState<string>('مدينة العاشر من رمضان، مصر');
  const [template, setTemplate] = useState<'booth_kiosk' | 'portal_frame' | 'pitched_truss'>('booth_kiosk');

  const [lengthM, setLengthM] = useState<string>('6.0');
  const [widthM, setWidthM] = useState<string>('4.0');
  const [eaveHeightM, setEaveHeightM] = useState<string>('3.2');
  const [baysCount, setBaysCount] = useState<string>('3');

  const [designCode, setDesignCode] = useState<DesignCode>('AISC_360_22_LRFD');
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('S275');
  const [windSpeedKmh, setWindSpeedKmh] = useState<string>('110');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict AC-01 validation: No negative, zero, or non-finite dimensions
    const l = parseFloat(lengthM);
    const w = parseFloat(widthM);
    const h = parseFloat(eaveHeightM);
    const b = parseInt(baysCount);
    const v = parseFloat(windSpeedKmh);

    if (!clientName.trim() || !projectTitle.trim()) {
      setErrorMessage('يرجى إدخال اسم العميل وعنوان المشروع بالكامل.');
      return;
    }

    if (!l || l <= 0 || !w || w <= 0 || !h || h <= 0 || !b || b < 1) {
      setErrorMessage('متطلب AC-01: الأبعاد يجب أن تكون أرقامًا موجبة ومحددة صراحة (لا يُسمح بالصفر أو القيم الفارغة أو السالبة).');
      return;
    }

    if (!v || v < 60) {
      setErrorMessage('سرعة الرياح يجب أن تكون قيمة منطقية ومعتمدة وفق الكود.');
      return;
    }

    onSubmit({
      clientName,
      projectTitle,
      location,
      template,
      lengthM: l,
      widthM: w,
      eaveHeightM: h,
      ridgeHeightM: h + (template === 'booth_kiosk' ? 0.3 : 1.2),
      baysCount: b,
      designCode,
      steelGrade,
      windSpeedKmh: v,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              بوابة تسجيل طلب مشروع معدني جديد (Client Intake Wizard)
            </h3>
            <span className="text-xs text-slate-400">
              استقبال المدخلات وتدقيقها وفق متطلبات المواصفة REQ-IN-01 ومحايدة AC-01.
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Client & Project Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block mb-1">اسم العميل / المؤسسة:</span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-1">اسم أو وصف المشروع:</span>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
              />
            </div>
          </div>

          {/* Structure Family */}
          <div>
            <span className="text-slate-400 block mb-1">عائلة المنشأ المعدني:</span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-medium"
            >
              <option value="booth_kiosk">بوث ومقصورة مستطيلة (Modular Booth / Enclosure)</option>
              <option value="portal_frame">هنجر ومستودع بورتال فريم (Portal Frame Warehouse)</option>
              <option value="pitched_truss">جمالون وهيكل جملوني (Pitched Pratt / Warren Truss)</option>
            </select>
          </div>

          {/* Explicit Dimensions (No hidden zero/fallback) */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 block text-[11px]">الأبعاد الهندسية الصريحة (بالمتر):</span>
            <div className="grid grid-cols-4 gap-2 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">الطول (Length):</span>
                <input
                  type="number"
                  step="0.1"
                  value={lengthM}
                  onChange={(e) => setLengthM(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">العرض (Width):</span>
                <input
                  type="number"
                  step="0.1"
                  value={widthM}
                  onChange={(e) => setWidthM(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">الارتفاع (Height):</span>
                <input
                  type="number"
                  step="0.1"
                  value={eaveHeightM}
                  onChange={(e) => setEaveHeightM(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block mb-0.5">عدد الباكيات (Bays):</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={baysCount}
                  onChange={(e) => setBaysCount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Design Code & Wind Speed */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block mb-1">كود التصميم المعتمد:</span>
              <select
                value={designCode}
                onChange={(e) => setDesignCode(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
              >
                <option value="AISC_360_22_LRFD">AISC 360-22 (LRFD)</option>
                <option value="ECP_205_ASD">ECP 205 (الكود المصري ASD)</option>
                <option value="EUROCODE_3">Eurocode 3 (EN 1993)</option>
              </select>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">سرعة الرياح (كم/ساعة):</span>
              <input
                type="number"
                value={windSpeedKmh}
                onChange={(e) => setWindSpeedKmh(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md cursor-pointer"
            >
              إنشاء المشروع وبناء النموذج 3D
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
