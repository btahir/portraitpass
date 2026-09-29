// English UI strings for the static page templates: the source of truth. `Strings` is derived from
// this object, so every other language is checked against it by the compiler.
//
// Rules for translators (they apply in every language):
//  - Keep every number, unit and identifier exactly as given.
//  - Never claim more than the tool does: no equivalent of "compliant", "approved", "guaranteed",
//    "verified" or "official". We check sizes and positions; the issuing authority decides.
//  - Translate the independence statement faithfully (chrome.legal).
//  - Functions receive already-formatted pieces (numbers, names) and return a sentence, so a
//    language can reorder them.
import { DISCLAIMER } from "../../config";
import type { DocumentKind } from "../../core/documents";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const en = {
  // ----------------------------------------------------------- site chrome
  chrome: {
    skip: "Skip to content",
    homeLabel: "PortraitPass home",
    mainNav: "Main navigation",
    footerNav: "Footer navigation",
    documents: "Documents",
    printShort: "Print for 40¢",
    about: "About",
    support: "Support",
    themeToLight: "Switch to light theme",
    themeToDark: "Switch to dark theme",
    printGuide: "Print guide",
    privacy: "Privacy",
    terms: "Terms",
    accessibility: "Accessibility",
    forAgents: "For agents",
    popular: "Popular",
    legal: `${DISCLAIMER} Some authorities, such as Canada and Germany, only accept photos from professional or certified providers.`,
    languageLabel: "Language",
    /** Shown in the footer of translated pages; empty in English. */
    englishOnlyNote: "",
  },

  // ------------------------------------------------------- numbers and text
  fmt: {
    list: (items: string[], joiner: "and" | "or"): string =>
      items.length <= 1
        ? items.join("")
        : `${items.slice(0, -1).join(", ")} ${joiner} ${items[items.length - 1]}`,
    date: (y: number, m: number, d: number): string => `${d} ${MONTHS[m - 1]} ${y}`,
    percent: (n: number): string => `${n}%`,
    between: (a: string, b: string): string => `${a} to ${b}`,
    atLeast: (x: string): string => `at least ${x}`,
    atMost: (x: string): string => `at most ${x}`,
    upTo: (x: string): string => `up to ${x}`,
    /** Short forms for table cells. */
    compactBetween: (a: string, b: string): string => `${a} to ${b}`,
    compactAtLeast: (x: string): string => `≥ ${x}`,
    compactAtMost: (x: string): string => `≤ ${x}`,
    ofImageHeight: " of the image height",
    aspectSquare: "square (1:1)",
    aspectPortrait: "portrait, 3:4",
    aspectRatio: (r: string): string => `width to height ratio ${r}`,
    atLeastWide: (px: string): string => `at least ${px} px wide`,
    perSideSquare: (a: string, c: string): string => `${a} to ${c} px per side, square`,
    fromUpTo: (a: string, b: string, c: string, e: string): string =>
      `from ${a} × ${b} px up to ${c} × ${e} px`,
    withAspect: (dims: string, aspect: string): string => `${dims}, ${aspect}`,
    originalFile: "original file",
    digitalUpload: "digital upload",
    noPhoto: "no photo to prepare",
    theOriginalFile: "the original file",
    noFixedSize: "an upload with no fixed size",
    kb1000: "The source counts 1 KB as 1,000 bytes.",
    kb1024: "The source counts 1 KB as 1,024 bytes.",
    kbUnknown:
      "The source does not say how it counts a KB; we assume 1,024 bytes, the safer reading for a maximum.",
    sourcePrimary: "Issuing authority",
    sourceSecondary: "Secondary source",
    sourceLine: (kind: string, date: string): string => `${kind}. Checked ${date}.`,
    checkNote: "We check sizes and positions; the issuing authority decides acceptance.",
    rulesNote: "Rules change. Check the issuing authority’s current instructions before you apply.",
    notAtHome: "Not at home",
    /** "US passport" becomes "US passport photo"; a name that already ends in "photo" stays. */
    photoName: (name: string): string => (/\bphoto\)?$/i.test(name) ? name : `${name} photo`),
    andMore: (n: number): string => ` and ${n} more`,
    /** Separators for lists and sentences built in code: comma, semicolon, full stop. */
    sep: ", ",
    semi: "; ",
    stop: ".",
  },

  // ------------------------------------------------------ document sentences
  sentence: {
    bgNamed: (colors: string): string => `The source asks for a ${colors} background.`,
    bgNone: "The source does not name a background color.",
    editForbiddenCaptured:
      "The rules do not allow digital changes to the photo, so the background is the photographer’s or booth’s job to get right.",
    editForbiddenHome:
      "The rules do not allow digital changes to the photo, so the background has to be right when the photo is taken. Retake it against a plain wall instead of editing the background. PortraitPass keeps background replacement off by default for this document.",
    editAllowed:
      "The source allows the background to be edited. Keep it plain and even, and leave your face and hair untouched.",
    editUnspecifiedCaptured: "The source does not say whether the background may be edited.",
    editUnspecifiedHome:
      "The source does not say whether the background may be edited. The safest route is a plain wall at capture. If you replace a background, check the receiving organization’s rules first.",
    introPrint: (photo: string, size: string): string => `The printed ${photo} is ${size}`,
    introOriginal: (kb: string | undefined, formats: string): string =>
      `For the online upload, keep the original, unedited camera file${kb ? ` (${kb})` : ""} as ${formats}.`,
    introDigital: (bits: string, formats: string): string => `The digital photo is ${bits}, as ${formats}.`,
    introNone: (name: string): string =>
      `There is no photo size for you to prepare for the ${name}; the photo is captured for you.`,
  },

  // ---------------------------------------------------------- document FAQ
  faq: {
    sizeQ: (photo: string): string => `What size is a ${photo}?`,
    sizePrint: (size: string): string => `The printed photo is ${size}.`,
    sizeDigital: (bits: string, formats: string): string => `The digital upload is ${bits}, as ${formats}.`,
    sizeNone: (note: string): string => `There is no size to prepare. ${note}`,
    sizeNoneDefault: "The photo is captured for you.",
    homeQ: (photo: string): string => `Can I take a ${photo} at home?`,
    homeNo: "No. ",
    homeYesDigitalNoNote: "Yes, and nothing is printed; you upload a digital photo. ",
    homeYes: "Yes. ",
    homeNoDefault: "The photo has to be made by the issuing authority or a provider it names.",
    homeYesDefault: "The source accepts a photo you prepare yourself.",
    bgQ: (photo: string): string => `What background does a ${photo} need?`,
    kbQ: (photo: string): string => `How many KB can a ${photo} be?`,
    kbA: (range: string, def: string): string => `The file size limit is ${range}. ${def}`,
    headQ: (photo: string): string => `How big should the head be in a ${photo}?`,
    headPrintA: (head: string, eye: string | undefined): string =>
      `Measured from the crown to the chin, the head should be ${head}${eye ? `, and the eye line ${eye} up from the bottom edge` : ""}.`,
    headRatioA: (ratio: string): string => `The head, from the top of the hair to the chin, should be ${ratio}.`,
    rulesQ: (photo: string): string => `What are the main rules for a ${photo}?`,
    sourcesQ: (name: string): string => `Where do the ${name} numbers come from?`,
    sourcesA: (allPrimary: boolean, titles: string, date: string): string =>
      `From ${allPrimary ? "the issuing authority’s own pages" : "the pages listed under Sources"}: ${titles}. Last checked ${date}.`,
  },

  // ------------------------------------------------------------ page meta
  meta: {
    brand: "PortraitPass",
    /**
     * Title candidates, best first; the first one of at most 60 characters wins and index 3 is the
     * fallback. `offer` is what the page can honestly promise: a free maker (a home photo), a size
     * (numbers to read, but not a home photo) or neither.
     */
    docTitles: (photo: string, short: string, brand: string, offer: "maker" | "size" | "none" = "size"): string[] => {
      const what = offer === "none" ? "requirements" : "size and requirements";
      const tail = offer === "maker" ? " — free maker" : "";
      return [
        `${photo} ${what}${tail}`,
        `${photo} ${what} — ${brand}`,
        `${photo} ${what}`,
        `${short} ${what}`,
        `${short} ${offer === "none" ? "rules" : "size"}`,
      ];
    },
    docNoSize: (photo: string): string => `${photo}: there is no size to prepare.`,
    docSpec: (photo: string, summary: string, head: string | undefined): string =>
      `${photo}: ${summary}${head ? `, head ${head}` : ""}.`,
    docNotHome: "Not a home photo: see where to go.",
    docHome: "Make it free in your browser.",
    docChecked: (date: string): string => `Sources checked ${date}.`,
    docFillers: ["Nothing is uploaded.", "No account or watermark."],
    indexTitle: "Passport, visa and ID photo requirements — PortraitPass",
    indexDescription: (n: number): string =>
      `Photo size, head position, background and file size rules for ${n} passports, visas and IDs, each with its source and check date.`,
  },

  // ------------------------------------------------------- document tables
  table: {
    document: "Document",
    head: {
      size: "Photo",
      print: "Print size",
      digital: "Upload size",
      head: "Head",
      eye: "Eye line",
      kb: "File size",
      bg: "Background",
      home: "At home?",
      country: "Country",
    },
    homeYes: "Yes",
    homeDigital: "Yes, upload only",
    homeNo: "No",
    originalFile: "Original file",
    bgNone: "Not named",
    paperCaption: "Paper named in the sources",
    paperSize: "Size",
    paperPaper: "Paper",
  },

  // ------------------------------------------------------------ page shell
  shell: {
    home: "Home",
    breadcrumb: "Breadcrumb",
  },

  // -------------------------------------------------------- document page
  doc: {
    kind: {
      passport: "Passport",
      visa: "Visa",
      "id-card": "ID card",
      residence: "Residence or immigration",
      citizenship: "Citizenship",
      lottery: "Lottery entry",
      "exam-form": "Exam application",
      other: "Application",
    } as Record<DocumentKind, string>,
    title: (photo: string): string => `${photo}: size and rules`,
    eyebrow: (country: string, kind: string): string => `${country} · ${kind}`,
    specTitle: "Photo specification",
    printCaption: "Printed photo",
    digitalCaption: "Digital upload",
    rowPhotoSize: "Photo size",
    rowHead: "Head, crown to chin",
    rowEye: "Eye line, up from the bottom",
    rowCopies: "Photos required",
    rowPaper: "Paper",
    rowUpload: "Upload",
    rowUploadOriginal: "The original camera file, unedited and uncropped",
    rowMinSize: "Minimum size",
    rowImageSize: "Image size",
    rowFileSize: "File size",
    rowFormats: "Formats",
    fileSizeValue: (kb: string, def: string): string => `${kb}. ${def}`,
    specNote: (check: string, date: string, rules: string): string => `${check} Last checked ${date}. ${rules}`,
    /** Under the figures of a document we do not process: no claim that we check anything. */
    specNoteNotHome: (date: string, rules: string): string => `Figures from the source. Last checked ${date}. ${rules}`,
    diagramAlt: (size: string): string => `Photo frame to scale, ${size}, with the head and eye-line ranges marked`,
    diagramHead: "Head",
    diagramEye: "Eye line",
    diagramNote: "Drawn to scale from the figures in the table. The head shape is only a guide.",
    backgroundTitle: "Background and editing",
    rulesTitle: "Rules from the source",
    rulesFooter: "Expression, lighting and how recent the photo is cannot be measured from a picture, so check them yourself.",
    homeTitle: "Can you make it at home?",
    homeNo: "No.",
    homeNoDefault: "The photo has to be made by the issuing authority or a provider it names.",
    whereInstead: "Where to go instead",
    whereBody:
      "Ask the issuing office which photographers or booths it takes. PortraitPass does not make this photo, because a print or file made at home would be turned away.",
    /** Added after whereBody when the page has a figures table. */
    whereFigures: " Take the numbers above with you, and check the photo you get back against them.",
    othersFrom: (country: string): string => `Documents from ${country} you can prepare yourself`,
    browseAll: "Browse all documents",
    homeYesDigitalOnly: "Yes, and nothing is printed.",
    homeYes: "Yes.",
    homeYesDefault: "The source accepts a photo you prepare yourself.",
    studioBodyDigital:
      "PortraitPass frames the photo against the head and eye lines above, then exports a file at the exact pixel size and under the size limit.",
    studioBodyPrint:
      "PortraitPass frames the photo against the head and eye lines above and exports a single photo or a print sheet, with the measurements shown so you can check them yourself.",
    stays: "Your photo stays in your browser.",
    openStudio: "Open the studio for this document",
    /** Shown next to studio links on translated pages; empty in English. */
    studioNote: "",
    sourcesTitle: "Sources",
    faqTitle: "Common questions",
    relatedTitle: "Related documents",
    guidesTitle: "Guides for this photo",
    reportBefore: "Found a wrong or outdated number?",
    reportLink: "Open an issue with the source link.",
    relSiblings: "Same document, other route",
    relCountry: (country: string): string => `More from ${country}`,
    relSameSize: (size: string): string => `Other documents with a ${size} print`,
  },

  // --------------------------------------------------------- documents index
  index: {
    eyebrow: "Photo requirements",
    title: "Passport, visa and ID photo requirements",
    crumb: "Documents",
    lede: (n: number, countries: number, home: number, notHome: number): string =>
      `${n} documents from ${countries} countries and regions, each with its size, head and eye positions, background rule and the source we read. ${home} can be prepared at home; ${notHome} need a photographer, a booth or a capture at the issuing office, and the page says so.`,
    countriesNav: "Countries",
    bySize: "By size",
    links: {
      twoByTwo: "2×2 inch photo",
      thirtyFive: "35×45 mm photo",
      sixHundred: "600×600 px upload",
      under50: "Photo under 50 KB",
      printing: "Printing guide",
    },
    countTag: (n: number): string => `${n} ${n === 1 ? "document" : "documents"}`,
    tableCaption: (country: string): string => `${country} documents`,
    footnote:
      "Each figure comes from the issuing authority’s own page and is listed with the date we last checked it. We check sizes and positions; the issuing authority decides acceptance.",
  },

  // ------------------------------------------------------------- size pages
  sizes: {
    eyebrowSize: "Photo size",
    eyebrowFile: "File size",
    eyebrowSheet: "Print sheet",
    eyebrowPrinting: "Printing",
    unitsTitle: "The same size in every unit",
    mistakesTitle: "Common mistakes",
    faqTitle: "Common questions",
    inches: "Inches",
    millimetres: "Millimetres",
    px300: "Pixels at 300 DPI",
    px600: "Pixels at 600 DPI",
    onSheet: "On a 4×6 in sheet",
    photosN: (n: number): string => `${n} photos`,
    studioFor: (name: string): string => `Open the studio for the ${name}`,
    figuresChecked: (date: string): string => `Figures checked ${date}.`,

    twoByTwo: {
      crumb: "2×2 inch photo",
      title: "2×2 inch photo: size, pixels and documents",
      metaTitle: "2×2 inch photo size in pixels: 600×600 at 300 DPI, 50.8 mm",
      metaLead: (px: string): string => `2×2 inch photo: 50.8 mm, ${px} px at 300 DPI.`,
      metaDocs: (n: number, lead: string): string => `${n} documents use it, including ${lead}.`,
      metaLeadFallback: "the US passport",
      metaTail: "Head and eye positions, common mistakes and a free browser tool.",
      lede: (px: string, n: number, some: string | undefined): string =>
        `A 2×2 inch photo is 50.8 × 50.8 mm, or ${px} pixels at 300 DPI. In our dataset ${n} documents ask for a print this size${some ? `, including ${some}` : ""}.`,
      mmRow: "50.8 × 50.8 mm (often rounded to 51 × 51)",
      inRow: "2 × 2 in",
      caption: "2×2 inch photo",
      docsTitle: "Documents that use a 2×2 inch print",
      docsCaption: "2×2 inch documents",
      docsNote:
        "Head and eye positions differ by document even when the paper size is the same, so take them from the page for the document you are applying for.",
      mistakes: [
        "Stretching a rectangular photo into a square. Crop instead, so the face keeps its proportions.",
        "Treating 2×2 as a pixel size. It is a physical size, so the print has to come out at 2 inches, not merely 600 pixels.",
        "Printing with “fit to page” switched on. The print comes out a little too big or too small; measure it with a ruler.",
        "Cropping too loosely. The head has to fill a set part of the height, so a small face on a large square is out of range.",
      ],
      faqPxQ: "How many pixels is a 2×2 inch photo?",
      faqPxA: (a: string, b: string, c: string): string =>
        `${a} pixels at 300 DPI, ${b} at 600 DPI and ${c} at 200 DPI. A print is defined by its physical size, so the pixel count matters only for uploads.`,
      faqMmQ: "Is 2×2 inches the same as 51×51 mm?",
      faqMmA:
        "Almost. Two inches is 50.8 mm, and some forms round it to 51 mm. A sheet printed at actual size will measure 50.8 mm each way, which is what the 2 inch rule means.",
      faqWhichQ: "Which documents use a 2×2 inch photo?",
      faqWhichA: (names: string): string => `In our dataset: ${names}.`,
      faqWhichNone: "No document in our dataset currently asks for this size.",
    },

    thirtyFive: {
      crumb: "35×45 mm photo",
      title: "35×45 mm photo: size, pixels and documents",
      metaTitle: "35×45 mm photo size in pixels: 413×531 at 300 DPI",
      metaLead: (px: string): string => `35×45 mm photo: ${px} px at 300 DPI.`,
      metaDocs: (n: number, c: number): string =>
        `${n} documents in ${c} countries use it, with each head range and background rule.`,
      metaTail: "Free, in your browser.",
      lede: (px: string, n: number): string =>
        `35×45 mm is the most common passport photo size outside the United States: 1.38 × 1.77 in, or ${px} pixels at 300 DPI. ${n} documents in our dataset use it.`,
      caption: "35×45 mm photo",
      mmRow: "35 × 45 mm",
      docsTitle: "Documents that use 35×45 mm",
      docsCaption: "35×45 mm documents",
      docsNote:
        "The shape is shared but the rules are not. Head height, background color and whether a home photo is accepted at all vary by document, so open the page for yours.",
      mistakes: [
        "Stretching a 4:3 or square photo to 35×45. Crop to the 7:9 shape and keep the face proportions.",
        "Printing a 35×45 file at the wrong physical size. Print at actual size and measure the result.",
        "Using the head size from another country. The table above shows how the ranges differ.",
        "Sending a home print where the document needs a photographer or booth. Those documents are marked “Not at home”.",
      ],
      faqPxQ: "How many pixels is a 35×45 mm photo?",
      faqPxA: (a: string, b: string): string => `${a} pixels at 300 DPI, and ${b} at 600 DPI.`,
      faqSameQ: "Is 35×45 mm the same as 2×2 inches?",
      faqSameA:
        "No. A 35×45 mm photo is taller than it is wide (1.38 × 1.77 in), while 2×2 inches is square. Stretching one to fit the other distorts the face, so crop to the right shape instead.",
      faqHeadQ: "Do all 35×45 mm documents use the same head size?",
      faqHeadA:
        "No. The paper size is shared but the head range is set per document, for example between 29 and 36 mm depending on the authority. The table on this page shows each one.",
    },

    sixHundred: {
      crumb: "600×600 pixel photo",
      title: "600×600 pixel photo: uploads and size limits",
      metaTitle: "600×600 pixel photo: uploads and size limits — PortraitPass",
      metaLead: (exact: number, range: number): string =>
        `600×600 pixel photo: ${exact} ${exact === 1 ? "document asks" : "documents ask"} for exactly this size, ${range} ${range === 1 ? "accepts" : "accept"} it within a range.`,
      metaTail: "File size limits, head position and a free browser tool.",
      metaFiller: "Nothing is uploaded.",
      lede: (exact: number, range: number): string =>
        `A 600×600 pixel square is the upload size for the US Diversity Visa lottery and fits inside several other limits. ${exact} documents in our dataset ask for exactly 600×600 and ${range} accept it within a range.`,
      meaningTitle: "What 600×600 means",
      meaningBody:
        "It is a pixel size, not a print size. At 300 pixels per inch it is 2×2 inches, but an upload form only checks the pixels and the file size. The photo should be a square crop with the head inside the range the document sets.",
      meaningHead: (name: string, headLo: number, headHi: number, eyeLo: number, eyeHi: number): string =>
        `For ${name}, the head is ${headLo} to ${headHi} pixels tall in a 600 pixel frame, and the eye line ${eyeLo} to ${eyeHi} pixels up from the bottom.`,
      exactTitle: "Documents that ask for exactly 600×600",
      exactCaption: "Exactly 600×600 px",
      rangeTitle: "Documents that accept 600×600 within a range",
      rangeCaption: "Range includes 600×600 px",
      rangeNote:
        "For these the exact size is your choice inside the range. A square crop of at least 600 pixels is a safe pick where the range allows it.",
      faqSameQ: "Is a 600×600 pixel photo the same as 2×2 inches?",
      faqSameA:
        "Only at 300 DPI. Two inches at 300 pixels per inch is 600 pixels, which is why the sizes are often mentioned together. For an upload the pixel count is what counts; for a print the physical size is.",
      faqWhichQ: "Which documents ask for exactly 600×600 pixels?",
      faqWhichA: (names: string): string => `In our dataset: ${names}.`,
      faqWhichNone: "No document in our dataset asks for exactly this size at the moment.",
      faqKbQ: "What file size goes with 600×600 pixels?",
      faqKbA: (items: string): string => `It depends on the document: ${items}. The table on this page lists each one.`,
      faqKbItem: (name: string, range: string): string => `${name} is ${range}`,
      faqKbNone: "The sources for these documents do not state a file size limit.",
    },

    under50: {
      crumb: "Photo under 50 KB",
      title: "Photo under 50 KB: which documents set a limit",
      metaTitle: "Photo under 50 KB: documents with a limit — PortraitPass",
      metaLead: (n: number, smallest: string): string =>
        `Photo under 50 KB? ${n} ${n === 1 ? "document sets" : "documents set"} a file size limit; the smallest maximum we found is ${smallest} KB.`,
      metaNone: "n/a",
      metaTail: "How KB is counted and how to reduce file size.",
      metaFiller: "Free, in your browser.",
      ledeSome: (n: number, names: string): string =>
        `${n} documents in our dataset cap the photo at 50 KB or less: ${names}.`,
      ledeNone: (smallest: string): string =>
        `No document in our dataset caps the photo at 50 KB or less. The smallest maximum we found is ${smallest}. If your form asks for 50 KB, its own limit applies; this page shows what the documents we have read actually require.`,
      smallestOf: (kb: number, name: string): string => `${kb} KB (${name})`,
      notStated: "not stated",
      limitsTitle: "Documents with a file size limit",
      limitsCaption: "Sorted by the largest file allowed",
      countingTitle: "How KB is counted",
      countingBody: (thousand: string | undefined): string =>
        `A kilobyte is 1,000 bytes to some sources and 1,024 to others, and a few do not say.${thousand ? ` ${thousand} count 1,000 bytes.` : ""} When a file is close to a maximum, aim a few percent under it rather than exactly on it.`,
      howTitle: "Getting a photo under a limit",
      steps: [
        "Crop to the shape the document asks for first, with the head in the right range.",
        "Set the pixel size to what the form asks for. A 4000×3000 phone photo is about 12 million pixels; a 600×600 upload is 0.36 million.",
        "Save as JPEG and lower the quality a step at a time until the file is under the limit.",
        "Check the result at full size. If the face looks blocky, choose a larger size limit or a smaller pixel size, not both.",
      ],
      howAfter:
        "Choose a document in the studio and the digital export does these steps to that document’s limits and shows the final size before you download.",
      studioLabel: "Open the studio",
      faqWhichQ: "Which documents have a KB limit?",
      faqWhichA: (n: number, from: string): string =>
        `In our dataset ${n} documents set a file size limit, from ${from} upward. The table on this page lists each one.`,
      faqWhichNone: "none",
      faqBytesQ: "Is 1 KB 1,000 or 1,024 bytes?",
      faqBytesA: (names: string): string =>
        `It depends on the source. ${names} count 1,000 bytes; the others count 1,024 or do not say. Near a limit, use the smaller reading.`,
      faqBytesNone: "Sources mostly count 1,024 bytes. Near a limit, leave a few percent of room.",
      faqSmallerQ: "How do I make a photo smaller without ruining it?",
      faqSmallerA:
        "Reduce the pixel dimensions to what the form asks for first, then lower the JPEG quality a little at a time. A plain, evenly lit background also compresses better than a busy one.",
    },

    sheet: {
      crumb: "Print sheet",
      title: "Passport photos on a 4×6 print sheet",
      metaTitle: "Passport photo print sheet: 4×6, A4 or Letter — PortraitPass",
      metaLead: "Passport photo sheet: how many photos fit on 4×6, A4 and Letter paper, with cut marks.",
      metaTail: "Print at actual size. Free, in your browser.",
      metaFiller: "Nothing is uploaded.",
      lede: (n: number, size: string): string =>
        `A 4×6 inch sheet holds ${n} photos of ${size}. The studio lays them out at exact physical size, in a PDF or JPG you can send to a photo counter or print yourself.`,
      ledeSizeFallback: "the usual size",
      crumbPrinting: "Printing",
      countsTitle: "Photos per sheet",
      countsCaption: "Photos on one sheet, at 300 DPI",
      colSize: "Photo size",
      col4x6: "4×6 in",
      colA4: "A4",
      colLetter: "US Letter",
      countsNote:
        "The counts come from the same layout the studio uses, with print margins on A4 and Letter. The paper is turned to whichever direction holds more photos.",
      printingTitle: "Printing it right",
      steps: [
        "Export the sheet from the studio as PDF or JPG.",
        "Print at actual size or 100 percent. Turn off “fit to page” and any borderless scaling.",
        "Measure one photo with a ruler against the size on the document’s page.",
        "Cut along the guides. On 4×6 they sit on the shared edges; on A4 and Letter they are corner marks.",
      ],
      seeGuideBefore: "For photo counter prices, paper and the documents with special print rules, see the ",
      seeGuideLink: "printing guide",
      seeGuideAfter: ".",
      studioLabel: "Open the studio and make a sheet",
      faqCountQ: "How many passport photos fit on a 4×6 print?",
      faqCountA: (items: string): string => `${items}. The table on this page has every size we know.`,
      faqCountItem: (n: number, size: string): string => `${n} at ${size}`,
      faqCountNone: "It depends on the photo size.",
      faqLinesQ: "Why are there lines between the photos?",
      faqLinesA:
        "On a 4×6 sheet the photos tile edge to edge with thin guides on the shared edges, so you cut along them. On A4 and Letter each photo has corner cut marks and a margin for home printers.",
      faqSettingQ: "What print setting keeps the size exact?",
      faqSettingA:
        "Actual size or 100 percent, with fit to page and borderless scaling off. Measure one photo with a ruler afterwards.",
    },

    guide: {
      crumb: "Printing",
      title: "Print passport photos for about 40¢",
      metaTitle: "Print passport photos: 4×6, home or lab — PortraitPass",
      metaLead: "Print passport photos for about 40¢: a 4×6 sheet at a photo counter, at home, or at a lab.",
      metaTail: "Actual-size settings and per-document print rules.",
      metaFiller: "Free, in your browser.",
      lede: (n: number): string =>
        `Export a 4×6 sheet with ${n} photos and order it as an ordinary 4×6 print at a photo counter. A US drugstore or big-box counter typically charges around 40 cents for one; prices vary, so check before you order.`,
      counterTitle: "At a photo counter",
      counterSteps: [
        "Export the 4×6 sheet from the studio as a JPG.",
        "Upload it for pickup at CVS, Walgreens, Walmart Photo or a similar counter and choose a 4×6 print.",
        "Choose “no borders” or “do not crop” if offered. The print must be at actual size.",
        "Measure one photo with a ruler before you leave, then cut along the guides.",
      ],
      counterNote: "The counter sees only the sheet you upload. PortraitPass never receives it.",
      homeTitle: "At home",
      homeBefore:
        "Use photo paper, print at actual size or 100 percent, and turn off “fit to page”. A4 and Letter sheets have corner cut marks and a margin for home printers. See the ",
      homeLink: "print sheet page",
      homeAfter: " for how many photos fit.",
      rulesTitle: "Documents with special print rules",
      auHeading: "Australia",
      auBody: (note: string, paper: string): string =>
        `${note} The paper the source names: ${paper}. Take the sheet to a photo lab that offers this, rather than a home or drugstore inkjet print.`,
      ukHeading: "United Kingdom",
      ukBefore: " Applying online instead? Use the ",
      ukLink: "online upload page",
      ukAfter: ": it takes the original, uncropped photo, so nothing is printed.",
      noHomeNote:
        "Some documents cannot be printed at home at all: Canada asks for a commercial photographer and Germany takes the photo digitally at the authority or a certified provider. Their pages explain the route.",
      closing:
        "We check sizes and positions; the issuing authority decides acceptance. Prices are typical and change; we do not have a partnership with any retailer named here.",
      faqCostQ: "How much does it cost to print passport photos?",
      faqCostA:
        "A 4×6 print at a US drugstore or big-box photo counter is typically around 40 cents, and one sheet holds several photos. Prices vary by store, so check before you order.",
      faqHomeQ: "Can I print passport photos at home?",
      faqHomeA:
        "Sometimes. Some documents accept a home print on photo paper and some require a lab or professional print. Australia asks for a dye-sublimation print of at least 200 gsm, so a home inkjet print does not qualify.",
      faqCropQ: "What should I choose when the photo counter asks about cropping?",
      faqCropA:
        "Choose no borders or do not crop if offered, and print at actual size. A shop that auto-crops or scales the sheet changes the photo size.",
    },
  },
};

export type Strings = typeof en;
