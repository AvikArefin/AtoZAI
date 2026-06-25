from manim import *
from atozai import SafeScene
import numpy as np

# Color Palette
PRIMARY = BLUE
SECONDARY = GREEN
ACCENT = RED
BG = BLACK

class Scene1_ClassificationMetrics(SafeScene):
    def construct(self):
        title = Text("Classification Metrics", font_size=40, color=PRIMARY).to_edge(UP)
        self.add(title)
        
        self.add_subcaption("Imagine this is our dataset. Green are actual positives, Red are negatives.", duration=4)
        
        np.random.seed(42)
        
        pos_dots = VGroup(*[Dot(color=SECONDARY).move_to([np.random.uniform(-2, 2), np.random.uniform(0.2, 1.8), 0]) for _ in range(20)])
        neg_dots = VGroup(*[Dot(color=ACCENT).move_to([np.random.uniform(-2, 2), np.random.uniform(-1.8, -0.2), 0]) for _ in range(20)])
        
        all_dots = VGroup(pos_dots, neg_dots)
        
        prec_title = Text("Precision = ", font_size=30)
        prec_num = Text("TP", font_size=24, color=SECONDARY)
        prec_line = Line(LEFT, RIGHT).set_length(1.5)
        prec_den = Text("TP + FP", font_size=24, color=YELLOW)
        prec_frac = VGroup(prec_num, prec_line, prec_den).arrange(DOWN, buff=0.2)
        prec_eq = VGroup(prec_title, prec_frac).arrange(RIGHT, buff=0.2)
        
        rec_title = Text("Recall = ", font_size=30)
        rec_num = Text("TP", font_size=24, color=SECONDARY)
        rec_line = Line(LEFT, RIGHT).set_length(1.5)
        rec_den = Text("TP + FN", font_size=24, color=YELLOW)
        rec_frac = VGroup(rec_num, rec_line, rec_den).arrange(DOWN, buff=0.2)
        rec_eq = VGroup(rec_title, rec_frac).arrange(RIGHT, buff=0.2)
        
        left_group = VGroup(prec_eq)
        right_group = VGroup(all_dots)
        
        VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)
        
        # rec_eq shares the position of prec_eq
        rec_eq.move_to(prec_eq.get_center())
        
        self.play(FadeIn(all_dots, lag_ratio=0.05))
        self.wait(1)
        
        self.add_subcaption("Our model draws a decision boundary...", duration=4)
        
        decision_line = Line(right_group.get_bottom() + DOWN*0.2, right_group.get_top() + UP*0.2, color=YELLOW)
        decision_line.move_to(right_group.get_center())
        right_group.add(decision_line)
        self.play(Create(decision_line))
        
        self.add_subcaption("This splits the data into 4 groups: True Positives, False Positives...", duration=4)
        
        labels = VGroup(
            Text("FN", font_size=20).next_to(decision_line.get_top() + LEFT*0.5, UP, buff=0.2),
            Text("TP", font_size=20).next_to(decision_line.get_top() + RIGHT*0.5, UP, buff=0.2),
            Text("TN", font_size=20).next_to(decision_line.get_bottom() + LEFT*0.5, DOWN, buff=0.2),
            Text("FP", font_size=20).next_to(decision_line.get_bottom() + RIGHT*0.5, DOWN, buff=0.2)
        )
        
        tp_dots = VGroup(*[d for d in pos_dots if d.get_x() > decision_line.get_x()])
        fn_dots = VGroup(*[d for d in pos_dots if d.get_x() <= decision_line.get_x()])
        fp_dots = VGroup(*[d for d in neg_dots if d.get_x() > decision_line.get_x()])
        tn_dots = VGroup(*[d for d in neg_dots if d.get_x() <= decision_line.get_x()])
        
        self.play(all_dots.animate.set_opacity(0.4))
        self.play(FadeIn(labels))
        self.wait(1)
        
        self.add_subcaption("Precision looks at all predicted positives. How many are actually green?", duration=4)
        
        self.play(Write(prec_title), Create(prec_line))
        self.play(Write(prec_num), Indicate(tp_dots, scale_factor=2.0, color=SECONDARY))
        self.wait(0.5)
        self.play(Write(prec_den), Indicate(VGroup(tp_dots, fp_dots), scale_factor=2.0, color=YELLOW))
        self.wait(2)
        
        self.play(FadeOut(prec_eq))
        
        self.add_subcaption("Recall looks at all actual positives. How many did we find?", duration=4)
        
        self.play(Write(rec_title), Create(rec_line))
        self.play(Write(rec_num), Indicate(tp_dots, scale_factor=2.0, color=SECONDARY))
        self.wait(0.5)
        self.play(Write(rec_den), Indicate(VGroup(tp_dots, fn_dots), scale_factor=2.0, color=YELLOW))
        self.wait(2)
        
        self.play(FadeOut(VGroup(rec_eq, all_dots, labels, decision_line, title)))

class Scene2_CurvesAndThresholds(SafeScene):
    def construct(self):
        title = Text("ROC, AUC & PR Curves", font_size=40, color=PRIMARY).to_edge(UP)
        self.add(title)
        
        self.add_subcaption("Models output probabilities. Let's sweep the decision threshold.", duration=4)
        
        # Create left group
        number_line = NumberLine(x_range=[0, 1, 0.2], length=4)
        line_label = Text("Probability", font_size=20).next_to(number_line, UP, buff=0.5)
        
        np.random.seed(10)
        pos_probs = np.random.normal(0.7, 0.15, 10)
        neg_probs = np.random.normal(0.3, 0.15, 10)
        pos_probs = np.clip(pos_probs, 0, 1)
        neg_probs = np.clip(neg_probs, 0, 1)
        
        dots = VGroup()
        for p in pos_probs:
            dots.add(Dot(number_line.n2p(p), color=SECONDARY))
        for p in neg_probs:
            dots.add(Dot(number_line.n2p(p), color=ACCENT))
            
        left_group = VGroup(number_line, line_label, dots)
        
        # Create right group
        axes_roc = Axes(x_range=[0, 1.1, 0.2], y_range=[0, 1.1, 0.2], x_length=4, y_length=4, axis_config={"include_numbers": False})
        roc_x_label = Text("FPR", font_size=20).next_to(axes_roc.x_axis, DOWN, buff=0.2)
        roc_y_label = Text("TPR", font_size=20).next_to(axes_roc.y_axis, LEFT, buff=0.2).rotate(PI/2)
        
        right_group = VGroup(axes_roc, roc_x_label, roc_y_label)
        
        VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)
        
        self.play(Create(number_line), Write(line_label), FadeIn(dots))
        
        threshold = ValueTracker(1.1)
        t_line = always_redraw(lambda: Line(UP, DOWN, color=YELLOW).move_to(number_line.n2p(threshold.get_value())))
        t_label = always_redraw(lambda: DecimalNumber(threshold.get_value(), num_decimal_places=2, font_size=20).next_to(t_line, DOWN, buff=0.2))
        
        self.play(Create(t_line), Write(t_label))
        
        for i, d in enumerate(dots):
            is_pos = i < len(pos_probs)
            p = pos_probs[i] if is_pos else neg_probs[i-len(pos_probs)]
            d.add_updater(lambda m, p=p, is_pos=is_pos: m.set_opacity(1.0 if p >= threshold.get_value() else 0.2))
            
        self.play(Create(axes_roc), Write(roc_x_label), Write(roc_y_label))
        
        def get_rates():
            t = threshold.get_value()
            tp = sum(1 for p in pos_probs if p >= t)
            fn = len(pos_probs) - tp
            fp = sum(1 for p in neg_probs if p >= t)
            tn = len(neg_probs) - fp
            tpr = tp / (tp + fn) if (tp+fn)>0 else 0
            fpr = fp / (fp + tn) if (fp+tn)>0 else 0
            precision = tp / (tp + fp) if (tp+fp)>0 else 1.0
            recall = tpr
            return fpr, tpr, precision, recall
            
        roc_dot = always_redraw(lambda: Dot(axes_roc.c2p(get_rates()[0], get_rates()[1]), color=YELLOW))
        self.add(roc_dot)
        
        roc_path = TracedPath(roc_dot.get_center, stroke_color=PRIMARY, stroke_width=4)
        self.add(roc_path)
        
        self.add_subcaption("As the threshold lowers, TPR and FPR change, drawing the ROC curve.", duration=6)
        self.play(threshold.animate.set_value(-0.1), run_time=4, rate_func=linear)
        self.wait(1)
        
        self.add_subcaption("AUC is literally the Area Under the Curve. 1.0 is perfect.", duration=4)
        
        def get_auc_polygon(path, axes):
            points = path.points
            if len(points) < 2:
                return VGroup()
            poly_points = [axes.c2p(0, 0)] + list(points) + [axes.c2p(1, 0)]
            return Polygon(*poly_points, fill_color=PRIMARY, fill_opacity=0.5, stroke_width=0)
            
        auc_poly = get_auc_polygon(roc_path, axes_roc)
        auc_text = Text("AUC = 0.94", font_size=24, color=YELLOW).next_to(axes_roc, UP, buff=0.2)
        
        self.play(FadeIn(auc_poly), Write(auc_text))
        self.wait(2)
        
        self.add_subcaption("What if our data is highly imbalanced? We use Precision and Recall.", duration=5)
        
        self.play(
            FadeOut(VGroup(roc_path, auc_poly, auc_text, roc_dot, roc_x_label, roc_y_label)), 
            threshold.animate.set_value(1.1)
        )
        
        pr_x_label = Text("Recall", font_size=20).next_to(axes_roc.x_axis, DOWN, buff=0.2)
        pr_y_label = Text("Precision", font_size=20).next_to(axes_roc.y_axis, LEFT, buff=0.2).rotate(PI/2)
        
        self.play(Write(pr_x_label), Write(pr_y_label))
        
        pr_dot = always_redraw(lambda: Dot(axes_roc.c2p(get_rates()[3], get_rates()[2]), color=YELLOW))
        self.add(pr_dot)
        
        pr_path = TracedPath(pr_dot.get_center, stroke_color=SECONDARY, stroke_width=4)
        self.add(pr_path)
        
        self.add_subcaption("The exact same threshold sweep draws the PR Curve.", duration=4)
        self.play(threshold.animate.set_value(-0.1), run_time=4, rate_func=linear)
        self.wait(1)
        
        self.add_subcaption("The area under this curve is Average Precision (AP).", duration=4)
        ap_poly = get_auc_polygon(pr_path, axes_roc)
        ap_poly.set_color(SECONDARY)
        ap_text = Text("AP", font_size=24, color=YELLOW).next_to(axes_roc, UP, buff=0.2)
        
        self.play(FadeIn(ap_poly), Write(ap_text))
        self.wait(2)
        
        self.play(FadeOut(VGroup(title, number_line, line_label, dots, t_line, t_label, axes_roc, pr_x_label, pr_y_label, pr_dot, pr_path, ap_poly, ap_text)))

class Scene3_VarianceAndVectors(SafeScene):
    def construct(self):
        title = Text("Variance vs Mean Squared Error", font_size=40, color=PRIMARY).to_edge(UP)
        self.add(title)
        
        axes = Axes(x_range=[0, 10], y_range=[0, 10], x_length=5, y_length=5)
        
        var_eq = MathTex(r"\text{Variance} = \frac{1}{n} \sum (y_i - \bar{y})^2", font_size=30)
        mse_eq = MathTex(r"\text{MSE} = \frac{1}{n} \sum (y_i - \hat{y}_i)^2", font_size=30).next_to(var_eq, DOWN, buff=0.7)
        r2_eq = MathTex(r"R^2 = 1 - \frac{\text{MSE}}{\text{Variance}}", font_size=30).next_to(mse_eq, DOWN, buff=1)
        
        left_group = VGroup(var_eq, mse_eq, r2_eq)
        right_group = VGroup(axes)
        
        VGroup(left_group, right_group).arrange(RIGHT, buff=1.0)
        
        self.play(Create(axes))
        
        np.random.seed(42)
        x_vals = np.linspace(1, 9, 15)
        y_vals = 0.8 * x_vals + 1.5 + np.random.normal(0, 1.2, len(x_vals))
        
        dots = VGroup(*[Dot(axes.c2p(x, y), color=WHITE) for x, y in zip(x_vals, y_vals)])
        self.play(FadeIn(dots))
        
        self.add_subcaption("First, Variance: squared differences from the Mean.", duration=4)
        
        y_mean = np.mean(y_vals)
        m_tracker = ValueTracker(0)
        b_tracker = ValueTracker(y_mean)
        
        fit_line = always_redraw(lambda: axes.plot(lambda x: m_tracker.get_value() * x + b_tracker.get_value(), color=SECONDARY))
        self.play(Create(fit_line))
        
        def get_squares():
            squares = VGroup()
            m = m_tracker.get_value()
            b = b_tracker.get_value()
            for x, y in zip(x_vals, y_vals):
                y_pred = m * x + b
                diff = abs(y - y_pred)
                p_dot = axes.c2p(x, y)
                p_line = axes.c2p(x, y_pred)
                
                side_len = abs(axes.c2p(0, diff)[1] - axes.c2p(0,0)[1])
                if side_len > 0.01:
                    sq = Square(side_length=side_len, color=SECONDARY, fill_opacity=0.3)
                    sq.move_to(p_dot)
                    higher_point = p_dot if y > y_pred else p_line
                    sq.align_to(higher_point, UP)
                    sq.align_to(p_dot, LEFT)
                    squares.add(sq)
            return squares
            
        squares_group = always_redraw(get_squares)
        self.play(Create(squares_group))
        
        self.play(Write(var_eq))
        self.wait(1)
        
        self.add_subcaption("MSE is minimized when the line mathematically fits the data, shrinking the squares.", duration=6)
        
        m_opt, b_opt = np.polyfit(x_vals, y_vals, 1)
        
        self.play(
            m_tracker.animate.set_value(m_opt),
            b_tracker.animate.set_value(b_opt),
            FadeIn(mse_eq),
            run_time=4,
            rate_func=smooth
        )
        self.wait(1)
        
        self.add_subcaption("R-squared compares the starting Variance area to the final MSE area.", duration=5)
        self.play(Write(r2_eq))
        self.wait(3)
        
        self.play(FadeOut(VGroup(title, axes, dots, fit_line, squares_group, left_group)))

class Scene4_ObjectDetection(SafeScene):
    def construct(self):
        title = Text("Intersection over Union (IoU)", font_size=40, color=PRIMARY).to_edge(UP)
        self.add(title)
        
        self.add_subcaption("How do we evaluate a bounding box? We compare it to the Ground Truth.", duration=4)
        
        gt_box = Rectangle(width=4, height=3, color=SECONDARY, stroke_width=4)
        gt_label = Text("Ground Truth", color=SECONDARY, font_size=24).next_to(gt_box, UP, buff=0.2)
        gt_group = VGroup(gt_box, gt_label)
        
        pred_box = Rectangle(width=3, height=2.5, color=ACCENT, stroke_width=4)
        pred_label = Text("Prediction", color=ACCENT, font_size=24).next_to(pred_box, UP, buff=0.2)
        pred_group = VGroup(pred_box, pred_label)
        
        iou_text_placeholder = Text("IoU: 0.00", font_size=36)
        left_group = VGroup(iou_text_placeholder)
        
        right_group = VGroup(gt_group)
        VGroup(left_group, right_group).arrange(RIGHT, buff=1.5)
        
        pred_group.next_to(gt_group, LEFT, buff=0.5)
        
        self.play(Create(gt_box), Write(gt_label))
        self.play(Create(pred_box), Write(pred_label))
        
        self.add_subcaption("As the prediction overlaps, we calculate the Intersection and Union areas.", duration=5)
        
        def get_iou_value():
            gt_l, gt_r = gt_box.get_left()[0], gt_box.get_right()[0]
            gt_b, gt_t = gt_box.get_bottom()[1], gt_box.get_top()[1]
            
            pr_l, pr_r = pred_box.get_left()[0], pred_box.get_right()[0]
            pr_b, pr_t = pred_box.get_bottom()[1], pred_box.get_top()[1]
            
            inter_l = max(gt_l, pr_l)
            inter_r = min(gt_r, pr_r)
            inter_b = max(gt_b, pr_b)
            inter_t = min(gt_t, pr_t)
            
            if inter_l < inter_r and inter_b < inter_t:
                inter_area = (inter_r - inter_l) * (inter_t - inter_b)
            else:
                inter_area = 0
                
            gt_area = (gt_r - gt_l) * (gt_t - gt_b)
            pr_area = (pr_r - pr_l) * (pr_t - pr_b)
            union_area = gt_area + pr_area - inter_area
            
            return inter_area / union_area if union_area > 0 else 0
            
        iou_text = always_redraw(lambda: Text(f"IoU: {get_iou_value():.2f}", font_size=36).move_to(left_group.get_center()))
        self.play(FadeIn(iou_text))
        
        inter_poly = always_redraw(lambda: Intersection(gt_box, pred_box, color=YELLOW, fill_opacity=0.5, stroke_width=0) if get_iou_value() > 0 else VGroup())
        self.add(inter_poly)
        
        self.play(FadeOut(gt_label), FadeOut(pred_label))
        self.play(pred_box.animate.move_to(gt_box.get_center() + RIGHT*0.5 + DOWN*0.2), run_time=4)
        self.wait(1)
        
        self.add_subcaption("Mean Average Precision (mAP) averages this precision across multiple IoU thresholds.", duration=4)
        map_text = Text("mAP = Average Precision over many IoU thresholds", font_size=24).to_edge(DOWN)
        self.play(Write(map_text))
        self.wait(2)
        
        self.play(FadeOut(VGroup(title, gt_box, pred_box, inter_poly, iou_text, map_text)))
