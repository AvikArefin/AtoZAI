import itertools
import logging

from manim import MathTex, Mobject, Scene, Tex, Text, VGroup


def check_bounds(mobjects):
    from manim import config

    w = config.frame_width / 2
    h = config.frame_height / 2
    for m in mobjects:
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


def check_overlaps(mobjects, _seen=None):
    def is_text_mobject(mobj):
        return isinstance(mobj, (Text, MathTex, Tex))

    def get_all_leaves(mobj):
        if not mobj.submobjects:
            return [mobj]
        leaves = []
        for sub in mobj.submobjects:
            leaves.extend(get_all_leaves(sub))
        return leaves

    def flatten(roots, predicate):
        """Yield mobjects from `roots` that satisfy `predicate`. Recurses into
        containers (VGroup) so e.g. a VGroup of four Texts is treated as four
        separate text roots, not as one VGroup root. Stops at leaves (mobjects
        with no children), which are then classified by `predicate`."""
        results = []
        stack = list(roots)
        while stack:
            m = stack.pop()
            if isinstance(m, VGroup) and m.submobjects:
                stack.extend(m.submobjects)
            elif predicate(m):
                results.append(m)
        return results

    def bbox(leaf):
        """Cache (left_x, right_x, bottom_y, top_y) per mobject.

        Manim's get_left/get_right/etc. are surprisingly expensive (each walks
        the mobject's point array). With thousands of leaf pairs across many
        snapshots, calling them once per pair dominates runtime."""
        cached = getattr(leaf, "_atozai_bbox", None)
        if cached is not None:
            return cached
        try:
            cached = (
                leaf.get_left()[0],
                leaf.get_right()[0],
                leaf.get_bottom()[1],
                leaf.get_top()[1],
            )
        except Exception:
            cached = (0.0, 0.0, 0.0, 0.0)
        try:
            leaf._atozai_bbox = cached  # type: ignore[attr-defined]
        except Exception:
            pass
        return cached

    text_roots = flatten(mobjects, is_text_mobject)
    other_roots = flatten(mobjects, lambda m: not is_text_mobject(m))

    def expand(roots):
        leaves = []
        for root in roots:
            leaves.extend(get_all_leaves(root))
        return leaves

    text_leaves = expand(text_roots)
    other_leaves = expand(other_roots)

    # Map each leaf back to its root so warning messages identify the parent Text.
    leaf_to_root = {}
    for root in text_roots + other_roots:
        for leaf in get_all_leaves(root):
            leaf_to_root[id(leaf)] = root

    pairs = list(itertools.combinations(text_leaves, 2))
    pairs += list(itertools.product(text_leaves, other_leaves))

    # When _seen is provided (per-scene dict), record overlapping pairs into
    # it and DON'T emit warnings here — the caller (SafeScene.tear_down) will
    # emit ONE warning per unique pair at the end, with snapshot counts.
    # When _seen is None (standalone usage without a SafeScene context),
    # emit one warning per overlapping pair as we find them.
    for leaf1, leaf2 in pairs:
        if leaf1 is leaf2:
            continue
        m1_l, m1_r, m1_b, m1_t = bbox(leaf1)
        m2_l, m2_r, m2_b, m2_t = bbox(leaf2)
        if m1_r < m2_l or m1_l > m2_r or m1_t < m2_b or m1_b > m2_t:
            continue
        try:
            op1, op2 = leaf1.get_fill_opacity(), leaf2.get_fill_opacity()
        except Exception:
            continue
        if op1 <= 0 or op2 <= 0:
            continue
        root1 = leaf_to_root.get(id(leaf1), leaf1)
        root2 = leaf_to_root.get(id(leaf2), leaf2)
        # Skip a Text overlapping itself (its multiple internal leaves all
        # share the same root).
        if root1 is root2:
            continue
        if _seen is not None:
            # Key by (id(root1), id(root2)) when both roots are still alive at
            # tear_down time. To handle Transform-replaced mobjects (where the
            # original id is no longer reachable but its submobjects are), we
            # also store (root1, root2) refs themselves so the warning can still
            # be emitted with informative repr.
            key = (id(root1), id(root2))
            existing = _seen.get(key)
            if existing is None:
                _seen[key] = [1, root1, root2]
            else:
                existing[0] += 1
        else:
            logging.warning(
                f"Overlap detected between Text/MathTex objects: {root1!r} and {root2!r}"
            )


class SafeScene(Scene):
    """A Manim Scene subclass that warns about out-of-bounds and overlapping text mobjects."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._mobject_snapshots: list[list[Mobject]] = []
        # Tracks overlapping pairs across snapshots so we emit one warning per
        # unique pair instead of N (one per snapshot). Maps (id(root1), id(root2))
        # -> [count, root1, root2] — keeping the root refs lets us emit the
        # warning at tear_down even if the original mobjects have been replaced
        # by Transform animations later in the scene.
        self._atozai_overlap_seen: dict[tuple[int, int], list] = {}

    def play(
        self,
        *args,
        subcaption=None,
        subcaption_duration=None,
        subcaption_offset=0,
        **kwargs,
    ):
        super().play(
            *args,
            subcaption=subcaption,
            subcaption_duration=subcaption_duration,
            subcaption_offset=subcaption_offset,
            **kwargs,
        )
        self._mobject_snapshots.append(list(self.mobjects))

    def tear_down(self):
        snapshots = list(self._mobject_snapshots)
        if self.mobjects:
            snapshots.append(self.mobjects)
        for snap in snapshots:
            check_bounds(snap)
            check_overlaps(snap, _seen=self._atozai_overlap_seen)
        # Emit ONE warning per unique overlapping pair, with snapshot count.
        # check_overlaps stores [count, root1, root2] for each pair — the root
        # refs are kept alive by _mobject_snapshots even if Transform replaces
        # the underlying Text instances mid-scene.
        if self._atozai_overlap_seen:
            for (id1, id2), (count, root1, root2) in sorted(
                self._atozai_overlap_seen.items(), key=lambda kv: (-kv[1][0], kv[0])
            ):
                suffix = f" ({count} snapshots)" if count > 1 else ""
                logging.warning(
                    f"Overlap detected between Text/MathTex objects: {root1!r} and {root2!r}{suffix}"
                )
        super().tear_down()
