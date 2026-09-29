// Portuguese UI strings (Brazilian Portuguese that European readers understand as well: "foto para
// passaporte", "visto", "você" only in the imperative). Same shape as en.ts; the compiler checks it.
// Wording rules: no "oficial", "aprovado", "garantido", "verificado", "homologado" or "conforme";
// conferimos medidas e posições e a autoridade emissora decide.
import type { Strings } from "./en";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

export const pt: Strings = {
  chrome: {
    skip: "Ir para o conteúdo",
    homeLabel: "Página inicial do PortraitPass",
    mainNav: "Navegação principal",
    footerNav: "Navegação do rodapé",
    documents: "Documentos",
    printShort: "Imprima por 40¢",
    about: "Sobre",
    support: "Apoiar",
    themeToLight: "Mudar para o tema claro",
    themeToDark: "Mudar para o tema escuro",
    printGuide: "Guia de impressão",
    privacy: "Privacidade",
    terms: "Termos",
    accessibility: "Acessibilidade",
    forAgents: "Para agentes",
    legal:
      "O PortraitPass é um projeto independente de código aberto, sem afiliação nem endosso de nenhum governo ou órgão de passaportes. As regras das fotos mudam; consulte as regras atuais da autoridade emissora. Algumas autoridades, como as do Canadá e da Alemanha, só aceitam fotos de fornecedores profissionais ou certificados.",
    languageLabel: "Idioma",
    englishOnlyNote:
      "A página inicial, o estúdio e as páginas de privacidade, termos e acessibilidade estão em inglês por enquanto.",
  },

  fmt: {
    list: (items, joiner) => {
      if (items.length <= 1) return items.join("");
      const word = joiner === "and" ? "e" : "ou";
      return `${items.slice(0, -1).join(", ")} ${word} ${items[items.length - 1]}`;
    },
    date: (y, m, d) => `${d} de ${MONTHS[m - 1]} de ${y}`,
    percent: (n) => `${n}%`,
    between: (a, b) => `entre ${a} e ${b}`,
    atLeast: (x) => `no mínimo ${x}`,
    atMost: (x) => `no máximo ${x}`,
    upTo: (x) => `até ${x}`,
    compactBetween: (a, b) => `${a} a ${b}`,
    compactAtLeast: (x) => `≥ ${x}`,
    compactAtMost: (x) => `≤ ${x}`,
    ofImageHeight: " da altura da imagem",
    aspectSquare: "formato quadrado (1:1)",
    aspectPortrait: "formato vertical, 3:4",
    aspectRatio: (r) => `proporção largura:altura de ${r}`,
    atLeastWide: (px) => `no mínimo ${px} px de largura`,
    perSideSquare: (a, c) => `entre ${a} e ${c} px por lado (formato quadrado)`,
    fromUpTo: (a, b, c, e) => `de ${a} × ${b} px até ${c} × ${e} px`,
    withAspect: (dims, aspect) => `${dims}, ${aspect}`,
    originalFile: "arquivo original",
    digitalUpload: "arquivo digital",
    noPhoto: "sem foto para preparar",
    theOriginalFile: "o arquivo original",
    noFixedSize: "um arquivo sem tamanho fixo",
    kb1000: "A fonte conta 1 KB como 1.000 bytes.",
    kb1024: "A fonte conta 1 KB como 1.024 bytes.",
    kbUnknown:
      "A fonte não diz como conta um KB; adotamos 1.024 bytes, a leitura mais segura para um limite máximo.",
    sourcePrimary: "Autoridade emissora",
    sourceSecondary: "Fonte secundária",
    sourceLine: (kind, date) => `${kind}. Consultada em ${date}.`,
    checkNote: "Conferimos medidas e posições; a autoridade emissora decide se aceita a foto.",
    rulesNote:
      "As regras mudam. Consulte as instruções atuais da autoridade emissora antes de fazer o pedido.",
    notAtHome: "Não se faz em casa",
    photoName: (name) => `foto de ${lowerFirst(name)}`,
    andMore: (n) => ` e mais ${n}`,
    sep: ", ",
    semi: "; ",
    stop: ".",
  },

  sentence: {
    bgNamed: (colors) => `A fonte pede um fundo ${colors}.`,
    bgNone: "A fonte não indica a cor do fundo.",
    editForbiddenCaptured:
      "As regras não permitem alterações digitais na foto, então acertar o fundo é tarefa do fotógrafo ou da cabine.",
    editForbiddenHome:
      "As regras não permitem alterações digitais na foto, então o fundo precisa estar certo na hora de fotografar. Tire a foto de novo diante de uma parede lisa em vez de editar o fundo. O PortraitPass mantém desativada, por padrão, a troca de fundo para este documento.",
    editAllowed:
      "A fonte permite editar o fundo. Mantenha-o liso e uniforme e não mexa no rosto nem no cabelo.",
    editUnspecifiedCaptured: "A fonte não diz se o fundo pode ser editado.",
    editUnspecifiedHome:
      "A fonte não diz se o fundo pode ser editado. O caminho mais seguro é usar uma parede lisa na hora de fotografar. Se for trocar o fundo, consulte antes as regras da organização que vai receber a foto.",
    introPrint: (photo, size) => `Impressa, a ${photo} mede ${size}`,
    introOriginal: (kb, formats) =>
      `Para o envio online, use o arquivo original da câmera, sem edição${kb ? ` (${kb})` : ""}, em ${formats}.`,
    introDigital: (bits, formats) => `A foto digital pede ${bits}, em ${formats}.`,
    introNone: (name) =>
      `Para o documento “${name}” não há foto para preparar: ela é feita como parte do processo.`,
  },

  faq: {
    sizeQ: (photo) => `Qual é o tamanho da ${photo}?`,
    sizePrint: (size) => `A foto impressa mede ${size}.`,
    sizeDigital: (bits, formats) => `O arquivo digital pede ${bits}, em ${formats}.`,
    sizeNone: (note) => `Não há tamanho para preparar. ${note}`,
    sizeNoneDefault: "A foto é feita como parte do processo.",
    homeQ: (photo) => `Posso fazer a ${photo} em casa?`,
    homeNo: "Não. ",
    homeYesDigitalNoNote: "Sim, e nada é impresso: você envia uma foto digital. ",
    homeYes: "Sim. ",
    homeNoDefault: "A foto precisa ser feita pela autoridade emissora ou por um fornecedor indicado por ela.",
    homeYesDefault: "A fonte aceita uma foto que você mesmo prepare.",
    bgQ: (photo) => `Que fundo a ${photo} exige?`,
    kbQ: (photo) => `Quantos KB a ${photo} pode ter?`,
    kbA: (range, def) => `O arquivo deve ter ${range}. ${def}`,
    headQ: (photo) => `Que tamanho a cabeça deve ter na ${photo}?`,
    headPrintA: (head, eye) =>
      `Medida do topo da cabeça ao queixo, a cabeça deve ter ${head}${eye ? `, e a linha dos olhos, medida a partir da borda inferior, deve ficar ${eye}` : ""}.`,
    headRatioA: (ratio) => `A cabeça, do topo do cabelo ao queixo, deve ter ${ratio}.`,
    rulesQ: (photo) => `Quais são as principais regras da ${photo}?`,
    sourcesQ: (name) => `De onde vêm os números do documento “${name}”?`,
    sourcesA: (allPrimary, titles, date) =>
      `${allPrimary ? "Das páginas da própria autoridade emissora" : "Das páginas listadas em Fontes"}: ${titles}. Última consulta: ${date}.`,
  },

  meta: {
    brand: "PortraitPass",
    docTitles: (photo, short, brand) => [
      `${cap(photo)}: medidas e requisitos — ${brand}`,
      `${cap(photo)}: medidas e requisitos`,
      `${cap(photo)}: medidas`,
      `${cap(short)}: medidas e requisitos`,
      `${cap(short)}: medidas`,
    ],
    docNoSize: (photo) => `${cap(photo)}: não há tamanho para preparar.`,
    docSpec: (photo, summary, head) => `${cap(photo)}: ${summary}${head ? `, cabeça ${head}` : ""}.`,
    docNotHome: "Não é foto caseira: veja aonde ir.",
    docHome: "Faça grátis no seu navegador.",
    docChecked: (date) => `Fontes consultadas em ${date}.`,
    docFillers: ["Nada é enviado.", "Sem conta nem marca-d’água."],
    indexTitle: "Foto para passaporte e visto: requisitos — PortraitPass",
    indexDescription: (n) =>
      `Medidas, posição da cabeça, fundo e tamanho do arquivo de ${n} passaportes, vistos e documentos, cada um com sua fonte e a data da consulta.`,
  },

  table: {
    document: "Documento",
    head: {
      size: "Foto",
      print: "Tamanho impresso",
      digital: "Tamanho digital",
      head: "Cabeça",
      eye: "Linha dos olhos",
      kb: "Tamanho do arquivo",
      bg: "Fundo",
      home: "Em casa?",
      country: "País",
    },
    homeYes: "Sim",
    homeDigital: "Sim, só envio",
    homeNo: "Não",
    originalFile: "Arquivo original",
    bgNone: "Não indicado",
    paperCaption: "Papel indicado nas fontes",
    paperSize: "Tamanho",
    paperPaper: "Papel",
  },

  shell: {
    home: "Início",
    breadcrumb: "Trilha de navegação",
  },

  doc: {
    kind: {
      passport: "Passaporte",
      visa: "Visto",
      "id-card": "Documento de identidade",
      residence: "Residência ou imigração",
      citizenship: "Cidadania",
      lottery: "Sorteio",
      "exam-form": "Inscrição em exame",
      other: "Solicitação",
    },
    title: (photo) => `${cap(photo)}: medidas e requisitos`,
    eyebrow: (country, kind) => `${country} · ${kind}`,
    specTitle: "Especificações da foto",
    printCaption: "Foto impressa",
    digitalCaption: "Envio digital",
    rowPhotoSize: "Tamanho da foto",
    rowHead: "Cabeça, do topo ao queixo",
    rowEye: "Linha dos olhos, a partir da borda inferior",
    rowCopies: "Fotos necessárias",
    rowPaper: "Papel",
    rowUpload: "Envio",
    rowUploadOriginal: "O arquivo original da câmera, sem edição nem recorte",
    rowMinSize: "Tamanho mínimo",
    rowImageSize: "Tamanho da imagem",
    rowFileSize: "Tamanho do arquivo",
    rowFormats: "Formatos",
    fileSizeValue: (kb, def) => `${kb}. ${def}`,
    specNote: (check, date, rules) => `${check} Última consulta: ${date}. ${rules}`,
    specNoteNotHome: (date, rules) => `Medidas da fonte. Última consulta: ${date}. ${rules}`,
    diagramAlt: (size) => `Moldura da foto em escala, ${size}, com as faixas da cabeça e da linha dos olhos marcadas`,
    diagramHead: "Cabeça",
    diagramEye: "Linha dos olhos",
    diagramNote: "Desenho em escala com as medidas da tabela. O formato da cabeça é só uma referência.",
    backgroundTitle: "Fundo e edição",
    rulesTitle: "Regras da fonte",
    rulesFooter:
      "Expressão, iluminação e o quão recente é a foto não podem ser medidos a partir de uma imagem, então confira esses pontos você mesmo.",
    homeTitle: "Dá para fazer em casa?",
    homeNo: "Não.",
    homeNoDefault: "A foto precisa ser feita pela autoridade emissora ou por um fornecedor indicado por ela.",
    whereInstead: "Aonde ir em vez disso",
    whereBody:
      "Pergunte ao órgão emissor quais fotógrafos ou cabines ele aceita. O PortraitPass não faz esta foto, porque uma impressão ou um arquivo feito em casa seria recusado.",
    whereFigures: " Leve as medidas acima com você para conferir a foto que receber.",
    othersFrom: (country) => `Documentos que você mesmo pode preparar: ${country}`,
    browseAll: "Ver todos os documentos",
    homeYesDigitalOnly: "Sim, e nada é impresso.",
    homeYes: "Sim.",
    homeYesDefault: "A fonte aceita uma foto que você mesmo prepare.",
    studioBodyDigital:
      "O PortraitPass enquadra a foto nas linhas de cabeça e olhos acima e exporta um arquivo com o tamanho exato em pixels e abaixo do limite de tamanho.",
    studioBodyPrint:
      "O PortraitPass enquadra a foto nas linhas de cabeça e olhos acima e exporta uma foto avulsa ou uma folha de impressão, com as medidas à vista para você conferir.",
    stays: "Sua foto fica no seu navegador.",
    openStudio: "Abrir o estúdio para este documento",
    studioNote: "O estúdio está em inglês por enquanto.",
    sourcesTitle: "Fontes",
    faqTitle: "Perguntas frequentes",
    relatedTitle: "Documentos relacionados",
    relSiblings: "Mesmo documento, outro caminho",
    relCountry: (country) => `Mais documentos: ${country}`,
    relSameSize: (size) => `Outros documentos com foto impressa de ${size}`,
  },

  index: {
    eyebrow: "Requisitos das fotos",
    title: "Requisitos de fotos para passaporte, visto e documentos de identidade",
    crumb: "Documentos",
    lede: (n, countries, home, notHome) =>
      `${n} documentos de ${countries} países e regiões, cada um com seu tamanho, a posição da cabeça e dos olhos, a regra do fundo e a fonte que lemos. ${home} podem ser preparados em casa; ${notHome} exigem fotógrafo, cabine ou captura no órgão emissor, e a página informa isso.`,
    countriesNav: "Países",
    bySize: "Por tamanho",
    links: {
      twoByTwo: "Foto de 2×2 polegadas",
      thirtyFive: "Foto de 35×45 mm",
      sixHundred: "Envio de 600×600 px",
      under50: "Foto com menos de 50 KB",
      printing: "Guia de impressão",
    },
    countTag: (n) => `${n} ${n === 1 ? "documento" : "documentos"}`,
    tableCaption: (country) => `Documentos: ${country}`,
    footnote:
      "Cada número vem da página da própria autoridade emissora e traz a data da nossa última consulta. Conferimos medidas e posições; a autoridade emissora decide se aceita a foto.",
  },

  sizes: {
    eyebrowSize: "Tamanho da foto",
    eyebrowFile: "Tamanho do arquivo",
    eyebrowSheet: "Folha de impressão",
    eyebrowPrinting: "Impressão",
    unitsTitle: "O mesmo tamanho em todas as unidades",
    mistakesTitle: "Erros comuns",
    faqTitle: "Perguntas frequentes",
    inches: "Polegadas",
    millimetres: "Milímetros",
    px300: "Pixels a 300 DPI",
    px600: "Pixels a 600 DPI",
    onSheet: "Em uma folha de 4×6 in",
    photosN: (n) => `${n} fotos`,
    studioFor: (name) => `Abrir o estúdio para o documento “${name}”`,
    figuresChecked: (date) => `Números consultados em ${date}.`,
    px: (w, h) => `${w} × ${h} px`,
    inDataset: "Em nossos dados: ",
    printGuideCrumb: "Impressão",

    twoByTwo: {
      crumb: "Foto de 2×2 polegadas",
      title: "Foto de 2×2 polegadas: medidas, pixels e documentos",
      metaTitle: "Foto de 2×2 polegadas: medidas e documentos — PortraitPass",
      metaLead: (px) => `Foto de 2×2 polegadas: 50,8 mm, ${px} px a 300 DPI.`,
      metaDocs: (n, lead) => `${n} documentos a usam, entre eles ${lead}.`,
      metaLeadFallback: "o passaporte dos Estados Unidos",
      metaTail: "Posição da cabeça e dos olhos, erros comuns e uma ferramenta grátis no navegador.",
      lede: (px, n, some) =>
        `Uma foto de 2×2 polegadas mede 50,8 × 50,8 mm, ou ${px} pixels a 300 DPI. Em nossos dados, ${n} documentos pedem uma foto impressa desse tamanho${some ? `, entre eles ${some}` : ""}.`,
      mmRow: "50,8 × 50,8 mm (muitas vezes arredondado para 51 × 51)",
      inRow: "2 × 2 in",
      caption: "Foto de 2×2 polegadas",
      docsTitle: "Documentos que usam foto impressa de 2×2 polegadas",
      docsCaption: "Documentos com foto de 2×2 polegadas",
      docsNote:
        "A posição da cabeça e dos olhos muda de um documento para outro, mesmo quando o tamanho do papel é o mesmo, então use os valores da página do documento para o qual você vai fazer o pedido.",
      mistakes: [
        "Esticar uma foto retangular até deixá-la quadrada. Recorte em vez disso, para o rosto manter as proporções.",
        "Tratar 2×2 como tamanho em pixels. É uma medida física: a foto impressa precisa ter 2 polegadas, e não apenas 600 pixels.",
        "Imprimir com “ajustar à página” ativado. A foto sai um pouco maior ou menor; meça com uma régua.",
        "Recortar com folga demais. A cabeça precisa ocupar uma parte fixa da altura, então um rosto pequeno num quadrado grande fica fora do intervalo.",
      ],
      faqPxQ: "Quantos pixels tem uma foto de 2×2 polegadas?",
      faqPxA: (a, b, c) =>
        `${a} pixels a 300 DPI, ${b} a 600 DPI e ${c} a 200 DPI. Uma foto impressa é definida pelo tamanho físico, então o número de pixels só importa no envio de arquivos.`,
      faqMmQ: "2×2 polegadas é o mesmo que 51×51 mm?",
      faqMmA:
        "Quase. Duas polegadas são 50,8 mm, e alguns formulários arredondam para 51 mm. Uma folha impressa em tamanho real terá 50,8 mm de cada lado, que é o que a regra de 2 polegadas significa.",
      faqWhichQ: "Quais documentos usam foto de 2×2 polegadas?",
      faqWhichA: (names) => `Em nossos dados: ${names}.`,
      faqWhichNone: "Nenhum documento dos nossos dados pede esse tamanho no momento.",
    },

    thirtyFive: {
      crumb: "Foto de 35×45 mm",
      title: "Foto de 35×45 mm: medidas, pixels e documentos",
      metaTitle: "Foto de 35×45 mm: medidas e documentos — PortraitPass",
      metaLead: (px) => `Foto de 35×45 mm: ${px} px a 300 DPI.`,
      metaDocs: (n, c) =>
        `${n} documentos de ${c} países a usam, com o intervalo da cabeça e a regra de fundo de cada um.`,
      metaTail: "Grátis, no seu navegador.",
      lede: (px, n) =>
        `35×45 mm é o tamanho de foto para passaporte mais comum fora dos Estados Unidos: 1,38 × 1,77 in, ou ${px} pixels a 300 DPI. ${n} documentos dos nossos dados usam esse tamanho.`,
      caption: "Foto de 35×45 mm",
      mmRow: "35 × 45 mm",
      docsTitle: "Documentos que usam 35×45 mm",
      docsCaption: "Documentos de 35×45 mm",
      docsNote:
        "O formato é o mesmo, mas as regras não. A altura da cabeça, a cor do fundo e a aceitação ou não de uma foto feita em casa variam de um documento para outro, então abra a página do seu.",
      mistakes: [
        "Esticar uma foto 4:3 ou quadrada até 35×45. Recorte na proporção 7:9 e mantenha as proporções do rosto.",
        "Imprimir um arquivo de 35×45 num tamanho físico errado. Imprima em tamanho real e meça o resultado.",
        "Usar o tamanho de cabeça de outro país. A tabela acima mostra como os intervalos mudam.",
        "Enviar uma impressão caseira quando o documento exige fotógrafo ou cabine. Esses documentos aparecem marcados como “Não se faz em casa”.",
      ],
      faqPxQ: "Quantos pixels tem uma foto de 35×45 mm?",
      faqPxA: (a, b) => `${a} pixels a 300 DPI e ${b} a 600 DPI.`,
      faqSameQ: "35×45 mm é o mesmo que 2×2 polegadas?",
      faqSameA:
        "Não. Uma foto de 35×45 mm é mais alta do que larga (1,38 × 1,77 in), enquanto 2×2 polegadas é quadrada. Esticar uma para caber no espaço da outra deforma o rosto; recorte no formato certo.",
      faqHeadQ: "Todos os documentos de 35×45 mm usam o mesmo tamanho de cabeça?",
      faqHeadA:
        "Não. O tamanho do papel é o mesmo, mas o intervalo da cabeça é definido por documento, por exemplo entre 29 e 36 mm segundo a autoridade. A tabela desta página mostra cada um.",
    },

    sixHundred: {
      crumb: "Foto de 600×600 pixels",
      title: "Foto de 600×600 pixels: envios e limites de tamanho",
      metaTitle: "Foto de 600×600 pixels: envio e limites — PortraitPass",
      metaLead: (exact, range) =>
        `Foto de 600×600 pixels: ${exact} documentos pedem exatamente esse tamanho e ${range} o aceitam dentro de um intervalo.`,
      metaTail: "Limites de tamanho, posição da cabeça e uma ferramenta grátis no navegador.",
      metaFiller: "Nada é enviado.",
      lede: (exact, range) =>
        `Um quadrado de 600×600 pixels é o tamanho de envio do sorteio do Visto de Diversidade dos Estados Unidos e cabe dentro de vários outros limites. ${exact} documentos dos nossos dados pedem exatamente 600×600 e ${range} o aceitam dentro de um intervalo.`,
      meaningTitle: "O que significa 600×600",
      meaningBody:
        "É um tamanho em pixels, não um tamanho de impressão. A 300 pixels por polegada equivale a 2×2 polegadas, mas um formulário de envio só confere os pixels e o tamanho do arquivo. A foto deve ser um recorte quadrado, com a cabeça dentro do intervalo definido pelo documento.",
      meaningHead: (name, headLo, headHi, eyeLo, eyeHi) =>
        `Para o documento “${name}”, a cabeça mede entre ${headLo} e ${headHi} pixels de altura num quadro de 600 pixels, e a linha dos olhos fica entre ${eyeLo} e ${eyeHi} pixels acima da borda inferior.`,
      exactTitle: "Documentos que pedem exatamente 600×600",
      exactCaption: "Exatamente 600×600 px",
      rangeTitle: "Documentos que aceitam 600×600 dentro de um intervalo",
      rangeCaption: "O intervalo inclui 600×600 px",
      rangeNote:
        "Nesses casos, o tamanho exato é escolha sua dentro do intervalo. Um recorte quadrado de pelo menos 600 pixels é uma opção segura quando o intervalo permite.",
      faqSameQ: "Uma foto de 600×600 pixels é o mesmo que 2×2 polegadas?",
      faqSameA:
        "Só a 300 DPI. Duas polegadas a 300 pixels por polegada dão 600 pixels, e por isso os dois tamanhos costumam ser citados juntos. Num envio, o que conta é o número de pixels; numa foto impressa, o tamanho físico.",
      faqWhichQ: "Quais documentos pedem exatamente 600×600 pixels?",
      faqWhichA: (names) => `Em nossos dados: ${names}.`,
      faqWhichNone: "No momento, nenhum documento dos nossos dados pede exatamente esse tamanho.",
      faqKbQ: "Que tamanho de arquivo acompanha 600×600 pixels?",
      faqKbA: (items) => `Depende do documento: ${items}. A tabela desta página lista todos.`,
      faqKbItem: (name, range) => `${name}: ${range}`,
      faqKbNone: "As fontes desses documentos não indicam um limite de tamanho de arquivo.",
    },

    under50: {
      crumb: "Foto com menos de 50 KB",
      title: "Foto com menos de 50 KB: quais documentos definem um limite",
      metaTitle: "Foto com menos de 50 KB: documentos com limite — PortraitPass",
      metaLead: (n, smallest) =>
        `Foto com menos de 50 KB? ${n} documentos definem um limite de tamanho; o menor máximo que encontramos é de ${smallest} KB.`,
      metaNone: "n/d",
      metaTail: "Como os KB são contados e como reduzir o tamanho do arquivo.",
      metaFiller: "Grátis, no seu navegador.",
      ledeSome: (n, names) => `${n} documentos dos nossos dados limitam a foto a 50 KB ou menos: ${names}.`,
      ledeNone: (smallest) =>
        `Nenhum documento dos nossos dados limita a foto a 50 KB ou menos. O menor máximo que encontramos é ${smallest}. Se o seu formulário pede 50 KB, vale o limite dele; esta página mostra o que os documentos que lemos realmente exigem.`,
      smallestOf: (kb, name) => `${kb} KB (${name})`,
      notStated: "não indicado",
      limitsTitle: "Documentos com limite de tamanho de arquivo",
      limitsCaption: "Ordenados pelo maior arquivo permitido",
      countingTitle: "Como os KB são contados",
      countingBody: (thousand) =>
        `Para algumas fontes, um kilobyte equivale a 1.000 bytes; para outras, a 1.024; e algumas não dizem.${thousand ? ` ${thousand} contam 1.000 bytes.` : ""} Quando um arquivo está perto do máximo, mire alguns pontos percentuais abaixo, em vez de exatamente no limite.`,
      howTitle: "Como deixar uma foto abaixo de um limite",
      steps: [
        "Recorte primeiro no formato que o documento pede, com a cabeça dentro do intervalo correto.",
        "Ajuste o tamanho em pixels para o que o formulário pede. Uma foto de celular de 4000×3000 tem cerca de 12 milhões de pixels; um envio de 600×600 tem 0,36 milhão.",
        "Salve em JPEG e reduza a qualidade aos poucos, até o arquivo ficar abaixo do limite.",
        "Confira o resultado em tamanho real. Se o rosto parecer serrilhado, escolha um limite de tamanho maior ou um tamanho em pixels menor, mas não os dois.",
      ],
      howAfter:
        "Escolha um documento no estúdio e a exportação digital aplica esses passos com os limites daquele documento e mostra o tamanho final antes de você baixar.",
      studioLabel: "Abrir o estúdio",
      faqWhichQ: "Quais documentos têm limite em KB?",
      faqWhichA: (n, from) =>
        `Em nossos dados, ${n} documentos definem um limite de tamanho de arquivo, a partir de ${from}. A tabela desta página lista todos.`,
      faqWhichNone: "nenhum",
      faqBytesQ: "1 KB são 1.000 ou 1.024 bytes?",
      faqBytesA: (names) =>
        `Depende da fonte. ${names} contam 1.000 bytes; as demais contam 1.024 ou não dizem. Perto de um limite, use a leitura menor.`,
      faqBytesNone:
        "As fontes costumam contar 1.024 bytes. Perto de um limite, deixe uma folga de alguns pontos percentuais.",
      faqSmallerQ: "Como reduzir o tamanho de uma foto sem estragá-la?",
      faqSmallerA:
        "Primeiro reduza as dimensões em pixels para o que o formulário pede e depois baixe a qualidade JPEG aos poucos. Um fundo liso e bem iluminado também comprime melhor do que um fundo carregado.",
    },

    sheet: {
      crumb: "Folha de impressão",
      title: "Fotos para passaporte em uma folha de impressão 4×6",
      metaTitle: "Folha de fotos de passaporte: 4×6, A4, Carta — PortraitPass",
      metaLead: "Folha de fotos para passaporte: quantas fotos cabem em papel 4×6, A4 e Carta, com marcas de corte.",
      metaTail: "Imprima em tamanho real. Grátis, no seu navegador.",
      metaFiller: "Nada é enviado.",
      lede: (n, size) =>
        `Uma folha de 4×6 polegadas comporta ${n} fotos de ${size}. O estúdio as posiciona em tamanho físico exato, em um PDF ou JPG que você pode levar a um balcão de fotos ou imprimir por conta própria.`,
      ledeSizeFallback: "o tamanho habitual",
      crumbPrinting: "Impressão",
      countsTitle: "Fotos por folha",
      countsCaption: "Fotos em uma folha, a 300 DPI",
      colSize: "Tamanho da foto",
      col4x6: "4×6 in",
      colA4: "A4",
      colLetter: "Carta (EUA)",
      countsNote:
        "As quantidades vêm do mesmo layout que o estúdio usa, com margens de impressão em A4 e Carta. O papel é girado para o lado que comportar mais fotos.",
      printingTitle: "Como imprimir direito",
      steps: [
        "Exporte a folha do estúdio como PDF ou JPG.",
        "Imprima em tamanho real ou a 100%. Desative “ajustar à página” e qualquer escala sem bordas.",
        "Meça uma foto com uma régua e compare com o tamanho indicado na página do documento.",
        "Corte pelas guias. Em 4×6 elas ficam nas bordas compartilhadas; em A4 e Carta são marcas nos cantos.",
      ],
      seeGuideBefore:
        "Para preços em balcões de fotos, papel e documentos com regras de impressão especiais, veja o ",
      seeGuideLink: "guia de impressão",
      seeGuideAfter: ".",
      studioLabel: "Abrir o estúdio e montar uma folha",
      faqCountQ: "Quantas fotos para passaporte cabem em uma impressão 4×6?",
      faqCountA: (items) => `${items}. A tabela desta página traz todos os tamanhos que conhecemos.`,
      faqCountItem: (n, size) => `${n} de ${size}`,
      faqCountNone: "Depende do tamanho da foto.",
      faqLinesQ: "Por que há linhas entre as fotos?",
      faqLinesA:
        "Numa folha 4×6, as fotos ficam lado a lado, com guias finas nas bordas compartilhadas para você cortar por elas. Em A4 e Carta, cada foto tem marcas de corte nos cantos e uma margem para impressoras domésticas.",
      faqSettingQ: "Que configuração de impressão mantém o tamanho exato?",
      faqSettingA:
        "Tamanho real ou 100%, com “ajustar à página” e escala sem bordas desativados. Depois, meça uma foto com uma régua.",
    },

    guide: {
      crumb: "Impressão",
      title: "Imprima fotos para passaporte por cerca de 40¢",
      metaTitle: "Imprimir fotos de passaporte em 4×6 — PortraitPass",
      metaLead:
        "Imprima fotos para passaporte por cerca de 40¢: uma folha 4×6 em um balcão de fotos, em casa ou em um laboratório.",
      metaTail: "Configurações de tamanho real e regras de impressão de cada documento.",
      metaFiller: "Grátis, no seu navegador.",
      lede: (n) =>
        `Exporte uma folha 4×6 com ${n} fotos e peça-a como uma impressão 4×6 comum em um balcão de fotos. Uma farmácia ou hipermercado dos Estados Unidos costuma cobrar cerca de 40 centavos por uma; os preços variam, então consulte antes de pedir.`,
      counterTitle: "Em um balcão de fotos",
      counterSteps: [
        "Exporte a folha 4×6 do estúdio como JPG.",
        "Envie-a para retirada na CVS, Walgreens, Walmart Photo ou em um balcão parecido e escolha uma impressão 4×6.",
        "Escolha “sem bordas” ou “não cortar” se a opção aparecer. A foto precisa sair em tamanho real.",
        "Meça uma foto com uma régua antes de sair e depois corte pelas guias.",
      ],
      counterNote: "O balcão só vê a folha que você envia. O PortraitPass nunca a recebe.",
      homeTitle: "Em casa",
      homeBefore:
        "Use papel fotográfico, imprima em tamanho real ou a 100% e desative “ajustar à página”. As folhas A4 e Carta têm marcas de corte nos cantos e uma margem para impressoras domésticas. Veja a ",
      homeLink: "página da folha de impressão",
      homeAfter: " para saber quantas fotos cabem.",
      rulesTitle: "Documentos com regras de impressão especiais",
      auHeading: "Austrália",
      auBody: (note, paper) =>
        `${note} O papel indicado pela fonte: ${paper}. Leve a folha a um laboratório fotográfico que ofereça esse tipo de impressão, em vez de usar uma impressora a jato de tinta doméstica ou de farmácia.`,
      ukHeading: "Reino Unido",
      ukBefore: " Vai fazer o pedido online? Use a ",
      ukLink: "página de envio online",
      ukAfter: ": ela aceita a foto original, sem recorte, então nada é impresso.",
      noHomeNote:
        "Alguns documentos não podem ser impressos em casa de jeito nenhum: o Canadá pede um fotógrafo comercial e a Alemanha faz a foto em formato digital na própria autoridade ou com um fornecedor certificado. As páginas desses documentos explicam o procedimento.",
      closing:
        "Conferimos medidas e posições; a autoridade emissora decide se aceita a foto. Os preços são típicos e mudam; não temos parceria com nenhuma das lojas citadas aqui.",
      faqCostQ: "Quanto custa imprimir fotos para passaporte?",
      faqCostA:
        "Uma impressão 4×6 em uma farmácia ou hipermercado dos Estados Unidos costuma custar cerca de 40 centavos, e uma folha comporta várias fotos. Os preços variam de loja para loja, então consulte antes de pedir.",
      faqHomeQ: "Posso imprimir fotos para passaporte em casa?",
      faqHomeA:
        "Às vezes. Alguns documentos aceitam uma impressão caseira em papel fotográfico e outros exigem impressão de laboratório ou profissional. A Austrália pede uma impressão por sublimação de tinta de pelo menos 200 g/m², então uma impressão de jato de tinta doméstica não serve.",
      faqCropQ: "O que devo escolher quando o balcão pergunta sobre o corte?",
      faqCropA:
        "Escolha sem bordas ou não cortar, se a opção aparecer, e imprima em tamanho real. Uma loja que corta ou redimensiona a folha automaticamente muda o tamanho da foto.",
    },
  },
};
