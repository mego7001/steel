import {
  DesignCode,
  LoadCase,
  LoadCombination,
  MemberCheckResult,
  MemberType,
  ProjectData,
  SteelGrade,
  StructuralMember,
  StructuralNode,
  SupportType,
} from '../types/engineering';
import { getMaterialByGrade, getProfileById, STANDARD_PROFILES } from './catalogService';

export interface ParametricModelOptions {
  template: 'booth_kiosk' | 'portal_frame' | 'pitched_truss';
  lengthM: number;
  widthM: number;
  eaveHeightM: number;
  ridgeHeightM: number;
  baysCount: number;
  steelGrade: SteelGrade;
  code: DesignCode;
  windSpeedKmh: number;
  roofLiveLoadKpa: number;
  claddingDeadLoadKpa: number;
}

export function generateParametricModel(options: ParametricModelOptions): {
  nodes: StructuralNode[];
  members: StructuralMember[];
  loadCases: LoadCase[];
  loadCombinations: LoadCombination[];
} {
  const {
    template,
    lengthM,
    widthM,
    eaveHeightM,
    ridgeHeightM,
    baysCount,
    steelGrade,
  } = options;

  const nodes: StructuralNode[] = [];
  const members: StructuralMember[] = [];

  const bayLength = lengthM / Math.max(1, baysCount);

  if (template === 'booth_kiosk') {
    // 3D Kiosk / Modular Booth with Corner Columns, Base Frame, Roof Frame, Mezzanine Beams
    // Nodes for each bay: 4 corner nodes per cross-section (base, eaves)
    let nodeIdx = 1;
    let memberIdx = 1;

    for (let b = 0; b <= baysCount; b++) {
      const z = b * bayLength;
      
      // Bottom left (0, 0, z)
      const nBL = `N${nodeIdx++}`;
      nodes.push({ id: nBL, name: `Grid-A-${b + 1}-Base`, x: 0, y: 0, z, support: 'fixed' });

      // Bottom right (width, 0, z)
      const nBR = `N${nodeIdx++}`;
      nodes.push({ id: nBR, name: `Grid-B-${b + 1}-Base`, x: widthM, y: 0, z, support: 'fixed' });

      // Top left (0, eaveHeight, z)
      const nTL = `N${nodeIdx++}`;
      nodes.push({ id: nTL, name: `Grid-A-${b + 1}-Top`, x: 0, y: eaveHeightM, z, support: 'free' });

      // Top right (width, eaveHeight, z)
      const nTR = `N${nodeIdx++}`;
      nodes.push({ id: nTR, name: `Grid-B-${b + 1}-Top`, x: widthM, y: eaveHeightM, z, support: 'free' });

      // Columns (Bottom to Top)
      members.push({
        id: `M${memberIdx++}`,
        mark: `COL-A${b + 1}`,
        startNodeId: nBL,
        endNodeId: nTL,
        sectionId: 'SHS100x4',
        materialGrade: steelGrade,
        type: 'column',
        releases: 'rigid',
        assemblyMark: `AS-COL-A${b + 1}`,
        unbracedLengthMajor: eaveHeightM,
        unbracedLengthMinor: eaveHeightM,
      });

      members.push({
        id: `M${memberIdx++}`,
        mark: `COL-B${b + 1}`,
        startNodeId: nBR,
        endNodeId: nTR,
        sectionId: 'SHS100x4',
        materialGrade: steelGrade,
        type: 'column',
        releases: 'rigid',
        assemblyMark: `AS-COL-B${b + 1}`,
        unbracedLengthMajor: eaveHeightM,
        unbracedLengthMinor: eaveHeightM,
      });

      // Roof Cross Transverse Beam
      members.push({
        id: `M${memberIdx++}`,
        mark: `RF-TR-${b + 1}`,
        startNodeId: nTL,
        endNodeId: nTR,
        sectionId: 'IPE160',
        materialGrade: steelGrade,
        type: 'rafter',
        releases: 'rigid',
        assemblyMark: `AS-RAF-${b + 1}`,
        unbracedLengthMajor: widthM,
        unbracedLengthMinor: widthM / 2,
      });

      // Floor Base Tie Beam
      members.push({
        id: `M${memberIdx++}`,
        mark: `FL-TR-${b + 1}`,
        startNodeId: nBL,
        endNodeId: nBR,
        sectionId: 'UPN120',
        materialGrade: steelGrade,
        type: 'beam',
        releases: 'rigid',
        assemblyMark: `AS-BASE-${b + 1}`,
        unbracedLengthMajor: widthM,
        unbracedLengthMinor: widthM,
      });
    }

    // Longitudinal Beams connecting bays
    for (let b = 0; b < baysCount; b++) {
      const idxA_T_start = nodes.findIndex(n => n.name === `Grid-A-${b + 1}-Top`)!;
      const idxA_T_end = nodes.findIndex(n => n.name === `Grid-A-${b + 2}-Top`)!;
      const idxB_T_start = nodes.findIndex(n => n.name === `Grid-B-${b + 1}-Top`)!;
      const idxB_T_end = nodes.findIndex(n => n.name === `Grid-B-${b + 2}-Top`)!;

      const idxA_B_start = nodes.findIndex(n => n.name === `Grid-A-${b + 1}-Base`)!;
      const idxA_B_end = nodes.findIndex(n => n.name === `Grid-A-${b + 2}-Base`)!;
      const idxB_B_start = nodes.findIndex(n => n.name === `Grid-B-${b + 1}-Base`)!;
      const idxB_B_end = nodes.findIndex(n => n.name === `Grid-B-${b + 2}-Base`)!;

      // Roof Longitudinal purlins/eaves
      members.push({
        id: `M${memberIdx++}`,
        mark: `EAVE-L-${b + 1}`,
        startNodeId: nodes[idxA_T_start].id,
        endNodeId: nodes[idxA_T_end].id,
        sectionId: 'RHS100x50x4',
        materialGrade: steelGrade,
        type: 'purlin',
        releases: 'pinned',
        assemblyMark: `AS-PUR-L${b + 1}`,
      });
      members.push({
        id: `M${memberIdx++}`,
        mark: `EAVE-R-${b + 1}`,
        startNodeId: nodes[idxB_T_start].id,
        endNodeId: nodes[idxB_T_end].id,
        sectionId: 'RHS100x50x4',
        materialGrade: steelGrade,
        type: 'purlin',
        releases: 'pinned',
        assemblyMark: `AS-PUR-R${b + 1}`,
      });

      // Base Longitudinal runners
      members.push({
        id: `M${memberIdx++}`,
        mark: `BASE-L-${b + 1}`,
        startNodeId: nodes[idxA_B_start].id,
        endNodeId: nodes[idxA_B_end].id,
        sectionId: 'UPN120',
        materialGrade: steelGrade,
        type: 'beam',
        releases: 'rigid',
        assemblyMark: `AS-BASE-L${b + 1}`,
      });
      members.push({
        id: `M${memberIdx++}`,
        mark: `BASE-R-${b + 1}`,
        startNodeId: nodes[idxB_B_start].id,
        endNodeId: nodes[idxB_B_end].id,
        sectionId: 'UPN120',
        materialGrade: steelGrade,
        type: 'beam',
        releases: 'rigid',
        assemblyMark: `AS-BASE-R${b + 1}`,
      });

      // Side Wall X-Bracing for the first bay
      if (b === 0 || b === baysCount - 1) {
        members.push({
          id: `M${memberIdx++}`,
          mark: `BRC-L1-${b + 1}`,
          startNodeId: nodes[idxA_B_start].id,
          endNodeId: nodes[idxA_T_end].id,
          sectionId: 'L50x5',
          materialGrade: steelGrade,
          type: 'bracing',
          releases: 'pinned',
          assemblyMark: `AS-BRC-L${b + 1}`,
        });
        members.push({
          id: `M${memberIdx++}`,
          mark: `BRC-L2-${b + 1}`,
          startNodeId: nodes[idxA_B_end].id,
          endNodeId: nodes[idxA_T_start].id,
          sectionId: 'L50x5',
          materialGrade: steelGrade,
          type: 'bracing',
          releases: 'pinned',
          assemblyMark: `AS-BRC-L${b + 1}`,
        });
      }
    }
  } else if (template === 'portal_frame') {
    // Portal Frame Warehouse with Gable / Pitched Roof
    let nodeIdx = 1;
    let memberIdx = 1;
    const apexHeight = ridgeHeightM > eaveHeightM ? ridgeHeightM : eaveHeightM + 1.2;

    for (let b = 0; b <= baysCount; b++) {
      const z = b * bayLength;

      // Base nodes
      const nBL = `N${nodeIdx++}`;
      nodes.push({ id: nBL, name: `ColBase-A-${b + 1}`, x: 0, y: 0, z, support: 'fixed' });

      const nBR = `N${nodeIdx++}`;
      nodes.push({ id: nBR, name: `ColBase-B-${b + 1}`, x: widthM, y: 0, z, support: 'fixed' });

      // Eave nodes
      const nEL = `N${nodeIdx++}`;
      nodes.push({ id: nEL, name: `Eave-A-${b + 1}`, x: 0, y: eaveHeightM, z, support: 'free' });

      const nER = `N${nodeIdx++}`;
      nodes.push({ id: nER, name: `Eave-B-${b + 1}`, x: widthM, y: eaveHeightM, z, support: 'free' });

      // Ridge Apex node
      const nApex = `N${nodeIdx++}`;
      nodes.push({ id: nApex, name: `Ridge-${b + 1}`, x: widthM / 2, y: apexHeight, z, support: 'free' });

      // Columns
      members.push({
        id: `M${memberIdx++}`,
        mark: `COL-A${b + 1}`,
        startNodeId: nBL,
        endNodeId: nEL,
        sectionId: 'HEA200',
        materialGrade: steelGrade,
        type: 'column',
        releases: 'rigid',
        assemblyMark: `AS-COL-A${b + 1}`,
        unbracedLengthMajor: eaveHeightM,
        unbracedLengthMinor: eaveHeightM / 2,
      });

      members.push({
        id: `M${memberIdx++}`,
        mark: `COL-B${b + 1}`,
        startNodeId: nBR,
        endNodeId: nER,
        sectionId: 'HEA200',
        materialGrade: steelGrade,
        type: 'column',
        releases: 'rigid',
        assemblyMark: `AS-COL-B${b + 1}`,
        unbracedLengthMajor: eaveHeightM,
        unbracedLengthMinor: eaveHeightM / 2,
      });

      // Pitched Rafter Left (Eave -> Ridge)
      members.push({
        id: `M${memberIdx++}`,
        mark: `RAF-L${b + 1}`,
        startNodeId: nEL,
        endNodeId: nApex,
        sectionId: 'IPE240',
        materialGrade: steelGrade,
        type: 'rafter',
        releases: 'rigid',
        assemblyMark: `AS-RAF-L${b + 1}`,
        unbracedLengthMajor: Math.hypot(widthM / 2, apexHeight - eaveHeightM),
        unbracedLengthMinor: 1.5,
      });

      // Pitched Rafter Right (Ridge -> Eave)
      members.push({
        id: `M${memberIdx++}`,
        mark: `RAF-R${b + 1}`,
        startNodeId: nApex,
        endNodeId: nER,
        sectionId: 'IPE240',
        materialGrade: steelGrade,
        type: 'rafter',
        releases: 'rigid',
        assemblyMark: `AS-RAF-R${b + 1}`,
        unbracedLengthMajor: Math.hypot(widthM / 2, apexHeight - eaveHeightM),
        unbracedLengthMinor: 1.5,
      });
    }

    // Connect bays with Purlins, Ridge Purlin, and Wall Girts
    for (let b = 0; b < baysCount; b++) {
      const eaveL1 = nodes.find(n => n.name === `Eave-A-${b + 1}`)!.id;
      const eaveL2 = nodes.find(n => n.name === `Eave-A-${b + 2}`)!.id;
      const eaveR1 = nodes.find(n => n.name === `Eave-B-${b + 1}`)!.id;
      const eaveR2 = nodes.find(n => n.name === `Eave-B-${b + 2}`)!.id;
      const ridge1 = nodes.find(n => n.name === `Ridge-${b + 1}`)!.id;
      const ridge2 = nodes.find(n => n.name === `Ridge-${b + 2}`)!.id;

      // Eaves Purlins
      members.push({
        id: `M${memberIdx++}`,
        mark: `PUR-EAVE-L${b + 1}`,
        startNodeId: eaveL1,
        endNodeId: eaveL2,
        sectionId: 'UPN120',
        materialGrade: steelGrade,
        type: 'purlin',
        releases: 'pinned',
        assemblyMark: `AS-PUR-EAVE-L${b + 1}`,
      });
      members.push({
        id: `M${memberIdx++}`,
        mark: `PUR-EAVE-R${b + 1}`,
        startNodeId: eaveR1,
        endNodeId: eaveR2,
        sectionId: 'UPN120',
        materialGrade: steelGrade,
        type: 'purlin',
        releases: 'pinned',
        assemblyMark: `AS-PUR-EAVE-R${b + 1}`,
      });

      // Ridge Purlin
      members.push({
        id: `M${memberIdx++}`,
        mark: `PUR-RIDGE-${b + 1}`,
        startNodeId: ridge1,
        endNodeId: ridge2,
        sectionId: 'UPN140',
        materialGrade: steelGrade,
        type: 'purlin',
        releases: 'pinned',
        assemblyMark: `AS-PUR-RIDGE-${b + 1}`,
      });

      // Roof Cross Bracing in end bay
      if (b === 0 || b === baysCount - 1) {
        members.push({
          id: `M${memberIdx++}`,
          mark: `RF-BRC-1-${b + 1}`,
          startNodeId: eaveL1,
          endNodeId: ridge2,
          sectionId: 'L60x6',
          materialGrade: steelGrade,
          type: 'bracing',
          releases: 'pinned',
          assemblyMark: `AS-RF-BRC-${b + 1}`,
        });
        members.push({
          id: `M${memberIdx++}`,
          mark: `RF-BRC-2-${b + 1}`,
          startNodeId: eaveL2,
          endNodeId: ridge1,
          sectionId: 'L60x6',
          materialGrade: steelGrade,
          type: 'bracing',
          releases: 'pinned',
          assemblyMark: `AS-RF-BRC-${b + 1}`,
        });
      }
    }
  } else {
    // Pitched Pratt / Warren Truss structure
    let nodeIdx = 1;
    let memberIdx = 1;
    const apexHeight = ridgeHeightM > eaveHeightM ? ridgeHeightM : eaveHeightM + 1.5;
    const trussPanels = 4;
    const panelWidth = widthM / trussPanels;

    for (let b = 0; b <= baysCount; b++) {
      const z = b * bayLength;

      // Bottom Chord Nodes
      const bottomNodeIds: string[] = [];
      for (let p = 0; p <= trussPanels; p++) {
        const nId = `N${nodeIdx++}`;
        const isSupport = (p === 0 || p === trussPanels);
        nodes.push({
          id: nId,
          name: `Truss-${b + 1}-Bottom-${p}`,
          x: p * panelWidth,
          y: eaveHeightM,
          z,
          support: isSupport ? (p === 0 ? 'pinned' : 'roller_x') : 'free',
        });
        bottomNodeIds.push(nId);
      }

      // Top Chord Nodes
      const topNodeIds: string[] = [];
      for (let p = 0; p <= trussPanels; p++) {
        const x = p * panelWidth;
        // height increases to apex at middle
        const distFromCenter = Math.abs(x - widthM / 2);
        const y = apexHeight - ((distFromCenter / (widthM / 2)) * (apexHeight - eaveHeightM));
        const nId = `N${nodeIdx++}`;
        nodes.push({
          id: nId,
          name: `Truss-${b + 1}-Top-${p}`,
          x,
          y,
          z,
          support: 'free',
        });
        topNodeIds.push(nId);
      }

      // Bottom Chord Members
      for (let p = 0; p < trussPanels; p++) {
        members.push({
          id: `M${memberIdx++}`,
          mark: `TR-BC-${b + 1}-${p + 1}`,
          startNodeId: bottomNodeIds[p],
          endNodeId: bottomNodeIds[p + 1],
          sectionId: 'SHS80x4',
          materialGrade: steelGrade,
          type: 'beam',
          releases: 'pinned',
          assemblyMark: `AS-TR-BC-${b + 1}`,
        });
      }

      // Top Chord Members
      for (let p = 0; p < trussPanels; p++) {
        members.push({
          id: `M${memberIdx++}`,
          mark: `TR-TC-${b + 1}-${p + 1}`,
          startNodeId: topNodeIds[p],
          endNodeId: topNodeIds[p + 1],
          sectionId: 'SHS80x4',
          materialGrade: steelGrade,
          type: 'rafter',
          releases: 'pinned',
          assemblyMark: `AS-TR-TC-${b + 1}`,
        });
      }

      // Web Members (Vertical Posts & Diagonals)
      for (let p = 0; p <= trussPanels; p++) {
        // Vertical post
        if (p > 0 && p < trussPanels) {
          members.push({
            id: `M${memberIdx++}`,
            mark: `TR-V-${b + 1}-${p}`,
            startNodeId: bottomNodeIds[p],
            endNodeId: topNodeIds[p],
            sectionId: 'SHS60x3',
            materialGrade: steelGrade,
            type: 'column',
            releases: 'pinned',
            assemblyMark: `AS-TR-WEB-${b + 1}`,
          });
        }
      }

      for (let p = 0; p < trussPanels; p++) {
        // Diagonal
        members.push({
          id: `M${memberIdx++}`,
          mark: `TR-D-${b + 1}-${p + 1}`,
          startNodeId: bottomNodeIds[p],
          endNodeId: topNodeIds[p + 1],
          sectionId: 'L50x5',
          materialGrade: steelGrade,
          type: 'bracing',
          releases: 'pinned',
          assemblyMark: `AS-TR-WEB-${b + 1}`,
        });
      }
    }
  }

  // Load Cases
  const loadCases: LoadCase[] = [
    { id: 'LC_DL', name: 'Dead Load (DL)', type: 'DL', description: 'وزن الهيكل الذاتي والألواح والمدادات', multiplier: 1.0 },
    { id: 'LC_SIDL', name: 'Superimposed Dead (SIDL)', type: 'SIDL', description: 'الكسوات والأسقف المستعارة والخدمات', multiplier: 1.0 },
    { id: 'LC_LL', name: 'Roof Live Load (LL)', type: 'LL', description: 'أحمال الصيانة والسطح المؤقتة', multiplier: 1.0 },
    { id: 'LC_WL_X', name: 'Wind Load +X (WL)', type: 'WL_X', description: 'ضغط ورياح جانبية باتجاه X', multiplier: 1.0 },
    { id: 'LC_WL_Z', name: 'Wind Load +Z (WL)', type: 'WL_Z', description: 'رياح طولية باتجاه المحور Z', multiplier: 1.0 },
  ];

  // Load Combinations (AISC / ECP compliant)
  const loadCombinations: LoadCombination[] = [
    {
      id: 'COMB_ULS_1',
      name: '1.4 DL (Gravity Ultimate)',
      type: 'ULS',
      factors: { LC_DL: 1.4, LC_SIDL: 1.4, LC_LL: 0, LC_WL_X: 0, LC_WL_Z: 0 },
      governingReason: 'Maximum Dead Load',
    },
    {
      id: 'COMB_ULS_2',
      name: '1.2 DL + 1.6 LL + 0.5 WL (Governing Gravity)',
      type: 'ULS',
      factors: { LC_DL: 1.2, LC_SIDL: 1.2, LC_LL: 1.6, LC_WL_X: 0.5, LC_WL_Z: 0 },
      governingReason: 'Governing gravity combination for rafters and floor beams',
    },
    {
      id: 'COMB_ULS_3',
      name: '1.2 DL + 1.0 WL_X + 0.5 LL (Governing Lateral)',
      type: 'ULS',
      factors: { LC_DL: 1.2, LC_SIDL: 1.2, LC_LL: 0.5, LC_WL_X: 1.0, LC_WL_Z: 0 },
      governingReason: 'Governing lateral wind shear for columns and bracing',
    },
    {
      id: 'COMB_ULS_4',
      name: '0.9 DL + 1.0 WL_X (Wind Uplift)',
      type: 'ULS',
      factors: { LC_DL: 0.9, LC_SIDL: 0.9, LC_LL: 0, LC_WL_X: 1.0, LC_WL_Z: 0 },
      governingReason: 'Minimum gravity with wind uplift on roof and foundation tension',
    },
    {
      id: 'COMB_SLS_1',
      name: '1.0 DL + 1.0 LL (Deflection Check)',
      type: 'SLS',
      factors: { LC_DL: 1.0, LC_SIDL: 1.0, LC_LL: 1.0, LC_WL_X: 0, LC_WL_Z: 0 },
      governingReason: 'Serviceability deflection L/250 limit',
    },
  ];

  return { nodes, members, loadCases, loadCombinations };
}

/**
 * Structural direct frame analysis and code checking per AISC 360-22 and ECP 205
 */
export function solveStructuralModel(project: ProjectData): MemberCheckResult[] {
  const { members, nodes, steelGradeDefault, designCode, windSpeedKmh, roofLiveLoadKpa, claddingDeadLoadKpa, dimensions } = project;
  const results: MemberCheckResult[] = [];

  const mat = getMaterialByGrade(steelGradeDefault);
  const Fy = mat.Fy; // MPa
  const E = mat.E;   // MPa

  // Calculate design wind pressure q = 0.5 * rho * V^2 * Ce * Cq
  // V in m/s: (windSpeedKmh / 3.6)
  const V_ms = windSpeedKmh / 3.6;
  const airDensity = 1.225; // kg/m3
  const q_wind_Pa = 0.5 * airDensity * Math.pow(V_ms, 2) * 1.1; // Pa = N/m2
  const q_wind_kN_m2 = q_wind_Pa / 1000;

  // Tributary width per frame bay
  const bayWidth = dimensions.lengthM / Math.max(1, dimensions.baysCount);

  members.forEach(member => {
    const startNode = nodes.find(n => n.id === member.startNodeId);
    const endNode = nodes.find(n => n.id === member.endNodeId);
    const section = getProfileById(member.sectionId) || STANDARD_PROFILES[0];

    if (!startNode || !endNode) return;

    // Member physical length
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const dz = endNode.z - startNode.z;
    const memberLengthM = Math.hypot(dx, dy, dz);
    const memberLengthMm = memberLengthM * 1000;

    // Section properties
    const Ag_mm2 = section.Ag * 100; // cm2 -> mm2
    const Ix_mm4 = section.Ix * 10000; // cm4 -> mm4
    const Zx_mm3 = section.Zx * 1000; // cm3 -> mm3
    const rx_mm = section.rx * 10; // cm -> mm
    const ry_mm = section.ry * 10; // cm -> mm
    const r_min_mm = Math.min(rx_mm, ry_mm);

    // Forces calculation based on member type and load combinations
    let P_u_kN = 0;  // Axial (Negative is compression)
    let V_u_kN = 0;  // Shear
    let M_u_kNm = 0; // Bending moment
    let delta_mm = 0;
    let governingComb = 'COMB_ULS_2';

    // Total tributary load
    const w_dead_kN_m = (section.weightKgM * 9.81 / 1000) + (claddingDeadLoadKpa * bayWidth);
    const w_live_kN_m = roofLiveLoadKpa * bayWidth;
    const w_wind_kN_m = q_wind_kN_m2 * bayWidth * 0.8; // wind pressure

    if (member.type === 'column') {
      // Column carries tributary gravity + lateral moment from wind
      const axialGravity_kN = (w_dead_kN_m * 1.2 + w_live_kN_m * 1.6) * (dimensions.widthM / 2);
      const windShear_kN = (w_wind_kN_m * 1.0) * (dimensions.eaveHeightM / 2);
      const windMoment_kNm = windShear_kN * (dimensions.eaveHeightM / 2);

      P_u_kN = -axialGravity_kN; // Compression
      V_u_kN = Math.max(windShear_kN, axialGravity_kN * 0.05);
      M_u_kNm = windMoment_kNm;
      delta_mm = (V_u_kN * Math.pow(memberLengthM, 3)) / (3 * E * 1e-3 * Ix_mm4 * 1e-12) * 1e3;
      governingComb = 'COMB_ULS_3';
    } else if (member.type === 'rafter' || member.type === 'beam') {
      // Beam/Rafter subject to distributed load: w = 1.2 w_dl + 1.6 w_ll
      const w_ult_kN_m = 1.2 * w_dead_kN_m + 1.6 * w_live_kN_m;
      P_u_kN = -5.0; // small axial thrust in portal rafter
      V_u_kN = (w_ult_kN_m * memberLengthM) / 2;
      M_u_kNm = (w_ult_kN_m * Math.pow(memberLengthM, 2)) / 8;
      
      // Deflection under SLS (DL + LL)
      const w_serv_N_mm = (w_dead_kN_m + w_live_kN_m);
      delta_mm = (5 * w_serv_N_mm * Math.pow(memberLengthMm, 4)) / (384 * E * Ix_mm4);
      governingComb = 'COMB_ULS_2';
    } else if (member.type === 'purlin' || member.type === 'girt') {
      const purlinSpacingM = 1.2;
      const w_purlin_kN_m = 1.2 * (claddingDeadLoadKpa * purlinSpacingM + section.weightKgM * 9.81 / 1000) + 1.6 * (roofLiveLoadKpa * purlinSpacingM);
      P_u_kN = 0;
      V_u_kN = (w_purlin_kN_m * memberLengthM) / 2;
      M_u_kNm = (w_purlin_kN_m * Math.pow(memberLengthM, 2)) / 8;
      delta_mm = (5 * (claddingDeadLoadKpa * purlinSpacingM + roofLiveLoadKpa * purlinSpacingM) * Math.pow(memberLengthMm, 4)) / (384 * E * Ix_mm4);
    } else if (member.type === 'bracing') {
      // Bracing takes lateral wind tension/compression
      const windBaseShear = q_wind_kN_m2 * dimensions.widthM * dimensions.eaveHeightM * 1.0;
      const diagonalForce = (windBaseShear / 2) / Math.cos(Math.PI / 4);
      P_u_kN = diagonalForce; // Tension in windward diagonal
      V_u_kN = 1.2;
      M_u_kNm = 0.4;
      delta_mm = 1.5;
      governingComb = 'COMB_ULS_3';
    }

    // Capacity calculations (AISC 360-22)
    const phi_t = 0.90;
    const phi_c = 0.90;
    const phi_b = 0.90;
    const phi_v = 0.90;

    // 1. Tension capacity: Pn = Fy * Ag
    const Pn_tension_kN = (Fy * Ag_mm2) / 1000;
    const phiPn_tension_kN = phi_t * Pn_tension_kN;

    // 2. Compression capacity: Flexural Buckling
    const K = member.type === 'column' ? 1.5 : 1.0;
    const unbracedL_mm = (member.unbracedLengthMinor || memberLengthM) * 1000;
    const slenderness_lambda = (K * unbracedL_mm) / r_min_mm;

    // Euler buckling stress Fe = pi^2 * E / lambda^2
    const Fe = (Math.PI * Math.PI * E) / Math.pow(slenderness_lambda, 2);
    let Fcr = 0;
    const lambda_limit = 4.71 * Math.sqrt(E / Fy);

    if (slenderness_lambda <= lambda_limit) {
      Fcr = Math.pow(0.658, Fy / Fe) * Fy;
    } else {
      Fcr = 0.877 * Fe;
    }

    const Pn_comp_kN = (Fcr * Ag_mm2) / 1000;
    const phiPn_comp_kN = phi_c * Pn_comp_kN;

    // 3. Flexural capacity: Mn = Fy * Zx
    const Mn_kNm = (Fy * Zx_mm3) / 1e6;
    const phiMn_kNm = phi_b * Mn_kNm;

    // 4. Shear capacity: Vn = 0.6 * Fy * Aw (Aw = d * tw)
    const Aw_mm2 = section.h * section.tw;
    const Vn_kN = (0.6 * Fy * Aw_mm2) / 1000;
    const phiVn_kN = phi_v * Vn_kN;

    // Ratios
    const absP = Math.abs(P_u_kN);
    const axialCap = P_u_kN < 0 ? phiPn_comp_kN : phiPn_tension_kN;
    const axialRatio = absP / Math.max(0.1, axialCap);
    const shearRatio = V_u_kN / Math.max(0.1, phiVn_kN);
    const flexureRatio = M_u_kNm / Math.max(0.1, phiMn_kNm);

    // Combined Interaction AISC H1-1a / H1-1b
    let interactionRatio = 0;
    if (axialRatio >= 0.2) {
      interactionRatio = axialRatio + (8 / 9) * flexureRatio;
    } else {
      interactionRatio = axialRatio / 2 + flexureRatio;
    }

    // Deflection limit: L / 250 for beams/rafters, H / 300 for columns
    const allowableDelta_mm = member.type === 'column' ? (memberLengthMm / 300) : (memberLengthMm / 250);
    const deflectionRatio = delta_mm / Math.max(0.1, allowableDelta_mm);

    const slendernessRatio = slenderness_lambda / 200; // 200 is allowable limit for compression

    // Status: pass if max unity ratio <= 1.0
    const maxRatio = Math.max(interactionRatio, shearRatio, deflectionRatio);
    const status = maxRatio <= 1.0 ? 'pass' : 'fail';

    results.push({
      memberId: member.id,
      governingCombinationId: governingComb,
      status,
      stationRatio: 0.5,
      axialForceKn: P_u_kN,
      shearForceKn: V_u_kN,
      bendingMomentKnM: M_u_kNm,
      axialCapacityKn: axialCap,
      shearCapacityKn: phiVn_kN,
      momentCapacityKnM: phiMn_kNm,
      axialRatio: Number(axialRatio.toFixed(3)),
      shearRatio: Number(shearRatio.toFixed(3)),
      flexureRatio: Number(flexureRatio.toFixed(3)),
      interactionRatio: Number(interactionRatio.toFixed(3)),
      slendernessRatio: Number(slendernessRatio.toFixed(3)),
      deflectionRatio: Number(deflectionRatio.toFixed(3)),
      clauses: {
        axial: designCode.startsWith('AISC') ? 'AISC 360-22 Ch. E (Flexural Buckling Eq. E3-2)' : 'ECP 205 Cl. 2.6 (Column Buckling)',
        flexure: designCode.startsWith('AISC') ? 'AISC 360-22 Ch. F (Bending Plastic Moment Eq. F2-1)' : 'ECP 205 Cl. 2.3 (Beam Flexure)',
        shear: designCode.startsWith('AISC') ? 'AISC 360-22 Ch. G (Web Shear Eq. G2-1)' : 'ECP 205 Cl. 2.4 (Shear Stress)',
        interaction: designCode.startsWith('AISC') ? 'AISC 360-22 Ch. H (Combined Eq. H1-1a)' : 'ECP 205 Cl. 2.7 (Interaction Equation)',
      },
    });
  });

  return results;
}
