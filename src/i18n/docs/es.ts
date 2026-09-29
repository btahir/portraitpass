// Spanish text for every document in the dataset (src/core/data/*). Numbers, units and ids are
// unchanged; only the words are translated. "Visa" (not "visado") for Latin American readers.
// Names start with a common noun so "foto de <nombre>" reads naturally.
import type { LocaleDocs } from "./types";

export const ES: LocaleDocs = {
  countries: {
    "United States": "Estados Unidos",
    India: "India",
    Pakistan: "Pakistán",
    Bangladesh: "Bangladés",
    Nepal: "Nepal",
    "Sri Lanka": "Sri Lanka",
    "United Kingdom": "Reino Unido",
    "Schengen area": "Espacio Schengen",
    Ireland: "Irlanda",
    Germany: "Alemania",
    France: "Francia",
    Netherlands: "Países Bajos",
    Italy: "Italia",
    Canada: "Canadá",
    Australia: "Australia",
    "New Zealand": "Nueva Zelanda",
    China: "China",
    Japan: "Japón",
    Philippines: "Filipinas",
    "South Korea": "Corea del Sur",
    "South Africa": "Sudáfrica",
    "United Arab Emirates": "Emiratos Árabes Unidos",
  },
  docs: {
    // ------------------------------------------------------------- United States
    "us-passport": {
      name: "Pasaporte de Estados Unidos",
      diyNote:
        "Se aceptan fotos hechas en casa, pero no selfies: pide a otra persona que la tome o usa un trípode. Imprime en papel de calidad fotográfica.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Foto en color tomada en los últimos 6 meses.",
        "Cabeza, de la parte superior del cabello al mentón: de 1 a 1 3/8 in.",
        "Mira a la cámara, con expresión neutra o una sonrisa natural y ambos ojos abiertos.",
        "No se aceptan gafas, salvo en casos médicos poco frecuentes acompañados de una declaración.",
        "Sin filtros, retoques, software ni cambios con IA en la foto.",
        "Sin uniformes; sombreros y cubrecabezas solo por motivos religiosos o médicos.",
      ],
      searchTerms: [
        "foto pasaporte estados unidos",
        "foto pasaporte 2x2",
        "medidas foto pasaporte americano",
        "requisitos foto pasaporte estados unidos",
        "foto pasaporte 2x2 pulgadas",
        "imprimir foto de pasaporte en casa",
      ],
      paper: "papel de calidad fotográfica",
    },
    "us-passport-online": {
      name: "Renovación en línea del pasaporte de Estados Unidos",
      diyNote:
        "Sube el archivo original de la cámara, sin editar. No lo recortes, no le cambies el tamaño ni le pongas filtros, y no fotografíes una foto impresa.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Archivos aceptados: JPG, JPEG, PNG, HEIC o HEIF.",
        "Peso del archivo entre 54 KB y 10 MB.",
        "Una foto en color tomada en los últimos 6 meses.",
        "Mira directamente a la cámara, con la cabeza centrada y ambos ojos abiertos y visibles.",
        "Sin filtros ni herramientas de retoque; sin escaneos ni fotos de una foto impresa.",
      ],
      searchTerms: [
        "foto renovación pasaporte estados unidos en línea",
        "renovar pasaporte americano en línea foto",
        "subir foto renovación pasaporte",
        "tamaño foto pasaporte para subir",
        "foto digital pasaporte estados unidos",
      ],
    },
    "us-passport-card": {
      name: "Tarjeta de pasaporte de Estados Unidos",
      diyNote:
        "Las mismas reglas de foto que el pasaporte en libreta. Que otra persona tome la foto o usa un trípode; sin selfies.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "No se aceptan uniformes ni ropa de estilo camuflaje en pasaportes en libreta ni en tarjetas.",
        "Foto en color tomada en los últimos 6 meses.",
        "Cabeza, de la parte superior del cabello al mentón: de 1 a 1 3/8 in.",
        "No se aceptan gafas, salvo en casos médicos poco frecuentes.",
        "Sin filtros, retoques, software ni cambios con IA en la foto.",
      ],
      searchTerms: [
        "foto tarjeta de pasaporte estados unidos",
        "medidas foto tarjeta de pasaporte",
        "requisitos foto tarjeta de pasaporte",
        "foto tarjeta de pasaporte 2x2",
      ],
      paper: "papel de calidad fotográfica",
    },
    "us-visa": {
      name: "Visa de Estados Unidos (DS-160)",
      diyNote:
        "Sube una foto digital con el DS-160. Si la subida falla, lleva una foto impresa de 2x2 in junto con la página de confirmación.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Imagen digital: JPEG, cuadrada, de 600 a 1200 píxeles por lado, 240 kB o menos.",
        "No mejores ni alteres digitalmente la foto para cambiar tu aspecto.",
        "Cabeza, de la parte superior del cabello al mentón: del 50 % al 69 % de la altura de la imagen.",
        "Línea de los ojos: del 56 % al 69 % de la altura de la imagen, medida desde el borde inferior.",
        "Foto tomada en los últimos 6 meses, que muestre tu aspecto actual.",
        "Ya no se permiten gafas en las fotos nuevas para visa, salvo casos médicos poco frecuentes.",
      ],
      searchTerms: [
        "foto visa estados unidos",
        "foto ds-160",
        "requisitos foto ds 160",
        "medidas foto visa americana",
        "foto visa americana 600x600",
        "foto visa americana 240 kb",
      ],
    },
    "dv-lottery": {
      name: "Lotería de Visas de Diversidad (DV)",
      diyNote: "Solo foto digital para la inscripción; no se imprime nada.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Imagen digital: JPEG, cuadrada, 600 x 600 píxeles, 240 kB o menos.",
        "Las inscripciones con fotos manipuladas quedan descalificadas; sin mejoras digitales.",
        "Cabeza, de la parte superior del cabello al mentón: del 50 % al 69 % de la altura de la imagen.",
        "Línea de los ojos: del 56 % al 69 % de la altura de la imagen, medida desde el borde inferior.",
        "Foto tomada en los últimos 6 meses, con fondo blanco liso o blanco roto.",
      ],
      searchTerms: [
        "foto lotería de visas",
        "foto visa de diversidad",
        "medidas foto lotería de visas",
        "requisitos foto lotería de visas",
        "foto lotería green card",
        "foto dv 2027",
      ],
    },
    "us-green-card": {
      name: "Solicitud de green card de Estados Unidos (I-485)",
      diyNote:
        "Las instrucciones del formulario I-485 piden dos fotos impresas idénticas: papel fino y brillante, sin montar y sin retocar. En algunos trámites de USCIS la foto se toma en la cita de datos biométricos.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Dos fotos idénticas en color, estilo pasaporte, tomadas recientemente.",
        "Las fotos deben estar sin montar y sin retocar: sin ediciones ni mejoras digitales.",
        "Cabeza, de la parte superior del cabello al mentón: de 1 a 1 3/8 in.",
        "Altura de los ojos desde el borde inferior de la foto: de 1 1/8 a 1 3/8 in.",
        "Cabeza descubierta, salvo que tu confesión religiosa exija llevar algo en la cabeza.",
        "Escribe ligeramente tu nombre y tu número A en el reverso con lápiz o rotulador suave.",
      ],
      searchTerms: [
        "foto green card",
        "foto i-485",
        "requisitos foto pasaporte i-485",
        "foto ajuste de estatus",
        "foto uscis 2x2",
      ],
      paper: "papel fino, acabado brillante, sin montar",
    },
    "us-ead": {
      name: "Permiso de trabajo de Estados Unidos (EAD, I-765)",
      diyNote:
        "Las instrucciones del formulario I-765 piden dos fotos impresas idénticas: papel fino y brillante, sin montar y sin retocar.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Dos fotos idénticas en color, estilo pasaporte, tomadas recientemente.",
        "Las fotos deben estar sin montar y sin retocar: sin ediciones ni mejoras digitales.",
        "Cabeza, de la parte superior del cabello al mentón: de 1 a 1 3/8 in.",
        "Altura de los ojos desde el borde inferior de la foto: de 1 1/8 a 1 3/8 in.",
        "Cabeza descubierta, salvo que tu confesión religiosa exija llevar algo en la cabeza.",
        "Escribe ligeramente tu nombre y tu número A en el reverso con lápiz o rotulador suave.",
      ],
      searchTerms: [
        "foto ead",
        "foto i-765",
        "foto permiso de trabajo",
        "requisitos foto autorización de empleo",
        "medidas foto pasaporte i-765",
      ],
      paper: "papel fino, acabado brillante, sin montar",
    },
    "us-travel-document": {
      name: "Permiso Advance Parole / viaje de refugiados de EE. UU. (I-131)",
      diyNote:
        "Se aplica a los trámites de Advance Parole, de autorización de viaje del TPS y del documento de viaje para refugiados. Una foto digital debe proceder de una cámara de al menos 3,5 megapíxeles.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Dos fotos idénticas en color, estilo pasaporte, tomadas recientemente.",
        "Las fotos deben estar sin montar y sin retocar.",
        "Cabeza, de la parte superior del cabello al mentón: de 1 a 1 3/8 in.",
        "Altura de los ojos desde el borde inferior de la foto: de 1 1/8 a 1 3/8 in.",
        "Una foto digital debe proceder de una cámara de al menos 3,5 megapíxeles.",
        "Escribe ligeramente tu nombre y tu número A en el reverso con lápiz o rotulador suave.",
      ],
      searchTerms: [
        "foto i-131",
        "foto advance parole",
        "foto documento de viaje para refugiados",
        "requisitos foto documento de viaje",
        "medidas foto pasaporte i-131",
      ],
      paper: "papel fino, acabado brillante, sin montar",
    },
    "us-naturalization": {
      name: "Solicitud de naturalización de Estados Unidos (N-400)",
      diyNote:
        "La mayoría de los solicitantes del N-400 dentro de Estados Unidos no envían fotos: USCIS toma la foto en la cita de datos biométricos. Los solicitantes en el extranjero (ciertas categorías militares y de residentes en el exterior) envían dos fotos impresas.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Las fotos solo son necesarias para quienes presentan la solicitud desde fuera de Estados Unidos.",
        "Dos fotos idénticas en color, estilo pasaporte, tomadas recientemente, sin montar y sin retocar.",
        "Cabeza, de la parte superior del cabello al mentón: de 1 a 1 3/8 in.",
        "Altura de los ojos desde el borde inferior de la foto: de 1 1/8 a 1 3/8 in.",
        "USCIS puede pedir fotos físicas más adelante, después de presentar la solicitud.",
      ],
      searchTerms: [
        "foto n-400",
        "foto naturalización",
        "foto solicitud de ciudadanía",
        "requisitos foto pasaporte n-400",
      ],
      paper: "papel fino, acabado brillante, sin montar",
    },

    // --------------------------------------------------------------------- India
    "in-passport": {
      name: "Pasaporte de India (solicitado en India)",
      diyNote:
        "No hace falta llevar foto a un Passport Seva Kendra ni a un PSK de oficina de correos: allí se toma la foto. Solo las solicitudes presentadas en el District Passport Cell, por correo urgente (speed-post) o en un centro de servicios ciudadanos llevan foto impresa.",
      colors: ["blanco"],
      rules: [
        "La foto impresa solo se necesita en solicitudes presentadas en un DPC, por speed-post o en un CSC; no hace falta en un PSK ni en un POPSK.",
        "Tamaño de la foto impresa: 4,5 cm de alto por 3,5 cm de ancho, en color, una foto.",
        "No se aceptan impresiones de ordenador; usa una copia en papel fotográfico.",
        "Ambas orejas y el rostro completo visibles, expresión natural, ojos abiertos.",
        "Cubrecabezas solo por motivos religiosos, con el rostro bien visible.",
        "Menores de 4 años: foto en color de 45 mm por 35 mm, rostro del 80 al 85 por ciento, fondo blanco.",
      ],
      searchTerms: [
        "medidas foto pasaporte india",
        "foto tamaño pasaporte 35x45 mm",
        "requisitos foto pasaporte india",
        "foto passport seva",
        "foto pasaporte bebé india",
      ],
      paper: "papel fotográfico de buena calidad, impresión de tono continuo",
    },
    "in-passport-abroad": {
      name: "Pasaporte de India y servicios consulares (solicitados en el extranjero)",
      diyNote:
        "Foto impresa, idealmente de un estudio profesional; las copias de impresora doméstica y las Polaroid no son adecuadas. Las misiones difieren (algunas indican 35 x 35 mm), así que consulta la lista de requisitos de tu misión o centro de visas.",
      colors: ["blanco", "blanco roto"],
      rules: [
        "Foto en color, 2 x 2 in (51 x 51 mm), rostro completo, vista frontal, ojos abiertos.",
        "Cabeza, de la parte superior del cabello al mentón: de 1,4 a 1,6 in (35 a 40 mm).",
        "No retoques, mejores ni suavices la foto.",
        "Sin gafas tintadas ni oscuras; evita los reflejos en los cristales.",
        "Cubrecabezas solo por motivos religiosos, con el rostro bien visible.",
        "La foto debe mostrar ambas orejas, el cuello y los hombros, y no tener sombras.",
      ],
      searchTerms: [
        "foto renovación pasaporte indio estados unidos",
        "foto pasaporte india 2x2 pulgadas",
        "foto pasaporte 51x51 mm",
        "foto pasaporte india vfs",
        "medidas foto consulado de india",
      ],
      paper: "papel fotográfico fino, impresión de tono continuo",
    },
    "in-oci": {
      name: "Tarjeta OCI de India (subida en línea)",
      colors: ["color claro liso (no blanco)"],
      rules: [
        "Foto cuadrada, JPEG o JPG, de 200 KB como máximo.",
        "De 200 x 200 a 900 x 900 píxeles.",
        "Fondo liso de color claro, no blanco, y sin borde.",
        "Cabeza y hombros, rostro completo, en el centro del encuadre.",
        "Cuando se pide una copia impresa: al menos 51 x 51 mm, con el rostro ocupando el 80 por ciento.",
      ],
      searchTerms: [
        "requisitos foto oci",
        "foto oci tamaño en píxeles",
        "subir foto tarjeta oci",
        "foto oci 200kb",
        "redimensionar foto oci",
      ],
    },
    "in-evisa": {
      name: "Visa electrónica (e-Visa) de India (subida en línea)",
      colors: ["color claro liso", "blanco"],
      rules: [
        "JPEG, de 10 KB a 1 MB; el alto y el ancho deben ser iguales.",
        "Rostro completo, vista frontal, ojos abiertos y sin gafas.",
        "Centra la cabeza y muéstrala de la parte superior del cabello al mentón.",
        "Sin sombras en el rostro ni en el fondo, y sin bordes.",
        "Las solicitudes de visa ordinaria tienen otros límites: de 10 a 300 KB y de 350 a 1000 px.",
      ],
      searchTerms: [
        "requisitos foto e visa india",
        "medidas foto evisa india",
        "subir foto visa india 1mb",
        "redimensionar foto e-visa india",
        "foto visa india cuadrada",
      ],
    },
    "in-visa": {
      name: "Visa ordinaria de India (subida en línea)",
      colors: ["color claro liso", "blanco"],
      rules: [
        "JPEG, de 10 KB a 300 KB; el alto y el ancho deben ser iguales.",
        "De 350 x 350 a 1000 x 1000 píxeles.",
        "Rostro completo, vista frontal, ojos abiertos; centra la cabeza en el encuadre.",
        "Cabeza completa, de la parte superior del cabello al mentón.",
      ],
      searchTerms: [
        "medidas foto visa india",
        "foto visa india 350x350",
        "requisitos foto visa india en línea",
        "foto visa india 300kb",
      ],
    },
    "in-ssc": {
      name: "Solicitud de examen SSC (CGL, CHSL)",
      diyNote:
        "Las solicitudes de CGL y CHSL de 2026 toman la foto en directo y rechazan una foto de una foto ya existente. Las guías que hablan de subidas de 20 a 50 KB están desactualizadas.",
      colors: ["liso"],
      rules: [
        "La foto se toma en directo con la cámara web o el móvil durante la solicitud.",
        "Si fotografías una foto ya existente, se rechaza la solicitud.",
        "Sin gorra, mascarilla ni gafas; usa buena luz y un fondo liso.",
        "Tu aspecto el día del examen debe coincidir con la foto tomada.",
        "La firma es una subida JPEG aparte, de 10 a 20 KB.",
      ],
      searchTerms: [
        "medidas foto ssc",
        "foto ssc cgl tamaño kb",
        "foto ssc 20kb a 50kb",
        "foto en directo ssc",
        "requisitos foto ssc chsl",
      ],
    },
    "in-upsc": {
      name: "Solicitud de examen UPSC (subida de foto)",
      diyNote: "El formulario también pide una foto tomada en directo durante la solicitud.",
      colors: ["blanco"],
      rules: [
        "JPG en color, de 20 a 200 KB, guardado con el nombre de archivo photo.",
        "El rostro ocupa al menos el 75 por ciento de la superficie de la foto.",
        "Vista frontal, cabeza centrada, ambas orejas visibles, ojos abiertos.",
        "Sin fondo oscuro, uniforme ni gafas oscuras; sin sombras.",
        "La firma es aparte: JPG, de 20 a 100 KB, de 350 a 500 píxeles.",
      ],
      searchTerms: [
        "medidas foto upsc",
        "tamaño foto y firma upsc kb",
        "foto upsc 20kb a 200kb",
        "foto upsc rostro 75 por ciento",
        "subir foto upsc cse",
      ],
    },
    "in-neet-ug": {
      name: "Solicitud de NEET (UG)",
      diyNote:
        "La solicitud también pide una foto en directo tomada con tu cámara web o tu móvil, así que el archivo subido no es la única foto.",
      colors: ["blanco"],
      rules: [
        "JPG o JPEG, de 10 a 200 KB, en color o en blanco y negro.",
        "Alrededor del 80 por ciento de la imagen debe ser tu rostro, con las orejas incluidas y sin mascarilla.",
        "La foto debe ser reciente: tomada después del 1 de enero de 2026 para el examen de 2026.",
        "La firma es aparte: JPG o JPEG, de 10 a 100 KB.",
      ],
      searchTerms: [
        "medidas foto neet",
        "tamaño foto neet en kb",
        "requisitos foto neet ug",
        "foto neet 10kb a 200kb",
        "tamaño foto y firma nta",
      ],
    },
    "in-jee-main": {
      name: "Solicitud de JEE (Main)",
      diyNote:
        "La solicitud también pide una foto en directo tomada con tu cámara web o tu móvil, así que el archivo subido no es la única foto.",
      colors: ["blanco"],
      rules: [
        "JPG o JPEG, de 10 a 200 KB, en color.",
        "Alrededor del 80 por ciento de la imagen debe ser tu rostro, con las orejas incluidas y sin mascarilla.",
        "La foto debe ser reciente, en color y perfectamente legible.",
        "La firma es aparte: JPG o JPEG, de 10 a 100 KB.",
      ],
      searchTerms: [
        "medidas foto jee main",
        "tamaño foto jee main en kb",
        "requisitos foto jee main",
        "foto jee main 10kb a 200kb",
      ],
    },

    // ------------------------------------------------------------------ Pakistan
    "pk-passport": {
      name: "Pasaporte de Pakistán (solicitado en Pakistán)",
      diyNote:
        "En una Oficina Regional de Pasaportes, el personal toma tu foto junto con los datos de tu solicitud; no llevas ninguna.",
      rules: [
        "La foto se toma en la oficina de pasaportes durante la solicitud.",
        "La renovación en línea desde el extranjero es otra vía, con sus propias reglas de subida.",
      ],
      searchTerms: [
        "medidas foto pasaporte pakistán",
        "requisitos foto pasaporte pakistán",
        "foto e pasaporte pakistán",
      ],
    },
    "pk-passport-online": {
      name: "Renovación en línea del pasaporte de Pakistán (desde el extranjero)",
      diyNote:
        "Tú mismo tomas y subes la foto. No recortes una imagen más grande ni la edites con software; sube el archivo original de la cámara sin tocar.",
      colors: ["liso"],
      rules: [
        "Tamaño de la foto: 45 mm de alto por 35 mm de ancho.",
        "Archivo digital de hasta 5 MB.",
        "No uses una foto recortada de una imagen más grande.",
        "No edites la foto con software como Photoshop.",
      ],
      searchTerms: [
        "foto renovación pasaporte pakistán en línea",
        "medidas foto pasaporte pakistán 35x45",
        "requisitos foto onlinemrp",
        "foto pasaporte pakistán 5mb",
      ],
    },
    "pk-visa": {
      name: "Visa en línea de Pakistán (subida de foto)",
      colors: ["blanco"],
      rules: [
        "JPG de hasta 350 KB.",
        "Tamaño de la foto: 45 mm de alto por 35 mm de ancho, en color.",
        "Primer plano de la cabeza y la parte superior de los hombros; el rostro ocupa del 70 al 80 por ciento de la foto.",
        "Mira a la cámara, con ambos lados del rostro visibles, sin sombras, reflejos de flash ni ojos rojos.",
        "Sin gafas; se permiten cubrecabezas si el rostro se ve despejado del mentón a la frente.",
      ],
      searchTerms: [
        "medidas foto visa pakistán",
        "requisitos foto visa en línea pakistán",
        "foto visa pakistán 35x45",
        "foto visa pakistán 350kb",
        "foto visa nadra",
      ],
    },
    "pk-nicop": {
      name: "Tarjeta NICOP / POC de Pakistán (foto en línea de NADRA)",
      colors: ["liso", "blanco"],
      rules: [
        "Foto de hasta 350 KB.",
        "De no más de 6 meses; no se acepta blanco y negro.",
        "Archivo original sin filtros ni capas, no alterado de ninguna manera.",
        "Sin sombreros, lentes artificiales ni gafas; sin sombras ni pelo sobre los ojos.",
        "Se permiten cubrecabezas si todo el rostro, incluido el mentón, se ve con claridad.",
      ],
      searchTerms: [
        "requisitos foto nicop",
        "medidas foto nadra",
        "guía subida foto nadra",
        "foto id pakistán 350kb",
      ],
    },

    // ---------------------------------------------------------------- Bangladesh
    "bd-passport": {
      name: "Pasaporte electrónico de Bangladés",
      diyNote:
        "No se adjunta ninguna foto al formulario del pasaporte electrónico. Solo los solicitantes menores de 6 años llevan una foto impresa en laboratorio.",
      colors: ["gris (solo en la impresión para menores de 6 años)"],
      rules: [
        "No se adjunta ni se certifica ninguna foto en el formulario del pasaporte electrónico.",
        "Solicitantes menores de 6 años: impresión de laboratorio 3R (tamaño 4R) con fondo gris.",
      ],
      searchTerms: [
        "foto pasaporte electrónico bangladés",
        "medidas foto pasaporte bangladés",
        "requisitos foto pasaporte bangladés",
      ],
    },
    "bd-visa": {
      name: "Visa de Bangladés (foto del formulario en línea)",
      diyNote:
        "La foto en línea es opcional. Las misiones pueden pedir también fotos impresas, por ejemplo dos copias en color de 2 x 2 in con fondo blanco tomadas en los últimos 6 meses (Los Ángeles).",
      colors: ["blanco"],
      rules: [
        "Foto digital de 45 mm por 35 mm, JPEG, de 300 KB como máximo.",
        "Subir la foto es opcional en el formulario en línea.",
        "Las reglas de impresión varían según la misión; consulta la que tramita tu visa.",
      ],
      searchTerms: [
        "medidas foto visa bangladés",
        "foto visa bangladés en línea",
        "foto visa bangladés 300kb",
      ],
    },

    // --------------------------------------------------------------------- Nepal
    "np-passport": {
      name: "Pasaporte electrónico de Nepal",
      diyNote:
        "La foto se toma en directo en el centro de inscripción. Solo los recién nacidos y los menores de 5 años llevan una foto impresa.",
      colors: ["blanco (solo en la impresión para menores de 5 años)"],
      rules: [
        "Los adultos no llevan foto; el personal la toma en tiempo real.",
        "Menores de 5 años: tamaño pasaporte de 35 mm por 45 mm, blanco liso, sin borde.",
      ],
      searchTerms: [
        "medidas foto pasaporte nepal",
        "requisitos foto pasaporte electrónico nepal",
        "foto pasaporte nepal 35x45",
      ],
    },

    // ----------------------------------------------------------------- Sri Lanka
    "lk-passport": {
      name: "Pasaporte de Sri Lanka",
      diyNote:
        "Un estudio fotográfico autorizado envía una foto digital al Departamento, o se toma en sus oficinas. No se aceptan fotos impresas.",
      rules: [
        "La foto debe haberse tomado en los últimos 6 meses.",
        "Los estudios la envían en línea; no hace falta foto impresa para la solicitud.",
        "Los ojos deben verse con claridad y sin gafas.",
        "Se permiten gorras y pañuelos si la frente y las orejas se ven con claridad, sin sombra del pañuelo sobre el rostro.",
      ],
      searchTerms: [
        "foto pasaporte sri lanka",
        "requisitos foto pasaporte sri lanka",
        "foto digital pasaporte sri lanka estudio",
      ],
    },

    // ------------------------------------------------------------ United Kingdom
    "uk-passport": {
      name: "Pasaporte del Reino Unido (impreso)",
      diyNote:
        "Las copias deben verse impresas con calidad profesional y no ser un recorte de una imagen más grande. Un laboratorio fotográfico o una cabina es la vía más segura para los formularios en papel.",
      colors: ["crema", "gris claro"],
      rules: [
        "Dos copias idénticas para la solicitud en papel; sin bordes, dobleces ni marcas.",
        "Tomada en el último mes, en color.",
        "Expresión neutra, boca cerrada, ojos abiertos, sin sombras en el rostro ni detrás de ti.",
        "Sin gafas salvo que las necesites; nunca tintadas, y sin montura, brillo ni reflejo sobre los ojos.",
        "La foto no debe estar alterada con software.",
        "No sustituyas ni cambies el fondo; quitar marcas o sombras puede tolerarse en la revisión.",
      ],
      searchTerms: [
        "medidas foto pasaporte reino unido",
        "foto pasaporte reino unido 35x45",
        "requisitos foto pasaporte reino unido",
        "foto pasaporte británico impresa",
        "medidas foto pasaporte hm passport office",
      ],
      paper: "papel fotográfico blanco liso, sin borde",
    },
    "uk-passport-online": {
      name: "Pasaporte del Reino Unido (subida en línea)",
      diyNote:
        "Sube la foto original. El servicio en línea la recorta, así que no la recortes ni la edites tú. Debe tomarla otra persona; sin selfies.",
      colors: ["de color claro", "liso"],
      rules: [
        "No recortes la foto; incluye cabeza, hombros y parte superior del cuerpo.",
        "En color, nítida y enfocada, sin alterar con software.",
        "Tomada en el último mes, con ayuda de otra persona.",
        "Expresión neutra, boca cerrada, ojos abiertos y visibles, sin sombras en el rostro ni detrás de ti.",
      ],
      searchTerms: [
        "foto pasaporte reino unido en línea",
        "tamaño foto pasaporte reino unido para subir",
        "foto pasaporte reino unido 600x750",
        "foto digital pasaporte reino unido",
      ],
    },
    "uk-visa": {
      name: "Visa o permiso del Reino Unido (foto UKVI)",
      diyNote:
        "Para las solicitudes que piden subir una foto de tu rostro. Puede proceder de un móvil o una tableta; que la tome otra persona reduce la probabilidad de rechazo.",
      colors: ["de color claro", "liso"],
      rules: [
        "Orientación vertical; sin reflejar ni voltear.",
        "Muestra cabeza, hombros y parte superior del cuerpo, sin nadie más en la foto.",
        "No debe estar alterada con software ni con un filtro; tómala en una sala bien iluminada.",
        "No una foto de otra foto, ni la misma foto que la de tu pasaporte.",
        "Sin sombras en el rostro ni detrás de ti; intenta que te la tome otra persona.",
      ],
      searchTerms: [
        "requisitos foto visa reino unido",
        "subir foto ukvi",
        "medidas foto visa reino unido",
        "foto evisa reino unido",
        "requisitos foto brp",
      ],
    },

    // ------------------------------------------------------------------- Europe
    "schengen-visa": {
      name: "Visa Schengen",
      diyNote:
        "Cada consulado o centro de visas fija sus propias reglas, y algunos insisten en copias profesionales. Consulta el que tramita tu solicitud.",
      colors: ["blanco", "gris claro"],
      rules: [
        "El rostro ocupa del 70 al 80 por ciento de la foto, del mentón a la coronilla, centrado.",
        "Foto reciente, de como máximo seis meses; se rechazan escaneos y fotocopias.",
        "Iluminación uniforme: sin sombras en el rostro ni en el fondo, sin ojos rojos.",
        "Expresión neutra, boca cerrada, mirando directamente a la cámara.",
        "Los fondos varían: las misiones alemanas piden gris neutro claro, las italianas, blanco.",
      ],
      searchTerms: [
        "foto visa schengen",
        "medidas foto visa schengen",
        "requisitos foto visa schengen",
        "foto 35x45",
        "foto visa schengen 35x45 mm",
      ],
    },
    "ie-passport": {
      name: "Pasaporte de Irlanda (impreso)",
      diyNote:
        "Las solicitudes en papel necesitan copias en papel de calidad fotográfica. El color es válido; el pasaporte la muestra en blanco y negro.",
      colors: ["gris claro", "blanco", "crema"],
      rules: [
        "El tamaño puede ir de 35 x 45 mm hasta 38 x 50 mm.",
        "Cuatro copias idénticas, tomadas en los últimos seis meses.",
        "Muestra de la cabeza a la mitad del torso, con espacio visible alrededor de la cabeza y los hombros.",
        "Sin mejoras ni cambios digitales; sin marcas de tinta ni dobleces.",
        "Expresión neutra, boca cerrada, sin sombras en el rostro ni detrás de la cabeza.",
      ],
      searchTerms: [
        "medidas foto pasaporte irlandés",
        "requisitos foto pasaporte irlandés",
        "foto pasaporte irlanda 35x45",
        "foto pasaporte irlandés impresa",
      ],
      paper: "papel de calidad fotográfica y alta resolución; reverso blanco y sin satinar",
    },
    "ie-passport-online": {
      name: "Pasaporte de Irlanda (subida en línea)",
      diyNote:
        "Hazla en casa con ayuda de otra persona: sin selfies y sin zoom. Una cabina o una tienda pueden darte un código o un archivo en su lugar.",
      colors: ["gris claro", "blanco", "crema"],
      rules: [
        "En color, sin escanear, y sin artefactos de compresión ni distorsión de barril.",
        "No debe estar mejorada ni modificada digitalmente.",
        "Tomada en los últimos seis meses.",
        "Muestra de la cabeza a la mitad del torso; la herramienta de subida puede girar una foto que esté de lado.",
        "Se permiten gafas si la montura y el brillo no cubren los ojos.",
      ],
      searchTerms: [
        "foto pasaporte irlandés en línea",
        "subir foto pasaporte irlandés en línea",
        "foto pasaporte irlanda 715x951",
        "requisitos foto pasaporte irlanda en línea",
      ],
    },
    "de-passport": {
      name: "Pasaporte o documento de identidad de Alemania",
      diyNote:
        "Desde el 1 de mayo de 2025, la foto debe tomarse en formato digital en la propia autoridad o con un proveedor de fotos registrado. No se aceptan fotos en papel ni hechas en casa.",
      rules: [
        "Se aplica a pasaportes, documentos de identidad y tarjetas de permiso de residencia.",
        "Los proveedores envían la foto a la autoridad mediante una nube segura.",
        "Recibes un código Data Matrix impreso; la autoridad lo usa para recuperar la foto.",
        "Las fotos en papel solo se aceptaron en casos excepcionales hasta el 31 de julio de 2025.",
      ],
      searchTerms: [
        "foto biométrica digital 2025 alemania",
        "foto pasaporte alemán",
        "foto biométrica pasaporte alemania",
        "requisitos foto pasaporte alemán 2025",
        "foto pasaporte alemán digital",
      ],
    },
    "fr-passport": {
      name: "Pasaporte de Francia",
      diyNote:
        "La foto debe tomarla un profesional autorizado o hacerse en una cabina con un sistema autorizado por el Ministerio del Interior.",
      colors: ["azul claro", "gris claro"],
      rules: [
        "No se permiten fondos blancos; usa un color claro y liso.",
        "Foto de como máximo seis meses; solo hace falta una foto.",
        "Sin sombras en el rostro ni en el fondo; se recomienda mucho la foto en color.",
        "Cabeza descubierta, expresión neutra, boca cerrada, ojos abiertos y visibles.",
        "Las gafas son opcionales; montura fina, sin cristales tintados ni brillo.",
      ],
      searchTerms: [
        "foto pasaporte francia",
        "foto pasaporte francés norma",
        "medidas foto pasaporte francés",
        "foto pasaporte 35x45",
        "requisitos foto pasaporte francés",
      ],
    },
    "fr-id-card": {
      name: "Documento nacional de identidad de Francia",
      diyNote:
        "La foto debe tomarla un profesional autorizado o hacerse en una cabina con un sistema autorizado por el Ministerio del Interior.",
      colors: ["azul claro", "gris claro"],
      rules: [
        "No se permiten fondos blancos; usa un color claro y liso.",
        "Foto de como máximo seis meses; solo hace falta una foto.",
        "Sin sombras en el rostro ni en el fondo; se recomienda mucho la foto en color.",
        "Cabeza descubierta, expresión neutra, boca cerrada, ojos abiertos y visibles.",
        "Las gafas son opcionales; montura fina, sin cristales tintados ni brillo.",
      ],
      searchTerms: [
        "foto documento de identidad francia",
        "foto documento nacional de identidad norma",
        "foto documento de identidad francés",
        "foto cni 35x45",
      ],
    },
    "nl-passport": {
      name: "Pasaporte o documento de identidad de Países Bajos",
      diyNote:
        "Las reglas de la foto impresa no dicen quién debe tomarla. Consúltalo con tu ayuntamiento; mucha gente recurre a un fotógrafo o una cabina. La altura de la cabeza es menor que la habitual de 32 a 36 mm.",
      colors: ["gris claro", "azul claro", "blanco"],
      rules: [
        "Ancho del rostro de 16 a 20 mm; cabeza completa y centrada.",
        "Foto en color, de como máximo seis meses; no se permite blanco y negro.",
        "Fondo liso de un solo tono uniforme; sin sombra en el rostro ni en el fondo.",
        "Expresión neutra, boca cerrada, mirando directamente a la cámara.",
        "Solo gafas transparentes, sin brillo ni sombra sobre los ojos.",
      ],
      searchTerms: [
        "foto pasaporte países bajos",
        "requisitos foto pasaporte holandés",
        "medidas foto pasaporte países bajos",
        "requisitos foto pasaporte neerlandés",
        "foto pasaporte holandés 35x45",
      ],
      paper: "papel fotográfico liso y de alta calidad, de al menos 400 dpi",
    },
    "it-passport": {
      name: "Pasaporte de Italia",
      diyNote:
        "Las reglas de la foto impresa no dicen quién debe tomarla. Consúltalo con la oficina emisora; mucha gente recurre a un fotógrafo o una cabina.",
      colors: ["blanco"],
      rules: [
        "El rostro ocupa del 70 al 80 por ciento de la foto, del mentón a la frente.",
        "Foto reciente, de como máximo seis meses, en color.",
        "Luz uniforme, sin reflejos de flash, sombras ni ojos rojos.",
        "Expresión neutra, boca cerrada, mirando directamente a la cámara.",
        "Para la solicitud hace falta una foto.",
      ],
      searchTerms: [
        "medidas foto pasaporte italiano",
        "foto pasaporte italia",
        "foto pasaporte 35x45",
        "requisitos foto pasaporte italiano",
      ],
      paper: "papel fotográfico de alta calidad y alta resolución",
    },

    // -------------------------------------------------------------------- Canada
    "ca-passport": {
      name: "Pasaporte de Canadá",
      diyNote:
        "Debe tomarla en persona un fotógrafo comercial o un estudio, que añade sus datos en el reverso. Se rechazan las copias hechas en casa.",
      colors: ["blanco liso", "de color claro"],
      rules: [
        "Se exigen dos fotos idénticas y sin alterar.",
        "No se permiten programas de edición de fotos, filtros ni herramientas de IA.",
        "Expresión neutra con la boca cerrada.",
        "Se permiten gafas si los ojos se ven con claridad y los cristales no tienen brillo.",
        "Se rechazan las gafas de sol y los cristales tintados.",
      ],
      searchTerms: [
        "foto pasaporte canadá",
        "medidas foto pasaporte canadá",
        "requisitos foto pasaporte canadiense 50x70",
      ],
      paper: "impresa profesionalmente en papel fotográfico liso y de alta calidad",
    },
    "ca-visa": {
      name: "Visa de visitante de Canadá (TRV)",
      diyNote:
        "No hace falta un fotógrafo. Las fotos digitales no deben estar alteradas. Sigue las reglas propias del formulario en línea para el tamaño de la subida.",
      colors: ["blanco liso", "de color claro"],
      rules: [
        "El encuadre es de al menos 35 x 45 mm; se muestran la cabeza y la parte superior de los hombros.",
        "Tomada en los últimos seis meses.",
        "Expresión neutra, boca cerrada.",
        "Se permiten gafas sin tintar si la montura no cubre los ojos.",
        "Si es digital, la foto no debe estar alterada de ninguna manera.",
      ],
      searchTerms: [
        "medidas foto visa canadá",
        "requisitos foto visa de visitante canadá",
        "foto visa canadá 35x45",
      ],
      paper: "papel fotográfico de calidad",
    },
    "ca-pr": {
      name: "Tarjeta de residente permanente de Canadá",
      diyNote:
        "IRCC indica acudir a un fotógrafo comercial o a un estudio, incluso para la copia digital. Las fotos en papel necesitan el nombre, la dirección y la fecha del estudio en el reverso.",
      colors: ["blanco liso"],
      rules: [
        "Las solicitudes en línea llevan una foto digital; las solicitudes en papel llevan dos fotos idénticas.",
        "Foto tomada no más de 12 meses antes de presentar la solicitud.",
        "Expresión neutra, boca cerrada, ojos abiertos, mirando a la cámara.",
        "La foto no debe copiarse de otra foto ni estar alterada de ninguna manera.",
      ],
      searchTerms: [
        "foto tarjeta de residente permanente canadá",
        "requisitos foto residente permanente canadá",
        "medidas foto residencia permanente canadá 50x70",
      ],
      paper: "impresa profesionalmente en papel fotográfico liso y de alta calidad",
    },

    // ------------------------------------------------------------------- Oceania
    "au-passport": {
      name: "Pasaporte de Australia",
      diyNote:
        "Las copias deben ser por sublimación de tinta en papel brillante de al menos 200 g/m², así que hazla imprimir en un laboratorio fotográfico; las impresoras domésticas no cumplen este requisito. Se recomienda un proveedor profesional de fotos de pasaporte, aunque no es obligatorio; se desaconsejan las aplicaciones y los servicios en línea.",
      colors: ["blanco liso", "gris claro"],
      rules: [
        "El ancho de la copia puede ser de 35-40 mm y el alto de 45-50 mm.",
        "Se necesitan dos fotos, nítidas y sin editar.",
        "Suavizar la piel, aclarar el fondo o quitar sombras puede afectar a las comprobaciones biométricas.",
        "Mira al frente, con expresión neutra, sin sombras en el rostro ni en el fondo.",
      ],
      searchTerms: [
        "foto pasaporte australia",
        "medidas foto pasaporte australia",
        "requisitos foto pasaporte australiano 35x45",
      ],
      paper: "brillante, de gramaje alto, sublimación de tinta, mínimo 200 g/m²",
    },
    "au-visa": {
      name: "Visa de Australia",
      diyNote: "Home Affairs recomienda un proveedor profesional de fotos de pasaporte, pero no lo exige.",
      colors: ["neutro", "gris claro"],
      rules: [
        "Foto de pasaporte reciente, de 45 x 35 mm, solo cabeza y hombros, mirando a la cámara.",
        "Tomada en los últimos seis meses, en color y sin editar.",
        "El fondo debe contrastar con tu rostro.",
        "Sin gafas salvo necesidad médica; la montura no debe tapar los ojos.",
      ],
      searchTerms: [
        "medidas foto visa australia",
        "requisitos foto visa australiana",
        "foto visa australia 35x45",
      ],
    },
    "nz-passport": {
      name: "Pasaporte de Nueva Zelanda",
      diyNote: "Las solicitudes en línea llevan una foto subida; no se aceptan selfies.",
      rules: [
        "Orientación vertical, 3:4 (4:3 en la pantalla del ordenador).",
        "Foto en color tomada en los últimos 6 meses.",
        "No se aceptan selfies.",
        "Usa la herramienta de comprobación de fotos en línea de passports.govt.nz antes de subirla.",
      ],
      searchTerms: [
        "foto pasaporte nueva zelanda",
        "requisitos foto pasaporte nueva zelanda",
        "tamaño foto pasaporte nueva zelanda en píxeles en línea",
      ],
    },

    // ---------------------------------------------------------------------- Asia
    "cn-visa": {
      name: "Visa de China",
      diyNote:
        "Para el formulario en papel, imprime en papel fotográfico brillante (no mate); el formulario en línea admite una subida JPEG dentro de los límites de píxeles y de peso.",
      colors: ["blanco", "casi blanco"],
      rules: [
        "Ancho de la cabeza de 15-22 mm; sin marco alrededor de la foto.",
        "Tomada en los últimos 6 meses, en color, con tono natural.",
        "Expresión neutra, ojos abiertos, labios cerrados, orejas visibles.",
        "Inclinación de la cabeza de como máximo 20 grados hacia los lados y 25 grados hacia arriba o abajo.",
        "Se permiten gafas, salvo las de montura gruesa, tintadas o con brillo.",
      ],
      searchTerms: [
        "medidas foto visa china",
        "requisitos foto visa china",
        "foto visa china 33x48",
        "tamaño foto visa china para subir en línea",
      ],
      paper: "papel fotográfico de acabado brillante, no mate ni papel normal",
    },
    "jp-visa": {
      name: "Visa de Japón",
      diyNote:
        "El tamaño depende de la embajada: la mayoría indica 45 x 35 mm (35 de ancho, 45 de alto), la Embajada en India indica 45 x 45 mm y los consulados en Estados Unidos también aceptan 2 x 2 in. Consulta la que tramita tu solicitud.",
      colors: ["blanco"],
      rules: [
        "Tomada en los seis meses anteriores a la solicitud, vista frontal, sin sombrero.",
        "No se aceptan fondos oscuros, cargados ni con estampados.",
        "No se aceptan fotos modificadas digitalmente.",
        "Escribe tu nombre completo y tu fecha de nacimiento en el reverso.",
        "Altura de la cabeza de 32-36 mm cuando la embajada la indica; no todas lo hacen.",
      ],
      searchTerms: [
        "medidas foto visa japón",
        "foto visa japón 45x35",
        "requisitos foto visa japón",
      ],
    },
    "ph-passport": {
      name: "Pasaporte de Filipinas",
      diyNote:
        "La foto se toma en el propio lugar durante tu cita en el DFA; no lleves la tuya. Vístete con decoro.",
      rules: [
        "La foto, las huellas dactilares y la firma se toman durante la cita.",
        "Todos los solicitantes, de cualquier edad, deben presentarse en persona.",
      ],
      searchTerms: [
        "foto pasaporte filipinas",
        "requisitos foto pasaporte filipino",
        "foto pasaporte dfa",
      ],
    },
    "kr-visa": {
      name: "Visa de Corea del Sur",
      diyNote:
        "Las misiones difieren. Los Ángeles y Finlandia no fijan ninguna regla sobre el fotógrafo, pero algunas misiones (Montreal, por ejemplo) piden un fotógrafo comercial con la fecha sellada en el reverso. Consulta tu misión.",
      colors: ["blanco", "blanco roto", "claro liso"],
      rules: [
        "Foto en color, con fondo liso y bien iluminado, sin marcas ni dobleces.",
        "Tomada en los últimos 6 meses, mirando directamente a la cámara.",
        "Sin gafas de sol ni sombreros, salvo por motivos médicos o religiosos.",
        "Las fotos que coincidan con una foto de pasaporte de los últimos seis meses pueden rechazarse.",
        "Algunas misiones también aceptan 2 x 2 in.",
      ],
      searchTerms: [
        "medidas foto visa corea",
        "requisitos foto visa corea del sur",
        "foto visa coreana 35x45",
      ],
    },
    "za-passport": {
      name: "Pasaporte de Sudáfrica",
      diyNote:
        "Las misiones sudafricanas piden fotos en color tomadas por un profesional. Consulta con tu misión antes de encargarla.",
      colors: ["blanco"],
      rules: [
        "Rostro completo, solo cabeza y hombros, boca cerrada.",
        "Sin gafas; la frente despejada de cabello.",
      ],
      searchTerms: [
        "foto pasaporte sudáfrica",
        "medidas foto pasaporte sudafricano 35x45",
        "requisitos foto pasaporte sudáfrica",
      ],
    },
    "ae-icp": {
      name: "Servicios electrónicos ICP de Emiratos Árabes Unidos",
      diyNote:
        "Especificaciones de foto para los servicios electrónicos ICP de los EAU (visa y residencia). Usa una foto impresa en papel de alta calidad.",
      colors: ["blanco", "de color claro liso"],
      rules: [
        "Ancho de 35-40 mm; el rostro ocupa el 70-80 % de la fotografía.",
        "Tomada hace no más de 6 meses, mirando directamente a la cámara.",
        "Expresión neutra, ojos abiertos y visibles, sin sombrero ni gafas de sol.",
        "Ambos lados del rostro visibles, sin sombras ni reflejos de flash.",
      ],
      searchTerms: [
        "medidas foto visa emiratos",
        "requisitos foto visa emiratos árabes",
        "foto visa residencia emiratos 4.5x3.5",
      ],
    },
  },
};
