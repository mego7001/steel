/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 System Capabilities Catalog & Guard Enforcement
 * Defines active vs deferred capabilities per Phase 1 Executive Spec
 */

import { SystemCapabilityInfo } from '../types/p1';

export const P1_SYSTEM_CAPABILITIES: SystemCapabilityInfo[] = [
  {
    id: 'CAP-PRJ-STORAGE',
    name: 'Persistent Project Storage & Multi-tenant Boundaries',
    nameAr: 'حفظ المشاريع المستقل وعزل المؤسسات التام',
    category: 'core',
    status: 'validated',
    plannedPhase: 'P1 (Active)',
    descriptionAr: 'حفظ مسودات المشاريع واستعادتها مع عزل كل مؤسسة ومنع الوصول العابر بين المؤسسات والمشاريع.',
  },
  {
    id: 'CAP-CONCURRENCY',
    name: 'Optimistic Concurrency & Revision Snapshots',
    nameAr: 'كشف تعارض الحفظ والإصدارات الثابتة (Snapshots)',
    category: 'core',
    status: 'validated',
    plannedPhase: 'P1 (Active)',
    descriptionAr: 'منع الكتابة فوق التعديلات المتعارضة بكود 409، وتوليد بصمات رقمية SHA-256 للمحتوى وتاريخ التعديل.',
  },
  {
    id: 'CAP-INPUT-PROVENANCE',
    name: 'Input Units, Provenance & Assumption Tracking',
    nameAr: 'حصر مصادر المدخلات والافتراضات الهندسية',
    category: 'core',
    status: 'validated',
    plannedPhase: 'P1 (Active)',
    descriptionAr: 'توثيق أصل كل رقم هندسي (قياس، توريد، كود، كتالوج، افتراض) وبيان حالة تحققه الصريحة.',
  },
  {
    id: 'CAP-ATTACHMENTS',
    name: 'Private Project Attachments & Authorization',
    nameAr: 'المرفقات والمراجع الخاصة المفوضة',
    category: 'core',
    status: 'validated',
    plannedPhase: 'P1 (Active)',
    descriptionAr: 'رفع وفحص وتنزيل المستندات (PDF/PNG/JPEG) بحجم أقصى 25 ميجابايت مع التحقق من الهوية عند كل طلب.',
  },
  {
    id: 'CAP-STRUCTURAL-SOLVER',
    name: 'Structural Analysis & Member Verification Engine',
    nameAr: 'محرك التحليل الإنشائي وفحص الأعضاء المعتمد',
    category: 'engineering',
    status: 'unavailable',
    plannedPhase: 'P3 (Planned)',
    descriptionAr: 'محرك التحليل القديم معزول لعدم صلاحيته للاعتماد. سيتم استبداله بمحرك معتمد ومحقق في المرحلة P3.',
  },
  {
    id: 'CAP-CONNECTION-DESIGN',
    name: 'Connection Detailing & Anchor Verification',
    nameAr: 'تصميم وتفصيل الوصلات ومسامير التثبيت',
    category: 'engineering',
    status: 'unavailable',
    plannedPhase: 'P4 (Planned)',
    descriptionAr: 'حسابات الوصلات غير متاحة في P1 وتصنف missing_input / unsupported حتى المرحلة P4.',
  },
  {
    id: 'CAP-FABRICATION-RELEASE',
    name: 'Automated Fabrication Release & Machine NC1/DXF Export',
    nameAr: 'إطلاق التصنيع وتصدير ملفات الماكينات CAM',
    category: 'fabrication',
    status: 'unavailable',
    plannedPhase: 'P4 (Planned)',
    descriptionAr: 'محظور تماماً في المرحلة P1 بموجب البند P1-GRD-01/02؛ لا يسمح بإنتاج ملفات تشغيل للماكينات دون مراجعة معتمدة.',
  },
  {
    id: 'CAP-COSTING-QUOTE',
    name: 'Official Quotation & Factory Ledger Costing',
    nameAr: 'التسعير الرسمي للمصنع وعروض الأسعار المعتمدة',
    category: 'commercial',
    status: 'unavailable',
    plannedPhase: 'P5 (Planned)',
    descriptionAr: 'محرك التسعير القديم معزول كغير محقق لمنع صدور عروض أسعار مغلوطة، ومجدول للمرحلة P5.',
  },
  {
    id: 'CAP-AI-ENGINEERING',
    name: 'Autonomous AI Engineering Numbers Generator',
    nameAr: 'توليد أرقام هندسية آلية عبر الذكاء الاصطناعي',
    category: 'engineering',
    status: 'unavailable',
    plannedPhase: 'P6 (Planned)',
    descriptionAr: 'معطل افتراضياً لمنع اختلاق أرقام أو نسب استغلال وهمية؛ يقتصر الذكاء الاصطناعي لاحقاً على مراجعة النواقص.',
  },
];
