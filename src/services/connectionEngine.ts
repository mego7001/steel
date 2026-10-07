import {
  BasePlateDesign,
  MomentEndPlateDesign,
  ProjectData,
  SteelGrade,
  WeldingSymbolDefinition,
} from '../types/engineering';
import { getMaterialByGrade, getProfileById } from './catalogService';

export function designBasePlates(project: ProjectData): BasePlateDesign[] {
  const { members, memberChecks, steelGradeDefault } = project;
  const basePlates: BasePlateDesign[] = [];

  // Filter columns
  const columnMembers = members.filter(m => m.type === 'column');
  const mat = getMaterialByGrade(steelGradeDefault);
  const Fy = mat.Fy;

  columnMembers.forEach((col, idx) => {
    const section = getProfileById(col.sectionId);
    const check = memberChecks.find(c => c.memberId === col.id);
    const axialPu_kN = check ? Math.abs(check.axialForceKn) : 120;
    const shearVu_kN = check ? check.shearForceKn : 15;
    const momentMu_kNm = check ? check.bendingMomentKnM : 18;

    const colDepth = section ? section.h : 200;
    const colWidth = section ? section.b : 200;

    // Minimum plate length and width with 80mm projection around column
    const plateLength = Math.max(300, Math.ceil((colDepth + 120) / 10) * 10);
    const plateWidth = Math.max(300, Math.ceil((colWidth + 120) / 10) * 10);
    const concreteFcu = 30; // MPa

    // Bearing pressure on concrete pedestal
    const plateAreaMm2 = plateLength * plateWidth;
    const bearingPressure = (axialPu_kN * 1000) / plateAreaMm2; // MPa
    const phi_c = 0.65;
    const allowableBearing = phi_c * (0.85 * concreteFcu * 1.5); // MPa

    // Cantilever dimension m and n
    const m = (plateLength - 0.95 * colDepth) / 2;
    const n = (plateWidth - 0.80 * colWidth) / 2;
    const l_cantilever = Math.max(m, n, 40);

    // Required plate thickness per AISC Design Guide 1: t_req = l * sqrt(2 * Pu / (phi_b * Fy * B * N))
    const phi_b = 0.90;
    const t_req = l_cantilever * Math.sqrt((2 * axialPu_kN * 1000) / (phi_b * Fy * plateLength * plateWidth));
    const plateThickness = Math.max(16, Math.ceil(t_req / 2) * 2);

    // Anchor bolts: 4 bolts M24 Grade 8.8
    const anchorDiameter = 24;
    const anchorCount = 4;
    const anchorTensionForceKn = Math.max(0, (momentMu_kNm * 1000) / (plateLength - 100) - (axialPu_kN / 2));
    const anchorShearForceKn = shearVu_kN / anchorCount;

    // Anchor capacity Grade 8.8 (Fu = 800 MPa, As = 353 mm2)
    const anchorAs = 353;
    const phi_anchor = 0.75;
    const anchorTensionCapacityKn = (phi_anchor * 0.75 * 800 * anchorAs) / 1000; // ~158 kN
    const anchorShearCapacityKn = (phi_anchor * 0.45 * 800 * anchorAs) / 1000;   // ~95 kN

    // Plate bending stress
    const plateBendingStress = (bearingPressure * Math.pow(l_cantilever, 2)) / (Math.pow(plateThickness, 2) / 2);

    const bearingUtil = bearingPressure / allowableBearing;
    const anchorTenUtil = anchorTensionForceKn / anchorTensionCapacityKn;
    const anchorShearUtil = anchorShearForceKn / anchorShearCapacityKn;
    const plateThickUtil = t_req / plateThickness;

    const maxUtil = Math.max(bearingUtil, anchorTenUtil, anchorShearUtil, plateThickUtil);
    const status = maxUtil <= 1.0 ? 'pass' : 'fail';

    basePlates.push({
      id: `BP_${col.id}_${idx + 1}`,
      columnMemberId: col.id,
      plateLength,
      plateWidth,
      plateThickness,
      steelGrade: steelGradeDefault,
      anchorGrade: 'Grade 8.8',
      anchorDiameter,
      anchorCount,
      anchorEmbedment: 450,
      groutThickness: 30,
      concreteFcu,
      weldLeg: 8,
      bearingPressure: Number(bearingPressure.toFixed(2)),
      allowableBearing: Number(allowableBearing.toFixed(2)),
      plateBendingStress: Number(plateBendingStress.toFixed(1)),
      anchorTensionForceKn: Number(anchorTensionForceKn.toFixed(1)),
      anchorShearForceKn: Number(anchorShearForceKn.toFixed(1)),
      status,
      utilization: Number(maxUtil.toFixed(2)),
    });
  });

  return basePlates;
}

export function designMomentEndPlates(project: ProjectData): MomentEndPlateDesign[] {
  const { members, memberChecks, steelGradeDefault } = project;
  const endPlates: MomentEndPlateDesign[] = [];

  const rafterMembers = members.filter(m => m.type === 'rafter');
  const mat = getMaterialByGrade(steelGradeDefault);
  const Fy = mat.Fy;

  rafterMembers.forEach((raf, idx) => {
    const col = members.find(m => m.type === 'column' && (m.startNodeId === raf.startNodeId || m.endNodeId === raf.startNodeId));
    const section = getProfileById(raf.sectionId);
    const check = memberChecks.find(c => c.memberId === raf.id);

    const appliedMomentKnM = check ? check.bendingMomentKnM : 45;
    const appliedShearKn = check ? check.shearForceKn : 35;

    const depth = section ? section.h : 240;
    const width = section ? section.b : 120;
    const tf = section ? section.tf : 9.8;

    // 4-bolt Extended Tension End Plate
    const plateThickness = Math.max(18, Math.ceil((tf * 1.5) / 2) * 2);
    const plateWidth = Math.max(180, width + 40);
    const plateHeight = depth + 120;

    // Bolt diameter M20 Grade 8.8
    const boltDiameter = 20;
    const boltRows = 4;
    const boltPitch = 80;

    // Bolt tensile capacity: 4 bolts in tension zone
    // Each M20 Grade 8.8: As = 245 mm2, phi * 0.75 * 800 * As / 1000 = ~110 kN
    const singleBoltTensionCapKn = 110;
    const tensionBoltsCount = 4;
    const leverArmM = (depth - tf / 2) / 1000;

    const momentCapacityKnM = (tensionBoltsCount * singleBoltTensionCapKn * leverArmM);
    const shearCapacityKn = 8 * 65; // 8 bolts in shear

    const momentUtil = appliedMomentKnM / Math.max(1, momentCapacityKnM);
    const shearUtil = appliedShearKn / Math.max(1, shearCapacityKn);
    const maxUtil = Math.max(momentUtil, shearUtil);

    endPlates.push({
      id: `MEP_${raf.id}_${idx + 1}`,
      rafterMemberId: raf.id,
      columnMemberId: col ? col.id : 'COL-01',
      plateType: 'extended_tension',
      thickness: plateThickness,
      width: plateWidth,
      height: plateHeight,
      boltDiameter,
      boltGrade: '8.8',
      boltRows,
      boltPitch,
      weldFlangeLeg: 8,
      weldWebLeg: 6,
      stiffenerThickness: 10,
      appliedMomentKnM: Number(appliedMomentKnM.toFixed(1)),
      appliedShearKn: Number(appliedShearKn.toFixed(1)),
      momentCapacityKnM: Number(momentCapacityKnM.toFixed(1)),
      shearCapacityKn: Number(shearCapacityKn.toFixed(1)),
      status: maxUtil <= 1.0 ? 'pass' : 'fail',
      utilization: Number(maxUtil.toFixed(2)),
    });
  });

  return endPlates;
}

export function generateWeldingSymbols(project: ProjectData): WeldingSymbolDefinition[] {
  const symbols: WeldingSymbolDefinition[] = [];

  // 1. Base Plate column-to-plate welds
  project.basePlates.forEach((bp, index) => {
    const leg = bp.weldLeg || 8;
    const throat = Number((0.707 * leg).toFixed(1));
    const cap = Math.round(0.707 * leg * 0.6 * 430); // ~1224 kN/m for leg 8
    symbols.push({
      id: `WELD-BP-${index + 1}`,
      jointName: `لحام قاعدة العمود (${bp.columnMemberId})`,
      jointNameAr: `لحام محيطي كامل لقاعدة العمود مع الصفيحة الأساسية`,
      connectedEntities: `العمود ${bp.columnMemberId} مع صفيحة القاعدة ${bp.plateWidth}×${bp.plateLength}×${bp.plateThickness} مم`,
      connectionCategory: 'BASE_PLATE',
      linkedConnectionId: bp.id,
      weldType: 'FILLET',
      weldLegMm: leg,
      effectiveThroatMm: throat,
      weldLocation: 'BOTH_SIDES',
      allAround: true,
      fieldWeld: false,
      weldContour: 'FLAT_FLUSH',
      weldLengthMm: (bp.plateWidth + bp.plateLength) * 2,
      process: 'GMAW_MIG',
      electrode: 'AWS A5.18 ER70S-6',
      ndtMethod: 'VT',
      ndtCoverage: '100% VT + 10% UT Sample',
      qualifiedWpsNo: 'WPS-MWEC-BP-01',
      designCapacityKnPerM: cap,
    });
  });

  // 2. Moment End Plate welds (Flange tension/compression and Web shear)
  project.momentEndPlates.forEach((mep, index) => {
    const fLeg = mep.weldFlangeLeg || 8;
    const fThroat = Number((0.707 * fLeg).toFixed(1));
    const fCap = Math.round(0.707 * fLeg * 0.6 * 430);
    // Flange weld
    symbols.push({
      id: `WELD-MEP-FLG-${index + 1}`,
      jointName: `لحام شفة الرافتر (${mep.rafterMemberId}) مع لوح النهاية`,
      jointNameAr: `لحام زاوي مزدوج للشفة المشدودة/المضغوطة لرافتر الإطار`,
      connectedEntities: `شفة الرافتر ${mep.rafterMemberId} مع لوح النهاية ${mep.width}×${mep.height}×${mep.thickness} مم`,
      connectionCategory: 'MOMENT_END_PLATE',
      linkedConnectionId: mep.id,
      weldType: 'FILLET',
      weldLegMm: fLeg,
      effectiveThroatMm: fThroat,
      weldLocation: 'BOTH_SIDES',
      allAround: false,
      fieldWeld: false,
      weldContour: 'FLAT_FLUSH',
      process: 'GMAW_MIG',
      electrode: 'AWS A5.18 ER70S-6',
      ndtMethod: 'UT',
      ndtCoverage: '100% UT Full Penetration / Throat',
      qualifiedWpsNo: 'WPS-MWEC-MEP-FLANGE',
      designCapacityKnPerM: fCap,
    });

    // Web weld
    const wLeg = mep.weldWebLeg || 6;
    const wThroat = Number((0.707 * wLeg).toFixed(1));
    const wCap = Math.round(0.707 * wLeg * 0.6 * 430);
    symbols.push({
      id: `WELD-MEP-WEB-${index + 1}`,
      jointName: `لحام جسد الرافتر (${mep.rafterMemberId}) مع لوح النهاية`,
      jointNameAr: `لحام قوى القص لجسد الكمرة مع لوح النهاية`,
      connectedEntities: `جسد الرافتر ${mep.rafterMemberId} مع لوح النهاية`,
      connectionCategory: 'MOMENT_END_PLATE',
      linkedConnectionId: mep.id,
      weldType: 'FILLET',
      weldLegMm: wLeg,
      effectiveThroatMm: wThroat,
      weldLocation: 'BOTH_SIDES',
      allAround: false,
      fieldWeld: false,
      weldContour: 'FLAT_FLUSH',
      process: 'GMAW_MIG',
      electrode: 'AWS A5.18 ER70S-6',
      ndtMethod: 'VT',
      ndtCoverage: '100% VT Visual Inspection',
      qualifiedWpsNo: 'WPS-MWEC-MEP-WEB',
      designCapacityKnPerM: wCap,
    });
  });

  // 3. Continuity Stiffeners in Column Eaves
  symbols.push({
    id: 'WELD-STIFF-01',
    jointName: 'لحام ألواح التقوية الداخلية للعمود (Column Continuity Stiffener)',
    jointNameAr: 'لحام ألواح التقوية المقابلة لشفة رافتر الإطار',
    connectedEntities: 'لوحي التقوية t=10 مم مع جسد وشفة العمود الداخلي',
    connectionCategory: 'STIFFENER',
    linkedConnectionId: 'STIFF_COL_01',
    weldType: 'FILLET',
    weldLegMm: 6,
    effectiveThroatMm: 4.2,
    weldLocation: 'BOTH_SIDES',
    allAround: false,
    fieldWeld: false,
    weldContour: 'FLAT_FLUSH',
    process: 'GMAW_MIG',
    electrode: 'AWS A5.18 ER70S-6',
    ndtMethod: 'VT',
    ndtCoverage: '100% VT',
    qualifiedWpsNo: 'WPS-MWEC-STIFF-01',
    designCapacityKnPerM: 918,
  });

  // 4. Roof & Wall Bracing Gusset Plate Welds
  symbols.push({
    id: 'WELD-GUSS-01',
    jointName: 'لحام صفيحة عقدة الشكالات (Bracing Gusset Plate to Column)',
    jointNameAr: 'لحام لوحة العقدة لتثبيت شكالات الرياح مع العمود',
    connectedEntities: 'صفيحة العقدة Gusset t=8 مم مع شفة العمود الخارجي',
    connectionCategory: 'BRACING_GUSSET',
    linkedConnectionId: 'GUSS_BRC_01',
    weldType: 'FILLET',
    weldLegMm: 6,
    effectiveThroatMm: 4.2,
    weldLocation: 'BOTH_SIDES',
    allAround: true,
    fieldWeld: false,
    weldContour: 'FLAT_FLUSH',
    process: 'GMAW_MIG',
    electrode: 'AWS A5.18 ER70S-6',
    ndtMethod: 'VT',
    ndtCoverage: '100% VT',
    qualifiedWpsNo: 'WPS-MWEC-GUSS-01',
    designCapacityKnPerM: 918,
  });

  return symbols;
}
