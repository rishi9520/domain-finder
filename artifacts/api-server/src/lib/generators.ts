import { isVowel, hasAwkwardCluster, patternOf } from "./scoring";

const BLOCKED_FRAGMENTS = [
  "fuck",
  "fuk",
  "fuq",
  "shit",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "bitch",
  "nigg",
  "rape",
  "porn",
  "anal",
  "anus",
  "tits",
  "boob",
  "slut",
  "whore",
  "fag",
  "homo",
  "kkk",
  "nazi",
  "kike",
  "spic",
  "chink",
  "hitler",
  "isis",
  "jihad",
  "kill",
  "die",
  "dead",
  "suck",
  "ugly",
  "scam",
  "fraud",
  "spam",
  "junk",
  "trash",
  "vagina",
  "penis",
  "sex",
  "xxx",
  "loli",
  "incest",
];

function isClean(name: string): boolean {
  const lower = name.toLowerCase();
  for (const bad of BLOCKED_FRAGMENTS) {
    if (lower.includes(bad)) return false;
  }
  return true;
}

const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split("");
const PRIMARY_CONS = "bdfgklmnprstvz".split("");
const VOWELS_LIST = "aeiou".split("");

const FUTURE_SUFFIXES: Record<string, string[]> = {
  ai: ["mind", "sync", "core", "logic", "neural", "vertex", "nexus", "pulse"],
  quantum: ["qbit", "qore", "wave", "node", "grid", "vertex", "layer"],
  biotech: ["bio", "gene", "cell", "vita", "lyte", "zoa", "morph"],
  green_energy: ["volt", "grid", "pulse", "flux", "solr", "leaf", "loop"],
  space_tech: ["orbit", "warp", "nova", "quasr", "comet", "stellr", "void"],
};

const FUTURE_PREFIXES: Record<string, string[]> = {
  ai: ["neural", "cog", "synap", "deep", "axion"],
  quantum: ["qore", "qubo", "entangl", "wave", "axiq"],
  biotech: ["geno", "cyto", "helix", "nucl", "myco"],
  green_energy: ["eco", "verd", "lume", "sol", "kine"],
  space_tech: ["astra", "orbi", "nebu", "lumen", "exo"],
};

const TRANSLIT_ROOTS = [
  "dhanda",
  "vega",
  "tejas",
  "agni",
  "indra",
  "shakti",
  "rapid",
  "veloz",
  "vita",
  "lumen",
  "siempre",
  "alma",
  "fuego",
  "nuevo",
  "primo",
];

const TRANSLIT_SUFFIXES = [
  "ola",
  "ify",
  "io",
  "ly",
  "go",
  "kart",
  "mind",
  "wave",
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function genCVCV(rng: () => number): string {
  const c1 = pick(PRIMARY_CONS, rng);
  const v1 = pick(VOWELS_LIST, rng);
  const c2 = pick(PRIMARY_CONS, rng);
  const v2 = pick(VOWELS_LIST, rng);
  return `${c1}${v1}${c2}${v2}`;
}

function genCVCVC(rng: () => number): string {
  return genCVCV(rng) + pick(PRIMARY_CONS, rng);
}

function genCVCCV(rng: () => number): string {
  const c1 = pick(PRIMARY_CONS, rng);
  const v1 = pick(VOWELS_LIST, rng);
  const c2 = pick(PRIMARY_CONS, rng);
  let c3 = pick(PRIMARY_CONS, rng);
  while (c3 === c2) c3 = pick(PRIMARY_CONS, rng);
  const v2 = pick(VOWELS_LIST, rng);
  return `${c1}${v1}${c2}${c3}${v2}`;
}

export function generateBrandableCVCV(
  count: number,
  seed = Date.now(),
): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const r = rng();
    let name: string;
    if (r < 0.4) name = genCVCV(rng);
    else if (r < 0.75) name = genCVCVC(rng);
    else name = genCVCCV(rng);
    if (!hasAwkwardCluster(name) && isClean(name)) out.add(name);
  }
  return Array.from(out);
}

export function generateFutureSuffix(
  category: string,
  trendKeywords: string[],
  count: number,
  seed = Date.now(),
): string[] {
  const rng = makeRng(seed);
  const suffixes = FUTURE_SUFFIXES[category] ?? FUTURE_SUFFIXES.ai!;
  const prefixes = FUTURE_PREFIXES[category] ?? FUTURE_PREFIXES.ai!;
  const seeds = [
    ...prefixes,
    ...trendKeywords.map((k) => k.toLowerCase().replace(/[^a-z]/g, "")),
  ].filter((s) => s.length >= 3 && s.length <= 6);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const r = rng();
    if (r < 0.5) {
      const root = pick(seeds, rng);
      const suf = pick(suffixes, rng);
      const candidate = (root + suf).slice(0, 9);
      if (!hasAwkwardCluster(candidate) && candidate.length >= 5 && isClean(candidate))
        out.add(candidate);
    } else {
      const pre = pick(prefixes, rng).slice(0, 4);
      const suf = pick(suffixes, rng);
      const candidate = (pre + suf).slice(0, 9);
      if (!hasAwkwardCluster(candidate) && candidate.length >= 5 && isClean(candidate))
        out.add(candidate);
    }
  }
  return Array.from(out);
}

export function generateDictionaryHack(
  trendKeywords: string[],
  count: number,
  seed = Date.now(),
): string[] {
  const rng = makeRng(seed);
  const power = ["ai", "deep", "core", "lab", "hub", "go", "io", "x", "now"];
  const seeds = trendKeywords
    .map((k) => k.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((s) => s.length >= 3 && s.length <= 6);
  if (seeds.length === 0) seeds.push("logic", "mind", "core", "wave");
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const a = pick(seeds, rng);
    const b = pick(power, rng);
    const r = rng();
    const candidate = (r < 0.5 ? a + b : b + a).slice(0, 12);
    if (!hasAwkwardCluster(candidate) && candidate.length >= 4 && isClean(candidate))
      out.add(candidate);
  }
  return Array.from(out);
}

export function generateTransliteration(
  count: number,
  seed = Date.now(),
): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const root = pick(TRANSLIT_ROOTS, rng);
    const suf = pick(TRANSLIT_SUFFIXES, rng);
    const candidate = (root + suf).toLowerCase().slice(0, 12);
    if (!hasAwkwardCluster(candidate) && candidate.length >= 5 && isClean(candidate))
      out.add(candidate);
  }
  return Array.from(out);
}

export function generateFourLetter(
  count: number,
  seed = Date.now(),
): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  const digits = "0123456789".split("");
  while (out.size < count && attempts < count * 40) {
    attempts++;
    const pattern = rng() < 0.5 ? "LNLL" : "LLNL";
    let s = "";
    for (const ch of pattern) {
      if (ch === "L") s += pick(CONSONANTS.concat(VOWELS_LIST), rng);
      else s += pick(digits, rng);
    }
    if (!hasAwkwardCluster(s.replace(/[0-9]/g, "")) && isClean(s)) out.add(s);
  }
  return Array.from(out);
}

const PREMIUM_PREFIXES = [
  "neo",
  "meta",
  "syn",
  "omni",
  "hyper",
  "ultra",
  "para",
  "proto",
  "trans",
  "infra",
  "exo",
  "endo",
  "cyber",
  "bio",
  "geo",
  "helio",
  "lumin",
  "vivo",
  "auro",
  "kine",
];

const PREMIUM_ROOTS = [
  "core",
  "labs",
  "node",
  "wave",
  "loop",
  "flux",
  "form",
  "stack",
  "grid",
  "pulse",
  "field",
  "mesh",
  "cell",
  "byte",
  "sense",
  "cast",
  "scope",
  "tide",
  "spark",
  "drift",
  "shift",
  "axis",
  "orbit",
  "vector",
];

const COLOR_TECH = [
  "lumi",
  "vivid",
  "prism",
  "aqua",
  "ember",
  "azure",
  "indigo",
  "amber",
  "ivory",
  "obsidian",
  "neon",
  "violet",
  "crimson",
  "ochre",
  "saffron",
];

const SHORT_TECH_SUFFIX = [
  "ly",
  "io",
  "ai",
  "ix",
  "xa",
  "ox",
  "us",
  "or",
  "yx",
  "el",
  "an",
  "ex",
];

export function generatePrefixRoot(count: number, seed = Date.now()): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const p = pick(PREMIUM_PREFIXES, rng);
    const r = pick(PREMIUM_ROOTS, rng);
    const candidate = (p + r).toLowerCase();
    if (
      candidate.length >= 5 &&
      candidate.length <= 11 &&
      !hasAwkwardCluster(candidate) &&
      isClean(candidate)
    )
      out.add(candidate);
  }
  return Array.from(out);
}

export function generateColorTech(count: number, seed = Date.now()): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const c = pick(COLOR_TECH, rng);
    const r = pick(PREMIUM_ROOTS, rng);
    const candidate = (c + r).toLowerCase();
    if (
      candidate.length >= 5 &&
      candidate.length <= 11 &&
      !hasAwkwardCluster(candidate) &&
      isClean(candidate)
    )
      out.add(candidate);
  }
  return Array.from(out);
}

export function generateVowelStart(count: number, seed = Date.now()): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const len = 5 + Math.floor(rng() * 3); // 5..7
    let s = pick(VOWELS_LIST, rng);
    for (let i = 1; i < len; i++) {
      s += isVowel(s[s.length - 1] ?? "")
        ? pick(PRIMARY_CONS, rng)
        : pick(VOWELS_LIST.concat(PRIMARY_CONS), rng);
    }
    if (!hasAwkwardCluster(s) && isClean(s)) out.add(s);
  }
  return Array.from(out);
}

export function generatePortmanteau(
  trendKeywords: string[],
  count: number,
  seed = Date.now(),
): string[] {
  if (trendKeywords.length < 2) return [];
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const a = pick(trendKeywords, rng).toLowerCase();
    const b = pick(trendKeywords, rng).toLowerCase();
    if (a === b) continue;
    const splitA = 1 + Math.floor(rng() * Math.max(1, a.length - 1));
    const splitB = 1 + Math.floor(rng() * Math.max(1, b.length - 1));
    const candidate = (a.slice(0, splitA) + b.slice(splitB)).toLowerCase();
    if (
      candidate.length >= 5 &&
      candidate.length <= 10 &&
      !hasAwkwardCluster(candidate) &&
      isClean(candidate) &&
      /^[a-z]+$/.test(candidate)
    )
      out.add(candidate);
  }
  return Array.from(out);
}

export function generateShortSuffix(count: number, seed = Date.now()): string[] {
  const rng = makeRng(seed);
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const root = pick(PREMIUM_ROOTS.concat(COLOR_TECH), rng);
    const suf = pick(SHORT_TECH_SUFFIX, rng);
    const candidate = (root + suf).toLowerCase();
    if (
      candidate.length >= 5 &&
      candidate.length <= 9 &&
      !hasAwkwardCluster(candidate) &&
      isClean(candidate)
    )
      out.add(candidate);
  }
  return Array.from(out);
}

export const ALL_STRATEGIES = [
  "brandable_cvcv",
  "future_suffix",
  "dictionary_hack",
  "transliteration",
  "prefix_root",
  "color_tech",
  "vowel_start",
  "portmanteau",
  "short_suffix",
] as const;

// Enforce: only 5-7 letter, lowercase a-z, vulgarity-clean, and not previously seen.
function passesGate(name: string, exclude?: Set<string>): boolean {
  if (!name) return false;
  if (name.length < 5 || name.length > 7) return false;
  if (!/^[a-z]+$/.test(name)) return false;
  if (!isClean(name)) return false;
  if (exclude && exclude.has(name)) return false;
  return true;
}

export function generate(
  strategy: string,
  category: string,
  trendKeywords: string[],
  count: number,
  seed = Date.now(),
  excludeNames?: Set<string>,
): string[] {
  // Massively oversample so the 5-7 length + dedup gate still yields `count` names.
  const oversample = Math.max(count * 12, 1500);
  let raw: string[];
  switch (strategy) {
    case "brandable_cvcv":
      raw = generateBrandableCVCV(oversample, seed);
      break;
    case "future_suffix":
      raw = generateFutureSuffix(category, trendKeywords, oversample, seed);
      break;
    case "dictionary_hack":
      raw = generateDictionaryHack(trendKeywords, oversample, seed);
      break;
    case "transliteration":
      raw = generateTransliteration(oversample, seed);
      break;
    case "prefix_root":
      raw = generatePrefixRoot(oversample, seed);
      break;
    case "color_tech":
      raw = generateColorTech(oversample, seed);
      break;
    case "vowel_start":
      raw = generateVowelStart(oversample, seed);
      break;
    case "portmanteau":
      raw = generatePortmanteau(trendKeywords, oversample, seed);
      break;
    case "short_suffix":
      raw = generateShortSuffix(oversample, seed);
      break;
    default:
      raw = generateBrandableCVCV(oversample, seed);
  }
  const fresh: string[] = [];
  const seenLocal = new Set<string>();
  for (const name of raw) {
    if (seenLocal.has(name)) continue;
    if (!passesGate(name, excludeNames)) continue;
    seenLocal.add(name);
    fresh.push(name);
    if (fresh.length >= count) break;
  }
  return fresh;
}

// Bulk in-memory generation: call generate() repeatedly with shifted seeds until
// the requested count is satisfied or we've burnt enough rounds. Used by hunter
// for "evaluated per second" perception while keeping DNS load sane.
export function generateBulk(
  strategy: string,
  category: string,
  trendKeywords: string[],
  count: number,
  seed: number,
  excludeNames?: Set<string>,
  maxRounds = 8,
): { names: string[]; evaluated: number } {
  const out: string[] = [];
  const seen = new Set<string>();
  let evaluated = 0;
  for (let r = 0; r < maxRounds && out.length < count; r++) {
    const round = generate(
      strategy,
      category,
      trendKeywords,
      count,
      (seed ^ (r * 0x9e3779b1)) >>> 0,
      excludeNames,
    );
    evaluated += Math.max(count * 12, 1500);
    for (const n of round) {
      if (seen.has(n)) continue;
      seen.add(n);
      out.push(n);
      if (out.length >= count) break;
    }
  }
  return { names: out, evaluated };
}

export { isVowel, patternOf };
