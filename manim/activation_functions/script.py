# ruff: noqa: F403, F405
from manim import *
from atozai import SafeScene
import math


class IntroScene(SafeScene):
    def construct(self):
        title = Text("Activation Functions", font_size=60)
        self.play(Write(title))
        self.wait(1)

        subtitle1 = Text("What are they?", font_size=36, color=BLUE)
        subtitle2 = Text("Why do we need them?", font_size=36, color=YELLOW)
        subtitle_group = VGroup(subtitle1, subtitle2).arrange(DOWN, buff=0.5)

        self.play(title.animate.to_edge(UP))
        self.play(FadeIn(subtitle_group))
        self.wait(2)

        self.play(FadeOut(title), FadeOut(subtitle_group))


class SigmoidScene(SafeScene):
    def construct(self):
        title = Text("1. Sigmoid Function", font_size=48).to_edge(UP)
        
        formula = MathTex(r"\sigma(x) = \frac{1}{1 + e^{-x}}", font_size=48)
        props1 = Text("Maps real numbers to (0, 1)", font_size=24)
        props2 = Text("Used in: Binary Classification", font_size=24, color=YELLOW)
        left_group = VGroup(formula, props1, props2).arrange(DOWN, buff=0.8)

        axes = Axes(
            x_range=[-6, 6, 1],
            y_range=[-0.2, 1.2, 0.5],
            x_length=6,
            y_length=4,
            axis_config={"color": WHITE},
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label=r"\sigma(x)")
        right_group = VGroup(axes, axes_labels)

        main_content = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0).next_to(title, DOWN, buff=0.5)

        sigmoid_curve = axes.plot(lambda x: 1 / (1 + math.exp(-x)), color=BLUE)

        self.play(Write(title))
        self.play(FadeIn(formula))
        self.play(Create(axes), FadeIn(axes_labels))
        self.play(Create(sigmoid_curve), run_time=2)
        self.play(Write(props1))
        self.play(Write(props2))
        self.wait(2)

        self.play(FadeOut(Group(title, left_group, right_group, sigmoid_curve)))


class SoftmaxScene(SafeScene):
    def construct(self):
        title = Text("2. Softmax Function", font_size=48).to_edge(UP)
        
        formula = MathTex(
            r"\text{Softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^n e^{x_j}}", font_size=48
        )
        props = Text("Used in: Multi-Class Classification", font_size=24, color=YELLOW)
        left_group = VGroup(formula, props).arrange(DOWN, buff=1.0)

        vector_in = Matrix([["2.0"], ["1.0"], ["0.1"]])
        arrow = Arrow(LEFT, RIGHT)
        vector_out = Matrix([["0.7"], ["0.2"], ["0.1"]])
        matrices_group = VGroup(vector_in, arrow, vector_out).arrange(RIGHT, buff=0.5)
        
        label_in = Text("Raw Scores (Logits)", font_size=24).next_to(vector_in, UP)
        label_out = Text("Probabilities", font_size=24).next_to(vector_out, UP)
        sum_text = MathTex(r"\sum = 1.0", font_size=36, color=GREEN).next_to(vector_out, DOWN)
        
        right_group = VGroup(matrices_group, label_in, label_out, sum_text)

        main_content = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0).next_to(title, DOWN, buff=0.5)

        self.play(Write(title))
        self.play(FadeIn(formula))
        
        self.play(FadeIn(vector_in), Write(label_in))
        self.wait(1)
        self.play(GrowArrow(arrow))
        self.play(FadeIn(vector_out), Write(label_out))
        self.wait(1)
        self.play(Write(sum_text))
        
        self.play(Write(props))
        self.wait(2)

        self.play(FadeOut(Group(title, left_group, right_group)))


class ReLUScene(SafeScene):
    def construct(self):
        title = Text("3. ReLU Function", font_size=48).to_edge(UP)
        
        formula = MathTex(r"\text{ReLU}(x) = \max(0, x)", font_size=48)
        props1 = Text("Outputs input if positive", font_size=24)
        props2 = Text("Otherwise, outputs zero", font_size=24)
        left_group = VGroup(formula, props1, props2).arrange(DOWN, buff=0.8)

        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-1, 4, 1],
            x_length=6,
            y_length=4,
            axis_config={"color": WHITE},
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label=r"\text{ReLU}(x)")
        right_group = VGroup(axes, axes_labels)

        main_content = VGroup(left_group, right_group).arrange(RIGHT, buff=1.0).next_to(title, DOWN, buff=0.5)

        relu_curve = axes.plot(lambda x: max(0, x), color=RED)

        self.play(Write(title))
        self.play(FadeIn(formula))
        self.play(Create(axes), FadeIn(axes_labels))
        self.play(Create(relu_curve), run_time=2)
        self.play(Write(props1))
        self.play(Write(props2))
        self.wait(2)

        self.play(FadeOut(Group(title, left_group, right_group, relu_curve)))
