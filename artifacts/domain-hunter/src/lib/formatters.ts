export function formatCategory(cat: string) {
  switch (cat) {
    case "ai": return "AI";
    case "quantum": return "Quantum";
    case "biotech": return "Biotech";
    case "green_energy": return "Green Energy";
    case "space_tech": return "Space-Tech";
    default: return cat;
  }
}

export function formatStrategy(strat: string) {
  switch (strat) {
    case "brandable_cvcv": return "Brandable CVCV";
    case "future_suffix": return "Future Suffix";
    case "dictionary_hack": return "Dictionary Hack";
    case "transliteration": return "Transliteration";
    case "four_letter": return "4-Letter";
    default: return strat;
  }
}

export function getScoreColor(score: number) {
  if (score >= 90) return "text-purple-400 bg-purple-400/10 border-purple-400/20";
  if (score >= 75) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (score >= 60) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-muted-foreground bg-muted/20 border-muted/30";
}

export function getScoreColorHex(score: number) {
  if (score >= 90) return "#c084fc"; // purple-400
  if (score >= 75) return "#34d399"; // emerald-400
  if (score >= 60) return "#fbbf24"; // amber-400
  return "#9ca3af"; // muted-foreground
}
