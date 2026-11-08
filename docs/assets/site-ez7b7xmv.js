/*! medium-zoom 1.1.2 | MIT License | https://github.com/francoischalifour/medium-zoom */ function z() {
  return (
    (z = Object.assign
      ? Object.assign.bind()
      : function (i) {
          for (var v = 1; v < arguments.length; v++) {
            var C = arguments[v];
            for (var h in C) ({}).hasOwnProperty.call(C, h) && (i[h] = C[h]);
          }
          return i;
        }),
    z.apply(null, arguments)
  );
}
var F = function (i) {
    return i.tagName === "IMG";
  },
  I = function (i) {
    return i && i.nodeType === 1;
  },
  _ = function (i) {
    return (i.currentSrc || i.src).substr(-4).toLowerCase() === ".svg";
  },
  ee = function (i) {
    try {
      return Array.isArray(i)
        ? i.filter(F)
        : (function (v) {
              return NodeList.prototype.isPrototypeOf(v);
            })(i)
          ? [].slice.call(i).filter(F)
          : I(i)
            ? [i].filter(F)
            : typeof i == "string"
              ? [].slice.call(document.querySelectorAll(i)).filter(F)
              : [];
    } catch (v) {
      throw TypeError(`The provided selector is invalid.
Expects a CSS selector, a Node element, a NodeList or an array.
See: https://github.com/francoischalifour/medium-zoom`);
    }
  },
  te = function (i, v) {
    v === void 0 && (v = {});
    var C =
        window.Promise ||
        function (n) {
          function e() {}
          n(e, e);
        },
      h = function (n, e) {
        return n.dispatchEvent(
          (function (t, r) {
            if (typeof window.CustomEvent == "function") return new CustomEvent(t, { detail: r });
            var o = document.createEvent("CustomEvent");
            return (o.initCustomEvent(t, !1, !1, r), o);
          })("medium-zoom:" + e, { zoom: f }),
        );
      },
      re = function (n) {
        var e = n.target;
        e !== N ? l.indexOf(e) !== -1 && K({ target: e }) : g();
      },
      W = function () {
        if (c.o) {
          var n =
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0;
          if (c.t || (window.visualViewport && window.visualViewport.scale > c.i))
            return ((R = n), clearTimeout(c.u), void (c.u = null));
          k || (Math.abs(R - n) > a.scrollOffset && !c.u && (c.u = setTimeout(g, 150)));
        }
      },
      ie = function (n) {
        (n.touches.length >= 2 && (c.t = !0), c.t && W(), n.touches.length === 0 && (c.t = !1));
      },
      ae = function (n) {
        var e = n.key || n.keyCode;
        (e !== "Escape" && e !== "Esc" && e !== 27) || g();
      },
      Y = !1,
      H = function () {
        var n = l.length > 0;
        Y !== n && (document[n ? "addEventListener" : "removeEventListener"]("click", re), (Y = n));
      },
      U = function () {
        for (var n = arguments.length, e = Array(n), t = 0; t < n; t++) e[t] = arguments[t];
        var r = e.reduce(function (o, p) {
          return [].concat(o, ee(p));
        }, []);
        return (
          r
            .filter(function (o) {
              return l.indexOf(o) === -1;
            })
            .forEach(function (o) {
              (l.push(o), o.classList.add("medium-zoom-image"));
            }),
          M.forEach(function (o) {
            var { type: p, listener: b, options: y } = o;
            r.forEach(function (O) {
              O.addEventListener(p, b, y);
            });
          }),
          H(),
          f
        );
      },
      Z = !1,
      G = function (n) {
        if (Z !== n) {
          var e = n ? "addEventListener" : "removeEventListener";
          (document[e]("keyup", ae), document[e]("scroll", W));
          var t = { passive: !0 };
          (["touchstart", "touchend", "touchcancel"].forEach(function (r) {
            return document[e](r, ie, t);
          }),
            window[e]("resize", g),
            (Z = n));
        }
      },
      X = function (n, e) {
        var t,
          r,
          o = !1,
          p = window.matchMedia("(prefers-reduced-motion)"),
          b = function (E) {
            return Math.max.apply(Math, E.split(",").map(parseFloat));
          },
          y = function (E) {
            o || (E && E.propertyName !== "transform") || (A(), e());
          },
          O = function () {
            p.matches && y();
          },
          A = function () {
            ((o = !0),
              clearTimeout(t),
              window.cancelAnimationFrame(r),
              n.removeEventListener("transitionend", y),
              p.removeListener(O));
          };
        (n.addEventListener("transitionend", y), p.addListener(O));
        var x = window.getComputedStyle(n),
          u = 1000 * (b(x.transitionDuration) + b(x.transitionDelay));
        return (
          (t = setTimeout(y, Math.max(0, u) + 50)),
          u <= 0 &&
            (r = window.requestAnimationFrame(function () {
              return y();
            })),
          A
        );
      },
      J = function (n) {
        var e = (n === void 0 ? {} : n).target,
          t = {};
        return new C(function (r) {
          if (c.o || (e && l.indexOf(e) === -1)) r(f);
          else {
            c = t;
            var o,
              p = function () {},
              b = function () {},
              y = function (d) {
                t.m &&
                  (p(),
                  b(),
                  window.cancelAnimationFrame(o),
                  (t.m = null),
                  (k = !1),
                  r(f),
                  d && (document.body.classList.add("medium-zoom--opened"), h(t.o, "opened")));
              };
            if (((t.m = y), (t.o = e || l[0]), t.o)) {
              if (
                ((t.i = window.visualViewport ? window.visualViewport.scale : 1),
                G(!0),
                (k = !0),
                h(t.o, "open"),
                !t.l)
              ) {
                if (
                  ((R =
                    window.pageYOffset ||
                    document.documentElement.scrollTop ||
                    document.body.scrollTop ||
                    0),
                  (t.v = (function (d) {
                    var s = d.getBoundingClientRect(),
                      { top: m, left: S, width: L, height: V } = s,
                      w = d.cloneNode(),
                      T =
                        window.pageYOffset ||
                        document.documentElement.scrollTop ||
                        document.body.scrollTop ||
                        0,
                      B =
                        window.pageXOffset ||
                        document.documentElement.scrollLeft ||
                        document.body.scrollLeft ||
                        0;
                    return (
                      w.removeAttribute("id"),
                      (w.style.position = "absolute"),
                      (w.style.top = m + T + "px"),
                      (w.style.left = S + B + "px"),
                      (w.style.width = L + "px"),
                      (w.style.height = V + "px"),
                      (w.style.transform = ""),
                      w
                    );
                  })(t.o)),
                  document.body.appendChild(N),
                  a.template)
                ) {
                  var O = I(a.template) ? a.template : document.querySelector(a.template);
                  ((t.p = document.createElement("div")),
                    t.p.appendChild(O.content.cloneNode(!0)),
                    document.body.appendChild(t.p));
                }
                (t.o.parentElement &&
                  t.o.parentElement.tagName === "PICTURE" &&
                  t.o.currentSrc &&
                  (t.v.src = t.o.currentSrc),
                  document.body.appendChild(t.v),
                  (o = window.requestAnimationFrame(function () {
                    document.body.classList.add("medium-zoom--opened");
                  })),
                  t.o.classList.add("medium-zoom-image--hidden"),
                  t.v.classList.add("medium-zoom-image--opened"),
                  t.v.addEventListener("click", g));
                var A = function () {
                    ((function () {
                      var d,
                        s,
                        m = {
                          width: document.documentElement.clientWidth,
                          height: document.documentElement.clientHeight,
                          left: 0,
                          top: 0,
                          right: 0,
                          bottom: 0,
                        };
                      if (a.container)
                        if (a.container instanceof Object)
                          ((d =
                            (m = z({}, m, a.container)).width - m.left - m.right - 2 * a.margin),
                            (s = m.height - m.top - m.bottom - 2 * a.margin));
                        else {
                          var S = (
                            I(a.container) ? a.container : document.querySelector(a.container)
                          ).getBoundingClientRect();
                          m = z({}, m, {
                            width: S.width,
                            height: S.height,
                            left: S.left,
                            top: S.top,
                          });
                        }
                      ((d = d || m.width - 2 * a.margin), (s = s || m.height - 2 * a.margin));
                      var L = t.h || t.o,
                        V = _(L) ? d : L.naturalWidth || d,
                        w = _(L) ? s : L.naturalHeight || s,
                        T = L.getBoundingClientRect(),
                        { top: B, left: ce, width: j, height: q } = T;
                      if (j && q) {
                        var ue = Math.min(Math.max(j, V), d) / j,
                          me = Math.min(Math.max(q, w), s) / q,
                          D = Math.min(ue, me),
                          Q =
                            "scale(" +
                            D +
                            ") translate3d(" +
                            ((d - j) / 2 - ce + a.margin + m.left) / D +
                            "px, " +
                            ((s - q) / 2 - B + a.margin + m.top) / D +
                            "px, 0)";
                        ((t.v.style.transform = Q), t.h && (t.h.style.transform = Q));
                      }
                    })(),
                      (p = X(t.v, function () {
                        return y(!0);
                      })));
                  },
                  x = t.o.getAttribute("data-zoom-src");
                if (x || t.o.hasAttribute("srcset")) {
                  var u = document.createElement("img");
                  ([].slice.call(t.v.attributes).forEach(function (d) {
                    var { name: s, value: m } = d;
                    /^(src|srcset|sizes|loading)$/.test(s) || u.setAttribute(s, m);
                  }),
                    (t.h = u));
                  var E = function () {
                    (b(),
                      t.l ||
                        (u.naturalWidth
                          ? (u.classList.add("medium-zoom-image--opened"),
                            u.addEventListener("click", g),
                            document.body.appendChild(u))
                          : (console.warn(
                              "Unable to reach the zoom image target " + (u.currentSrc || u.src),
                            ),
                            (t.h = null)),
                        A()));
                  };
                  ((b = function () {
                    (u.removeEventListener("load", E), u.removeEventListener("error", E));
                  }),
                    u.addEventListener("load", E),
                    u.addEventListener("error", E),
                    x || (u.srcset = t.v.srcset),
                    (u.src = x || t.v.src));
                } else A();
              }
            } else r(f);
          }
        });
      },
      g = function () {
        return new C(function (n) {
          var e = c;
          if (e.o && !e.l) {
            ((e.l = !0), e.m && e.m(), clearTimeout(e.u), (k = !0));
            var t = function () {
              (e.o.classList.remove("medium-zoom-image--hidden"),
                [e.v, e.h, e.p, N].forEach(function (r) {
                  r &&
                    (r.removeEventListener("click", g),
                    r.parentNode && r.parentNode.removeChild(r));
                }),
                (c = {}),
                (k = !1),
                G(!1),
                n(f),
                h(e.o, "closed"));
            };
            (e.v && X(e.v, t),
              document.body.classList.remove("medium-zoom--opened"),
              e.v && (e.v.style.transform = ""),
              e.h && (e.h.style.transform = ""),
              e.p &&
                ((e.p.style.transition = parseFloat(window.getComputedStyle(e.v).transitionDuration)
                  ? "opacity 150ms"
                  : "none"),
                (e.p.style.opacity = 0)),
              h(e.o, "close"),
              e.v || t());
          } else n(f);
        });
      },
      K = function (n) {
        var e = (n === void 0 ? {} : n).target;
        return c.o ? g() : J({ target: e });
      },
      l = [],
      M = [],
      k = !1,
      R = 0,
      a = v,
      c = {};
    Object.prototype.toString.call(i) === "[object Object]"
      ? (a = i)
      : (i || typeof i == "string") && U(i);
    var N = (function (n) {
        var e = document.createElement("div");
        return (e.classList.add("medium-zoom-overlay"), (e.style.background = n), e);
      })(
        (a = z(
          { margin: 0, background: "#fff", scrollOffset: 40, container: null, template: null },
          a,
        )).background,
      ),
      f = {
        open: J,
        close: g,
        toggle: K,
        update: function (n) {
          n === void 0 && (n = {});
          var e = n;
          return (
            n.background && (N.style.background = n.background),
            n.container &&
              n.container instanceof Object &&
              (e.container = z({}, a.container, n.container)),
            n.template &&
              (e.template = I(n.template) ? n.template : document.querySelector(n.template)),
            (a = z({}, a, e)),
            l.forEach(function (t) {
              h(t, "update");
            }),
            f
          );
        },
        clone: function (n) {
          return te(z({}, a, n));
        },
        attach: U,
        detach: function () {
          c.v && g();
          for (var n = arguments.length, e = Array(n), t = 0; t < n; t++) e[t] = arguments[t];
          var r =
            e.length > 0
              ? e.reduce(function (o, p) {
                  return [].concat(o, ee(p));
                }, [])
              : l;
          return (
            r.forEach(function (o) {
              (o.classList.remove("medium-zoom-image"), h(o, "detach"));
            }),
            (l = l.filter(function (o) {
              return r.indexOf(o) === -1;
            })),
            H(),
            f
          );
        },
        on: function (n, e, t) {
          t === void 0 && (t = {});
          var r = "medium-zoom:" + n;
          return (
            l.forEach(function (o) {
              o.addEventListener(r, e, t);
            }),
            M.push({ type: r, listener: e, options: t }),
            f
          );
        },
        off: function (n, e, t) {
          t === void 0 && (t = {});
          var r = "medium-zoom:" + n;
          return (
            l.forEach(function (o) {
              o.removeEventListener(r, e, t);
            }),
            (M = M.filter(function (o) {
              return !(o.type === r && o.listener.toString() === e.toString());
            })),
            f
          );
        },
        getOptions: function () {
          return a;
        },
        getImages: function () {
          return l;
        },
        getZoomedImage: function () {
          return c.o || null;
        },
      };
    return f;
  };
if (typeof document < "u")
  ((P = document.createElement("style")),
    (P.textContent =
      ".medium-zoom-overlay{opacity:0;will-change:opacity;transition:opacity .3s;position:fixed;top:0;bottom:0;left:0;right:0}.medium-zoom--opened .medium-zoom-overlay{cursor:pointer;cursor:zoom-out;opacity:1}.medium-zoom-image{cursor:pointer;cursor:zoom-in;transition:transform .3s cubic-bezier(.2,0,.2,1)!important}.medium-zoom-image--hidden{visibility:hidden}.medium-zoom-image--opened{cursor:pointer;cursor:zoom-out;will-change:transform;position:relative}@media (prefers-reduced-motion:reduce){.medium-zoom-image,.medium-zoom-overlay{transition:none!important}}"),
    document.head.appendChild(P));
var P,
  ne = te;
var oe = ne("[data-zoomable]", { background: "#fff", margin: 24 });
oe.on("open", () => document.body.classList.add("is-zooming"));
oe.on("closed", () => document.body.classList.remove("is-zooming"));
