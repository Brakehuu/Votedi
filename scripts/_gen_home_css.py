"""Generate src/app/home.css from mockup styles, scoped under .home."""
from pathlib import Path
import re

raw = Path("scripts/_home-mockup-style.css").read_text(encoding="utf-8")

# Keep from /* hero */ onward (skip :root/reset/header)
idx = raw.find("/* hero */")
raw = raw[idx:]

# Drop site-wide reduced-motion (too aggressive)
raw = re.sub(
    r"@media\s*\(prefers-reduced-motion:reduce\)\s*\{[^{}]*\{[^{}]*\}[^{}]*\}",
    "",
    raw,
)

# Drop mockup footer chrome (site uses SiteFooter); keep .fin / .mbar
raw = re.sub(r"footer\s*\{[^}]*\}", "", raw)
raw = re.sub(r"footer\s*>\s*[^{]+\{[^}]*\}", "", raw)
raw = re.sub(r"footer\s+[^{,{]+\{[^}]*\}", "", raw)
raw = re.sub(r"\.copy\s*\{[^}]*\}", "", raw)

# Strip comments so they never become part of a selector
raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)

# Drop mockup reveal (we define our own scoped to .home)
raw = re.sub(r"html\.js\s*\.rv\s*\{[^}]*\}", "", raw)
raw = re.sub(r"html\.js\s*\.rv\.in\s*\{[^}]*\}", "", raw)

SKIP_SELECTORS = {
    ".top",
    ".bar",
    ".brand",
    ".links",
    ".dd",
    ".nav-cta",
    ".menu-btn",
    ".sheet",
    ".sheet-top",
    ".sheet.open",
    ".x",
    ".mesh",
    ".wrap",
    ".glass",
    "body",
    "html",
    "*",
    "svg",
    "button",
    "a",
    "img",
    ":focus-visible",
    ":root",
}


def should_skip(sel: str) -> bool:
    s = sel.strip()
    if not s:
        return True
    for skip in SKIP_SELECTORS:
        if s == skip or s.startswith(skip + " ") or s.startswith(skip + ">") or s.startswith(skip + ":"):
            return True
        if s.startswith(skip + ".") or s.startswith(skip + "["):
            return True
    # header dropdown pieces
    if s.startswith(".dd") or s.startswith(".links") or s.startswith(".brand") or s.startswith(".sheet"):
        return True
    if s.startswith(".menu-btn") or s.startswith(".nav-cta") or s.startswith(".top") or s.startswith(".bar"):
        return True
    if s.startswith(".mesh"):
        return True
    return False


def prefix_selector(sel: str) -> str | None:
    s = sel.strip()
    if should_skip(s):
        return None
    if s.startswith("@") or s.startswith("from") or s.startswith("to") or s.endswith("%"):
        return s
    if s.startswith("html.js"):
        # html.js .rv -> html.js .home .rv
        rest = s[len("html.js") :].strip()
        if rest.startswith(".home"):
            return s
        return f"html.js .home {rest}"
    if s.startswith(".home"):
        return s
    if s.startswith("h1") or s.startswith("h2") or s.startswith("h3"):
        return f".home {s}"
    return f".home {s}"


def find_matching_brace(text: str, open_idx: int) -> int:
    depth = 0
    i = open_idx
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def transform(block: str) -> str:
    out: list[str] = []
    i = 0
    n = len(block)
    while i < n:
        while i < n and block[i].isspace():
            i += 1
        if i >= n:
            break

        if block.startswith("@keyframes", i) or block.startswith("@media", i):
            brace = block.find("{", i)
            end = find_matching_brace(block, brace)
            header = block[i:brace].strip()
            inner = block[brace + 1 : end]
            if header.startswith("@media"):
                transformed = transform(inner).strip()
                if transformed:
                    out.append(f"{header} {{\n{transformed}\n}}\n")
            else:
                out.append(block[i : end + 1] + "\n")
            i = end + 1
            continue

        brace = block.find("{", i)
        if brace == -1:
            break
        head = block[i:brace].strip()
        end = find_matching_brace(block, brace)
        body = block[brace + 1 : end].strip()
        sels = []
        for part in head.split(","):
            p = prefix_selector(part)
            if p:
                sels.append(p)
        if sels:
            out.append(f"{', '.join(sels)} {{{body}}}\n")
        i = end + 1
    return "".join(out)


vars_block = """/* Vote Đi home v5 — scoped under .home */
.home {
  --ink: #0c1b20;
  --text: #1e3238;
  --muted: #3f5358;
  --line: #d8e6e6;
  --jade: #0ea5a4;
  --jade-d: #096965;
  --sea: #0891b2;
  --soft: #e3f6f5;
  --warn: #f5a524;
  --grad: linear-gradient(135deg, #19c9a7 0%, #0ea5a4 45%, #0891b2 100%);
  --shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 24px 60px -28px rgba(8, 80, 90, 0.32),
    0 2px 6px -2px rgba(8, 80, 90, 0.08);
}
html.js .home .rv.in {
  animation: home-rv 0.6s ease both;
}
@media (prefers-reduced-motion: reduce) {
  html.js .home .rv.in { animation: none; }
}
@keyframes home-rv {
  from { opacity: 0.001; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
}
.home .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 50px;
  padding: 0 24px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 15.5px;
  white-space: nowrap;
  transition: transform 0.15s, filter 0.15s;
  min-height: 44px;
}
.home .btn:active {
  transform: scale(0.97);
}
.home .btn-p {
  color: #fff;
  background: var(--grad);
  box-shadow: 0 0 0 4px rgba(14, 165, 164, 0.14), 0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 12px 26px -12px rgba(8, 145, 178, 0.75);
}
.home .btn-p:hover {
  filter: brightness(1.07);
}
.home .btn-g {
  background: #fff;
  border: 1.5px solid #c5d6d6;
}
.home .btn-sm {
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
}
.home .chip {
  position: static;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--jade-d);
  background: var(--soft);
  z-index: auto;
  margin: 0;
}
.home .chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
.home .glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: var(--shadow);
}
.home .ico {
  stroke: currentColor;
  fill: none;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.home .tee {
  fill: currentColor;
  stroke: rgba(12, 27, 32, 0.16);
  stroke-width: 2;
  filter: drop-shadow(0 10px 10px rgba(12, 27, 32, 0.16));
}
.home .av {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  border: 2px solid #fff;
  margin-left: -7px;
  flex-shrink: 0;
}
.home .stack {
  display: flex;
}
.home .stack .av:first-child {
  margin-left: 0;
}
.home .marquee:hover .track {
  animation-play-state: paused;
}
.home .player iframe,
.home .player video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.home .player.playing .poster {
  display: none;
}
.home .sec-h .chip-row {
  margin-bottom: 14px;
}
.home .mbar {
  display: none;
}
"""

extra = """
@media (prefers-reduced-motion: reduce) {
  .home .track {
    animation: none !important;
  }
  html.js .home .rv.in {
    animation: none !important;
  }
}
@media (max-width: 640px) {
  .home .mbar {
    display: flex;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    z-index: 40;
    padding: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid var(--line);
    box-shadow: 0 16px 40px -16px rgba(8, 80, 90, 0.45);
    transform: translateY(160%);
    transition: transform 0.3s;
  }
  .home .mbar.show {
    transform: none;
  }
  .home .mbar .btn {
    flex: 1;
    height: 50px;
    min-height: 44px;
  }
  .home .tabs button span {
    display: none;
  }
  .home .tabs button.on span {
    display: inline;
  }
  .home .cat li:nth-child(3) {
    display: none;
  }
}
"""

prefixed = transform(raw)
# Ensure brace balance
assert prefixed.count("{") == prefixed.count("}"), (
    prefixed.count("{"),
    prefixed.count("}"),
)

out = vars_block + "\n" + prefixed + extra
Path("src/app/home.css").write_text(out, encoding="utf-8")
print("ok", Path("src/app/home.css").stat().st_size, "braces", out.count("{"), out.count("}"))
