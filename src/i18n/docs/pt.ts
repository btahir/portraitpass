// Portuguese text for every document in the dataset (src/core/data/*). Numbers, units and ids are
// unchanged; only the words are translated. Brazilian Portuguese that European readers understand
// ("visto", "foto para passaporte"). Names start with a common noun so "foto de <nome>" reads naturally.
import type { LocaleDocs } from "./types";

export const PT: LocaleDocs = {
  countries: {
    "United States": "Estados Unidos",
    India: "Índia",
    Pakistan: "Paquistão",
    Bangladesh: "Bangladesh",
    Nepal: "Nepal",
    "Sri Lanka": "Sri Lanka",
    "United Kingdom": "Reino Unido",
    "Schengen area": "Espaço Schengen",
    Ireland: "Irlanda",
    Germany: "Alemanha",
    France: "França",
    Netherlands: "Países Baixos",
    Italy: "Itália",
    Canada: "Canadá",
    Australia: "Austrália",
    "New Zealand": "Nova Zelândia",
    China: "China",
    Japan: "Japão",
    Philippines: "Filipinas",
    "South Korea": "Coreia do Sul",
    "South Africa": "África do Sul",
    "United Arab Emirates": "Emirados Árabes Unidos",
  },
  docs: {
    // ------------------------------------------------------------- United States
    "us-passport": {
      name: "Passaporte dos Estados Unidos",
      diyNote:
        "Fotos feitas em casa são aceitas, mas não selfies: peça a outra pessoa que tire a foto ou use um tripé. Imprima em papel de qualidade fotográfica.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Foto colorida tirada nos últimos 6 meses.",
        "Cabeça, do topo do cabelo ao queixo: de 1 a 1 3/8 in.",
        "Olhe para a câmera, com expressão neutra ou um sorriso natural e os dois olhos abertos.",
        "Óculos não são aceitos, exceto em raros casos médicos, com uma declaração.",
        "Sem filtros, retoques, softwares nem alterações por IA na foto.",
        "Sem uniformes; chapéus e cobertura de cabeça só por motivos religiosos ou médicos.",
      ],
      searchTerms: [
        "foto passaporte americano",
        "foto para passaporte estados unidos",
        "foto passaporte 2x2",
        "tamanho foto passaporte americano",
        "requisitos foto passaporte eua",
        "foto passaporte 2x2 polegadas",
        "imprimir foto de passaporte em casa",
      ],
      paper: "papel de qualidade fotográfica",
    },
    "us-passport-online": {
      name: "Passaporte dos EUA (renovação online)",
      diyNote:
        "Envie o arquivo original da câmera, sem edição. Não recorte, não redimensione nem aplique filtros, e não fotografe uma foto impressa.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Arquivos aceitos: JPG, JPEG, PNG, HEIC ou HEIF.",
        "Tamanho do arquivo entre 54 KB e 10 MB.",
        "Uma foto colorida tirada nos últimos 6 meses.",
        "Olhe diretamente para a câmera, com a cabeça centralizada e os dois olhos abertos e visíveis.",
        "Sem filtros nem ferramentas de retoque; sem digitalização nem foto de uma foto impressa.",
      ],
      searchTerms: [
        "foto renovação passaporte americano online",
        "renovar passaporte americano online foto",
        "upload foto renovação passaporte",
        "tamanho foto passaporte para upload",
        "foto digital passaporte estados unidos",
      ],
    },
    "us-passport-card": {
      name: "Cartão de passaporte dos Estados Unidos",
      diyNote:
        "As mesmas regras de foto do passaporte em caderneta. Peça a outra pessoa que tire a foto ou use um tripé; sem selfies.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Uniformes e roupas de estilo camuflado não são aceitos em passaportes em caderneta nem em cartões.",
        "Foto colorida tirada nos últimos 6 meses.",
        "Cabeça, do topo do cabelo ao queixo: de 1 a 1 3/8 in.",
        "Óculos não são aceitos, exceto em raros casos médicos.",
        "Sem filtros, retoques, softwares nem alterações por IA na foto.",
      ],
      searchTerms: [
        "foto cartão de passaporte americano",
        "tamanho foto passport card",
        "requisitos foto cartão de passaporte eua",
        "foto passport card 2x2",
      ],
      paper: "papel de qualidade fotográfica",
    },
    "us-visa": {
      name: "Visto dos Estados Unidos (DS-160)",
      diyNote:
        "Envie uma foto digital com o DS-160. Se o envio falhar, leve uma foto impressa de 2x2 in junto com a página de confirmação.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Imagem digital: JPEG, quadrada, de 600 a 1200 pixels por lado, 240 kB ou menos.",
        "Não melhore nem altere a foto digitalmente para mudar sua aparência.",
        "Cabeça, do topo do cabelo ao queixo: de 50% a 69% da altura da imagem.",
        "Linha dos olhos: de 56% a 69% da altura da imagem, medida a partir da borda inferior.",
        "Foto tirada nos últimos 6 meses, mostrando sua aparência atual.",
        "Óculos não são mais permitidos nas fotos novas para visto, exceto em raros casos médicos.",
      ],
      searchTerms: [
        "foto visto americano",
        "foto ds-160",
        "requisitos foto ds 160",
        "tamanho foto visto americano",
        "foto visto americano 600x600",
        "foto visto americano 240 kb",
      ],
    },
    "dv-lottery": {
      name: "Sorteio do Visto de Diversidade (DV)",
      diyNote: "Só foto digital para a inscrição; nada é impresso.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Imagem digital: JPEG, quadrada, 600 x 600 pixels, 240 kB ou menos.",
        "Inscrições com fotos manipuladas ficam inelegíveis; sem melhorias digitais.",
        "Cabeça, do topo do cabelo ao queixo: de 50% a 69% da altura da imagem.",
        "Linha dos olhos: de 56% a 69% da altura da imagem, medida a partir da borda inferior.",
        "Foto tirada nos últimos 6 meses, com fundo liso branco ou branco-gelo.",
      ],
      searchTerms: [
        "foto sorteio green card",
        "foto loteria de vistos",
        "foto visto de diversidade",
        "tamanho foto loteria green card",
        "requisitos foto sorteio de diversidade",
        "foto dv 2027",
      ],
    },
    "us-green-card": {
      name: "Pedido de green card dos Estados Unidos (I-485)",
      diyNote:
        "As instruções do formulário I-485 pedem duas fotos impressas idênticas: papel fino e brilhante, sem moldura e sem retoque. Em algumas etapas do USCIS, a foto é feita no agendamento de dados biométricos.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Duas fotos coloridas idênticas, no estilo passaporte, tiradas recentemente.",
        "As fotos devem estar sem moldura e sem retoque: sem edição nem melhoria digital.",
        "Cabeça, do topo do cabelo ao queixo: de 1 a 1 3/8 in.",
        "Altura dos olhos a partir da base da foto: de 1 1/8 a 1 3/8 in.",
        "Cabeça descoberta, a menos que sua religião exija cobertura.",
        "Escreva seu nome e o A-Number no verso, de leve, a lápis ou caneta hidrográfica.",
      ],
      searchTerms: [
        "foto green card",
        "foto i-485",
        "requisitos foto i-485",
        "foto ajuste de status uscis",
        "foto uscis 2x2",
      ],
      paper: "papel fino, acabamento brilhante, sem moldura",
    },
    "us-ead": {
      name: "Autorização de trabalho dos Estados Unidos (EAD, I-765)",
      diyNote:
        "As instruções do formulário I-765 pedem duas fotos impressas idênticas: papel fino e brilhante, sem moldura e sem retoque.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Duas fotos coloridas idênticas, no estilo passaporte, tiradas recentemente.",
        "As fotos devem estar sem moldura e sem retoque: sem edição nem melhoria digital.",
        "Cabeça, do topo do cabelo ao queixo: de 1 a 1 3/8 in.",
        "Altura dos olhos a partir da base da foto: de 1 1/8 a 1 3/8 in.",
        "Cabeça descoberta, a menos que sua religião exija cobertura.",
        "Escreva seu nome e o A-Number no verso, de leve, a lápis ou caneta hidrográfica.",
      ],
      searchTerms: [
        "foto ead",
        "foto i-765",
        "foto permissão de trabalho eua",
        "requisitos foto autorização de trabalho",
        "tamanho foto i-765",
      ],
      paper: "papel fino, acabamento brilhante, sem moldura",
    },
    "us-travel-document": {
      name: "Documento de viagem dos Estados Unidos (I-131)",
      diyNote:
        "Vale para pedidos de Advance Parole, autorização de viagem do TPS e Documento de Viagem para Refugiados. Uma foto digital deve vir de uma câmera de pelo menos 3,5 megapixels.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Duas fotos coloridas idênticas, no estilo passaporte, tiradas recentemente.",
        "As fotos devem estar sem moldura e sem retoque.",
        "Cabeça, do topo do cabelo ao queixo: de 1 a 1 3/8 in.",
        "Altura dos olhos a partir da base da foto: de 1 1/8 a 1 3/8 in.",
        "Uma foto digital deve vir de uma câmera de pelo menos 3,5 megapixels.",
        "Escreva seu nome e o A-Number no verso, de leve, a lápis ou caneta hidrográfica.",
      ],
      searchTerms: [
        "foto i-131",
        "foto advance parole",
        "foto documento de viagem refugiado",
        "requisitos foto documento de viagem eua",
        "tamanho foto i-131",
      ],
      paper: "papel fino, acabamento brilhante, sem moldura",
    },
    "us-naturalization": {
      name: "Naturalização nos Estados Unidos (N-400)",
      diyNote:
        "A maioria dos solicitantes do N-400 que estão nos EUA não envia fotos: o USCIS tira a foto no agendamento de dados biométricos. Quem está no exterior (certas categorias militares e no exterior) envia duas fotos impressas.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Fotos só são exigidas de quem faz o pedido de fora dos Estados Unidos.",
        "Duas fotos coloridas idênticas, no estilo passaporte, tiradas recentemente, sem moldura e sem retoque.",
        "Cabeça, do topo do cabelo ao queixo: de 1 a 1 3/8 in.",
        "Altura dos olhos a partir da base da foto: de 1 1/8 a 1 3/8 in.",
        "O USCIS pode pedir fotos impressas depois do envio do pedido.",
      ],
      searchTerms: [
        "foto n-400",
        "foto naturalização americana",
        "foto pedido de cidadania americana",
        "requisitos foto n-400",
      ],
      paper: "papel fino, acabamento brilhante, sem moldura",
    },

    // ------------------------------------------------------------------- India
    "in-passport": {
      name: "Passaporte da Índia (pedido feito na Índia)",
      diyNote:
        "Nenhuma foto é necessária em um Passport Seva Kendra ou PSK dos Correios; a foto é tirada lá. Só os pedidos feitos no District Passport Cell, por speed-post ou em centros de serviço ao cidadão levam uma foto impressa.",
      colors: ["branco"],
      rules: [
        "A foto impressa só é necessária para envios ao DPC, por speed-post ou em CSC; não é necessária em um PSK ou POPSK.",
        "Tamanho da foto impressa: 4,5 cm de altura por 3,5 cm de largura, colorida, uma foto.",
        "Impressões de computador não são aceitas; use uma impressão em papel fotográfico.",
        "As duas orelhas e o rosto inteiro visíveis, expressão natural, olhos abertos.",
        "Cobertura de cabeça só por motivos religiosos, com o rosto bem visível.",
        "Crianças menores de 4 anos: foto colorida de 45 mm por 35 mm, rosto ocupando de 80 a 85 por cento, fundo branco.",
      ],
      searchTerms: [
        "tamanho foto passaporte indiano",
        "foto passaporte 35x45 mm",
        "requisitos foto passaporte índia",
        "foto passport seva",
        "foto passaporte bebê índia",
      ],
      paper: "papel fotográfico de boa qualidade, impressão de tom contínuo",
    },
    "in-passport-abroad": {
      name: "Passaporte e serviços consulares da Índia (pedido feito no exterior)",
      diyNote:
        "Foto impressa, de preferência feita em estúdio profissional; impressões de impressora comum e Polaroid não servem. As missões diferem (algumas indicam 35 x 35 mm), então confira a lista de exigências da sua missão ou do centro de vistos.",
      colors: ["branco", "branco-gelo"],
      rules: [
        "Foto colorida, 2 x 2 in (51 x 51 mm), rosto inteiro, de frente, olhos abertos.",
        "Cabeça, do topo do cabelo ao queixo: de 1,4 a 1,6 in (35 a 40 mm).",
        "Não retoque, não melhore nem suavize a foto.",
        "Sem óculos escuros ou de lentes coloridas; evite reflexos nos óculos.",
        "Cobertura de cabeça só por motivos religiosos, com o rosto bem visível.",
        "A foto deve mostrar as duas orelhas, o pescoço e os ombros, sem sombras.",
      ],
      searchTerms: [
        "foto renovação passaporte indiano eua",
        "foto passaporte índia 2x2 polegadas",
        "foto passaporte 51x51 mm",
        "foto vfs passaporte indiano",
        "tamanho foto passaporte consulado indiano",
      ],
      paper: "papel fotográfico fino, impressão de tom contínuo",
    },
    "in-oci": {
      name: "Cartão OCI da Índia (envio online)",
      colors: ["de cor clara lisa (não branco)"],
      rules: [
        "Foto quadrada, JPEG ou JPG, no máximo 200 KB.",
        "De 200 x 200 a 900 x 900 pixels.",
        "Fundo liso de cor clara, não branco, e sem borda.",
        "Cabeça e ombros, rosto inteiro, no meio do quadro.",
        "Quando for pedida uma impressão: no mínimo 51 x 51 mm, com o rosto ocupando 80 por cento.",
      ],
      searchTerms: [
        "requisitos foto oci",
        "tamanho foto oci em pixels",
        "upload foto cartão oci",
        "foto oci 200kb",
        "redimensionar foto oci",
      ],
    },
    "in-evisa": {
      name: "e-Visto da Índia (envio online)",
      colors: ["de cor clara lisa", "branco"],
      rules: [
        "JPEG, de 10 KB a 1 MB; altura e largura devem ser iguais.",
        "Rosto inteiro, de frente, olhos abertos e sem óculos.",
        "Centralize a cabeça e mostre-a do topo do cabelo ao queixo.",
        "Sem sombras no rosto nem no fundo, e sem bordas.",
        "Os pedidos de visto comum usam outros limites: de 10 a 300 KB e de 350 a 1000 px.",
      ],
      searchTerms: [
        "requisitos foto e-visto índia",
        "tamanho foto evisa índia",
        "foto visto índia upload 1mb",
        "redimensionar foto e-visa índia",
        "foto visto indiano quadrada",
      ],
    },
    "in-visa": {
      name: "Visto comum da Índia (envio online)",
      colors: ["de cor clara lisa", "branco"],
      rules: [
        "JPEG, de 10 KB a 300 KB; altura e largura devem ser iguais.",
        "De 350 x 350 a 1000 x 1000 pixels.",
        "Rosto inteiro, de frente, olhos abertos; centralize a cabeça no quadro.",
        "Cabeça inteira, do topo do cabelo ao queixo.",
      ],
      searchTerms: [
        "tamanho foto visto indiano",
        "foto visto índia 350x350",
        "requisitos foto visto indiano online",
        "foto visto índia 300kb",
      ],
    },
    "in-ssc": {
      name: "Inscrição no exame SSC (CGL, CHSL)",
      diyNote:
        "As inscrições de 2026 para CGL e CHSL capturam a foto ao vivo e rejeitam a foto de uma foto já existente. Guias que citam envios de 20 a 50 KB estão desatualizados.",
      colors: ["liso"],
      rules: [
        "A foto é capturada ao vivo, pela webcam ou pelo celular, durante a inscrição.",
        "Fotografar uma foto já existente faz a inscrição ser rejeitada.",
        "Sem boné, máscara nem óculos; use boa luz e um fundo liso.",
        "Sua aparência no dia da prova deve ser igual à da foto capturada.",
        "A assinatura é um envio JPEG separado, de 10 a 20 KB.",
      ],
      searchTerms: [
        "tamanho foto ssc",
        "tamanho foto ssc cgl kb",
        "foto ssc 20kb a 50kb",
        "foto ao vivo ssc",
        "requisitos foto ssc chsl",
      ],
    },
    "in-upsc": {
      name: "Inscrição no exame UPSC (envio de foto)",
      diyNote: "O formulário também pede uma foto ao vivo, capturada dentro da inscrição.",
      colors: ["branco"],
      rules: [
        "JPG colorido, de 20 a 200 KB, salvo com o nome de arquivo photo.",
        "O rosto ocupa pelo menos 75 por cento da área da foto.",
        "Vista frontal, cabeça centralizada, as duas orelhas visíveis, olhos abertos.",
        "Sem fundo escuro, uniforme nem óculos escuros; sem sombras.",
        "A assinatura é separada: JPG, de 20 a 100 KB, de 350 a 500 pixels.",
      ],
      searchTerms: [
        "tamanho foto upsc",
        "tamanho foto e assinatura upsc kb",
        "foto upsc 20kb a 200kb",
        "foto upsc rosto 75 por cento",
        "upload foto upsc cse",
      ],
    },
    "in-neet-ug": {
      name: "Foto da inscrição no NEET (UG)",
      diyNote:
        "A inscrição também pede uma foto ao vivo, tirada com a webcam ou o celular, então o arquivo enviado não é a única foto.",
      colors: ["branco"],
      rules: [
        "JPG ou JPEG, de 10 a 200 KB, colorida ou em preto e branco.",
        "Cerca de 80 por cento da imagem deve ser o seu rosto, orelhas incluídas, sem máscara.",
        "A foto deve ser recente: tirada depois de 1 de janeiro de 2026 para o exame de 2026.",
        "A assinatura é separada: JPG ou JPEG, de 10 a 100 KB.",
      ],
      searchTerms: [
        "tamanho foto neet",
        "tamanho foto neet em kb",
        "requisitos foto neet ug",
        "foto neet 10kb a 200kb",
        "tamanho foto e assinatura nta",
      ],
    },
    "in-jee-main": {
      name: "Foto da inscrição no JEE (Main)",
      diyNote:
        "A inscrição também pede uma foto ao vivo, tirada com a webcam ou o celular, então o arquivo enviado não é a única foto.",
      colors: ["branco"],
      rules: [
        "JPG ou JPEG, de 10 a 200 KB, colorida.",
        "Cerca de 80 por cento da imagem deve ser o seu rosto, orelhas incluídas, sem máscara.",
        "A foto deve ser recente, colorida e bem legível.",
        "A assinatura é separada: JPG ou JPEG, de 10 a 100 KB.",
      ],
      searchTerms: [
        "tamanho foto jee main",
        "tamanho foto jee main em kb",
        "requisitos foto jee main",
        "foto jee main 10kb a 200kb",
      ],
    },

    // ---------------------------------------------------------------- Pakistan
    "pk-passport": {
      name: "Passaporte do Paquistão (pedido feito no Paquistão)",
      diyNote:
        "Em um Regional Passport Office, a equipe captura a sua foto junto com os dados do pedido; você não leva foto.",
      colors: [],
      rules: [
        "A foto é capturada no escritório de passaportes durante o pedido.",
        "A renovação online no exterior é outro caminho, com regras próprias de envio.",
      ],
      searchTerms: [
        "tamanho foto passaporte paquistanês",
        "requisitos foto passaporte paquistão",
        "foto e-passaporte paquistão",
      ],
    },
    "pk-passport-online": {
      name: "Renovação online do passaporte do Paquistão (no exterior)",
      diyNote:
        "Você mesmo tira e envia a foto. Não recorte uma imagem maior nem edite em software; envie o arquivo intacto da câmera.",
      colors: ["liso"],
      rules: [
        "Tamanho da foto: 45 mm de altura por 35 mm de largura.",
        "Arquivo digital de até 5 MB.",
        "Não use uma foto recortada de uma imagem maior.",
        "Não edite a foto em softwares como o Photoshop.",
      ],
      searchTerms: [
        "renovação passaporte paquistão online foto",
        "tamanho foto passaporte paquistão 35x45",
        "requisitos foto onlinemrp",
        "foto passaporte paquistão 5mb",
      ],
    },
    "pk-visa": {
      name: "Visto online do Paquistão (envio de foto)",
      colors: ["branco"],
      rules: [
        "JPG de até 350 KB.",
        "Tamanho da foto: 45 mm de altura por 35 mm de largura, colorida.",
        "Close da cabeça e da parte de cima dos ombros; o rosto ocupa de 70 a 80 por cento da foto.",
        "Olhe para a câmera, com as duas bordas do rosto visíveis, sem sombras, reflexos de flash nem olhos vermelhos.",
        "Sem óculos; cobertura de cabeça permitida se o rosto, do queixo à testa, estiver visível.",
      ],
      searchTerms: [
        "tamanho foto visto paquistão",
        "requisitos foto visto online paquistão",
        "foto visto paquistão 35x45",
        "foto visto paquistão 350kb",
        "foto visto nadra",
      ],
    },
    "pk-nicop": {
      name: "NICOP / POC do Paquistão (foto online da NADRA)",
      colors: ["liso", "branco"],
      rules: [
        "Foto de até 350 KB.",
        "Com menos de 6 meses; preto e branco não é aceito.",
        "Arquivo original, sem filtros nem camadas, sem nenhuma alteração.",
        "Sem chapéus, lentes artificiais nem óculos; sem sombras nem cabelo sobre os olhos.",
        "Cobertura de cabeça permitida se o rosto inteiro, queixo incluído, estiver bem visível.",
      ],
      searchTerms: [
        "requisitos foto nicop",
        "tamanho foto nadra",
        "instruções upload foto nadra",
        "foto documento paquistão 350kb",
      ],
    },

    // -------------------------------------------------------------- Bangladesh
    "bd-passport": {
      name: "e-Passaporte de Bangladesh",
      diyNote:
        "Nenhuma foto é anexada ao formulário do e-passaporte. Só os menores de 6 anos levam uma foto impressa em laboratório.",
      colors: ["cinza (só na impressão para menores de 6 anos)"],
      rules: [
        "Nenhuma foto é anexada nem autenticada no formulário do e-passaporte.",
        "Menores de 6 anos: impressão de laboratório 3R (tamanho 4R) com fundo cinza.",
      ],
      searchTerms: [
        "foto e-passaporte bangladesh",
        "tamanho foto passaporte bangladesh",
        "requisitos foto passaporte bangladesh",
      ],
    },
    "bd-visa": {
      name: "Visto de Bangladesh (foto do formulário online)",
      diyNote:
        "A foto online é opcional. As missões também podem pedir fotos impressas, por exemplo duas impressões coloridas de 2 x 2 in em fundo branco, tiradas nos últimos 6 meses (Los Angeles).",
      colors: ["branco"],
      rules: [
        "Foto digital de 45 mm por 35 mm, JPEG, no máximo 300 KB.",
        "O envio da foto é opcional no formulário online.",
        "As regras de impressão variam por missão; consulte a missão que cuida do seu visto.",
      ],
      searchTerms: [
        "tamanho foto visto bangladesh",
        "foto visto online bangladesh",
        "foto visto bangladesh 300kb",
      ],
    },

    // -------------------------------------------------------------------- Nepal
    "np-passport": {
      name: "e-Passaporte do Nepal",
      diyNote:
        "A foto é tirada na hora, no centro de cadastramento. Só recém-nascidos e crianças menores de 5 anos levam uma foto impressa.",
      colors: ["branco (só na impressão para menores de 5 anos)"],
      rules: [
        "Adultos não levam foto; a equipe do cadastramento a tira em tempo real.",
        "Crianças menores de 5 anos: tamanho passaporte, 35 mm por 45 mm, branco liso, sem borda.",
      ],
      searchTerms: [
        "tamanho foto passaporte nepal",
        "requisitos foto e-passaporte nepal",
        "foto passaporte nepal 35x45",
      ],
    },

    // --------------------------------------------------------------- Sri Lanka
    "lk-passport": {
      name: "Passaporte do Sri Lanka",
      diyNote:
        "Uma foto digital é enviada ao Departamento por um estúdio fotográfico autorizado ou tirada nos seus escritórios. Fotos impressas não são aceitas.",
      colors: [],
      rules: [
        "A foto deve ter sido tirada nos últimos 6 meses.",
        "Os estúdios a enviam online; nenhuma foto impressa é necessária para o pedido.",
        "Olhos bem visíveis, sem óculos.",
        "Bonés e lenços permitidos se a testa e as orelhas estiverem bem visíveis, sem sombra do lenço no rosto.",
      ],
      searchTerms: [
        "foto passaporte sri lanka",
        "requisitos foto passaporte sri lanka",
        "estúdio foto digital passaporte sri lanka",
      ],
    },

    // ---------------------------------------------------------- United Kingdom
    "uk-passport": {
      name: "Passaporte do Reino Unido (impresso)",
      diyNote:
        "As impressões devem parecer feitas profissionalmente e não recortadas de uma imagem maior. Um laboratório fotográfico ou uma cabine é o caminho mais seguro para formulários em papel.",
      colors: ["creme", "cinza-claro"],
      rules: [
        "Duas impressões idênticas para o pedido em papel; sem bordas, dobras nem marcas.",
        "Tirada no último mês, colorida.",
        "Expressão neutra, boca fechada, olhos abertos, sem sombras no rosto nem atrás de você.",
        "Sem óculos, a menos que necessários; nunca escuros, e sem armação, reflexo ou brilho sobre os olhos.",
        "A foto não pode ter sido alterada por software.",
        "Não troque nem altere o fundo; a remoção de marcas ou sombras pode ser tolerada na análise.",
      ],
      searchTerms: [
        "tamanho foto passaporte britânico",
        "foto passaporte reino unido 35x45",
        "requisitos foto passaporte reino unido",
        "foto passaporte britânico impressa",
        "tamanho foto hm passport office",
      ],
      paper: "papel fotográfico branco liso, sem borda",
    },
    "uk-passport-online": {
      name: "Passaporte do Reino Unido (envio online)",
      diyNote:
        "Envie a foto original. O serviço online faz o recorte, então não recorte nem edite você mesmo. Alguém deve tirar a foto; sem selfies.",
      colors: ["de cor clara", "liso"],
      rules: [
        "Não recorte a foto; inclua cabeça, ombros e parte superior do corpo.",
        "Colorida, nítida e em foco, sem alteração por software.",
        "Tirada no último mês, com a ajuda de outra pessoa.",
        "Expressão neutra, boca fechada, olhos abertos e visíveis, sem sombras no rosto nem atrás de você.",
      ],
      searchTerms: [
        "foto passaporte reino unido online",
        "tamanho foto upload passaporte britânico",
        "foto passaporte reino unido 600x750",
        "foto digital passaporte britânico",
      ],
    },
    "uk-visa": {
      name: "Visto ou permissão do Reino Unido (foto do UKVI)",
      diyNote:
        "Para pedidos que exigem o envio de uma foto do seu rosto. Ela pode ser feita com celular ou tablet; pedir a outra pessoa que tire a foto reduz a chance de recusa.",
      colors: ["de cor clara", "liso"],
      rules: [
        "Orientação vertical; sem espelhar nem inverter.",
        "Mostre cabeça, ombros e parte superior do corpo, sem mais ninguém na foto.",
        "Não pode ser alterada por software ou filtro; tirada em um ambiente bem iluminado.",
        "Não pode ser a foto de outra foto, nem a mesma foto do seu passaporte.",
        "Sem sombras no rosto nem atrás de você; tente pedir a outra pessoa que a tire.",
      ],
      searchTerms: [
        "requisitos foto visto reino unido",
        "upload foto ukvi",
        "tamanho foto visto reino unido",
        "foto evisa reino unido",
        "requisitos foto brp",
      ],
    },

    // ---------------------------------------------------------------- Schengen
    "schengen-visa": {
      name: "Visto Schengen",
      diyNote:
        "Cada consulado ou centro de vistos define suas próprias regras, e alguns insistem em impressões profissionais. Consulte o que cuida do seu pedido.",
      colors: ["branco", "cinza-claro"],
      rules: [
        "O rosto ocupa de 70 a 80 por cento da foto, do queixo ao topo da cabeça, centralizado.",
        "Foto recente, com no máximo seis meses; digitalizações e fotocópias são recusadas.",
        "Iluminação uniforme: sem sombras no rosto nem no fundo, sem olhos vermelhos.",
        "Expressão neutra, boca fechada, olhando direto para a câmera.",
        "Os fundos variam: missões alemãs pedem cinza neutro claro, as italianas pedem branco.",
      ],
      searchTerms: [
        "foto visto schengen",
        "tamanho foto visto schengen",
        "requisitos foto visto schengen",
        "foto 35x45",
        "foto visto schengen 35x45 mm",
      ],
    },

    // ----------------------------------------------------------------- Ireland
    "ie-passport": {
      name: "Passaporte irlandês (impresso)",
      diyNote:
        "Pedidos em papel precisam de impressões em papel de qualidade fotográfica. Pode ser colorida; o passaporte a mostra em preto e branco.",
      colors: ["cinza-claro", "branco", "creme"],
      rules: [
        "O tamanho pode ir de 35 x 45 mm até 38 x 50 mm.",
        "Quatro impressões idênticas, tiradas nos últimos seis meses.",
        "Mostre da cabeça até a metade do tronco, com espaço visível ao redor da cabeça e dos ombros.",
        "Sem melhorias nem alterações digitais; sem marcas de tinta nem dobras.",
        "Expressão neutra, boca fechada, sem sombras no rosto nem atrás da cabeça.",
      ],
      searchTerms: [
        "tamanho foto passaporte irlandês",
        "requisitos foto passaporte irlanda",
        "foto passaporte irlanda 35x45",
        "foto passaporte irlandês impressa",
      ],
      paper: "papel de qualidade fotográfica, alta resolução; verso branco e sem brilho",
    },
    "ie-passport-online": {
      name: "Passaporte irlandês (envio online)",
      diyNote:
        "Tire a foto em casa com a ajuda de alguém: sem selfies e sem zoom. Uma cabine de fotos ou uma loja pode fornecer um código ou arquivo.",
      colors: ["cinza-claro", "branco", "creme"],
      rules: [
        "Colorida, não digitalizada, sem artefatos de compressão nem distorção de barril.",
        "Não pode ser melhorada nem alterada digitalmente.",
        "Tirada nos últimos seis meses.",
        "Mostre da cabeça até a metade do tronco; a ferramenta de envio pode girar uma foto deitada.",
        "Óculos permitidos se a armação e o reflexo não cobrirem os olhos.",
      ],
      searchTerms: [
        "foto passaporte irlandês online",
        "upload foto passaporte irlandês online",
        "foto passaporte irlanda 715x951",
        "requisitos foto passaporte online irlanda",
      ],
    },

    // ------------------------------------------------------- Germany, France...
    "de-passport": {
      name: "Passaporte ou identidade da Alemanha",
      diyNote:
        "Desde 1º de maio de 2025, a foto deve ser tirada digitalmente na autoridade ou por um fornecedor de fotos registrado. Fotos em papel e feitas em casa não são aceitas.",
      colors: [],
      rules: [
        "Vale para passaportes, documentos de identidade e cartões de residência.",
        "Os fornecedores enviam a foto à autoridade por uma nuvem segura.",
        "Você recebe um código Data Matrix impresso; a autoridade o usa para obter a foto.",
        "Fotos em papel foram aceitas só em casos excepcionais até 31 de julho de 2025.",
      ],
      searchTerms: [
        "foto passaporte alemão",
        "foto passaporte alemanha digital 2025",
        "foto biométrica passaporte alemão",
        "requisitos foto passaporte alemão 2025",
        "passbild digital 2025",
      ],
    },
    "fr-passport": {
      name: "Passaporte francês",
      diyNote:
        "A foto deve ser tirada por um profissional autorizado ou em uma cabine com um sistema autorizado pelo Ministério do Interior.",
      colors: ["azul-claro", "cinza-claro"],
      rules: [
        "Fundos brancos não são permitidos; use uma cor lisa e clara.",
        "Foto com no máximo seis meses; só uma foto é necessária.",
        "Sem sombras no rosto nem no fundo; foto colorida fortemente recomendada.",
        "Cabeça descoberta, expressão neutra, boca fechada, olhos abertos e visíveis.",
        "Óculos são opcionais; armação fina, sem lentes escuras nem reflexos.",
      ],
      searchTerms: [
        "foto passaporte francês",
        "foto passaporte frança 35x45",
        "tamanho foto passaporte francês",
        "requisitos foto passaporte francês",
        "photo passeport france",
      ],
    },
    "fr-id-card": {
      name: "Documento nacional de identidade da França",
      diyNote:
        "A foto deve ser tirada por um profissional autorizado ou em uma cabine com um sistema autorizado pelo Ministério do Interior.",
      colors: ["azul-claro", "cinza-claro"],
      rules: [
        "Fundos brancos não são permitidos; use uma cor lisa e clara.",
        "Foto com no máximo seis meses; só uma foto é necessária.",
        "Sem sombras no rosto nem no fundo; foto colorida fortemente recomendada.",
        "Cabeça descoberta, expressão neutra, boca fechada, olhos abertos e visíveis.",
        "Óculos são opcionais; armação fina, sem lentes escuras nem reflexos.",
      ],
      searchTerms: [
        "foto carteira de identidade francesa",
        "foto documento de identidade frança",
        "requisitos foto identidade francesa",
        "foto cni 35x45",
      ],
    },
    "nl-passport": {
      name: "Passaporte ou identidade dos Países Baixos",
      diyNote:
        "Nenhuma das regras da foto impressa diz quem deve tirá-la. Consulte a sua prefeitura; muita gente recorre a um fotógrafo ou a uma cabine. A altura da cabeça é menor do que os 32 a 36 mm habituais.",
      colors: ["cinza-claro", "azul-claro", "branco"],
      rules: [
        "Largura do rosto de 16 a 20 mm; cabeça inteira à mostra e centralizada.",
        "Foto colorida, com no máximo seis meses; preto e branco não é permitido.",
        "Fundo liso em um único tom uniforme; sem sombra no rosto nem no fundo.",
        "Expressão neutra, boca fechada, olhando direto para a câmera.",
        "Só óculos transparentes, sem reflexo nem sombra sobre os olhos.",
      ],
      searchTerms: [
        "foto passaporte holandês",
        "requisitos foto passaporte holanda",
        "tamanho foto passaporte países baixos",
        "foto passaporte holanda 35x45",
        "pasfoto eisen",
      ],
      paper: "papel fotográfico liso de alta qualidade, com pelo menos 400 dpi",
    },
    "it-passport": {
      name: "Passaporte italiano",
      diyNote:
        "Nenhuma das regras da foto impressa diz quem deve tirá-la. Consulte o órgão emissor; muita gente recorre a um fotógrafo ou a uma cabine.",
      colors: ["branco"],
      rules: [
        "O rosto ocupa de 70 a 80 por cento da foto, do queixo à testa.",
        "Foto recente, com no máximo seis meses, colorida.",
        "Luz uniforme, sem reflexos de flash, sombras nem olhos vermelhos.",
        "Expressão neutra, boca fechada, olhando direto para a câmera.",
        "Uma foto é necessária para o pedido.",
      ],
      searchTerms: [
        "foto passaporte italiano",
        "tamanho foto passaporte itália",
        "foto passaporte italiano 35x45",
        "requisitos foto passaporte italiano",
        "foto passaporto italiano misure",
      ],
      paper: "papel fotográfico de alta qualidade e alta resolução",
    },

    // ------------------------------------------------------------------ Canada
    "ca-passport": {
      name: "Passaporte do Canadá",
      diyNote:
        "Deve ser tirada pessoalmente por um fotógrafo comercial ou estúdio, que acrescenta seus dados no verso. Impressões caseiras são recusadas.",
      colors: ["branco liso", "de cor clara"],
      rules: [
        "São exigidas duas fotos idênticas e sem alteração.",
        "Softwares de edição de fotos, filtros e ferramentas de IA não são permitidos.",
        "Expressão neutra, com a boca fechada.",
        "Óculos permitidos se os olhos estiverem bem visíveis e as lentes sem reflexo.",
        "Óculos de sol e lentes coloridas são recusados.",
      ],
      searchTerms: [
        "foto passaporte canadense",
        "tamanho foto passaporte canadá",
        "requisitos foto passaporte canadá 50x70",
        "foto passaporte canadá fotógrafo",
      ],
      paper: "impressa profissionalmente em papel fotográfico liso e de alta qualidade",
    },
    "ca-visa": {
      name: "Visto de visitante do Canadá (TRV)",
      diyNote:
        "Não é preciso fotógrafo. As fotos digitais não podem ser alteradas. Siga as regras do próprio formulário online para o tamanho do envio.",
      colors: ["branco liso", "de cor clara"],
      rules: [
        "O quadro tem pelo menos 35 x 45 mm; cabeça e parte de cima dos ombros à mostra.",
        "Tirada nos últimos seis meses.",
        "Expressão neutra, boca fechada.",
        "Óculos sem cor permitidos se a armação não cobrir os olhos.",
        "Se for digital, a foto não pode ser alterada de forma alguma.",
      ],
      searchTerms: [
        "tamanho foto visto canadá",
        "requisitos foto visto de visitante canadá",
        "foto visto canadá 35x45",
      ],
      paper: "papel fotográfico de qualidade",
    },
    "ca-pr": {
      name: "Cartão de residente permanente do Canadá",
      diyNote:
        "O IRCC manda procurar um fotógrafo comercial ou estúdio, mesmo para a cópia digital. Fotos em papel precisam do nome, do endereço e da data do estúdio no verso.",
      colors: ["branco liso"],
      rules: [
        "Pedidos online levam uma foto digital; pedidos em papel levam duas fotos idênticas.",
        "Foto tirada no máximo 12 meses antes do pedido.",
        "Expressão neutra, boca fechada, olhos abertos, olhando para a câmera.",
        "A foto não pode ser copiada de outra foto nem alterada de forma alguma.",
      ],
      searchTerms: [
        "foto cartão residente permanente canadá",
        "requisitos foto residente permanente canadá",
        "tamanho foto pr card canadá 50x70",
      ],
      paper: "impressa profissionalmente em papel fotográfico liso e de alta qualidade",
    },

    // ------------------------------------------------------------- Australia
    "au-passport": {
      name: "Passaporte da Austrália",
      diyNote:
        "As impressões devem ser por sublimação de tinta, em papel brilhante de pelo menos 200 g/m², então peça a um laboratório fotográfico que imprima; impressoras domésticas não atendem a isso. Um fornecedor profissional de fotos para passaporte é recomendado, mas não obrigatório; aplicativos e serviços online são desaconselhados.",
      colors: ["branco liso", "cinza-claro"],
      rules: [
        "A largura da impressão pode ser de 35-40 mm e a altura de 45-50 mm.",
        "São necessárias duas fotos, nítidas e sem edição.",
        "Suavizar a pele, clarear o fundo ou remover sombras pode afetar as conferências biométricas.",
        "Rosto de frente, expressão neutra, sem sombras no rosto nem no fundo.",
      ],
      searchTerms: [
        "foto passaporte australiano",
        "tamanho foto passaporte austrália",
        "requisitos foto passaporte australiano 35x45",
      ],
      paper: "brilhante, gramatura alta, sublimação de tinta, mínimo de 200 g/m²",
    },
    "au-visa": {
      name: "Visto da Austrália",
      diyNote:
        "O Home Affairs recomenda um fornecedor profissional de fotos para passaporte, mas não o exige.",
      colors: ["neutro", "cinza-claro"],
      rules: [
        "Foto recente no formato passaporte, 45 x 35 mm, só cabeça e ombros, de frente para a câmera.",
        "Tirada nos últimos seis meses, colorida e sem edição.",
        "O fundo deve contrastar com o seu rosto.",
        "Sem óculos, a menos que necessários por motivo médico; a armação não pode cobrir os olhos.",
      ],
      searchTerms: [
        "tamanho foto visto austrália",
        "requisitos foto visto australiano",
        "foto visto austrália 35x45",
      ],
    },

    // ------------------------------------------------------------- New Zealand
    "nz-passport": {
      name: "Passaporte da Nova Zelândia",
      diyNote: "Pedidos online aceitam uma foto enviada; selfies não são aceitas.",
      colors: [],
      rules: [
        "Orientação vertical, 3:4 (4:3 na tela do computador).",
        "Foto colorida tirada nos últimos 6 meses.",
        "Selfies não são aceitas.",
        "Use a ferramenta de conferência de fotos do passports.govt.nz antes de enviar.",
      ],
      searchTerms: [
        "foto passaporte nova zelândia",
        "requisitos foto passaporte nova zelândia",
        "tamanho foto passaporte nova zelândia online pixels",
      ],
    },

    // -------------------------------------------------- China, Japan, and others
    "cn-visa": {
      name: "Visto da China",
      diyNote:
        "Imprima em papel fotográfico brilhante (não fosco) para o formulário em papel; o formulário online aceita um JPEG dentro dos limites de pixels e de tamanho.",
      colors: ["branco", "quase branco"],
      rules: [
        "Largura da cabeça de 15-22 mm; sem moldura de borda em volta da foto.",
        "Tirada nos últimos 6 meses, colorida, em tom natural.",
        "Expressão neutra, olhos abertos, lábios fechados, orelhas visíveis.",
        "Inclinação da cabeça de no máximo 20 graus para os lados e 25 graus para cima ou para baixo.",
        "Óculos permitidos, exceto de armação grossa, escuros ou com reflexo.",
      ],
      searchTerms: [
        "tamanho foto visto china",
        "requisitos foto visto chinês",
        "foto visto china 33x48",
        "tamanho foto upload visto china online",
      ],
      paper: "papel fotográfico de acabamento brilhante, não fosco nem papel comum",
    },
    "jp-visa": {
      name: "Visto do Japão",
      diyNote:
        "O tamanho depende da embaixada: a maioria indica 45 x 35 mm (35 de largura, 45 de altura), a Embaixada na Índia indica 45 x 45 mm e os consulados nos EUA também aceitam 2 x 2 in. Consulte a que cuida do seu pedido.",
      colors: ["branco"],
      rules: [
        "Tirada até seis meses antes do pedido, de frente, sem chapéu.",
        "Fundos escuros, carregados ou estampados não são aceitos.",
        "Fotos modificadas digitalmente não são aceitas.",
        "Escreva seu nome completo e data de nascimento no verso.",
        "Altura da cabeça de 32-36 mm quando a embaixada a indica; nem todas indicam.",
      ],
      searchTerms: [
        "tamanho foto visto japão",
        "foto visto japão 45x35",
        "requisitos foto visto japonês",
      ],
    },
    "ph-passport": {
      name: "Passaporte das Filipinas",
      diyNote:
        "A foto é tirada no local, no seu agendamento no DFA; não leve a sua. Use roupas adequadas.",
      colors: [],
      rules: [
        "Foto, impressões digitais e assinatura são capturadas no agendamento.",
        "Todos os solicitantes, de qualquer idade, devem comparecer pessoalmente.",
      ],
      searchTerms: [
        "foto passaporte filipinas",
        "requisitos foto passaporte filipino",
        "foto passaporte dfa",
      ],
    },
    "kr-visa": {
      name: "Visto da Coreia do Sul",
      diyNote:
        "As missões diferem. Los Angeles e a Finlândia não estabelecem regra sobre o fotógrafo, mas algumas missões (Montreal, por exemplo) pedem um fotógrafo comercial, com a data carimbada no verso. Consulte a sua missão.",
      colors: ["branco", "branco-gelo", "liso e claro"],
      rules: [
        "Foto colorida, fundo liso e bem iluminado, sem marcas nem dobras.",
        "Tirada nos últimos 6 meses, olhando direto para a câmera.",
        "Sem óculos de sol nem chapéus, exceto por motivos médicos ou religiosos.",
        "Fotos iguais a uma foto de passaporte dos últimos seis meses podem ser recusadas.",
        "Algumas missões também aceitam 2 x 2 in.",
      ],
      searchTerms: [
        "tamanho foto visto coreia",
        "requisitos foto visto coreia do sul",
        "foto visto coreano 35x45",
      ],
    },
    "za-passport": {
      name: "Passaporte da África do Sul",
      diyNote:
        "As missões sul-africanas pedem fotos coloridas feitas por profissionais. Consulte a sua missão antes de encomendar.",
      colors: ["branco"],
      rules: [
        "Rosto inteiro, só cabeça e ombros, boca fechada.",
        "Sem óculos; testa livre de cabelo.",
      ],
      searchTerms: [
        "foto passaporte áfrica do sul",
        "tamanho foto passaporte sul-africano 35x45",
        "requisitos foto passaporte áfrica do sul",
      ],
    },
    "ae-icp": {
      name: "Serviços ICP dos Emirados Árabes Unidos",
      diyNote:
        "Especificação de foto para os e-serviços do ICP dos EAU (visto e residência). Use uma foto impressa em papel de alta qualidade.",
      colors: ["branco", "liso de cor clara"],
      rules: [
        "Largura de 35-40 mm; o rosto ocupa 70-80% da fotografia.",
        "Tirada há no máximo 6 meses, olhando direto para a câmera.",
        "Expressão neutra, olhos abertos e visíveis, sem chapéu nem óculos de sol.",
        "As duas bordas do rosto visíveis, sem sombras nem reflexos de flash.",
      ],
      searchTerms: [
        "tamanho foto visto emirados",
        "requisitos foto visto emirados árabes",
        "foto visto residência emirados 4.5x3.5",
      ],
    },
  },
};
