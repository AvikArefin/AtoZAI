"""Fast overlap/bounds check for Manim scenes using SafeScene.

Imports a user script, instantiates each SafeScene subclass, runs
construct() then tear_down(), and prints any overlap/out-of-bounds warnings
emitted by atozai.scene. Does no video rendering — runs in seconds.

Usage:
    uv run check.py path/to/script.py                 # check every scene
    uv run check.py path/to/script.py Scene1 Scene2   # check specific scenes
    uv run check.py path/to/script.py --list          # just list scenes
"""

import argparse
import importlib.util
import inspect
import logging
import sys
import tempfile
from pathlib import Path
from typing import Any

# Manim imports — kept here so they're available for type annotations on the
# patched functions. The actual Manim usage happens inside main() / check_scene().
from manim import Mobject, Scene
from manim.animation.animation import Animation
from manim.mobject.mobject import _AnimationBuilder


def _capture_handler(scene_name: str):
    """Return a logging.Handler that buffers records under `scene_name`."""

    class CaptureHandler(logging.Handler):
        def emit(self, record):
            msg = self.format(record)
            _warnings_by_scene.setdefault(scene_name, []).append(msg)

    handler = CaptureHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s  %(message)s"))
    return handler


_warnings_by_scene: dict[str, list[str]] = {}


def _fast_play_internal(self, skip_rendering: bool = False) -> None:  # type: ignore[no-untyped-def]
    """Replacement for Scene.play_internal that skips per-frame rendering.

    Only the bookkeeping needed for SafeScene snapshots is preserved:
    finish() + clean_up_from_scene() for each animation. The per-frame
    update_to_time loop is skipped entirely. We don't call
    update_mobjects(0) because Transform/Transform-based animations rely
    on their target_copy being aligned with the source mobject for the
    final interpolate call, and that alignment is set up by animation.begin()
    in a way that's hard to replicate here. Skipping it is safe — the
    SafeScene snapshot captures the post-cleanup mobject set, which is
    what we actually want to check.
    """
    assert self.animations is not None
    self.duration = self.get_run_time(self.animations)
    if not self.renderer.skip_animations:
        self.update_mobjects(0)
    for animation in self.animations:
        animation.finish()
        animation.clean_up_from_scene(self)


def _fast_renderer_play(  # type: ignore[no-untyped-def]
    self,
    scene: Scene,
    *args: Animation | Mobject | _AnimationBuilder,
    **kwargs: Any,
) -> None:
    """Replacement for CairoRenderer.play that skips file writer work.

    Runs compile_animation_data (so scene.animations is populated) and
    scene.begin_animations (so animation.begin() runs — Transform needs
    this for target_copy and align_data), then calls scene.play_internal
    (which itself is patched to skip per-frame rendering and call
    clean_up_from_scene). Skips: file_writer.add_partial_movie_file,
    begin/end_animation on the file writer, save_static_frame_data, and
    update_skipping_status.
    """
    scene.compile_animation_data(*args, **kwargs)
    scene.begin_animations()
    scene.play_internal()
    self.num_plays += 1


def load_scenes(script_path: Path):
    """Import the user script and return {scene_name: class} for every SafeScene subclass."""
    spec = importlib.util.spec_from_file_location("_user_script", script_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load spec for {script_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["_user_script"] = module
    spec.loader.exec_module(module)

    from atozai import SafeScene
    from manim import Scene

    return {
        name: obj
        for name, obj in inspect.getmembers(module, inspect.isclass)
        if obj.__module__ == module.__name__
        and issubclass(obj, SafeScene)
        and obj is not SafeScene
        and obj is not Scene
    }


def check_scene(name: str, cls) -> int:
    """Instantiate `cls`, run construct() + tear_down(). Returns warning count."""
    handler = _capture_handler(name)
    root = logging.getLogger()
    # Suppress the root logger's existing handlers so SafeScene's warnings don't
    # get printed to stderr twice (once by Manim's logger, once by our capture).
    # We keep our handler attached so records still get buffered into
    # _warnings_by_scene for later display.
    saved_handlers = root.handlers
    saved_disabled = root.disabled
    root.handlers = [handler]
    root.disabled = False
    root.setLevel(logging.WARNING)
    try:
        from manim import config

        # Out-of-bounds checks need real-ish frame dims.
        config.frame_width = 14.222222222222221
        config.frame_height = 8.0

        instance = cls.__new__(cls)
        instance.__init__()
        try:
            instance.construct()
        finally:
            instance.tear_down()
    finally:
        root.handlers = saved_handlers
        root.disabled = saved_disabled
    return len(_warnings_by_scene.get(name, []))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run SafeScene overlap/bounds checks without rendering video.",
        epilog=(
            "Examples:\n"
            "  uv run check.py manim/foo/script.py\n"
            "  uv run check.py manim/foo/script.py Scene1 Scene3"
        ),
    )
    parser.add_argument("script_path", type=Path)
    parser.add_argument(
        "scenes", nargs="*", help="Specific scene classes. Omit for all."
    )
    parser.add_argument("--list", action="store_true", help="List scenes and exit.")
    args = parser.parse_args()

    if not args.script_path.exists():
        print(f"❌ Script '{args.script_path}' does not exist.")
        return 2

    scenes = load_scenes(args.script_path)
    if not scenes:
        print(f"⚠️  No SafeScene subclasses found in '{args.script_path}'.")
        return 0

    if args.list:
        for name in scenes:
            print(name)
        return 0

    targets = args.scenes if args.scenes else list(scenes.keys())
    missing = [n for n in targets if n not in scenes]
    if missing:
        print(f"❌ Unknown scene(s): {', '.join(missing)}")
        print(f"   Available: {', '.join(scenes)}")
        return 2

    # Monkey-patch the renderer and Scene.play_internal once so all play()
    # calls during the check are fast (no per-frame render, no file writer
    # bookkeeping). SafeScene's play override still appends snapshots, so
    # tear_down still sees mid-scene state.
    from manim import Scene
    from manim.renderer.cairo_renderer import CairoRenderer

    # ty flags these as "implicitly shadowing" the originals — that's the
    # whole point of the monkey-patch, so suppress explicitly.
    Scene.play_internal = _fast_play_internal  # ty: ignore[invalid-assignment]
    CairoRenderer.play = _fast_renderer_play  # ty: ignore[invalid-assignment]  # noqa: F821

    # Redirect Manim's media cache (Tex/, texts/, images/, videos/) into a
    # system temp dir so running check.py doesn't drop a `media/` folder in
    # the project root. Text/MathTex construction calls `mkdir` eagerly inside
    # `mobject/text/text_mobject.py:_text2svg` and `utils/tex_file_writing.py:
    # generate_tex_file`, so we have to override config.media_dir BEFORE the
    # first scene instantiates any text. TemporaryDirectory cleans itself up on
    # exit (success, exception, KeyboardInterrupt).
    from manim import config as manim_config

    original_media_dir = manim_config.media_dir
    with tempfile.TemporaryDirectory(prefix="atozai-check-") as tmp_media:
        manim_config.media_dir = tmp_media
        try:
            total = 0
            for name in targets:
                count = check_scene(name, scenes[name])
                msgs = _warnings_by_scene.get(name, [])
                status = "✅ clean" if count == 0 else f"⚠️  {count} warning(s)"
                print(f"{status}  {name}")
                for msg in msgs:
                    print(f"    {msg}")
                total += count

            print()
            print(f"Summary: {total} warning(s) across {len(targets)} scene(s).")
            return 0 if total == 0 else 1
        finally:
            manim_config.media_dir = original_media_dir


if __name__ == "__main__":
    sys.exit(main())
