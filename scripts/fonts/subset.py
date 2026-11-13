"""Builds the UI display fonts (OFL) as small WOFF2 subsets in src/assets/fonts.

Sources are not kept in the repo (Noto Serif SC is ~25 MB). Download them from github.com/google/fonts (ofl/notoserifsc,
ofl/cormorantgaramond) and pass their paths:

  python scripts/fonts/subset.py NotoSerifSC[wght].ttf CormorantGaramond[wght].ttf CormorantGaramond-Italic[wght].ttf

The Chinese face keeps only the characters the UI and captions use; re-run after changing their text.
Requires fonttools and brotli (pip install fonttools brotli).
"""
import pathlib, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'src' / 'assets' / 'fonts'
TEXT_SOURCES = [*sorted((ROOT / 'src' / 'ui').glob('*.tsx')), ROOT / 'src' / 'game' / 'features' / 'route' / 'guide.ts',
                *sorted((ROOT / 'src' / 'game' / 'features' / 'secrets').glob('*.ts*'))]  # side-area captions and memories
LATIN = ''.join(chr(c) for c in range(0x20, 0x7f)) + '·—–’“”…→'


def chinese_text():
    text = ''.join(p.read_text(encoding='utf-8') for p in TEXT_SOURCES)
    cjk = set(re.findall(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]', text))
    return ''.join(sorted(cjk)) + LATIN


def build(source, out, text, weight=None):
    font = TTFont(source)
    if weight is not None:
        font = instancer.instantiateVariableFont(font, {'wght': weight})
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['kern', 'liga', 'palt']
    options.name_IDs = ['*']
    sub = subset.Subsetter(options)
    sub.populate(text=text)
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(out)
    print(out.name, out.stat().st_size, 'bytes', len(text), 'chars')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    sc, display, italic = sys.argv[1:]
    build(sc, OUT / 'lumen-serif-sc.woff2', chinese_text(), weight=600)
    build(display, OUT / 'lumen-display.woff2', LATIN)
    build(italic, OUT / 'lumen-display-italic.woff2', LATIN)
