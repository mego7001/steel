import {
  AssemblyDefinition,
  LinearCutPlan,
  NestingSheetResult,
  PartDefinition,
  ProjectData,
  SteelGrade,
} from '../types/engineering';
import { getProfileById, STEEL_MATERIALS } from './catalogService';

export function calculateBendAllowance(
  thicknessMm: number,
  insideRadiusMm: number,
  angleDeg: number,
  kFactor: number = 0.44
): {
  bendAllowanceMm: number;
  bendDeductionMm: number;
  setbackMm: number;
} {
  const angleRad = (angleDeg * Math.PI) / 180;
  const setbackMm = (insideRadiusMm + thicknessMm) * Math.tan(angleRad / 2);
  const bendAllowanceMm = angleRad * (insideRadiusMm + kFactor * thicknessMm);
  const bendDeductionMm = 2 * setbackMm - bendAllowanceMm;

  return {
    bendAllowanceMm: Number(bendAllowanceMm.toFixed(2)),
    bendDeductionMm: Number(bendDeductionMm.toFixed(2)),
    setbackMm: Number(setbackMm.toFixed(2)),
  };
}

export function generateShopBom(project: ProjectData): {
  assemblies: AssemblyDefinition[];
  parts: PartDefinition[];
} {
  const { members, basePlates, momentEndPlates, steelGradeDefault } = project;
  const assemblies: AssemblyDefinition[] = [];
  const parts: PartDefinition[] = [];

  let partCounter = 1;

  members.forEach(member => {
    const section = getProfileById(member.sectionId);
    const weightPerM = section ? section.weightKgM : 25;
    
    // Member physical length
    const startNode = project.nodes.find(n => n.id === member.startNodeId);
    const endNode = project.nodes.find(n => n.id === member.endNodeId);
    const lengthM = (startNode && endNode) ? Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y, endNode.z - startNode.z) : 3.0;
    const lengthMm = Math.round(lengthM * 1000);

    const shaftNetWeightKg = Number((lengthM * weightPerM).toFixed(1));
    const shaftGrossWeightKg = Number((shaftNetWeightKg * 1.05).toFixed(1));

    // 1. Primary Member Shaft Part
    const shaftPart: PartDefinition = {
      id: `P_${partCounter++}`,
      mark: `P-${member.mark}-01`,
      assemblyMark: member.assemblyMark,
      description: `قطاع رئيسي ${section ? section.name : 'SHS'} بطول ${lengthMm} مم`,
      material: member.materialGrade,
      thickness: section ? section.tw : 6,
      lengthMm,
      widthMm: section ? section.h : 150,
      netWeightKg: shaftNetWeightKg,
      grossWeightKg: shaftGrossWeightKg,
      operations: ['saw_cut', 'cnc_drill', 'primer_paint'],
      holesCount: member.type === 'column' || member.type === 'rafter' ? 8 : 4,
      holesDiameterMm: 22,
    };
    parts.push(shaftPart);

    const assemblyParts: PartDefinition[] = [shaftPart];
    let weldsLength = 0.5;

    // 2. If column, add Base Plate and Cap Plate
    if (member.type === 'column') {
      const bp = basePlates.find(b => b.columnMemberId === member.id) || basePlates[0];
      const bpThickness = bp ? bp.plateThickness : 20;
      const bpLength = bp ? bp.plateLength : 350;
      const bpWidth = bp ? bp.plateWidth : 350;
      
      // Volume in m3: (L * W * T) in mm / 1e9 * 7850 kg/m3
      const bpWeight = Number(((bpLength * bpWidth * bpThickness * 7850) / 1e9).toFixed(1));

      const bpPart: PartDefinition = {
        id: `P_${partCounter++}`,
        mark: `P-${member.mark}-BP`,
        assemblyMark: member.assemblyMark,
        description: `لوح قاعدة Base Plate ${bpLength}×${bpWidth}×${bpThickness} مم`,
        material: member.materialGrade,
        thickness: bpThickness,
        lengthMm: bpLength,
        widthMm: bpWidth,
        netWeightKg: bpWeight,
        grossWeightKg: Number((bpWeight * 1.08).toFixed(1)),
        operations: ['laser_profile', 'cnc_drill', 'weld_assembly'],
        holesCount: 4,
        holesDiameterMm: 28,
      };
      parts.push(bpPart);
      assemblyParts.push(bpPart);
      weldsLength += 1.2; // 1.2m of fillet weld around column base
    }

    // 3. If rafter, add End Plate and Stiffeners
    if (member.type === 'rafter') {
      const ep = momentEndPlates.find(e => e.rafterMemberId === member.id) || momentEndPlates[0];
      const epThickness = ep ? ep.thickness : 18;
      const epHeight = ep ? ep.height : 360;
      const epWidth = ep ? ep.width : 200;
      const epWeight = Number(((epHeight * epWidth * epThickness * 7850) / 1e9).toFixed(1));

      const epPart: PartDefinition = {
        id: `P_${partCounter++}`,
        mark: `P-${member.mark}-EP`,
        assemblyMark: member.assemblyMark,
        description: `لوح طرفي End Plate ${epHeight}×${epWidth}×${epThickness} مم`,
        material: member.materialGrade,
        thickness: epThickness,
        lengthMm: epHeight,
        widthMm: epWidth,
        netWeightKg: epWeight,
        grossWeightKg: Number((epWeight * 1.08).toFixed(1)),
        operations: ['laser_profile', 'cnc_drill', 'weld_assembly'],
        holesCount: 8,
        holesDiameterMm: 22,
      };
      parts.push(epPart);
      assemblyParts.push(epPart);
      weldsLength += 0.9;
    }

    const assemblyTotalWeight = assemblyParts.reduce((acc, p) => acc + p.netWeightKg, 0);

    assemblies.push({
      id: `AS_${member.id}`,
      mark: member.assemblyMark,
      description: `تجميعة ${member.type === 'column' ? 'عمود' : member.type === 'rafter' ? 'رافتر سقف' : 'عضو إنشائي'} ${member.mark}`,
      memberType: member.type,
      quantity: 1,
      totalWeightKg: Number(assemblyTotalWeight.toFixed(1)),
      finish: 'Sa 2.5 + Primer Epoxy 80µm',
      parts: assemblyParts,
      weldsLengthMeters: Number(weldsLength.toFixed(2)),
    });
  });

  return { assemblies, parts };
}

/**
 * 2D Rectangular Nesting Simulator on standard 1500x3000mm steel sheet
 */
export function nestPlatesOnSheets(parts: PartDefinition[]): NestingSheetResult[] {
  const sheetWidthMm = 1500;
  const sheetLengthMm = 3000;
  const sheetMargin = 15;
  const kerf = 5;

  // Filter plate parts (base plates, end plates, stiffeners)
  const plateParts = parts.filter(p => p.operations.includes('laser_profile'));

  // Group by thickness and material
  const groups: Record<string, PartDefinition[]> = {};
  plateParts.forEach(p => {
    const key = `${p.material}_${p.thickness}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const results: NestingSheetResult[] = [];

  Object.entries(groups).forEach(([key, groupParts], groupIdx) => {
    const [material, thickStr] = key.split('_');
    const thickness = parseFloat(thickStr);

    let curX = sheetMargin;
    let curY = sheetMargin;
    let rowMaxHeight = 0;
    let sheetIdx = 1;
    let currentPlaced: Array<{
      partMark: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotated: boolean;
    }> = [];

    groupParts.forEach(part => {
      const pW = part.widthMm + kerf;
      const pH = part.lengthMm + kerf;

      // Check if fits in current row
      if (curX + pW > sheetWidthMm - sheetMargin) {
        // Move to next row
        curX = sheetMargin;
        curY += rowMaxHeight + kerf;
        rowMaxHeight = 0;
      }

      // Check if exceeds sheet length
      if (curY + pH > sheetLengthMm - sheetMargin) {
        // Sheet full, record and start new sheet
        const sheetArea = sheetWidthMm * sheetLengthMm;
        const usedArea = currentPlaced.reduce((a, p) => a + p.width * p.height, 0);
        const util = Math.min(95, Number(((usedArea / sheetArea) * 100).toFixed(1)));
        const sheetWeight = (sheetArea * thickness * 7850) / 1e9;

        results.push({
          sheetId: `SHT_${groupIdx + 1}_${sheetIdx++}`,
          sheetWidthMm,
          sheetLengthMm,
          thicknessMm: thickness,
          material: material as SteelGrade,
          partsPlaced: [...currentPlaced],
          utilizationPercent: util,
          scrapPercent: Number((100 - util).toFixed(1)),
          totalWeightKg: Number(sheetWeight.toFixed(1)),
        });

        currentPlaced = [];
        curX = sheetMargin;
        curY = sheetMargin;
        rowMaxHeight = 0;
      }

      currentPlaced.push({
        partMark: part.mark,
        x: curX,
        y: curY,
        width: part.widthMm,
        height: part.lengthMm,
        rotated: false,
      });

      curX += pW;
      if (pH > rowMaxHeight) {
        rowMaxHeight = pH;
      }
    });

    if (currentPlaced.length > 0) {
      const sheetArea = sheetWidthMm * sheetLengthMm;
      const usedArea = currentPlaced.reduce((a, p) => a + p.width * p.height, 0);
      const util = Math.min(95, Number(((usedArea / sheetArea) * 100).toFixed(1)));
      const sheetWeight = (sheetArea * thickness * 7850) / 1e9;

      results.push({
        sheetId: `SHT_${groupIdx + 1}_${sheetIdx}`,
        sheetWidthMm,
        sheetLengthMm,
        thicknessMm: thickness,
        material: material as SteelGrade,
        partsPlaced: currentPlaced,
        utilizationPercent: util,
        scrapPercent: Number((100 - util).toFixed(1)),
        totalWeightKg: Number(sheetWeight.toFixed(1)),
      });
    }
  });

  return results;
}

/**
 * 1D Linear Cutting Optimizer for Steel Profile Bars (12m standard stock)
 */
export function optimizeLinearCutting(parts: PartDefinition[]): LinearCutPlan[] {
  const stockLengthMm = 12000;
  const kerfMm = 3;

  // Filter linear members cut on band saw
  const linearParts = parts.filter(p => p.operations.includes('saw_cut'));

  // Sort descending by length (Best-Fit Decreasing)
  const sorted = [...linearParts].sort((a, b) => b.lengthMm - a.lengthMm);

  const bars: Array<{
    barIndex: number;
    parts: Array<{ partMark: string; lengthMm: number }>;
    remainingLengthMm: number;
  }> = [];

  sorted.forEach(part => {
    // Find first bar that fits
    let placed = false;
    for (const bar of bars) {
      if (bar.remainingLengthMm >= part.lengthMm + kerfMm) {
        bar.parts.push({ partMark: part.mark, lengthMm: part.lengthMm });
        bar.remainingLengthMm -= (part.lengthMm + kerfMm);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Open new bar
      bars.push({
        barIndex: bars.length + 1,
        parts: [{ partMark: part.mark, lengthMm: part.lengthMm }],
        remainingLengthMm: stockLengthMm - (part.lengthMm + kerfMm),
      });
    }
  });

  const cuts = bars.map(b => {
    const usedLength = stockLengthMm - b.remainingLengthMm;
    const util = Number(((usedLength / stockLengthMm) * 100).toFixed(1));
    return {
      barIndex: b.barIndex,
      parts: b.parts,
      wasteLengthMm: b.remainingLengthMm,
      utilizationPercent: util,
    };
  });

  const totalUsed = cuts.reduce((acc, c) => acc + (stockLengthMm - c.wasteLengthMm), 0);
  const totalStock = cuts.length * stockLengthMm;
  const totalWaste = totalStock > 0 ? Number((((totalStock - totalUsed) / totalStock) * 100).toFixed(1)) : 0;

  return [{
    stockLengthMm,
    sectionName: 'IPE / HEA / SHS Mixed Stocks',
    barsRequired: cuts.length,
    cuts,
    totalWastePercent: totalWaste,
  }];
}
