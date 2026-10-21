"""Convert the spec .docx files to GitHub-readable Markdown (stdlib only).

Usage: python3 -I scripts/docx-to-md.py <in.docx> <out.md>
Headings come from Word paragraph styles; tables become Markdown tables.
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def text_of(el):
    parts = []
    for node in el.iter():
        if node.tag == W + "t" and node.text:
            parts.append(node.text)
        elif node.tag == W + "tab":
            parts.append(" ")
        elif node.tag in (W + "br", W + "cr"):
            parts.append(" ")
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def style_of(p):
    ppr = p.find(W + "pPr")
    if ppr is None:
        return ""
    st = ppr.find(W + "pStyle")
    return st.get(W + "val", "") if st is not None else ""


def is_list(p):
    ppr = p.find(W + "pPr")
    return ppr is not None and ppr.find(W + "numPr") is not None


def table_md(tbl):
    rows = []
    for tr in tbl.findall(W + "tr"):
        cells = [text_of(tc).replace("|", "\\|") for tc in tr.findall(W + "tc")]
        rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    out += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join(out)


def convert(src, dst):
    with zipfile.ZipFile(src) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    lines = []
    for el in body:
        if el.tag == W + "tbl":
            lines += ["", table_md(el), ""]
            continue
        if el.tag != W + "p":
            continue
        t = text_of(el)
        if not t:
            continue
        st = style_of(el).lower()
        if st in ("title",):
            lines += ["", f"# {t}", ""]
        elif st.startswith("heading") and st[-1:].isdigit():
            level = min(int(st[-1]) + 1, 6)
            lines += ["", "#" * level + " " + t, ""]
        elif st in ("subtitle",):
            lines += [f"*{t}*", ""]
        elif is_list(el) or st.startswith("list"):
            lines.append(f"- {t}")
        else:
            lines += [t, ""]
    md = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip() + "\n"
    with open(dst, "w", encoding="utf-8") as f:
        f.write(md)


if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])
