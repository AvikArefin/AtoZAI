window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"], ["$", "$"]],
    displayMath: [["\\[", "\\]"], ["$$", "$$"]],
    processEscapes: true,
    processEnvironments: true
  },
  options: {
    ignoreHtmlClass: ".*",
    processHtmlClass: "arithmatex"
  }
};

/* MkDocs Material instant navigation hook */
if (typeof document$ !== "undefined") {
  document$.subscribe(function() {
    if (typeof MathJax !== "undefined" && MathJax.typesetPromise) {
      MathJax.typesetPromise();
    }
  });
} else {
  document.addEventListener("DOMContentLoaded", function() {
    if (typeof MathJax !== "undefined" && MathJax.typesetPromise) {
      MathJax.typesetPromise();
    }
  });
}
