---
name: manim
description: General skill for developing, formatting, and exporting Manim scenes using project standards.
---

# Manim Development Guidelines

This skill provides the standard operating procedures for generating and rendering Manim scenes in this project.

## Project Management & Conventions
- **Execution**: Always use `uv run <filename>.py` to execute standard scripts. For heavy training scripts, ask for user confirmation first.
- **Dependencies**: Use `uv add <package-name>` to install new packages.
- **Linting & Formatting**: Ensure code quality by running `uv run ruff check && uv run ruff format --check && uv run ty check`. These apply to the `atozai/` package as well as your scene scripts.
- **Typing**: Avoid using the `Any` type.

## Architecture Documentation
- Write all final "architecture" documentation into the `/doc` folder.
- Large systems might require multiple files.
- Keep only the full, cleaned, final architecture as Markdown files in `/doc`. Do not store intermediate versions there.

## Scene Layout & Safety
To prevent text from overflowing off-screen and elements overlapping, all agents must adhere to the following layout principles.
- **Use `SafeScene`**: Always inherit from `SafeScene` (importable as `from atozai import SafeScene`) instead of plain `Scene`. `SafeScene` snapshots `self.mobjects` after every `play()` call and runs bounds + overlap checks on every snapshot during `tear_down`, logging warnings to stderr if anything is out of bounds or if any text object overlaps with any other object (including dots, axes, rectangles, etc.).
- **Verify zero overlap warnings in terminal output**: After rendering a scene, check the terminal output for `Overlap detected between Text/MathTex objects:` and `Out of bounds (...)` lines. **If any warning fires, the scene is not done** — fix the layout (move text, shrink elements, or rearrange) and re-render until the output is warning-free. The rules are:
  - Text/MathTex/Tex must NOT overlap with anything (text, dots, axes, rectangles, etc.)
  - Non-text mobjects (dots, axes, rectangles) CAN overlap with each other freely
  - No mobject may exceed the frame bounds on any side (top/bottom/left/right)
  - When an overlap persists across multiple snapshots, `SafeScene` emits ONE warning per unique pair with a `(N snapshots)` suffix — e.g. `Overlap detected ... Text('FN') and Text('Classification Metrics') (13 snapshots)`. The count tells you how long the overlap lasted, not that there were 13 separate bugs.
- **Use Side-by-Side Layouts**: Avoid continuously stacking elements vertically (e.g., using `DOWN` repeatedly), as this quickly overflows the screen height. Instead, separate content into a `left_group` (for text, formulas) and a `right_group` (for graphs, axes, matrices).
- **Arrange Horizontally**: Use `VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)` to utilize the full horizontal width of the 16:9 canvas.

## Workflow

When creating or modifying a Manim scene, follow this order:

1. **Write the scene** inheriting from `SafeScene` and following the layout rules in [Scene Layout & Safety](#scene-layout--safety)
2. **Run `check.py`** to verify overlap/bounds in seconds (no video rendering) — see [Fast Layout Check](#fast-layout-check-no-video-rendering)
3. **Fix any warnings** flagged by `check.py` — overlap or out-of-bounds errors. Re-run until clean.
4. **Run `export.py`** to render the final video — see [Exporting Manim Scenes](#exporting-manim-scenes).
5. **Re-grep the rendered output** for `Overlap detected` and `Out of bounds` warnings to confirm `SafeScene` agrees the rendered result is clean.

The split between `check.py` (fast, no video) and `export.py` (slow, produces `.mp4`) means you iterate on layout cheaply, then pay for rendering once.

## Exporting Manim Scenes
The skill provides a custom script, located at `export.py` (with a backup in `.agents/skills/manim/scripts/export.py`), to smartly render and stitch Manim scenes together. It automatically detects code changes and only re-renders scenes that have been modified.

### Output Directory Structure
All generated files (including caches, individual scene videos, and the final stitched output) are automatically organized into a root-level `manim/` directory, nested by the script's name (e.g., `manim/<script_name>/`). This keeps your main project structure clean.

### Basic Usage
To export a script containing Manim scenes, run the script from the project root:
```bash
uv run export.py path/to/script.py
```

### Quality and Resolution Flags
- `--qhd`: 1440p 60fps
- `--fhd`: 1080p 60fps
- `--hd`: 720p 30fps
- *(Default, no flag)*: 480p 15fps

### Additional Flags
- `-p` or `--preview`: Automatically open the final stitched video upon completion.
- `--force`: Force re-render of all scenes, bypassing the smart code-change detection.
- `-o <path>` or `--output <path>`: Specify a custom output path for the stitched video.

### Rendering Specific Scenes
If you only want to render specific scenes, pass their class names as arguments:
```bash
uv run export.py path/to/script.py SceneName1 SceneName2 --fhd
```

## Fast Layout Check (no video rendering)
`check.py` runs only the overlap/bounds checks against a script's `SafeScene` classes — no `.mp4`, no ffmpeg, no per-frame rendering. Use it to iterate quickly on layout:
```bash
uv run check.py path/to/script.py                      # check every scene
uv run check.py path/to/script.py Scene1 Scene2        # check specific scenes
uv run check.py path/to/script.py --list               # just list scene names
```
Exit code is non-zero if any scene has warnings — pipe-friendly for CI / pre-commit. Typical runtime: 1–3 seconds per scene.
