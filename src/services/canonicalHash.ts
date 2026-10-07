/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Canonical Hashing & Normalization Service
 * Generates deterministic SHA-256 content fingerprints per P1-STS-06
 */

import { CanonicalHashes, WorkspaceDraftData } from '../types/p1';

/**
 * Deterministically sort and stringify any JavaScript data structure
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) return 'null';
    return Object.is(obj, -0) ? '0' : String(obj);
  }
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'string') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    // Stringify array items
    const items = obj.map((item) => canonicalJsonStringify(item));
    return `[${items.join(',')}]`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const pairs: string[] = [];
    for (const key of keys) {
      // Exclude transient/volatile metadata fields from deterministic hash
      if (['updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'requestId'].includes(key)) {
        continue;
      }
      pairs.push(`${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`);
    }
    return `{${pairs.join(',')}}`;
  }

  return JSON.stringify(String(obj));
}

/**
 * Compute SHA-256 hash using Web Crypto API or fallback
 */
export async function sha256Hex(content: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(content);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple hash for older environments (if crypto.subtle is unavailable)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Compute all P1 canonical hashes for a given workspace snapshot
 */
export async function computeCanonicalHashes(
  draft: WorkspaceDraftData,
  priceParams: { currency?: string; steelRatePerTon?: number } = {}
): Promise<CanonicalHashes> {
  // 1. Inputs & Dimensions
  const inputPayload = {
    dimensions: draft.dimensions,
    provenance: draft.provenance,
    material: draft.material,
    assumptionsNotes: draft.assumptionsNotes,
  };
  const inputStr = canonicalJsonStringify(inputPayload);
  const inputHash = `SHA256:${await sha256Hex(inputStr)}`;

  // 2. Geometry Hash
  const geometryPayload = {
    dimensions: draft.dimensions,
  };
  const geometryStr = canonicalJsonStringify(geometryPayload);
  const geometryHash = `SHA256:${await sha256Hex(geometryStr)}`;

  // 3. Design Basis Hash
  const basisPayload = {
    designBasis: draft.designBasis,
    materialGrade: draft.material.steelGrade,
  };
  const basisStr = canonicalJsonStringify(basisPayload);
  const basisHash = `SHA256:${await sha256Hex(basisStr)}`;

  // 4. Commercial / Price Hash
  const pricePayload = {
    currency: priceParams.currency || 'EGP',
    rate: priceParams.steelRatePerTon || 48000,
  };
  const priceStr = canonicalJsonStringify(pricePayload);
  const priceHash = `SHA256:${await sha256Hex(priceStr)}`;

  return {
    inputHash,
    geometryHash,
    basisHash,
    priceHash,
  };
}
