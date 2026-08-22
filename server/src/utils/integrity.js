export function normalizeHash(hash) {
  if (typeof hash !== "string") {
    return "";
  }

  return hash.trim().replace(/^0x/i, "").toLowerCase();
}

export function createIntegrityResult(currentHash, originalHash) {
  const normalizedCurrentHash = normalizeHash(currentHash);
  const normalizedOriginalHash = normalizeHash(originalHash);
  const hashMismatch = Boolean(
    normalizedCurrentHash &&
      normalizedOriginalHash &&
      normalizedCurrentHash !== normalizedOriginalHash
  );

  return {
    currentHash,
    originalHash: originalHash || null,
    hashMismatch,
    tampered: hashMismatch,
  };
}
