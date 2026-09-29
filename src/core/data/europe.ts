import type { DocumentSpec } from "../documents.js";

// kbBytes rule (same in every data file). 1) If the source defines its unit,
// follow it. 2) Otherwise a max-only cap uses 1000, because a file under the
// decimal cap passes under either reading (MB limits convert with the same
// base: 9 MB = 9000 KB at 1000). 3) Otherwise a range with a minimum uses 1024,
// except us-passport-online and uk-passport-online, kept at 1000 to match the
// decimal byte limits in the legacy presets (presets.ts). Encoders should land
// inside the range rather than on an edge.
const checkedAt = "2026-09-28";

// Evidence for every number: notes/dataset/europe.md
export const EUROPE_DOCUMENTS: DocumentSpec[] = [
  {
    id: "uk-passport",
    name: "UK passport (printed)",
    country: "United Kingdom",
    countryCode: "GB",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Prints must look professionally printed and not cut down from a larger picture. A photo lab or booth is the safer route for paper forms.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 29,
      headMaxMm: 34,
      copies: 2,
      paper: "plain white photographic paper, no border",
    },
    background: {
      colors: ["cream", "light grey"],
      edit: "forbidden",
    },
    rules: [
      "Two identical prints for a paper application; no borders, creases or marks.",
      "Taken in the last month, in colour.",
      "Plain expression, mouth closed, eyes open, no shadows on face or behind you.",
      "No glasses unless needed; never tinted, and no frame, glare or reflection over the eyes.",
      "Photo must be unaltered by computer software.",
      "Do not replace or change the background; removing marks or shadows may be tolerated at review.",
    ],
    sources: [
      {
        url: "https://www.gov.uk/photos-for-passports/photo-requirements",
        title: "Get a passport photo: printed photos (GOV.UK)",
        checkedAt,
        kind: "primary",
      },
      {
        url: "https://www.gov.uk/government/publications/photographic-standards/photo-standards-accessible",
        title: "Photo standards: caseworker guidance (GOV.UK)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "uk passport photo size",
      "uk passport photo 35x45",
      "uk passport photo requirements",
      "british passport photo print",
      "hm passport office photo size",
    ],
  },
  {
    id: "uk-passport-online",
    name: "UK passport (online upload)",
    country: "United Kingdom",
    countryCode: "GB",
    kind: "passport",
    diy: "digital-only",
    diyNote:
      "Upload the original photo. The online service crops it, so do not crop or edit it yourself. A helper must take it; no selfies.",
    digital: {
      minWidthPx: 600,
      minHeightPx: 750,
      minKB: 50,
      maxKB: 10000,
      kbBytes: 1000,
      // The page names no file types; browsers can decode these two.
      formats: ["image/jpeg", "image/png"],
      originalOnly: true,
    },
    background: {
      colors: ["light-coloured", "plain"],
      edit: "forbidden",
    },
    rules: [
      "Do not crop your photo; include head, shoulders and upper body.",
      "In colour, clear and in focus, unaltered by computer software.",
      "Taken in the last month, with someone helping you take it.",
      "Plain expression, mouth closed, eyes open and visible, no shadows on face or behind you.",
    ],
    sources: [
      {
        url: "https://www.gov.uk/photos-for-passports",
        title: "Get a passport photo: digital photos (GOV.UK)",
        checkedAt,
        kind: "primary",
      },
      {
        url: "https://www.passport.service.gov.uk/help/photo-rules",
        title: "Rules for digital passport photos (GOV.UK)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "uk passport photo online",
      "uk passport photo upload size",
      "uk passport photo 600x750",
      "digital passport photo uk",
    ],
  },
  {
    id: "uk-visa",
    name: "UK visa or permission (UKVI photo)",
    country: "United Kingdom",
    countryCode: "GB",
    kind: "visa",
    diy: "digital-only",
    diyNote:
      "For applications that ask you to upload a photo of your face. It can come from a phone or tablet; having someone else take it lowers the chance of rejection.",
    digital: {
      minWidthPx: 600,
      minHeightPx: 750,
      minKB: 50,
      maxKB: 6144,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: {
      colors: ["light-coloured", "plain"],
      edit: "forbidden",
    },
    rules: [
      "Vertical orientation; not mirrored or flipped.",
      "Show head, shoulders and upper body, with nobody else in the photo.",
      "Must not be altered by software or a filter; taken in a well-lit room.",
      "Not a photo of another photo, and not the same photo as in your passport.",
      "No shadows on face or behind you; try to have someone else take it.",
    ],
    sources: [
      {
        url: "https://www.gov.uk/guidance/how-to-take-a-photo-for-a-visa-application-or-permission",
        title:
          "Take a photo of your face for a visa application or permission (GOV.UK)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "uk visa photo requirements",
      "ukvi photo upload",
      "uk visa photo size",
      "uk evisa photo",
      "brp photo requirements",
    ],
  },
  {
    id: "schengen-visa",
    name: "Schengen visa",
    country: "Schengen area",
    countryCode: "EU",
    kind: "visa",
    diy: "yes",
    diyNote:
      "Each consulate or visa centre sets its own rules, and some insist on professional prints. Check the one handling your application.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 32,
      headMaxMm: 36,
    },
    background: {
      colors: ["white", "light grey"],
      edit: "unspecified",
    },
    rules: [
      "Face is 70 to 80 percent of the photo, chin to crown, centred.",
      "Recent photo, at most six months old; scans and photocopies are refused.",
      "Even lighting: no shadows on face or background, no red eyes.",
      "Neutral expression, mouth closed, looking straight into the camera.",
      "Backgrounds vary: German missions ask for bright neutral grey, Italian ones for white.",
    ],
    sources: [
      {
        url: "https://kuwait.diplo.de/resource/blob/2079290/153d98a9ab09f4702a0d796b5000a6f6/pdf-bio-photo-data.pdf",
        title: "Schengen visa photo instructions (German embassy)",
        checkedAt,
        kind: "primary",
      },
      {
        url: "https://ambnairobi.esteri.it/wp-content/uploads/2026/05/IT-Schengen-Visa-TOURIST-EU-Checklist-2026-c.pdf",
        title: "Checklist for tourism Schengen visa (Italian embassy Nairobi)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "schengen visa photo",
      "schengen visa photo size",
      "schengen visa photo requirements",
      "35x45 photo",
      "schengen visa photo 35x45 mm",
    ],
  },
  {
    id: "ie-passport",
    name: "Irish passport (printed)",
    country: "Ireland",
    countryCode: "IE",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Paper applications need prints on photo-quality paper. Colour is fine; the passport shows it in black and white.",
    print: {
      widthMm: 35,
      heightMm: 45,
      copies: 4,
      paper: "photo-quality paper, high resolution; back white and unglazed",
    },
    background: {
      colors: ["light grey", "white", "cream"],
      edit: "forbidden",
    },
    rules: [
      "Size may run from 35 x 45 mm up to 38 x 50 mm.",
      "Four identical prints, taken in the last six months.",
      "Show head to mid torso with visible space around the head and shoulders.",
      "No digital enhancements or changes; no ink marks or creases.",
      "Neutral expression, mouth closed, no shadows on face or behind head.",
    ],
    sources: [
      {
        url: "https://www.ireland.ie/en/dfa/passports/photo-guidelines/",
        title: "Photo guidelines for passports (Department of Foreign Affairs)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "irish passport photo size",
      "irish passport photo requirements",
      "ireland passport photo 35x45",
      "irish passport photo print",
    ],
  },
  {
    id: "ie-passport-online",
    name: "Irish passport (online upload)",
    country: "Ireland",
    countryCode: "IE",
    kind: "passport",
    diy: "digital-only",
    diyNote:
      "Take it at home with someone's help: no selfies and no zoom. A photo booth or shop can give you a code or file instead.",
    digital: {
      minWidthPx: 715,
      minHeightPx: 951,
      maxKB: 9000,
      kbBytes: 1000,
      formats: ["image/jpeg"],
    },
    background: {
      colors: ["light grey", "white", "cream"],
      edit: "forbidden",
    },
    rules: [
      "In colour, not a scan, and no compression artefacts or barrel distortion.",
      "Must not be digitally enhanced or changed.",
      "Taken in the last six months.",
      "Show head to mid torso; the upload tool can rotate a sideways photo.",
      "Glasses allowed if frames and glare do not cover the eyes.",
    ],
    sources: [
      {
        url: "https://www.ireland.ie/en/dfa/passports/photo-guidelines/",
        title: "Photo guidelines for passports (Department of Foreign Affairs)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "irish passport photo online",
      "irish passport online photo upload",
      "ireland passport photo 715x951",
      "passport online ireland photo requirements",
    ],
  },
  {
    id: "de-passport",
    name: "German passport or ID card",
    country: "Germany",
    countryCode: "DE",
    kind: "passport",
    diy: "no",
    diyNote:
      "Since 1 May 2025 the photo must be taken digitally at the authority or by a registered photo provider. Paper and home photos are not accepted.",
    background: {
      colors: [],
      edit: "unspecified",
    },
    rules: [
      "Applies to passports, ID cards and residence permit cards.",
      "Providers send the photo to the authority through a secure cloud.",
      "You get a printed Data Matrix code; the authority uses it to retrieve the photo.",
      "Paper photos were accepted only in exceptional cases until 31 July 2025.",
    ],
    sources: [
      {
        url: "https://www.bmi.bund.de/SharedDocs/kurzmeldungen/DE/2025/04/neue-passbilder.html",
        title: "Vereinfachte Ausweisbeantragung ab Mai 2025 (BMI)",
        checkedAt,
        kind: "primary",
      },
      {
        url: "https://www.bmi.bund.de/SharedDocs/faqs/DE/themen/moderne-verwaltung/reisepass/biometrie/09-kein-papier-passbild.html",
        title: "Ab wann kein Papier-Passbild mehr? (BMI)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "passbild digital 2025",
      "german passport photo",
      "biometrisches passbild",
      "german passport photo requirements 2025",
      "passfoto reisepass digital",
    ],
  },
  {
    id: "fr-passport",
    name: "French passport",
    country: "France",
    countryCode: "FR",
    kind: "passport",
    diy: "no",
    diyNote:
      "The photo must be taken by an authorised professional or in a booth using a system authorised by the Interior Ministry.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 32,
      headMaxMm: 36,
      copies: 1,
    },
    background: {
      colors: ["light blue", "light grey"],
      edit: "unspecified",
    },
    rules: [
      "White backgrounds are not allowed; use a plain, light colour.",
      "Photo at most six months old; only one photo is needed.",
      "No shadows on face or background; colour photo strongly recommended.",
      "Bare head, neutral expression, mouth closed, eyes open and visible.",
      "Glasses optional; thin frames, and no tinted lenses or glare.",
    ],
    sources: [
      {
        url: "https://www.service-public.fr/particuliers/vosdroits/F10619",
        title: "Quelle photo fournir pour un titre d'identité ? (Service-Public)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "photo passeport france",
      "photo d'identité passeport norme",
      "french passport photo size",
      "photo passeport 35x45",
      "french passport photo requirements",
    ],
  },
  {
    id: "fr-id-card",
    name: "French national ID card",
    country: "France",
    countryCode: "FR",
    kind: "id-card",
    diy: "no",
    diyNote:
      "The photo must be taken by an authorised professional or in a booth using a system authorised by the Interior Ministry.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 32,
      headMaxMm: 36,
      copies: 1,
    },
    background: {
      colors: ["light blue", "light grey"],
      edit: "unspecified",
    },
    rules: [
      "White backgrounds are not allowed; use a plain, light colour.",
      "Photo at most six months old; only one photo is needed.",
      "No shadows on face or background; colour photo strongly recommended.",
      "Bare head, neutral expression, mouth closed, eyes open and visible.",
      "Glasses optional; thin frames, and no tinted lenses or glare.",
    ],
    sources: [
      {
        url: "https://www.service-public.fr/particuliers/vosdroits/F10619",
        title: "Quelle photo fournir pour un titre d'identité ? (Service-Public)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "photo carte d'identité",
      "photo carte nationale d'identité norme",
      "french id card photo",
      "photo cni 35x45",
    ],
  },
  {
    id: "nl-passport",
    name: "Dutch passport or ID card",
    country: "Netherlands",
    countryCode: "NL",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Nothing in the printed-photo rules says who must take it. Check with your municipality; many people use a photographer or booth. Head height is smaller than the usual 32 to 36 mm.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 26,
      headMaxMm: 30,
      paper: "high-quality, smooth photo paper, at least 400 dpi",
    },
    background: {
      colors: ["light grey", "light blue", "white"],
      edit: "forbidden",
    },
    rules: [
      "Face width 16 to 20 mm; head fully shown and centred.",
      "Colour photo, at most six months old; black and white is not allowed.",
      "Plain background in one even shade; no shadow on face or background.",
      "Neutral expression, mouth closed, looking straight at the camera.",
      "Transparent glasses only, with no glare or shadow over the eyes.",
    ],
    sources: [
      {
        url: "https://www.government.nl/topics/identification-documents/requirements-for-photos",
        title: "Requirements for ID photos (Government.nl)",
        checkedAt,
        kind: "primary",
      },
      {
        url: "https://www.netherlandsworldwide.nl/passport-id-card/photo-requirements",
        title: "Photo requirements for Dutch passports and identity cards",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "dutch passport photo",
      "pasfoto eisen",
      "netherlands passport photo size",
      "dutch passport photo requirements",
      "pasfoto paspoort 35x45",
    ],
  },
  {
    id: "it-passport",
    name: "Italian passport",
    country: "Italy",
    countryCode: "IT",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Nothing in the printed-photo rules says who must take it. Check with the issuing office; many people use a photographer or booth.",
    print: {
      widthMm: 35,
      heightMm: 45,
      copies: 1,
      paper: "high-quality, high-resolution photo paper",
    },
    background: {
      colors: ["white"],
      edit: "unspecified",
    },
    rules: [
      "Face covers 70 to 80 percent of the photo, chin to forehead.",
      "Recent photo, at most six months old, in colour.",
      "Even light with no flash reflections, shadows or red eyes.",
      "Neutral expression, mouth closed, looking straight at the camera.",
      "One photo is needed for the application.",
    ],
    sources: [
      {
        url: "https://www.poliziadistato.it/articolo/10301",
        title: "Il rilascio del passaporto (Polizia di Stato)",
        checkedAt: checkedAt,
        kind: "primary",
      },
      {
        url: "https://www.esteri.it/en/servizi-opportunita/italiani-all-estero/documenti_di_viaggio/linee-guida-foto-icao/",
        title: "Linee guida foto ICAO (Ministero degli Affari Esteri)",
        checkedAt,
        kind: "primary",
      },
    ],
    searchTerms: [
      "foto passaporto italiano misure",
      "italian passport photo",
      "foto tessera passaporto 35x45",
      "italian passport photo requirements",
    ],
  },
];
