export type UnitSystem = 'metric_mm' | 'metric_m' | 'imperial';

export type SteelGrade = 
  | 'S235' 
  | 'S275' 
  | 'S355' 
  | 'St 37-2' 
  | 'St 44-2' 
  | 'St 52-3' 
  | 'ASTM A36' 
  | 'ASTM A992' 
  | 'ASTM A500 Gr B';

export interface MaterialProperties {
  grade: SteelGrade;
  standard: string;
  Fy: number; // MPa (N/mm2)
  Fu: number; // MPa (N/mm2)
  E: number;  // MPa (e.g. 210,000 MPa)
  G: number;  // MPa (e.g. 81,000 MPa)
  density: number; // kg/m3 (7850)
  thermalExpansion: number; // 1/C
}

export type SectionType = 'I_BEAM' | 'H_COLUMN' | 'RHS' | 'SHS' | 'ANGLE' | 'CHANNEL' | 'PLATE';

export interface SectionProfile {
  id: string;
  name: string;
  type: SectionType;
  family: 'IPE' | 'HEA' | 'HEB' | 'RHS' | 'SHS' | 'UPN' | 'L' | 'PL';
  h: number;     // Total depth (mm)
  b: number;     // Flange width / breadth (mm)
  tw: number;    // Web thickness (mm)
  tf: number;    // Flange thickness (mm)
  r?: number;    // Fillet radius (mm)
  weightKgM: number; // kg/m
  Ag: number;    // Cross-sectional Area (cm2)
  Ix: number;    // Moment of inertia x-x (cm4)
  Iy: number;    // Moment of inertia y-y (cm4)
  Wx: number;    // Elastic section modulus x-x (cm3)
  Wy: number;    // Elastic section modulus y-y (cm3)
  Zx: number;    // Plastic section modulus x-x (cm3)
  Zy: number;    // Plastic section modulus y-y (cm3)
  rx: number;    // Radius of gyration x-x (cm)
  ry: number;    // Radius of gyration y-y (cm)
  It?: number;   // Torsional constant (cm4)
}

export type SupportType = 'fixed' | 'pinned' | 'roller_x' | 'roller_z' | 'free';

export interface StructuralNode {
  id: string;
  name: string;
  x: number; // meters
  y: number; // meters (height)
  z: number; // meters
  support: SupportType;
}

export type MemberType = 'column' | 'rafter' | 'purlin' | 'girt' | 'bracing' | 'beam' | 'tie';
export type MemberRelease = 'rigid' | 'pinned' | 'pinned_start' | 'pinned_end';

export interface StructuralMember {
  id: string;
  mark: string;
  startNodeId: string;
  endNodeId: string;
  sectionId: string;
  materialGrade: SteelGrade;
  type: MemberType;
  releases: MemberRelease;
  assemblyMark: string;
  unbracedLengthMajor?: number; // meters
  unbracedLengthMinor?: number; // meters
}

export type DesignCode = 'AISC_360_22_LRFD' | 'AISC_360_22_ASD' | 'ECP_205_ASD' | 'ECP_205_LRFD' | 'EUROCODE_3';

export interface LoadCase {
  id: string;
  name: string;
  type: 'DL' | 'SIDL' | 'LL' | 'WL_X' | 'WL_Z' | 'CRANE';
  description: string;
  multiplier: number;
}

export interface LoadCombination {
  id: string;
  name: string;
  type: 'ULS' | 'SLS';
  factors: Record<string, number>; // loadCaseId -> factor
  governingReason?: string;
}

export type CheckStatus = 'pass' | 'fail' | 'missing_input' | 'unsupported' | 'stale' | 'not_applicable';

export interface MemberCheckResult {
  memberId: string;
  governingCombinationId: string;
  status: CheckStatus;
  
  // Forces at critical station
  stationRatio: number; // 0.0 to 1.0 along span
  axialForceKn: number; // Tension +ve, Compression -ve
  shearForceKn: number;
  bendingMomentKnM: number;
  
  // Capacities
  axialCapacityKn: number;
  shearCapacityKn: number;
  momentCapacityKnM: number;
  
  // Unity checks
  axialRatio: number;
  shearRatio: number;
  flexureRatio: number;
  interactionRatio: number; // AISC H1-1a / H1-1b
  slendernessRatio: number; // KL/r vs allowable (e.g. 200 for comp, 300 for tension)
  deflectionRatio: number;  // delta / delta_allowable
  
  // Clause references
  clauses: {
    axial: string;
    flexure: string;
    shear: string;
    interaction: string;
  };
}

export interface BasePlateDesign {
  id: string;
  columnMemberId: string;
  plateLength: number; // mm
  plateWidth: number;  // mm
  plateThickness: number; // mm
  steelGrade: SteelGrade;
  anchorGrade: string; // e.g. 'Grade 8.8'
  anchorDiameter: number; // mm (e.g. M24)
  anchorCount: number; // 4 or 6
  anchorEmbedment: number; // mm (e.g. 450)
  groutThickness: number; // mm (e.g. 30)
  concreteFcu: number; // MPa (e.g. 30)
  weldLeg: number; // mm (e.g. 8)
  
  // Results
  bearingPressure: number; // MPa
  allowableBearing: number; // MPa
  plateBendingStress: number; // MPa
  anchorTensionForceKn: number;
  anchorShearForceKn: number;
  status: CheckStatus;
  utilization: number;
}

export interface MomentEndPlateDesign {
  id: string;
  rafterMemberId: string;
  columnMemberId: string;
  plateType: 'extended_both' | 'extended_tension' | 'flush';
  thickness: number; // mm
  width: number; // mm
  height: number; // mm
  boltDiameter: number; // mm (M20, M24)
  boltGrade: '8.8' | '10.9';
  boltRows: number;
  boltPitch: number; // mm
  weldFlangeLeg: number; // mm
  weldWebLeg: number; // mm
  stiffenerThickness?: number; // mm
  
  momentCapacityKnM: number;
  shearCapacityKn: number;
  appliedMomentKnM: number;
  appliedShearKn: number;
  status: CheckStatus;
  utilization: number;
}

export interface MachineProfile {
  id: string;
  name: string;
  nameAr: string;
  type: 'fiber_laser' | 'press_brake' | 'band_saw' | 'welding_bay' | 'paint_line';
  bedDimensions: { x: number; y: number; z?: number }; // mm
  maxThickness: Record<SteelGrade, number>; // mm
  kerfWidthMm: number;
  hourlyCostEgp: number;
  setupTimeMin: number;
  kFactorDefault: number; // for sheet bending
}

export interface PartDefinition {
  id: string;
  mark: string; // e.g. P-101
  assemblyMark: string; // e.g. AS-COL-01
  description: string;
  material: SteelGrade;
  thickness: number; // mm (or section name)
  lengthMm: number;
  widthMm: number;
  netWeightKg: number;
  grossWeightKg: number;
  operations: Array<'saw_cut' | 'laser_profile' | 'cnc_drill' | 'press_brake' | 'weld_assembly' | 'primer_paint'>;
  holesCount: number;
  holesDiameterMm?: number;
  bendAngles?: number[];
}

export interface AssemblyDefinition {
  id: string;
  mark: string; // AS-COL-01
  description: string;
  memberType: MemberType;
  quantity: number;
  totalWeightKg: number;
  finish: string; // Sa 2.5 + Epoxy 80µm
  parts: PartDefinition[];
  weldsLengthMeters: number;
}

export interface NestingSheetResult {
  sheetId: string;
  sheetWidthMm: number;
  sheetLengthMm: number;
  thicknessMm: number;
  material: SteelGrade;
  partsPlaced: Array<{
    partMark: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotated: boolean;
  }>;
  utilizationPercent: number;
  scrapPercent: number;
  totalWeightKg: number;
}

export interface LinearCutPlan {
  stockLengthMm: number; // 12000 mm
  sectionName: string;
  barsRequired: number;
  cuts: Array<{
    barIndex: number;
    parts: Array<{ partMark: string; lengthMm: number }>;
    wasteLengthMm: number;
    utilizationPercent: number;
  }>;
  totalWastePercent: number;
}

export interface CostBreakdown {
  currency: 'EGP' | 'USD' | 'SAR';
  exchangeRateToEgp: number;
  
  // Materials
  rawSteelTons: number;
  steelRatePerTon: number;
  rawSteelCost: number;
  scrapLossCost: number;
  fastenersCost: number;
  weldingConsumablesCost: number;
  primerPaintCost: number;
  
  // Labor & Operations
  laserCuttingCost: number;
  sawCuttingCost: number;
  bendingCost: number;
  fittingWeldingCost: number;
  blastingPaintingCost: number;
  
  // Handling & Site
  transportCost: number;
  craneErectionCost: number;
  
  // Factory Totals
  internalFactoryCost: number;
  overheadMarginPercent: number;
  overheadCost: number;
  profitMarginPercent: number;
  profitCost: number;
  
  // Client Selling Price
  totalSellingPrice: number;
  unitPricePerTon: number;
  vatTaxPercent: number;
  grandTotalWithVat: number;
}

export interface QualityITPItem {
  id: string;
  stage: string;
  stageAr: string;
  itemDescription: string;
  acceptanceCriteria: string;
  inspectionMethod: 'VT' | 'UT' | 'MT' | 'DFT_GAUGE' | 'CALIPER' | 'MTC_REVIEW';
  responsibleParty: 'Fabricator' | 'ThirdParty' | 'Client';
  status: 'passed' | 'pending' | 'hold' | 'ncr';
  checkedDate?: string;
  notes?: string;
}

export interface NonConformanceReport {
  id: string;
  reportNumber: string;
  partOrAssemblyMark: string;
  date: string;
  deficiencyDescription: string;
  rootCause: string;
  disposition: 'REWORK' | 'REJECT' | 'REPAIR' | 'USE_AS_IS';
  dispositionApprovedBy?: string;
  resolutionStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
}

export type WeldType = 'FILLET' | 'SQUARE_GROOVE' | 'V_GROOVE' | 'BEVEL_GROOVE' | 'U_GROOVE' | 'FLARE_BEVEL';
export type WeldLocation = 'ARROW_SIDE' | 'OTHER_SIDE' | 'BOTH_SIDES';
export type WeldShopSite = 'SHOP' | 'SITE_FIELD';
export type WeldContour = 'FLAT_FLUSH' | 'CONVEX' | 'CONCAVE' | 'NONE';

export interface WeldingSymbolDefinition {
  id: string;
  jointName: string;
  jointNameAr: string;
  connectedEntities: string; // e.g. "Column Shaft to Base Plate", "Rafter Flange to End Plate"
  connectionCategory: 'BASE_PLATE' | 'MOMENT_END_PLATE' | 'STIFFENER' | 'BRACING_GUSSET' | 'PURLIN_CLEAT';
  linkedConnectionId?: string; // e.g. "BP_M1_1", "MEP_M3_1"
  
  // Welding Specification per AWS A2.4 / ISO 2553
  weldType: WeldType;
  weldLegMm: number; // e.g. 6, 8, 10
  effectiveThroatMm: number; // 0.707 * weldLeg
  weldLocation: WeldLocation;
  allAround: boolean; // Circle symbol on reference line
  fieldWeld: boolean; // Flag symbol on reference line
  weldContour: WeldContour;
  weldLengthMm?: number; // continuous or intermittent
  intermittentPitchMm?: number;
  
  // Welding Process & Quality
  process: 'GMAW_MIG' | 'SMAW_STICK' | 'FCAW' | 'SAW';
  electrode: string; // e.g. "AWS A5.18 ER70S-6", "E7018"
  ndtMethod: 'VT' | 'MT' | 'UT' | 'RT';
  ndtCoverage: string; // "100%", "20%", "10%"
  qualifiedWpsNo: string; // e.g. "WPS-MWEC-01-FW"
  designCapacityKnPerM?: number; // 0.707 * a * 0.6 * Fu * 1000
}

export interface AiRecommendationCard {
  projectRevisionId: string;
  recommendationType: 'member_optimization' | 'connection_refinement' | 'manufacturability_warning' | 'wind_load_update' | 'cost_reduction';
  status: 'proposed' | 'reviewed' | 'applied' | 'dismissed';
  summary: string;
  evidence: Array<{ runId: string; checkId: string; valueReported: string }>;
  assumptions: string[];
  missingInputs: string[];
  affectedEntities: string[];
  expectedRechecks: string[];
  sourceRefs: string[];
  requestedAction: string;
  savingsEstimate?: string;
}

export type ProjectLifecyclePhase = 
  | 'INQUIRY' 
  | 'DESIGN_BASIS' 
  | 'ANALYSIS' 
  | 'CONNECTIONS' 
  | 'DETAILING_DRAWINGS' 
  | 'REVIEW_APPROVAL' 
  | 'FABRICATION_RELEASE' 
  | 'SHOP_FLOOR_QA';

export type UserRole = 
  | 'client' 
  | 'project_manager' 
  | 'design_engineer' 
  | 'detailing_engineer' 
  | 'lead_reviewer' 
  | 'shop_manager' 
  | 'qa_inspector';

export interface ProjectData {
  id: string;
  projectNumber: string;
  title: string;
  titleAr: string;
  clientName: string;
  location: string;
  country: string;
  createdDate: string;
  phase: ProjectLifecyclePhase;
  revision: number;
  releaseId?: string; // Immutable once released!
  
  // Template & Geometry
  templateType: 'booth_kiosk' | 'portal_frame' | 'pitched_truss';
  dimensions: {
    lengthM: number;
    widthM: number;
    eaveHeightM: number;
    ridgeHeightM: number;
    baysCount: number;
    roofPitchDeg: number;
  };
  
  // Engineering Basis
  designCode: DesignCode;
  steelGradeDefault: SteelGrade;
  windSpeedKmh: number;
  windExposure: 'B' | 'C' | 'D';
  roofLiveLoadKpa: number;
  claddingDeadLoadKpa: number;
  
  // Structural model
  nodes: StructuralNode[];
  members: StructuralMember[];
  loadCases: LoadCase[];
  loadCombinations: LoadCombination[];
  memberChecks: MemberCheckResult[];
  
  // Connections
  basePlates: BasePlateDesign[];
  momentEndPlates: MomentEndPlateDesign[];
  
  // Detailing & Shop
  assemblies: AssemblyDefinition[];
  parts: PartDefinition[];
  nestingResults: NestingSheetResult[];
  linearCutPlans: LinearCutPlan[];
  weldingSymbols: WeldingSymbolDefinition[];
  
  // Costing
  costing: CostBreakdown;
  
  // Quality
  itpChecklist: QualityITPItem[];
  ncrs: NonConformanceReport[];
  
  // AI Recommendations
  recommendations: AiRecommendationCard[];
}
