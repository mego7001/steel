/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Clean New Project Modal
 * Creates brand-new independent project without copying prior state (P1-PRJ-01/02)
 */

import React, { useState } from 'react';
import { ProjectType } from '../../types/p1';
import { PlusCircle, X, Check, AlertCircle, Building2, Calendar, FileText } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any, idempotencyKey: string) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('booth_kiosk');
  const [typeDescriptionOther, setTypeDescriptionOther] = useState('');
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('مصر (Egypt)');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'USD' | 'SAR'>('EGP');
  const [displayUnits, setDisplayUnits] = useState<'metric_mm' | 'metric_m' | 'imperial'>('metric_mm');
  const [notes, setNotes] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('اسم المشروع إلزامي ولا يمكن تركه فارغاً.');
      return;
    }
    if (!clientName.trim()) {
      setErrorMsg('اسم العميل أو الجهة صاحبة العمل إلزامي.');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = `create_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await onSubmit(
        {
          title: title.trim(),
          projectType,
          typeDescriptionOther: projectType === 'other' ? typeDescriptionOther.trim() : undefined,
          clientName: clientName.trim(),
          location: location.trim(),
          country: country.trim(),
          dueDate: dueDate || undefined,
          currency,
          displayUnits,
          notes: notes.trim(),
          scopeDescription: scopeDescription.trim(),
        },
        idempotencyKey
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إنشاء المشروع.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl animate-in fade-in max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">
              إنشاء مسودة مشروع جديد (Clean Project Factory)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          وفقاً لمتطلب <strong>P1-PRJ-01</strong>، يتم إنشاء مسودة مشروع مستقلة تماماً بمعرف UUID خاص، دون نسخ أي بيانات سابقة أو اعتمادات صورية من مشاريع أخرى.
        </p>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">اسم المشروع (Project Title) *:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مقصورة تشغيل معيارية لوحدة السويس"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">نوع المنشأ الهيكلي *:</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-medium"
              >
                <option value="booth_kiosk">مقصورة / غرفة تحكم معيارية (Booth & Enclosure)</option>
                <option value="portal_frame">مستودع إطار صلب مائل (Portal Frame Warehouse)</option>
                <option value="pitched_truss">جمالون مائل تقليدي (Pitched Truss)</option>
                <option value="other">هيكل خاص آخر (Other Structure)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">اسم العميل / جهة التكليف *:</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="مثال: شركة النصر للصناعات الكيماوية"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-medium"
              />
            </div>
          </div>

          {projectType === 'other' && (
            <div>
              <label className="block text-slate-400 mb-1">توصيف نوع الهيكل الخاص:</label>
              <input
                type="text"
                value={typeDescriptionOther}
                onChange={(e) => setTypeDescriptionOther(e.target.value)}
                placeholder="مثال: مظلة مواقف منحنية، برج دعم، درج صناعي..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">الموقع الجغرافي للمشروع:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: العين السخنة، السويس"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">الدولة:</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="مصر (Egypt)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">تاريخ التسليم المستهدف:</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">عملة المشروع:</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              >
                <option value="EGP">EGP — الجنيه المصري</option>
                <option value="USD">USD — الدولار الأمريكي</option>
                <option value="SAR">SAR — الريال السعودي</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">وحدات العرض المفضلة:</label>
              <select
                value={displayUnits}
                onChange={(e) => setDisplayUnits(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              >
                <option value="metric_mm">متري هندسي (ملم / كيلو نيوتن)</option>
                <option value="metric_m">متري أمتار (متر / طن)</option>
                <option value="imperial">Imperial (Inches / Kips)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">وصف نطاق الأعمال المطلوب (Scope Description):</label>
            <textarea
              rows={2}
              value={scopeDescription}
              onChange={(e) => setScopeDescription(e.target.value)}
              placeholder="مثال: توريد وتصنيع قطاعات الأعضاء الرئيسية مع القواعد والدهان Sa 2.5."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الإنشاء...' : 'إنشاء مسودة المشروع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
