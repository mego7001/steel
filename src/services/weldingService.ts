import {
  BasePlateDesign,
  MomentEndPlateDesign,
  ProjectData,
  WeldingSymbolDefinition,
} from '../types/engineering';

export function generateProjectWeldingSymbols(
  basePlates: BasePlateDesign[],
  momentEndPlates: MomentEndPlateDesign[]
): WeldingSymbolDefinition[] {
  const symbols: WeldingSymbolDefinition[] = [];

  // 1. Column to Base Plate Welds
  basePlates.forEach((bp, idx) => {
    const leg = bp.weldLeg || 8;
    symbols.push({
      id: `WELD-BP-${idx + 1}`,
      jointName: `لحام قاعدة العمود ${bp.columnMemberId}`,
      jointNameAr: `لحام قطاع العمود بلوح القاعدة Base Plate ${bp.plateLength}×${bp.plateWidth} مم`,
      connectedEntities: `عمود ${bp.columnMemberId} ↔ لوح قاعدة ${bp.plateThickness} مم`,
      connectionCategory: 'BASE_PLATE',
      linkedConnectionId: bp.id,
      weldType: 'FILLET',
      weldLegMm: leg,
      effectiveThroatMm: Number((0.707 * leg).toFixed(1)),
      weldLocation: 'BOTH_SIDES',
      allAround: true,
      fieldWeld: false,
      weldContour: 'FLAT_FLUSH',
      weldLengthMm: (bp.plateLength + bp.plateWidth) * 2,
      process: 'GMAW_MIG',
      electrode: 'AWS A5.18 ER70S-6 (Fy=430 MPa)',
      ndtMethod: 'VT',
      ndtCoverage: '100% VT + 20% MT',
      qualifiedWpsNo: 'WPS-MWEC-BP-01',
      designCapacityKnPerM: Number((0.707 * leg * 0.6 * 430).toFixed(0)), // ~1459 kN/m
    });
  });

  // 2. Rafter to Moment End-Plate Flange & Web Welds
  momentEndPlates.forEach((mep, idx) => {
    const flangeLeg = mep.weldFlangeLeg || 8;
    const webLeg = mep.weldWebLeg || 6;

    // Flange Weld (Moment Tension / Compression)
    symbols.push({
      id: `WELD-MEP-FLG-${idx + 1}`,
      jointName: `لحام أجنحة الرافتر باللوح الطرفي ${mep.rafterMemberId}`,
      jointNameAr: `لحام جناحي الرافتر (Flanges) باللوح الطرفي Extended End Plate`,
      connectedEntities: `أجنحة رافتر ${mep.rafterMemberId} ↔ لوح طرفي ${mep.thickness} مم`,
      connectionCategory: 'MOMENT_END_PLATE',
      linkedConnectionId: mep.id,
      weldType: 'FILLET',
      weldLegMm: flangeLeg,
      effectiveThroatMm: Number((0.707 * flangeLeg).toFixed(1)),
      weldLocation: 'BOTH_SIDES',
      allAround: false,
      fieldWeld: false,
      weldContour: 'FLAT_FLUSH',
      process: 'GMAW_MIG',
      electrode: 'AWS A5.18 ER70S-6',
      ndtMethod: 'UT',
      ndtCoverage: '100% VT + 100% UT (Critical Tension)',
      qualifiedWpsNo: 'WPS-MWEC-MEP-FLG-02',
      designCapacityKnPerM: Number((0.707 * flangeLeg * 0.6 * 430).toFixed(0)),
    });

    // Web Weld (Shear Transfer)
    symbols.push({
      id: `WELD-MEP-WEB-${idx + 1}`,
      jointName: `لحام جسد الرافتر باللوح الطرفي ${mep.rafterMemberId}`,
      jointNameAr: `لحام جسد الرافتر (Web) باللوح الطرفي لنقل قوى القص`,
      connectedEntities: `جسد رافتر ${mep.rafterMemberId} ↔ لوح طرفي ${mep.thickness} مم`,
      connectionCategory: 'MOMENT_END_PLATE',
      linkedConnectionId: mep.id,
      weldType: 'FILLET',
      weldLegMm: webLeg,
      effectiveThroatMm: Number((0.707 * webLeg).toFixed(1)),
      weldLocation: 'BOTH_SIDES',
      allAround: false,
      fieldWeld: false,
      weldContour: 'FLAT_FLUSH',
      process: 'GMAW_MIG',
      electrode: 'AWS A5.18 ER70S-6',
      ndtMethod: 'VT',
      ndtCoverage: '100% VT',
      qualifiedWpsNo: 'WPS-MWEC-MEP-WEB-03',
      designCapacityKnPerM: Number((0.707 * webLeg * 0.6 * 430).toFixed(0)),
    });
  });

  // 3. Stiffeners & Cleats Welds
  symbols.push({
    id: 'WELD-STIFF-01',
    jointName: 'لحام أضلاع التقوية الداخلية (Column Web Stiffeners)',
    jointNameAr: 'لحام ألواح التقوية بجسد وأجنحة العمود لمقاومة ضغط وشد المسامير',
    connectedEntities: 'ألواح تقوية 10 مم ↔ جسد وأجنحة العمود HEA/SHS',
    connectionCategory: 'STIFFENER',
    weldType: 'FILLET',
    weldLegMm: 6,
    effectiveThroatMm: 4.2,
    weldLocation: 'BOTH_SIDES',
    allAround: false,
    fieldWeld: false,
    weldContour: 'NONE',
    process: 'GMAW_MIG',
    electrode: 'AWS A5.18 ER70S-6',
    ndtMethod: 'VT',
    ndtCoverage: '100% VT',
    qualifiedWpsNo: 'WPS-MWEC-STIFF-04',
    designCapacityKnPerM: Number((0.707 * 6 * 0.6 * 430).toFixed(0)),
  });

  symbols.push({
    id: 'WELD-CLEAT-01',
    jointName: 'لحام كليتات تثبيت المدادات (Purlin Cleats)',
    jointNameAr: 'لحام زوايا وكليتات تثبيت مدادات السقف والجدران فوق الرافتر',
    connectedEntities: 'كليتات L 70x70x7 ↔ ظهر الرافتر IPE',
    connectionCategory: 'PURLIN_CLEAT',
    weldType: 'FILLET',
    weldLegMm: 5,
    effectiveThroatMm: 3.5,
    weldLocation: 'ARROW_SIDE',
    allAround: false,
    fieldWeld: false,
    weldContour: 'NONE',
    process: 'GMAW_MIG',
    electrode: 'AWS A5.18 ER70S-6',
    ndtMethod: 'VT',
    ndtCoverage: '100% VT',
    qualifiedWpsNo: 'WPS-MWEC-CLEAT-05',
    designCapacityKnPerM: Number((0.707 * 5 * 0.6 * 430).toFixed(0)),
  });

  symbols.push({
    id: 'WELD-GUSSET-01',
    jointName: 'لحام ألواح الجوسيت لتربيط الرياح (Bracing Gussets)',
    jointNameAr: 'لحام ألواح الجوسيت بقواعد الأعمدة وكمرات الإفريز',
    connectedEntities: 'لوح جوسيت 8 مم ↔ زوايا وقواعد الهيكل',
    connectionCategory: 'BRACING_GUSSET',
    weldType: 'FILLET',
    weldLegMm: 6,
    effectiveThroatMm: 4.2,
    weldLocation: 'BOTH_SIDES',
    allAround: false,
    fieldWeld: false,
    weldContour: 'NONE',
    process: 'GMAW_MIG',
    electrode: 'AWS A5.18 ER70S-6',
    ndtMethod: 'VT',
    ndtCoverage: '100% VT + 10% MT',
    qualifiedWpsNo: 'WPS-MWEC-GUSSET-06',
    designCapacityKnPerM: Number((0.707 * 6 * 0.6 * 430).toFixed(0)),
  });

  return symbols;
}
