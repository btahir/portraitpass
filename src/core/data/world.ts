import type { DocumentSpec } from "../documents.js";

// Rest-of-world entries. Evidence (URL + quote/location per number) is logged
// in notes/dataset/world.md. Omitted fields were not stated by the source.
// kbBytes rule (same in every data file). 1) If the source defines its unit,
// follow it. 2) Otherwise a max-only cap uses 1000, because a file under the
// decimal cap passes under either reading (MB limits convert with the same
// base: 9 MB = 9000 KB at 1000). 3) Otherwise a range with a minimum uses 1024,
// except us-passport-online and uk-passport-online, kept at 1000 to match the
// decimal byte limits in the legacy presets (presets.ts). Encoders should land
// inside the range rather than on an edge.
const CHECKED = "2026-09-28";

export const WORLD_DOCUMENTS: DocumentSpec[] = [
  {
    id: "ca-passport",
    name: "Canada passport",
    country: "Canada",
    countryCode: "CA",
    kind: "passport",
    diy: "no",
    diyNote:
      "Must be taken in person by a commercial photographer or studio, who adds their details on the back. Home prints are refused.",
    print: {
      widthMm: 50,
      heightMm: 70,
      headMinMm: 31,
      headMaxMm: 36,
      copies: 2,
      paper: "professionally printed on plain, high-quality photographic paper",
    },
    background: { colors: ["plain white", "light-coloured"], edit: "forbidden" },
    rules: [
      "Two identical, unaltered photos are required.",
      "Photo editing software, filters and AI tools are not allowed.",
      "Neutral expression with mouth closed.",
      "Glasses allowed if eyes are clearly visible and lenses have no glare.",
      "Sunglasses and tinted lenses are refused.",
    ],
    sources: [
      {
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html",
        title: "Passport photo requirements - Canada.ca",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "canada passport photo",
      "canada passport photo size",
      "canadian passport photo requirements 50x70",
    ],
  },
  {
    id: "ca-visa",
    name: "Canada visitor visa (TRV)",
    country: "Canada",
    countryCode: "CA",
    kind: "visa",
    diy: "yes",
    diyNote:
      "No photographer is required. Digital photos must not be altered. Follow the online form's own rules for upload size.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 31,
      headMaxMm: 36,
      copies: 2,
      paper: "quality photographic paper",
    },
    background: { colors: ["plain white", "light-coloured"], edit: "forbidden" },
    rules: [
      "Frame is at least 35 x 45 mm; head and top of shoulders shown.",
      "Taken within the last six months.",
      "Neutral expression, mouth closed.",
      "Non-tinted glasses allowed if the frame does not cover the eyes.",
      "If digital, the photo must not be altered in any way.",
    ],
    sources: [
      {
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/temporary-resident-visa-application-photograph-specifications.html",
        title: "Temporary Resident Visa application photograph specifications - Canada.ca",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "canada visa photo size",
      "canada visitor visa photo requirements",
      "canada visa photo 35x45",
    ],
  },
  {
    id: "ca-pr",
    name: "Canada permanent resident card",
    country: "Canada",
    countryCode: "CA",
    kind: "residence",
    diy: "no",
    diyNote:
      "IRCC says to go to a commercial photographer or studio, even for the digital copy. Paper photos need the studio's name, address and date on the back.",
    print: {
      widthMm: 50,
      heightMm: 70,
      headMinMm: 31,
      headMaxMm: 36,
      copies: 2,
      paper: "professionally printed on plain, high-quality photo paper",
    },
    digital: {
      minWidthPx: 715,
      minHeightPx: 1000,
      maxWidthPx: 2000,
      maxHeightPx: 2800,
      maxKB: 4000,
      kbBytes: 1000,
      formats: ["image/jpeg"],
      originalOnly: true,
    },
    background: { colors: ["plain white"], edit: "forbidden" },
    rules: [
      "Online applications take one digital photo; paper applications take two identical photos.",
      "Photo taken no more than 12 months before you apply.",
      "Neutral expression, mouth closed, eyes open, looking at the camera.",
      "Photo must not be copied from another photo or altered in any way.",
    ],
    sources: [
      {
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/card/photos.html",
        title: "Permanent resident photos - Canada.ca",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "canada pr card photo",
      "canada permanent resident photo requirements",
      "canada pr photo size 50x70",
    ],
  },
  {
    id: "au-passport",
    name: "Australia passport",
    country: "Australia",
    countryCode: "AU",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Prints must be dye-sublimation on glossy paper of at least 200 gsm, so have a photo lab print it; home printers do not meet this. A professional passport photo provider is recommended, not required; apps and online services are discouraged.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 32,
      headMaxMm: 36,
      copies: 2,
      paper: "glossy, heavy-weight, dye-sublimation, 200 gsm minimum",
    },
    background: { colors: ["plain white", "light grey"], edit: "forbidden" },
    rules: [
      "Print width may be 35-40 mm and height 45-50 mm.",
      "Two photos are needed, clear and unedited.",
      "Smoothing skin, brightening the background or removing shadows can affect biometric checks.",
      "Face forward, neutral expression, no shadows on face or background.",
    ],
    sources: [
      {
        url: "https://www.passports.gov.au/PhotoGuidelines",
        title: "Passport photos | Australian Passport Office",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.passports.gov.au/sites/default/files/2024-12/CameraOperatorGuide_A4-2025_1.pdf",
        title: "Camera Operator Guidelines (passports.gov.au)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://uk.embassy.gov.au/lhlh/passportPhotos.html",
        title: "Passport photos (Australian High Commission, London)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://hcmc.vietnam.embassy.gov.au/files/hchi/passport-photo-guidelines.pdf",
        title: "Australian Passport Photos Guidelines (Consulate-General, Ho Chi Minh City)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "australian passport photo",
      "australia passport photo size",
      "australian passport photo requirements 35x45",
    ],
  },
  {
    id: "au-visa",
    name: "Australia visa",
    country: "Australia",
    countryCode: "AU",
    kind: "visa",
    diy: "yes",
    diyNote:
      "Home Affairs recommends a professional passport photo provider but does not require one.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 32,
      headMaxMm: 36,
    },
    background: { colors: ["neutral", "light grey"], edit: "forbidden" },
    rules: [
      "Recent passport photo, 45 x 35 mm, head and shoulders only, facing the camera.",
      "Taken within the last six months, in colour, and unedited.",
      "Background must contrast with your face.",
      "Glasses off unless medically necessary; frames must not obscure the eyes.",
    ],
    sources: [
      {
        url: "https://immi.homeaffairs.gov.au/help-text/evidence/Pages/et-h0050.aspx",
        title: "Photograph - Passport (Department of Home Affairs)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "australia visa photo size",
      "australian visa photo requirements",
      "australia visa photo 35x45",
    ],
  },
  {
    id: "nz-passport",
    name: "New Zealand passport",
    country: "New Zealand",
    countryCode: "NZ",
    kind: "passport",
    diy: "digital-only",
    diyNote: "Online applications take an uploaded photo; selfies are not accepted.",
    digital: {
      minWidthPx: 900,
      maxWidthPx: 4500,
      minHeightPx: 1200,
      maxHeightPx: 6000,
      aspect: 0.75,
      minKB: 250,
      maxKB: 5120,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: [], edit: "unspecified" },
    rules: [
      "Portrait orientation, 3:4 (4:3 on a computer screen).",
      "Colour photo taken within the last 6 months.",
      "Selfies are not accepted.",
      "Use the passports.govt.nz online photo checker before uploading.",
    ],
    sources: [
      {
        url: "https://www.passports.govt.nz/passport-photos/online-photo-checker-technical-help/",
        title: "Check your photo meets the technical requirements | New Zealand Passports",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "new zealand passport photo",
      "nz passport photo requirements",
      "nz passport online photo size pixels",
    ],
  },
  {
    id: "cn-visa",
    name: "China visa",
    country: "China",
    countryCode: "CN",
    kind: "visa",
    diy: "yes",
    diyNote:
      "Print on glossy photo paper (not matte) for the paper form; the online form takes a JPEG upload within the pixel and size limits.",
    print: {
      widthMm: 33,
      heightMm: 48,
      headMinMm: 28,
      headMaxMm: 33,
      paper: "glossy finish photo paper, not matte or plain paper",
    },
    digital: {
      maxWidthPx: 354,
      maxHeightPx: 472,
      minKB: 40,
      maxKB: 120,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: ["white", "close to white"], edit: "unspecified" },
    rules: [
      "Head width 15-22 mm; no edge frame around the photo.",
      "Taken within the last 6 months, in colour, natural tone.",
      "Neutral expression, eyes open, lips closed, ears visible.",
      "Head tilt at most 20 degrees sideways and 25 degrees up or down.",
      "Glasses allowed except thick-rimmed, tinted or glare glasses.",
    ],
    sources: [
      {
        url: "https://visaforchina.cn/SYD3_EN/qianzhengyewu/jichuzhishi/changjianwenti/355135188537315328.html",
        title: "Photo requirements - Chinese Visa Application Service Center",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.visaforchina.cn/MAN3_EN/qianzhengyewu/jichuzhishi/changjianwenti/164185152103256105.html",
        title: "How to upload the photo when filling in the online application form? - Chinese Visa Application Service Center",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "china visa photo size",
      "china visa photo requirements",
      "china visa photo 33x48",
      "china visa online photo upload size",
    ],
  },
  {
    id: "jp-visa",
    name: "Japan visa",
    country: "Japan",
    countryCode: "JP",
    kind: "visa",
    diy: "yes",
    diyNote:
      "Size depends on the embassy: most say 45 x 35 mm (35 wide, 45 high), the Embassy in India says 45 x 45 mm, and US consulates also take 2 x 2 in. Check the one handling your application.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 32,
      headMaxMm: 36,
    },
    background: { colors: ["white"], edit: "forbidden" },
    rules: [
      "Taken within six months before you apply, front view, no hat.",
      "Dark, busy or patterned backgrounds are not accepted.",
      "Photos that are digitally modified are not accepted.",
      "Write your full name and date of birth on the back.",
      "Head height 32-36 mm where an embassy states it; not every embassy does.",
    ],
    sources: [
      {
        url: "https://www.yu.emb-japan.go.jp/visa/Documents_List_2025/Standards_Application_Form_Photos_2025.pdf",
        title: "Standards for application form photo (Embassy of Japan in Serbia)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.denver.us.emb-japan.go.jp/itpr_en/visa12.html",
        title: "Visa photo size (Consulate-General of Japan in Denver)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.mumbai.in.emb-japan.go.jp/en/visa/photo.html",
        title: "Photograph Standard - Embassy of Japan in India (Mumbai)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.mofa.go.jp/files/000124525.pdf",
        title: "Visa application form to enter Japan (Ministry of Foreign Affairs)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "japan visa photo size",
      "japan visa photo 45x35",
      "japan visa photo requirements",
    ],
  },
  {
    id: "ph-passport",
    name: "Philippines passport",
    country: "Philippines",
    countryCode: "PH",
    kind: "passport",
    diy: "no",
    diyNote:
      "The photo is taken on site at your DFA appointment; do not bring your own. Wear decent attire.",
    background: { colors: [], edit: "unspecified" },
    rules: [
      "Photo, fingerprints and signature are captured at the appointment.",
      "All applicants, of any age, must appear in person.",
    ],
    sources: [
      {
        url: "https://shanghaipcg.dfa.gov.ph/consular-services/passport",
        title: "Passport - Philippine Consulate General in Shanghai (DFA)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://passport.gov.ph/faqs_2",
        title: "Frequently Asked Questions - DFA passport appointment system",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "philippines passport photo",
      "philippine passport photo requirements",
      "dfa passport photo",
    ],
  },
  {
    id: "kr-visa",
    name: "South Korea visa",
    country: "South Korea",
    countryCode: "KR",
    kind: "visa",
    diy: "yes",
    diyNote:
      "Missions differ. Los Angeles and Finland set no photographer rule, but some missions (Montreal, for example) ask for a commercial photographer with the date stamped on the back. Check your mission.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 25,
      headMaxMm: 35,
    },
    background: { colors: ["white", "off-white", "plain light"], edit: "unspecified" },
    rules: [
      "Colour photo, plain and evenly lit background, no marks or creases.",
      "Taken within the last 6 months, looking directly at the camera.",
      "No sunglasses or hats, except for medical or religious reasons.",
      "Photos matching a passport photo from the last six months may be rejected.",
      "Some missions also accept 2 x 2 in.",
    ],
    sources: [
      {
        url: "https://overseas.mofa.go.kr/us-losangeles-en/brd/m_4394/view.do?seq=725383",
        title: "Photo Requirements for Korean Visa Application - Consulate General of Korea in Los Angeles",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://overseas.mofa.go.kr/fi-en/brd/m_9574/view.do?seq=754946",
        title: "Photo Requirements for a Visa - Embassy of Korea in Finland",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://overseas.mofa.go.kr/us-sanfrancisco-en/brd/m_24317/view.do?seq=16&page=1",
        title: "C-3-9 Visa (Tourist visa) - Consulate General of Korea in San Francisco",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://usa.mofa.go.kr/ca-montreal-en/brd/m_4447/view.do?seq=754350",
        title: "F-4 Visa - Consulate General of Korea in Montreal (photographer rule)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "korea visa photo size",
      "south korea visa photo requirements",
      "korean visa photo 35x45",
    ],
  },
  {
    id: "za-passport",
    name: "South Africa passport",
    country: "South Africa",
    countryCode: "ZA",
    kind: "passport",
    diy: "no",
    diyNote:
      "South African missions ask for professionally taken colour photos. Check with your mission before ordering.",
    print: {
      widthMm: 35,
      heightMm: 45,
      headMinMm: 29,
      headMaxMm: 34,
      copies: 4,
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "Full face, head and shoulders only, mouth closed.",
      "No glasses; forehead clear of hair.",
    ],
    sources: [
      {
        url: "https://dirco.gov.za/japan/wp-content/uploads/sites/59/2024/08/Photograph-specifications-for-passports.pdf",
        title: "Photograph specifications for passports - DIRCO",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://dirco.gov.za/sweden/first-id-document-adult-passport/",
        title: "First ID Document & Adult Passport - South African Embassy Stockholm",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "south africa passport photo",
      "south african passport photo size 35x45",
      "south africa passport photo requirements",
    ],
  },
  {
    id: "ae-icp",
    name: "UAE ICP services photo",
    country: "United Arab Emirates",
    countryCode: "AE",
    kind: "other",
    diy: "yes",
    diyNote:
      "Photo spec for UAE ICP e-services (visa and residence). Use a printed photo on high quality paper.",
    print: {
      widthMm: 35,
      heightMm: 45,
    },
    background: { colors: ["white", "plain light-coloured"], edit: "unspecified" },
    rules: [
      "Width 35-40 mm; face takes up 70-80% of the photograph.",
      "Taken no more than 6 months ago, looking directly at the camera.",
      "Neutral expression, eyes open and visible, no hat or sunglasses.",
      "Both edges of the face visible, no shadows or flash reflections.",
    ],
    sources: [
      {
        url: "https://smartservices.icp.gov.ae/echannels/web/client/manual/icao/icao_english.pdf",
        title: "Personal Photo Specifications - UAE ICP",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "uae visa photo size",
      "uae visa photo requirements",
      "uae residence visa photo 4.5x3.5",
    ],
  },
];
