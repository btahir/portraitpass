import type { DocumentSpec } from "../documents.js";

// South Asia photo specs. Evidence for every number: notes/dataset/south-asia.md.
// Pakistan (NADRA, DGI&P), epassport.gov.bd and VFS block automated fetches
// (Akamai 403). Pakistan numbers come from search-result text on the official
// domains, not from a direct page fetch, and are logged as such.
// Exam entries follow the latest notice found (2026 cycle); exam bodies change
// their rules each cycle, so each rule set is tied to that notice.
// kbBytes rule (same in every data file). 1) If the source defines its unit,
// follow it. 2) Otherwise a max-only cap uses 1000, because a file under the
// decimal cap passes under either reading (MB limits convert with the same
// base: 9 MB = 9000 KB at 1000). 3) Otherwise a range with a minimum uses 1024,
// except us-passport-online and uk-passport-online, kept at 1000 to match the
// decimal byte limits in the legacy presets (presets.ts). Encoders should land
// inside the range rather than on an edge.
const CHECKED = "2026-09-28";

const NTA_LIVE_NOTE =
  "The application also asks for a live photo taken with your webcam or phone, so an uploaded file is not the only photo.";

export const SOUTH_ASIA_DOCUMENTS: DocumentSpec[] = [
  // ---------------------------------------------------------------- India
  {
    id: "in-passport",
    name: "India passport (applied in India)",
    country: "India",
    countryCode: "IN",
    kind: "passport",
    diy: "no",
    diyNote:
      "No photo is needed at a Passport Seva Kendra or Post Office PSK; the photo is taken there. Only District Passport Cell, speed-post or citizen-service-centre submissions take a printed photo.",
    print: {
      widthMm: 35,
      heightMm: 45,
      copies: 1,
      paper: "good quality photo paper, continuous-tone print",
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "Printed photo is only for DPC, speed-post or CSC submissions; not needed at a PSK or POPSK.",
      "Printed photo size: 4.5 cm high by 3.5 cm wide, colour, one photo.",
      "Computer prints are not accepted; use a photo-paper print.",
      "Both ears and full face visible, natural expression, eyes open.",
      "Head coverings only for religious reasons, with the face clearly visible.",
      "Children under 4: colour photo 45 mm by 35 mm, face 80 to 85 percent, white background.",
    ],
    sources: [
      {
        url: "https://www.passportindia.gov.in/AppOnlineProject/pdf/ApplicationformInstructionBooklet-V3.0.pdf",
        title: "Passport application form instruction booklet (Passport Seva)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://passportindia.gov.in/AppOnlineProject/pdf/GUIDELINES%20FOR%20CAPTURING%20PHOTOGRAPHS%20FOR%20MINORS_v2.1.pdf",
        title: "Guidelines for capturing photographs for minors below 4 years (Passport Seva)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "indian passport photo size",
      "passport size photo 35x45 mm",
      "india passport photo requirements",
      "passport seva photo",
      "baby passport photo india",
    ],
  },
  {
    id: "in-passport-abroad",
    name: "India passport and consular services (applied abroad)",
    country: "India",
    countryCode: "IN",
    kind: "passport",
    diy: "yes",
    diyNote:
      "Printed photo, ideally from a professional studio; ordinary-printer and Polaroid prints are unsuitable. Missions differ (some list 35 x 35 mm), so check your mission or visa-centre checklist.",
    print: {
      widthMm: 51,
      heightMm: 51,
      headMinMm: 35,
      headMaxMm: 40,
      paper: "thin photo paper, continuous-tone print",
    },
    background: { colors: ["white", "off-white"], edit: "forbidden" },
    rules: [
      "Colour photo, 2 x 2 in (51 x 51 mm), full face, front view, eyes open.",
      "Head from top of hair to chin: 1.4 to 1.6 in (35 to 40 mm).",
      "Do not retouch, enhance or soften the photo.",
      "No tinted or dark glasses; avoid glare on eyeglasses.",
      "Head coverings only for religious reasons, with the face clearly shown.",
      "Photo must show both ears, neck and shoulders and no shadows.",
    ],
    sources: [
      {
        url: "https://www.cgisf.gov.in/content/1553603117PHOTO_GUIDELINES.pdf",
        title: "Photo specification and guidelines (Consulate General of India, San Francisco)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "indian passport renewal photo usa",
      "india passport photo 2x2 inch",
      "51x51 mm passport photo",
      "vfs india passport photo",
      "indian consulate passport photo size",
    ],
  },
  {
    id: "in-oci",
    name: "India OCI card (online upload)",
    country: "India",
    countryCode: "IN",
    kind: "residence",
    diy: "digital-only",
    digital: {
      minWidthPx: 200,
      minHeightPx: 200,
      maxWidthPx: 900,
      maxHeightPx: 900,
      aspect: 1,
      maxKB: 200,
      kbBytes: 1000,
      formats: ["image/jpeg"],
    },
    background: { colors: ["plain light colour (not white)"], edit: "unspecified" },
    rules: [
      "Square photo, JPEG or JPG, at most 200 KB.",
      "200 x 200 to 900 x 900 pixels.",
      "Plain light-coloured background, not white, and no border.",
      "Head and shoulders, full face, in the middle of the frame.",
      "Where a physical print is asked for: at least 51 x 51 mm, face covering 80 percent.",
    ],
    sources: [
      {
        url: "https://ociservices.gov.in/onlineOCI/faq",
        title: "OCI FAQ: photograph and signature (ociservices.gov.in)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "oci photo requirements",
      "oci photo size in pixels",
      "oci card photo upload",
      "oci photo 200kb",
      "oci photo resize",
    ],
  },
  {
    id: "in-evisa",
    name: "India e-Visa (online upload)",
    country: "India",
    countryCode: "IN",
    kind: "visa",
    diy: "digital-only",
    digital: {
      aspect: 1,
      minKB: 10,
      maxKB: 1024,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: ["plain light colour", "white"], edit: "unspecified" },
    rules: [
      "JPEG, 10 KB to 1 MB; height and width must be equal.",
      "Full face, front view, eyes open and without spectacles.",
      "Centre the head and show it from top of hair to chin.",
      "No shadows on the face or background, and no borders.",
      "Regular visa applications use different limits: 10 to 300 KB and 350 to 1000 px.",
    ],
    sources: [
      {
        url: "https://indianvisaonline.gov.in/evisa/tvoa.html",
        title: "Indian e-Visa: instructions and photo requirements (indianvisaonline.gov.in)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "indian e visa photo requirements",
      "india evisa photo size",
      "india visa photo upload 1mb",
      "india e-visa photo resize",
      "indian visa photo square",
    ],
  },
  {
    id: "in-visa",
    name: "India regular visa (online upload)",
    country: "India",
    countryCode: "IN",
    kind: "visa",
    diy: "digital-only",
    digital: {
      minWidthPx: 350,
      minHeightPx: 350,
      maxWidthPx: 1000,
      maxHeightPx: 1000,
      aspect: 1,
      minKB: 10,
      maxKB: 300,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: ["plain light colour", "white"], edit: "unspecified" },
    rules: [
      "JPEG, 10 KB to 300 KB; height and width must be equal.",
      "350 x 350 to 1000 x 1000 pixels.",
      "Full face, front view, eyes open; centre the head in the frame.",
      "Full head from top of hair to chin.",
    ],
    sources: [
      {
        url: "https://indianvisaonline.gov.in/visa/instruction.html",
        title: "Instructions for regular visa application (indianvisaonline.gov.in)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://indianvisaonline.gov.in/visa/VSS_IMAGE.pdf",
        title: "Online visa photo upload process (indianvisaonline.gov.in)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "indian visa photo size",
      "india visa photo 350x350",
      "indian visa photo requirements online",
      "india visa photo 300kb",
    ],
  },
  {
    id: "in-ssc",
    name: "SSC exam application (CGL, CHSL)",
    country: "India",
    countryCode: "IN",
    kind: "exam-form",
    diy: "no",
    diyNote:
      "The 2026 CGL and CHSL applications capture the photo live and reject a photo of an existing photo. Guides that quote 20 to 50 KB uploads are out of date.",
    background: { colors: ["plain"], edit: "unspecified" },
    rules: [
      "Photo is captured live through webcam or phone during the application.",
      "Photographing an existing photo gets the application rejected.",
      "No cap, mask or glasses; use good light and a plain background.",
      "Your look on exam day should match the captured photo.",
      "Signature is a separate JPEG upload of 10 to 20 KB.",
    ],
    sources: [
      {
        url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf",
        title: "Combined Graduate Level Examination 2026 notice (ssc.gov.in)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2026.pdf",
        title: "Combined Higher Secondary Level Examination 2026 notice (ssc.gov.in)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "ssc photo size",
      "ssc cgl photo size kb",
      "ssc photo 20kb to 50kb",
      "ssc live photo",
      "ssc chsl photo requirements",
    ],
  },
  {
    id: "in-upsc",
    name: "UPSC exam application (photo upload)",
    country: "India",
    countryCode: "IN",
    kind: "exam-form",
    diy: "yes",
    diyNote: "The form also asks for a live photo captured in the application.",
    digital: {
      minKB: 20,
      maxKB: 200,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "Colour JPG, 20 to 200 KB, saved with the file name photo.",
      "Face covers at least 75 percent of the photo area.",
      "Frontal view, head centred, both ears visible, eyes open.",
      "No dark background, uniform or dark glasses; no shadows.",
      "Signature is separate: JPG, 20 to 100 KB, 350 to 500 pixels.",
    ],
    sources: [
      {
        url: "https://upsconline.nic.in/caf/assets/PDF/instruction-photo-signature-upload-upsc.pdf",
        title: "Instructions for uploading photo and signature (UPSC)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.upsc.gov.in/sites/default/files/ExamNotifi_CAPF_AC_Exam_2026_Eng_20022026.pdf",
        title: "CAPF (AC) Examination 2026 notice (UPSC)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "upsc photo size",
      "upsc photo signature size kb",
      "upsc photo 20kb to 200kb",
      "upsc photo 75 percent face",
      "upsc cse photo upload",
    ],
  },
  {
    id: "in-neet-ug",
    name: "NEET (UG) application photo",
    country: "India",
    countryCode: "IN",
    kind: "exam-form",
    diy: "yes",
    diyNote: NTA_LIVE_NOTE,
    digital: {
      minKB: 10,
      maxKB: 200,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "JPG or JPEG, 10 to 200 KB, colour or black and white.",
      "About 80 percent of the image should be your face, ears included, no mask.",
      "Photo must be recent: taken after 1 January 2026 for the 2026 exam.",
      "Signature is separate: JPG or JPEG, 10 to 100 KB.",
    ],
    sources: [
      {
        url: "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602231394640855.pdf",
        title: "Information Bulletin NEET (UG) 2026 (NTA)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "neet photo size",
      "neet photo size in kb",
      "neet ug photo requirements",
      "neet photo 10kb to 200kb",
      "nta photo signature size",
    ],
  },
  {
    id: "in-jee-main",
    name: "JEE (Main) application photo",
    country: "India",
    countryCode: "IN",
    kind: "exam-form",
    diy: "yes",
    diyNote: NTA_LIVE_NOTE,
    digital: {
      minKB: 10,
      maxKB: 200,
      kbBytes: 1024,
      formats: ["image/jpeg"],
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "JPG or JPEG, 10 to 200 KB, colour.",
      "About 80 percent of the image should be your face, ears included, no mask.",
      "Photo must be recent, in colour, and clearly legible.",
      "Signature is separate: JPG or JPEG, 10 to 100 KB.",
    ],
    sources: [
      {
        url: "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/11/202511021649722475.pdf",
        title: "Information Bulletin JEE (Main) 2026 (NTA)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "jee main photo size",
      "jee main photo size in kb",
      "jee main photo requirements",
      "jee main photo 10kb to 200kb",
    ],
  },

  // ------------------------------------------------------------- Pakistan
  {
    id: "pk-passport",
    name: "Pakistan passport (applied in Pakistan)",
    country: "Pakistan",
    countryCode: "PK",
    kind: "passport",
    diy: "no",
    diyNote:
      "At a Regional Passport Office the staff capture your photo with your application data; you do not bring one.",
    background: { colors: [], edit: "unspecified" },
    rules: [
      "Photo is captured at the passport office during the application.",
      "Overseas online renewal is a different route with its own upload rules.",
    ],
    sources: [
      {
        url: "https://dgip.gov.pk/passport/process.php",
        title: "Passport application process (DGI&P)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "pakistan passport photo size",
      "pakistan passport photo requirements",
      "pakistan e passport photo",
    ],
  },
  {
    id: "pk-passport-online",
    name: "Pakistan passport online renewal (overseas)",
    country: "Pakistan",
    countryCode: "PK",
    kind: "passport",
    diy: "yes",
    diyNote:
      "You capture and upload the photo yourself. Do not crop a larger picture or edit it in software; upload the untouched camera file.",
    print: { widthMm: 35, heightMm: 45 },
    digital: {
      maxKB: 5000,
      kbBytes: 1000,
      formats: ["image/jpeg"],
      originalOnly: true,
    },
    background: { colors: ["plain"], edit: "forbidden" },
    rules: [
      "Photo size 45 mm high by 35 mm wide.",
      "Digital file up to 5 MB.",
      "Do not use a photo cut down from a larger picture.",
      "Do not edit the photo in software such as Photoshop.",
    ],
    sources: [
      {
        url: "https://onlinemrp.dgip.gov.pk/photo-requirements",
        title: "Photograph requirements (Online Passport Renewal, DGI&P)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "pakistan online passport renewal photo",
      "pakistan passport photo size 35x45",
      "onlinemrp photo requirements",
      "pakistan passport photo 5mb",
    ],
  },
  {
    id: "pk-visa",
    name: "Pakistan online visa (photo upload)",
    country: "Pakistan",
    countryCode: "PK",
    kind: "visa",
    diy: "yes",
    print: { widthMm: 35, heightMm: 45 },
    digital: {
      maxKB: 350,
      kbBytes: 1000,
      formats: ["image/jpeg"],
      aspect: 35 / 45,
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "JPG up to 350 KB.",
      "Photo size 45 mm high by 35 mm wide, in colour.",
      "Close-up of head and top of shoulders; face takes 70 to 80 percent of the photo.",
      "Face the camera, both face edges visible, no shadows, flash reflections or red eye.",
      "No glasses; head coverings allowed if the face from chin to forehead is clear.",
    ],
    sources: [
      {
        url: "https://visa.nadra.gov.pk/photograph-guide/",
        title: "Photograph guide (Pakistan Online Visa System, NADRA)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "pakistan visa photo size",
      "pakistan online visa photo requirements",
      "pakistan visa photo 35x45",
      "pakistan visa photo 350kb",
      "nadra visa photo",
    ],
  },
  {
    id: "pk-nicop",
    name: "Pakistan NICOP / POC (NADRA online photo)",
    country: "Pakistan",
    countryCode: "PK",
    kind: "id-card",
    diy: "yes",
    digital: {
      maxKB: 350,
      kbBytes: 1000,
      formats: ["image/jpeg"],
    },
    background: { colors: ["plain", "white"], edit: "forbidden" },
    rules: [
      "Photo up to 350 KB.",
      "Not older than 6 months; black and white is not accepted.",
      "Original file without filters or layers, not altered in any way.",
      "No hats, artificial lenses or glasses; no shadows or hair across the eyes.",
      "Head coverings allowed if the whole face, including chin, is clearly visible.",
    ],
    sources: [
      {
        url: "https://www.nadra.gov.pk/photo-uploading-capturing-guidelines/",
        title: "Photo uploading and capturing guidelines (NADRA)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "nicop photo requirements",
      "nadra photo size",
      "nadra photo upload guidelines",
      "pak id photo 350kb",
    ],
  },

  // ----------------------------------------------------------- Bangladesh
  {
    id: "bd-passport",
    name: "Bangladesh e-passport",
    country: "Bangladesh",
    countryCode: "BD",
    kind: "passport",
    diy: "no",
    diyNote:
      "No photo is attached to the e-passport form. Only applicants under 6 bring a lab-printed photo.",
    background: { colors: ["grey (under-6 print only)"], edit: "unspecified" },
    rules: [
      "No photo is attached to or certified on the e-passport form.",
      "Applicants under 6: 3R (4R size) lab print with a grey background.",
    ],
    sources: [
      {
        url: "https://dip.gov.bd/site/page/6430d38b-e197-43ee-ad37-e5dc749cb626",
        title: "e-Passport application information (Department of Immigration and Passports)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "bangladesh e passport photo",
      "bangladesh passport photo size",
      "bangladesh passport photo requirements",
    ],
  },
  {
    id: "bd-visa",
    name: "Bangladesh visa (online form photo)",
    country: "Bangladesh",
    countryCode: "BD",
    kind: "visa",
    diy: "yes",
    diyNote:
      "The online photo is optional. Missions may ask for printed photos too, for example two 2 x 2 in colour prints on white taken within 6 months (Los Angeles).",
    digital: {
      maxKB: 300,
      kbBytes: 1000,
      formats: ["image/jpeg"],
      aspect: 35 / 45,
    },
    background: { colors: ["white"], edit: "unspecified" },
    rules: [
      "Digital photo 45 mm by 35 mm, JPEG, at most 300 KB.",
      "Photo upload is optional in the online form.",
      "Print rules vary by mission; check the mission that handles your visa.",
    ],
    sources: [
      {
        url: "https://visa.gov.bd/",
        title: "Bangladesh Online MRV Portal (visa.gov.bd)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://losangeles.mofa.gov.bd/pages/static-pages/6952667535ce18e1c05a9407",
        title: "Visa (Consulate General of Bangladesh, Los Angeles)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "bangladesh visa photo size",
      "bangladesh online visa photo",
      "bangladesh visa photo 300kb",
    ],
  },

  // ---------------------------------------------------------------- Nepal
  {
    id: "np-passport",
    name: "Nepal e-passport",
    country: "Nepal",
    countryCode: "NP",
    kind: "passport",
    diy: "no",
    diyNote:
      "The photo is taken live at the enrollment centre. Only newborns and children under 5 bring a printed photo.",
    background: { colors: ["white (under-5 print only)"], edit: "unspecified" },
    rules: [
      "Adults bring no photo; enrollment staff take it in real time.",
      "Children under 5: passport-size 35 mm by 45 mm, plain white, no border.",
    ],
    sources: [
      {
        url: "https://nepalpassport.gov.np/en/process/process-26",
        title: "Frequently asked questions (Department of Passports, Nepal)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "nepal passport photo size",
      "nepal e passport photo requirements",
      "nepal passport photo 35x45",
    ],
  },

  // ------------------------------------------------------------ Sri Lanka
  {
    id: "lk-passport",
    name: "Sri Lanka passport",
    country: "Sri Lanka",
    countryCode: "LK",
    kind: "passport",
    diy: "no",
    diyNote:
      "A digital photo is sent to the Department by an authorized photo studio or taken at its offices. Printed photos are not accepted.",
    background: { colors: [], edit: "unspecified" },
    rules: [
      "Photo must be taken within 6 months.",
      "Studios send it online; no printed photo is needed for the application.",
      "Eyes clearly visible without spectacles.",
      "Caps and scarves allowed if forehead and ears are clearly visible, with no scarf shadow on the face.",
    ],
    sources: [
      {
        url: "https://www.immigration.gov.lk/pages_e.php?id=7",
        title: "General information on passports (Department of Immigration and Emigration)",
        checkedAt: CHECKED,
        kind: "primary",
      },
      {
        url: "https://www.immigration.gov.lk/pages_e.php?id=49",
        title: "Instructions to registered photo studio owners (Department of Immigration and Emigration)",
        checkedAt: CHECKED,
        kind: "primary",
      },
    ],
    searchTerms: [
      "sri lanka passport photo",
      "sri lanka passport photo requirements",
      "sri lanka passport digital photo studio",
    ],
  },
];
