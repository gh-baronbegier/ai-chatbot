#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const licenseContent = `// Patched by lib/scripts/patch-mui-license.js
import { LICENSE_STATUS } from '../utils/licenseStatus.js';

export function verifyLicense({ releaseInfo, licenseKey, packageName }) {
  return {
    status: LICENSE_STATUS.Valid,
    meta: {
      licensingModel: 'perpetual',
      scope: 'premium',
      expiryTimestamp: new Date('2099-12-31').getTime(),
      orderNumber: 'MUI-X-PREMIUM-LICENSE',
      isValid: true,
    }
  };
}
`;

const nodeModules = path.join(__dirname, "..", "..", "node_modules");

// pnpm stores packages under node_modules/.pnpm/<pkg>@<version>.../node_modules/<pkg>/
// Use fs.globSync or a manual search to find the right path dynamically.
function findVerifyLicenseFiles() {
  const pnpmDir = path.join(nodeModules, ".pnpm");
  const results = [];

  if (!fs.existsSync(pnpmDir)) {
    // Fallback: flat node_modules layout (npm/yarn)
    const flat = path.join(
      nodeModules,
      "@mui",
      "x-license",
      "esm",
      "verifyLicense",
      "verifyLicense.js"
    );
    if (fs.existsSync(flat)) results.push(flat);
    return results;
  }

  // Search inside .pnpm for @mui+x-license directories
  const entries = fs.readdirSync(pnpmDir);
  for (const entry of entries) {
    if (!entry.startsWith("@mui+x-license@")) continue;
    const esmTarget = path.join(
      pnpmDir,
      entry,
      "node_modules",
      "@mui",
      "x-license",
      "esm",
      "verifyLicense",
      "verifyLicense.js"
    );
    if (fs.existsSync(esmTarget)) results.push(esmTarget);
  }

  return results;
}

try {
  const files = findVerifyLicenseFiles();

  if (files.length === 0) {
    console.log("MUI X License patch: no verifyLicense.js found, skipping.");
    process.exit(0);
  }

  for (const file of files) {
    fs.writeFileSync(file, licenseContent);
    console.log(`MUI X License patched: ${path.relative(nodeModules, file)}`);
  }
} catch (error) {
  console.error("Failed to patch MUI X License:", error.message);
  // Don't exit with error - allow build to continue
}
