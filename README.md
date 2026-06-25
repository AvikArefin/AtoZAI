MacOS Installation Steps:

```bash
brew install cairo pkg-config ffmpeg
```

and recommended but not required latex installation:
```bash
curl -sL "https://tinytex.yihui.org/install-bin-unix.sh" | sh
```

```bash
~/Library/TinyTeX/bin/universal-darwin/tlmgr install amsmath babel-english cbfonts-fd cm-super count1to ctex doublestroke dvisvgm everysel fontspec frcursive fundus-calligra gnu-freefont jknapltx latex-bin mathastext microtype multitoc physics preview prelim2e ragged2e relsize rsfs setspace standalone tipa wasy wasysym xcolor xetex xkeyval
```


Install uv: 
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```


From inside the project:
use `uv run <path-to-the-script>.py`


Install ruff and ty globally
```bash
uv tool install ruff ty
```

ask LLM:
To use the SKILL manim to build video based on a document from the /docs folder

You can manually check wherther any texts overlap using

```bash
uv run check.py manim/<name of the project>/script.py
```

You can manually check wherther any texts overlap using

```bash
uv run export.py manim/<name of the project>/script.py
```

you can export in various quality 

```
--qhd
--fhd
--hd

or 480p (default)
```