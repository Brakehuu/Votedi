from pathlib import Path
import re

p = Path("docs/votedi-home-v5.html")
t = p.read_text(encoding="utf-8")
t2 = re.sub(r"data:image[^\"')\s]+", "[IMG]", t)
m = re.search(r"<style>(.*?)</style>", t2, re.S)
style = m.group(1) if m else ""
Path("scripts/_home-mockup-style.css").write_text(style, encoding="utf-8")
body = re.search(r"<body[^>]*>(.*?)</body>", t2, re.S)
b = body.group(1) if body else ""
b2 = re.sub(r"<script[\s\S]*?</script>", "<!--SCRIPT-->", b)
Path("scripts/_home-mockup-body.html").write_text(b2, encoding="utf-8")
print("style", len(style), "body", len(b2))
