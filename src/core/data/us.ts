import type { DocumentSpec } from "../documents.js";

// United States photo specs. Evidence for every number: notes/dataset/us.md.
// travel.state.gov blocks automated fetches (Cloudflare 403), so State
// Department numbers come from search-result text on that domain plus
// 8 FAM 402.1 (fam.state.gov). USCIS numbers come from the form instructions.
// kbBytes rule (same in every data file). 1) If the source defines its unit,
// follow it. 2) Otherwise a max-only cap uses 1000, because a file under the
// decimal cap passes under either reading (MB limits convert with the same
// base: 9 MB = 9000 KB at 1000). 3) Otherwise a range with a minimum uses 1024,
// except us-passport-online and uk-passport-online, kept at 1000 to match the
// decimal byte limits in the legacy presets (presets.ts). Encoders should land
// inside the range rather than on an edge.
const CHECKED = "2026-09-28";

const INCH = 25.4;
const HEAD_MIN = 1 * INCH; // 1 in
const HEAD_MAX = 1.375 * INCH; // 1 3/8 in
const EYE_MIN = 1.125 * INCH; // 1 1/8 in from the bottom
const EYE_MAX = 1.375 * INCH; // 1 3/8 in from the bottom

const PASSPORT_PHOTOS_URL =
  "https://travel.state.gov/content/travel/en/passports/how-apply/photos.html";
const FAM_URL = "https://fam.state.gov/FAM/08FAM/08FAM040201.html";
const VISA_PHOTOS_URL =
  "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html";

const USCIS_NOTE =
  "Some USCIS steps take the photo at a biometrics appointment instead.";

export const US_DOCUMENTS: DocumentSpec[] = [
  {
    id: "us-passport",
    name: "US passport",
    country: "United States",
    countryCode: "US",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Home photos are accepted, but not selfies: have someone else take it or use a tripod. Print on photo-quality paper.",
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      paper: "photo-quality paper",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Color photo taken within the last 6 months.",
      "Head from top of hair to chin: 1 to 1 3/8 in.",
      "Face the camera, neutral expression or natural smile, both eyes open.",
      "Eyeglasses are not accepted, except rarely for a medical reason with a statement.",
      "No filters, retouching, software or AI changes to the photo.",
      "No uniforms; hats and head coverings only for religious or medical reasons.",
    ],
    sources: [
      {
        url: PASSPORT_PHOTOS_URL,
        title: "U.S. Passport Photos (travel.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: FAM_URL,
        title: "8 FAM 402.1 Passport Photographs (fam.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "us passport photo",
      "2x2 passport photo",
      "passport photo size us",
      "us passport photo requirements",
      "passport photo 2x2 inches",
      "print passport photo at home",
    ],
  },
  {
    id: "us-passport-online",
    name: "US passport online renewal",
    country: "United States",
    countryCode: "US",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Upload the original, unedited camera file. Do not crop, resize or filter it, and do not photograph a printed photo.",
    digital: {
      minKB: 54,
      maxKB: 10000,
      kbBytes: 1000,
      formats: ["image/jpeg", "image/png", "image/heic", "image/heif"],
      originalOnly: true,
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Accepted files: JPG, JPEG, PNG, HEIC or HEIF.",
      "File size between 54 KB and 10 MB.",
      "One color photo taken within the last 6 months.",
      "Face the camera directly, head centered, both eyes open and visible.",
      "No filters or retouching tools; no scan or photo of a printed photo.",
    ],
    sources: [
      {
        url: "https://travel.state.gov/content/travel/en/passports/how-apply/online-renewal-photo.html",
        title: "Uploading a Digital Photo (travel.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: FAM_URL,
        title: "8 FAM 402.1 Passport Photographs (fam.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "us passport online renewal photo",
      "renew passport online photo",
      "passport renewal photo upload",
      "passport photo upload size",
      "digital passport photo us",
    ],
  },
  {
    id: "us-passport-card",
    name: "US passport card",
    country: "United States",
    countryCode: "US",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Same photo rules as the passport book. Someone else takes the photo, or use a tripod; no selfies.",
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      paper: "photo-quality paper",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Uniform or camouflage-style clothing is not accepted for passport books and cards.",
      "Color photo taken within the last 6 months.",
      "Head from top of hair to chin: 1 to 1 3/8 in.",
      "Eyeglasses are not accepted, except rarely for a medical reason.",
      "No filters, retouching, software or AI changes to the photo.",
    ],
    sources: [
      {
        url: FAM_URL,
        title: "8 FAM 402.1 Passport Photographs (fam.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: PASSPORT_PHOTOS_URL,
        title: "U.S. Passport Photos (travel.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "us passport card photo",
      "passport card photo size",
      "passport card photo requirements",
      "2x2 passport card photo",
    ],
  },
  {
    id: "us-visa",
    name: "US visa (DS-160)",
    country: "United States",
    countryCode: "US",
    kind: "visa",
    diy: "yes",
    diyNote:
      "Upload a digital photo with the DS-160. If the upload fails, bring one printed 2x2 in photo with the confirmation page.",
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      copies: 1,
    },
    digital: {
      aspect: 1,
      minWidthPx: 600,
      minHeightPx: 600,
      maxWidthPx: 1200,
      maxHeightPx: 1200,
      maxKB: 240,
      kbBytes: 1000,
      formats: ["image/jpeg"],
      headRatioMin: 0.5,
      headRatioMax: 0.69,
      eyeRatioMin: 0.56,
      eyeRatioMax: 0.69,
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Digital image: JPEG, square, 600 to 1200 pixels per side, 240 kB or less.",
      "Do not digitally enhance or alter the photo to change your appearance.",
      "Head from top of hair to chin: 50% to 69% of image height.",
      "Eye line: 56% to 69% of image height, measured from the bottom.",
      "Photo taken within the last 6 months, showing your current appearance.",
      "Eyeglasses are no longer allowed in new visa photos, except rare medical cases.",
    ],
    sources: [
      {
        url: VISA_PHOTOS_URL,
        title: "Photo Requirements (travel.state.gov, visas)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/photo-composition-template.html",
        title: "Photo Composition Template (travel.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html",
        title: "DS-160: Frequently Asked Questions (travel.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "us visa photo",
      "ds-160 photo",
      "ds 160 photo requirements",
      "us visa photo size",
      "us visa photo 600x600",
      "us visa photo 240 kb",
    ],
  },
  {
    id: "dv-lottery",
    name: "Diversity Visa (DV) lottery",
    country: "United States",
    countryCode: "US",
    kind: "lottery",
    diy: "digital-only",
    diyNote: "Digital entry photo only; nothing is printed.",
    digital: {
      aspect: 1,
      widthPx: 600,
      heightPx: 600,
      maxKB: 240,
      kbBytes: 1000,
      formats: ["image/jpeg"],
      headRatioMin: 0.5,
      headRatioMax: 0.69,
      eyeRatioMin: 0.56,
      eyeRatioMax: 0.69,
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Digital image: JPEG, square, 600 x 600 pixels, 240 kB or less.",
      "Entries with manipulated photos are ineligible; no digital enhancement.",
      "Head from top of hair to chin: 50% to 69% of image height.",
      "Eye line: 56% to 69% of image height, measured from the bottom.",
      "Photo taken within the last 6 months, plain white or off-white background.",
    ],
    sources: [
      {
        url: "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-instructions.html",
        title: "Diversity Visa Instructions (travel.state.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: VISA_PHOTOS_URL,
        title: "Photo Requirements (travel.state.gov, visas)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "dv lottery photo",
      "diversity visa photo",
      "dv lottery photo size",
      "dv lottery photo requirements",
      "green card lottery photo",
      "dv 2027 photo",
    ],
  },
  {
    id: "us-green-card",
    name: "US green card application (I-485)",
    country: "United States",
    countryCode: "US",
    kind: "residence",
    diy: "yes",
    diyNote:
      "Form I-485 instructions ask for two identical printed photos: glossy thin paper, unmounted, unretouched. " +
      USCIS_NOTE,
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      copies: 2,
      paper: "thin paper, glossy finish, unmounted",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Two identical color passport-style photos taken recently.",
      "Photos must be unmounted and unretouched: no editing or digital enhancement.",
      "Head from top of hair to chin: 1 to 1 3/8 in.",
      "Eye height from bottom of photo: 1 1/8 to 1 3/8 in.",
      "Head bare unless headwear is required by your religious denomination.",
      "Lightly print your name and A-Number on the back with pencil or felt pen.",
    ],
    sources: [
      {
        url: "https://www.uscis.gov/sites/default/files/document/forms/i-485instr.pdf",
        title: "Instructions for Form I-485 (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.uscis.gov/i-765",
        title: "Form I-765 page, photo alert (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "green card photo",
      "i-485 photo",
      "i-485 passport photo requirements",
      "adjustment of status photo",
      "uscis photo 2x2",
    ],
  },
  {
    id: "us-ead",
    name: "US work permit (EAD, I-765)",
    country: "United States",
    countryCode: "US",
    kind: "residence",
    diy: "yes",
    diyNote:
      "Form I-765 instructions ask for two identical printed photos: glossy thin paper, unmounted, unretouched.",
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      copies: 2,
      paper: "thin paper, glossy finish, unmounted",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Two identical color passport-style photos taken recently.",
      "Photos must be unmounted and unretouched: no editing or digital enhancement.",
      "Head from top of hair to chin: 1 to 1 3/8 in.",
      "Eye height from bottom of photo: 1 1/8 to 1 3/8 in.",
      "Head bare unless headwear is required by your religious denomination.",
      "Lightly print your name and A-Number on the back with pencil or felt pen.",
    ],
    sources: [
      {
        url: "https://www.uscis.gov/sites/default/files/document/forms/i-765instr.pdf",
        title: "Instructions for Form I-765 (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.uscis.gov/i-765",
        title: "Form I-765 page, photo alert (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "ead photo",
      "i-765 photo",
      "work permit photo",
      "employment authorization photo requirements",
      "i-765 passport photo size",
    ],
  },
  {
    id: "us-travel-document",
    name: "US advance parole / refugee travel document (I-131)",
    country: "United States",
    countryCode: "US",
    kind: "other",
    diy: "yes",
    diyNote:
      "Applies to Advance Parole, TPS travel authorization and Refugee Travel Document filings. A digital photo must come from a camera of at least 3.5 megapixels.",
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      copies: 2,
      paper: "thin paper, glossy finish, unmounted",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Two identical color passport-style photos taken recently.",
      "Photos must be unmounted and unretouched.",
      "Head from top of hair to chin: 1 to 1 3/8 in.",
      "Eye height from bottom of photo: 1 1/8 to 1 3/8 in.",
      "A digital photo must come from a camera of at least 3.5 megapixels.",
      "Lightly print your name and A-Number on the back with pencil or felt pen.",
    ],
    sources: [
      {
        url: "https://www.uscis.gov/sites/default/files/document/forms/i-131instr.pdf",
        title: "Instructions for Form I-131 (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.uscis.gov/i-131",
        title: "Form I-131 page (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "i-131 photo",
      "advance parole photo",
      "refugee travel document photo",
      "travel document photo requirements",
      "i-131 passport photo size",
    ],
  },
  {
    id: "us-naturalization",
    name: "US naturalization (N-400)",
    country: "United States",
    countryCode: "US",
    kind: "citizenship",
    diy: "no",
    diyNote:
      "Most N-400 applicants inside the US do not send photos: USCIS takes the photo at the biometrics appointment. Applicants abroad (certain military and overseas categories) send two printed photos.",
    print: {
      widthMm: 2 * INCH,
      heightMm: 2 * INCH,
      headMinMm: HEAD_MIN,
      headMaxMm: HEAD_MAX,
      eyeMinMm: EYE_MIN,
      eyeMaxMm: EYE_MAX,
      copies: 2,
      paper: "thin paper, glossy finish, unmounted",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Photos are required only for applicants filing from outside the United States.",
      "Two identical color passport-style photos taken recently, unmounted and unretouched.",
      "Head from top of hair to chin: 1 to 1 3/8 in.",
      "Eye height from bottom of photo: 1 1/8 to 1 3/8 in.",
      "USCIS may later ask for physical photos after filing.",
    ],
    sources: [
      {
        url: "https://www.uscis.gov/sites/default/files/document/forms/n-400instr.pdf",
        title: "Instructions for Form N-400 (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.uscis.gov/n-400",
        title: "Form N-400 page (uscis.gov)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "n-400 photo",
      "naturalization photo",
      "citizenship application photo",
      "n-400 passport photo requirements",
    ],
  },
];
