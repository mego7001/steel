/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Data Validation & Completeness Checker
 * Enforces Rules per P1-DAT-01..07 and Section 5.5
 */

import { ProjectIssue, ProjectMetadata, WorkspaceDraftData } from '../types/p1';

/**
 * Normalizes user number input, supporting Eastern Arabic numerals (٠-٩) and Persian numerals.
 * Rejects ambiguous separators or non-numeric tokens.
 */
export function parseNumericInput(raw: string | number | null | undefined): {
  value: number | null;
  error?: string;
} {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { value: null, error: 'القيمة ليست رقماً صحيحاً منتهياً (Finite Number)' };
    return { value: raw };
  }

  const trimmed = raw.trim();
  if (trimmed === '') return { value: null };

  // Replace Arabic-Indic digits with standard Latin digits
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let normalized = trimmed;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replaceAll(arabicDigits[i], String(i));
  }

  // Replace Arabic decimal comma '٫' with '.'
  normalized = normalized.replace('٫', '.');

  // Check for ambiguous multiple dots or commas
  if ((normalized.match(/\./g) || []).length > 1 || (normalized.match(/,/g) || []).length > 0) {
    return { value: null, error: 'صيغة الرقم ملتبسة وتحتوي على فواصل متعددة. يرجى استخدام فاصلة عشرية واحدة واضحة.' };
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return { value: null, error: 'النص المدخل لا يمثل قيمة عددية صالحة.' };
  }

  return { value: num };
}

/**
 * Validate workspace draft and project metadata, producing a list of issues
 */
export function validateWorkspaceDraft(
  metadata: ProjectMetadata,
  draft: WorkspaceDraftData
): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const pId = metadata.id;

  // 1. Project Title
  if (!metadata.title || metadata.title.trim().length === 0) {
    issues.push({
      id: `iss_title_${Date.now()}`,
      projectId: pId,
      code: 'TITLE_REQUIRED',
      severity: 'error',
      fieldPath: 'metadata.title',
      message: 'Project title cannot be empty.',
      messageAr: 'اسم المشروع إلزامي ولا يمكن تركه فارغاً.',
      resolutionState: 'open',
    });
  }

  // 2. Client Name
  if (!metadata.clientName || metadata.clientName.trim().length === 0) {
    issues.push({
      id: `iss_client_${Date.now()}`,
      projectId: pId,
      code: 'CLIENT_REQUIRED',
      severity: 'warning',
      fieldPath: 'metadata.clientName',
      message: 'Client name is missing.',
      messageAr: 'اسم العميل / جهة التكليف غير مسجل.',
      resolutionState: 'open',
    });
  }

  // 3. Dimensions: Length
  const len = draft.dimensions.lengthM;
  if (len === null) {
    issues.push({
      id: `iss_len_null_${pId}`,
      projectId: pId,
      code: 'LENGTH_MISSING',
      severity: 'error',
      fieldPath: 'dimensions.lengthM',
      message: 'Length is required for structural definition.',
      messageAr: 'طول الهيكل (Length) غير محدد.',
      resolutionState: 'open',
    });
  } else if (len <= 0) {
    issues.push({
      id: `iss_len_invalid_${pId}`,
      projectId: pId,
      code: 'LENGTH_NON_POSITIVE',
      severity: 'error',
      fieldPath: 'dimensions.lengthM',
      message: 'Length must be strictly positive (> 0).',
      messageAr: 'طول الهيكل يجب أن يكون قيمة موجبة أكبر من الصفر.',
      resolutionState: 'open',
    });
  }

  // 4. Dimensions: Width
  const wid = draft.dimensions.widthM;
  if (wid === null) {
    issues.push({
      id: `iss_wid_null_${pId}`,
      projectId: pId,
      code: 'WIDTH_MISSING',
      severity: 'error',
      fieldPath: 'dimensions.widthM',
      message: 'Width is required for structural definition.',
      messageAr: 'عرض الهيكل (Width) غير محدد.',
      resolutionState: 'open',
    });
  } else if (wid <= 0) {
    issues.push({
      id: `iss_wid_invalid_${pId}`,
      projectId: pId,
      code: 'WIDTH_NON_POSITIVE',
      severity: 'error',
      fieldPath: 'dimensions.widthM',
      message: 'Width must be strictly positive (> 0).',
      messageAr: 'عرض الهيكل يجب أن يكون قيمة موجبة أكبر من الصفر.',
      resolutionState: 'open',
    });
  }

  // 5. Dimensions: Eave Height
  const eave = draft.dimensions.eaveHeightM;
  if (eave === null) {
    issues.push({
      id: `iss_eave_null_${pId}`,
      projectId: pId,
      code: 'EAVE_MISSING',
      severity: 'error',
      fieldPath: 'dimensions.eaveHeightM',
      message: 'Eave height is required.',
      messageAr: 'ارتفاع الإفريز (Eave Height) غير محدد.',
      resolutionState: 'open',
    });
  } else if (eave <= 0) {
    issues.push({
      id: `iss_eave_invalid_${pId}`,
      projectId: pId,
      code: 'EAVE_NON_POSITIVE',
      severity: 'error',
      fieldPath: 'dimensions.eaveHeightM',
      message: 'Eave height must be strictly positive (> 0).',
      messageAr: 'ارتفاع الإفريز يجب أن يكون أكبر من الصفر.',
      resolutionState: 'open',
    });
  }

  // 6. Dimensions: Ridge Height vs Eave Height
  const ridge = draft.dimensions.ridgeHeightM;
  if (ridge !== null && eave !== null) {
    if (ridge < eave) {
      issues.push({
        id: `iss_ridge_eave_${pId}`,
        projectId: pId,
        code: 'RIDGE_LESS_THAN_EAVE',
        severity: 'error',
        fieldPath: 'dimensions.ridgeHeightM',
        message: 'Ridge height cannot be less than eave height in pitched roofs.',
        messageAr: 'ارتفاع الذروة (Ridge Height) لا يمكن أن يكون أقل من ارتفاع الإفريز (Eave Height).',
        resolutionState: 'open',
      });
    }
  }

  // 7. Bays count
  const bays = draft.dimensions.baysCount;
  if (bays === null) {
    issues.push({
      id: `iss_bays_null_${pId}`,
      projectId: pId,
      code: 'BAYS_MISSING',
      severity: 'warning',
      fieldPath: 'dimensions.baysCount',
      message: 'Bays count is missing (defaulting requires explicit entry).',
      messageAr: 'عدد الباكيات (Bays Count) غير مسجل صراحة.',
      resolutionState: 'open',
    });
  } else if (!Number.isInteger(bays) || bays <= 0) {
    issues.push({
      id: `iss_bays_invalid_${pId}`,
      projectId: pId,
      code: 'BAYS_NOT_POSITIVE_INT',
      severity: 'error',
      fieldPath: 'dimensions.baysCount',
      message: 'Bays count must be a positive integer.',
      messageAr: 'عدد الباكيات يجب أن يكون عدداً صحيحاً موجباً أكبر من الصفر.',
      resolutionState: 'open',
    });
  }

  // 8. Input Provenance Audits
  const provLength = draft.provenance['dimensions.lengthM'];
  if (provLength && provLength.sourceKind === 'assumed' && (!provLength.note || provLength.note.trim() === '')) {
    issues.push({
      id: `iss_prov_len_note_${pId}`,
      projectId: pId,
      code: 'ASSUMPTION_REASON_MISSING',
      severity: 'warning',
      fieldPath: 'dimensions.lengthM',
      message: 'Assumed length requires a stated engineering justification note.',
      messageAr: 'تم تعيين الطول كافتراض، ويلزم توثيق سبب الافتراض الهندسي.',
      resolutionState: 'open',
    });
  }

  const provWidth = draft.provenance['dimensions.widthM'];
  if (provWidth && provWidth.sourceKind === 'assumed' && (!provWidth.note || provWidth.note.trim() === '')) {
    issues.push({
      id: `iss_prov_wid_note_${pId}`,
      projectId: pId,
      code: 'ASSUMPTION_REASON_MISSING',
      severity: 'warning',
      fieldPath: 'dimensions.widthM',
      message: 'Assumed width requires a stated justification note.',
      messageAr: 'تم تعيين العرض كافتراض، ويلزم توثيق سبب الافتراض.',
      resolutionState: 'open',
    });
  }

  // 9. Steel Grade check
  if (!draft.material.steelGrade) {
    issues.push({
      id: `iss_grade_null_${pId}`,
      projectId: pId,
      code: 'STEEL_GRADE_MISSING',
      severity: 'error',
      fieldPath: 'material.steelGrade',
      message: 'Steel material grade must be explicitly selected.',
      messageAr: 'رتبة الصلب (Steel Grade) غير محددة صراحة.',
      resolutionState: 'open',
    });
  }

  return issues;
}
