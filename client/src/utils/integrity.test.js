import assert from "node:assert/strict";
import {
  createIntegrityCheck,
  isTamperedIntegrityCheck,
} from "./integrity.js";

const originalHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const modifiedHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const unstoredHash =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const sameContent = createIntegrityCheck({
  currentHash: originalHash,
  originalHash,
  checkedHash: originalHash,
  proofExists: true,
});

assert.equal(sameContent.status, "match");
assert.equal(sameContent.hashMismatch, false);
assert.equal(sameContent.tampered, false);
assert.equal(isTamperedIntegrityCheck(sameContent), false);

const modifiedContent = createIntegrityCheck({
  currentHash: modifiedHash,
  originalHash,
  checkedHash: modifiedHash,
  proofExists: false,
});

assert.equal(modifiedContent.status, "missing");
assert.equal(modifiedContent.hashMismatch, true);
assert.equal(modifiedContent.tampered, true);
assert.equal(isTamperedIntegrityCheck(modifiedContent), true);

const noBlockchainProof = createIntegrityCheck({
  currentHash: unstoredHash,
  checkedHash: unstoredHash,
  proofExists: false,
});

assert.equal(noBlockchainProof.status, "missing");
assert.equal(noBlockchainProof.hashMismatch, false);
assert.equal(noBlockchainProof.tampered, false);
assert.equal(isTamperedIntegrityCheck(noBlockchainProof), false);

console.log("Integrity tests passed.");
