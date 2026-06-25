from manim import *
from atozai import SafeScene
import numpy as np

class Scene1_Classification(SafeScene):
    def construct(self):
        self.add_subcaption("Evaluation metrics aren't just numbers, they are a way to visually measure boundaries.", duration=3)
        title = Title("Classification Basics", color=BLUE)
        self.play(FadeIn(title, lag_ratio=0.1))
        
        axes = Axes(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=6, y_length=4, axis_config={"color": GREY_B, "include_ticks": False})
        
        # Maximum State Layout Pattern: Build extreme states to calculate safe bounding box
        max_net = Circle(radius=2.0).move_to(axes.c2p(1, 0.5))
        layout_group = VGroup(axes, max_net)
        layout_group.next_to(title, DOWN, buff=0.5).to_edge(LEFT, buff=1)
        layout_group.remove(max_net) # Remove dummy
        
        self.play(Create(axes))
        
        np.random.seed(42)
        pos_points = VGroup(*[Dot(axes.c2p(x, y), color=BLUE, radius=0.08) for x, y in zip(np.random.normal(1, 0.5, 20), np.random.normal(0.5, 0.5, 20))])
        neg_points = VGroup(*[Dot(axes.c2p(x, y), color=GREY, radius=0.08) for x, y in zip(np.random.normal(-1, 0.5, 20), np.random.normal(-0.5, 0.5, 20))])
        
        self.add_subcaption("Imagine our positive targets in blue, and negative cases in grey.", duration=3)
        self.play(FadeIn(pos_points, shift=UP), FadeIn(neg_points, shift=DOWN))
        
        self.add_subcaption("Our model acts like a net, trying to capture only the blue dots.", duration=3)
        net_center = axes.c2p(1, 0.5)
        net = Circle(radius=2.0, color=GREEN, stroke_width=4).move_to(net_center)
        self.play(Create(net))
        
        tp_text = Text("True Positives (TP)", color=GREEN, font_size=24)
        tp_text.next_to(axes, RIGHT, buff=1).align_to(axes, UP)
        
        self.add_subcaption("The blue dots it successfully catches are True Positives.", duration=3)
        tp_dots = VGroup(*[p for p in pos_points if np.linalg.norm(p.get_center() - net.get_center()) < 2.0])
        self.play(FadeIn(tp_text, lag_ratio=0.1))
        self.play(tp_dots.animate.set_color(GREEN).scale(1.5), rate_func=there_and_back, run_time=1.5)
        
        fp_text = Text("False Positives (FP)", color=RED, font_size=24).next_to(tp_text, DOWN, aligned_edge=LEFT)
        self.add_subcaption("But it also caught some grey dots. These are False Positives.", duration=3)
        fp_dots = VGroup(*[p for p in neg_points if np.linalg.norm(p.get_center() - net.get_center()) < 2.0])
        self.play(FadeIn(fp_text, lag_ratio=0.1))
        self.play(fp_dots.animate.set_color(RED).scale(1.5), rate_func=there_and_back, run_time=1.5)
        
        fn_text = Text("False Negatives (FN)", color=ORANGE, font_size=24).next_to(fp_text, DOWN, aligned_edge=LEFT)
        self.add_subcaption("The blue dots it missed are False Negatives.", duration=3)
        fn_dots = VGroup(*[p for p in pos_points if np.linalg.norm(p.get_center() - net.get_center()) >= 2.0])
        self.play(FadeIn(fn_text, lag_ratio=0.1))
        self.play(fn_dots.animate.set_color(ORANGE).scale(1.5), rate_func=there_and_back, run_time=1.5)
        
        prec_formula = MathTex(r"\text{Precision} = \frac{TP}{TP + FP}", font_size=36).next_to(fn_text, DOWN, buff=1, aligned_edge=LEFT)
        self.add_subcaption("Precision asks: Of everything in the net, how much is actually blue?", duration=3)
        outside_dots = VGroup(*[p for p in pos_points if p not in tp_dots], *[p for p in neg_points if p not in fp_dots])
        self.play(FadeIn(prec_formula, lag_ratio=0.1), outside_dots.animate.set_opacity(0.2))
        
        rec_formula = MathTex(r"\text{Recall} = \frac{TP}{TP + FN}", font_size=36).next_to(prec_formula, DOWN, aligned_edge=LEFT)
        self.add_subcaption("Recall asks: Of all the blue dots everywhere, how many did we catch?", duration=3)
        self.play(FadeIn(rec_formula, lag_ratio=0.1), outside_dots.animate.set_opacity(1.0), neg_points.animate.set_opacity(0.2))
        
        self.wait(1)
        self.play(FadeOut(Group(*self.mobjects)))


class Scene2_Curves(SafeScene):
    def construct(self):
        title = Title("Precision-Recall Curve", color=BLUE)
        self.play(FadeIn(title, lag_ratio=0.1))
        
        self.add_subcaption("As we expand our net, we catch more of what we want, but also more false alarms.", duration=4)
        
        left_axes = Axes(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=4, y_length=4, axis_config={"color": GREY_B, "include_ticks": False})
        right_axes = Axes(x_range=[0, 1.1, 0.2], y_range=[0, 1.1, 0.2], x_length=4, y_length=4, axis_config={"color": BLUE})
        axes_group = VGroup(left_axes, right_axes).arrange(RIGHT, buff=2.0)
        
        # Maximum State Layout Pattern
        max_net = Circle(radius=2.4).move_to(left_axes.c2p(1, 0.5))
        layout_group = VGroup(axes_group, max_net)
        layout_group.next_to(title, DOWN, buff=0.5)
        layout_group.remove(max_net)
        
        x_label = Text("Recall", font_size=24).next_to(right_axes.x_axis.get_end(), DOWN)
        y_label = Text("Precision", font_size=24).next_to(right_axes.y_axis.get_end(), LEFT)
        
        self.play(Create(left_axes), Create(right_axes), FadeIn(x_label, lag_ratio=0.1), FadeIn(y_label, lag_ratio=0.1))
        
        np.random.seed(100)
        pos_points = VGroup(*[Dot(left_axes.c2p(x, y), color=BLUE, radius=0.06) for x, y in zip(np.random.normal(1, 0.6, 15), np.random.normal(0.5, 0.6, 15))])
        neg_points = VGroup(*[Dot(left_axes.c2p(x, y), color=GREY, radius=0.06) for x, y in zip(np.random.normal(-1, 0.6, 15), np.random.normal(-0.5, 0.6, 15))])
        
        self.play(FadeIn(pos_points), FadeIn(neg_points))
        
        net_center = left_axes.c2p(1, 0.5)
        net = Circle(radius=0.1, color=GREEN, stroke_width=2).move_to(net_center)
        self.play(Create(net))
        
        self.add_subcaption("The curve summarizes this trade-off dynamically.", duration=3)
        curve = right_axes.plot(lambda x: 1 - x**2, color=YELLOW, x_range=[0, 0.1])
        
        def update_curve(mob, alpha):
            r = 0.1 + alpha * 2.3
            net.set(width=r*2)
            mob.become(right_axes.plot(lambda x: 1 - x**2, color=YELLOW, x_range=[0, max(0.01, alpha)]))
        
        self.play(UpdateFromAlphaFunc(curve, update_curve), run_time=4, rate_func=linear)
        
        self.add_subcaption("The Area Under the Curve (AUC) is a single number representing overall performance.", duration=3)
        area = right_axes.get_area(curve, x_range=[0, 1], color=YELLOW, opacity=0.3)
        self.play(FadeIn(area))
        
        self.wait(1)
        self.play(FadeOut(Group(*self.mobjects)))


class Scene3_Regression(SafeScene):
    def construct(self):
        title = Title("Regression: Variance and R-Squared", color=BLUE)
        self.play(FadeIn(title, lag_ratio=0.1))
        
        self.add_subcaption("For continuous values, we look at the geometrical area of error.", duration=3)
        
        axes = Axes(x_range=[0, 10, 1], y_range=[0, 10, 1], x_length=6, y_length=4)
        axes.next_to(title, DOWN, buff=0.5).to_edge(LEFT, buff=1)
        self.play(Create(axes))
        
        x_vals = np.array([2, 4, 5, 7, 8])
        y_vals = np.array([3, 4, 6, 8, 7])
        mean_y = np.mean(y_vals)
        
        dots = VGroup(*[Dot(axes.c2p(x, y), color=WHITE) for x, y in zip(x_vals, y_vals)])
        self.play(FadeIn(dots))
        
        mean_line = axes.plot(lambda x: mean_y, color=GREY_C)
        mean_label = Text("Mean", font_size=20, color=GREY_C).next_to(mean_line, RIGHT)
        self.play(Create(mean_line), FadeIn(mean_label, lag_ratio=0.1))
        
        self.add_subcaption("Variance is the area of squares drawn to the mean.", duration=3)
        squares_mean = VGroup()
        for x, y in zip(x_vals, y_vals):
            p1 = axes.c2p(x, y)
            p2 = axes.c2p(x, mean_y)
            diff_y_coords = abs(p1[1] - p2[1])
            sq = Square(side_length=diff_y_coords, color=RED, fill_opacity=0.2)
            sq.move_to(p1, aligned_edge=UL if y > mean_y else DL)
            squares_mean.add(sq)
            
        self.play(Create(squares_mean))
        
        self.add_subcaption("When we train a model, it finds a better line.", duration=3)
        reg_line = axes.plot(lambda x: 0.8 * x + 1.2, color=BLUE)
        self.play(Create(reg_line))
        
        self.add_subcaption("Notice how the squares dramatically shrink! This is MSE.", duration=3)
        squares_reg = VGroup()
        for x, y in zip(x_vals, y_vals):
            p1 = axes.c2p(x, y)
            pred_y = 0.8 * x + 1.2
            p2 = axes.c2p(x, pred_y)
            diff_y_coords = abs(p1[1] - p2[1])
            sq = Square(side_length=diff_y_coords, color=GREEN, fill_opacity=0.4)
            sq.move_to(p1, aligned_edge=UL if y > pred_y else DL)
            squares_reg.add(sq)
            
        self.play(Transform(squares_mean, squares_reg))
        
        r2_formula = MathTex(r"R^2 = \frac{\text{Orig Area} - \text{Shrunk Area}}{\text{Orig Area}}", font_size=36)
        r2_formula.next_to(axes, RIGHT, buff=1)
        
        self.add_subcaption("R-squared tells us exactly what percentage of the area we eliminated.", duration=3)
        self.play(FadeIn(r2_formula, lag_ratio=0.1))
        
        self.wait(1)
        self.play(FadeOut(Group(*self.mobjects)))


class Scene4_Semantic(SafeScene):
    def construct(self):
        title = Title("Semantic Metrics: Cosine Similarity", color=BLUE)
        self.play(FadeIn(title, lag_ratio=0.1))
        
        self.add_subcaption("In NLP, concepts are vectors in space.", duration=3)
        
        plane = NumberPlane(x_range=[-2, 3], y_range=[-2, 3], x_length=5, y_length=5)
        
        # Maximum State Layout Pattern
        vec_a_max = Arrow(plane.c2p(0,0), plane.c2p(1.5, 2.25), buff=0, color=BLUE)
        lbl_a_max = Text("Doc A (Longer)", color=BLUE, font_size=24).next_to(vec_a_max.get_end(), UP)
        
        layout_group = VGroup(plane, vec_a_max, lbl_a_max)
        layout_group.next_to(title, DOWN, buff=0.5).to_edge(LEFT, buff=1)
        layout_group.remove(vec_a_max, lbl_a_max)
        
        vec_a = Arrow(plane.c2p(0,0), plane.c2p(1, 1.5), buff=0, color=BLUE)
        vec_b = Arrow(plane.c2p(0,0), plane.c2p(1.5, 0.5), buff=0, color=PURPLE)
        
        lbl_a = Text("Doc A", color=BLUE, font_size=24).next_to(vec_a.get_end(), UP)
        lbl_b = Text("Doc B", color=PURPLE, font_size=24).next_to(vec_b.get_end(), RIGHT)
        
        self.play(Create(plane), GrowArrow(vec_a), FadeIn(lbl_a, lag_ratio=0.1), GrowArrow(vec_b), FadeIn(lbl_b, lag_ratio=0.1))
        
        self.add_subcaption("If we add more words to Doc A, the vector grows longer.", duration=3)
        vec_a_long = Arrow(plane.c2p(0,0), plane.c2p(1.5, 2.25), buff=0, color=BLUE)
        lbl_a_long = Text("Doc A (Longer)", color=BLUE, font_size=24).next_to(vec_a_long.get_end(), UP)
        
        self.play(Transform(vec_a, vec_a_long), Transform(lbl_a, lbl_a_long))
        
        self.add_subcaption("But the angle between them hasn't changed. They talk about the same topics!", duration=4)
        angle = Angle(vec_b, vec_a, radius=0.5, color=YELLOW)
        self.play(Create(angle))
        
        formula = MathTex(r"\cos(\theta) = \frac{A \cdot B}{\|A\| \|B\|}", font_size=40)
        formula.next_to(plane, RIGHT, buff=1)
        self.play(FadeIn(formula, lag_ratio=0.1))
        
        self.wait(1)
        self.play(FadeOut(Group(*self.mobjects)))


class Scene5_ObjectDetection(SafeScene):
    def construct(self):
        title = Title("Object Detection: IoU", color=BLUE)
        self.play(FadeIn(title, lag_ratio=0.1))
        
        self.add_subcaption("Object detection uses Intersection over Union (IoU).", duration=3)
        
        gt_box = Rectangle(width=4, height=3, color=GREEN, fill_opacity=0.3)
        gt_label = Text("Ground Truth", color=GREEN, font_size=24).next_to(gt_box, UP)
        
        pred_box = Rectangle(width=3, height=3.5, color=RED, fill_opacity=0.3)
        # Shift pred_box to simulate its starting position relative to gt_box
        pred_box.move_to(gt_box.get_center() + RIGHT*1 + DOWN*0.5)
        pred_label = Text("Prediction", color=RED, font_size=24).next_to(pred_box, DOWN)
        
        boxes_group = VGroup(gt_box, gt_label, pred_box, pred_label)
        boxes_group.next_to(title, DOWN, buff=0.5).to_edge(LEFT, buff=1)
        
        self.play(Create(gt_box), FadeIn(gt_label, lag_ratio=0.1))
        self.play(Create(pred_box), FadeIn(pred_label, lag_ratio=0.1))
        
        self.add_subcaption("The glowing center is the Intersection.", duration=3)
        inter_rect = Intersection(gt_box, pred_box, color=YELLOW, fill_opacity=0.8)
        self.play(FadeIn(inter_rect))
        
        self.add_subcaption("The total area covered by both is the Union.", duration=3)
        union_rect = Union(gt_box, pred_box, color=WHITE, fill_opacity=0.1)
        self.play(FadeIn(union_rect))
        
        iou_text = MathTex(r"\text{IoU} = \frac{\text{Intersection Area}}{\text{Union Area}}", font_size=36)
        iou_text.next_to(boxes_group, RIGHT, buff=1)
        self.play(FadeIn(iou_text, lag_ratio=0.1))
        
        self.add_subcaption("As the prediction gets better, the intersection matches the union (IoU -> 1).", duration=4)
        self.play(
            pred_box.animate.move_to(gt_box.get_center()).set(width=4, height=3),
            inter_rect.animate.move_to(gt_box.get_center()).set(width=4, height=3),
            union_rect.animate.move_to(gt_box.get_center()).set(width=4, height=3),
            pred_label.animate.next_to(gt_box, DOWN),
            run_time=2
        )
        
        self.wait(2)
