const VOWELS = new Set(["a", "e", "i", "o", "u"]);

export function isVowel(ch: string): boolean {
  return VOWELS.has(ch.toLowerCase());
}

export function patternOf(name: string): string {
  return name
    .toLowerCase()
    .split("")
    .map((c) => (isVowel(c) ? "V" : "C"))
    .join("");
}

export function vowelConsonantBalance(name: string): number {
  const lower = name.toLowerCase();
  if (lower.length === 0) return 0;
  let vowels = 0;
  for (const c of lower) if (isVowel(c)) vowels++;
  const consonants = lower.length - vowels;
  if (consonants === 0) return 50;
  const ratio = vowels / lower.length;
  const distanceFromIdeal = Math.abs(ratio - 0.45);
  const score = 100 - distanceFromIdeal * 220;
  return Math.max(0, Math.min(100, score));
}

const HARD_CLUSTERS = [
  "qx",
  "xq",
  "zj",
  "jz",
  "qz",
  "zq",
  "vx",
  "xv",
  "qj",
  "jq",
  "wx",
  "xw",
  "qk",
  "kq",
  "zx",
  "xz",
];

export function hasAwkwardCluster(name: string): boolean {
  const lower = name.toLowerCase();
  for (const c of HARD_CLUSTERS) {
    if (lower.includes(c)) return true;
  }
  let consec = 0;
  for (const ch of lower) {
    if (!isVowel(ch)) {
      consec++;
      if (consec >= 4) return true;
    } else {
      consec = 0;
    }
  }
  return false;
}

export function radioTest(name: string): boolean {
  const lower = name.toLowerCase();
  if (/[^a-z]/.test(lower)) return false;
  if (hasAwkwardCluster(lower)) return false;
  if (lower.length < 4 || lower.length > 9) return false;
  const pattern = patternOf(lower);
  if (
    pattern === "CVCV" ||
    pattern === "CVCVC" ||
    pattern === "CVCCV" ||
    pattern === "CVCCVC" ||
    pattern === "VCVC" ||
    pattern === "CVVCV"
  )
    return true;
  let v = 0;
  for (const ch of lower) if (isVowel(ch)) v++;
  return v / lower.length >= 0.3 && v / lower.length <= 0.6;
}

export function memorabilityScore(name: string): number {
  let score = 70;
  const lower = name.toLowerCase();
  if (lower.length <= 5) score += 12;
  else if (lower.length <= 6) score += 8;
  else if (lower.length <= 7) score += 4;
  else if (lower.length >= 9) score -= 10;

  const pattern = patternOf(lower);
  if (pattern === "CVCV" || pattern === "CVCVC") score += 12;
  else if (pattern === "CVCCV" || pattern === "CVCCVC") score += 8;

  if (hasAwkwardCluster(lower)) score -= 25;

  const repeatBonus = /(.)\1/.test(lower) ? 3 : 0;
  score += repeatBonus;

  let altCount = 0;
  for (let i = 1; i < lower.length; i++) {
    if (isVowel(lower[i] ?? "") !== isVowel(lower[i - 1] ?? "")) altCount++;
  }
  const altRatio = altCount / Math.max(1, lower.length - 1);
  score += (altRatio - 0.5) * 14;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function lengthScore(name: string): number {
  const len = name.length;
  if (len === 4) return 100;
  if (len === 5) return 95;
  if (len === 6) return 88;
  if (len === 7) return 75;
  if (len === 8) return 62;
  if (len === 9) return 48;
  if (len === 3) return 90;
  return 30;
}

export function tldScore(tld: string): number {
  const t = tld.toLowerCase();
  if (t === "com") return 100;
  if (t === "io" || t === "ai") return 80;
  if (t === "co" || t === "app" || t === "xyz") return 65;
  return 50;
}

export function trendScore(name: string, keywords: string[]): number {
  const lower = name.toLowerCase();
  let best = 30;
  for (let i = 0; i < keywords.length; i++) {
    const kw = (keywords[i] ?? "").toLowerCase();
    if (!kw) continue;
    if (lower.includes(kw)) {
      const positionWeight = Math.max(0.4, 1 - i / Math.max(1, keywords.length));
      best = Math.max(best, 70 + positionWeight * 30);
    }
  }
  return Math.round(best);
}

export function phoneticScore(name: string): number {
  const balance = vowelConsonantBalance(name);
  const radio = radioTest(name) ? 100 : 55;
  return Math.round(balance * 0.55 + radio * 0.45);
}

export interface ScoreInput {
  name: string;
  tld: string;
  trendKeywords: string[];
}

export interface ScoreOutput {
  valueScore: number;
  breakdown: {
    length: number;
    tld: number;
    trend: number;
    phonetic: number;
    memorability: number;
    radioTest: number;
  };
  vowelConsonantBalance: number;
  memorability: number;
  radioTest: boolean;
  pattern: string;
}

export function scoreCandidate(input: ScoreInput): ScoreOutput {
  const { name, tld, trendKeywords } = input;
  const len = lengthScore(name);
  const tldS = tldScore(tld);
  const trend = trendScore(name, trendKeywords);
  const phonetic = phoneticScore(name);
  const memo = memorabilityScore(name);
  const radio = radioTest(name);
  const radioS = radio ? 100 : 50;

  const value =
    len * 0.18 +
    tldS * 0.22 +
    trend * 0.18 +
    phonetic * 0.14 +
    memo * 0.18 +
    radioS * 0.1;

  return {
    valueScore: Math.round(value * 10) / 10,
    breakdown: {
      length: Math.round(len),
      tld: Math.round(tldS),
      trend: Math.round(trend),
      phonetic: Math.round(phonetic),
      memorability: Math.round(memo),
      radioTest: Math.round(radioS),
    },
    vowelConsonantBalance: Math.round(vowelConsonantBalance(name) * 10) / 10,
    memorability: memo,
    radioTest: radio,
    pattern: patternOf(name),
  };
}
