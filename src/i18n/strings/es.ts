// Spanish UI strings (neutral Latin American / European mix, informal "tú"). Same shape as en.ts;
// the compiler checks it. Wording rules: no "oficial", "aprobado", "garantizado", "verificado" or
// "conforme"; comprobamos medidas y posiciones y la autoridad emisora decide.
import type { Strings } from "./en";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "y" becomes "e" before i- or hi-; "o" becomes "u" before o- or ho-. */
const andWord = (next: string) => (/^h?i(?![aeou])/i.test(next) ? "e" : "y");
const orWord = (next: string) => (/^h?o/i.test(next) ? "u" : "o");
const lowerFirst = (s: string) => (/^[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

export const es: Strings = {
  chrome: {
    skip: "Saltar al contenido",
    homeLabel: "Inicio de PortraitPass",
    mainNav: "Navegación principal",
    footerNav: "Navegación del pie de página",
    documents: "Documentos",
    printShort: "Imprime por 40¢",
    about: "Acerca de",
    support: "Apoyar",
    themeToLight: "Cambiar al tema claro",
    themeToDark: "Cambiar al tema oscuro",
    printGuide: "Guía de impresión",
    privacy: "Privacidad",
    terms: "Términos",
    accessibility: "Accesibilidad",
    forAgents: "Para agentes",
    popular: "Populares",
    legal:
      "PortraitPass es un proyecto independiente de código abierto, sin afiliación ni respaldo de ningún gobierno ni oficina de pasaportes. Las reglas de las fotos cambian; consulta las reglas vigentes de la autoridad emisora. Algunas autoridades, como las de Canadá y Alemania, solo aceptan fotos de proveedores profesionales o certificados.",
    languageLabel: "Idioma",
    englishOnlyNote:
      "El inicio, el editor y las páginas de privacidad, términos y accesibilidad están en inglés por ahora.",
  },

  fmt: {
    list: (items, joiner) => {
      if (items.length <= 1) return items.join("");
      const last = items[items.length - 1];
      const word = joiner === "and" ? andWord(last) : orWord(last);
      return `${items.slice(0, -1).join(", ")} ${word} ${last}`;
    },
    date: (y, m, d) => `${d} de ${MONTHS[m - 1]} de ${y}`,
    percent: (n) => `${n} %`,
    between: (a, b) => `entre ${a} y ${b}`,
    atLeast: (x) => `como mínimo ${x}`,
    atMost: (x) => `como máximo ${x}`,
    upTo: (x) => `hasta ${x}`,
    compactBetween: (a, b) => `${a} a ${b}`,
    compactAtLeast: (x) => `≥ ${x}`,
    compactAtMost: (x) => `≤ ${x}`,
    ofImageHeight: " de la altura de la imagen",
    aspectSquare: "formato cuadrado (1:1)",
    aspectPortrait: "formato vertical, 3:4",
    aspectRatio: (r) => `relación ancho:alto de ${r}`,
    atLeastWide: (px) => `como mínimo ${px} px de ancho`,
    perSideSquare: (a, c) => `entre ${a} y ${c} px por lado (formato cuadrado)`,
    fromUpTo: (a, b, c, e) => `desde ${a} × ${b} px hasta ${c} × ${e} px`,
    withAspect: (dims, aspect) => `${dims}, ${aspect}`,
    originalFile: "archivo original",
    digitalUpload: "archivo digital",
    noPhoto: "sin foto que preparar",
    theOriginalFile: "el archivo original",
    noFixedSize: "un archivo sin tamaño fijo",
    kb1000: "La fuente cuenta 1 KB como 1000 bytes.",
    kb1024: "La fuente cuenta 1 KB como 1024 bytes.",
    kbUnknown:
      "La fuente no indica cómo cuenta un KB; asumimos 1024 bytes, que es la lectura más segura para un máximo.",
    sourcePrimary: "Autoridad emisora",
    sourceSecondary: "Fuente secundaria",
    sourceLine: (kind, date) => `${kind}. Consultada el ${date}.`,
    checkNote: "Comprobamos medidas y posiciones; la autoridad emisora decide si acepta la foto.",
    rulesNote:
      "Las reglas cambian. Consulta las instrucciones vigentes de la autoridad emisora antes de presentar tu solicitud.",
    notAtHome: "No se hace en casa",
    photoName: (name) => `foto de ${lowerFirst(name)}`,
    andMore: (n) => ` y ${n} más`,
    sep: ", ",
    semi: "; ",
    stop: ".",
  },

  sentence: {
    bgNamed: (colors) => `La fuente pide un fondo ${colors}.`,
    bgNone: "La fuente no indica el color del fondo.",
    editForbiddenCaptured:
      "Las reglas no permiten modificar la foto digitalmente, así que conseguir un buen fondo es tarea del fotógrafo o de la cabina.",
    editForbiddenHome:
      "Las reglas no permiten modificar la foto digitalmente, así que el fondo tiene que estar bien en el momento de hacer la foto. Repítela ante una pared lisa en lugar de editar el fondo. PortraitPass mantiene desactivada por defecto la sustitución del fondo para este documento.",
    editAllowed:
      "La fuente permite editar el fondo. Mantenlo liso y uniforme, y no toques tu rostro ni tu cabello.",
    editUnspecifiedCaptured: "La fuente no indica si se puede editar el fondo.",
    editUnspecifiedHome:
      "La fuente no indica si se puede editar el fondo. Lo más seguro es usar una pared lisa al hacer la foto. Si sustituyes el fondo, consulta antes las reglas de la organización que va a recibir la foto.",
    introPrint: (photo, size) => `La ${photo} impresa mide ${size}`,
    introOriginal: (kb, formats) =>
      `Para la subida en línea, usa el archivo original de la cámara, sin editar${kb ? ` (${kb})` : ""}, en ${formats}.`,
    introDigital: (bits, formats) => `La foto digital pide ${bits}, en ${formats}.`,
    introNone: (name) =>
      `Para el documento «${name}» no hay que preparar ninguna foto: se toma como parte del trámite.`,
  },

  faq: {
    sizeQ: (photo) => `¿Qué medidas tiene la ${photo}?`,
    sizePrint: (size) => `La foto impresa mide ${size}.`,
    sizeDigital: (bits, formats) => `El archivo digital pide ${bits}, en ${formats}.`,
    sizeNone: (note) => `No hay un tamaño que preparar. ${note}`,
    sizeNoneDefault: "La foto se toma como parte del trámite.",
    homeQ: (photo) => `¿Puedo hacerme la ${photo} en casa?`,
    homeNo: "No. ",
    homeYesDigitalNoNote: "Sí, y no se imprime nada: subes una foto digital. ",
    homeYes: "Sí. ",
    homeNoDefault: "La foto la tiene que hacer la autoridad emisora o un proveedor que ella indique.",
    homeYesDefault: "La fuente acepta una foto que prepares tú mismo.",
    bgQ: (photo) => `¿Qué fondo necesita la ${photo}?`,
    kbQ: (photo) => `¿Cuántos KB puede pesar la ${photo}?`,
    kbA: (range, def) => `El archivo debe pesar ${range}. ${def}`,
    headQ: (photo) => `¿Qué tamaño debe tener la cabeza en la ${photo}?`,
    headPrintA: (head, eye) =>
      `Medida desde la coronilla hasta el mentón, la cabeza debe medir ${head}${eye ? `, y la línea de los ojos, medida desde el borde inferior, debe estar ${eye}` : ""}.`,
    headRatioA: (ratio) =>
      `La cabeza, desde la parte superior del cabello hasta el mentón, debe medir ${ratio}.`,
    rulesQ: (photo) => `¿Cuáles son las reglas principales de la ${photo}?`,
    sourcesQ: (name) => `¿De dónde salen las cifras del documento «${name}»?`,
    sourcesA: (allPrimary, titles, date) =>
      `De ${allPrimary ? "las páginas propias de la autoridad emisora" : "las páginas que aparecen en Fuentes"}: ${titles}. Última comprobación: ${date}.`,
  },

  meta: {
    brand: "PortraitPass",
    docTitles: (photo, short, brand) => {
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      // Index 3 is the fallback when nothing fits in 60 characters.
      return [
        `${cap(photo)}: medidas y requisitos — ${brand}`,
        `${cap(photo)}: medidas y requisitos`,
        `${cap(photo)}: medidas`,
        `${cap(short)}: medidas y requisitos`,
        `${cap(short)}: medidas`,
      ];
    },
    docNoSize: (photo) => `${photo.charAt(0).toUpperCase()}${photo.slice(1)}: no hay tamaño que preparar.`,
    docSpec: (photo, summary, head) =>
      `${photo.charAt(0).toUpperCase()}${photo.slice(1)}: ${summary}${head ? `, cabeza ${head}` : ""}.`,
    docNotHome: "No es una foto casera: mira adónde acudir.",
    docHome: "Hazla gratis en tu navegador.",
    docChecked: (date) => `Fuentes consultadas el ${date}.`,
    docFillers: ["No se sube nada.", "Sin cuenta ni marca de agua."],
    indexTitle: "Fotos de pasaporte, visa y documentos: requisitos — PortraitPass",
    indexDescription: (n) =>
      `Medidas, posición de la cabeza, fondo y peso del archivo de ${n} pasaportes, visas y documentos, cada uno con su fuente y la fecha de comprobación.`,
  },

  table: {
    document: "Documento",
    head: {
      size: "Foto",
      print: "Tamaño impreso",
      digital: "Tamaño digital",
      head: "Cabeza",
      eye: "Línea de los ojos",
      kb: "Peso del archivo",
      bg: "Fondo",
      home: "¿En casa?",
      country: "País",
    },
    homeYes: "Sí",
    homeDigital: "Sí, solo subida",
    homeNo: "No",
    originalFile: "Archivo original",
    bgNone: "Sin especificar",
    paperCaption: "Papel que indican las fuentes",
    paperSize: "Tamaño",
    paperPaper: "Papel",
  },

  shell: {
    home: "Inicio",
    breadcrumb: "Ruta de navegación",
  },

  doc: {
    kind: {
      passport: "Pasaporte",
      visa: "Visa",
      "id-card": "Documento de identidad",
      residence: "Residencia o inmigración",
      citizenship: "Ciudadanía",
      lottery: "Sorteo",
      "exam-form": "Solicitud de examen",
      other: "Trámite",
    },
    title: (photo) => `${photo.charAt(0).toUpperCase()}${photo.slice(1)}: medidas y requisitos`,
    eyebrow: (country, kind) => `${country} · ${kind}`,
    specTitle: "Especificaciones de la foto",
    printCaption: "Foto impresa",
    digitalCaption: "Archivo digital",
    rowPhotoSize: "Tamaño de la foto",
    rowHead: "Cabeza, de la coronilla al mentón",
    rowEye: "Línea de los ojos, desde el borde inferior",
    rowCopies: "Fotos necesarias",
    rowPaper: "Papel",
    rowUpload: "Subida",
    rowUploadOriginal: "El archivo original de la cámara, sin editar ni recortar",
    rowMinSize: "Tamaño mínimo",
    rowImageSize: "Tamaño de la imagen",
    rowFileSize: "Peso del archivo",
    rowFormats: "Formatos",
    fileSizeValue: (kb, def) => `${kb}. ${def}`,
    specNote: (check, date, rules) => `${check} Última comprobación: ${date}. ${rules}`,
    specNoteNotHome: (date, rules) => `Cifras de la fuente. Última comprobación: ${date}. ${rules}`,
    diagramAlt: (size) => `Marco de la foto a escala, ${size}, con los rangos de cabeza y línea de los ojos marcados`,
    diagramHead: "Cabeza",
    diagramEye: "Línea de los ojos",
    diagramNote: "Dibujo a escala con las cifras de la tabla. La forma de la cabeza es solo una guía.",
    backgroundTitle: "Fondo y edición",
    rulesTitle: "Reglas de la fuente",
    rulesFooter:
      "La expresión, la iluminación y lo reciente que sea la foto no se pueden medir a partir de una imagen, así que compruébalos tú mismo.",
    homeTitle: "¿Se puede hacer en casa?",
    homeNo: "No.",
    homeNoDefault: "La foto la tiene que hacer la autoridad emisora o un proveedor que ella indique.",
    whereInstead: "Adónde acudir en su lugar",
    whereBody:
      "Pregunta a la oficina emisora qué fotógrafos o cabinas acepta. PortraitPass no hace esta foto, porque una impresión o un archivo hechos en casa serían rechazados.",
    whereFigures: " Lleva contigo las cifras de arriba para comprobar la foto que te entreguen.",
    othersFrom: (country) => `Documentos que puedes preparar tú mismo: ${country}`,
    browseAll: "Ver todos los documentos",
    homeYesDigitalOnly: "Sí, y no se imprime nada.",
    homeYes: "Sí.",
    homeYesDefault: "La fuente acepta una foto que prepares tú mismo.",
    studioBodyDigital:
      "PortraitPass encuadra la foto con las líneas de cabeza y ojos de arriba y exporta un archivo con el tamaño exacto en píxeles y por debajo del límite de peso.",
    studioBodyPrint:
      "PortraitPass encuadra la foto con las líneas de cabeza y ojos de arriba y exporta una foto suelta o una hoja de impresión, con las medidas a la vista para que las compruebes tú mismo.",
    stays: "Tu foto no sale de tu navegador.",
    openStudio: "Abrir el estudio para este documento",
    studioNote: "El editor está en inglés por ahora.",
    sourcesTitle: "Fuentes",
    faqTitle: "Preguntas frecuentes",
    relatedTitle: "Documentos relacionados",
    guidesTitle: "Guías relacionadas",
    reportBefore: "¿Encontraste un dato incorrecto o desactualizado?",
    reportLink: "Abre una incidencia con el enlace de la fuente.",
    relSiblings: "Mismo documento, otra vía",
    relCountry: (country) => `Más documentos: ${country}`,
    relSameSize: (size) => `Otros documentos con una foto impresa de ${size}`,
  },

  index: {
    eyebrow: "Requisitos de las fotos",
    title: "Requisitos de fotos para pasaporte, visa y documentos de identidad",
    crumb: "Documentos",
    lede: (n, countries, home, notHome) =>
      `${n} documentos de ${countries} países y regiones, cada uno con su tamaño, la posición de la cabeza y de los ojos, la regla del fondo y la fuente que hemos leído. ${home} se pueden preparar en casa; ${notHome} necesitan un fotógrafo, una cabina o una toma en la oficina emisora, y la página lo indica.`,
    countriesNav: "Países",
    bySize: "Por tamaño",
    links: {
      twoByTwo: "Foto de 2×2 pulgadas",
      thirtyFive: "Foto de 35×45 mm",
      sixHundred: "Subida de 600×600 px",
      under50: "Foto de menos de 50 KB",
      printing: "Guía de impresión",
    },
    countTag: (n) => `${n} ${n === 1 ? "documento" : "documentos"}`,
    tableCaption: (country) => `Documentos: ${country}`,
    footnote:
      "Cada cifra procede de la página de la propia autoridad emisora y se indica con la fecha de la última comprobación. Comprobamos medidas y posiciones; la autoridad emisora decide si acepta la foto.",
  },

  sizes: {
    eyebrowSize: "Tamaño de la foto",
    eyebrowFile: "Peso del archivo",
    eyebrowSheet: "Hoja de impresión",
    eyebrowPrinting: "Impresión",
    unitsTitle: "El mismo tamaño en todas las unidades",
    mistakesTitle: "Errores frecuentes",
    faqTitle: "Preguntas frecuentes",
    inches: "Pulgadas",
    millimetres: "Milímetros",
    px300: "Píxeles a 300 DPI",
    px600: "Píxeles a 600 DPI",
    onSheet: "En una hoja de 4×6 in",
    photosN: (n) => `${n} fotos`,
    studioFor: (name) => `Abrir el estudio para el documento «${name}»`,
    figuresChecked: (date) => `Cifras comprobadas el ${date}.`,
    px: (w, h) => `${w} × ${h} px`,
    inDataset: "En nuestros datos: ",
    printGuideCrumb: "Impresión",

    twoByTwo: {
      crumb: "Foto de 2×2 pulgadas",
      title: "Foto de 2×2 pulgadas: medidas, píxeles y documentos",
      metaTitle: "Foto de 2×2 pulgadas: medidas y documentos — PortraitPass",
      metaLead: (px) => `Foto de 2×2 pulgadas: 50,8 mm, ${px} px a 300 DPI.`,
      metaDocs: (n, lead) => `La usan ${n} documentos, entre ellos ${lead}.`,
      metaLeadFallback: "el pasaporte de Estados Unidos",
      metaTail: "Posición de cabeza y ojos, errores frecuentes y una herramienta gratuita en tu navegador.",
      lede: (px, n, some) =>
        `Una foto de 2×2 pulgadas mide 50,8 × 50,8 mm, o ${px} píxeles a 300 DPI. En nuestros datos, ${n} documentos piden una foto impresa de este tamaño${some ? `, entre ellos ${some}` : ""}.`,
      mmRow: "50,8 × 50,8 mm (a menudo redondeado a 51 × 51)",
      inRow: "2 × 2 in",
      caption: "Foto de 2×2 pulgadas",
      docsTitle: "Documentos que usan una foto impresa de 2×2 pulgadas",
      docsCaption: "Documentos con foto de 2×2 pulgadas",
      docsNote:
        "La posición de la cabeza y de los ojos cambia según el documento aunque el tamaño del papel sea el mismo, así que toma los valores de la página del documento para el que vas a presentar la solicitud.",
      mistakes: [
        "Estirar una foto rectangular hasta convertirla en cuadrada. Recorta en su lugar, para que el rostro conserve sus proporciones.",
        "Tratar 2×2 como un tamaño en píxeles. Es una medida física: la foto impresa tiene que medir 2 pulgadas, no solo 600 píxeles.",
        "Imprimir con «ajustar a la página» activado. La foto sale un poco más grande o más pequeña; mídela con una regla.",
        "Recortar con demasiado margen. La cabeza tiene que ocupar una parte fija de la altura, así que una cara pequeña en un cuadrado grande queda fuera de rango.",
      ],
      faqPxQ: "¿Cuántos píxeles tiene una foto de 2×2 pulgadas?",
      faqPxA: (a, b, c) =>
        `${a} píxeles a 300 DPI, ${b} a 600 DPI y ${c} a 200 DPI. Una foto impresa se define por su tamaño físico, así que el número de píxeles solo importa cuando se sube un archivo.`,
      faqMmQ: "¿2×2 pulgadas es lo mismo que 51×51 mm?",
      faqMmA:
        "Casi. Dos pulgadas son 50,8 mm y algunos formularios lo redondean a 51 mm. Una hoja impresa a tamaño real medirá 50,8 mm por cada lado, que es lo que significa la regla de 2 pulgadas.",
      faqWhichQ: "¿Qué documentos usan una foto de 2×2 pulgadas?",
      faqWhichA: (names) => `En nuestros datos: ${names}.`,
      faqWhichNone: "Ningún documento de nuestros datos pide ahora mismo este tamaño.",
    },

    thirtyFive: {
      crumb: "Foto de 35×45 mm",
      title: "Foto de 35×45 mm: medidas, píxeles y documentos",
      metaTitle: "Foto de 35×45 mm: medidas y documentos — PortraitPass",
      metaLead: (px) => `Foto de 35×45 mm: ${px} px a 300 DPI.`,
      metaDocs: (n, c) =>
        `La usan ${n} documentos de ${c} países, con el rango de cabeza y la regla de fondo de cada uno.`,
      metaTail: "Gratis, en tu navegador.",
      lede: (px, n) =>
        `35×45 mm es el tamaño de foto de pasaporte más habitual fuera de Estados Unidos: 1,38 × 1,77 in, o ${px} píxeles a 300 DPI. ${n} documentos de nuestros datos lo usan.`,
      caption: "Foto de 35×45 mm",
      mmRow: "35 × 45 mm",
      docsTitle: "Documentos que usan 35×45 mm",
      docsCaption: "Documentos de 35×45 mm",
      docsNote:
        "El formato es común, pero las reglas no. La altura de la cabeza, el color del fondo y si se acepta o no una foto hecha en casa varían según el documento, así que abre la página del tuyo.",
      mistakes: [
        "Estirar una foto 4:3 o cuadrada hasta 35×45. Recorta a la proporción 7:9 y conserva las proporciones del rostro.",
        "Imprimir un archivo de 35×45 con un tamaño físico incorrecto. Imprime a tamaño real y mide el resultado.",
        "Usar el tamaño de cabeza de otro país. La tabla de arriba muestra cómo cambian los rangos.",
        "Enviar una impresión casera cuando el documento exige un fotógrafo o una cabina. Esos documentos aparecen marcados como «No se hace en casa».",
      ],
      faqPxQ: "¿Cuántos píxeles tiene una foto de 35×45 mm?",
      faqPxA: (a, b) => `${a} píxeles a 300 DPI, y ${b} a 600 DPI.`,
      faqSameQ: "¿35×45 mm es lo mismo que 2×2 pulgadas?",
      faqSameA:
        "No. Una foto de 35×45 mm es más alta que ancha (1,38 × 1,77 in), mientras que 2×2 pulgadas es cuadrada. Si estiras una para que ocupe el espacio de la otra, deformas el rostro; recorta a la forma correcta.",
      faqHeadQ: "¿Todos los documentos de 35×45 mm usan el mismo tamaño de cabeza?",
      faqHeadA:
        "No. El tamaño del papel es el mismo, pero el rango de la cabeza lo fija cada documento, por ejemplo entre 29 y 36 mm según la autoridad. La tabla de esta página muestra cada uno.",
    },

    sixHundred: {
      crumb: "Foto de 600×600 píxeles",
      title: "Foto de 600×600 píxeles: subidas y límites de tamaño",
      metaTitle: "Foto de 600×600 píxeles: subida y límites — PortraitPass",
      metaLead: (exact, range) =>
        `Foto de 600×600 píxeles: ${exact} documentos piden exactamente este tamaño y ${range} lo aceptan dentro de un rango.`,
      metaTail: "Límites de peso, posición de la cabeza y una herramienta gratuita en tu navegador.",
      metaFiller: "No se sube nada.",
      lede: (exact, range) =>
        `Un cuadrado de 600×600 píxeles es el tamaño de subida de la lotería de Visas de Diversidad de Estados Unidos y cabe dentro de varios otros límites. ${exact} documentos de nuestros datos piden exactamente 600×600 y ${range} lo aceptan dentro de un rango.`,
      meaningTitle: "Qué significa 600×600",
      meaningBody:
        "Es un tamaño en píxeles, no un tamaño de impresión. A 300 píxeles por pulgada equivale a 2×2 pulgadas, pero un formulario de subida solo comprueba los píxeles y el peso del archivo. La foto debe ser un recorte cuadrado con la cabeza dentro del rango que fija el documento.",
      meaningHead: (name, headLo, headHi, eyeLo, eyeHi) =>
        `Para el documento «${name}», la cabeza mide entre ${headLo} y ${headHi} píxeles de alto en un marco de 600 píxeles, y la línea de los ojos queda entre ${eyeLo} y ${eyeHi} píxeles por encima del borde inferior.`,
      exactTitle: "Documentos que piden exactamente 600×600",
      exactCaption: "Exactamente 600×600 px",
      rangeTitle: "Documentos que aceptan 600×600 dentro de un rango",
      rangeCaption: "El rango incluye 600×600 px",
      rangeNote:
        "En estos casos puedes elegir el tamaño exacto dentro del rango. Un recorte cuadrado de al menos 600 píxeles es una opción segura cuando el rango lo permite.",
      faqSameQ: "¿Una foto de 600×600 píxeles es lo mismo que 2×2 pulgadas?",
      faqSameA:
        "Solo a 300 DPI. Dos pulgadas a 300 píxeles por pulgada son 600 píxeles, por eso los dos tamaños suelen mencionarse juntos. En una subida cuenta el número de píxeles; en una foto impresa, el tamaño físico.",
      faqWhichQ: "¿Qué documentos piden exactamente 600×600 píxeles?",
      faqWhichA: (names) => `En nuestros datos: ${names}.`,
      faqWhichNone: "Ahora mismo ningún documento de nuestros datos pide exactamente este tamaño.",
      faqKbQ: "¿Qué peso de archivo acompaña a 600×600 píxeles?",
      faqKbA: (items) => `Depende del documento: ${items}. La tabla de esta página los enumera todos.`,
      faqKbItem: (name, range) => `${name}: ${range}`,
      faqKbNone: "Las fuentes de estos documentos no indican un límite de peso.",
    },

    under50: {
      crumb: "Foto de menos de 50 KB",
      title: "Foto de menos de 50 KB: qué documentos fijan un límite",
      metaTitle: "Foto de menos de 50 KB: documentos con límite — PortraitPass",
      metaLead: (n, smallest) =>
        `¿Foto de menos de 50 KB? ${n} documentos fijan un límite de peso; el máximo más bajo que hemos encontrado es de ${smallest} KB.`,
      metaNone: "n/d",
      metaTail: "Cómo se cuentan los KB y cómo reducir el peso de la foto.",
      metaFiller: "Gratis, en tu navegador.",
      ledeSome: (n, names) => `${n} documentos de nuestros datos limitan la foto a 50 KB o menos: ${names}.`,
      ledeNone: (smallest) =>
        `Ningún documento de nuestros datos limita la foto a 50 KB o menos. El máximo más bajo que hemos encontrado es ${smallest}. Si tu formulario pide 50 KB, se aplica su propio límite; esta página muestra lo que exigen en realidad los documentos que hemos revisado.`,
      smallestOf: (kb, name) => `${kb} KB (${name})`,
      notStated: "sin indicar",
      limitsTitle: "Documentos con límite de peso",
      limitsCaption: "Ordenados por el peso máximo permitido",
      countingTitle: "Cómo se cuentan los KB",
      countingBody: (thousand) =>
        `Para algunas fuentes, un kilobyte equivale a 1000 bytes; para otras, a 1024; y algunas no lo indican.${thousand ? ` ${thousand} cuentan 1000 bytes.` : ""} Cuando un archivo está cerca del máximo, apunta a unos puntos porcentuales por debajo en vez de justo en el límite.`,
      howTitle: "Cómo bajar una foto por debajo de un límite",
      steps: [
        "Recorta primero a la forma que pide el documento, con la cabeza dentro del rango correcto.",
        "Ajusta el tamaño en píxeles al que pide el formulario. Una foto de móvil de 4000×3000 tiene unos 12 millones de píxeles; una subida de 600×600, 0,36 millones.",
        "Guarda en JPEG y baja la calidad poco a poco hasta que el archivo quede por debajo del límite.",
        "Comprueba el resultado a tamaño completo. Si el rostro se ve pixelado, elige un límite de peso mayor o un tamaño en píxeles menor, pero no ambas cosas.",
      ],
      howAfter:
        "Elige un documento en el estudio y la exportación digital aplica estos pasos con los límites de ese documento y te muestra el peso final antes de descargar.",
      studioLabel: "Abrir el estudio",
      faqWhichQ: "¿Qué documentos tienen un límite en KB?",
      faqWhichA: (n, from) =>
        `En nuestros datos, ${n} documentos fijan un límite de peso, desde ${from} hacia arriba. La tabla de esta página los enumera todos.`,
      faqWhichNone: "ninguno",
      faqBytesQ: "¿1 KB son 1000 o 1024 bytes?",
      faqBytesA: (names) =>
        `Depende de la fuente. ${names} cuentan 1000 bytes; las demás cuentan 1024 o no lo indican. Si estás cerca de un límite, usa la lectura más baja.`,
      faqBytesNone:
        "Las fuentes suelen contar 1024 bytes. Si estás cerca de un límite, deja un margen de unos puntos porcentuales.",
      faqSmallerQ: "¿Cómo reduzco el peso de una foto sin estropearla?",
      faqSmallerA:
        "Primero reduce las dimensiones en píxeles a las que pide el formulario y después baja la calidad JPEG poco a poco. Un fondo liso y bien iluminado también se comprime mejor que uno cargado.",
    },

    sheet: {
      crumb: "Hoja de impresión",
      title: "Fotos de pasaporte en una hoja de impresión de 4×6",
      metaTitle: "Hoja de fotos de pasaporte: 4×6, A4 o Carta — PortraitPass",
      metaLead: "Hoja de fotos de pasaporte: cuántas fotos caben en papel 4×6, A4 y Carta, con marcas de corte.",
      metaTail: "Imprime a tamaño real. Gratis, en tu navegador.",
      metaFiller: "No se sube nada.",
      lede: (n, size) =>
        `Una hoja de 4×6 pulgadas admite ${n} fotos de ${size}. El estudio las coloca a tamaño físico exacto, en un PDF o JPG que puedes llevar a un mostrador de fotos o imprimir tú mismo.`,
      ledeSizeFallback: "el tamaño habitual",
      crumbPrinting: "Impresión",
      countsTitle: "Fotos por hoja",
      countsCaption: "Fotos en una hoja, a 300 DPI",
      colSize: "Tamaño de la foto",
      col4x6: "4×6 in",
      colA4: "A4",
      colLetter: "Carta (EE. UU.)",
      countsNote:
        "Los números salen del mismo diseño que usa el estudio, con márgenes de impresión en A4 y Carta. El papel se gira hacia el lado que admita más fotos.",
      printingTitle: "Cómo imprimirla bien",
      steps: [
        "Exporta la hoja desde el estudio como PDF o JPG.",
        "Imprime a tamaño real o al 100 %. Desactiva «ajustar a la página» y cualquier escalado sin bordes.",
        "Mide una foto con una regla y compárala con el tamaño que indica la página del documento.",
        "Corta por las guías. En 4×6 están en los bordes compartidos; en A4 y Carta son marcas en las esquinas.",
      ],
      seeGuideBefore:
        "Para los precios en el mostrador de fotos, el papel y los documentos con reglas de impresión especiales, consulta la ",
      seeGuideLink: "guía de impresión",
      seeGuideAfter: ".",
      studioLabel: "Abrir el estudio y crear una hoja",
      faqCountQ: "¿Cuántas fotos de pasaporte caben en una copia de 4×6?",
      faqCountA: (items) => `${items}. La tabla de esta página incluye todos los tamaños que conocemos.`,
      faqCountItem: (n, size) => `${n} de ${size}`,
      faqCountNone: "Depende del tamaño de la foto.",
      faqLinesQ: "¿Por qué hay líneas entre las fotos?",
      faqLinesA:
        "En una hoja de 4×6 las fotos van borde con borde, con guías finas en los bordes compartidos para que cortes por ellas. En A4 y Carta, cada foto lleva marcas de corte en las esquinas y un margen para impresoras domésticas.",
      faqSettingQ: "¿Qué ajuste de impresión mantiene el tamaño exacto?",
      faqSettingA:
        "Tamaño real o 100 %, con «ajustar a la página» y el escalado sin bordes desactivados. Después, mide una foto con una regla.",
    },

    guide: {
      crumb: "Impresión",
      title: "Imprime fotos de pasaporte por unos 40¢",
      metaTitle: "Imprimir fotos de pasaporte: 4×6 o laboratorio — PortraitPass",
      metaLead:
        "Imprime fotos de pasaporte por unos 40¢: una hoja 4×6 en un mostrador de fotos, en casa o en un laboratorio.",
      metaTail: "Ajustes de tamaño real y reglas de impresión de cada documento.",
      metaFiller: "Gratis, en tu navegador.",
      lede: (n) =>
        `Exporta una hoja de 4×6 con ${n} fotos y pídela como una copia normal de 4×6 en un mostrador de fotos. Una farmacia o gran superficie de Estados Unidos suele cobrar unos 40 centavos por una; los precios varían, así que consúltalo antes de pedirla.`,
      counterTitle: "En un mostrador de fotos",
      counterSteps: [
        "Exporta la hoja 4×6 desde el estudio como JPG.",
        "Súbela para recogerla en CVS, Walgreens, Walmart Photo o un mostrador similar y elige una copia de 4×6.",
        "Elige «sin bordes» o «no recortar» si aparece la opción. La foto tiene que salir a tamaño real.",
        "Mide una foto con una regla antes de irte y luego corta por las guías.",
      ],
      counterNote: "El mostrador solo ve la hoja que subes. PortraitPass nunca la recibe.",
      homeTitle: "En casa",
      homeBefore:
        "Usa papel fotográfico, imprime a tamaño real o al 100 % y desactiva «ajustar a la página». Las hojas A4 y Carta llevan marcas de corte en las esquinas y un margen para impresoras domésticas. Consulta la ",
      homeLink: "página de la hoja de impresión",
      homeAfter: " para saber cuántas fotos caben.",
      rulesTitle: "Documentos con reglas de impresión especiales",
      auHeading: "Australia",
      auBody: (note, paper) =>
        `${note} El papel que indica la fuente: ${paper}. Lleva la hoja a un laboratorio fotográfico que ofrezca este tipo de impresión, en lugar de imprimirla con una impresora de inyección de tinta doméstica o de farmacia.`,
      ukHeading: "Reino Unido",
      ukBefore: " ¿Vas a presentar la solicitud en línea? Usa la ",
      ukLink: "página de subida en línea",
      ukAfter: ": admite la foto original sin recortar, así que no se imprime nada.",
      noHomeNote:
        "Algunos documentos no se pueden imprimir en casa en absoluto: Canadá pide un fotógrafo comercial y Alemania toma la foto en formato digital en la propia autoridad o con un proveedor certificado. Sus páginas explican el procedimiento.",
      closing:
        "Comprobamos medidas y posiciones; la autoridad emisora decide si acepta la foto. Los precios son orientativos y cambian; no tenemos ninguna alianza con los comercios mencionados aquí.",
      faqCostQ: "¿Cuánto cuesta imprimir fotos de pasaporte?",
      faqCostA:
        "Una copia de 4×6 en una farmacia o gran superficie de Estados Unidos cuesta normalmente unos 40 centavos, y una hoja admite varias fotos. Los precios varían según la tienda, así que consúltalo antes de pedirla.",
      faqHomeQ: "¿Puedo imprimir fotos de pasaporte en casa?",
      faqHomeA:
        "A veces. Algunos documentos aceptan una copia casera en papel fotográfico y otros exigen una impresión de laboratorio o profesional. Australia pide una impresión por sublimación de tinta de al menos 200 g/m², así que una copia de impresora de inyección de tinta doméstica no sirve.",
      faqCropQ: "¿Qué debo elegir cuando el mostrador pregunta por el recorte?",
      faqCropA:
        "Elige sin bordes o no recortar si aparece la opción, e imprime a tamaño real. Una tienda que recorta o escala la hoja automáticamente cambia el tamaño de la foto.",
    },
  },
};
