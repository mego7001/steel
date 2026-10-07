import { AssemblyDefinition, CostBreakdown, PartDefinition } from '../types/engineering';

export interface CostingParameters {
  currency: 'EGP' | 'USD' | 'SAR';
  steelRatePerTon: number; // e.g. 48,000 EGP
  exchangeRateToEgp: number; // 1 for EGP, 50 for USD, 13.3 for SAR
  overheadPercent: number; // e.g. 12%
  profitMarginPercent: number; // e.g. 18%
  vatTaxPercent: number; // e.g. 14%
  includeErection: boolean;
  transportDistanceKm: number;
}

export function calculateProjectCosting(
  assemblies: AssemblyDefinition[],
  parts: PartDefinition[],
  params: CostingParameters
): CostBreakdown {
  const {
    currency,
    exchangeRateToEgp,
    steelRatePerTon,
    overheadPercent,
    profitMarginPercent,
    vatTaxPercent,
    includeErection,
    transportDistanceKm,
  } = params;

  // 1. Total Net Steel Weight
  const netWeightKg = assemblies.reduce((acc, a) => acc + a.totalWeightKg, 0);
  const rawSteelTons = Number((netWeightKg / 1000).toFixed(3));

  // Gross steel tons with 7% process scrap
  const grossSteelTons = rawSteelTons * 1.07;
  const rawSteelCost = grossSteelTons * steelRatePerTon;
  const scrapLossCost = (grossSteelTons - rawSteelTons) * steelRatePerTon * 0.7; // net loss after scrap resale

  // 2. Fasteners & Anchors (approx. 40 EGP per bolt/nut/washer set)
  const totalBolts = parts.reduce((acc, p) => acc + (p.holesCount || 0), 0);
  const fastenersCost = (totalBolts * 42) / exchangeRateToEgp;

  // 3. Welding Consumables (120 EGP per meter of weld)
  const totalWeldMeters = assemblies.reduce((acc, a) => acc + a.weldsLengthMeters, 0);
  const weldingConsumablesCost = (totalWeldMeters * 135) / exchangeRateToEgp;

  // 4. Primer & Epoxy Paint (Paint area approx. 28 m2 per ton of steel, 160 EGP/m2)
  const estimatedSurfaceAreaM2 = rawSteelTons * 28;
  const primerPaintCost = (estimatedSurfaceAreaM2 * 175) / exchangeRateToEgp;

  // 5. Operations: Laser, Saw, Weld labor
  const laserParts = parts.filter(p => p.operations.includes('laser_profile'));
  const totalLaserCutPerimeterM = laserParts.reduce((acc, p) => acc + ((p.lengthMm + p.widthMm) * 2) / 1000, 0);
  const laserCuttingCost = (totalLaserCutPerimeterM * 45) / exchangeRateToEgp;

  const sawParts = parts.filter(p => p.operations.includes('saw_cut'));
  const sawCuttingCost = (sawParts.length * 35) / exchangeRateToEgp;

  const bendingCost = (parts.reduce((acc, p) => acc + (p.bendAngles?.length || 0), 0) * 50) / exchangeRateToEgp;

  // Fitting & welding labor: ~3,500 EGP per ton
  const fittingWeldingCost = (rawSteelTons * 3600) / exchangeRateToEgp;

  // Blasting Sa 2.5: ~110 EGP/m2
  const blastingPaintingCost = (estimatedSurfaceAreaM2 * 110) / exchangeRateToEgp;

  // 6. Transport & Crane Erection
  const transportCost = ((Math.ceil(rawSteelTons / 15) * (transportDistanceKm * 35 + 2500))) / exchangeRateToEgp;
  const craneErectionCost = includeErection ? (rawSteelTons * 4200) / exchangeRateToEgp : 0;

  // Total internal factory cost
  const internalFactoryCost = 
    rawSteelCost + 
    scrapLossCost + 
    fastenersCost + 
    weldingConsumablesCost + 
    primerPaintCost + 
    laserCuttingCost + 
    sawCuttingCost + 
    bendingCost + 
    fittingWeldingCost + 
    blastingPaintingCost + 
    transportCost + 
    craneErectionCost;

  // Overhead & Profit
  const overheadCost = (internalFactoryCost * (overheadPercent / 100));
  const profitCost = ((internalFactoryCost + overheadCost) * (profitMarginPercent / 100));

  const totalSellingPrice = internalFactoryCost + overheadCost + profitCost;
  const unitPricePerTon = rawSteelTons > 0 ? (totalSellingPrice / rawSteelTons) : 0;

  const grandTotalWithVat = totalSellingPrice * (1 + vatTaxPercent / 100);

  return {
    currency,
    exchangeRateToEgp,
    rawSteelTons,
    steelRatePerTon,
    rawSteelCost: Math.round(rawSteelCost),
    scrapLossCost: Math.round(scrapLossCost),
    fastenersCost: Math.round(fastenersCost),
    weldingConsumablesCost: Math.round(weldingConsumablesCost),
    primerPaintCost: Math.round(primerPaintCost),
    laserCuttingCost: Math.round(laserCuttingCost),
    sawCuttingCost: Math.round(sawCuttingCost),
    bendingCost: Math.round(bendingCost),
    fittingWeldingCost: Math.round(fittingWeldingCost),
    blastingPaintingCost: Math.round(blastingPaintingCost),
    transportCost: Math.round(transportCost),
    craneErectionCost: Math.round(craneErectionCost),
    internalFactoryCost: Math.round(internalFactoryCost),
    overheadMarginPercent: overheadPercent,
    overheadCost: Math.round(overheadCost),
    profitMarginPercent,
    profitCost: Math.round(profitCost),
    totalSellingPrice: Math.round(totalSellingPrice),
    unitPricePerTon: Math.round(unitPricePerTon),
    vatTaxPercent,
    grandTotalWithVat: Math.round(grandTotalWithVat),
  };
}
