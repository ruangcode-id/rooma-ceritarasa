import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("PublicMenuClient supports mobile tap and toggle for menu item descriptions", () => {
  const componentSource = readFileSync("src/components/public/PublicMenuClient.tsx", "utf8");

  // Check state management for active photo
  assert.match(
    componentSource,
    /const\s*\[activePhotoId,\s*setActivePhotoId\]\s*=\s*useState<string\s*\|\s*null>\(null\)/,
    "Must maintain activePhotoId state for mobile tap support"
  );

  // Check tap/click handler
  assert.match(
    componentSource,
    /onClick=\{\(\)\s*=>\s*togglePhoto\(img\.id\)\}/,
    "Must toggle photo active state on click/tap"
  );

  // Check overlay visibility condition
  assert.match(
    componentSource,
    /isActive\s*\?\s*"opacity-100"\s*:\s*"opacity-0 group-hover:opacity-100"/,
    "Overlay must be visible when isActive is true or on group-hover"
  );

  // Check click outside listener
  assert.match(
    componentSource,
    /handleDocumentClick/,
    "Must include document click listener to dismiss active overlay when clicking outside"
  );
});
