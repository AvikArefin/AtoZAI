# ruff: noqa: F403, F405
from manim import *
from atozai import SafeScene


class EmbeddingExplanation(SafeScene):
    def construct(self):
        self.scene_1_one_hot()
        self.scene_2_matrix()
        self.scene_3_shallow_nn()
        self.scene_4_positional()
        self.scene_5_attention()

    def scene_1_one_hot(self):
        left_group = VGroup(
            Text("1. One-Hot to Dense", font_size=36, weight=BOLD),
            Tex(r"• Word: ``cat''", font_size=28),
            Tex(r"• Vocab Size ($V$): e.g., $10,000$", font_size=28),
            Tex(r"• One-Hot: $[0, \dots, 1, \dots, 0]^T$", font_size=28),
            Tex(r"• Projection into $D$ dimensions", font_size=28),
            Tex(r"• Dense Vector: $[0.12, 0.81, \dots]^T$", font_size=28),
            Tex(r"$\Rightarrow$ Trained weights = Lookup Table", font_size=28),
        ).arrange(DOWN, aligned_edge=LEFT)

        # Visual for Right Group
        one_hot = Matrix([["0"], [r"\vdots"], ["1"], [r"\vdots"], ["0"]]).scale(0.6)
        arrow = Arrow(LEFT, RIGHT)
        dense = Matrix([["0.12"], ["0.81"], ["-0.45"], [r"\vdots"], ["0.99"]]).scale(
            0.6
        )

        label_sparse = Text("Sparse (V)", font_size=24)
        label_dense = Text("Dense (D)", font_size=24)

        visuals = VGroup(one_hot, arrow, dense).arrange(RIGHT, buff=0.5)
        label_sparse.next_to(one_hot, UP)
        label_dense.next_to(dense, UP)

        right_group = VGroup(visuals, label_sparse, label_dense)

        main_group = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)

        self.play(FadeIn(left_group[0:3]))
        self.play(FadeIn(one_hot), FadeIn(label_sparse))
        self.play(FadeIn(left_group[3]))
        self.play(GrowArrow(arrow))
        self.play(FadeIn(left_group[4]))
        self.play(FadeIn(dense), FadeIn(label_dense))
        self.play(FadeIn(left_group[5:]))

        self.wait(2)
        self.play(FadeOut(main_group))

    def scene_2_matrix(self):
        left_group = VGroup(
            Text("2. The Embedding Matrix", font_size=36, weight=BOLD),
            Tex(r"• Sentence: ``The cat sat on a mat''", font_size=28),
            Tex(r"• Tokenized: $[791, 8415, 7731, 389, 264, 5634]$", font_size=28),
            Tex(r"• Each token pulls its dense vector", font_size=28),
            Tex(r"• Forms an $N \times D$ Matrix", font_size=28),
            Tex(r"• $N$: Sequence Length ($6$)", font_size=28),
            Tex(r"• $D$: Embedding Dimension", font_size=28),
        ).arrange(DOWN, aligned_edge=LEFT)

        tokens = Text("[791, 8415, 7731, 389, 264, 5634]", font_size=24)
        arrow = Arrow(UP, DOWN)
        matrix_data = [[f"v_{i}{j}" for j in range(3)] + [r"\dots"] for i in range(6)]
        mat = Matrix(matrix_data).scale(0.5)

        right_group = VGroup(tokens, arrow, mat).arrange(DOWN, buff=0.5)

        main_group = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)

        self.play(FadeIn(left_group[:3]))
        self.play(FadeIn(tokens))
        self.play(GrowArrow(arrow), FadeIn(left_group[3]))
        self.play(FadeIn(mat), FadeIn(left_group[4:]))

        self.wait(2)
        self.play(FadeOut(main_group))

    def scene_3_shallow_nn(self):
        left_group = VGroup(
            Text("3. Shallow NN vs Word2Vec", font_size=36, weight=BOLD),
            Tex(r"• Word2Vec trained separately", font_size=28),
            Tex(r"• Transformer embeds via end-to-end trained NN", font_size=28),
            Tex(r"• Input Layer: $V$ neurons (One-hot)", font_size=28),
            Tex(r"• Hidden Layer: $D$ neurons (Dense)", font_size=28),
            Tex(r"• Output Layer (Decoder): $D \rightarrow V$ neurons", font_size=28),
            Tex(r"• Yields probability over vocabulary", font_size=28),
        ).arrange(DOWN, aligned_edge=LEFT)

        v_layer = VGroup(
            *[Circle(radius=0.1, color=BLUE, fill_opacity=1) for _ in range(5)]
        ).arrange(DOWN, buff=0.2)
        d_layer = VGroup(
            *[Circle(radius=0.1, color=GREEN, fill_opacity=1) for _ in range(3)]
        ).arrange(DOWN, buff=0.2)
        out_layer = VGroup(
            *[Circle(radius=0.1, color=RED, fill_opacity=1) for _ in range(5)]
        ).arrange(DOWN, buff=0.2)

        nn_group = VGroup(v_layer, d_layer, out_layer).arrange(RIGHT, buff=1.5)

        v_label = Text("Input (V)", font_size=20).next_to(v_layer, UP)
        d_label = Text("Embed (D)", font_size=20).next_to(d_layer, UP)
        out_label = Text("Output (V)", font_size=20).next_to(out_layer, UP)

        lines1 = VGroup(
            *[
                Line(v.get_right(), d.get_left(), stroke_width=1, stroke_opacity=0.5)
                for v in v_layer
                for d in d_layer
            ]
        )
        lines2 = VGroup(
            *[
                Line(d.get_right(), o.get_left(), stroke_width=1, stroke_opacity=0.5)
                for d in d_layer
                for o in out_layer
            ]
        )

        right_group = VGroup(nn_group, v_label, d_label, out_label, lines1, lines2)

        main_group = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)

        self.play(FadeIn(left_group[:2]))
        self.play(
            FadeIn(left_group[2:5]),
            FadeIn(v_layer, v_label),
            FadeIn(d_layer, d_label),
            Create(lines1),
        )
        self.play(FadeIn(left_group[5:]), FadeIn(out_layer, out_label), Create(lines2))

        self.wait(2)
        self.play(FadeOut(main_group))

    def scene_4_positional(self):
        left_group = VGroup(
            Text("4. Positional Encoding", font_size=36, weight=BOLD),
            Tex(r"• Transformers process tokens in parallel", font_size=28),
            Tex(r"• No recurrent sequential state", font_size=28),
            Tex(r"• Must inject positional context explicitly", font_size=28),
            Tex(r"• Operation: $E_{word} + E_{position}$", font_size=28),
            Tex(r"• Element-wise addition", font_size=28),
            Tex(r"• Matrix shape ($N \times D$) remains identical", font_size=28),
        ).arrange(DOWN, aligned_edge=LEFT)

        mat_w = Matrix([["E_{w1}"], ["E_{w2}"], [r"\vdots"]]).scale(0.6)
        plus = MathTex("+")
        mat_p = Matrix([["P_1"], ["P_2"], [r"\vdots"]]).scale(0.6)
        equals = MathTex("=")
        mat_out = Matrix([["E_{w1}+P_1"], ["E_{w2}+P_2"], [r"\vdots"]]).scale(0.6)

        right_group = VGroup(mat_w, plus, mat_p, equals, mat_out).arrange(
            RIGHT, buff=0.3
        )

        main_group = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)

        self.play(FadeIn(left_group[:3]))
        self.play(FadeIn(mat_w))
        self.play(FadeIn(left_group[3:5]), FadeIn(plus), FadeIn(mat_p))
        self.play(FadeIn(equals), FadeIn(mat_out), FadeIn(left_group[5:]))

        self.wait(2)
        self.play(FadeOut(main_group))

    def scene_5_attention(self):
        left_group = VGroup(
            Text("5. Self-Attention", font_size=36, weight=BOLD),
            Tex(r"• Static embeddings only give dictionary meaning", font_size=28),
            Tex(r"• E.g., ``bank'' (river) vs ``bank'' (money)", font_size=28),
            Tex(r"• Attention Mechanism allows contextualization", font_size=28),
            Tex(r"• Matrix values update based on surrounding tokens", font_size=28),
            Tex(r"• Yields fully contextualized representations", font_size=28),
        ).arrange(DOWN, aligned_edge=LEFT)

        mat_in = Matrix([[r"E_1"], [r"E_2"], [r"E_3"]]).scale(0.6)
        attn_box = Rectangle(width=2, height=3, color=YELLOW)
        attn_text = Text("Self\nAttention", font_size=24).move_to(attn_box)
        attn = VGroup(attn_box, attn_text)
        mat_out = Matrix([[r"C_1"], [r"C_2"], [r"C_3"]]).scale(0.6)
        
        VGroup(mat_in, attn, mat_out).arrange(RIGHT, buff=1.0)
        
        arrow1 = Arrow(mat_in.get_right(), attn.get_left(), buff=0.1)
        arrow2 = Arrow(attn.get_right(), mat_out.get_left(), buff=0.1)
        
        right_group = VGroup(mat_in, arrow1, attn, arrow2, mat_out)

        main_group = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)

        self.play(FadeIn(left_group[:3]))
        self.play(FadeIn(mat_in))
        self.play(FadeIn(left_group[3]), GrowArrow(arrow1), FadeIn(attn))
        self.play(FadeIn(left_group[4:]), GrowArrow(arrow2), FadeIn(mat_out))

        self.wait(2)
        self.play(FadeOut(main_group))
