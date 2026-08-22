export function normalizeHash(hash) {
  if (typeof hash !== "string") {
    return "";
  }

  return hash.trim().replace(/^0x/i, "").toLowerCase();
}

export function hasHashMismatch(currentHash, originalHash) {
  const normalizedCurrentHash = normalizeHash(currentHash);
  const normalizedOriginalHash = normalizeHash(originalHash);

  return Boolean(
    normalizedCurrentHash &&
      normalizedOriginalHash &&
      normalizedCurrentHash !== normalizedOriginalHash
  );
}

export function createIntegrityCheck({
  currentHash,
  originalHash,
  checkedHash,
  proofExists,
}) {
  const normalizedCurrentHash = normalizeHash(currentHash);
  const normalizedOriginalHash = normalizeHash(originalHash);
  const normalizedCheckedHash = normalizeHash(checkedHash || currentHash);
  const hashMismatch = hasHashMismatch(
    normalizedCurrentHash,
    normalizedOriginalHash || normalizedCheckedHash
  );

  if (proofExists) {
    return {
      status: hashMismatch ? "mismatch" : "match",
      currentHash,
      storedHash: originalHash || checkedHash || currentHash,
      checkedHash: checkedHash || currentHash,
      hashMismatch,
      tampered: hashMismatch,
    };
  }

  return {
    status: "missing",
    currentHash,
    storedHash: originalHash || checkedHash || currentHash,
    checkedHash: checkedHash || currentHash,
    hashMismatch,
    tampered: hashMismatch,
  };
}

export function isTamperedIntegrityCheck(integrityCheck) {
  if (!integrityCheck) {
    return false;
  }

  if (
    integrityCheck.tampered === true ||
    integrityCheck.hashMismatch === true ||
    integrityCheck.status === "mismatch"
  ) {
    return hasHashMismatch(
      integrityCheck.currentHash,
      integrityCheck.storedHash || integrityCheck.originalHash
    );
  }

  return false;
}
