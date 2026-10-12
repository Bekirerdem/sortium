import { useSyncExternalStore } from "react";

export type Lang = "en" | "tr";

const KEY = "sortium.lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "tr") return saved;
  } catch {
    // storage blocked: fall through to the browser language
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

let current: Lang = typeof window === "undefined" ? "en" : detect();
const subs = new Set<() => void>();

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // the choice still holds for this visit
  }
  document.documentElement.lang = l;
  subs.forEach((f) => f());
}

export function getLang(): Lang {
  return current;
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
}

export const useT = () => STR[useLang()];

/** Turkish names with their locative form ("Türkiye'de"), for every storefront and region the templates open. */
export const TR_COUNTRY: Record<string, [string, string]> = {
  tr: ["Türkiye", "Türkiye'de"], us: ["ABD", "ABD'de"], kr: ["Güney Kore", "Güney Kore'de"], br: ["Brezilya", "Brezilya'da"],
  jp: ["Japonya", "Japonya'da"], de: ["Almanya", "Almanya'da"], gb: ["Birleşik Krallık", "Birleşik Krallık'ta"],
  fr: ["Fransa", "Fransa'da"], mx: ["Meksika", "Meksika'da"], in: ["Hindistan", "Hindistan'da"],
};

const en = {
  nav: { today: "Today", browse: "Markets", me: "My picks", leaders: "Leaderboard" },
  home: {
    title: "Call what the internet does next.",
    sub: "Which song tops Apple Music tomorrow? Which video trends on YouTube? Put test dollars on your pick. Everyone who's right splits the pool, and open code reads the result from the official chart.",
    start: "Start with 1,000 test dollars",
    browse: "See all markets",
    stats: { volume: "In pools", bets: "Picks made", players: "Players", open: "Open markets" },
    deckHint: "Tap a pick to see what it pays",
    deckCta: "Make this pick",
    deckPays: (m: string) => `pays ${m} per tUSD`,
    deckFresh: "nobody's on it yet",
    prev: "Previous market",
    next: "Next market",
    tickerBet: (u: string, a: string, l: string) => `${u} put ${a} tUSD on ${l}`,
    tickerClaim: (u: string, a: string) => `${u} collected ${a} tUSD`,
    howTitle: "How it works",
    how: [
      ["Pick", "Choose the song or video you think will be on top when the clock runs out."],
      ["Put in", "Your test dollars join the market's single pool. The fewer people on your pick, the more it pays."],
      ["The chart decides", "Open code reads the official chart and posts it to UMA's oracle, where anyone can dispute a wrong answer. Winners split the pool."],
    ],
    closing: "Closing soon",
    leadersTitle: "Top players",
    won: "won",
    staked: "staked",
    picks: (n: number) => `${n} picks`,
    leadersEmpty: "No results yet. The first daily markets settle at 12:00 UTC.",
    activityTitle: "Live picks",
    activityEmpty: "Picks show up here a few seconds after they land onchain.",
    tokenTitle: "tUSD, the test dollar Sortium runs on",
    tokenBody: "Every market on testnet is played in tUSD, our own ERC-20 on Arbitrum Sepolia. Approvals are signatures, not extra transactions (EIP-2612). Anyone can claim 1,000 a day, with a little test ETH for gas. On mainnet USDC takes its place.",
    tokenAdd: "Add tUSD to my wallet",
    tokenContract: "Token contract",
    supply: "Decimals",
    footer: "Testnet only. Test dollars have no value.",
    cats: { all: "All", music: "Music charts", youtube: "YouTube trending", views: "Video views", fast: "15-minute", soon: "Coming next" },
    catNote: {
      all: "Every open market",
      music: "Apple Music's daily #1 in ten countries",
      youtube: "YouTube's trending #1 in eight countries",
      views: "Views on a creator's new video after 24 hours",
      fast: "Real charts on a short clock, settled in minutes",
      soon: "Templates on the roadmap",
    },
    search: "Search songs, videos, countries",
    sort: { closing: "Closing soon", pool: "Biggest pool", fresh: "Newest" },
    gridTitle: "Markets",
    noMatch: "Nothing matches. Try another word or category.",
    viewsSoon: "Opens when a tracked creator uploads.",
    poolLabel: "pool",
    bettors: (n: number) => (n === 1 ? "1 player" : `${n} players`),
    autoplay: "Playing through markets",
  },
  chart: {
    title: "How the pool moved",
    empty: "The chart starts with the first pick.",
    ranges: { h1: "1H", h6: "6H", d1: "1D", all: "All" },
  },
  tabs: { recent: "Recent picks", top: "Biggest picks", related: "More like this" },
  foot: {
    tagline: "Pick what the internet does next. Pool bets on public charts, settled by open code and UMA.",
    markets: "Markets",
    product: "Product",
    verify: "Verify",
    build: "Built with",
    how: "How it works",
    token: "tUSD faucet",
    engine: "Engine API",
    source: "Resolver code",
    hackathon: "Colosseum Crypto World's Fair, Arbitrum track",
    legal: "A hackathon project on Arbitrum Sepolia. Test dollars only, no real money, not audited, not investment advice.",
    block: "Arbitrum Sepolia, block",
  },
  picker: {
    title: "How do you want to play?",
    instant: "Instant wallet",
    instantDesc: "Nothing to install. A test wallet opens in this browser and 1,000 tUSD plus gas arrive automatically.",
    fastest: "Fastest",
    or: "Or connect your own wallet",
    none: "No browser wallet found. MetaMask, Rabby and OKX Wallet work with Arbitrum Sepolia.",
    noTestnet: "No Arbitrum Sepolia support",
    close: "Close",
    errors: {
      unsupported: (w: string) => `${w || "This wallet"} can't switch to Arbitrum Sepolia. Use the instant wallet, or MetaMask, Rabby or OKX Wallet.`,
      rejected: () => "You closed the wallet request.",
      none: () => "Connect a wallet first.",
    },
    menuInstant: "Instant wallet in this browser",
    logout: "Disconnect",
  },
  lang: { label: "Language", other: "TR" },
  family: { music: "Music", youtube: "YouTube" },
  engineDown: "Can't reach the market engine right now. Retrying every 30 seconds.",
  loadingMarkets: "Loading markets",
  today: {
    kicker: (when: string) => `Today's big one. The chart is read ${when}.`,
    closesIn: "Betting closes in",
    pool: "In the pool",
    outcomes: "Outcomes",
    cta: "Make your pick",
    board: "Where the money is",
    multHint: "multiplier if it wins",
    how: [
      ["Everyone pays into one pot", "People who pick the right answer split the whole pool, minus a 2% fee."],
      ["The chart decides", "When the market ends, open code reads the official chart. No person picks the winner."],
      ["Anyone can check it", "The result sits on UMA's oracle for a while. If it's wrong, anyone can dispute it."],
    ],
    alsoOpen: "Also open",
    nMarkets: (n: number) => `${n} markets`,
    deciding: "Being decided",
    decidingHint: "results checked on UMA",
    empty: "New markets open every few minutes. Check back shortly.",
  },
  market: {
    cantLoad: (id: number, e: string) => `Market ${id} could not be loaded. ${e}`,
    loading: (id: number) => `Loading market ${id}`,
    kicker: (family: string, when: string) => `${family}. The result is read ${when}.`,
    demo: "demo, real data on a short clock",
    status: ["Open", "Locked", "Being checked", "Decided", "Cancelled"],
    statusLabel: "Status",
    boardOpen: "Make your pick",
    boardResolved: "The result",
    boardClosed: "The picks",
    refunded: (v: string) => `Refunded ${v} tUSD.`,
    collected: (v: string) => `Collected ${v} tUSD.`,
    cancelledTitle: "This market was cancelled",
    wonTitle: "You called it",
    cancelledBody: "The source wasn't available, so every stake is refunded.",
    wonBody: "Your pick topped the chart. Collect your share of the pool.",
    refundBtn: "Get my refund",
    collectBtn: (v: string) => `Collect ${v} tUSD`,
    howTitle: "How the result is decided",
    fingerprint: "Resolver code fingerprint, stored onchain:",
    loadingShort: "loading",
    evidence: "See the raw evidence",
    contract: "Contract on Arbiscan",
    share: "Share on X",
    tweet: (q: string) => `${q} I made my pick on Sortium.`,
    live: { "Views now": "Views now", "#1 right now": "#1 right now" } as Record<string, string>,
    rules: {} as Record<string, string>,
  },
  option: {
    other: "Something else",
    mine: (v: string) => `You have ${v} on this`,
    fresh: "new",
    ofPool: (p: string) => `${p}% of the pool`,
    noPicks: "no picks",
    first: "be the first",
  },
  slip: {
    pick: "Pick an outcome above",
    then: "Then choose how much to put in.",
    win: ["If you're right you get ", " tUSD"],
    min: " · minimum 1",
    max: " · maximum 500 per market",
    amount: "Amount",
    custom: "Custom amount",
    other: "other",
    confirm: "Confirm in wallet",
    bet: (n: number) => `Bet ${n} tUSD`,
    placed: (title: string) => `Bet placed on ${title}. View it on Arbiscan.`,
  },
  steps: {
    title: "Where this market is",
    open: "Betting open",
    closes: "Betting closes",
    posted: "Result posted to UMA, open to disputes",
    paid: "Winners paid",
    cancelled: "Cancelled, everyone refunded",
  },
  tile: {
    closesIn: (c: string) => `Closes in ${c}`,
    checking: "Result being checked on UMA",
    decided: "Decided",
    closed: "Closed",
    demo: "demo",
  },
  wallet: {
    connect: "Connect wallet",
    sending: "Sending",
    get: "Get 1,000 test dollars",
    sent: "1,000 test dollars and a little gas are on the way.",
    addressCooldown: "You already got test dollars today. Come back tomorrow.",
    ipCooldown: "This network already used the faucet today. Come back tomorrow.",
    faucetDown: "The faucet didn't answer. Try again in a minute.",
  },
  browse: {
    title: "Browse markets",
    category: "Category",
    soonTab: "Coming next",
    soonNote: "Coming after the hackathon",
    soon: [
      ["Film and TV", "Will the next Stranger Things episode drop before Friday?"],
      ["Games", "How many people will play GTA 6 on launch day?"],
      ["Streamers", "Will the stream pass a million viewers?"],
      ["Speeches", "Will the Fed chair say “tariff” at the press conference?"],
      ["Weather", "Will it rain in Istanbul tomorrow?"],
    ],
    emptyYt: "YouTube markets open when tracked creators upload and when the daily charts refresh.",
    emptyMusic: "No music markets are open right now. New ones open every day.",
  },
  me: {
    title: "My picks",
    connect: "Connect wallet to see your picks",
    reading: "Reading your picks from the chain",
    empty: "No picks yet. Today's big market is a good place to start.",
    staked: (v: string) => `${v} tUSD in`,
    status: { open: "Open", settled: "Decided", void: "Refunded", other: "Being checked" },
    collect: (v: string) => `Collect ${v}`,
    view: "View",
  },
};

type Dict = typeof en;

const tr: Dict = {
  nav: { today: "Bugün", browse: "Marketler", me: "Tahminlerim", leaders: "Sıralama" },
  home: {
    title: "İnternetin bir sonraki hamlesini tahmin et.",
    sub: "Yarın Apple Music'te hangi şarkı zirvede olacak? YouTube'da hangi video trend olacak? Tahminine test doları koy. Bilen herkes havuzu paylaşır, sonucu resmi listeden açık kod okur.",
    start: "1.000 test doları ile başla",
    browse: "Tüm marketler",
    stats: { volume: "Havuzlarda", bets: "Yapılan tahmin", players: "Oyuncu", open: "Açık market" },
    deckHint: "Ne kazandıracağını görmek için bir seçeneğe dokun",
    deckCta: "Bu tahmini yap",
    deckPays: (m: string) => `tUSD başına ${m} öder`,
    deckFresh: "henüz kimse seçmedi",
    prev: "Önceki market",
    next: "Sonraki market",
    tickerBet: (u: string, a: string, l: string) => `${u}, ${l} için ${a} tUSD koydu`,
    tickerClaim: (u: string, a: string) => `${u} ${a} tUSD kazancını aldı`,
    howTitle: "Nasıl çalışır",
    how: [
      ["Seç", "Süre dolduğunda zirvede olacağını düşündüğün şarkıyı ya da videoyu seç."],
      ["Havuza koy", "Test doların marketin tek havuzuna girer. Seçtiğine ne kadar az kişi koyduysa o kadar çok kazandırır."],
      ["Kararı liste verir", "Açık kod resmi listeyi okur ve sonucu UMA oracle'ına yazar; yanlışsa herkes itiraz edebilir. Bilenler havuzu paylaşır."],
    ],
    closing: "Kapanmak üzere",
    leadersTitle: "En iyi oyuncular",
    won: "kazanç",
    staked: "yatırılan",
    picks: (n: number) => `${n} tahmin`,
    leadersEmpty: "Henüz sonuç yok. İlk günlük marketler 12:00 UTC'de sonuçlanıyor.",
    activityTitle: "Canlı tahminler",
    activityEmpty: "Tahminler zincire düştükten birkaç saniye sonra burada görünür.",
    tokenTitle: "tUSD: Sortium'un test doları",
    tokenBody: "Testnetteki her market tUSD ile oynanır: Arbitrum Sepolia'daki kendi ERC-20 tokenimiz. Onay ayrı bir işlem değil, tek imza (EIP-2612). Herkes günde 1.000 tUSD alabilir, gas için yanında biraz test ETH'si gelir. Mainnet'te yerini USDC alır.",
    tokenAdd: "tUSD'yi cüzdanıma ekle",
    tokenContract: "Token kontratı",
    supply: "Ondalık",
    footer: "Sadece testnet. Test dolarlarının değeri yoktur.",
    cats: { all: "Tümü", music: "Müzik listeleri", youtube: "YouTube trend", views: "Video izlenme", fast: "15 dakikalık", soon: "Sırada" },
    catNote: {
      all: "Açık olan bütün marketler",
      music: "On ülkede Apple Music'in günlük 1 numarası",
      youtube: "Sekiz ülkede YouTube trendlerinin 1 numarası",
      views: "Bir kanalın yeni videosunun 24 saatteki izlenmesi",
      fast: "Gerçek listeler, kısa süre; dakikalar içinde sonuçlanır",
      soon: "Yol haritasındaki şablonlar",
    },
    search: "Şarkı, video ya da ülke ara",
    sort: { closing: "Yakında kapanan", pool: "En büyük havuz", fresh: "En yeni" },
    gridTitle: "Marketler",
    noMatch: "Eşleşen market yok. Başka bir kelime ya da kategori dene.",
    viewsSoon: "Takip edilen bir kanal video yükleyince açılır.",
    poolLabel: "havuz",
    bettors: (n: number) => `${n} oyuncu`,
    autoplay: "Marketler sırayla gösteriliyor",
  },
  chart: {
    title: "Havuz nasıl değişti",
    empty: "Grafik ilk tahminle başlar.",
    ranges: { h1: "1 sa", h6: "6 sa", d1: "1 gün", all: "Tümü" },
  },
  tabs: { recent: "Son tahminler", top: "En büyük tahminler", related: "Benzer marketler" },
  foot: {
    tagline: "İnternetin bir sonraki hamlesini tahmin et. Resmi listeler üzerine havuz bahsi; sonucu açık kod ve UMA belirler.",
    markets: "Marketler",
    product: "Ürün",
    verify: "Doğrula",
    build: "Altyapı",
    how: "Nasıl çalışır",
    token: "tUSD musluğu",
    engine: "Motor API",
    source: "Sonuç kodu",
    hackathon: "Colosseum Crypto World's Fair, Arbitrum kategorisi",
    legal: "Arbitrum Sepolia üzerinde bir hackathon projesi. Sadece test doları, gerçek para yok, denetlenmedi, yatırım tavsiyesi değildir.",
    block: "Arbitrum Sepolia, blok",
  },
  picker: {
    title: "Nasıl oynamak istersin?",
    instant: "Anında cüzdan",
    instantDesc: "Kurulum yok. Bu tarayıcıda bir test cüzdanı açılır, 1.000 tUSD ve gas kendiliğinden gelir.",
    fastest: "En hızlı",
    or: "Ya da kendi cüzdanını bağla",
    none: "Tarayıcıda cüzdan bulunamadı. MetaMask, Rabby ve OKX Wallet Arbitrum Sepolia ile çalışır.",
    noTestnet: "Arbitrum Sepolia desteği yok",
    close: "Kapat",
    errors: {
      unsupported: (w: string) => `${w || "Bu cüzdan"} Arbitrum Sepolia ağına geçemiyor. Anında cüzdanı ya da MetaMask, Rabby veya OKX Wallet'ı kullan.`,
      rejected: () => "Cüzdan isteğini kapattın.",
      none: () => "Önce bir cüzdan bağla.",
    },
    menuInstant: "Bu tarayıcıdaki anında cüzdan",
    logout: "Çıkış yap",
  },
  lang: { label: "Dil", other: "EN" },
  family: { music: "Müzik", youtube: "YouTube" },
  engineDown: "Market motoruna şu an ulaşılamıyor. 30 saniyede bir yeniden deneniyor.",
  loadingMarkets: "Marketler yükleniyor",
  today: {
    kicker: (when: string) => `Günün büyük marketi. Liste ${when} okunuyor.`,
    closesIn: "Bahis kapanışına",
    pool: "Havuzda",
    outcomes: "Seçenek",
    cta: "Tahminini yap",
    board: "Para nerede",
    multHint: "kazanırsa çarpan",
    how: [
      ["Herkes tek bir havuza koyar", "Doğru cevabı seçenler havuzun tamamını paylaşır, %2 komisyon düşülür."],
      ["Kararı liste verir", "Market bittiğinde açık kod resmi listeyi okur. Kazananı bir insan seçmez."],
      ["Herkes kontrol edebilir", "Sonuç bir süre UMA oracle'ında bekler. Yanlışsa herkes itiraz edebilir."],
    ],
    alsoOpen: "Açık diğer marketler",
    nMarkets: (n: number) => `${n} market`,
    deciding: "Sonuçlananlar",
    decidingHint: "sonuçlar UMA'da kontrol ediliyor",
    empty: "Birkaç dakikada bir yeni market açılıyor. Az sonra tekrar bak.",
  },
  market: {
    cantLoad: (id: number, e: string) => `${id} numaralı market yüklenemedi. ${e}`,
    loading: (id: number) => `${id} numaralı market yükleniyor`,
    kicker: (family: string, when: string) => `${family}. Sonuç ${when} okunuyor.`,
    demo: "demo: gerçek veri, kısa süre",
    status: ["Açık", "Kilitli", "Kontrol ediliyor", "Sonuçlandı", "İptal edildi"],
    statusLabel: "Durum",
    boardOpen: "Tahminini yap",
    boardResolved: "Sonuç",
    boardClosed: "Tahminler",
    refunded: (v: string) => `${v} tUSD iade edildi.`,
    collected: (v: string) => `${v} tUSD hesabına geçti.`,
    cancelledTitle: "Bu market iptal edildi",
    wonTitle: "Bildin",
    cancelledBody: "Kaynağa ulaşılamadı, bu yüzden bütün bahisler iade ediliyor.",
    wonBody: "Seçtiğin zirveye çıktı. Havuzdaki payını al.",
    refundBtn: "İademi al",
    collectBtn: (v: string) => `${v} tUSD'yi al`,
    howTitle: "Sonuç nasıl belirleniyor",
    fingerprint: "Sonucu belirleyen kodun zincirdeki parmak izi:",
    loadingShort: "yükleniyor",
    evidence: "Ham kanıtı gör",
    contract: "Arbiscan'de kontrat",
    share: "X'te paylaş",
    tweet: (q: string) => `${q} Tahminimi Sortium'da yaptım.`,
    live: { "Views now": "Şu anki izlenme", "#1 right now": "Şu an 1 numara" },
    rules: {
      AM_TOP_COUNTRY:
        "Sonuç, sonuç saatinde ya da hemen sonrasındaki ilk okumada Apple'ın o ülke için yayımladığı resmi En Çok Dinlenenler listesinin ilk sırasındaki şarkıdır. O şarkı seçenekler arasında yoksa 'Başka bir şey' kazanır. Liste sonuç saatinden sonra 6 saat boyunca okunamazsa market iptal olur ve bütün bahisler iade edilir.",
      AM_TOP_DEMO:
        "Sonuç, sonuç saatinde ya da hemen sonrasındaki ilk okumada Apple'ın o ülke için yayımladığı resmi En Çok Dinlenenler listesinin ilk sırasındaki şarkıdır. O şarkı seçenekler arasında yoksa 'Başka bir şey' kazanır. Liste sonuç saatinden sonra 6 saat boyunca okunamazsa market iptal olur ve bütün bahisler iade edilir.",
      YT_TOP_COUNTRY:
        "Sonuç, sonuç saatinde ya da hemen sonrasındaki ilk okumada YouTube Data API'nin o bölge için verdiği trendler listesinin ilk videosudur. Listede olmayan bir video zirvedeyse 'Başka bir şey' kazanır. Liste 6 saat boyunca okunamazsa market iptal olur, bahisler iade edilir.",
      YT_VIEWS_24H:
        "Sonuç, video yayımlandıktan 24 saat sonraki ilk okumada YouTube Data API'nin verdiği izlenme sayısıdır. Aralıklar market açılırken sabitlenir. Video kaldırılır, gizlenir ya da bulunamazsa market iptal olur, bahisler iade edilir.",
    },
  },
  option: {
    other: "Başka bir şey",
    mine: (v: string) => `Bunda ${v} tUSD'n var`,
    fresh: "yeni",
    ofPool: (p: string) => `havuzda %${p}`,
    noPicks: "tahmin yok",
    first: "ilk sen seç",
  },
  slip: {
    pick: "Yukarıdan bir seçenek seç",
    then: "Sonra ne kadar koyacağını belirle.",
    win: ["Bilirsen ", " tUSD alırsın"],
    min: " · en az 1",
    max: " · market başına en fazla 500",
    amount: "Tutar",
    custom: "Başka tutar",
    other: "diğer",
    confirm: "Cüzdanda onayla",
    bet: (n: number) => `${n} tUSD yatır`,
    placed: (title: string) => `${title} için bahsin alındı. Arbiscan'de görebilirsin.`,
  },
  steps: {
    title: "Market ne aşamada",
    open: "Bahisler açık",
    closes: "Bahisler kapanıyor",
    posted: "Sonuç UMA'ya gönderilir, itiraza açık",
    paid: "Kazananlara ödeme",
    cancelled: "İptal, herkese iade",
  },
  tile: {
    closesIn: (c: string) => `${c} sonra kapanıyor`,
    checking: "Sonuç UMA'da kontrol ediliyor",
    decided: "Sonuçlandı",
    closed: "Kapandı",
    demo: "demo",
  },
  wallet: {
    connect: "Cüzdan bağla",
    sending: "Gönderiliyor",
    get: "1.000 test doları al",
    sent: "1.000 test doları ve biraz gas yolda.",
    addressCooldown: "Bugün test dolarını zaten aldın. Yarın tekrar gel.",
    ipCooldown: "Bu ağdan bugün musluk zaten kullanıldı. Yarın tekrar gel.",
    faucetDown: "Musluk cevap vermedi. Bir dakika sonra tekrar dene.",
  },
  browse: {
    title: "Marketleri keşfet",
    category: "Kategori",
    soonTab: "Sırada",
    soonNote: "Hackathon'dan sonra geliyor",
    soon: [
      ["Film ve dizi", "Stranger Things'in yeni bölümü cumadan önce çıkacak mı?"],
      ["Oyun", "GTA 6'yı çıkış günü kaç kişi oynayacak?"],
      ["Yayıncılar", "Yayın bir milyon izleyiciyi geçecek mi?"],
      ["Konuşmalar", "Fed başkanı basın toplantısında “gümrük vergisi” diyecek mi?"],
      ["Hava durumu", "Yarın İstanbul'a yağmur yağacak mı?"],
    ],
    emptyYt: "YouTube marketleri takip edilen kanallar video yükleyince ve günlük listeler yenilenince açılır.",
    emptyMusic: "Şu an açık müzik marketi yok. Her gün yenileri açılıyor.",
  },
  me: {
    title: "Tahminlerim",
    connect: "Tahminlerini görmek için cüzdan bağla",
    reading: "Tahminlerin zincirden okunuyor",
    empty: "Henüz tahminin yok. Günün büyük marketi başlamak için iyi bir yer.",
    staked: (v: string) => `${v} tUSD yatırıldı`,
    status: { open: "Açık", settled: "Sonuçlandı", void: "İade edildi", other: "Kontrol ediliyor" },
    collect: (v: string) => `${v} tUSD'yi al`,
    view: "Gör",
  },
};

export const STR: Record<Lang, Dict> = { en, tr };

const LOCALE: Record<Lang, string> = { en: "en-US", tr: "tr-TR" };
export const locale = (l: Lang) => LOCALE[l];

const UNIT_LOC = ["", "de", "de", "te", "te", "te", "da", "de", "de", "da"];
const TEN_LOC = ["da", "da", "de", "da", "ta", "de"];

/** "12:00'de", "12:05'te", "12:30'da": the suffix follows the last spoken word of the time. */
export function trClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const n = m === 0 ? h : m;
  const suffix = n % 10 ? UNIT_LOC[n % 10] : TEN_LOC[Math.floor(n / 10)];
  return `${hhmm}'${suffix}`;
}

/** "on Oct 13 at 12:00 UTC" · "13 Ekim 12:00'de (UTC)" */
export function decidedAt(t: number, l: Lang): string {
  const d = new Date(t * 1000);
  const hhmm = d.toISOString().slice(11, 16);
  if (l === "tr") return `${d.toLocaleString("tr-TR", { month: "long", day: "numeric", timeZone: "UTC" })} ${trClock(hhmm)} (UTC)`;
  return `on ${d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} at ${hhmm} UTC`;
}

/** "3 min. ago" · "3 dk. önce" */
export function ago(t: number, l: Lang, now = Date.now() / 1000): string {
  const s = Math.max(0, Math.round(now - t));
  const f = new Intl.RelativeTimeFormat(locale(l), { numeric: "auto", style: "short" });
  if (s < 60) return f.format(-s, "second");
  if (s < 3600) return f.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return f.format(-Math.floor(s / 3600), "hour");
  return f.format(-Math.floor(s / 86400), "day");
}

/** A wallet or chain error as one readable sentence. */
export function errorText(e: unknown, l: Lang): string {
  const code = (e as { code?: unknown }).code;
  const name = (e as { wallet?: string }).wallet ?? "";
  if (code === "unsupported" || code === "rejected" || code === "none") return STR[l].picker.errors[code](name);
  if (code === 4001) return STR[l].picker.errors.rejected();
  return String((e as Error).message ?? e).split("\n")[0].slice(0, 140);
}
