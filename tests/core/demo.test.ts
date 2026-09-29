import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { cropFromLandmarks, measurementChecks, getPreset } from "../../src/core/index.js";

// Landmarks measured by inspection of public/demo-portrait.png (1024x1536): crown of hair,
// pupil line and bottom of chin. Keep in sync with the demo constants in src/ui/App.tsx.
const FRACTIONS = { crown: 0.279, eyes: 0.466, chin: 0.653 };

test("the synthetic demo portrait can produce a US passport crop that measures inside the head and eye ranges, and UK/AU head ranges", async () => {
  const meta = await sharp("public/demo-portrait.png").metadata();
  const width = meta.width!, height = meta.height!;
  assert.ok(width >= 1000 && height > width);
  const landmarks = {
    centerX: width / 2,
    crownY: height * FRACTIONS.crown,
    eyesY: height * FRACTIONS.eyes,
    chinY: height * FRACTIONS.chin,
  };
  for (const id of ["us-passport", "uk-passport", "au-passport"]) {
    const preset = getPreset(id);
    const crop = cropFromLandmarks(width, height, preset, landmarks);
    assert.ok(crop.x >= -1e-6 && crop.y >= -1e-6, `${id} crop starts inside the source`);
    assert.ok(crop.x + crop.width <= width + 1e-6 && crop.y + crop.height <= height + 1e-6, `${id} crop ends inside the source`);
    const checks = measurementChecks(preset, crop, landmarks, { width, height });
    const head = checks.find(c => c.id === "head")!;
    assert.equal(head.status, "pass", `${id} head: ${JSON.stringify(head)}`);
    if (id === "us-passport") {
      const eyes = checks.find(c => c.id === "eyes")!;
      assert.equal(eyes.status, "pass", `${id} eyes: ${JSON.stringify(eyes)}`);
    }
  }
});
