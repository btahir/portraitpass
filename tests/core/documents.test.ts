import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCUMENTS, getDocument, type DocumentSpec } from "../../src/core/documents.js";
import {
  documentDigitalTarget,
  documentPreset,
  getDocumentById,
  POPULAR_DOCUMENT_IDS,
  presetForId,
  searchDocuments,
} from "../../src/core/catalog.js";
import { getPreset } from "../../src/core/presets.js";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIME = /^image\/[a-z0-9.+-]+$/;
const BANNED_CLAIMS = /\b(compliant|approved|guaranteed?|verified|official)\b/i;
const wordCount = (s: string) => s.trim().split(/\s+/).length;
const each = (fn: (d: DocumentSpec) => void) => {
  for (const d of DOCUMENTS) {
    try {
      fn(d);
    } catch (e) {
      (e as Error).message = `[${d.id}] ${(e as Error).message}`;
      throw e;
    }
  }
};

test("dataset has entries and unique kebab-case ids", () => {
  assert(DOCUMENTS.length >= 40);
  const ids = DOCUMENTS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate id");
  each((d) => assert(KEBAB.test(d.id), "id not kebab-case"));
});

test("ids other modules rely on stay present", () => {
  for (const id of [
    ...POPULAR_DOCUMENT_IDS,
    "us-passport-online",
    "uk-passport-online",
    "us-passport-card",
    "us-green-card",
    "ca-passport",
    "de-passport",
  ])
    assert(getDocument(id), `missing ${id}`);
});

test("names, countries, codes and kinds are set", () => {
  each((d) => {
    assert(d.name.trim().length >= 3, "name");
    assert(d.country.trim().length >= 2, "country");
    assert(/^[A-Z]{2}$/.test(d.countryCode), "countryCode");
    assert(
      ["passport", "visa", "id-card", "residence", "citizenship", "lottery", "exam-form", "other"].includes(d.kind),
      "kind",
    );
    assert(["yes", "digital-only", "no"].includes(d.diy), "diy");
  });
});

test("every diy 'no' entry says why; every note is plain text", () => {
  each((d) => {
    if (d.diy === "no") assert((d.diyNote ?? "").trim().length >= 20, "diy no needs diyNote");
    if (d.diyNote !== undefined) assert(d.diyNote.trim().length > 0, "empty diyNote");
  });
});

test("digital-only entries have a digital spec; DIY yes entries have print or digital", () => {
  each((d) => {
    if (d.diy === "digital-only") assert(d.digital, "digital-only needs digital");
    if (d.diy === "yes") assert(d.print || d.digital, "diy yes needs print or digital");
  });
});

test("sources: non-empty, https, checked 2026-09-28, titled, no duplicates", () => {
  each((d) => {
    assert(d.sources.length >= 1, "no sources");
    const urls = d.sources.map((s) => s.url);
    assert.equal(new Set(urls).size, urls.length, "duplicate source url");
    for (const s of d.sources) {
      assert(s.url.startsWith("https://"), `url not https: ${s.url}`);
      assert.doesNotThrow(() => new URL(s.url), `bad url ${s.url}`);
      assert.equal(s.checkedAt, "2026-09-28");
      assert(s.title.trim().length > 3, "source title");
      assert(["primary", "secondary"].includes(s.kind), "source kind");
    }
  });
});

test("print specs: positive numbers, head and eye ranges inside the photo", () => {
  each((d) => {
    const p = d.print;
    if (!p) return;
    assert(p.widthMm > 0 && p.heightMm > 0, "size");
    if (p.copies !== undefined) assert(Number.isInteger(p.copies) && p.copies > 0, "copies");
    if (p.headMinMm !== undefined || p.headMaxMm !== undefined) {
      assert(p.headMinMm !== undefined && p.headMaxMm !== undefined, "head range half set");
      assert(p.headMinMm! > 0 && p.headMinMm! < p.headMaxMm!, "headMin < headMax");
      assert(p.headMaxMm! < p.heightMm, "headMax < height");
    }
    if (p.eyeMinMm !== undefined || p.eyeMaxMm !== undefined) {
      assert(p.eyeMinMm !== undefined && p.eyeMaxMm !== undefined, "eye range half set");
      assert(p.eyeMinMm! > 0 && p.eyeMinMm! <= p.eyeMaxMm!, "eyeMin <= eyeMax");
      assert(p.eyeMaxMm! < p.heightMm, "eyeMax < height");
    }
  });
});

test("digital specs: ranges ordered, sizes positive, formats valid MIME types", () => {
  each((d) => {
    const g = d.digital;
    if (!g) return;
    assert(g.formats.length > 0, "formats empty");
    for (const f of g.formats) assert(MIME.test(f), `bad MIME ${f}`);
    const pos = (v: number | undefined) => v === undefined || (Number.isFinite(v) && v > 0);
    for (const v of [g.widthPx, g.heightPx, g.minWidthPx, g.minHeightPx, g.maxWidthPx, g.maxHeightPx, g.aspect, g.minKB, g.maxKB])
      assert(pos(v), "non-positive number");
    const ordered = (lo?: number, hi?: number) => lo === undefined || hi === undefined || lo <= hi;
    assert(ordered(g.minWidthPx, g.maxWidthPx), "width range");
    assert(ordered(g.minHeightPx, g.maxHeightPx), "height range");
    assert(ordered(g.minKB, g.maxKB), "KB range");
    if (g.widthPx !== undefined) assert(ordered(g.minWidthPx, g.widthPx) && ordered(g.widthPx, g.maxWidthPx), "width vs range");
    if (g.heightPx !== undefined) assert(ordered(g.minHeightPx, g.heightPx) && ordered(g.heightPx, g.maxHeightPx), "height vs range");
    if (g.widthPx && g.heightPx && g.aspect)
      assert(Math.abs(g.widthPx / g.heightPx - g.aspect) < 0.01, "aspect disagrees with exact size");
    const ratio = (lo?: number, hi?: number) => {
      for (const v of [lo, hi]) assert(v === undefined || (v > 0 && v < 1), "ratio outside 0..1");
      assert(ordered(lo, hi), "ratio range");
    };
    ratio(g.headRatioMin, g.headRatioMax);
    ratio(g.eyeRatioMin, g.eyeRatioMax);
  });
});

test("kbBytes: set whenever a KB limit exists, follows the stated rule", () => {
  // Rule (see comment at the top of each data file): max-only caps use 1000;
  // ranges with a minimum use 1024, except the two ids kept decimal to match
  // the legacy presets.
  const decimalRanges = new Set(["us-passport-online", "uk-passport-online"]);
  each((d) => {
    const g = d.digital;
    if (!g) return;
    const hasKB = g.minKB !== undefined || g.maxKB !== undefined;
    if (!hasKB) {
      assert.equal(g.kbBytes, undefined, "kbBytes without a KB limit");
      return;
    }
    assert(g.kbBytes === 1000 || g.kbBytes === 1024, "kbBytes missing");
    if (g.minKB === undefined) assert.equal(g.kbBytes, 1000, "max-only cap must be 1000");
    else assert.equal(g.kbBytes, decimalRanges.has(d.id) ? 1000 : 1024, "range must be 1024");
  });
});

test("background colours have no blank entries; edit is a valid value", () => {
  each((d) => {
    for (const c of d.background.colors) assert(c.trim().length > 0, "blank colour");
    assert(["forbidden", "unspecified", "allowed"].includes(d.background.edit), "edit");
  });
});

test("US visa and DV entries forbid digital alteration", () => {
  assert.equal(getDocument("us-visa")!.background.edit, "forbidden");
  assert.equal(getDocument("dv-lottery")!.background.edit, "forbidden");
});

test("rules: short, non-empty, no compliance claims", () => {
  each((d) => {
    assert(d.rules.length >= 1, "no rules");
    for (const r of d.rules) {
      assert(r.trim().length > 0, "empty rule");
      assert(wordCount(r) <= 22, `rule too long (${wordCount(r)} words): ${r}`);
      assert(!BANNED_CLAIMS.test(r), `claim word in rule: ${r}`);
    }
    for (const text of [d.name, d.diyNote ?? ""])
      assert(!BANNED_CLAIMS.test(text), `claim word in: ${text}`);
  });
});

test("user-facing text carries no research or sourcing meta-language", () => {
  // Sourcing caveats belong in notes/dataset/*.md, not in diyNote or rules.
  const META = /\b(snippets?|search results?|dataset|not found|unverified|we checked|I checked)\b|\bPDF\b/i;
  each((d) => {
    for (const text of [d.diyNote ?? "", ...d.rules]) assert(!META.test(text), `meta text: ${text}`);
  });
});

test("searchTerms: non-empty, trimmed, unique, realistic length", () => {
  each((d) => {
    assert(d.searchTerms.length >= 2, "too few search terms");
    const lower = d.searchTerms.map((t) => t.toLowerCase());
    assert.equal(new Set(lower).size, lower.length, "duplicate search term");
    for (const t of d.searchTerms) {
      assert.equal(t, t.trim(), "untrimmed term");
      assert(t.length >= 4 && t.length <= 70, `odd length: ${t}`);
    }
  });
});

test("Europe DIY claims stay hedged where no source names home prints", () => {
  for (const id of ["nl-passport", "it-passport"]) {
    const d = getDocument(id)!;
    assert.match(d.diyNote ?? "", /Check with/, id);
  }
  assert.equal(getDocument("es-passport"), undefined, "es-passport removed: sources conflict on size");
});

test("au-passport is DIY with a lab-print requirement, matching the legacy preset", () => {
  const d = getDocument("au-passport")!;
  assert.equal(d.diy, "yes");
  assert.match(d.diyNote ?? "", /dye-sublimation/);
  assert.match(d.print?.paper ?? "", /200 gsm/);
});

// ---------------------------------------------------------------- catalog

test("documentPreset for us/uk/au passports equals the legacy presets", () => {
  const near = (a: number | undefined, b: number | undefined, label: string) => {
    if (a === undefined || b === undefined) return assert.equal(a, b, label);
    assert(Math.abs(a - b) < 1e-6, `${label}: ${a} vs ${b}`);
  };
  for (const id of ["us-passport", "uk-passport", "au-passport"]) {
    const legacy = getPreset(id);
    const made = documentPreset(getDocumentById(id)!)!;
    assert(made, `${id} has no preset`);
    for (const k of ["widthMm", "heightMm", "headMinMm", "headMaxMm", "eyeMinMm", "eyeMaxMm"] as const)
      near(made[k], legacy[k], `${id} ${k}`);
    assert.equal(made.backgroundEdit, legacy.backgroundEdit, `${id} backgroundEdit`);
    assert.equal(made.mode, "print");
  }
});

test("legacy online presets map onto dataset ids with the same byte limits", () => {
  for (const [legacyId, docId] of [
    ["us-online", "us-passport-online"],
    ["uk-online", "uk-passport-online"],
  ]) {
    const legacy = getPreset(legacyId);
    const made = documentPreset(getDocument(docId)!)!;
    assert.equal(made.mode, "original");
    assert.equal(made.minBytes, legacy.minBytes, `${docId} minBytes`);
    assert.equal(made.maxBytes, legacy.maxBytes, `${docId} maxBytes`);
  }
});

test("dv-lottery digital target is 600 x 600, at most 240 KB (decimal)", () => {
  const t = documentDigitalTarget(getDocument("dv-lottery")!)!;
  assert(t);
  assert.equal(t.widthPx, 600);
  assert.equal(t.heightPx, 600);
  assert.equal(t.maxKB, 240);
  assert.equal(t.kbBytes, 1000);
  assert.equal(t.format, "jpeg");
});

test("every DIY document yields a studio preset or a digital target", () => {
  each((d) => {
    if (d.diy === "no") {
      assert.equal(documentPreset(d), undefined, "diy no must not yield a preset");
      return;
    }
    const preset = documentPreset(d);
    const target = documentDigitalTarget(d);
    assert(preset || target, "no preset or digital target");
    if (preset) {
      assert(preset.widthMm > 0 && preset.heightMm > 0, "preset size");
      assert.equal(presetForId(d.id)?.id, d.id, "presetForId");
    }
    if (target) assert(target.widthPx > 0 && target.heightPx > 0, "target size");
  });
});

test("searchDocuments finds OCI, Schengen and the US passport", () => {
  assert(searchDocuments("oci").some((d) => d.id === "in-oci"));
  assert.equal(searchDocuments("oci")[0]?.id, "in-oci");
  assert(searchDocuments("schengen").some((d) => d.id === "schengen-visa"));
  assert(searchDocuments("2x2 passport").some((d) => d.id === "us-passport"));
  assert.deepEqual(searchDocuments("   "), []);
});
