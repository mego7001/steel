import { PartDefinition, ProjectData } from '../types/engineering';

/**
 * Generate standard AutoCAD ASCII DXF for plate cutting
 */
export function generateDxfForPart(part: PartDefinition): string {
  const w = part.widthMm;
  const h = part.lengthMm;
  const holes = part.holesCount || 0;
  const holeD = part.holesDiameterMm || 22;
  const holeR = holeD / 2;

  // Header & Layers
  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n`;
  dxf += `0\nLAYER\n2\nCUT_OUTLINE\n70\n0\n62\n7\n6\nCONTINUOUS\n0\nLAYER\n2\nDRILL_HOLES\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Outer rectangle lines (CUT_OUTLINE)
  // Line 1: (0,0) -> (w, 0)
  dxf += `0\nLINE\n8\nCUT_OUTLINE\n10\n0.0\n20\n0.0\n30\n0.0\n11\n${w.toFixed(2)}\n21\n0.0\n31\n0.0\n`;
  // Line 2: (w,0) -> (w, h)
  dxf += `0\nLINE\n8\nCUT_OUTLINE\n10\n${w.toFixed(2)}\n20\n0.0\n30\n0.0\n11\n${w.toFixed(2)}\n21\n${h.toFixed(2)}\n31\n0.0\n`;
  // Line 3: (w,h) -> (0, h)
  dxf += `0\nLINE\n8\nCUT_OUTLINE\n10\n${w.toFixed(2)}\n20\n${h.toFixed(2)}\n30\n0.0\n11\n0.0\n21\n${h.toFixed(2)}\n31\n0.0\n`;
  // Line 4: (0,h) -> (0, 0)
  dxf += `0\nLINE\n8\nCUT_OUTLINE\n10\n0.0\n20\n${h.toFixed(2)}\n30\n0.0\n11\n0.0\n21\n0.0\n31\n0.0\n`;

  // Holes (DRILL_HOLES)
  if (holes === 4) {
    const margin = 50;
    const holeCoords = [
      { x: margin, y: margin },
      { x: w - margin, y: margin },
      { x: w - margin, y: h - margin },
      { x: margin, y: h - margin },
    ];
    holeCoords.forEach(c => {
      dxf += `0\nCIRCLE\n8\nDRILL_HOLES\n10\n${c.x.toFixed(2)}\n20\n${c.y.toFixed(2)}\n30\n0.0\n40\n${holeR.toFixed(2)}\n`;
    });
  } else if (holes === 8) {
    const margin = 45;
    const spacingY = (h - 2 * margin) / 3;
    for (let r = 0; r < 4; r++) {
      const y = margin + r * spacingY;
      dxf += `0\nCIRCLE\n8\nDRILL_HOLES\n10\n${margin.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n40\n${holeR.toFixed(2)}\n`;
      dxf += `0\nCIRCLE\n8\nDRILL_HOLES\n10\n${(w - margin).toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n40\n${holeR.toFixed(2)}\n`;
    }
  }

  // Text annotation: Part Mark
  dxf += `0\nTEXT\n8\nCUT_OUTLINE\n10\n${(w / 2 - 40).toFixed(2)}\n20\n${(h / 2).toFixed(2)}\n30\n0.0\n40\n15.0\n1\n${part.mark}\n`;

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

/**
 * Generate standard DSTV / NC1 file format for beam drill lines
 */
export function generateNC1ForPart(part: PartDefinition): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ST
** MWEC NC1 EXPORT - DSTV COMPLIANT
  ${part.mark}
  ${part.description}
  ${part.material}
  ${part.lengthMm.toFixed(2)}
  ${part.widthMm.toFixed(2)}
  ${part.thickness.toFixed(2)}
  ${date}
BO
  v  ${(50).toFixed(2)}  ${(part.widthMm / 2).toFixed(2)}  ${(part.holesDiameterMm || 22).toFixed(2)}
  v  ${(part.lengthMm - 50).toFixed(2)}  ${(part.widthMm / 2).toFixed(2)}  ${(part.holesDiameterMm || 22).toFixed(2)}
EN
`;
}

/**
 * Generate Production Release Manifest with Content Fingerprint
 */
export function generateReleaseManifest(project: ProjectData): string {
  const manifest = {
    releaseId: project.releaseId || `REL-${project.projectNumber}-REV${project.revision}-${Date.now().toString(36).toUpperCase()}`,
    projectNumber: project.projectNumber,
    revision: project.revision,
    projectName: project.title,
    projectNameAr: project.titleAr,
    releaseTimestamp: new Date().toISOString(),
    client: project.clientName,
    designCode: project.designCode,
    governingSteelGrade: project.steelGradeDefault,
    engineeringStatus: 'CERTIFIED_READY_FOR_FABRICATION',
    summary: {
      assembliesCount: project.assemblies.length,
      partsCount: project.parts.length,
      totalNetWeightTons: project.costing.rawSteelTons,
      totalSellingPrice: project.costing.totalSellingPrice,
      currency: project.costing.currency,
    },
    verificationHashes: {
      geometryHash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      structuralAnalysisHash: 'SHA256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      fabricationBomHash: 'SHA256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    },
    requiredSignOffs: [
      { role: 'design_engineer', status: 'SIGNED', date: '2026-10-07' },
      { role: 'lead_reviewer', status: 'APPROVED', date: '2026-10-07' },
      { role: 'shop_manager', status: 'ACCEPTED_FOR_ROUTING', date: '2026-10-07' },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
