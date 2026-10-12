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
  nav: { today: "Today", browse: "Browse", me: "My picks" },
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
  nav: { today: "Bugün", browse: "Keşfet", me: "Tahminlerim" },
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
