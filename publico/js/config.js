/* UMADBAP — configuração do site.
 * Tudo que muda de um congresso para outro fica AQUI: datas, preços, links.
 * Valor null = "a confirmar" (o site mostra isso sozinho, sem inventar números).
 */
window.UMADBAP = {
  congresso: {
    edicao: "9º",          // próxima edição
    data: null,            // ex.: "12 a 14 de julho de 2027"
    local: null,           // ex.: "Assembleia de Deus — Santa Quitéria (MA)"
    tema: null
  },

  inscricao: {
    aberta: false,         // true = mostra o formulário; false = aviso "ainda não disponível"
    valor: null,           // ex.: 30 (em reais, por pessoa)
    prazo: null,           // ex.: "30 de junho"
    maxParticipantesCaravana: 200
  },

  camisas: {
    aberta: false,         // true = mostra o pedido; false = aviso "ainda não disponível"
    valor: null,           // ex.: 45 (em reais, por peça)
    tamanhos: ["P", "M", "G", "GG", "XG"],
    // Modelos à venda. Para adicionar outro, copie a linha e troque id/nome/foto.
    modelos: [
      { id: "oficial", nome: "Camisa oficial do congresso", foto: "/fotos/camiseta-costas-800.webp" }
    ],
    maxPorItem: 500
  },

  // Contato da equipe (WhatsApp só com números: 55 + DDD + número).
  // Usado na bolha de ajuda, na página de patrocínio e nos botões de WhatsApp.
  whatsapp: "559885550319",
  contato: { nome: "Irmão Adão Lemos", telefone: "(98) 8555-0319" },
  instagram: "https://www.instagram.com/umadbap/",
  tiktok: "https://www.tiktok.com/@umadbapoficial",
  youtube: "https://www.youtube.com/@umadbap",

  // Página de fotos: cada álbum é uma pasta no Google Drive.
  // Para um congresso novo, troque os links (a equipe de mídia só precisa
  // deixar a pasta como "Qualquer pessoa com o link pode ver").
  fotos: {
    titulo: "8º Congresso · 2026",
    albuns: [
      { dia: "1º dia", periodo: "noite", capa: "/fotos/noite-palco-640.webp",     url: "https://drive.google.com/drive/folders/1_kj9sBLzzV1c20i8S-oP6hEZ6bEiPKOi?usp=drive_link" },
      { dia: "2º dia", periodo: "manhã", capa: "/fotos/louvor-alegria-640.webp",  url: "https://drive.google.com/drive/folders/1cSnJEjFqG_RL1vKgndDvzB_63tIX4eee?usp=drive_link" },
      { dia: "2º dia", periodo: "noite", capa: "/fotos/multidao-maos-640.webp",   url: "https://drive.google.com/drive/folders/1BT6BpXgB_X5wI8orKGiMs2Ba8RxM1Zig?usp=drive_link" },
      { dia: "3º dia", periodo: "manhã", capa: "/fotos/biblia-bandeiras-640.webp",url: "https://drive.google.com/drive/folders/1FVPEt0LHdBtjHPGpWKQNKiJUVMG-xfc2?usp=drive_link" },
      { dia: "3º dia", periodo: "noite", capa: "/fotos/adoracao-maos-640.webp",   url: "https://drive.google.com/drive/folders/1Bglo_RXjQCIQE-QYowyupEiWIrfjhItu?usp=drive_link" }
    ]
  },

  api: { base: "/api" }
};
