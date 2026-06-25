import os
import glob
import subprocess
import argparse
import sys
import ast
import hashlib
import json

QUALITY = [
    ("qhd", "-qp", "1440p60"),
    ("fhd", "-qh", "1080p60"),
    ("hd",  "-qm", "720p30"),
    (None,  "-ql", "480p15"),
]

def parse_script_scenes(script_path):
    """Returns (scene_order, current_hashes) where scene_order preserves declaration order.
    Raises on parse failure."""
    with open(script_path, "r", encoding="utf-8") as f:
        source = f.read()
    tree = ast.parse(source)

    scene_nodes: dict[str, ast.ClassDef] = {}
    global_parts: list[ast.stmt] = []
    for node in tree.body:
        is_scene = isinstance(node, ast.ClassDef) and any(
            "Scene" in (b.id if isinstance(b, ast.Name) else b.attr)
            for b in node.bases if isinstance(b, (ast.Name, ast.Attribute))
        )
        if is_scene:
            scene_nodes[node.name] = node
        else:
            global_parts.append(node)
    global_text = "".join(ast.get_source_segment(source, n) or "" for n in global_parts)

    hashes = {
        name: hashlib.md5((global_text + (ast.get_source_segment(source, n) or "")).encode()).hexdigest()
        for name, n in scene_nodes.items()
    }
    return list(scene_nodes.keys()), hashes

def get_smart_scenes_to_render(current_hashes, video_dir):
    """Returns (scenes_to_render, stale_scene_names) given the current hashes."""
    hash_file = os.path.join(video_dir, ".scene_hashes.json")
    old_hashes: dict[str, str] = {}
    if os.path.exists(hash_file):
        try:
            with open(hash_file) as f:
                old_hashes = json.load(f)
        except Exception:
            pass

    stale = [n for n in old_hashes if n not in current_hashes] if old_hashes else []
    needs_render = [
        n for n in current_hashes
        if old_hashes.get(n) != current_hashes[n]
        or not os.path.exists(os.path.join(video_dir, f"{n}.mp4"))
    ]
    return needs_render, stale

def export_video(args):
    if not os.path.exists(args.script_path):
        print(f"❌ Script '{args.script_path}' does not exist.")
        return

    quality_flag, resolution = next(
        (flag, folder) for opt, flag, folder in QUALITY
        if opt is None or getattr(args, opt)
    )
    script_name = os.path.splitext(os.path.basename(args.script_path))[0]
    script_dir = os.path.dirname(os.path.abspath(args.script_path)) or "."
    media_dir = script_dir
    video_dir = os.path.join(media_dir, "videos", script_name, resolution)

    scenes = args.scenes
    hashes = None
    stale: list[str] = []
    scene_order: list[str] = []

    if not scenes and not args.force:
        print("🧠 Analyzing script for code changes...")
        try:
            scene_order, hashes = parse_script_scenes(args.script_path)
        except Exception as e:
            print(f"⚠️ AST parsing failed ({e}). Falling back to alphabetical stitching.")
            scene_order, hashes = [], None

        if hashes is not None:
            smart, stale = get_smart_scenes_to_render(hashes, video_dir)
            scenes = smart
            if not scenes:
                print("✨ All scenes are up to date! Skipping Manim render.")
            else:
                print(f"🔄 Changes detected in: {', '.join(scenes)}")

    if scenes or args.force or hashes is None:
        os.makedirs(video_dir, exist_ok=True)
        manim_targets = scenes if scenes else ["-a"]
        print(f"🎬 Running Manim on '{args.script_path}' at {resolution}...")
        try:
            env = os.environ.copy()
            # This backup script is in .agents/skills/manim/scripts/export.py, so we go up 4 levels to get the project root.
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            if "PYTHONPATH" in env:
                env["PYTHONPATH"] = f"{project_root}{os.pathsep}{env['PYTHONPATH']}"
            else:
                env["PYTHONPATH"] = project_root

            runner_script = os.path.join(script_dir, ".manim_patch_runner.py")
            patch_code = """
import sys
import itertools
import logging
from manim import Scene, Text, MathTex, Tex

original_tear_down = Scene.tear_down

def check_bounds(self):
    from manim import config
    w = config.frame_width / 2
    h = config.frame_height / 2
    for m in self.mobjects:
        try:
            if m.get_top()[1] > h:
                logging.warning(f"Out of bounds (TOP): {m}")
            if m.get_bottom()[1] < -h:
                logging.warning(f"Out of bounds (BOTTOM): {m}")
            if m.get_right()[0] > w:
                logging.warning(f"Out of bounds (RIGHT): {m}")
            if m.get_left()[0] < -w:
                logging.warning(f"Out of bounds (LEFT): {m}")
        except Exception:
            pass

def check_overlaps(self):
    def get_text_mobjects(mobj):
        text_mobs = []
        if isinstance(mobj, (Text, MathTex, Tex)):
            text_mobs.append(mobj)
        else:
            for sub in mobj.submobjects:
                text_mobs.extend(get_text_mobjects(sub))
        return text_mobs
    
    all_text = []
    for m in self.mobjects:
        all_text.extend(get_text_mobjects(m))
        
    for m1, m2 in itertools.combinations(all_text, 2):
        if m1 is m2: continue
        m1_l, m1_r = m1.get_left()[0], m1.get_right()[0]
        m1_b, m1_t = m1.get_bottom()[1], m1.get_top()[1]
        m2_l, m2_r = m2.get_left()[0], m2.get_right()[0]
        m2_b, m2_t = m2.get_bottom()[1], m2.get_top()[1]
        
        if not (m1_r < m2_l or m1_l > m2_r or m1_t < m2_b or m1_b > m2_t):
            if m1.get_fill_opacity() > 0 and m2.get_fill_opacity() > 0:
                logging.warning(f"Overlap detected between Text/MathTex objects: '{m1}' and '{m2}'")

def new_tear_down(self):
    check_bounds(self)
    check_overlaps(self)
    original_tear_down(self)

Scene.tear_down = new_tear_down

from manim.__main__ import main
sys.exit(main())
"""
            with open(runner_script, "w") as f:
                f.write(patch_code.strip())

            subprocess.run(
                [
                    "uv", "run", "python", runner_script, quality_flag,
                    "--media_dir", media_dir,
                    args.script_path, *manim_targets,
                ],
                env=env,
                check=True,
            )
        except subprocess.CalledProcessError:
            print("\n❌ Manim failed. Check output above.")
            return
        except FileNotFoundError:
            print("\n❌ Could not run 'uv' or 'manim'. Are they installed?")
            return
        finally:
            if 'runner_script' in locals() and os.path.exists(runner_script):
                os.remove(runner_script)

        if hashes is not None:
            with open(os.path.join(video_dir, ".scene_hashes.json"), "w") as f:
                json.dump(hashes, f)
            if stale:
                print(f"🧹 Removed {len(stale)} scene(s) no longer in the script from hash cache.")

    output_file = args.output or os.path.join(media_dir, f"final_{resolution}.mp4")
    output_abs = os.path.abspath(output_file)
    if scene_order:
        # Stitch in declaration order so Scene10 follows Scene9, not alphabetical order.
        mp4_files = []
        for name in scene_order:
            path = os.path.join(video_dir, f"{name}.mp4")
            if os.path.exists(path) and os.path.abspath(path) != output_abs:
                mp4_files.append(path)
    else:
        mp4_files = sorted(
            f for f in glob.glob(os.path.join(video_dir, "*.mp4"))
            if "partial_movie_files" not in f and os.path.abspath(f) != output_abs
        )

    if not mp4_files:
        print(f"\n❌ No .mp4 scenes in {video_dir} to stitch.")
        return

    concat_file = "concat_temp.txt"
    try:
        with open(concat_file, "w") as f:
            for mp4 in mp4_files:
                f.write(f"file '{os.path.abspath(mp4).replace(os.sep, '/')}'\n")

        print(f"\n🧵 Stitching {len(mp4_files)} scenes into '{output_file}'...")
        result = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file, "-c", "copy", output_file],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"❌ ffmpeg error:\n{result.stderr}")
            return

        print(f"✅ Final video: {output_abs}")
        if args.preview:
            if sys.platform == "darwin":
                subprocess.run(["open", output_file])
            elif sys.platform == "win32":
                os.startfile(output_file)  # type: ignore[attr-defined]
            else:
                subprocess.run(["xdg-open", output_file])
    finally:
        if os.path.exists(concat_file):
            os.remove(concat_file)

def parse_args():
    parser = argparse.ArgumentParser(
        description="Render Manim scenes and stitch them into a final video.",
        epilog=(
            "Examples:\n"
            "  uv run export_video.py test/script.py              # Smart-render (480p) & stitch\n"
            "  uv run export_video.py test/script.py --fhd -p     # 1080p, stitch & auto-play\n"
            "  uv run export_video.py test/script.py Scene1 --hd  # Render specific scenes\n"
            "  uv run export_video.py test/script.py --force      # Force re-render all scenes"
        ),
    )
    parser.add_argument("script_path", help="Manim script (e.g., test/script.py)")
    parser.add_argument("scenes", nargs="*", help="Specific scene classes. Omit for smart detection.")
    for opt, _, folder in QUALITY:
        if opt:
            parser.add_argument(f"--{opt}", action="store_true", help=f"Use {folder}")
    parser.add_argument("-p", "--preview", action="store_true", help="Open final video when done")
    parser.add_argument("--force", action="store_true", help="Force re-render all scenes")
    parser.add_argument("-o", "--output", default=None, help="Output file (default: final_<resolution>.mp4)")
    return parser.parse_args()

if __name__ == "__main__":
    export_video(parse_args())