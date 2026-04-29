var e = Object.create,
  t = Object.defineProperty,
  n = Object.getOwnPropertyDescriptor,
  r = Object.getOwnPropertyNames,
  i = Object.getPrototypeOf,
  a = Object.prototype.hasOwnProperty,
  o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), (e = null)), t.exports),
  s = (e, i, o, s) => {
    if ((i && typeof i == `object`) || typeof i == `function`)
      for (var c = r(i), l = 0, u = c.length, d; l < u; l++)
        ((d = c[l]),
          !a.call(e, d) &&
            d !== o &&
            t(e, d, {
              get: ((e) => i[e]).bind(null, d),
              enumerable: !(s = n(i, d)) || s.enumerable
            }))
    return e
  },
  c = (n, r, a) => (
    (a = n == null ? {} : e(i(n))),
    s(r || !n || !n.__esModule ? t(a, `default`, { value: n, enumerable: !0 }) : a, n)
  )
;(function () {
  let e = document.createElement(`link`).relList
  if (e && e.supports && e.supports(`modulepreload`)) return
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e)
  new MutationObserver((e) => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes) e.tagName === `LINK` && e.rel === `modulepreload` && n(e)
  }).observe(document, { childList: !0, subtree: !0 })
  function t(e) {
    let t = {}
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      e.crossOrigin === `use-credentials`
        ? (t.credentials = `include`)
        : e.crossOrigin === `anonymous`
          ? (t.credentials = `omit`)
          : (t.credentials = `same-origin`),
      t
    )
  }
  function n(e) {
    if (e.ep) return
    e.ep = !0
    let n = t(e)
    fetch(e.href, n)
  }
})()
var l = o((e) => {
    function t(e, t) {
      var n = e.length
      e.push(t)
      a: for (; 0 < n; ) {
        var r = (n - 1) >>> 1,
          a = e[r]
        if (0 < i(a, t)) ((e[r] = t), (e[n] = a), (n = r))
        else break a
      }
    }
    function n(e) {
      return e.length === 0 ? null : e[0]
    }
    function r(e) {
      if (e.length === 0) return null
      var t = e[0],
        n = e.pop()
      if (n !== t) {
        e[0] = n
        a: for (var r = 0, a = e.length, o = a >>> 1; r < o; ) {
          var s = 2 * (r + 1) - 1,
            c = e[s],
            l = s + 1,
            u = e[l]
          if (0 > i(c, n))
            l < a && 0 > i(u, c)
              ? ((e[r] = u), (e[l] = n), (r = l))
              : ((e[r] = c), (e[s] = n), (r = s))
          else if (l < a && 0 > i(u, n)) ((e[r] = u), (e[l] = n), (r = l))
          else break a
        }
      }
      return t
    }
    function i(e, t) {
      var n = e.sortIndex - t.sortIndex
      return n === 0 ? e.id - t.id : n
    }
    if (
      ((e.unstable_now = void 0),
      typeof performance == `object` && typeof performance.now == `function`)
    ) {
      var a = performance
      e.unstable_now = function () {
        return a.now()
      }
    } else {
      var o = Date,
        s = o.now()
      e.unstable_now = function () {
        return o.now() - s
      }
    }
    var c = [],
      l = [],
      u = 1,
      d = null,
      f = 3,
      p = !1,
      m = !1,
      h = !1,
      g = !1,
      _ = typeof setTimeout == `function` ? setTimeout : null,
      v = typeof clearTimeout == `function` ? clearTimeout : null,
      y = typeof setImmediate < `u` ? setImmediate : null
    function b(e) {
      for (var i = n(l); i !== null; ) {
        if (i.callback === null) r(l)
        else if (i.startTime <= e) (r(l), (i.sortIndex = i.expirationTime), t(c, i))
        else break
        i = n(l)
      }
    }
    function x(e) {
      if (((h = !1), b(e), !m))
        if (n(c) !== null) ((m = !0), S || ((S = !0), O()))
        else {
          var t = n(l)
          t !== null && j(x, t.startTime - e)
        }
    }
    var S = !1,
      C = -1,
      w = 5,
      T = -1
    function E() {
      return g ? !0 : !(e.unstable_now() - T < w)
    }
    function D() {
      if (((g = !1), S)) {
        var t = e.unstable_now()
        T = t
        var i = !0
        try {
          a: {
            ;((m = !1), h && ((h = !1), v(C), (C = -1)), (p = !0))
            var a = f
            try {
              b: {
                for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E()); ) {
                  var o = d.callback
                  if (typeof o == `function`) {
                    ;((d.callback = null), (f = d.priorityLevel))
                    var s = o(d.expirationTime <= t)
                    if (((t = e.unstable_now()), typeof s == `function`)) {
                      ;((d.callback = s), b(t), (i = !0))
                      break b
                    }
                    ;(d === n(c) && r(c), b(t))
                  } else r(c)
                  d = n(c)
                }
                if (d !== null) i = !0
                else {
                  var u = n(l)
                  ;(u !== null && j(x, u.startTime - t), (i = !1))
                }
              }
              break a
            } finally {
              ;((d = null), (f = a), (p = !1))
            }
            i = void 0
          }
        } finally {
          i ? O() : (S = !1)
        }
      }
    }
    var O
    if (typeof y == `function`)
      O = function () {
        y(D)
      }
    else if (typeof MessageChannel < `u`) {
      var k = new MessageChannel(),
        A = k.port2
      ;((k.port1.onmessage = D),
        (O = function () {
          A.postMessage(null)
        }))
    } else
      O = function () {
        _(D, 0)
      }
    function j(t, n) {
      C = _(function () {
        t(e.unstable_now())
      }, n)
    }
    ;((e.unstable_IdlePriority = 5),
      (e.unstable_ImmediatePriority = 1),
      (e.unstable_LowPriority = 4),
      (e.unstable_NormalPriority = 3),
      (e.unstable_Profiling = null),
      (e.unstable_UserBlockingPriority = 2),
      (e.unstable_cancelCallback = function (e) {
        e.callback = null
      }),
      (e.unstable_forceFrameRate = function (e) {
        0 > e || 125 < e
          ? console.error(
              `forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported`
            )
          : (w = 0 < e ? Math.floor(1e3 / e) : 5)
      }),
      (e.unstable_getCurrentPriorityLevel = function () {
        return f
      }),
      (e.unstable_next = function (e) {
        switch (f) {
          case 1:
          case 2:
          case 3:
            var t = 3
            break
          default:
            t = f
        }
        var n = f
        f = t
        try {
          return e()
        } finally {
          f = n
        }
      }),
      (e.unstable_requestPaint = function () {
        g = !0
      }),
      (e.unstable_runWithPriority = function (e, t) {
        switch (e) {
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
            break
          default:
            e = 3
        }
        var n = f
        f = e
        try {
          return t()
        } finally {
          f = n
        }
      }),
      (e.unstable_scheduleCallback = function (r, i, a) {
        var o = e.unstable_now()
        switch (
          (typeof a == `object` && a
            ? ((a = a.delay), (a = typeof a == `number` && 0 < a ? o + a : o))
            : (a = o),
          r)
        ) {
          case 1:
            var s = -1
            break
          case 2:
            s = 250
            break
          case 5:
            s = 1073741823
            break
          case 4:
            s = 1e4
            break
          default:
            s = 5e3
        }
        return (
          (s = a + s),
          (r = {
            id: u++,
            callback: i,
            priorityLevel: r,
            startTime: a,
            expirationTime: s,
            sortIndex: -1
          }),
          a > o
            ? ((r.sortIndex = a),
              t(l, r),
              n(c) === null && r === n(l) && (h ? (v(C), (C = -1)) : (h = !0), j(x, a - o)))
            : ((r.sortIndex = s), t(c, r), m || p || ((m = !0), S || ((S = !0), O()))),
          r
        )
      }),
      (e.unstable_shouldYield = E),
      (e.unstable_wrapCallback = function (e) {
        var t = f
        return function () {
          var n = f
          f = t
          try {
            return e.apply(this, arguments)
          } finally {
            f = n
          }
        }
      }))
  }),
  u = o((e, t) => {
    t.exports = l()
  }),
  d = o((e) => {
    var t = Symbol.for(`react.transitional.element`),
      n = Symbol.for(`react.portal`),
      r = Symbol.for(`react.fragment`),
      i = Symbol.for(`react.strict_mode`),
      a = Symbol.for(`react.profiler`),
      o = Symbol.for(`react.consumer`),
      s = Symbol.for(`react.context`),
      c = Symbol.for(`react.forward_ref`),
      l = Symbol.for(`react.suspense`),
      u = Symbol.for(`react.memo`),
      d = Symbol.for(`react.lazy`),
      f = Symbol.for(`react.activity`),
      p = Symbol.iterator
    function m(e) {
      return typeof e != `object` || !e
        ? null
        : ((e = (p && e[p]) || e[`@@iterator`]), typeof e == `function` ? e : null)
    }
    var h = {
        isMounted: function () {
          return !1
        },
        enqueueForceUpdate: function () {},
        enqueueReplaceState: function () {},
        enqueueSetState: function () {}
      },
      g = Object.assign,
      _ = {}
    function v(e, t, n) {
      ;((this.props = e), (this.context = t), (this.refs = _), (this.updater = n || h))
    }
    ;((v.prototype.isReactComponent = {}),
      (v.prototype.setState = function (e, t) {
        if (typeof e != `object` && typeof e != `function` && e != null)
          throw Error(
            `takes an object of state variables to update or a function which returns an object of state variables.`
          )
        this.updater.enqueueSetState(this, e, t, `setState`)
      }),
      (v.prototype.forceUpdate = function (e) {
        this.updater.enqueueForceUpdate(this, e, `forceUpdate`)
      }))
    function y() {}
    y.prototype = v.prototype
    function b(e, t, n) {
      ;((this.props = e), (this.context = t), (this.refs = _), (this.updater = n || h))
    }
    var x = (b.prototype = new y())
    ;((x.constructor = b), g(x, v.prototype), (x.isPureReactComponent = !0))
    var S = Array.isArray
    function C() {}
    var w = { H: null, A: null, T: null, S: null },
      T = Object.prototype.hasOwnProperty
    function E(e, n, r) {
      var i = r.ref
      return { $$typeof: t, type: e, key: n, ref: i === void 0 ? null : i, props: r }
    }
    function D(e, t) {
      return E(e.type, t, e.props)
    }
    function O(e) {
      return typeof e == `object` && !!e && e.$$typeof === t
    }
    function k(e) {
      var t = { '=': `=0`, ':': `=2` }
      return (
        `$` +
        e.replace(/[=:]/g, function (e) {
          return t[e]
        })
      )
    }
    var A = /\/+/g
    function j(e, t) {
      return typeof e == `object` && e && e.key != null ? k(`` + e.key) : t.toString(36)
    }
    function M(e) {
      switch (e.status) {
        case `fulfilled`:
          return e.value
        case `rejected`:
          throw e.reason
        default:
          switch (
            (typeof e.status == `string`
              ? e.then(C, C)
              : ((e.status = `pending`),
                e.then(
                  function (t) {
                    e.status === `pending` && ((e.status = `fulfilled`), (e.value = t))
                  },
                  function (t) {
                    e.status === `pending` && ((e.status = `rejected`), (e.reason = t))
                  }
                )),
            e.status)
          ) {
            case `fulfilled`:
              return e.value
            case `rejected`:
              throw e.reason
          }
      }
      throw e
    }
    function N(e, r, i, a, o) {
      var s = typeof e
      ;(s === `undefined` || s === `boolean`) && (e = null)
      var c = !1
      if (e === null) c = !0
      else
        switch (s) {
          case `bigint`:
          case `string`:
          case `number`:
            c = !0
            break
          case `object`:
            switch (e.$$typeof) {
              case t:
              case n:
                c = !0
                break
              case d:
                return ((c = e._init), N(c(e._payload), r, i, a, o))
            }
        }
      if (c)
        return (
          (o = o(e)),
          (c = a === `` ? `.` + j(e, 0) : a),
          S(o)
            ? ((i = ``),
              c != null && (i = c.replace(A, `$&/`) + `/`),
              N(o, r, i, ``, function (e) {
                return e
              }))
            : o != null &&
              (O(o) &&
                (o = D(
                  o,
                  i +
                    (o.key == null || (e && e.key === o.key)
                      ? ``
                      : (`` + o.key).replace(A, `$&/`) + `/`) +
                    c
                )),
              r.push(o)),
          1
        )
      c = 0
      var l = a === `` ? `.` : a + `:`
      if (S(e))
        for (var u = 0; u < e.length; u++) ((a = e[u]), (s = l + j(a, u)), (c += N(a, r, i, s, o)))
      else if (((u = m(e)), typeof u == `function`))
        for (e = u.call(e), u = 0; !(a = e.next()).done; )
          ((a = a.value), (s = l + j(a, u++)), (c += N(a, r, i, s, o)))
      else if (s === `object`) {
        if (typeof e.then == `function`) return N(M(e), r, i, a, o)
        throw (
          (r = String(e)),
          Error(
            `Objects are not valid as a React child (found: ` +
              (r === `[object Object]`
                ? `object with keys {` + Object.keys(e).join(`, `) + `}`
                : r) +
              `). If you meant to render a collection of children, use an array instead.`
          )
        )
      }
      return c
    }
    function ee(e, t, n) {
      if (e == null) return e
      var r = [],
        i = 0
      return (
        N(e, r, ``, ``, function (e) {
          return t.call(n, e, i++)
        }),
        r
      )
    }
    function P(e) {
      if (e._status === -1) {
        var t = e._result
        ;((t = t()),
          t.then(
            function (t) {
              ;(e._status === 0 || e._status === -1) && ((e._status = 1), (e._result = t))
            },
            function (t) {
              ;(e._status === 0 || e._status === -1) && ((e._status = 2), (e._result = t))
            }
          ),
          e._status === -1 && ((e._status = 0), (e._result = t)))
      }
      if (e._status === 1) return e._result.default
      throw e._result
    }
    var F =
        typeof reportError == `function`
          ? reportError
          : function (e) {
              if (typeof window == `object` && typeof window.ErrorEvent == `function`) {
                var t = new window.ErrorEvent(`error`, {
                  bubbles: !0,
                  cancelable: !0,
                  message:
                    typeof e == `object` && e && typeof e.message == `string`
                      ? String(e.message)
                      : String(e),
                  error: e
                })
                if (!window.dispatchEvent(t)) return
              } else if (typeof process == `object` && typeof process.emit == `function`) {
                process.emit(`uncaughtException`, e)
                return
              }
              console.error(e)
            },
      I = {
        map: ee,
        forEach: function (e, t, n) {
          ee(
            e,
            function () {
              t.apply(this, arguments)
            },
            n
          )
        },
        count: function (e) {
          var t = 0
          return (
            ee(e, function () {
              t++
            }),
            t
          )
        },
        toArray: function (e) {
          return (
            ee(e, function (e) {
              return e
            }) || []
          )
        },
        only: function (e) {
          if (!O(e))
            throw Error(`React.Children.only expected to receive a single React element child.`)
          return e
        }
      }
    ;((e.Activity = f),
      (e.Children = I),
      (e.Component = v),
      (e.Fragment = r),
      (e.Profiler = a),
      (e.PureComponent = b),
      (e.StrictMode = i),
      (e.Suspense = l),
      (e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = w),
      (e.__COMPILER_RUNTIME = {
        __proto__: null,
        c: function (e) {
          return w.H.useMemoCache(e)
        }
      }),
      (e.cache = function (e) {
        return function () {
          return e.apply(null, arguments)
        }
      }),
      (e.cacheSignal = function () {
        return null
      }),
      (e.cloneElement = function (e, t, n) {
        if (e == null)
          throw Error(`The argument must be a React element, but you passed ` + e + `.`)
        var r = g({}, e.props),
          i = e.key
        if (t != null)
          for (a in (t.key !== void 0 && (i = `` + t.key), t))
            !T.call(t, a) ||
              a === `key` ||
              a === `__self` ||
              a === `__source` ||
              (a === `ref` && t.ref === void 0) ||
              (r[a] = t[a])
        var a = arguments.length - 2
        if (a === 1) r.children = n
        else if (1 < a) {
          for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2]
          r.children = o
        }
        return E(e.type, i, r)
      }),
      (e.createContext = function (e) {
        return (
          (e = {
            $$typeof: s,
            _currentValue: e,
            _currentValue2: e,
            _threadCount: 0,
            Provider: null,
            Consumer: null
          }),
          (e.Provider = e),
          (e.Consumer = { $$typeof: o, _context: e }),
          e
        )
      }),
      (e.createElement = function (e, t, n) {
        var r,
          i = {},
          a = null
        if (t != null)
          for (r in (t.key !== void 0 && (a = `` + t.key), t))
            T.call(t, r) && r !== `key` && r !== `__self` && r !== `__source` && (i[r] = t[r])
        var o = arguments.length - 2
        if (o === 1) i.children = n
        else if (1 < o) {
          for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2]
          i.children = s
        }
        if (e && e.defaultProps)
          for (r in ((o = e.defaultProps), o)) i[r] === void 0 && (i[r] = o[r])
        return E(e, a, i)
      }),
      (e.createRef = function () {
        return { current: null }
      }),
      (e.forwardRef = function (e) {
        return { $$typeof: c, render: e }
      }),
      (e.isValidElement = O),
      (e.lazy = function (e) {
        return { $$typeof: d, _payload: { _status: -1, _result: e }, _init: P }
      }),
      (e.memo = function (e, t) {
        return { $$typeof: u, type: e, compare: t === void 0 ? null : t }
      }),
      (e.startTransition = function (e) {
        var t = w.T,
          n = {}
        w.T = n
        try {
          var r = e(),
            i = w.S
          ;(i !== null && i(n, r),
            typeof r == `object` && r && typeof r.then == `function` && r.then(C, F))
        } catch (e) {
          F(e)
        } finally {
          ;(t !== null && n.types !== null && (t.types = n.types), (w.T = t))
        }
      }),
      (e.unstable_useCacheRefresh = function () {
        return w.H.useCacheRefresh()
      }),
      (e.use = function (e) {
        return w.H.use(e)
      }),
      (e.useActionState = function (e, t, n) {
        return w.H.useActionState(e, t, n)
      }),
      (e.useCallback = function (e, t) {
        return w.H.useCallback(e, t)
      }),
      (e.useContext = function (e) {
        return w.H.useContext(e)
      }),
      (e.useDebugValue = function () {}),
      (e.useDeferredValue = function (e, t) {
        return w.H.useDeferredValue(e, t)
      }),
      (e.useEffect = function (e, t) {
        return w.H.useEffect(e, t)
      }),
      (e.useEffectEvent = function (e) {
        return w.H.useEffectEvent(e)
      }),
      (e.useId = function () {
        return w.H.useId()
      }),
      (e.useImperativeHandle = function (e, t, n) {
        return w.H.useImperativeHandle(e, t, n)
      }),
      (e.useInsertionEffect = function (e, t) {
        return w.H.useInsertionEffect(e, t)
      }),
      (e.useLayoutEffect = function (e, t) {
        return w.H.useLayoutEffect(e, t)
      }),
      (e.useMemo = function (e, t) {
        return w.H.useMemo(e, t)
      }),
      (e.useOptimistic = function (e, t) {
        return w.H.useOptimistic(e, t)
      }),
      (e.useReducer = function (e, t, n) {
        return w.H.useReducer(e, t, n)
      }),
      (e.useRef = function (e) {
        return w.H.useRef(e)
      }),
      (e.useState = function (e) {
        return w.H.useState(e)
      }),
      (e.useSyncExternalStore = function (e, t, n) {
        return w.H.useSyncExternalStore(e, t, n)
      }),
      (e.useTransition = function () {
        return w.H.useTransition()
      }),
      (e.version = `19.2.5`))
  }),
  f = o((e, t) => {
    t.exports = d()
  }),
  p = o((e) => {
    var t = f()
    function n(e) {
      var t = `https://react.dev/errors/` + e
      if (1 < arguments.length) {
        t += `?args[]=` + encodeURIComponent(arguments[1])
        for (var n = 2; n < arguments.length; n++)
          t += `&args[]=` + encodeURIComponent(arguments[n])
      }
      return (
        `Minified React error #` +
        e +
        `; visit ` +
        t +
        ` for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`
      )
    }
    function r() {}
    var i = {
        d: {
          f: r,
          r: function () {
            throw Error(n(522))
          },
          D: r,
          C: r,
          L: r,
          m: r,
          X: r,
          S: r,
          M: r
        },
        p: 0,
        findDOMNode: null
      },
      a = Symbol.for(`react.portal`)
    function o(e, t, n) {
      var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null
      return {
        $$typeof: a,
        key: r == null ? null : `` + r,
        children: e,
        containerInfo: t,
        implementation: n
      }
    }
    var s = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
    function c(e, t) {
      if (e === `font`) return ``
      if (typeof t == `string`) return t === `use-credentials` ? t : ``
    }
    ;((e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = i),
      (e.createPortal = function (e, t) {
        var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null
        if (!t || (t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11)) throw Error(n(299))
        return o(e, t, null, r)
      }),
      (e.flushSync = function (e) {
        var t = s.T,
          n = i.p
        try {
          if (((s.T = null), (i.p = 2), e)) return e()
        } finally {
          ;((s.T = t), (i.p = n), i.d.f())
        }
      }),
      (e.preconnect = function (e, t) {
        typeof e == `string` &&
          (t
            ? ((t = t.crossOrigin),
              (t = typeof t == `string` ? (t === `use-credentials` ? t : ``) : void 0))
            : (t = null),
          i.d.C(e, t))
      }),
      (e.prefetchDNS = function (e) {
        typeof e == `string` && i.d.D(e)
      }),
      (e.preinit = function (e, t) {
        if (typeof e == `string` && t && typeof t.as == `string`) {
          var n = t.as,
            r = c(n, t.crossOrigin),
            a = typeof t.integrity == `string` ? t.integrity : void 0,
            o = typeof t.fetchPriority == `string` ? t.fetchPriority : void 0
          n === `style`
            ? i.d.S(e, typeof t.precedence == `string` ? t.precedence : void 0, {
                crossOrigin: r,
                integrity: a,
                fetchPriority: o
              })
            : n === `script` &&
              i.d.X(e, {
                crossOrigin: r,
                integrity: a,
                fetchPriority: o,
                nonce: typeof t.nonce == `string` ? t.nonce : void 0
              })
        }
      }),
      (e.preinitModule = function (e, t) {
        if (typeof e == `string`)
          if (typeof t == `object` && t) {
            if (t.as == null || t.as === `script`) {
              var n = c(t.as, t.crossOrigin)
              i.d.M(e, {
                crossOrigin: n,
                integrity: typeof t.integrity == `string` ? t.integrity : void 0,
                nonce: typeof t.nonce == `string` ? t.nonce : void 0
              })
            }
          } else t ?? i.d.M(e)
      }),
      (e.preload = function (e, t) {
        if (typeof e == `string` && typeof t == `object` && t && typeof t.as == `string`) {
          var n = t.as,
            r = c(n, t.crossOrigin)
          i.d.L(e, n, {
            crossOrigin: r,
            integrity: typeof t.integrity == `string` ? t.integrity : void 0,
            nonce: typeof t.nonce == `string` ? t.nonce : void 0,
            type: typeof t.type == `string` ? t.type : void 0,
            fetchPriority: typeof t.fetchPriority == `string` ? t.fetchPriority : void 0,
            referrerPolicy: typeof t.referrerPolicy == `string` ? t.referrerPolicy : void 0,
            imageSrcSet: typeof t.imageSrcSet == `string` ? t.imageSrcSet : void 0,
            imageSizes: typeof t.imageSizes == `string` ? t.imageSizes : void 0,
            media: typeof t.media == `string` ? t.media : void 0
          })
        }
      }),
      (e.preloadModule = function (e, t) {
        if (typeof e == `string`)
          if (t) {
            var n = c(t.as, t.crossOrigin)
            i.d.m(e, {
              as: typeof t.as == `string` && t.as !== `script` ? t.as : void 0,
              crossOrigin: n,
              integrity: typeof t.integrity == `string` ? t.integrity : void 0
            })
          } else i.d.m(e)
      }),
      (e.requestFormReset = function (e) {
        i.d.r(e)
      }),
      (e.unstable_batchedUpdates = function (e, t) {
        return e(t)
      }),
      (e.useFormState = function (e, t, n) {
        return s.H.useFormState(e, t, n)
      }),
      (e.useFormStatus = function () {
        return s.H.useHostTransitionStatus()
      }),
      (e.version = `19.2.5`))
  }),
  m = o((e, t) => {
    function n() {
      if (
        !(
          typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > `u` ||
          typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != `function`
        )
      )
        try {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n)
        } catch (e) {
          console.error(e)
        }
    }
    ;(n(), (t.exports = p()))
  }),
  h = o((e) => {
    var t = u(),
      n = f(),
      r = m()
    function i(e) {
      var t = `https://react.dev/errors/` + e
      if (1 < arguments.length) {
        t += `?args[]=` + encodeURIComponent(arguments[1])
        for (var n = 2; n < arguments.length; n++)
          t += `&args[]=` + encodeURIComponent(arguments[n])
      }
      return (
        `Minified React error #` +
        e +
        `; visit ` +
        t +
        ` for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`
      )
    }
    function a(e) {
      return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11))
    }
    function o(e) {
      var t = e,
        n = e
      if (e.alternate) for (; t.return; ) t = t.return
      else {
        e = t
        do ((t = e), t.flags & 4098 && (n = t.return), (e = t.return))
        while (e)
      }
      return t.tag === 3 ? n : null
    }
    function s(e) {
      if (e.tag === 13) {
        var t = e.memoizedState
        if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
          return t.dehydrated
      }
      return null
    }
    function c(e) {
      if (e.tag === 31) {
        var t = e.memoizedState
        if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
          return t.dehydrated
      }
      return null
    }
    function l(e) {
      if (o(e) !== e) throw Error(i(188))
    }
    function d(e) {
      var t = e.alternate
      if (!t) {
        if (((t = o(e)), t === null)) throw Error(i(188))
        return t === e ? e : null
      }
      for (var n = e, r = t; ; ) {
        var a = n.return
        if (a === null) break
        var s = a.alternate
        if (s === null) {
          if (((r = a.return), r !== null)) {
            n = r
            continue
          }
          break
        }
        if (a.child === s.child) {
          for (s = a.child; s; ) {
            if (s === n) return (l(a), e)
            if (s === r) return (l(a), t)
            s = s.sibling
          }
          throw Error(i(188))
        }
        if (n.return !== r.return) ((n = a), (r = s))
        else {
          for (var c = !1, u = a.child; u; ) {
            if (u === n) {
              ;((c = !0), (n = a), (r = s))
              break
            }
            if (u === r) {
              ;((c = !0), (r = a), (n = s))
              break
            }
            u = u.sibling
          }
          if (!c) {
            for (u = s.child; u; ) {
              if (u === n) {
                ;((c = !0), (n = s), (r = a))
                break
              }
              if (u === r) {
                ;((c = !0), (r = s), (n = a))
                break
              }
              u = u.sibling
            }
            if (!c) throw Error(i(189))
          }
        }
        if (n.alternate !== r) throw Error(i(190))
      }
      if (n.tag !== 3) throw Error(i(188))
      return n.stateNode.current === n ? e : t
    }
    function p(e) {
      var t = e.tag
      if (t === 5 || t === 26 || t === 27 || t === 6) return e
      for (e = e.child; e !== null; ) {
        if (((t = p(e)), t !== null)) return t
        e = e.sibling
      }
      return null
    }
    var h = Object.assign,
      g = Symbol.for(`react.element`),
      _ = Symbol.for(`react.transitional.element`),
      v = Symbol.for(`react.portal`),
      y = Symbol.for(`react.fragment`),
      b = Symbol.for(`react.strict_mode`),
      x = Symbol.for(`react.profiler`),
      S = Symbol.for(`react.consumer`),
      C = Symbol.for(`react.context`),
      w = Symbol.for(`react.forward_ref`),
      T = Symbol.for(`react.suspense`),
      E = Symbol.for(`react.suspense_list`),
      D = Symbol.for(`react.memo`),
      O = Symbol.for(`react.lazy`),
      k = Symbol.for(`react.activity`),
      A = Symbol.for(`react.memo_cache_sentinel`),
      j = Symbol.iterator
    function M(e) {
      return typeof e != `object` || !e
        ? null
        : ((e = (j && e[j]) || e[`@@iterator`]), typeof e == `function` ? e : null)
    }
    var N = Symbol.for(`react.client.reference`)
    function ee(e) {
      if (e == null) return null
      if (typeof e == `function`) return e.$$typeof === N ? null : e.displayName || e.name || null
      if (typeof e == `string`) return e
      switch (e) {
        case y:
          return `Fragment`
        case x:
          return `Profiler`
        case b:
          return `StrictMode`
        case T:
          return `Suspense`
        case E:
          return `SuspenseList`
        case k:
          return `Activity`
      }
      if (typeof e == `object`)
        switch (e.$$typeof) {
          case v:
            return `Portal`
          case C:
            return e.displayName || `Context`
          case S:
            return (e._context.displayName || `Context`) + `.Consumer`
          case w:
            var t = e.render
            return (
              (e = e.displayName),
              (e ||=
                ((e = t.displayName || t.name || ``),
                e === `` ? `ForwardRef` : `ForwardRef(` + e + `)`)),
              e
            )
          case D:
            return ((t = e.displayName || null), t === null ? ee(e.type) || `Memo` : t)
          case O:
            ;((t = e._payload), (e = e._init))
            try {
              return ee(e(t))
            } catch {}
        }
      return null
    }
    var P = Array.isArray,
      F = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      I = r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      te = { pending: !1, data: null, method: null, action: null },
      ne = [],
      re = -1
    function L(e) {
      return { current: e }
    }
    function R(e) {
      0 > re || ((e.current = ne[re]), (ne[re] = null), re--)
    }
    function z(e, t) {
      ;(re++, (ne[re] = e.current), (e.current = t))
    }
    var ie = L(null),
      B = L(null),
      ae = L(null),
      oe = L(null)
    function se(e, t) {
      switch ((z(ae, t), z(B, e), z(ie, null), t.nodeType)) {
        case 9:
        case 11:
          e = (e = t.documentElement) && (e = e.namespaceURI) ? Vd(e) : 0
          break
        default:
          if (((e = t.tagName), (t = t.namespaceURI))) ((t = Vd(t)), (e = Hd(t, e)))
          else
            switch (e) {
              case `svg`:
                e = 1
                break
              case `math`:
                e = 2
                break
              default:
                e = 0
            }
      }
      ;(R(ie), z(ie, e))
    }
    function ce() {
      ;(R(ie), R(B), R(ae))
    }
    function le(e) {
      e.memoizedState !== null && z(oe, e)
      var t = ie.current,
        n = Hd(t, e.type)
      t !== n && (z(B, e), z(ie, n))
    }
    function ue(e) {
      ;(B.current === e && (R(ie), R(B)), oe.current === e && (R(oe), (Qf._currentValue = te)))
    }
    var de, fe
    function pe(e) {
      if (de === void 0)
        try {
          throw Error()
        } catch (e) {
          var t = e.stack.trim().match(/\n( *(at )?)/)
          ;((de = (t && t[1]) || ``),
            (fe =
              -1 <
              e.stack.indexOf(`
    at`)
                ? ` (<anonymous>)`
                : -1 < e.stack.indexOf(`@`)
                  ? `@unknown:0:0`
                  : ``))
        }
      return (
        `
` +
        de +
        e +
        fe
      )
    }
    var me = !1
    function he(e, t) {
      if (!e || me) return ``
      me = !0
      var n = Error.prepareStackTrace
      Error.prepareStackTrace = void 0
      try {
        var r = {
          DetermineComponentFrameRoot: function () {
            try {
              if (t) {
                var n = function () {
                  throw Error()
                }
                if (
                  (Object.defineProperty(n.prototype, `props`, {
                    set: function () {
                      throw Error()
                    }
                  }),
                  typeof Reflect == `object` && Reflect.construct)
                ) {
                  try {
                    Reflect.construct(n, [])
                  } catch (e) {
                    var r = e
                  }
                  Reflect.construct(e, [], n)
                } else {
                  try {
                    n.call()
                  } catch (e) {
                    r = e
                  }
                  e.call(n.prototype)
                }
              } else {
                try {
                  throw Error()
                } catch (e) {
                  r = e
                }
                ;(n = e()) && typeof n.catch == `function` && n.catch(function () {})
              }
            } catch (e) {
              if (e && r && typeof e.stack == `string`) return [e.stack, r.stack]
            }
            return [null, null]
          }
        }
        r.DetermineComponentFrameRoot.displayName = `DetermineComponentFrameRoot`
        var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, `name`)
        i &&
          i.configurable &&
          Object.defineProperty(r.DetermineComponentFrameRoot, `name`, {
            value: `DetermineComponentFrameRoot`
          })
        var a = r.DetermineComponentFrameRoot(),
          o = a[0],
          s = a[1]
        if (o && s) {
          var c = o.split(`
`),
            l = s.split(`
`)
          for (i = r = 0; r < c.length && !c[r].includes(`DetermineComponentFrameRoot`); ) r++
          for (; i < l.length && !l[i].includes(`DetermineComponentFrameRoot`); ) i++
          if (r === c.length || i === l.length)
            for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i]; ) i--
          for (; 1 <= r && 0 <= i; r--, i--)
            if (c[r] !== l[i]) {
              if (r !== 1 || i !== 1)
                do
                  if ((r--, i--, 0 > i || c[r] !== l[i])) {
                    var u =
                      `
` + c[r].replace(` at new `, ` at `)
                    return (
                      e.displayName &&
                        u.includes(`<anonymous>`) &&
                        (u = u.replace(`<anonymous>`, e.displayName)),
                      u
                    )
                  }
                while (1 <= r && 0 <= i)
              break
            }
        }
      } finally {
        ;((me = !1), (Error.prepareStackTrace = n))
      }
      return (n = e ? e.displayName || e.name : ``) ? pe(n) : ``
    }
    function ge(e, t) {
      switch (e.tag) {
        case 26:
        case 27:
        case 5:
          return pe(e.type)
        case 16:
          return pe(`Lazy`)
        case 13:
          return e.child !== t && t !== null ? pe(`Suspense Fallback`) : pe(`Suspense`)
        case 19:
          return pe(`SuspenseList`)
        case 0:
        case 15:
          return he(e.type, !1)
        case 11:
          return he(e.type.render, !1)
        case 1:
          return he(e.type, !0)
        case 31:
          return pe(`Activity`)
        default:
          return ``
      }
    }
    function _e(e) {
      try {
        var t = ``,
          n = null
        do ((t += ge(e, n)), (n = e), (e = e.return))
        while (e)
        return t
      } catch (e) {
        return (
          `
Error generating stack: ` +
          e.message +
          `
` +
          e.stack
        )
      }
    }
    var ve = Object.prototype.hasOwnProperty,
      ye = t.unstable_scheduleCallback,
      be = t.unstable_cancelCallback,
      xe = t.unstable_shouldYield,
      Se = t.unstable_requestPaint,
      Ce = t.unstable_now,
      we = t.unstable_getCurrentPriorityLevel,
      Te = t.unstable_ImmediatePriority,
      Ee = t.unstable_UserBlockingPriority,
      De = t.unstable_NormalPriority,
      Oe = t.unstable_LowPriority,
      ke = t.unstable_IdlePriority,
      Ae = t.log,
      je = t.unstable_setDisableYieldValue,
      Me = null,
      Ne = null
    function Pe(e) {
      if ((typeof Ae == `function` && je(e), Ne && typeof Ne.setStrictMode == `function`))
        try {
          Ne.setStrictMode(Me, e)
        } catch {}
    }
    var Fe = Math.clz32 ? Math.clz32 : Re,
      Ie = Math.log,
      Le = Math.LN2
    function Re(e) {
      return ((e >>>= 0), e === 0 ? 32 : (31 - ((Ie(e) / Le) | 0)) | 0)
    }
    var ze = 256,
      Be = 262144,
      Ve = 4194304
    function He(e) {
      var t = e & 42
      if (t !== 0) return t
      switch (e & -e) {
        case 1:
          return 1
        case 2:
          return 2
        case 4:
          return 4
        case 8:
          return 8
        case 16:
          return 16
        case 32:
          return 32
        case 64:
          return 64
        case 128:
          return 128
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
          return e & 261888
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return e & 3932160
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return e & 62914560
        case 67108864:
          return 67108864
        case 134217728:
          return 134217728
        case 268435456:
          return 268435456
        case 536870912:
          return 536870912
        case 1073741824:
          return 0
        default:
          return e
      }
    }
    function V(e, t, n) {
      var r = e.pendingLanes
      if (r === 0) return 0
      var i = 0,
        a = e.suspendedLanes,
        o = e.pingedLanes
      e = e.warmLanes
      var s = r & 134217727
      return (
        s === 0
          ? ((s = r & ~a),
            s === 0
              ? o === 0
                ? n || ((n = r & ~e), n !== 0 && (i = He(n)))
                : (i = He(o))
              : (i = He(s)))
          : ((r = s & ~a),
            r === 0
              ? ((o &= s), o === 0 ? n || ((n = s & ~e), n !== 0 && (i = He(n))) : (i = He(o)))
              : (i = He(r))),
        i === 0
          ? 0
          : t !== 0 &&
              t !== i &&
              (t & a) === 0 &&
              ((a = i & -i), (n = t & -t), a >= n || (a === 32 && n & 4194048))
            ? t
            : i
      )
    }
    function Ue(e, t) {
      return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0
    }
    function We(e, t) {
      switch (e) {
        case 1:
        case 2:
        case 4:
        case 8:
        case 64:
          return t + 250
        case 16:
        case 32:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return t + 5e3
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return -1
        case 67108864:
        case 134217728:
        case 268435456:
        case 536870912:
        case 1073741824:
          return -1
        default:
          return -1
      }
    }
    function Ge() {
      var e = Ve
      return ((Ve <<= 1), !(Ve & 62914560) && (Ve = 4194304), e)
    }
    function Ke(e) {
      for (var t = [], n = 0; 31 > n; n++) t.push(e)
      return t
    }
    function qe(e, t) {
      ;((e.pendingLanes |= t),
        t !== 268435456 && ((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0)))
    }
    function Je(e, t, n, r, i, a) {
      var o = e.pendingLanes
      ;((e.pendingLanes = n),
        (e.suspendedLanes = 0),
        (e.pingedLanes = 0),
        (e.warmLanes = 0),
        (e.expiredLanes &= n),
        (e.entangledLanes &= n),
        (e.errorRecoveryDisabledLanes &= n),
        (e.shellSuspendCounter = 0))
      var s = e.entanglements,
        c = e.expirationTimes,
        l = e.hiddenUpdates
      for (n = o & ~n; 0 < n; ) {
        var u = 31 - Fe(n),
          d = 1 << u
        ;((s[u] = 0), (c[u] = -1))
        var f = l[u]
        if (f !== null)
          for (l[u] = null, u = 0; u < f.length; u++) {
            var p = f[u]
            p !== null && (p.lane &= -536870913)
          }
        n &= ~d
      }
      ;(r !== 0 && Ye(e, r, 0),
        a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t)))
    }
    function Ye(e, t, n) {
      ;((e.pendingLanes |= t), (e.suspendedLanes &= ~t))
      var r = 31 - Fe(t)
      ;((e.entangledLanes |= t),
        (e.entanglements[r] = e.entanglements[r] | 1073741824 | (n & 261930)))
    }
    function Xe(e, t) {
      var n = (e.entangledLanes |= t)
      for (e = e.entanglements; n; ) {
        var r = 31 - Fe(n),
          i = 1 << r
        ;((i & t) | (e[r] & t) && (e[r] |= t), (n &= ~i))
      }
    }
    function Ze(e, t) {
      var n = t & -t
      return ((n = n & 42 ? 1 : Qe(n)), (n & (e.suspendedLanes | t)) === 0 ? n : 0)
    }
    function Qe(e) {
      switch (e) {
        case 2:
          e = 1
          break
        case 8:
          e = 4
          break
        case 32:
          e = 16
          break
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          e = 128
          break
        case 268435456:
          e = 134217728
          break
        default:
          e = 0
      }
      return e
    }
    function $e(e) {
      return ((e &= -e), 2 < e ? (8 < e ? (e & 134217727 ? 32 : 268435456) : 8) : 2)
    }
    function et() {
      var e = I.p
      return e === 0 ? ((e = window.event), e === void 0 ? 32 : mp(e.type)) : e
    }
    function tt(e, t) {
      var n = I.p
      try {
        return ((I.p = e), t())
      } finally {
        I.p = n
      }
    }
    var nt = Math.random().toString(36).slice(2),
      rt = `__reactFiber$` + nt,
      it = `__reactProps$` + nt,
      at = `__reactContainer$` + nt,
      ot = `__reactEvents$` + nt,
      st = `__reactListeners$` + nt,
      ct = `__reactHandles$` + nt,
      lt = `__reactResources$` + nt,
      H = `__reactMarker$` + nt
    function ut(e) {
      ;(delete e[rt], delete e[it], delete e[ot], delete e[st], delete e[ct])
    }
    function dt(e) {
      var t = e[rt]
      if (t) return t
      for (var n = e.parentNode; n; ) {
        if ((t = n[at] || n[rt])) {
          if (((n = t.alternate), t.child !== null || (n !== null && n.child !== null)))
            for (e = df(e); e !== null; ) {
              if ((n = e[rt])) return n
              e = df(e)
            }
          return t
        }
        ;((e = n), (n = e.parentNode))
      }
      return null
    }
    function ft(e) {
      if ((e = e[rt] || e[at])) {
        var t = e.tag
        if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e
      }
      return null
    }
    function U(e) {
      var t = e.tag
      if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode
      throw Error(i(33))
    }
    function pt(e) {
      var t = e[lt]
      return ((t ||= e[lt] = { hoistableStyles: new Map(), hoistableScripts: new Map() }), t)
    }
    function mt(e) {
      e[H] = !0
    }
    var ht = new Set(),
      gt = {}
    function _t(e, t) {
      ;(vt(e, t), vt(e + `Capture`, t))
    }
    function vt(e, t) {
      for (gt[e] = t, e = 0; e < t.length; e++) ht.add(t[e])
    }
    var yt = RegExp(
        `^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$`
      ),
      bt = {},
      xt = {}
    function St(e) {
      return ve.call(xt, e)
        ? !0
        : ve.call(bt, e)
          ? !1
          : yt.test(e)
            ? (xt[e] = !0)
            : ((bt[e] = !0), !1)
    }
    function Ct(e, t, n) {
      if (St(t))
        if (n === null) e.removeAttribute(t)
        else {
          switch (typeof n) {
            case `undefined`:
            case `function`:
            case `symbol`:
              e.removeAttribute(t)
              return
            case `boolean`:
              var r = t.toLowerCase().slice(0, 5)
              if (r !== `data-` && r !== `aria-`) {
                e.removeAttribute(t)
                return
              }
          }
          e.setAttribute(t, `` + n)
        }
    }
    function wt(e, t, n) {
      if (n === null) e.removeAttribute(t)
      else {
        switch (typeof n) {
          case `undefined`:
          case `function`:
          case `symbol`:
          case `boolean`:
            e.removeAttribute(t)
            return
        }
        e.setAttribute(t, `` + n)
      }
    }
    function Tt(e, t, n, r) {
      if (r === null) e.removeAttribute(n)
      else {
        switch (typeof r) {
          case `undefined`:
          case `function`:
          case `symbol`:
          case `boolean`:
            e.removeAttribute(n)
            return
        }
        e.setAttributeNS(t, n, `` + r)
      }
    }
    function Et(e) {
      switch (typeof e) {
        case `bigint`:
        case `boolean`:
        case `number`:
        case `string`:
        case `undefined`:
          return e
        case `object`:
          return e
        default:
          return ``
      }
    }
    function Dt(e) {
      var t = e.type
      return (e = e.nodeName) && e.toLowerCase() === `input` && (t === `checkbox` || t === `radio`)
    }
    function Ot(e, t, n) {
      var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t)
      if (
        !e.hasOwnProperty(t) &&
        r !== void 0 &&
        typeof r.get == `function` &&
        typeof r.set == `function`
      ) {
        var i = r.get,
          a = r.set
        return (
          Object.defineProperty(e, t, {
            configurable: !0,
            get: function () {
              return i.call(this)
            },
            set: function (e) {
              ;((n = `` + e), a.call(this, e))
            }
          }),
          Object.defineProperty(e, t, { enumerable: r.enumerable }),
          {
            getValue: function () {
              return n
            },
            setValue: function (e) {
              n = `` + e
            },
            stopTracking: function () {
              ;((e._valueTracker = null), delete e[t])
            }
          }
        )
      }
    }
    function kt(e) {
      if (!e._valueTracker) {
        var t = Dt(e) ? `checked` : `value`
        e._valueTracker = Ot(e, t, `` + e[t])
      }
    }
    function At(e) {
      if (!e) return !1
      var t = e._valueTracker
      if (!t) return !0
      var n = t.getValue(),
        r = ``
      return (
        e && (r = Dt(e) ? (e.checked ? `true` : `false`) : e.value),
        (e = r),
        e === n ? !1 : (t.setValue(e), !0)
      )
    }
    function jt(e) {
      if (((e ||= typeof document < `u` ? document : void 0), e === void 0)) return null
      try {
        return e.activeElement || e.body
      } catch {
        return e.body
      }
    }
    var Mt = /[\n"\\]/g
    function Nt(e) {
      return e.replace(Mt, function (e) {
        return `\\` + e.charCodeAt(0).toString(16) + ` `
      })
    }
    function Pt(e, t, n, r, i, a, o, s) {
      ;((e.name = ``),
        o != null && typeof o != `function` && typeof o != `symbol` && typeof o != `boolean`
          ? (e.type = o)
          : e.removeAttribute(`type`),
        t == null
          ? (o !== `submit` && o !== `reset`) || e.removeAttribute(`value`)
          : o === `number`
            ? ((t === 0 && e.value === ``) || e.value != t) && (e.value = `` + Et(t))
            : e.value !== `` + Et(t) && (e.value = `` + Et(t)),
        t == null
          ? n == null
            ? r != null && e.removeAttribute(`value`)
            : It(e, o, Et(n))
          : It(e, o, Et(t)),
        i == null && a != null && (e.defaultChecked = !!a),
        i != null && (e.checked = i && typeof i != `function` && typeof i != `symbol`),
        s != null && typeof s != `function` && typeof s != `symbol` && typeof s != `boolean`
          ? (e.name = `` + Et(s))
          : e.removeAttribute(`name`))
    }
    function Ft(e, t, n, r, i, a, o, s) {
      if (
        (a != null &&
          typeof a != `function` &&
          typeof a != `symbol` &&
          typeof a != `boolean` &&
          (e.type = a),
        t != null || n != null)
      ) {
        if (!((a !== `submit` && a !== `reset`) || t != null)) {
          kt(e)
          return
        }
        ;((n = n == null ? `` : `` + Et(n)),
          (t = t == null ? n : `` + Et(t)),
          s || t === e.value || (e.value = t),
          (e.defaultValue = t))
      }
      ;((r ??= i),
        (r = typeof r != `function` && typeof r != `symbol` && !!r),
        (e.checked = s ? e.checked : !!r),
        (e.defaultChecked = !!r),
        o != null &&
          typeof o != `function` &&
          typeof o != `symbol` &&
          typeof o != `boolean` &&
          (e.name = o),
        kt(e))
    }
    function It(e, t, n) {
      ;(t === `number` && jt(e.ownerDocument) === e) ||
        e.defaultValue === `` + n ||
        (e.defaultValue = `` + n)
    }
    function Lt(e, t, n, r) {
      if (((e = e.options), t)) {
        t = {}
        for (var i = 0; i < n.length; i++) t[`$` + n[i]] = !0
        for (n = 0; n < e.length; n++)
          ((i = t.hasOwnProperty(`$` + e[n].value)),
            e[n].selected !== i && (e[n].selected = i),
            i && r && (e[n].defaultSelected = !0))
      } else {
        for (n = `` + Et(n), t = null, i = 0; i < e.length; i++) {
          if (e[i].value === n) {
            ;((e[i].selected = !0), r && (e[i].defaultSelected = !0))
            return
          }
          t !== null || e[i].disabled || (t = e[i])
        }
        t !== null && (t.selected = !0)
      }
    }
    function Rt(e, t, n) {
      if (t != null && ((t = `` + Et(t)), t !== e.value && (e.value = t), n == null)) {
        e.defaultValue !== t && (e.defaultValue = t)
        return
      }
      e.defaultValue = n == null ? `` : `` + Et(n)
    }
    function zt(e, t, n, r) {
      if (t == null) {
        if (r != null) {
          if (n != null) throw Error(i(92))
          if (P(r)) {
            if (1 < r.length) throw Error(i(93))
            r = r[0]
          }
          n = r
        }
        ;((n ??= ``), (t = n))
      }
      ;((n = Et(t)),
        (e.defaultValue = n),
        (r = e.textContent),
        r === n && r !== `` && r !== null && (e.value = r),
        kt(e))
    }
    function Bt(e, t) {
      if (t) {
        var n = e.firstChild
        if (n && n === e.lastChild && n.nodeType === 3) {
          n.nodeValue = t
          return
        }
      }
      e.textContent = t
    }
    var Vt = new Set(
      `animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp`.split(
        ` `
      )
    )
    function Ht(e, t, n) {
      var r = t.indexOf(`--`) === 0
      n == null || typeof n == `boolean` || n === ``
        ? r
          ? e.setProperty(t, ``)
          : t === `float`
            ? (e.cssFloat = ``)
            : (e[t] = ``)
        : r
          ? e.setProperty(t, n)
          : typeof n != `number` || n === 0 || Vt.has(t)
            ? t === `float`
              ? (e.cssFloat = n)
              : (e[t] = (`` + n).trim())
            : (e[t] = n + `px`)
    }
    function Ut(e, t, n) {
      if (t != null && typeof t != `object`) throw Error(i(62))
      if (((e = e.style), n != null)) {
        for (var r in n)
          !n.hasOwnProperty(r) ||
            (t != null && t.hasOwnProperty(r)) ||
            (r.indexOf(`--`) === 0
              ? e.setProperty(r, ``)
              : r === `float`
                ? (e.cssFloat = ``)
                : (e[r] = ``))
        for (var a in t) ((r = t[a]), t.hasOwnProperty(a) && n[a] !== r && Ht(e, a, r))
      } else for (var o in t) t.hasOwnProperty(o) && Ht(e, o, t[o])
    }
    function Wt(e) {
      if (e.indexOf(`-`) === -1) return !1
      switch (e) {
        case `annotation-xml`:
        case `color-profile`:
        case `font-face`:
        case `font-face-src`:
        case `font-face-uri`:
        case `font-face-format`:
        case `font-face-name`:
        case `missing-glyph`:
          return !1
        default:
          return !0
      }
    }
    var Gt = new Map([
        [`acceptCharset`, `accept-charset`],
        [`htmlFor`, `for`],
        [`httpEquiv`, `http-equiv`],
        [`crossOrigin`, `crossorigin`],
        [`accentHeight`, `accent-height`],
        [`alignmentBaseline`, `alignment-baseline`],
        [`arabicForm`, `arabic-form`],
        [`baselineShift`, `baseline-shift`],
        [`capHeight`, `cap-height`],
        [`clipPath`, `clip-path`],
        [`clipRule`, `clip-rule`],
        [`colorInterpolation`, `color-interpolation`],
        [`colorInterpolationFilters`, `color-interpolation-filters`],
        [`colorProfile`, `color-profile`],
        [`colorRendering`, `color-rendering`],
        [`dominantBaseline`, `dominant-baseline`],
        [`enableBackground`, `enable-background`],
        [`fillOpacity`, `fill-opacity`],
        [`fillRule`, `fill-rule`],
        [`floodColor`, `flood-color`],
        [`floodOpacity`, `flood-opacity`],
        [`fontFamily`, `font-family`],
        [`fontSize`, `font-size`],
        [`fontSizeAdjust`, `font-size-adjust`],
        [`fontStretch`, `font-stretch`],
        [`fontStyle`, `font-style`],
        [`fontVariant`, `font-variant`],
        [`fontWeight`, `font-weight`],
        [`glyphName`, `glyph-name`],
        [`glyphOrientationHorizontal`, `glyph-orientation-horizontal`],
        [`glyphOrientationVertical`, `glyph-orientation-vertical`],
        [`horizAdvX`, `horiz-adv-x`],
        [`horizOriginX`, `horiz-origin-x`],
        [`imageRendering`, `image-rendering`],
        [`letterSpacing`, `letter-spacing`],
        [`lightingColor`, `lighting-color`],
        [`markerEnd`, `marker-end`],
        [`markerMid`, `marker-mid`],
        [`markerStart`, `marker-start`],
        [`overlinePosition`, `overline-position`],
        [`overlineThickness`, `overline-thickness`],
        [`paintOrder`, `paint-order`],
        [`panose-1`, `panose-1`],
        [`pointerEvents`, `pointer-events`],
        [`renderingIntent`, `rendering-intent`],
        [`shapeRendering`, `shape-rendering`],
        [`stopColor`, `stop-color`],
        [`stopOpacity`, `stop-opacity`],
        [`strikethroughPosition`, `strikethrough-position`],
        [`strikethroughThickness`, `strikethrough-thickness`],
        [`strokeDasharray`, `stroke-dasharray`],
        [`strokeDashoffset`, `stroke-dashoffset`],
        [`strokeLinecap`, `stroke-linecap`],
        [`strokeLinejoin`, `stroke-linejoin`],
        [`strokeMiterlimit`, `stroke-miterlimit`],
        [`strokeOpacity`, `stroke-opacity`],
        [`strokeWidth`, `stroke-width`],
        [`textAnchor`, `text-anchor`],
        [`textDecoration`, `text-decoration`],
        [`textRendering`, `text-rendering`],
        [`transformOrigin`, `transform-origin`],
        [`underlinePosition`, `underline-position`],
        [`underlineThickness`, `underline-thickness`],
        [`unicodeBidi`, `unicode-bidi`],
        [`unicodeRange`, `unicode-range`],
        [`unitsPerEm`, `units-per-em`],
        [`vAlphabetic`, `v-alphabetic`],
        [`vHanging`, `v-hanging`],
        [`vIdeographic`, `v-ideographic`],
        [`vMathematical`, `v-mathematical`],
        [`vectorEffect`, `vector-effect`],
        [`vertAdvY`, `vert-adv-y`],
        [`vertOriginX`, `vert-origin-x`],
        [`vertOriginY`, `vert-origin-y`],
        [`wordSpacing`, `word-spacing`],
        [`writingMode`, `writing-mode`],
        [`xmlnsXlink`, `xmlns:xlink`],
        [`xHeight`, `x-height`]
      ]),
      Kt =
        /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i
    function qt(e) {
      return Kt.test(`` + e)
        ? `javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')`
        : e
    }
    function Jt() {}
    var Yt = null
    function Xt(e) {
      return (
        (e = e.target || e.srcElement || window),
        e.correspondingUseElement && (e = e.correspondingUseElement),
        e.nodeType === 3 ? e.parentNode : e
      )
    }
    var Zt = null,
      Qt = null
    function $t(e) {
      var t = ft(e)
      if (t && (e = t.stateNode)) {
        var n = e[it] || null
        a: switch (((e = t.stateNode), t.type)) {
          case `input`:
            if (
              (Pt(
                e,
                n.value,
                n.defaultValue,
                n.defaultValue,
                n.checked,
                n.defaultChecked,
                n.type,
                n.name
              ),
              (t = n.name),
              n.type === `radio` && t != null)
            ) {
              for (n = e; n.parentNode; ) n = n.parentNode
              for (
                n = n.querySelectorAll(`input[name="` + Nt(`` + t) + `"][type="radio"]`), t = 0;
                t < n.length;
                t++
              ) {
                var r = n[t]
                if (r !== e && r.form === e.form) {
                  var a = r[it] || null
                  if (!a) throw Error(i(90))
                  Pt(
                    r,
                    a.value,
                    a.defaultValue,
                    a.defaultValue,
                    a.checked,
                    a.defaultChecked,
                    a.type,
                    a.name
                  )
                }
              }
              for (t = 0; t < n.length; t++) ((r = n[t]), r.form === e.form && At(r))
            }
            break a
          case `textarea`:
            Rt(e, n.value, n.defaultValue)
            break a
          case `select`:
            ;((t = n.value), t != null && Lt(e, !!n.multiple, t, !1))
        }
      }
    }
    var en = !1
    function tn(e, t, n) {
      if (en) return e(t, n)
      en = !0
      try {
        return e(t)
      } finally {
        if (
          ((en = !1),
          (Zt !== null || Qt !== null) &&
            (_u(), Zt && ((t = Zt), (e = Qt), (Qt = Zt = null), $t(t), e)))
        )
          for (t = 0; t < e.length; t++) $t(e[t])
      }
    }
    function nn(e, t) {
      var n = e.stateNode
      if (n === null) return null
      var r = n[it] || null
      if (r === null) return null
      n = r[t]
      a: switch (t) {
        case `onClick`:
        case `onClickCapture`:
        case `onDoubleClick`:
        case `onDoubleClickCapture`:
        case `onMouseDown`:
        case `onMouseDownCapture`:
        case `onMouseMove`:
        case `onMouseMoveCapture`:
        case `onMouseUp`:
        case `onMouseUpCapture`:
        case `onMouseEnter`:
          ;((r = !r.disabled) ||
            ((e = e.type),
            (r = !(e === `button` || e === `input` || e === `select` || e === `textarea`))),
            (e = !r))
          break a
        default:
          e = !1
      }
      if (e) return null
      if (n && typeof n != `function`) throw Error(i(231, t, typeof n))
      return n
    }
    var rn = !(
        typeof window > `u` ||
        window.document === void 0 ||
        window.document.createElement === void 0
      ),
      an = !1
    if (rn)
      try {
        var on = {}
        ;(Object.defineProperty(on, `passive`, {
          get: function () {
            an = !0
          }
        }),
          window.addEventListener(`test`, on, on),
          window.removeEventListener(`test`, on, on))
      } catch {
        an = !1
      }
    var sn = null,
      cn = null,
      W = null
    function ln() {
      if (W) return W
      var e,
        t = cn,
        n = t.length,
        r,
        i = `value` in sn ? sn.value : sn.textContent,
        a = i.length
      for (e = 0; e < n && t[e] === i[e]; e++);
      var o = n - e
      for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
      return (W = i.slice(e, 1 < r ? 1 - r : void 0))
    }
    function un(e) {
      var t = e.keyCode
      return (
        `charCode` in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
        e === 10 && (e = 13),
        32 <= e || e === 13 ? e : 0
      )
    }
    function dn() {
      return !0
    }
    function fn() {
      return !1
    }
    function pn(e) {
      function t(t, n, r, i, a) {
        for (var o in ((this._reactName = t),
        (this._targetInst = r),
        (this.type = n),
        (this.nativeEvent = i),
        (this.target = a),
        (this.currentTarget = null),
        e))
          e.hasOwnProperty(o) && ((t = e[o]), (this[o] = t ? t(i) : i[o]))
        return (
          (this.isDefaultPrevented = (
            i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented
          )
            ? dn
            : fn),
          (this.isPropagationStopped = fn),
          this
        )
      }
      return (
        h(t.prototype, {
          preventDefault: function () {
            this.defaultPrevented = !0
            var e = this.nativeEvent
            e &&
              (e.preventDefault
                ? e.preventDefault()
                : typeof e.returnValue != `unknown` && (e.returnValue = !1),
              (this.isDefaultPrevented = dn))
          },
          stopPropagation: function () {
            var e = this.nativeEvent
            e &&
              (e.stopPropagation
                ? e.stopPropagation()
                : typeof e.cancelBubble != `unknown` && (e.cancelBubble = !0),
              (this.isPropagationStopped = dn))
          },
          persist: function () {},
          isPersistent: dn
        }),
        t
      )
    }
    var mn = {
        eventPhase: 0,
        bubbles: 0,
        cancelable: 0,
        timeStamp: function (e) {
          return e.timeStamp || Date.now()
        },
        defaultPrevented: 0,
        isTrusted: 0
      },
      hn = pn(mn),
      gn = h({}, mn, { view: 0, detail: 0 }),
      _n = pn(gn),
      vn,
      G,
      yn,
      bn = h({}, gn, {
        screenX: 0,
        screenY: 0,
        clientX: 0,
        clientY: 0,
        pageX: 0,
        pageY: 0,
        ctrlKey: 0,
        shiftKey: 0,
        altKey: 0,
        metaKey: 0,
        getModifierState: An,
        button: 0,
        buttons: 0,
        relatedTarget: function (e) {
          return e.relatedTarget === void 0
            ? e.fromElement === e.srcElement
              ? e.toElement
              : e.fromElement
            : e.relatedTarget
        },
        movementX: function (e) {
          return `movementX` in e
            ? e.movementX
            : (e !== yn &&
                (yn && e.type === `mousemove`
                  ? ((vn = e.screenX - yn.screenX), (G = e.screenY - yn.screenY))
                  : (G = vn = 0),
                (yn = e)),
              vn)
        },
        movementY: function (e) {
          return `movementY` in e ? e.movementY : G
        }
      }),
      xn = pn(bn),
      Sn = pn(h({}, bn, { dataTransfer: 0 })),
      Cn = pn(h({}, gn, { relatedTarget: 0 })),
      wn = pn(h({}, mn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 })),
      Tn = pn(
        h({}, mn, {
          clipboardData: function (e) {
            return `clipboardData` in e ? e.clipboardData : window.clipboardData
          }
        })
      ),
      K = pn(h({}, mn, { data: 0 })),
      En = {
        Esc: `Escape`,
        Spacebar: ` `,
        Left: `ArrowLeft`,
        Up: `ArrowUp`,
        Right: `ArrowRight`,
        Down: `ArrowDown`,
        Del: `Delete`,
        Win: `OS`,
        Menu: `ContextMenu`,
        Apps: `ContextMenu`,
        Scroll: `ScrollLock`,
        MozPrintableKey: `Unidentified`
      },
      Dn = {
        8: `Backspace`,
        9: `Tab`,
        12: `Clear`,
        13: `Enter`,
        16: `Shift`,
        17: `Control`,
        18: `Alt`,
        19: `Pause`,
        20: `CapsLock`,
        27: `Escape`,
        32: ` `,
        33: `PageUp`,
        34: `PageDown`,
        35: `End`,
        36: `Home`,
        37: `ArrowLeft`,
        38: `ArrowUp`,
        39: `ArrowRight`,
        40: `ArrowDown`,
        45: `Insert`,
        46: `Delete`,
        112: `F1`,
        113: `F2`,
        114: `F3`,
        115: `F4`,
        116: `F5`,
        117: `F6`,
        118: `F7`,
        119: `F8`,
        120: `F9`,
        121: `F10`,
        122: `F11`,
        123: `F12`,
        144: `NumLock`,
        145: `ScrollLock`,
        224: `Meta`
      },
      On = { Alt: `altKey`, Control: `ctrlKey`, Meta: `metaKey`, Shift: `shiftKey` }
    function kn(e) {
      var t = this.nativeEvent
      return t.getModifierState ? t.getModifierState(e) : (e = On[e]) ? !!t[e] : !1
    }
    function An() {
      return kn
    }
    var jn = pn(
        h({}, gn, {
          key: function (e) {
            if (e.key) {
              var t = En[e.key] || e.key
              if (t !== `Unidentified`) return t
            }
            return e.type === `keypress`
              ? ((e = un(e)), e === 13 ? `Enter` : String.fromCharCode(e))
              : e.type === `keydown` || e.type === `keyup`
                ? Dn[e.keyCode] || `Unidentified`
                : ``
          },
          code: 0,
          location: 0,
          ctrlKey: 0,
          shiftKey: 0,
          altKey: 0,
          metaKey: 0,
          repeat: 0,
          locale: 0,
          getModifierState: An,
          charCode: function (e) {
            return e.type === `keypress` ? un(e) : 0
          },
          keyCode: function (e) {
            return e.type === `keydown` || e.type === `keyup` ? e.keyCode : 0
          },
          which: function (e) {
            return e.type === `keypress`
              ? un(e)
              : e.type === `keydown` || e.type === `keyup`
                ? e.keyCode
                : 0
          }
        })
      ),
      Mn = pn(
        h({}, bn, {
          pointerId: 0,
          width: 0,
          height: 0,
          pressure: 0,
          tangentialPressure: 0,
          tiltX: 0,
          tiltY: 0,
          twist: 0,
          pointerType: 0,
          isPrimary: 0
        })
      ),
      Nn = pn(
        h({}, gn, {
          touches: 0,
          targetTouches: 0,
          changedTouches: 0,
          altKey: 0,
          metaKey: 0,
          ctrlKey: 0,
          shiftKey: 0,
          getModifierState: An
        })
      ),
      Pn = pn(h({}, mn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 })),
      Fn = pn(
        h({}, bn, {
          deltaX: function (e) {
            return `deltaX` in e ? e.deltaX : `wheelDeltaX` in e ? -e.wheelDeltaX : 0
          },
          deltaY: function (e) {
            return `deltaY` in e
              ? e.deltaY
              : `wheelDeltaY` in e
                ? -e.wheelDeltaY
                : `wheelDelta` in e
                  ? -e.wheelDelta
                  : 0
          },
          deltaZ: 0,
          deltaMode: 0
        })
      ),
      In = pn(h({}, mn, { newState: 0, oldState: 0 })),
      Ln = [9, 13, 27, 32],
      Rn = rn && `CompositionEvent` in window,
      zn = null
    rn && `documentMode` in document && (zn = document.documentMode)
    var Bn = rn && `TextEvent` in window && !zn,
      Vn = rn && (!Rn || (zn && 8 < zn && 11 >= zn)),
      Hn = ` `,
      Un = !1
    function Wn(e, t) {
      switch (e) {
        case `keyup`:
          return Ln.indexOf(t.keyCode) !== -1
        case `keydown`:
          return t.keyCode !== 229
        case `keypress`:
        case `mousedown`:
        case `focusout`:
          return !0
        default:
          return !1
      }
    }
    function Gn(e) {
      return ((e = e.detail), typeof e == `object` && `data` in e ? e.data : null)
    }
    var q = !1
    function Kn(e, t) {
      switch (e) {
        case `compositionend`:
          return Gn(t)
        case `keypress`:
          return t.which === 32 ? ((Un = !0), Hn) : null
        case `textInput`:
          return ((e = t.data), e === Hn && Un ? null : e)
        default:
          return null
      }
    }
    function qn(e, t) {
      if (q)
        return e === `compositionend` || (!Rn && Wn(e, t))
          ? ((e = ln()), (W = cn = sn = null), (q = !1), e)
          : null
      switch (e) {
        case `paste`:
          return null
        case `keypress`:
          if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
            if (t.char && 1 < t.char.length) return t.char
            if (t.which) return String.fromCharCode(t.which)
          }
          return null
        case `compositionend`:
          return Vn && t.locale !== `ko` ? null : t.data
        default:
          return null
      }
    }
    var Jn = {
      color: !0,
      date: !0,
      datetime: !0,
      'datetime-local': !0,
      email: !0,
      month: !0,
      number: !0,
      password: !0,
      range: !0,
      search: !0,
      tel: !0,
      text: !0,
      time: !0,
      url: !0,
      week: !0
    }
    function Yn(e) {
      var t = e && e.nodeName && e.nodeName.toLowerCase()
      return t === `input` ? !!Jn[e.type] : t === `textarea`
    }
    function Xn(e, t, n, r) {
      ;(Zt ? (Qt ? Qt.push(r) : (Qt = [r])) : (Zt = r),
        (t = Td(t, `onChange`)),
        0 < t.length &&
          ((n = new hn(`onChange`, `change`, null, n, r)), e.push({ event: n, listeners: t })))
    }
    var Zn = null,
      Qn = null
    function $n(e) {
      _d(e, 0)
    }
    function er(e) {
      if (At(U(e))) return e
    }
    function tr(e, t) {
      if (e === `change`) return t
    }
    var nr = !1
    if (rn) {
      var rr
      if (rn) {
        var ir = `oninput` in document
        if (!ir) {
          var ar = document.createElement(`div`)
          ;(ar.setAttribute(`oninput`, `return;`), (ir = typeof ar.oninput == `function`))
        }
        rr = ir
      } else rr = !1
      nr = rr && (!document.documentMode || 9 < document.documentMode)
    }
    function or() {
      Zn && (Zn.detachEvent(`onpropertychange`, sr), (Qn = Zn = null))
    }
    function sr(e) {
      if (e.propertyName === `value` && er(Qn)) {
        var t = []
        ;(Xn(t, Qn, e, Xt(e)), tn($n, t))
      }
    }
    function cr(e, t, n) {
      e === `focusin`
        ? (or(), (Zn = t), (Qn = n), Zn.attachEvent(`onpropertychange`, sr))
        : e === `focusout` && or()
    }
    function lr(e) {
      if (e === `selectionchange` || e === `keyup` || e === `keydown`) return er(Qn)
    }
    function ur(e, t) {
      if (e === `click`) return er(t)
    }
    function dr(e, t) {
      if (e === `input` || e === `change`) return er(t)
    }
    function fr(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t)
    }
    var pr = typeof Object.is == `function` ? Object.is : fr
    function mr(e, t) {
      if (pr(e, t)) return !0
      if (typeof e != `object` || !e || typeof t != `object` || !t) return !1
      var n = Object.keys(e),
        r = Object.keys(t)
      if (n.length !== r.length) return !1
      for (r = 0; r < n.length; r++) {
        var i = n[r]
        if (!ve.call(t, i) || !pr(e[i], t[i])) return !1
      }
      return !0
    }
    function hr(e) {
      for (; e && e.firstChild; ) e = e.firstChild
      return e
    }
    function J(e, t) {
      var n = hr(e)
      e = 0
      for (var r; n; ) {
        if (n.nodeType === 3) {
          if (((r = e + n.textContent.length), e <= t && r >= t)) return { node: n, offset: t - e }
          e = r
        }
        a: {
          for (; n; ) {
            if (n.nextSibling) {
              n = n.nextSibling
              break a
            }
            n = n.parentNode
          }
          n = void 0
        }
        n = hr(n)
      }
    }
    function gr(e, t) {
      return e && t
        ? e === t
          ? !0
          : e && e.nodeType === 3
            ? !1
            : t && t.nodeType === 3
              ? gr(e, t.parentNode)
              : `contains` in e
                ? e.contains(t)
                : e.compareDocumentPosition
                  ? !!(e.compareDocumentPosition(t) & 16)
                  : !1
        : !1
    }
    function _r(e) {
      e =
        e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null
          ? e.ownerDocument.defaultView
          : window
      for (var t = jt(e.document); t instanceof e.HTMLIFrameElement; ) {
        try {
          var n = typeof t.contentWindow.location.href == `string`
        } catch {
          n = !1
        }
        if (n) e = t.contentWindow
        else break
        t = jt(e.document)
      }
      return t
    }
    function vr(e) {
      var t = e && e.nodeName && e.nodeName.toLowerCase()
      return (
        t &&
        ((t === `input` &&
          (e.type === `text` ||
            e.type === `search` ||
            e.type === `tel` ||
            e.type === `url` ||
            e.type === `password`)) ||
          t === `textarea` ||
          e.contentEditable === `true`)
      )
    }
    var yr = rn && `documentMode` in document && 11 >= document.documentMode,
      br = null,
      xr = null,
      Sr = null,
      Cr = !1
    function wr(e, t, n) {
      var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument
      Cr ||
        br == null ||
        br !== jt(r) ||
        ((r = br),
        `selectionStart` in r && vr(r)
          ? (r = { start: r.selectionStart, end: r.selectionEnd })
          : ((r = ((r.ownerDocument && r.ownerDocument.defaultView) || window).getSelection()),
            (r = {
              anchorNode: r.anchorNode,
              anchorOffset: r.anchorOffset,
              focusNode: r.focusNode,
              focusOffset: r.focusOffset
            })),
        (Sr && mr(Sr, r)) ||
          ((Sr = r),
          (r = Td(xr, `onSelect`)),
          0 < r.length &&
            ((t = new hn(`onSelect`, `select`, null, t, n)),
            e.push({ event: t, listeners: r }),
            (t.target = br))))
    }
    function Tr(e, t) {
      var n = {}
      return (
        (n[e.toLowerCase()] = t.toLowerCase()),
        (n[`Webkit` + e] = `webkit` + t),
        (n[`Moz` + e] = `moz` + t),
        n
      )
    }
    var Er = {
        animationend: Tr(`Animation`, `AnimationEnd`),
        animationiteration: Tr(`Animation`, `AnimationIteration`),
        animationstart: Tr(`Animation`, `AnimationStart`),
        transitionrun: Tr(`Transition`, `TransitionRun`),
        transitionstart: Tr(`Transition`, `TransitionStart`),
        transitioncancel: Tr(`Transition`, `TransitionCancel`),
        transitionend: Tr(`Transition`, `TransitionEnd`)
      },
      Dr = {},
      Or = {}
    rn &&
      ((Or = document.createElement(`div`).style),
      `AnimationEvent` in window ||
        (delete Er.animationend.animation,
        delete Er.animationiteration.animation,
        delete Er.animationstart.animation),
      `TransitionEvent` in window || delete Er.transitionend.transition)
    function kr(e) {
      if (Dr[e]) return Dr[e]
      if (!Er[e]) return e
      var t = Er[e],
        n
      for (n in t) if (t.hasOwnProperty(n) && n in Or) return (Dr[e] = t[n])
      return e
    }
    var Ar = kr(`animationend`),
      jr = kr(`animationiteration`),
      Mr = kr(`animationstart`),
      Nr = kr(`transitionrun`),
      Pr = kr(`transitionstart`),
      Fr = kr(`transitioncancel`),
      Ir = kr(`transitionend`),
      Lr = new Map(),
      Rr =
        `abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel`.split(
          ` `
        )
    Rr.push(`scrollEnd`)
    function zr(e, t) {
      ;(Lr.set(e, t), _t(t, [e]))
    }
    var Br =
        typeof reportError == `function`
          ? reportError
          : function (e) {
              if (typeof window == `object` && typeof window.ErrorEvent == `function`) {
                var t = new window.ErrorEvent(`error`, {
                  bubbles: !0,
                  cancelable: !0,
                  message:
                    typeof e == `object` && e && typeof e.message == `string`
                      ? String(e.message)
                      : String(e),
                  error: e
                })
                if (!window.dispatchEvent(t)) return
              } else if (typeof process == `object` && typeof process.emit == `function`) {
                process.emit(`uncaughtException`, e)
                return
              }
              console.error(e)
            },
      Vr = [],
      Hr = 0,
      Ur = 0
    function Wr() {
      for (var e = Hr, t = (Ur = Hr = 0); t < e; ) {
        var n = Vr[t]
        Vr[t++] = null
        var r = Vr[t]
        Vr[t++] = null
        var i = Vr[t]
        Vr[t++] = null
        var a = Vr[t]
        if (((Vr[t++] = null), r !== null && i !== null)) {
          var o = r.pending
          ;(o === null ? (i.next = i) : ((i.next = o.next), (o.next = i)), (r.pending = i))
        }
        a !== 0 && Jr(n, i, a)
      }
    }
    function Gr(e, t, n, r) {
      ;((Vr[Hr++] = e),
        (Vr[Hr++] = t),
        (Vr[Hr++] = n),
        (Vr[Hr++] = r),
        (Ur |= r),
        (e.lanes |= r),
        (e = e.alternate),
        e !== null && (e.lanes |= r))
    }
    function Kr(e, t, n, r) {
      return (Gr(e, t, n, r), Yr(e))
    }
    function qr(e, t) {
      return (Gr(e, null, null, t), Yr(e))
    }
    function Jr(e, t, n) {
      e.lanes |= n
      var r = e.alternate
      r !== null && (r.lanes |= n)
      for (var i = !1, a = e.return; a !== null; )
        ((a.childLanes |= n),
          (r = a.alternate),
          r !== null && (r.childLanes |= n),
          a.tag === 22 && ((e = a.stateNode), e === null || e._visibility & 1 || (i = !0)),
          (e = a),
          (a = a.return))
      return e.tag === 3
        ? ((a = e.stateNode),
          i &&
            t !== null &&
            ((i = 31 - Fe(n)),
            (e = a.hiddenUpdates),
            (r = e[i]),
            r === null ? (e[i] = [t]) : r.push(t),
            (t.lane = n | 536870912)),
          a)
        : null
    }
    function Yr(e) {
      if (50 < cu) throw ((cu = 0), (lu = null), Error(i(185)))
      for (var t = e.return; t !== null; ) ((e = t), (t = e.return))
      return e.tag === 3 ? e.stateNode : null
    }
    var Xr = {}
    function Zr(e, t, n, r) {
      ;((this.tag = e),
        (this.key = n),
        (this.sibling =
          this.child =
          this.return =
          this.stateNode =
          this.type =
          this.elementType =
            null),
        (this.index = 0),
        (this.refCleanup = this.ref = null),
        (this.pendingProps = t),
        (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
        (this.mode = r),
        (this.subtreeFlags = this.flags = 0),
        (this.deletions = null),
        (this.childLanes = this.lanes = 0),
        (this.alternate = null))
    }
    function Qr(e, t, n, r) {
      return new Zr(e, t, n, r)
    }
    function $r(e) {
      return ((e = e.prototype), !(!e || !e.isReactComponent))
    }
    function ei(e, t) {
      var n = e.alternate
      return (
        n === null
          ? ((n = Qr(e.tag, t, e.key, e.mode)),
            (n.elementType = e.elementType),
            (n.type = e.type),
            (n.stateNode = e.stateNode),
            (n.alternate = e),
            (e.alternate = n))
          : ((n.pendingProps = t),
            (n.type = e.type),
            (n.flags = 0),
            (n.subtreeFlags = 0),
            (n.deletions = null)),
        (n.flags = e.flags & 65011712),
        (n.childLanes = e.childLanes),
        (n.lanes = e.lanes),
        (n.child = e.child),
        (n.memoizedProps = e.memoizedProps),
        (n.memoizedState = e.memoizedState),
        (n.updateQueue = e.updateQueue),
        (t = e.dependencies),
        (n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
        (n.sibling = e.sibling),
        (n.index = e.index),
        (n.ref = e.ref),
        (n.refCleanup = e.refCleanup),
        n
      )
    }
    function ti(e, t) {
      e.flags &= 65011714
      var n = e.alternate
      return (
        n === null
          ? ((e.childLanes = 0),
            (e.lanes = t),
            (e.child = null),
            (e.subtreeFlags = 0),
            (e.memoizedProps = null),
            (e.memoizedState = null),
            (e.updateQueue = null),
            (e.dependencies = null),
            (e.stateNode = null))
          : ((e.childLanes = n.childLanes),
            (e.lanes = n.lanes),
            (e.child = n.child),
            (e.subtreeFlags = 0),
            (e.deletions = null),
            (e.memoizedProps = n.memoizedProps),
            (e.memoizedState = n.memoizedState),
            (e.updateQueue = n.updateQueue),
            (e.type = n.type),
            (t = n.dependencies),
            (e.dependencies =
              t === null ? null : { lanes: t.lanes, firstContext: t.firstContext })),
        e
      )
    }
    function ni(e, t, n, r, a, o) {
      var s = 0
      if (((r = e), typeof e == `function`)) $r(e) && (s = 1)
      else if (typeof e == `string`)
        s = Uf(e, n, ie.current) ? 26 : e === `html` || e === `head` || e === `body` ? 27 : 5
      else
        a: switch (e) {
          case k:
            return ((e = Qr(31, n, t, a)), (e.elementType = k), (e.lanes = o), e)
          case y:
            return ri(n.children, a, o, t)
          case b:
            ;((s = 8), (a |= 24))
            break
          case x:
            return ((e = Qr(12, n, t, a | 2)), (e.elementType = x), (e.lanes = o), e)
          case T:
            return ((e = Qr(13, n, t, a)), (e.elementType = T), (e.lanes = o), e)
          case E:
            return ((e = Qr(19, n, t, a)), (e.elementType = E), (e.lanes = o), e)
          default:
            if (typeof e == `object` && e)
              switch (e.$$typeof) {
                case C:
                  s = 10
                  break a
                case S:
                  s = 9
                  break a
                case w:
                  s = 11
                  break a
                case D:
                  s = 14
                  break a
                case O:
                  ;((s = 16), (r = null))
                  break a
              }
            ;((s = 29), (n = Error(i(130, e === null ? `null` : typeof e, ``))), (r = null))
        }
      return ((t = Qr(s, n, t, a)), (t.elementType = e), (t.type = r), (t.lanes = o), t)
    }
    function ri(e, t, n, r) {
      return ((e = Qr(7, e, r, t)), (e.lanes = n), e)
    }
    function ii(e, t, n) {
      return ((e = Qr(6, e, null, t)), (e.lanes = n), e)
    }
    function ai(e) {
      var t = Qr(18, null, null, 0)
      return ((t.stateNode = e), t)
    }
    function oi(e, t, n) {
      return (
        (t = Qr(4, e.children === null ? [] : e.children, e.key, t)),
        (t.lanes = n),
        (t.stateNode = {
          containerInfo: e.containerInfo,
          pendingChildren: null,
          implementation: e.implementation
        }),
        t
      )
    }
    var si = new WeakMap()
    function ci(e, t) {
      if (typeof e == `object` && e) {
        var n = si.get(e)
        return n === void 0 ? ((t = { value: e, source: t, stack: _e(t) }), si.set(e, t), t) : n
      }
      return { value: e, source: t, stack: _e(t) }
    }
    var li = [],
      ui = 0,
      di = null,
      fi = 0,
      pi = [],
      mi = 0,
      hi = null,
      gi = 1,
      _i = ``
    function vi(e, t) {
      ;((li[ui++] = fi), (li[ui++] = di), (di = e), (fi = t))
    }
    function yi(e, t, n) {
      ;((pi[mi++] = gi), (pi[mi++] = _i), (pi[mi++] = hi), (hi = e))
      var r = gi
      e = _i
      var i = 32 - Fe(r) - 1
      ;((r &= ~(1 << i)), (n += 1))
      var a = 32 - Fe(t) + i
      if (30 < a) {
        var o = i - (i % 5)
        ;((a = (r & ((1 << o) - 1)).toString(32)),
          (r >>= o),
          (i -= o),
          (gi = (1 << (32 - Fe(t) + i)) | (n << i) | r),
          (_i = a + e))
      } else ((gi = (1 << a) | (n << i) | r), (_i = e))
    }
    function bi(e) {
      e.return !== null && (vi(e, 1), yi(e, 1, 0))
    }
    function xi(e) {
      for (; e === di; ) ((di = li[--ui]), (li[ui] = null), (fi = li[--ui]), (li[ui] = null))
      for (; e === hi; )
        ((hi = pi[--mi]),
          (pi[mi] = null),
          (_i = pi[--mi]),
          (pi[mi] = null),
          (gi = pi[--mi]),
          (pi[mi] = null))
    }
    function Si(e, t) {
      ;((pi[mi++] = gi), (pi[mi++] = _i), (pi[mi++] = hi), (gi = t.id), (_i = t.overflow), (hi = e))
    }
    var Ci = null,
      wi = null,
      Ti = !1,
      Ei = null,
      Di = !1,
      Oi = Error(i(519))
    function ki(e) {
      throw (
        Fi(
          ci(
            Error(
              i(
                418,
                1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? `text` : `HTML`,
                ``
              )
            ),
            e
          )
        ),
        Oi
      )
    }
    function Ai(e) {
      var t = e.stateNode,
        n = e.type,
        r = e.memoizedProps
      switch (((t[rt] = e), (t[it] = r), n)) {
        case `dialog`:
          ;(vd(`cancel`, t), vd(`close`, t))
          break
        case `iframe`:
        case `object`:
        case `embed`:
          vd(`load`, t)
          break
        case `video`:
        case `audio`:
          for (n = 0; n < hd.length; n++) vd(hd[n], t)
          break
        case `source`:
          vd(`error`, t)
          break
        case `img`:
        case `image`:
        case `link`:
          ;(vd(`error`, t), vd(`load`, t))
          break
        case `details`:
          vd(`toggle`, t)
          break
        case `input`:
          ;(vd(`invalid`, t),
            Ft(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0))
          break
        case `select`:
          vd(`invalid`, t)
          break
        case `textarea`:
          ;(vd(`invalid`, t), zt(t, r.value, r.defaultValue, r.children))
      }
      ;((n = r.children),
        (typeof n != `string` && typeof n != `number` && typeof n != `bigint`) ||
        t.textContent === `` + n ||
        !0 === r.suppressHydrationWarning ||
        jd(t.textContent, n)
          ? (r.popover != null && (vd(`beforetoggle`, t), vd(`toggle`, t)),
            r.onScroll != null && vd(`scroll`, t),
            r.onScrollEnd != null && vd(`scrollend`, t),
            r.onClick != null && (t.onclick = Jt),
            (t = !0))
          : (t = !1),
        t || ki(e, !0))
    }
    function ji(e) {
      for (Ci = e.return; Ci; )
        switch (Ci.tag) {
          case 5:
          case 31:
          case 13:
            Di = !1
            return
          case 27:
          case 3:
            Di = !0
            return
          default:
            Ci = Ci.return
        }
    }
    function Mi(e) {
      if (e !== Ci) return !1
      if (!Ti) return (ji(e), (Ti = !0), !1)
      var t = e.tag,
        n
      if (
        ((n = t !== 3 && t !== 27) &&
          ((n = t === 5) &&
            ((n = e.type), (n = !(n !== `form` && n !== `button`) || Ud(e.type, e.memoizedProps))),
          (n = !n)),
        n && wi && ki(e),
        ji(e),
        t === 13)
      ) {
        if (((e = e.memoizedState), (e = e === null ? null : e.dehydrated), !e)) throw Error(i(317))
        wi = uf(e)
      } else if (t === 31) {
        if (((e = e.memoizedState), (e = e === null ? null : e.dehydrated), !e)) throw Error(i(317))
        wi = uf(e)
      } else
        t === 27
          ? ((t = wi), Zd(e.type) ? ((e = lf), (lf = null), (wi = e)) : (wi = t))
          : (wi = Ci ? cf(e.stateNode.nextSibling) : null)
      return !0
    }
    function Ni() {
      ;((wi = Ci = null), (Ti = !1))
    }
    function Pi() {
      var e = Ei
      return (e !== null && (Jl === null ? (Jl = e) : Jl.push.apply(Jl, e), (Ei = null)), e)
    }
    function Fi(e) {
      Ei === null ? (Ei = [e]) : Ei.push(e)
    }
    var Ii = L(null),
      Li = null,
      Ri = null
    function zi(e, t, n) {
      ;(z(Ii, t._currentValue), (t._currentValue = n))
    }
    function Bi(e) {
      ;((e._currentValue = Ii.current), R(Ii))
    }
    function Vi(e, t, n) {
      for (; e !== null; ) {
        var r = e.alternate
        if (
          ((e.childLanes & t) === t
            ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t)
            : ((e.childLanes |= t), r !== null && (r.childLanes |= t)),
          e === n)
        )
          break
        e = e.return
      }
    }
    function Hi(e, t, n, r) {
      var a = e.child
      for (a !== null && (a.return = e); a !== null; ) {
        var o = a.dependencies
        if (o !== null) {
          var s = a.child
          o = o.firstContext
          a: for (; o !== null; ) {
            var c = o
            o = a
            for (var l = 0; l < t.length; l++)
              if (c.context === t[l]) {
                ;((o.lanes |= n),
                  (c = o.alternate),
                  c !== null && (c.lanes |= n),
                  Vi(o.return, n, e),
                  r || (s = null))
                break a
              }
            o = c.next
          }
        } else if (a.tag === 18) {
          if (((s = a.return), s === null)) throw Error(i(341))
          ;((s.lanes |= n),
            (o = s.alternate),
            o !== null && (o.lanes |= n),
            Vi(s, n, e),
            (s = null))
        } else s = a.child
        if (s !== null) s.return = a
        else
          for (s = a; s !== null; ) {
            if (s === e) {
              s = null
              break
            }
            if (((a = s.sibling), a !== null)) {
              ;((a.return = s.return), (s = a))
              break
            }
            s = s.return
          }
        a = s
      }
    }
    function Ui(e, t, n, r) {
      e = null
      for (var a = t, o = !1; a !== null; ) {
        if (!o) {
          if (a.flags & 524288) o = !0
          else if (a.flags & 262144) break
        }
        if (a.tag === 10) {
          var s = a.alternate
          if (s === null) throw Error(i(387))
          if (((s = s.memoizedProps), s !== null)) {
            var c = a.type
            pr(a.pendingProps.value, s.value) || (e === null ? (e = [c]) : e.push(c))
          }
        } else if (a === oe.current) {
          if (((s = a.alternate), s === null)) throw Error(i(387))
          s.memoizedState.memoizedState !== a.memoizedState.memoizedState &&
            (e === null ? (e = [Qf]) : e.push(Qf))
        }
        a = a.return
      }
      ;(e !== null && Hi(t, e, n, r), (t.flags |= 262144))
    }
    function Wi(e) {
      for (e = e.firstContext; e !== null; ) {
        if (!pr(e.context._currentValue, e.memoizedValue)) return !0
        e = e.next
      }
      return !1
    }
    function Gi(e) {
      ;((Li = e), (Ri = null), (e = e.dependencies), e !== null && (e.firstContext = null))
    }
    function Ki(e) {
      return Ji(Li, e)
    }
    function qi(e, t) {
      return (Li === null && Gi(e), Ji(e, t))
    }
    function Ji(e, t) {
      var n = t._currentValue
      if (((t = { context: t, memoizedValue: n, next: null }), Ri === null)) {
        if (e === null) throw Error(i(308))
        ;((Ri = t), (e.dependencies = { lanes: 0, firstContext: t }), (e.flags |= 524288))
      } else Ri = Ri.next = t
      return n
    }
    var Yi =
        typeof AbortController < `u`
          ? AbortController
          : function () {
              var e = [],
                t = (this.signal = {
                  aborted: !1,
                  addEventListener: function (t, n) {
                    e.push(n)
                  }
                })
              this.abort = function () {
                ;((t.aborted = !0),
                  e.forEach(function (e) {
                    return e()
                  }))
              }
            },
      Xi = t.unstable_scheduleCallback,
      Zi = t.unstable_NormalPriority,
      Qi = {
        $$typeof: C,
        Consumer: null,
        Provider: null,
        _currentValue: null,
        _currentValue2: null,
        _threadCount: 0
      }
    function $i() {
      return { controller: new Yi(), data: new Map(), refCount: 0 }
    }
    function ea(e) {
      ;(e.refCount--,
        e.refCount === 0 &&
          Xi(Zi, function () {
            e.controller.abort()
          }))
    }
    var ta = null,
      na = 0,
      ra = 0,
      ia = null
    function aa(e, t) {
      if (ta === null) {
        var n = (ta = [])
        ;((na = 0),
          (ra = ld()),
          (ia = {
            status: `pending`,
            value: void 0,
            then: function (e) {
              n.push(e)
            }
          }))
      }
      return (na++, t.then(oa, oa), t)
    }
    function oa() {
      if (--na === 0 && ta !== null) {
        ia !== null && (ia.status = `fulfilled`)
        var e = ta
        ;((ta = null), (ra = 0), (ia = null))
        for (var t = 0; t < e.length; t++) (0, e[t])()
      }
    }
    function sa(e, t) {
      var n = [],
        r = {
          status: `pending`,
          value: null,
          reason: null,
          then: function (e) {
            n.push(e)
          }
        }
      return (
        e.then(
          function () {
            ;((r.status = `fulfilled`), (r.value = t))
            for (var e = 0; e < n.length; e++) (0, n[e])(t)
          },
          function (e) {
            for (r.status = `rejected`, r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0)
          }
        ),
        r
      )
    }
    var ca = F.S
    F.S = function (e, t) {
      ;((Zl = Ce()),
        typeof t == `object` && t && typeof t.then == `function` && aa(e, t),
        ca !== null && ca(e, t))
    }
    var la = L(null)
    function ua() {
      var e = la.current
      return e === null ? Pl.pooledCache : e
    }
    function da(e, t) {
      t === null ? z(la, la.current) : z(la, t.pool)
    }
    function fa() {
      var e = ua()
      return e === null ? null : { parent: Qi._currentValue, pool: e }
    }
    var pa = Error(i(460)),
      ma = Error(i(474)),
      ha = Error(i(542)),
      ga = { then: function () {} }
    function _a(e) {
      return ((e = e.status), e === `fulfilled` || e === `rejected`)
    }
    function va(e, t, n) {
      switch (
        ((n = e[n]), n === void 0 ? e.push(t) : n !== t && (t.then(Jt, Jt), (t = n)), t.status)
      ) {
        case `fulfilled`:
          return t.value
        case `rejected`:
          throw ((e = t.reason), Sa(e), e)
        default:
          if (typeof t.status == `string`) t.then(Jt, Jt)
          else {
            if (((e = Pl), e !== null && 100 < e.shellSuspendCounter)) throw Error(i(482))
            ;((e = t),
              (e.status = `pending`),
              e.then(
                function (e) {
                  if (t.status === `pending`) {
                    var n = t
                    ;((n.status = `fulfilled`), (n.value = e))
                  }
                },
                function (e) {
                  if (t.status === `pending`) {
                    var n = t
                    ;((n.status = `rejected`), (n.reason = e))
                  }
                }
              ))
          }
          switch (t.status) {
            case `fulfilled`:
              return t.value
            case `rejected`:
              throw ((e = t.reason), Sa(e), e)
          }
          throw ((ba = t), pa)
      }
    }
    function ya(e) {
      try {
        var t = e._init
        return t(e._payload)
      } catch (e) {
        throw typeof e == `object` && e && typeof e.then == `function` ? ((ba = e), pa) : e
      }
    }
    var ba = null
    function xa() {
      if (ba === null) throw Error(i(459))
      var e = ba
      return ((ba = null), e)
    }
    function Sa(e) {
      if (e === pa || e === ha) throw Error(i(483))
    }
    var Ca = null,
      wa = 0
    function Ta(e) {
      var t = wa
      return ((wa += 1), Ca === null && (Ca = []), va(Ca, e, t))
    }
    function Ea(e, t) {
      ;((t = t.props.ref), (e.ref = t === void 0 ? null : t))
    }
    function Y(e, t) {
      throw t.$$typeof === g
        ? Error(i(525))
        : ((e = Object.prototype.toString.call(t)),
          Error(
            i(
              31,
              e === `[object Object]` ? `object with keys {` + Object.keys(t).join(`, `) + `}` : e
            )
          ))
    }
    function Da(e) {
      function t(t, n) {
        if (e) {
          var r = t.deletions
          r === null ? ((t.deletions = [n]), (t.flags |= 16)) : r.push(n)
        }
      }
      function n(n, r) {
        if (!e) return null
        for (; r !== null; ) (t(n, r), (r = r.sibling))
        return null
      }
      function r(e) {
        for (var t = new Map(); e !== null; )
          (e.key === null ? t.set(e.index, e) : t.set(e.key, e), (e = e.sibling))
        return t
      }
      function a(e, t) {
        return ((e = ei(e, t)), (e.index = 0), (e.sibling = null), e)
      }
      function o(t, n, r) {
        return (
          (t.index = r),
          e
            ? ((r = t.alternate),
              r === null
                ? ((t.flags |= 67108866), n)
                : ((r = r.index), r < n ? ((t.flags |= 67108866), n) : r))
            : ((t.flags |= 1048576), n)
        )
      }
      function s(t) {
        return (e && t.alternate === null && (t.flags |= 67108866), t)
      }
      function c(e, t, n, r) {
        return t === null || t.tag !== 6
          ? ((t = ii(n, e.mode, r)), (t.return = e), t)
          : ((t = a(t, n)), (t.return = e), t)
      }
      function l(e, t, n, r) {
        var i = n.type
        return i === y
          ? d(e, t, n.props.children, r, n.key)
          : t !== null &&
              (t.elementType === i ||
                (typeof i == `object` && i && i.$$typeof === O && ya(i) === t.type))
            ? ((t = a(t, n.props)), Ea(t, n), (t.return = e), t)
            : ((t = ni(n.type, n.key, n.props, null, e.mode, r)), Ea(t, n), (t.return = e), t)
      }
      function u(e, t, n, r) {
        return t === null ||
          t.tag !== 4 ||
          t.stateNode.containerInfo !== n.containerInfo ||
          t.stateNode.implementation !== n.implementation
          ? ((t = oi(n, e.mode, r)), (t.return = e), t)
          : ((t = a(t, n.children || [])), (t.return = e), t)
      }
      function d(e, t, n, r, i) {
        return t === null || t.tag !== 7
          ? ((t = ri(n, e.mode, r, i)), (t.return = e), t)
          : ((t = a(t, n)), (t.return = e), t)
      }
      function f(e, t, n) {
        if ((typeof t == `string` && t !== ``) || typeof t == `number` || typeof t == `bigint`)
          return ((t = ii(`` + t, e.mode, n)), (t.return = e), t)
        if (typeof t == `object` && t) {
          switch (t.$$typeof) {
            case _:
              return (
                (n = ni(t.type, t.key, t.props, null, e.mode, n)), Ea(n, t), (n.return = e), n
              )
            case v:
              return ((t = oi(t, e.mode, n)), (t.return = e), t)
            case O:
              return ((t = ya(t)), f(e, t, n))
          }
          if (P(t) || M(t)) return ((t = ri(t, e.mode, n, null)), (t.return = e), t)
          if (typeof t.then == `function`) return f(e, Ta(t), n)
          if (t.$$typeof === C) return f(e, qi(e, t), n)
          Y(e, t)
        }
        return null
      }
      function p(e, t, n, r) {
        var i = t === null ? null : t.key
        if ((typeof n == `string` && n !== ``) || typeof n == `number` || typeof n == `bigint`)
          return i === null ? c(e, t, `` + n, r) : null
        if (typeof n == `object` && n) {
          switch (n.$$typeof) {
            case _:
              return n.key === i ? l(e, t, n, r) : null
            case v:
              return n.key === i ? u(e, t, n, r) : null
            case O:
              return ((n = ya(n)), p(e, t, n, r))
          }
          if (P(n) || M(n)) return i === null ? d(e, t, n, r, null) : null
          if (typeof n.then == `function`) return p(e, t, Ta(n), r)
          if (n.$$typeof === C) return p(e, t, qi(e, n), r)
          Y(e, n)
        }
        return null
      }
      function m(e, t, n, r, i) {
        if ((typeof r == `string` && r !== ``) || typeof r == `number` || typeof r == `bigint`)
          return ((e = e.get(n) || null), c(t, e, `` + r, i))
        if (typeof r == `object` && r) {
          switch (r.$$typeof) {
            case _:
              return ((e = e.get(r.key === null ? n : r.key) || null), l(t, e, r, i))
            case v:
              return ((e = e.get(r.key === null ? n : r.key) || null), u(t, e, r, i))
            case O:
              return ((r = ya(r)), m(e, t, n, r, i))
          }
          if (P(r) || M(r)) return ((e = e.get(n) || null), d(t, e, r, i, null))
          if (typeof r.then == `function`) return m(e, t, n, Ta(r), i)
          if (r.$$typeof === C) return m(e, t, n, qi(t, r), i)
          Y(t, r)
        }
        return null
      }
      function h(i, a, s, c) {
        for (
          var l = null, u = null, d = a, h = (a = 0), g = null;
          d !== null && h < s.length;
          h++
        ) {
          d.index > h ? ((g = d), (d = null)) : (g = d.sibling)
          var _ = p(i, d, s[h], c)
          if (_ === null) {
            d === null && (d = g)
            break
          }
          ;(e && d && _.alternate === null && t(i, d),
            (a = o(_, a, h)),
            u === null ? (l = _) : (u.sibling = _),
            (u = _),
            (d = g))
        }
        if (h === s.length) return (n(i, d), Ti && vi(i, h), l)
        if (d === null) {
          for (; h < s.length; h++)
            ((d = f(i, s[h], c)),
              d !== null && ((a = o(d, a, h)), u === null ? (l = d) : (u.sibling = d), (u = d)))
          return (Ti && vi(i, h), l)
        }
        for (d = r(d); h < s.length; h++)
          ((g = m(d, i, h, s[h], c)),
            g !== null &&
              (e && g.alternate !== null && d.delete(g.key === null ? h : g.key),
              (a = o(g, a, h)),
              u === null ? (l = g) : (u.sibling = g),
              (u = g)))
        return (
          e &&
            d.forEach(function (e) {
              return t(i, e)
            }),
          Ti && vi(i, h),
          l
        )
      }
      function g(a, s, c, l) {
        if (c == null) throw Error(i(151))
        for (
          var u = null, d = null, h = s, g = (s = 0), _ = null, v = c.next();
          h !== null && !v.done;
          g++, v = c.next()
        ) {
          h.index > g ? ((_ = h), (h = null)) : (_ = h.sibling)
          var y = p(a, h, v.value, l)
          if (y === null) {
            h === null && (h = _)
            break
          }
          ;(e && h && y.alternate === null && t(a, h),
            (s = o(y, s, g)),
            d === null ? (u = y) : (d.sibling = y),
            (d = y),
            (h = _))
        }
        if (v.done) return (n(a, h), Ti && vi(a, g), u)
        if (h === null) {
          for (; !v.done; g++, v = c.next())
            ((v = f(a, v.value, l)),
              v !== null && ((s = o(v, s, g)), d === null ? (u = v) : (d.sibling = v), (d = v)))
          return (Ti && vi(a, g), u)
        }
        for (h = r(h); !v.done; g++, v = c.next())
          ((v = m(h, a, g, v.value, l)),
            v !== null &&
              (e && v.alternate !== null && h.delete(v.key === null ? g : v.key),
              (s = o(v, s, g)),
              d === null ? (u = v) : (d.sibling = v),
              (d = v)))
        return (
          e &&
            h.forEach(function (e) {
              return t(a, e)
            }),
          Ti && vi(a, g),
          u
        )
      }
      function b(e, r, o, c) {
        if (
          (typeof o == `object` && o && o.type === y && o.key === null && (o = o.props.children),
          typeof o == `object` && o)
        ) {
          switch (o.$$typeof) {
            case _:
              a: {
                for (var l = o.key; r !== null; ) {
                  if (r.key === l) {
                    if (((l = o.type), l === y)) {
                      if (r.tag === 7) {
                        ;(n(e, r.sibling), (c = a(r, o.props.children)), (c.return = e), (e = c))
                        break a
                      }
                    } else if (
                      r.elementType === l ||
                      (typeof l == `object` && l && l.$$typeof === O && ya(l) === r.type)
                    ) {
                      ;(n(e, r.sibling), (c = a(r, o.props)), Ea(c, o), (c.return = e), (e = c))
                      break a
                    }
                    n(e, r)
                    break
                  } else t(e, r)
                  r = r.sibling
                }
                o.type === y
                  ? ((c = ri(o.props.children, e.mode, c, o.key)), (c.return = e), (e = c))
                  : ((c = ni(o.type, o.key, o.props, null, e.mode, c)),
                    Ea(c, o),
                    (c.return = e),
                    (e = c))
              }
              return s(e)
            case v:
              a: {
                for (l = o.key; r !== null; ) {
                  if (r.key === l)
                    if (
                      r.tag === 4 &&
                      r.stateNode.containerInfo === o.containerInfo &&
                      r.stateNode.implementation === o.implementation
                    ) {
                      ;(n(e, r.sibling), (c = a(r, o.children || [])), (c.return = e), (e = c))
                      break a
                    } else {
                      n(e, r)
                      break
                    }
                  else t(e, r)
                  r = r.sibling
                }
                ;((c = oi(o, e.mode, c)), (c.return = e), (e = c))
              }
              return s(e)
            case O:
              return ((o = ya(o)), b(e, r, o, c))
          }
          if (P(o)) return h(e, r, o, c)
          if (M(o)) {
            if (((l = M(o)), typeof l != `function`)) throw Error(i(150))
            return ((o = l.call(o)), g(e, r, o, c))
          }
          if (typeof o.then == `function`) return b(e, r, Ta(o), c)
          if (o.$$typeof === C) return b(e, r, qi(e, o), c)
          Y(e, o)
        }
        return (typeof o == `string` && o !== ``) || typeof o == `number` || typeof o == `bigint`
          ? ((o = `` + o),
            r !== null && r.tag === 6
              ? (n(e, r.sibling), (c = a(r, o)), (c.return = e), (e = c))
              : (n(e, r), (c = ii(o, e.mode, c)), (c.return = e), (e = c)),
            s(e))
          : n(e, r)
      }
      return function (e, t, n, r) {
        try {
          wa = 0
          var i = b(e, t, n, r)
          return ((Ca = null), i)
        } catch (t) {
          if (t === pa || t === ha) throw t
          var a = Qr(29, t, null, e.mode)
          return ((a.lanes = r), (a.return = e), a)
        }
      }
    }
    var Oa = Da(!0),
      ka = Da(!1),
      Aa = !1
    function ja(e) {
      e.updateQueue = {
        baseState: e.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: { pending: null, lanes: 0, hiddenCallbacks: null },
        callbacks: null
      }
    }
    function Ma(e, t) {
      ;((e = e.updateQueue),
        t.updateQueue === e &&
          (t.updateQueue = {
            baseState: e.baseState,
            firstBaseUpdate: e.firstBaseUpdate,
            lastBaseUpdate: e.lastBaseUpdate,
            shared: e.shared,
            callbacks: null
          }))
    }
    function Na(e) {
      return { lane: e, tag: 0, payload: null, callback: null, next: null }
    }
    function Pa(e, t, n) {
      var r = e.updateQueue
      if (r === null) return null
      if (((r = r.shared), Nl & 2)) {
        var i = r.pending
        return (
          i === null ? (t.next = t) : ((t.next = i.next), (i.next = t)),
          (r.pending = t),
          (t = Yr(e)),
          Jr(e, null, n),
          t
        )
      }
      return (Gr(e, r, t, n), Yr(e))
    }
    function Fa(e, t, n) {
      if (((t = t.updateQueue), t !== null && ((t = t.shared), n & 4194048))) {
        var r = t.lanes
        ;((r &= e.pendingLanes), (n |= r), (t.lanes = n), Xe(e, n))
      }
    }
    function Ia(e, t) {
      var n = e.updateQueue,
        r = e.alternate
      if (r !== null && ((r = r.updateQueue), n === r)) {
        var i = null,
          a = null
        if (((n = n.firstBaseUpdate), n !== null)) {
          do {
            var o = { lane: n.lane, tag: n.tag, payload: n.payload, callback: null, next: null }
            ;(a === null ? (i = a = o) : (a = a.next = o), (n = n.next))
          } while (n !== null)
          a === null ? (i = a = t) : (a = a.next = t)
        } else i = a = t
        ;((n = {
          baseState: r.baseState,
          firstBaseUpdate: i,
          lastBaseUpdate: a,
          shared: r.shared,
          callbacks: r.callbacks
        }),
          (e.updateQueue = n))
        return
      }
      ;((e = n.lastBaseUpdate),
        e === null ? (n.firstBaseUpdate = t) : (e.next = t),
        (n.lastBaseUpdate = t))
    }
    var La = !1
    function Ra() {
      if (La) {
        var e = ia
        if (e !== null) throw e
      }
    }
    function za(e, t, n, r) {
      La = !1
      var i = e.updateQueue
      Aa = !1
      var a = i.firstBaseUpdate,
        o = i.lastBaseUpdate,
        s = i.shared.pending
      if (s !== null) {
        i.shared.pending = null
        var c = s,
          l = c.next
        ;((c.next = null), o === null ? (a = l) : (o.next = l), (o = c))
        var u = e.alternate
        u !== null &&
          ((u = u.updateQueue),
          (s = u.lastBaseUpdate),
          s !== o && (s === null ? (u.firstBaseUpdate = l) : (s.next = l), (u.lastBaseUpdate = c)))
      }
      if (a !== null) {
        var d = i.baseState
        ;((o = 0), (u = l = c = null), (s = a))
        do {
          var f = s.lane & -536870913,
            p = f !== s.lane
          if (p ? ($ & f) === f : (r & f) === f) {
            ;(f !== 0 && f === ra && (La = !0),
              u !== null &&
                (u = u.next =
                  { lane: 0, tag: s.tag, payload: s.payload, callback: null, next: null }))
            a: {
              var m = e,
                g = s
              f = t
              var _ = n
              switch (g.tag) {
                case 1:
                  if (((m = g.payload), typeof m == `function`)) {
                    d = m.call(_, d, f)
                    break a
                  }
                  d = m
                  break a
                case 3:
                  m.flags = (m.flags & -65537) | 128
                case 0:
                  if (
                    ((m = g.payload), (f = typeof m == `function` ? m.call(_, d, f) : m), f == null)
                  )
                    break a
                  d = h({}, d, f)
                  break a
                case 2:
                  Aa = !0
              }
            }
            ;((f = s.callback),
              f !== null &&
                ((e.flags |= 64),
                p && (e.flags |= 8192),
                (p = i.callbacks),
                p === null ? (i.callbacks = [f]) : p.push(f)))
          } else
            ((p = { lane: f, tag: s.tag, payload: s.payload, callback: s.callback, next: null }),
              u === null ? ((l = u = p), (c = d)) : (u = u.next = p),
              (o |= f))
          if (((s = s.next), s === null)) {
            if (((s = i.shared.pending), s === null)) break
            ;((p = s),
              (s = p.next),
              (p.next = null),
              (i.lastBaseUpdate = p),
              (i.shared.pending = null))
          }
        } while (1)
        ;(u === null && (c = d),
          (i.baseState = c),
          (i.firstBaseUpdate = l),
          (i.lastBaseUpdate = u),
          a === null && (i.shared.lanes = 0),
          (Hl |= o),
          (e.lanes = o),
          (e.memoizedState = d))
      }
    }
    function Ba(e, t) {
      if (typeof e != `function`) throw Error(i(191, e))
      e.call(t)
    }
    function Va(e, t) {
      var n = e.callbacks
      if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) Ba(n[e], t)
    }
    var Ha = L(null),
      Ua = L(0)
    function Wa(e, t) {
      ;((e = Bl), z(Ua, e), z(Ha, t), (Bl = e | t.baseLanes))
    }
    function Ga() {
      ;(z(Ua, Bl), z(Ha, Ha.current))
    }
    function Ka() {
      ;((Bl = Ua.current), R(Ha), R(Ua))
    }
    var qa = L(null),
      Ja = null
    function Ya(e) {
      var t = e.alternate
      ;(z(eo, eo.current & 1),
        z(qa, e),
        Ja === null && (t === null || Ha.current !== null || t.memoizedState !== null) && (Ja = e))
    }
    function Xa(e) {
      ;(z(eo, eo.current), z(qa, e), Ja === null && (Ja = e))
    }
    function Za(e) {
      e.tag === 22 ? (z(eo, eo.current), z(qa, e), Ja === null && (Ja = e)) : Qa(e)
    }
    function Qa() {
      ;(z(eo, eo.current), z(qa, qa.current))
    }
    function $a(e) {
      ;(R(qa), Ja === e && (Ja = null), R(eo))
    }
    var eo = L(0)
    function to(e) {
      for (var t = e; t !== null; ) {
        if (t.tag === 13) {
          var n = t.memoizedState
          if (n !== null && ((n = n.dehydrated), n === null || af(n) || of(n))) return t
        } else if (
          t.tag === 19 &&
          (t.memoizedProps.revealOrder === `forwards` ||
            t.memoizedProps.revealOrder === `backwards` ||
            t.memoizedProps.revealOrder === `unstable_legacy-backwards` ||
            t.memoizedProps.revealOrder === `together`)
        ) {
          if (t.flags & 128) return t
        } else if (t.child !== null) {
          ;((t.child.return = t), (t = t.child))
          continue
        }
        if (t === e) break
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return null
          t = t.return
        }
        ;((t.sibling.return = t.return), (t = t.sibling))
      }
      return null
    }
    var no = 0,
      X = null,
      ro = null,
      io = null,
      ao = !1,
      oo = !1,
      so = !1,
      co = 0,
      lo = 0,
      uo = null,
      fo = 0
    function po() {
      throw Error(i(321))
    }
    function mo(e, t) {
      if (t === null) return !1
      for (var n = 0; n < t.length && n < e.length; n++) if (!pr(e[n], t[n])) return !1
      return !0
    }
    function ho(e, t, n, r, i, a) {
      return (
        (no = a),
        (X = t),
        (t.memoizedState = null),
        (t.updateQueue = null),
        (t.lanes = 0),
        (F.H = e === null || e.memoizedState === null ? Z : Ms),
        (so = !1),
        (a = n(r, i)),
        (so = !1),
        oo && (a = _o(t, n, r, i)),
        go(e),
        a
      )
    }
    function go(e) {
      F.H = js
      var t = ro !== null && ro.next !== null
      if (((no = 0), (io = ro = X = null), (ao = !1), (lo = 0), (uo = null), t)) throw Error(i(300))
      e === null || Ys || ((e = e.dependencies), e !== null && Wi(e) && (Ys = !0))
    }
    function _o(e, t, n, r) {
      X = e
      var a = 0
      do {
        if ((oo && (uo = null), (lo = 0), (oo = !1), 25 <= a)) throw Error(i(301))
        if (((a += 1), (io = ro = null), e.updateQueue != null)) {
          var o = e.updateQueue
          ;((o.lastEffect = null),
            (o.events = null),
            (o.stores = null),
            o.memoCache != null && (o.memoCache.index = 0))
        }
        ;((F.H = Ns), (o = t(n, r)))
      } while (oo)
      return o
    }
    function vo() {
      var e = F.H,
        t = e.useState()[0]
      return (
        (t = typeof t.then == `function` ? To(t) : t),
        (e = e.useState()[0]),
        (ro === null ? null : ro.memoizedState) !== e && (X.flags |= 1024),
        t
      )
    }
    function yo() {
      var e = co !== 0
      return ((co = 0), e)
    }
    function bo(e, t, n) {
      ;((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~n))
    }
    function xo(e) {
      if (ao) {
        for (e = e.memoizedState; e !== null; ) {
          var t = e.queue
          ;(t !== null && (t.pending = null), (e = e.next))
        }
        ao = !1
      }
      ;((no = 0), (io = ro = X = null), (oo = !1), (lo = co = 0), (uo = null))
    }
    function So() {
      var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null }
      return (io === null ? (X.memoizedState = io = e) : (io = io.next = e), io)
    }
    function Co() {
      if (ro === null) {
        var e = X.alternate
        e = e === null ? null : e.memoizedState
      } else e = ro.next
      var t = io === null ? X.memoizedState : io.next
      if (t !== null) ((io = t), (ro = e))
      else {
        if (e === null) throw X.alternate === null ? Error(i(467)) : Error(i(310))
        ;((ro = e),
          (e = {
            memoizedState: ro.memoizedState,
            baseState: ro.baseState,
            baseQueue: ro.baseQueue,
            queue: ro.queue,
            next: null
          }),
          io === null ? (X.memoizedState = io = e) : (io = io.next = e))
      }
      return io
    }
    function wo() {
      return { lastEffect: null, events: null, stores: null, memoCache: null }
    }
    function To(e) {
      var t = lo
      return (
        (lo += 1),
        uo === null && (uo = []),
        (e = va(uo, e, t)),
        (t = X),
        (io === null ? t.memoizedState : io.next) === null &&
          ((t = t.alternate), (F.H = t === null || t.memoizedState === null ? Z : Ms)),
        e
      )
    }
    function Eo(e) {
      if (typeof e == `object` && e) {
        if (typeof e.then == `function`) return To(e)
        if (e.$$typeof === C) return Ki(e)
      }
      throw Error(i(438, String(e)))
    }
    function Do(e) {
      var t = null,
        n = X.updateQueue
      if ((n !== null && (t = n.memoCache), t == null)) {
        var r = X.alternate
        r !== null &&
          ((r = r.updateQueue),
          r !== null &&
            ((r = r.memoCache),
            r != null &&
              (t = {
                data: r.data.map(function (e) {
                  return e.slice()
                }),
                index: 0
              })))
      }
      if (
        ((t ??= { data: [], index: 0 }),
        n === null && ((n = wo()), (X.updateQueue = n)),
        (n.memoCache = t),
        (n = t.data[t.index]),
        n === void 0)
      )
        for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = A
      return (t.index++, n)
    }
    function Oo(e, t) {
      return typeof t == `function` ? t(e) : t
    }
    function ko(e) {
      return Ao(Co(), ro, e)
    }
    function Ao(e, t, n) {
      var r = e.queue
      if (r === null) throw Error(i(311))
      r.lastRenderedReducer = n
      var a = e.baseQueue,
        o = r.pending
      if (o !== null) {
        if (a !== null) {
          var s = a.next
          ;((a.next = o.next), (o.next = s))
        }
        ;((t.baseQueue = a = o), (r.pending = null))
      }
      if (((o = e.baseState), a === null)) e.memoizedState = o
      else {
        t = a.next
        var c = (s = null),
          l = null,
          u = t,
          d = !1
        do {
          var f = u.lane & -536870913
          if (f === u.lane ? (no & f) === f : ($ & f) === f) {
            var p = u.revertLane
            if (p === 0)
              (l !== null &&
                (l = l.next =
                  {
                    lane: 0,
                    revertLane: 0,
                    gesture: null,
                    action: u.action,
                    hasEagerState: u.hasEagerState,
                    eagerState: u.eagerState,
                    next: null
                  }),
                f === ra && (d = !0))
            else if ((no & p) === p) {
              ;((u = u.next), p === ra && (d = !0))
              continue
            } else
              ((f = {
                lane: 0,
                revertLane: u.revertLane,
                gesture: null,
                action: u.action,
                hasEagerState: u.hasEagerState,
                eagerState: u.eagerState,
                next: null
              }),
                l === null ? ((c = l = f), (s = o)) : (l = l.next = f),
                (X.lanes |= p),
                (Hl |= p))
            ;((f = u.action), so && n(o, f), (o = u.hasEagerState ? u.eagerState : n(o, f)))
          } else
            ((p = {
              lane: f,
              revertLane: u.revertLane,
              gesture: u.gesture,
              action: u.action,
              hasEagerState: u.hasEagerState,
              eagerState: u.eagerState,
              next: null
            }),
              l === null ? ((c = l = p), (s = o)) : (l = l.next = p),
              (X.lanes |= f),
              (Hl |= f))
          u = u.next
        } while (u !== null && u !== t)
        if (
          (l === null ? (s = o) : (l.next = c),
          !pr(o, e.memoizedState) && ((Ys = !0), d && ((n = ia), n !== null)))
        )
          throw n
        ;((e.memoizedState = o), (e.baseState = s), (e.baseQueue = l), (r.lastRenderedState = o))
      }
      return (a === null && (r.lanes = 0), [e.memoizedState, r.dispatch])
    }
    function jo(e) {
      var t = Co(),
        n = t.queue
      if (n === null) throw Error(i(311))
      n.lastRenderedReducer = e
      var r = n.dispatch,
        a = n.pending,
        o = t.memoizedState
      if (a !== null) {
        n.pending = null
        var s = (a = a.next)
        do ((o = e(o, s.action)), (s = s.next))
        while (s !== a)
        ;(pr(o, t.memoizedState) || (Ys = !0),
          (t.memoizedState = o),
          t.baseQueue === null && (t.baseState = o),
          (n.lastRenderedState = o))
      }
      return [o, r]
    }
    function Mo(e, t, n) {
      var r = X,
        a = Co(),
        o = Ti
      if (o) {
        if (n === void 0) throw Error(i(407))
        n = n()
      } else n = t()
      var s = !pr((ro || a).memoizedState, n)
      if (
        (s && ((a.memoizedState = n), (Ys = !0)),
        (a = a.queue),
        rs(Fo.bind(null, r, a, e), [e]),
        a.getSnapshot !== t || s || (io !== null && io.memoizedState.tag & 1))
      ) {
        if (
          ((r.flags |= 2048),
          Qo(9, { destroy: void 0 }, Po.bind(null, r, a, n, t), null),
          Pl === null)
        )
          throw Error(i(349))
        o || no & 127 || No(r, t, n)
      }
      return n
    }
    function No(e, t, n) {
      ;((e.flags |= 16384),
        (e = { getSnapshot: t, value: n }),
        (t = X.updateQueue),
        t === null
          ? ((t = wo()), (X.updateQueue = t), (t.stores = [e]))
          : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)))
    }
    function Po(e, t, n, r) {
      ;((t.value = n), (t.getSnapshot = r), Io(t) && Lo(e))
    }
    function Fo(e, t, n) {
      return n(function () {
        Io(t) && Lo(e)
      })
    }
    function Io(e) {
      var t = e.getSnapshot
      e = e.value
      try {
        var n = t()
        return !pr(e, n)
      } catch {
        return !0
      }
    }
    function Lo(e) {
      var t = qr(e, 2)
      t !== null && fu(t, e, 2)
    }
    function Ro(e) {
      var t = So()
      if (typeof e == `function`) {
        var n = e
        if (((e = n()), so)) {
          Pe(!0)
          try {
            n()
          } finally {
            Pe(!1)
          }
        }
      }
      return (
        (t.memoizedState = t.baseState = e),
        (t.queue = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: Oo,
          lastRenderedState: e
        }),
        t
      )
    }
    function zo(e, t, n, r) {
      return ((e.baseState = n), Ao(e, ro, typeof r == `function` ? r : Oo))
    }
    function Bo(e, t, n, r, a) {
      if (Os(e)) throw Error(i(485))
      if (((e = t.action), e !== null)) {
        var o = {
          payload: a,
          action: e,
          next: null,
          isTransition: !0,
          status: `pending`,
          value: null,
          reason: null,
          listeners: [],
          then: function (e) {
            o.listeners.push(e)
          }
        }
        ;(F.T === null ? (o.isTransition = !1) : n(!0),
          r(o),
          (n = t.pending),
          n === null
            ? ((o.next = t.pending = o), Vo(t, o))
            : ((o.next = n.next), (t.pending = n.next = o)))
      }
    }
    function Vo(e, t) {
      var n = t.action,
        r = t.payload,
        i = e.state
      if (t.isTransition) {
        var a = F.T,
          o = {}
        F.T = o
        try {
          var s = n(i, r),
            c = F.S
          ;(c !== null && c(o, s), Ho(e, t, s))
        } catch (n) {
          Wo(e, t, n)
        } finally {
          ;(a !== null && o.types !== null && (a.types = o.types), (F.T = a))
        }
      } else
        try {
          ;((a = n(i, r)), Ho(e, t, a))
        } catch (n) {
          Wo(e, t, n)
        }
    }
    function Ho(e, t, n) {
      typeof n == `object` && n && typeof n.then == `function`
        ? n.then(
            function (n) {
              Uo(e, t, n)
            },
            function (n) {
              return Wo(e, t, n)
            }
          )
        : Uo(e, t, n)
    }
    function Uo(e, t, n) {
      ;((t.status = `fulfilled`),
        (t.value = n),
        Go(t),
        (e.state = n),
        (t = e.pending),
        t !== null &&
          ((n = t.next), n === t ? (e.pending = null) : ((n = n.next), (t.next = n), Vo(e, n))))
    }
    function Wo(e, t, n) {
      var r = e.pending
      if (((e.pending = null), r !== null)) {
        r = r.next
        do ((t.status = `rejected`), (t.reason = n), Go(t), (t = t.next))
        while (t !== r)
      }
      e.action = null
    }
    function Go(e) {
      e = e.listeners
      for (var t = 0; t < e.length; t++) (0, e[t])()
    }
    function Ko(e, t) {
      return t
    }
    function qo(e, t) {
      if (Ti) {
        var n = Pl.formState
        if (n !== null) {
          a: {
            var r = X
            if (Ti) {
              if (wi) {
                b: {
                  for (var i = wi, a = Di; i.nodeType !== 8; ) {
                    if (!a) {
                      i = null
                      break b
                    }
                    if (((i = cf(i.nextSibling)), i === null)) {
                      i = null
                      break b
                    }
                  }
                  ;((a = i.data), (i = a === `F!` || a === `F` ? i : null))
                }
                if (i) {
                  ;((wi = cf(i.nextSibling)), (r = i.data === `F!`))
                  break a
                }
              }
              ki(r)
            }
            r = !1
          }
          r && (t = n[0])
        }
      }
      return (
        (n = So()),
        (n.memoizedState = n.baseState = t),
        (r = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: Ko,
          lastRenderedState: t
        }),
        (n.queue = r),
        (n = Ts.bind(null, X, r)),
        (r.dispatch = n),
        (r = Ro(!1)),
        (a = Ds.bind(null, X, !1, r.queue)),
        (r = So()),
        (i = { state: t, dispatch: null, action: e, pending: null }),
        (r.queue = i),
        (n = Bo.bind(null, X, i, a, n)),
        (i.dispatch = n),
        (r.memoizedState = e),
        [t, n, !1]
      )
    }
    function Jo(e) {
      return Yo(Co(), ro, e)
    }
    function Yo(e, t, n) {
      if (
        ((t = Ao(e, t, Ko)[0]),
        (e = ko(Oo)[0]),
        typeof t == `object` && t && typeof t.then == `function`)
      )
        try {
          var r = To(t)
        } catch (e) {
          throw e === pa ? ha : e
        }
      else r = t
      t = Co()
      var i = t.queue,
        a = i.dispatch
      return (
        n !== t.memoizedState &&
          ((X.flags |= 2048), Qo(9, { destroy: void 0 }, Xo.bind(null, i, n), null)),
        [r, a, e]
      )
    }
    function Xo(e, t) {
      e.action = t
    }
    function Zo(e) {
      var t = Co(),
        n = ro
      if (n !== null) return Yo(t, n, e)
      ;(Co(), (t = t.memoizedState), (n = Co()))
      var r = n.queue.dispatch
      return ((n.memoizedState = e), [t, r, !1])
    }
    function Qo(e, t, n, r) {
      return (
        (e = { tag: e, create: n, deps: r, inst: t, next: null }),
        (t = X.updateQueue),
        t === null && ((t = wo()), (X.updateQueue = t)),
        (n = t.lastEffect),
        n === null
          ? (t.lastEffect = e.next = e)
          : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e)),
        e
      )
    }
    function $o() {
      return Co().memoizedState
    }
    function es(e, t, n, r) {
      var i = So()
      ;((X.flags |= e),
        (i.memoizedState = Qo(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r)))
    }
    function ts(e, t, n, r) {
      var i = Co()
      r = r === void 0 ? null : r
      var a = i.memoizedState.inst
      ro !== null && r !== null && mo(r, ro.memoizedState.deps)
        ? (i.memoizedState = Qo(t, a, n, r))
        : ((X.flags |= e), (i.memoizedState = Qo(1 | t, a, n, r)))
    }
    function ns(e, t) {
      es(8390656, 8, e, t)
    }
    function rs(e, t) {
      ts(2048, 8, e, t)
    }
    function is(e) {
      X.flags |= 4
      var t = X.updateQueue
      if (t === null) ((t = wo()), (X.updateQueue = t), (t.events = [e]))
      else {
        var n = t.events
        n === null ? (t.events = [e]) : n.push(e)
      }
    }
    function as(e) {
      var t = Co().memoizedState
      return (
        is({ ref: t, nextImpl: e }),
        function () {
          if (Nl & 2) throw Error(i(440))
          return t.impl.apply(void 0, arguments)
        }
      )
    }
    function os(e, t) {
      return ts(4, 2, e, t)
    }
    function ss(e, t) {
      return ts(4, 4, e, t)
    }
    function cs(e, t) {
      if (typeof t == `function`) {
        e = e()
        var n = t(e)
        return function () {
          typeof n == `function` ? n() : t(null)
        }
      }
      if (t != null)
        return (
          (e = e()),
          (t.current = e),
          function () {
            t.current = null
          }
        )
    }
    function ls(e, t, n) {
      ;((n = n == null ? null : n.concat([e])), ts(4, 4, cs.bind(null, t, e), n))
    }
    function us() {}
    function ds(e, t) {
      var n = Co()
      t = t === void 0 ? null : t
      var r = n.memoizedState
      return t !== null && mo(t, r[1]) ? r[0] : ((n.memoizedState = [e, t]), e)
    }
    function fs(e, t) {
      var n = Co()
      t = t === void 0 ? null : t
      var r = n.memoizedState
      if (t !== null && mo(t, r[1])) return r[0]
      if (((r = e()), so)) {
        Pe(!0)
        try {
          e()
        } finally {
          Pe(!1)
        }
      }
      return ((n.memoizedState = [r, t]), r)
    }
    function ps(e, t, n) {
      return n === void 0 || (no & 1073741824 && !($ & 261930))
        ? (e.memoizedState = t)
        : ((e.memoizedState = n), (e = du()), (X.lanes |= e), (Hl |= e), n)
    }
    function ms(e, t, n, r) {
      return pr(n, t)
        ? n
        : Ha.current === null
          ? !(no & 42) || (no & 1073741824 && !($ & 261930))
            ? ((Ys = !0), (e.memoizedState = n))
            : ((e = du()), (X.lanes |= e), (Hl |= e), t)
          : ((e = ps(e, n, r)), pr(e, t) || (Ys = !0), e)
    }
    function hs(e, t, n, r, i) {
      var a = I.p
      I.p = a !== 0 && 8 > a ? a : 8
      var o = F.T,
        s = {}
      ;((F.T = s), Ds(e, !1, t, n))
      try {
        var c = i(),
          l = F.S
        ;(l !== null && l(s, c),
          typeof c == `object` && c && typeof c.then == `function`
            ? Es(e, t, sa(c, r), uu(e))
            : Es(e, t, r, uu(e)))
      } catch (n) {
        Es(e, t, { then: function () {}, status: `rejected`, reason: n }, uu())
      } finally {
        ;((I.p = a), o !== null && s.types !== null && (o.types = s.types), (F.T = o))
      }
    }
    function gs() {}
    function _s(e, t, n, r) {
      if (e.tag !== 5) throw Error(i(476))
      var a = vs(e).queue
      hs(
        e,
        a,
        t,
        te,
        n === null
          ? gs
          : function () {
              return (ys(e), n(r))
            }
      )
    }
    function vs(e) {
      var t = e.memoizedState
      if (t !== null) return t
      t = {
        memoizedState: te,
        baseState: te,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: Oo,
          lastRenderedState: te
        },
        next: null
      }
      var n = {}
      return (
        (t.next = {
          memoizedState: n,
          baseState: n,
          baseQueue: null,
          queue: {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: Oo,
            lastRenderedState: n
          },
          next: null
        }),
        (e.memoizedState = t),
        (e = e.alternate),
        e !== null && (e.memoizedState = t),
        t
      )
    }
    function ys(e) {
      var t = vs(e)
      ;(t.next === null && (t = e.alternate.memoizedState), Es(e, t.next.queue, {}, uu()))
    }
    function bs() {
      return Ki(Qf)
    }
    function xs() {
      return Co().memoizedState
    }
    function Ss() {
      return Co().memoizedState
    }
    function Cs(e) {
      for (var t = e.return; t !== null; ) {
        switch (t.tag) {
          case 24:
          case 3:
            var n = uu()
            e = Na(n)
            var r = Pa(t, e, n)
            ;(r !== null && (fu(r, t, n), Fa(r, t, n)), (t = { cache: $i() }), (e.payload = t))
            return
        }
        t = t.return
      }
    }
    function ws(e, t, n) {
      var r = uu()
      ;((n = {
        lane: r,
        revertLane: 0,
        gesture: null,
        action: n,
        hasEagerState: !1,
        eagerState: null,
        next: null
      }),
        Os(e) ? ks(t, n) : ((n = Kr(e, t, n, r)), n !== null && (fu(n, e, r), As(n, t, r))))
    }
    function Ts(e, t, n) {
      Es(e, t, n, uu())
    }
    function Es(e, t, n, r) {
      var i = {
        lane: r,
        revertLane: 0,
        gesture: null,
        action: n,
        hasEagerState: !1,
        eagerState: null,
        next: null
      }
      if (Os(e)) ks(t, i)
      else {
        var a = e.alternate
        if (
          e.lanes === 0 &&
          (a === null || a.lanes === 0) &&
          ((a = t.lastRenderedReducer), a !== null)
        )
          try {
            var o = t.lastRenderedState,
              s = a(o, n)
            if (((i.hasEagerState = !0), (i.eagerState = s), pr(s, o)))
              return (Gr(e, t, i, 0), Pl === null && Wr(), !1)
          } catch {}
        if (((n = Kr(e, t, i, r)), n !== null)) return (fu(n, e, r), As(n, t, r), !0)
      }
      return !1
    }
    function Ds(e, t, n, r) {
      if (
        ((r = {
          lane: 2,
          revertLane: ld(),
          gesture: null,
          action: r,
          hasEagerState: !1,
          eagerState: null,
          next: null
        }),
        Os(e))
      ) {
        if (t) throw Error(i(479))
      } else ((t = Kr(e, n, r, 2)), t !== null && fu(t, e, 2))
    }
    function Os(e) {
      var t = e.alternate
      return e === X || (t !== null && t === X)
    }
    function ks(e, t) {
      oo = ao = !0
      var n = e.pending
      ;(n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)), (e.pending = t))
    }
    function As(e, t, n) {
      if (n & 4194048) {
        var r = t.lanes
        ;((r &= e.pendingLanes), (n |= r), (t.lanes = n), Xe(e, n))
      }
    }
    var js = {
      readContext: Ki,
      use: Eo,
      useCallback: po,
      useContext: po,
      useEffect: po,
      useImperativeHandle: po,
      useLayoutEffect: po,
      useInsertionEffect: po,
      useMemo: po,
      useReducer: po,
      useRef: po,
      useState: po,
      useDebugValue: po,
      useDeferredValue: po,
      useTransition: po,
      useSyncExternalStore: po,
      useId: po,
      useHostTransitionStatus: po,
      useFormState: po,
      useActionState: po,
      useOptimistic: po,
      useMemoCache: po,
      useCacheRefresh: po
    }
    js.useEffectEvent = po
    var Z = {
        readContext: Ki,
        use: Eo,
        useCallback: function (e, t) {
          return ((So().memoizedState = [e, t === void 0 ? null : t]), e)
        },
        useContext: Ki,
        useEffect: ns,
        useImperativeHandle: function (e, t, n) {
          ;((n = n == null ? null : n.concat([e])), es(4194308, 4, cs.bind(null, t, e), n))
        },
        useLayoutEffect: function (e, t) {
          return es(4194308, 4, e, t)
        },
        useInsertionEffect: function (e, t) {
          es(4, 2, e, t)
        },
        useMemo: function (e, t) {
          var n = So()
          t = t === void 0 ? null : t
          var r = e()
          if (so) {
            Pe(!0)
            try {
              e()
            } finally {
              Pe(!1)
            }
          }
          return ((n.memoizedState = [r, t]), r)
        },
        useReducer: function (e, t, n) {
          var r = So()
          if (n !== void 0) {
            var i = n(t)
            if (so) {
              Pe(!0)
              try {
                n(t)
              } finally {
                Pe(!1)
              }
            }
          } else i = t
          return (
            (r.memoizedState = r.baseState = i),
            (e = {
              pending: null,
              lanes: 0,
              dispatch: null,
              lastRenderedReducer: e,
              lastRenderedState: i
            }),
            (r.queue = e),
            (e = e.dispatch = ws.bind(null, X, e)),
            [r.memoizedState, e]
          )
        },
        useRef: function (e) {
          var t = So()
          return ((e = { current: e }), (t.memoizedState = e))
        },
        useState: function (e) {
          e = Ro(e)
          var t = e.queue,
            n = Ts.bind(null, X, t)
          return ((t.dispatch = n), [e.memoizedState, n])
        },
        useDebugValue: us,
        useDeferredValue: function (e, t) {
          return ps(So(), e, t)
        },
        useTransition: function () {
          var e = Ro(!1)
          return ((e = hs.bind(null, X, e.queue, !0, !1)), (So().memoizedState = e), [!1, e])
        },
        useSyncExternalStore: function (e, t, n) {
          var r = X,
            a = So()
          if (Ti) {
            if (n === void 0) throw Error(i(407))
            n = n()
          } else {
            if (((n = t()), Pl === null)) throw Error(i(349))
            $ & 127 || No(r, t, n)
          }
          a.memoizedState = n
          var o = { value: n, getSnapshot: t }
          return (
            (a.queue = o),
            ns(Fo.bind(null, r, o, e), [e]),
            (r.flags |= 2048),
            Qo(9, { destroy: void 0 }, Po.bind(null, r, o, n, t), null),
            n
          )
        },
        useId: function () {
          var e = So(),
            t = Pl.identifierPrefix
          if (Ti) {
            var n = _i,
              r = gi
            ;((n = (r & ~(1 << (32 - Fe(r) - 1))).toString(32) + n),
              (t = `_` + t + `R_` + n),
              (n = co++),
              0 < n && (t += `H` + n.toString(32)),
              (t += `_`))
          } else ((n = fo++), (t = `_` + t + `r_` + n.toString(32) + `_`))
          return (e.memoizedState = t)
        },
        useHostTransitionStatus: bs,
        useFormState: qo,
        useActionState: qo,
        useOptimistic: function (e) {
          var t = So()
          t.memoizedState = t.baseState = e
          var n = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: null,
            lastRenderedState: null
          }
          return ((t.queue = n), (t = Ds.bind(null, X, !0, n)), (n.dispatch = t), [e, t])
        },
        useMemoCache: Do,
        useCacheRefresh: function () {
          return (So().memoizedState = Cs.bind(null, X))
        },
        useEffectEvent: function (e) {
          var t = So(),
            n = { impl: e }
          return (
            (t.memoizedState = n),
            function () {
              if (Nl & 2) throw Error(i(440))
              return n.impl.apply(void 0, arguments)
            }
          )
        }
      },
      Ms = {
        readContext: Ki,
        use: Eo,
        useCallback: ds,
        useContext: Ki,
        useEffect: rs,
        useImperativeHandle: ls,
        useInsertionEffect: os,
        useLayoutEffect: ss,
        useMemo: fs,
        useReducer: ko,
        useRef: $o,
        useState: function () {
          return ko(Oo)
        },
        useDebugValue: us,
        useDeferredValue: function (e, t) {
          return ms(Co(), ro.memoizedState, e, t)
        },
        useTransition: function () {
          var e = ko(Oo)[0],
            t = Co().memoizedState
          return [typeof e == `boolean` ? e : To(e), t]
        },
        useSyncExternalStore: Mo,
        useId: xs,
        useHostTransitionStatus: bs,
        useFormState: Jo,
        useActionState: Jo,
        useOptimistic: function (e, t) {
          return zo(Co(), ro, e, t)
        },
        useMemoCache: Do,
        useCacheRefresh: Ss
      }
    Ms.useEffectEvent = as
    var Ns = {
      readContext: Ki,
      use: Eo,
      useCallback: ds,
      useContext: Ki,
      useEffect: rs,
      useImperativeHandle: ls,
      useInsertionEffect: os,
      useLayoutEffect: ss,
      useMemo: fs,
      useReducer: jo,
      useRef: $o,
      useState: function () {
        return jo(Oo)
      },
      useDebugValue: us,
      useDeferredValue: function (e, t) {
        var n = Co()
        return ro === null ? ps(n, e, t) : ms(n, ro.memoizedState, e, t)
      },
      useTransition: function () {
        var e = jo(Oo)[0],
          t = Co().memoizedState
        return [typeof e == `boolean` ? e : To(e), t]
      },
      useSyncExternalStore: Mo,
      useId: xs,
      useHostTransitionStatus: bs,
      useFormState: Zo,
      useActionState: Zo,
      useOptimistic: function (e, t) {
        var n = Co()
        return ro === null ? ((n.baseState = e), [e, n.queue.dispatch]) : zo(n, ro, e, t)
      },
      useMemoCache: Do,
      useCacheRefresh: Ss
    }
    Ns.useEffectEvent = as
    function Ps(e, t, n, r) {
      ;((t = e.memoizedState),
        (n = n(r, t)),
        (n = n == null ? t : h({}, t, n)),
        (e.memoizedState = n),
        e.lanes === 0 && (e.updateQueue.baseState = n))
    }
    var Fs = {
      enqueueSetState: function (e, t, n) {
        e = e._reactInternals
        var r = uu(),
          i = Na(r)
        ;((i.payload = t),
          n != null && (i.callback = n),
          (t = Pa(e, i, r)),
          t !== null && (fu(t, e, r), Fa(t, e, r)))
      },
      enqueueReplaceState: function (e, t, n) {
        e = e._reactInternals
        var r = uu(),
          i = Na(r)
        ;((i.tag = 1),
          (i.payload = t),
          n != null && (i.callback = n),
          (t = Pa(e, i, r)),
          t !== null && (fu(t, e, r), Fa(t, e, r)))
      },
      enqueueForceUpdate: function (e, t) {
        e = e._reactInternals
        var n = uu(),
          r = Na(n)
        ;((r.tag = 2),
          t != null && (r.callback = t),
          (t = Pa(e, r, n)),
          t !== null && (fu(t, e, n), Fa(t, e, n)))
      }
    }
    function Is(e, t, n, r, i, a, o) {
      return (
        (e = e.stateNode),
        typeof e.shouldComponentUpdate == `function`
          ? e.shouldComponentUpdate(r, a, o)
          : t.prototype && t.prototype.isPureReactComponent
            ? !mr(n, r) || !mr(i, a)
            : !0
      )
    }
    function Ls(e, t, n, r) {
      ;((e = t.state),
        typeof t.componentWillReceiveProps == `function` && t.componentWillReceiveProps(n, r),
        typeof t.UNSAFE_componentWillReceiveProps == `function` &&
          t.UNSAFE_componentWillReceiveProps(n, r),
        t.state !== e && Fs.enqueueReplaceState(t, t.state, null))
    }
    function Rs(e, t) {
      var n = t
      if (`ref` in t) for (var r in ((n = {}), t)) r !== `ref` && (n[r] = t[r])
      if ((e = e.defaultProps))
        for (var i in (n === t && (n = h({}, n)), e)) n[i] === void 0 && (n[i] = e[i])
      return n
    }
    function zs(e) {
      Br(e)
    }
    function Bs(e) {
      console.error(e)
    }
    function Vs(e) {
      Br(e)
    }
    function Hs(e, t) {
      try {
        var n = e.onUncaughtError
        n(t.value, { componentStack: t.stack })
      } catch (e) {
        setTimeout(function () {
          throw e
        })
      }
    }
    function Us(e, t, n) {
      try {
        var r = e.onCaughtError
        r(n.value, { componentStack: n.stack, errorBoundary: t.tag === 1 ? t.stateNode : null })
      } catch (e) {
        setTimeout(function () {
          throw e
        })
      }
    }
    function Ws(e, t, n) {
      return (
        (n = Na(n)),
        (n.tag = 3),
        (n.payload = { element: null }),
        (n.callback = function () {
          Hs(e, t)
        }),
        n
      )
    }
    function Gs(e) {
      return ((e = Na(e)), (e.tag = 3), e)
    }
    function Ks(e, t, n, r) {
      var i = n.type.getDerivedStateFromError
      if (typeof i == `function`) {
        var a = r.value
        ;((e.payload = function () {
          return i(a)
        }),
          (e.callback = function () {
            Us(t, n, r)
          }))
      }
      var o = n.stateNode
      o !== null &&
        typeof o.componentDidCatch == `function` &&
        (e.callback = function () {
          ;(Us(t, n, r),
            typeof i != `function` && (eu === null ? (eu = new Set([this])) : eu.add(this)))
          var e = r.stack
          this.componentDidCatch(r.value, { componentStack: e === null ? `` : e })
        })
    }
    function qs(e, t, n, r, a) {
      if (((n.flags |= 32768), typeof r == `object` && r && typeof r.then == `function`)) {
        if (((t = n.alternate), t !== null && Ui(t, n, a, !0), (n = qa.current), n !== null)) {
          switch (n.tag) {
            case 31:
            case 13:
              return (
                Ja === null ? wu() : n.alternate === null && Vl === 0 && (Vl = 3),
                (n.flags &= -257),
                (n.flags |= 65536),
                (n.lanes = a),
                r === ga
                  ? (n.flags |= 16384)
                  : ((t = n.updateQueue),
                    t === null ? (n.updateQueue = new Set([r])) : t.add(r),
                    Uu(e, r, a)),
                !1
              )
            case 22:
              return (
                (n.flags |= 65536),
                r === ga
                  ? (n.flags |= 16384)
                  : ((t = n.updateQueue),
                    t === null
                      ? ((t = {
                          transitions: null,
                          markerInstances: null,
                          retryQueue: new Set([r])
                        }),
                        (n.updateQueue = t))
                      : ((n = t.retryQueue), n === null ? (t.retryQueue = new Set([r])) : n.add(r)),
                    Uu(e, r, a)),
                !1
              )
          }
          throw Error(i(435, n.tag))
        }
        return (Uu(e, r, a), wu(), !1)
      }
      if (Ti)
        return (
          (t = qa.current),
          t === null
            ? (r !== Oi && ((t = Error(i(423), { cause: r })), Fi(ci(t, n))),
              (e = e.current.alternate),
              (e.flags |= 65536),
              (a &= -a),
              (e.lanes |= a),
              (r = ci(r, n)),
              (a = Ws(e.stateNode, r, a)),
              Ia(e, a),
              Vl !== 4 && (Vl = 2))
            : (!(t.flags & 65536) && (t.flags |= 256),
              (t.flags |= 65536),
              (t.lanes = a),
              r !== Oi && ((e = Error(i(422), { cause: r })), Fi(ci(e, n)))),
          !1
        )
      var o = Error(i(520), { cause: r })
      if (((o = ci(o, n)), ql === null ? (ql = [o]) : ql.push(o), Vl !== 4 && (Vl = 2), t === null))
        return !0
      ;((r = ci(r, n)), (n = t))
      do {
        switch (n.tag) {
          case 3:
            return (
              (n.flags |= 65536),
              (e = a & -a),
              (n.lanes |= e),
              (e = Ws(n.stateNode, r, e)),
              Ia(n, e),
              !1
            )
          case 1:
            if (
              ((t = n.type),
              (o = n.stateNode),
              !(n.flags & 128) &&
                (typeof t.getDerivedStateFromError == `function` ||
                  (o !== null &&
                    typeof o.componentDidCatch == `function` &&
                    (eu === null || !eu.has(o)))))
            )
              return (
                (n.flags |= 65536),
                (a &= -a),
                (n.lanes |= a),
                (a = Gs(a)),
                Ks(a, e, n, r),
                Ia(n, a),
                !1
              )
        }
        n = n.return
      } while (n !== null)
      return !1
    }
    var Js = Error(i(461)),
      Ys = !1
    function Xs(e, t, n, r) {
      t.child = e === null ? ka(t, null, n, r) : Oa(t, e.child, n, r)
    }
    function Zs(e, t, n, r, i) {
      n = n.render
      var a = t.ref
      if (`ref` in r) {
        var o = {}
        for (var s in r) s !== `ref` && (o[s] = r[s])
      } else o = r
      return (
        Gi(t),
        (r = ho(e, t, n, o, a, i)),
        (s = yo()),
        e !== null && !Ys
          ? (bo(e, t, i), xc(e, t, i))
          : (Ti && s && bi(t), (t.flags |= 1), Xs(e, t, r, i), t.child)
      )
    }
    function Qs(e, t, n, r, i) {
      if (e === null) {
        var a = n.type
        return typeof a == `function` && !$r(a) && a.defaultProps === void 0 && n.compare === null
          ? ((t.tag = 15), (t.type = a), $s(e, t, a, r, i))
          : ((e = ni(n.type, null, r, t, t.mode, i)),
            (e.ref = t.ref),
            (e.return = t),
            (t.child = e))
      }
      if (((a = e.child), !Sc(e, i))) {
        var o = a.memoizedProps
        if (((n = n.compare), (n = n === null ? mr : n), n(o, r) && e.ref === t.ref))
          return xc(e, t, i)
      }
      return ((t.flags |= 1), (e = ei(a, r)), (e.ref = t.ref), (e.return = t), (t.child = e))
    }
    function $s(e, t, n, r, i) {
      if (e !== null) {
        var a = e.memoizedProps
        if (mr(a, r) && e.ref === t.ref)
          if (((Ys = !1), (t.pendingProps = r = a), Sc(e, i))) e.flags & 131072 && (Ys = !0)
          else return ((t.lanes = e.lanes), xc(e, t, i))
      }
      return sc(e, t, n, r, i)
    }
    function ec(e, t, n, r) {
      var i = r.children,
        a = e === null ? null : e.memoizedState
      if (
        (e === null &&
          t.stateNode === null &&
          (t.stateNode = {
            _visibility: 1,
            _pendingMarkers: null,
            _retryCache: null,
            _transitions: null
          }),
        r.mode === `hidden`)
      ) {
        if (t.flags & 128) {
          if (((a = a === null ? n : a.baseLanes | n), e !== null)) {
            for (r = t.child = e.child, i = 0; r !== null; )
              ((i = i | r.lanes | r.childLanes), (r = r.sibling))
            r = i & ~a
          } else ((r = 0), (t.child = null))
          return nc(e, t, a, n, r)
        }
        if (n & 536870912)
          ((t.memoizedState = { baseLanes: 0, cachePool: null }),
            e !== null && da(t, a === null ? null : a.cachePool),
            a === null ? Ga() : Wa(t, a),
            Za(t))
        else return ((r = t.lanes = 536870912), nc(e, t, a === null ? n : a.baseLanes | n, n, r))
      } else
        a === null
          ? (e !== null && da(t, null), Ga(), Qa(t))
          : (da(t, a.cachePool), Wa(t, a), Qa(t), (t.memoizedState = null))
      return (Xs(e, t, i, n), t.child)
    }
    function tc(e, t) {
      return (
        (e !== null && e.tag === 22) ||
          t.stateNode !== null ||
          (t.stateNode = {
            _visibility: 1,
            _pendingMarkers: null,
            _retryCache: null,
            _transitions: null
          }),
        t.sibling
      )
    }
    function nc(e, t, n, r, i) {
      var a = ua()
      return (
        (a = a === null ? null : { parent: Qi._currentValue, pool: a }),
        (t.memoizedState = { baseLanes: n, cachePool: a }),
        e !== null && da(t, null),
        Ga(),
        Za(t),
        e !== null && Ui(e, t, r, !0),
        (t.childLanes = i),
        null
      )
    }
    function rc(e, t) {
      return (
        (t = gc({ mode: t.mode, children: t.children }, e.mode)),
        (t.ref = e.ref),
        (e.child = t),
        (t.return = e),
        t
      )
    }
    function ic(e, t, n) {
      return (
        Oa(t, e.child, null, n),
        (e = rc(t, t.pendingProps)),
        (e.flags |= 2),
        $a(t),
        (t.memoizedState = null),
        e
      )
    }
    function ac(e, t, n) {
      var r = t.pendingProps,
        a = (t.flags & 128) != 0
      if (((t.flags &= -129), e === null)) {
        if (Ti) {
          if (r.mode === `hidden`) return ((e = rc(t, r)), (t.lanes = 536870912), tc(null, e))
          if (
            (Xa(t),
            (e = wi)
              ? ((e = rf(e, Di)),
                (e = e !== null && e.data === `&` ? e : null),
                e !== null &&
                  ((t.memoizedState = {
                    dehydrated: e,
                    treeContext: hi === null ? null : { id: gi, overflow: _i },
                    retryLane: 536870912,
                    hydrationErrors: null
                  }),
                  (n = ai(e)),
                  (n.return = t),
                  (t.child = n),
                  (Ci = t),
                  (wi = null)))
              : (e = null),
            e === null)
          )
            throw ki(t)
          return ((t.lanes = 536870912), null)
        }
        return rc(t, r)
      }
      var o = e.memoizedState
      if (o !== null) {
        var s = o.dehydrated
        if ((Xa(t), a))
          if (t.flags & 256) ((t.flags &= -257), (t = ic(e, t, n)))
          else if (t.memoizedState !== null) ((t.child = e.child), (t.flags |= 128), (t = null))
          else throw Error(i(558))
        else if ((Ys || Ui(e, t, n, !1), (a = (n & e.childLanes) !== 0), Ys || a)) {
          if (((r = Pl), r !== null && ((s = Ze(r, n)), s !== 0 && s !== o.retryLane)))
            throw ((o.retryLane = s), qr(e, s), fu(r, e, s), Js)
          ;(wu(), (t = ic(e, t, n)))
        } else
          ((e = o.treeContext),
            (wi = cf(s.nextSibling)),
            (Ci = t),
            (Ti = !0),
            (Ei = null),
            (Di = !1),
            e !== null && Si(t, e),
            (t = rc(t, r)),
            (t.flags |= 4096))
        return t
      }
      return (
        (e = ei(e.child, { mode: r.mode, children: r.children })),
        (e.ref = t.ref),
        (t.child = e),
        (e.return = t),
        e
      )
    }
    function oc(e, t) {
      var n = t.ref
      if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816)
      else {
        if (typeof n != `function` && typeof n != `object`) throw Error(i(284))
        ;(e === null || e.ref !== n) && (t.flags |= 4194816)
      }
    }
    function sc(e, t, n, r, i) {
      return (
        Gi(t),
        (n = ho(e, t, n, r, void 0, i)),
        (r = yo()),
        e !== null && !Ys
          ? (bo(e, t, i), xc(e, t, i))
          : (Ti && r && bi(t), (t.flags |= 1), Xs(e, t, n, i), t.child)
      )
    }
    function cc(e, t, n, r, i, a) {
      return (
        Gi(t),
        (t.updateQueue = null),
        (n = _o(t, r, n, i)),
        go(e),
        (r = yo()),
        e !== null && !Ys
          ? (bo(e, t, a), xc(e, t, a))
          : (Ti && r && bi(t), (t.flags |= 1), Xs(e, t, n, a), t.child)
      )
    }
    function lc(e, t, n, r, i) {
      if ((Gi(t), t.stateNode === null)) {
        var a = Xr,
          o = n.contextType
        ;(typeof o == `object` && o && (a = Ki(o)),
          (a = new n(r, a)),
          (t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null),
          (a.updater = Fs),
          (t.stateNode = a),
          (a._reactInternals = t),
          (a = t.stateNode),
          (a.props = r),
          (a.state = t.memoizedState),
          (a.refs = {}),
          ja(t),
          (o = n.contextType),
          (a.context = typeof o == `object` && o ? Ki(o) : Xr),
          (a.state = t.memoizedState),
          (o = n.getDerivedStateFromProps),
          typeof o == `function` && (Ps(t, n, o, r), (a.state = t.memoizedState)),
          typeof n.getDerivedStateFromProps == `function` ||
            typeof a.getSnapshotBeforeUpdate == `function` ||
            (typeof a.UNSAFE_componentWillMount != `function` &&
              typeof a.componentWillMount != `function`) ||
            ((o = a.state),
            typeof a.componentWillMount == `function` && a.componentWillMount(),
            typeof a.UNSAFE_componentWillMount == `function` && a.UNSAFE_componentWillMount(),
            o !== a.state && Fs.enqueueReplaceState(a, a.state, null),
            za(t, r, a, i),
            Ra(),
            (a.state = t.memoizedState)),
          typeof a.componentDidMount == `function` && (t.flags |= 4194308),
          (r = !0))
      } else if (e === null) {
        a = t.stateNode
        var s = t.memoizedProps,
          c = Rs(n, s)
        a.props = c
        var l = a.context,
          u = n.contextType
        ;((o = Xr), typeof u == `object` && u && (o = Ki(u)))
        var d = n.getDerivedStateFromProps
        ;((u = typeof d == `function` || typeof a.getSnapshotBeforeUpdate == `function`),
          (s = t.pendingProps !== s),
          u ||
            (typeof a.UNSAFE_componentWillReceiveProps != `function` &&
              typeof a.componentWillReceiveProps != `function`) ||
            ((s || l !== o) && Ls(t, a, r, o)),
          (Aa = !1))
        var f = t.memoizedState
        ;((a.state = f),
          za(t, r, a, i),
          Ra(),
          (l = t.memoizedState),
          s || f !== l || Aa
            ? (typeof d == `function` && (Ps(t, n, d, r), (l = t.memoizedState)),
              (c = Aa || Is(t, n, c, r, f, l, o))
                ? (u ||
                    (typeof a.UNSAFE_componentWillMount != `function` &&
                      typeof a.componentWillMount != `function`) ||
                    (typeof a.componentWillMount == `function` && a.componentWillMount(),
                    typeof a.UNSAFE_componentWillMount == `function` &&
                      a.UNSAFE_componentWillMount()),
                  typeof a.componentDidMount == `function` && (t.flags |= 4194308))
                : (typeof a.componentDidMount == `function` && (t.flags |= 4194308),
                  (t.memoizedProps = r),
                  (t.memoizedState = l)),
              (a.props = r),
              (a.state = l),
              (a.context = o),
              (r = c))
            : (typeof a.componentDidMount == `function` && (t.flags |= 4194308), (r = !1)))
      } else {
        ;((a = t.stateNode),
          Ma(e, t),
          (o = t.memoizedProps),
          (u = Rs(n, o)),
          (a.props = u),
          (d = t.pendingProps),
          (f = a.context),
          (l = n.contextType),
          (c = Xr),
          typeof l == `object` && l && (c = Ki(l)),
          (s = n.getDerivedStateFromProps),
          (l = typeof s == `function` || typeof a.getSnapshotBeforeUpdate == `function`) ||
            (typeof a.UNSAFE_componentWillReceiveProps != `function` &&
              typeof a.componentWillReceiveProps != `function`) ||
            ((o !== d || f !== c) && Ls(t, a, r, c)),
          (Aa = !1),
          (f = t.memoizedState),
          (a.state = f),
          za(t, r, a, i),
          Ra())
        var p = t.memoizedState
        o !== d || f !== p || Aa || (e !== null && e.dependencies !== null && Wi(e.dependencies))
          ? (typeof s == `function` && (Ps(t, n, s, r), (p = t.memoizedState)),
            (u =
              Aa ||
              Is(t, n, u, r, f, p, c) ||
              (e !== null && e.dependencies !== null && Wi(e.dependencies)))
              ? (l ||
                  (typeof a.UNSAFE_componentWillUpdate != `function` &&
                    typeof a.componentWillUpdate != `function`) ||
                  (typeof a.componentWillUpdate == `function` && a.componentWillUpdate(r, p, c),
                  typeof a.UNSAFE_componentWillUpdate == `function` &&
                    a.UNSAFE_componentWillUpdate(r, p, c)),
                typeof a.componentDidUpdate == `function` && (t.flags |= 4),
                typeof a.getSnapshotBeforeUpdate == `function` && (t.flags |= 1024))
              : (typeof a.componentDidUpdate != `function` ||
                  (o === e.memoizedProps && f === e.memoizedState) ||
                  (t.flags |= 4),
                typeof a.getSnapshotBeforeUpdate != `function` ||
                  (o === e.memoizedProps && f === e.memoizedState) ||
                  (t.flags |= 1024),
                (t.memoizedProps = r),
                (t.memoizedState = p)),
            (a.props = r),
            (a.state = p),
            (a.context = c),
            (r = u))
          : (typeof a.componentDidUpdate != `function` ||
              (o === e.memoizedProps && f === e.memoizedState) ||
              (t.flags |= 4),
            typeof a.getSnapshotBeforeUpdate != `function` ||
              (o === e.memoizedProps && f === e.memoizedState) ||
              (t.flags |= 1024),
            (r = !1))
      }
      return (
        (a = r),
        oc(e, t),
        (r = (t.flags & 128) != 0),
        a || r
          ? ((a = t.stateNode),
            (n = r && typeof n.getDerivedStateFromError != `function` ? null : a.render()),
            (t.flags |= 1),
            e !== null && r
              ? ((t.child = Oa(t, e.child, null, i)), (t.child = Oa(t, null, n, i)))
              : Xs(e, t, n, i),
            (t.memoizedState = a.state),
            (e = t.child))
          : (e = xc(e, t, i)),
        e
      )
    }
    function uc(e, t, n, r) {
      return (Ni(), (t.flags |= 256), Xs(e, t, n, r), t.child)
    }
    var dc = { dehydrated: null, treeContext: null, retryLane: 0, hydrationErrors: null }
    function fc(e) {
      return { baseLanes: e, cachePool: fa() }
    }
    function pc(e, t, n) {
      return ((e = e === null ? 0 : e.childLanes & ~n), t && (e |= Gl), e)
    }
    function mc(e, t, n) {
      var r = t.pendingProps,
        a = !1,
        o = (t.flags & 128) != 0,
        s
      if (
        ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : (eo.current & 2) != 0),
        s && ((a = !0), (t.flags &= -129)),
        (s = (t.flags & 32) != 0),
        (t.flags &= -33),
        e === null)
      ) {
        if (Ti) {
          if (
            (a ? Ya(t) : Qa(t),
            (e = wi)
              ? ((e = rf(e, Di)),
                (e = e !== null && e.data !== `&` ? e : null),
                e !== null &&
                  ((t.memoizedState = {
                    dehydrated: e,
                    treeContext: hi === null ? null : { id: gi, overflow: _i },
                    retryLane: 536870912,
                    hydrationErrors: null
                  }),
                  (n = ai(e)),
                  (n.return = t),
                  (t.child = n),
                  (Ci = t),
                  (wi = null)))
              : (e = null),
            e === null)
          )
            throw ki(t)
          return (of(e) ? (t.lanes = 32) : (t.lanes = 536870912), null)
        }
        var c = r.children
        return (
          (r = r.fallback),
          a
            ? (Qa(t),
              (a = t.mode),
              (c = gc({ mode: `hidden`, children: c }, a)),
              (r = ri(r, a, n, null)),
              (c.return = t),
              (r.return = t),
              (c.sibling = r),
              (t.child = c),
              (r = t.child),
              (r.memoizedState = fc(n)),
              (r.childLanes = pc(e, s, n)),
              (t.memoizedState = dc),
              tc(null, r))
            : (Ya(t), hc(t, c))
        )
      }
      var l = e.memoizedState
      if (l !== null && ((c = l.dehydrated), c !== null)) {
        if (o)
          t.flags & 256
            ? (Ya(t), (t.flags &= -257), (t = _c(e, t, n)))
            : t.memoizedState === null
              ? (Qa(t),
                (c = r.fallback),
                (a = t.mode),
                (r = gc({ mode: `visible`, children: r.children }, a)),
                (c = ri(c, a, n, null)),
                (c.flags |= 2),
                (r.return = t),
                (c.return = t),
                (r.sibling = c),
                (t.child = r),
                Oa(t, e.child, null, n),
                (r = t.child),
                (r.memoizedState = fc(n)),
                (r.childLanes = pc(e, s, n)),
                (t.memoizedState = dc),
                (t = tc(null, r)))
              : (Qa(t), (t.child = e.child), (t.flags |= 128), (t = null))
        else if ((Ya(t), of(c))) {
          if (((s = c.nextSibling && c.nextSibling.dataset), s)) var u = s.dgst
          ;((s = u),
            (r = Error(i(419))),
            (r.stack = ``),
            (r.digest = s),
            Fi({ value: r, source: null, stack: null }),
            (t = _c(e, t, n)))
        } else if ((Ys || Ui(e, t, n, !1), (s = (n & e.childLanes) !== 0), Ys || s)) {
          if (((s = Pl), s !== null && ((r = Ze(s, n)), r !== 0 && r !== l.retryLane)))
            throw ((l.retryLane = r), qr(e, r), fu(s, e, r), Js)
          ;(af(c) || wu(), (t = _c(e, t, n)))
        } else
          af(c)
            ? ((t.flags |= 192), (t.child = e.child), (t = null))
            : ((e = l.treeContext),
              (wi = cf(c.nextSibling)),
              (Ci = t),
              (Ti = !0),
              (Ei = null),
              (Di = !1),
              e !== null && Si(t, e),
              (t = hc(t, r.children)),
              (t.flags |= 4096))
        return t
      }
      return a
        ? (Qa(t),
          (c = r.fallback),
          (a = t.mode),
          (l = e.child),
          (u = l.sibling),
          (r = ei(l, { mode: `hidden`, children: r.children })),
          (r.subtreeFlags = l.subtreeFlags & 65011712),
          u === null ? ((c = ri(c, a, n, null)), (c.flags |= 2)) : (c = ei(u, c)),
          (c.return = t),
          (r.return = t),
          (r.sibling = c),
          (t.child = r),
          tc(null, r),
          (r = t.child),
          (c = e.child.memoizedState),
          c === null
            ? (c = fc(n))
            : ((a = c.cachePool),
              a === null
                ? (a = fa())
                : ((l = Qi._currentValue), (a = a.parent === l ? a : { parent: l, pool: l })),
              (c = { baseLanes: c.baseLanes | n, cachePool: a })),
          (r.memoizedState = c),
          (r.childLanes = pc(e, s, n)),
          (t.memoizedState = dc),
          tc(e.child, r))
        : (Ya(t),
          (n = e.child),
          (e = n.sibling),
          (n = ei(n, { mode: `visible`, children: r.children })),
          (n.return = t),
          (n.sibling = null),
          e !== null &&
            ((s = t.deletions), s === null ? ((t.deletions = [e]), (t.flags |= 16)) : s.push(e)),
          (t.child = n),
          (t.memoizedState = null),
          n)
    }
    function hc(e, t) {
      return ((t = gc({ mode: `visible`, children: t }, e.mode)), (t.return = e), (e.child = t))
    }
    function gc(e, t) {
      return ((e = Qr(22, e, null, t)), (e.lanes = 0), e)
    }
    function _c(e, t, n) {
      return (
        Oa(t, e.child, null, n),
        (e = hc(t, t.pendingProps.children)),
        (e.flags |= 2),
        (t.memoizedState = null),
        e
      )
    }
    function vc(e, t, n) {
      e.lanes |= t
      var r = e.alternate
      ;(r !== null && (r.lanes |= t), Vi(e.return, t, n))
    }
    function yc(e, t, n, r, i, a) {
      var o = e.memoizedState
      o === null
        ? (e.memoizedState = {
            isBackwards: t,
            rendering: null,
            renderingStartTime: 0,
            last: r,
            tail: n,
            tailMode: i,
            treeForkCount: a
          })
        : ((o.isBackwards = t),
          (o.rendering = null),
          (o.renderingStartTime = 0),
          (o.last = r),
          (o.tail = n),
          (o.tailMode = i),
          (o.treeForkCount = a))
    }
    function bc(e, t, n) {
      var r = t.pendingProps,
        i = r.revealOrder,
        a = r.tail
      r = r.children
      var o = eo.current,
        s = (o & 2) != 0
      if (
        (s ? ((o = (o & 1) | 2), (t.flags |= 128)) : (o &= 1),
        z(eo, o),
        Xs(e, t, r, n),
        (r = Ti ? fi : 0),
        !s && e !== null && e.flags & 128)
      )
        a: for (e = t.child; e !== null; ) {
          if (e.tag === 13) e.memoizedState !== null && vc(e, n, t)
          else if (e.tag === 19) vc(e, n, t)
          else if (e.child !== null) {
            ;((e.child.return = e), (e = e.child))
            continue
          }
          if (e === t) break a
          for (; e.sibling === null; ) {
            if (e.return === null || e.return === t) break a
            e = e.return
          }
          ;((e.sibling.return = e.return), (e = e.sibling))
        }
      switch (i) {
        case `forwards`:
          for (n = t.child, i = null; n !== null; )
            ((e = n.alternate), e !== null && to(e) === null && (i = n), (n = n.sibling))
          ;((n = i),
            n === null ? ((i = t.child), (t.child = null)) : ((i = n.sibling), (n.sibling = null)),
            yc(t, !1, i, n, a, r))
          break
        case `backwards`:
        case `unstable_legacy-backwards`:
          for (n = null, i = t.child, t.child = null; i !== null; ) {
            if (((e = i.alternate), e !== null && to(e) === null)) {
              t.child = i
              break
            }
            ;((e = i.sibling), (i.sibling = n), (n = i), (i = e))
          }
          yc(t, !0, n, null, a, r)
          break
        case `together`:
          yc(t, !1, null, null, void 0, r)
          break
        default:
          t.memoizedState = null
      }
      return t.child
    }
    function xc(e, t, n) {
      if (
        (e !== null && (t.dependencies = e.dependencies), (Hl |= t.lanes), (n & t.childLanes) === 0)
      )
        if (e !== null) {
          if ((Ui(e, t, n, !1), (n & t.childLanes) === 0)) return null
        } else return null
      if (e !== null && t.child !== e.child) throw Error(i(153))
      if (t.child !== null) {
        for (
          e = t.child, n = ei(e, e.pendingProps), t.child = n, n.return = t;
          e.sibling !== null;
        )
          ((e = e.sibling), (n = n.sibling = ei(e, e.pendingProps)), (n.return = t))
        n.sibling = null
      }
      return t.child
    }
    function Sc(e, t) {
      return (e.lanes & t) === 0 ? ((e = e.dependencies), !!(e !== null && Wi(e))) : !0
    }
    function Cc(e, t, n) {
      switch (t.tag) {
        case 3:
          ;(se(t, t.stateNode.containerInfo), zi(t, Qi, e.memoizedState.cache), Ni())
          break
        case 27:
        case 5:
          le(t)
          break
        case 4:
          se(t, t.stateNode.containerInfo)
          break
        case 10:
          zi(t, t.type, t.memoizedProps.value)
          break
        case 31:
          if (t.memoizedState !== null) return ((t.flags |= 128), Xa(t), null)
          break
        case 13:
          var r = t.memoizedState
          if (r !== null)
            return r.dehydrated === null
              ? (n & t.child.childLanes) === 0
                ? (Ya(t), (e = xc(e, t, n)), e === null ? null : e.sibling)
                : mc(e, t, n)
              : (Ya(t), (t.flags |= 128), null)
          Ya(t)
          break
        case 19:
          var i = (e.flags & 128) != 0
          if (
            ((r = (n & t.childLanes) !== 0), (r ||= (Ui(e, t, n, !1), (n & t.childLanes) !== 0)), i)
          ) {
            if (r) return bc(e, t, n)
            t.flags |= 128
          }
          if (
            ((i = t.memoizedState),
            i !== null && ((i.rendering = null), (i.tail = null), (i.lastEffect = null)),
            z(eo, eo.current),
            r)
          )
            break
          return null
        case 22:
          return ((t.lanes = 0), ec(e, t, n, t.pendingProps))
        case 24:
          zi(t, Qi, e.memoizedState.cache)
      }
      return xc(e, t, n)
    }
    function wc(e, t, n) {
      if (e !== null)
        if (e.memoizedProps !== t.pendingProps) Ys = !0
        else {
          if (!Sc(e, n) && !(t.flags & 128)) return ((Ys = !1), Cc(e, t, n))
          Ys = !!(e.flags & 131072)
        }
      else ((Ys = !1), Ti && t.flags & 1048576 && yi(t, fi, t.index))
      switch (((t.lanes = 0), t.tag)) {
        case 16:
          a: {
            var r = t.pendingProps
            if (((e = ya(t.elementType)), (t.type = e), typeof e == `function`))
              $r(e)
                ? ((r = Rs(e, r)), (t.tag = 1), (t = lc(null, t, e, r, n)))
                : ((t.tag = 0), (t = sc(null, t, e, r, n)))
            else {
              if (e != null) {
                var a = e.$$typeof
                if (a === w) {
                  ;((t.tag = 11), (t = Zs(null, t, e, r, n)))
                  break a
                } else if (a === D) {
                  ;((t.tag = 14), (t = Qs(null, t, e, r, n)))
                  break a
                }
              }
              throw ((t = ee(e) || e), Error(i(306, t, ``)))
            }
          }
          return t
        case 0:
          return sc(e, t, t.type, t.pendingProps, n)
        case 1:
          return ((r = t.type), (a = Rs(r, t.pendingProps)), lc(e, t, r, a, n))
        case 3:
          a: {
            if ((se(t, t.stateNode.containerInfo), e === null)) throw Error(i(387))
            r = t.pendingProps
            var o = t.memoizedState
            ;((a = o.element), Ma(e, t), za(t, r, null, n))
            var s = t.memoizedState
            if (
              ((r = s.cache),
              zi(t, Qi, r),
              r !== o.cache && Hi(t, [Qi], n, !0),
              Ra(),
              (r = s.element),
              o.isDehydrated)
            )
              if (
                ((o = { element: r, isDehydrated: !1, cache: s.cache }),
                (t.updateQueue.baseState = o),
                (t.memoizedState = o),
                t.flags & 256)
              ) {
                t = uc(e, t, r, n)
                break a
              } else if (r !== a) {
                ;((a = ci(Error(i(424)), t)), Fi(a), (t = uc(e, t, r, n)))
                break a
              } else {
                switch (((e = t.stateNode.containerInfo), e.nodeType)) {
                  case 9:
                    e = e.body
                    break
                  default:
                    e = e.nodeName === `HTML` ? e.ownerDocument.body : e
                }
                for (
                  wi = cf(e.firstChild),
                    Ci = t,
                    Ti = !0,
                    Ei = null,
                    Di = !0,
                    n = ka(t, null, r, n),
                    t.child = n;
                  n;
                )
                  ((n.flags = (n.flags & -3) | 4096), (n = n.sibling))
              }
            else {
              if ((Ni(), r === a)) {
                t = xc(e, t, n)
                break a
              }
              Xs(e, t, r, n)
            }
            t = t.child
          }
          return t
        case 26:
          return (
            oc(e, t),
            e === null
              ? (n = kf(t.type, null, t.pendingProps, null))
                ? (t.memoizedState = n)
                : Ti ||
                  ((n = t.type),
                  (e = t.pendingProps),
                  (r = Bd(ae.current).createElement(n)),
                  (r[rt] = t),
                  (r[it] = e),
                  Pd(r, n, e),
                  mt(r),
                  (t.stateNode = r))
              : (t.memoizedState = kf(t.type, e.memoizedProps, t.pendingProps, e.memoizedState)),
            null
          )
        case 27:
          return (
            le(t),
            e === null &&
              Ti &&
              ((r = t.stateNode = ff(t.type, t.pendingProps, ae.current)),
              (Ci = t),
              (Di = !0),
              (a = wi),
              Zd(t.type) ? ((lf = a), (wi = cf(r.firstChild))) : (wi = a)),
            Xs(e, t, t.pendingProps.children, n),
            oc(e, t),
            e === null && (t.flags |= 4194304),
            t.child
          )
        case 5:
          return (
            e === null &&
              Ti &&
              ((a = r = wi) &&
                ((r = tf(r, t.type, t.pendingProps, Di)),
                r === null
                  ? (a = !1)
                  : ((t.stateNode = r), (Ci = t), (wi = cf(r.firstChild)), (Di = !1), (a = !0))),
              a || ki(t)),
            le(t),
            (a = t.type),
            (o = t.pendingProps),
            (s = e === null ? null : e.memoizedProps),
            (r = o.children),
            Ud(a, o) ? (r = null) : s !== null && Ud(a, s) && (t.flags |= 32),
            t.memoizedState !== null && ((a = ho(e, t, vo, null, null, n)), (Qf._currentValue = a)),
            oc(e, t),
            Xs(e, t, r, n),
            t.child
          )
        case 6:
          return (
            e === null &&
              Ti &&
              ((e = n = wi) &&
                ((n = nf(n, t.pendingProps, Di)),
                n === null ? (e = !1) : ((t.stateNode = n), (Ci = t), (wi = null), (e = !0))),
              e || ki(t)),
            null
          )
        case 13:
          return mc(e, t, n)
        case 4:
          return (
            se(t, t.stateNode.containerInfo),
            (r = t.pendingProps),
            e === null ? (t.child = Oa(t, null, r, n)) : Xs(e, t, r, n),
            t.child
          )
        case 11:
          return Zs(e, t, t.type, t.pendingProps, n)
        case 7:
          return (Xs(e, t, t.pendingProps, n), t.child)
        case 8:
          return (Xs(e, t, t.pendingProps.children, n), t.child)
        case 12:
          return (Xs(e, t, t.pendingProps.children, n), t.child)
        case 10:
          return ((r = t.pendingProps), zi(t, t.type, r.value), Xs(e, t, r.children, n), t.child)
        case 9:
          return (
            (a = t.type._context),
            (r = t.pendingProps.children),
            Gi(t),
            (a = Ki(a)),
            (r = r(a)),
            (t.flags |= 1),
            Xs(e, t, r, n),
            t.child
          )
        case 14:
          return Qs(e, t, t.type, t.pendingProps, n)
        case 15:
          return $s(e, t, t.type, t.pendingProps, n)
        case 19:
          return bc(e, t, n)
        case 31:
          return ac(e, t, n)
        case 22:
          return ec(e, t, n, t.pendingProps)
        case 24:
          return (
            Gi(t),
            (r = Ki(Qi)),
            e === null
              ? ((a = ua()),
                a === null &&
                  ((a = Pl),
                  (o = $i()),
                  (a.pooledCache = o),
                  o.refCount++,
                  o !== null && (a.pooledCacheLanes |= n),
                  (a = o)),
                (t.memoizedState = { parent: r, cache: a }),
                ja(t),
                zi(t, Qi, a))
              : ((e.lanes & n) !== 0 && (Ma(e, t), za(t, null, null, n), Ra()),
                (a = e.memoizedState),
                (o = t.memoizedState),
                a.parent === r
                  ? ((r = o.cache), zi(t, Qi, r), r !== a.cache && Hi(t, [Qi], n, !0))
                  : ((a = { parent: r, cache: r }),
                    (t.memoizedState = a),
                    t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = a),
                    zi(t, Qi, r))),
            Xs(e, t, t.pendingProps.children, n),
            t.child
          )
        case 29:
          throw t.pendingProps
      }
      throw Error(i(156, t.tag))
    }
    function Tc(e) {
      e.flags |= 4
    }
    function Ec(e, t, n, r, i) {
      if (((t = (e.mode & 32) != 0) && (t = !1), t)) {
        if (((e.flags |= 16777216), (i & 335544128) === i))
          if (e.stateNode.complete) e.flags |= 8192
          else if (xu()) e.flags |= 8192
          else throw ((ba = ga), ma)
      } else e.flags &= -16777217
    }
    function Dc(e, t) {
      if (t.type !== `stylesheet` || t.state.loading & 4) e.flags &= -16777217
      else if (((e.flags |= 16777216), !Wf(t)))
        if (xu()) e.flags |= 8192
        else throw ((ba = ga), ma)
    }
    function Oc(e, t) {
      ;(t !== null && (e.flags |= 4),
        e.flags & 16384 && ((t = e.tag === 22 ? 536870912 : Ge()), (e.lanes |= t), (Kl |= t)))
    }
    function kc(e, t) {
      if (!Ti)
        switch (e.tailMode) {
          case `hidden`:
            t = e.tail
            for (var n = null; t !== null; ) (t.alternate !== null && (n = t), (t = t.sibling))
            n === null ? (e.tail = null) : (n.sibling = null)
            break
          case `collapsed`:
            n = e.tail
            for (var r = null; n !== null; ) (n.alternate !== null && (r = n), (n = n.sibling))
            r === null
              ? t || e.tail === null
                ? (e.tail = null)
                : (e.tail.sibling = null)
              : (r.sibling = null)
        }
    }
    function Ac(e) {
      var t = e.alternate !== null && e.alternate.child === e.child,
        n = 0,
        r = 0
      if (t)
        for (var i = e.child; i !== null; )
          ((n |= i.lanes | i.childLanes),
            (r |= i.subtreeFlags & 65011712),
            (r |= i.flags & 65011712),
            (i.return = e),
            (i = i.sibling))
      else
        for (i = e.child; i !== null; )
          ((n |= i.lanes | i.childLanes),
            (r |= i.subtreeFlags),
            (r |= i.flags),
            (i.return = e),
            (i = i.sibling))
      return ((e.subtreeFlags |= r), (e.childLanes = n), t)
    }
    function jc(e, t, n) {
      var r = t.pendingProps
      switch ((xi(t), t.tag)) {
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
          return (Ac(t), null)
        case 1:
          return (Ac(t), null)
        case 3:
          return (
            (n = t.stateNode),
            (r = null),
            e !== null && (r = e.memoizedState.cache),
            t.memoizedState.cache !== r && (t.flags |= 2048),
            Bi(Qi),
            ce(),
            n.pendingContext && ((n.context = n.pendingContext), (n.pendingContext = null)),
            (e === null || e.child === null) &&
              (Mi(t)
                ? Tc(t)
                : e === null ||
                  (e.memoizedState.isDehydrated && !(t.flags & 256)) ||
                  ((t.flags |= 1024), Pi())),
            Ac(t),
            null
          )
        case 26:
          var a = t.type,
            o = t.memoizedState
          return (
            e === null
              ? (Tc(t), o === null ? (Ac(t), Ec(t, a, null, r, n)) : (Ac(t), Dc(t, o)))
              : o
                ? o === e.memoizedState
                  ? (Ac(t), (t.flags &= -16777217))
                  : (Tc(t), Ac(t), Dc(t, o))
                : ((e = e.memoizedProps), e !== r && Tc(t), Ac(t), Ec(t, a, e, r, n)),
            null
          )
        case 27:
          if ((ue(t), (n = ae.current), (a = t.type), e !== null && t.stateNode != null))
            e.memoizedProps !== r && Tc(t)
          else {
            if (!r) {
              if (t.stateNode === null) throw Error(i(166))
              return (Ac(t), null)
            }
            ;((e = ie.current), Mi(t) ? Ai(t, e) : ((e = ff(a, r, n)), (t.stateNode = e), Tc(t)))
          }
          return (Ac(t), null)
        case 5:
          if ((ue(t), (a = t.type), e !== null && t.stateNode != null))
            e.memoizedProps !== r && Tc(t)
          else {
            if (!r) {
              if (t.stateNode === null) throw Error(i(166))
              return (Ac(t), null)
            }
            if (((o = ie.current), Mi(t))) Ai(t, o)
            else {
              var s = Bd(ae.current)
              switch (o) {
                case 1:
                  o = s.createElementNS(`http://www.w3.org/2000/svg`, a)
                  break
                case 2:
                  o = s.createElementNS(`http://www.w3.org/1998/Math/MathML`, a)
                  break
                default:
                  switch (a) {
                    case `svg`:
                      o = s.createElementNS(`http://www.w3.org/2000/svg`, a)
                      break
                    case `math`:
                      o = s.createElementNS(`http://www.w3.org/1998/Math/MathML`, a)
                      break
                    case `script`:
                      ;((o = s.createElement(`div`)),
                        (o.innerHTML = `<script><\/script>`),
                        (o = o.removeChild(o.firstChild)))
                      break
                    case `select`:
                      ;((o =
                        typeof r.is == `string`
                          ? s.createElement(`select`, { is: r.is })
                          : s.createElement(`select`)),
                        r.multiple ? (o.multiple = !0) : r.size && (o.size = r.size))
                      break
                    default:
                      o =
                        typeof r.is == `string`
                          ? s.createElement(a, { is: r.is })
                          : s.createElement(a)
                  }
              }
              ;((o[rt] = t), (o[it] = r))
              a: for (s = t.child; s !== null; ) {
                if (s.tag === 5 || s.tag === 6) o.appendChild(s.stateNode)
                else if (s.tag !== 4 && s.tag !== 27 && s.child !== null) {
                  ;((s.child.return = s), (s = s.child))
                  continue
                }
                if (s === t) break a
                for (; s.sibling === null; ) {
                  if (s.return === null || s.return === t) break a
                  s = s.return
                }
                ;((s.sibling.return = s.return), (s = s.sibling))
              }
              t.stateNode = o
              a: switch ((Pd(o, a, r), a)) {
                case `button`:
                case `input`:
                case `select`:
                case `textarea`:
                  r = !!r.autoFocus
                  break a
                case `img`:
                  r = !0
                  break a
                default:
                  r = !1
              }
              r && Tc(t)
            }
          }
          return (
            Ac(t), Ec(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null
          )
        case 6:
          if (e && t.stateNode != null) e.memoizedProps !== r && Tc(t)
          else {
            if (typeof r != `string` && t.stateNode === null) throw Error(i(166))
            if (((e = ae.current), Mi(t))) {
              if (((e = t.stateNode), (n = t.memoizedProps), (r = null), (a = Ci), a !== null))
                switch (a.tag) {
                  case 27:
                  case 5:
                    r = a.memoizedProps
                }
              ;((e[rt] = t),
                (e = !!(
                  e.nodeValue === n ||
                  (r !== null && !0 === r.suppressHydrationWarning) ||
                  jd(e.nodeValue, n)
                )),
                e || ki(t, !0))
            } else ((e = Bd(e).createTextNode(r)), (e[rt] = t), (t.stateNode = e))
          }
          return (Ac(t), null)
        case 31:
          if (((n = t.memoizedState), e === null || e.memoizedState !== null)) {
            if (((r = Mi(t)), n !== null)) {
              if (e === null) {
                if (!r) throw Error(i(318))
                if (((e = t.memoizedState), (e = e === null ? null : e.dehydrated), !e))
                  throw Error(i(557))
                e[rt] = t
              } else (Ni(), !(t.flags & 128) && (t.memoizedState = null), (t.flags |= 4))
              ;(Ac(t), (e = !1))
            } else
              ((n = Pi()),
                e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n),
                (e = !0))
            if (!e) return t.flags & 256 ? ($a(t), t) : ($a(t), null)
            if (t.flags & 128) throw Error(i(558))
          }
          return (Ac(t), null)
        case 13:
          if (
            ((r = t.memoizedState),
            e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
          ) {
            if (((a = Mi(t)), r !== null && r.dehydrated !== null)) {
              if (e === null) {
                if (!a) throw Error(i(318))
                if (((a = t.memoizedState), (a = a === null ? null : a.dehydrated), !a))
                  throw Error(i(317))
                a[rt] = t
              } else (Ni(), !(t.flags & 128) && (t.memoizedState = null), (t.flags |= 4))
              ;(Ac(t), (a = !1))
            } else
              ((a = Pi()),
                e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = a),
                (a = !0))
            if (!a) return t.flags & 256 ? ($a(t), t) : ($a(t), null)
          }
          return (
            $a(t),
            t.flags & 128
              ? ((t.lanes = n), t)
              : ((n = r !== null),
                (e = e !== null && e.memoizedState !== null),
                n &&
                  ((r = t.child),
                  (a = null),
                  r.alternate !== null &&
                    r.alternate.memoizedState !== null &&
                    r.alternate.memoizedState.cachePool !== null &&
                    (a = r.alternate.memoizedState.cachePool.pool),
                  (o = null),
                  r.memoizedState !== null &&
                    r.memoizedState.cachePool !== null &&
                    (o = r.memoizedState.cachePool.pool),
                  o !== a && (r.flags |= 2048)),
                n !== e && n && (t.child.flags |= 8192),
                Oc(t, t.updateQueue),
                Ac(t),
                null)
          )
        case 4:
          return (ce(), e === null && xd(t.stateNode.containerInfo), Ac(t), null)
        case 10:
          return (Bi(t.type), Ac(t), null)
        case 19:
          if ((R(eo), (r = t.memoizedState), r === null)) return (Ac(t), null)
          if (((a = (t.flags & 128) != 0), (o = r.rendering), o === null))
            if (a) kc(r, !1)
            else {
              if (Vl !== 0 || (e !== null && e.flags & 128))
                for (e = t.child; e !== null; ) {
                  if (((o = to(e)), o !== null)) {
                    for (
                      t.flags |= 128,
                        kc(r, !1),
                        e = o.updateQueue,
                        t.updateQueue = e,
                        Oc(t, e),
                        t.subtreeFlags = 0,
                        e = n,
                        n = t.child;
                      n !== null;
                    )
                      (ti(n, e), (n = n.sibling))
                    return (z(eo, (eo.current & 1) | 2), Ti && vi(t, r.treeForkCount), t.child)
                  }
                  e = e.sibling
                }
              r.tail !== null &&
                Ce() > Ql &&
                ((t.flags |= 128), (a = !0), kc(r, !1), (t.lanes = 4194304))
            }
          else {
            if (!a)
              if (((e = to(o)), e !== null)) {
                if (
                  ((t.flags |= 128),
                  (a = !0),
                  (e = e.updateQueue),
                  (t.updateQueue = e),
                  Oc(t, e),
                  kc(r, !0),
                  r.tail === null && r.tailMode === `hidden` && !o.alternate && !Ti)
                )
                  return (Ac(t), null)
              } else
                2 * Ce() - r.renderingStartTime > Ql &&
                  n !== 536870912 &&
                  ((t.flags |= 128), (a = !0), kc(r, !1), (t.lanes = 4194304))
            r.isBackwards
              ? ((o.sibling = t.child), (t.child = o))
              : ((e = r.last), e === null ? (t.child = o) : (e.sibling = o), (r.last = o))
          }
          return r.tail === null
            ? (Ac(t), null)
            : ((e = r.tail),
              (r.rendering = e),
              (r.tail = e.sibling),
              (r.renderingStartTime = Ce()),
              (e.sibling = null),
              (n = eo.current),
              z(eo, a ? (n & 1) | 2 : n & 1),
              Ti && vi(t, r.treeForkCount),
              e)
        case 22:
        case 23:
          return (
            $a(t),
            Ka(),
            (r = t.memoizedState !== null),
            e === null
              ? r && (t.flags |= 8192)
              : (e.memoizedState !== null) !== r && (t.flags |= 8192),
            r
              ? n & 536870912 &&
                !(t.flags & 128) &&
                (Ac(t), t.subtreeFlags & 6 && (t.flags |= 8192))
              : Ac(t),
            (n = t.updateQueue),
            n !== null && Oc(t, n.retryQueue),
            (n = null),
            e !== null &&
              e.memoizedState !== null &&
              e.memoizedState.cachePool !== null &&
              (n = e.memoizedState.cachePool.pool),
            (r = null),
            t.memoizedState !== null &&
              t.memoizedState.cachePool !== null &&
              (r = t.memoizedState.cachePool.pool),
            r !== n && (t.flags |= 2048),
            e !== null && R(la),
            null
          )
        case 24:
          return (
            (n = null),
            e !== null && (n = e.memoizedState.cache),
            t.memoizedState.cache !== n && (t.flags |= 2048),
            Bi(Qi),
            Ac(t),
            null
          )
        case 25:
          return null
        case 30:
          return null
      }
      throw Error(i(156, t.tag))
    }
    function Mc(e, t) {
      switch ((xi(t), t.tag)) {
        case 1:
          return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null)
        case 3:
          return (
            Bi(Qi),
            ce(),
            (e = t.flags),
            e & 65536 && !(e & 128) ? ((t.flags = (e & -65537) | 128), t) : null
          )
        case 26:
        case 27:
        case 5:
          return (ue(t), null)
        case 31:
          if (t.memoizedState !== null) {
            if (($a(t), t.alternate === null)) throw Error(i(340))
            Ni()
          }
          return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null)
        case 13:
          if (($a(t), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
            if (t.alternate === null) throw Error(i(340))
            Ni()
          }
          return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null)
        case 19:
          return (R(eo), null)
        case 4:
          return (ce(), null)
        case 10:
          return (Bi(t.type), null)
        case 22:
        case 23:
          return (
            $a(t),
            Ka(),
            e !== null && R(la),
            (e = t.flags),
            e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
          )
        case 24:
          return (Bi(Qi), null)
        case 25:
          return null
        default:
          return null
      }
    }
    function Nc(e, t) {
      switch ((xi(t), t.tag)) {
        case 3:
          ;(Bi(Qi), ce())
          break
        case 26:
        case 27:
        case 5:
          ue(t)
          break
        case 4:
          ce()
          break
        case 31:
          t.memoizedState !== null && $a(t)
          break
        case 13:
          $a(t)
          break
        case 19:
          R(eo)
          break
        case 10:
          Bi(t.type)
          break
        case 22:
        case 23:
          ;($a(t), Ka(), e !== null && R(la))
          break
        case 24:
          Bi(Qi)
      }
    }
    function Pc(e, t) {
      try {
        var n = t.updateQueue,
          r = n === null ? null : n.lastEffect
        if (r !== null) {
          var i = r.next
          n = i
          do {
            if ((n.tag & e) === e) {
              r = void 0
              var a = n.create,
                o = n.inst
              ;((r = a()), (o.destroy = r))
            }
            n = n.next
          } while (n !== i)
        }
      } catch (e) {
        Hu(t, t.return, e)
      }
    }
    function Fc(e, t, n) {
      try {
        var r = t.updateQueue,
          i = r === null ? null : r.lastEffect
        if (i !== null) {
          var a = i.next
          r = a
          do {
            if ((r.tag & e) === e) {
              var o = r.inst,
                s = o.destroy
              if (s !== void 0) {
                ;((o.destroy = void 0), (i = t))
                var c = n,
                  l = s
                try {
                  l()
                } catch (e) {
                  Hu(i, c, e)
                }
              }
            }
            r = r.next
          } while (r !== a)
        }
      } catch (e) {
        Hu(t, t.return, e)
      }
    }
    function Ic(e) {
      var t = e.updateQueue
      if (t !== null) {
        var n = e.stateNode
        try {
          Va(t, n)
        } catch (t) {
          Hu(e, e.return, t)
        }
      }
    }
    function Lc(e, t, n) {
      ;((n.props = Rs(e.type, e.memoizedProps)), (n.state = e.memoizedState))
      try {
        n.componentWillUnmount()
      } catch (n) {
        Hu(e, t, n)
      }
    }
    function Rc(e, t) {
      try {
        var n = e.ref
        if (n !== null) {
          switch (e.tag) {
            case 26:
            case 27:
            case 5:
              var r = e.stateNode
              break
            case 30:
              r = e.stateNode
              break
            default:
              r = e.stateNode
          }
          typeof n == `function` ? (e.refCleanup = n(r)) : (n.current = r)
        }
      } catch (n) {
        Hu(e, t, n)
      }
    }
    function zc(e, t) {
      var n = e.ref,
        r = e.refCleanup
      if (n !== null)
        if (typeof r == `function`)
          try {
            r()
          } catch (n) {
            Hu(e, t, n)
          } finally {
            ;((e.refCleanup = null), (e = e.alternate), e != null && (e.refCleanup = null))
          }
        else if (typeof n == `function`)
          try {
            n(null)
          } catch (n) {
            Hu(e, t, n)
          }
        else n.current = null
    }
    function Bc(e) {
      var t = e.type,
        n = e.memoizedProps,
        r = e.stateNode
      try {
        a: switch (t) {
          case `button`:
          case `input`:
          case `select`:
          case `textarea`:
            n.autoFocus && r.focus()
            break a
          case `img`:
            n.src ? (r.src = n.src) : n.srcSet && (r.srcset = n.srcSet)
        }
      } catch (t) {
        Hu(e, e.return, t)
      }
    }
    function Vc(e, t, n) {
      try {
        var r = e.stateNode
        ;(Fd(r, e.type, n, t), (r[it] = t))
      } catch (t) {
        Hu(e, e.return, t)
      }
    }
    function Hc(e) {
      return (
        e.tag === 5 || e.tag === 3 || e.tag === 26 || (e.tag === 27 && Zd(e.type)) || e.tag === 4
      )
    }
    function Uc(e) {
      a: for (;;) {
        for (; e.sibling === null; ) {
          if (e.return === null || Hc(e.return)) return null
          e = e.return
        }
        for (
          e.sibling.return = e.return, e = e.sibling;
          e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
        ) {
          if ((e.tag === 27 && Zd(e.type)) || e.flags & 2 || e.child === null || e.tag === 4)
            continue a
          ;((e.child.return = e), (e = e.child))
        }
        if (!(e.flags & 2)) return e.stateNode
      }
    }
    function Wc(e, t, n) {
      var r = e.tag
      if (r === 5 || r === 6)
        ((e = e.stateNode),
          t
            ? (n.nodeType === 9
                ? n.body
                : n.nodeName === `HTML`
                  ? n.ownerDocument.body
                  : n
              ).insertBefore(e, t)
            : ((t = n.nodeType === 9 ? n.body : n.nodeName === `HTML` ? n.ownerDocument.body : n),
              t.appendChild(e),
              (n = n._reactRootContainer),
              n != null || t.onclick !== null || (t.onclick = Jt)))
      else if (
        r !== 4 &&
        (r === 27 && Zd(e.type) && ((n = e.stateNode), (t = null)), (e = e.child), e !== null)
      )
        for (Wc(e, t, n), e = e.sibling; e !== null; ) (Wc(e, t, n), (e = e.sibling))
    }
    function Gc(e, t, n) {
      var r = e.tag
      if (r === 5 || r === 6) ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e))
      else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode), (e = e.child), e !== null))
        for (Gc(e, t, n), e = e.sibling; e !== null; ) (Gc(e, t, n), (e = e.sibling))
    }
    function Kc(e) {
      var t = e.stateNode,
        n = e.memoizedProps
      try {
        for (var r = e.type, i = t.attributes; i.length; ) t.removeAttributeNode(i[0])
        ;(Pd(t, r, n), (t[rt] = e), (t[it] = n))
      } catch (t) {
        Hu(e, e.return, t)
      }
    }
    var qc = !1,
      Jc = !1,
      Yc = !1,
      Xc = typeof WeakSet == `function` ? WeakSet : Set,
      Zc = null
    function Qc(e, t) {
      if (((e = e.containerInfo), (Rd = sp), (e = _r(e)), vr(e))) {
        if (`selectionStart` in e) var n = { start: e.selectionStart, end: e.selectionEnd }
        else
          a: {
            n = ((n = e.ownerDocument) && n.defaultView) || window
            var r = n.getSelection && n.getSelection()
            if (r && r.rangeCount !== 0) {
              n = r.anchorNode
              var a = r.anchorOffset,
                o = r.focusNode
              r = r.focusOffset
              try {
                ;(n.nodeType, o.nodeType)
              } catch {
                n = null
                break a
              }
              var s = 0,
                c = -1,
                l = -1,
                u = 0,
                d = 0,
                f = e,
                p = null
              b: for (;;) {
                for (
                  var m;
                  f !== n || (a !== 0 && f.nodeType !== 3) || (c = s + a),
                    f !== o || (r !== 0 && f.nodeType !== 3) || (l = s + r),
                    f.nodeType === 3 && (s += f.nodeValue.length),
                    (m = f.firstChild) !== null;
                )
                  ((p = f), (f = m))
                for (;;) {
                  if (f === e) break b
                  if (
                    (p === n && ++u === a && (c = s),
                    p === o && ++d === r && (l = s),
                    (m = f.nextSibling) !== null)
                  )
                    break
                  ;((f = p), (p = f.parentNode))
                }
                f = m
              }
              n = c === -1 || l === -1 ? null : { start: c, end: l }
            } else n = null
          }
        n ||= { start: 0, end: 0 }
      } else n = null
      for (zd = { focusedElem: e, selectionRange: n }, sp = !1, Zc = t; Zc !== null; )
        if (((t = Zc), (e = t.child), t.subtreeFlags & 1028 && e !== null))
          ((e.return = t), (Zc = e))
        else
          for (; Zc !== null; ) {
            switch (((t = Zc), (o = t.alternate), (e = t.flags), t.tag)) {
              case 0:
                if (e & 4 && ((e = t.updateQueue), (e = e === null ? null : e.events), e !== null))
                  for (n = 0; n < e.length; n++) ((a = e[n]), (a.ref.impl = a.nextImpl))
                break
              case 11:
              case 15:
                break
              case 1:
                if (e & 1024 && o !== null) {
                  ;((e = void 0),
                    (n = t),
                    (a = o.memoizedProps),
                    (o = o.memoizedState),
                    (r = n.stateNode))
                  try {
                    var h = Rs(n.type, a)
                    ;((e = r.getSnapshotBeforeUpdate(h, o)),
                      (r.__reactInternalSnapshotBeforeUpdate = e))
                  } catch (e) {
                    Hu(n, n.return, e)
                  }
                }
                break
              case 3:
                if (e & 1024) {
                  if (((e = t.stateNode.containerInfo), (n = e.nodeType), n === 9)) ef(e)
                  else if (n === 1)
                    switch (e.nodeName) {
                      case `HEAD`:
                      case `HTML`:
                      case `BODY`:
                        ef(e)
                        break
                      default:
                        e.textContent = ``
                    }
                }
                break
              case 5:
              case 26:
              case 27:
              case 6:
              case 4:
              case 17:
                break
              default:
                if (e & 1024) throw Error(i(163))
            }
            if (((e = t.sibling), e !== null)) {
              ;((e.return = t.return), (Zc = e))
              break
            }
            Zc = t.return
          }
    }
    function $c(e, t, n) {
      var r = n.flags
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          ;(ml(e, n), r & 4 && Pc(5, n))
          break
        case 1:
          if ((ml(e, n), r & 4))
            if (((e = n.stateNode), t === null))
              try {
                e.componentDidMount()
              } catch (e) {
                Hu(n, n.return, e)
              }
            else {
              var i = Rs(n.type, t.memoizedProps)
              t = t.memoizedState
              try {
                e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate)
              } catch (e) {
                Hu(n, n.return, e)
              }
            }
          ;(r & 64 && Ic(n), r & 512 && Rc(n, n.return))
          break
        case 3:
          if ((ml(e, n), r & 64 && ((e = n.updateQueue), e !== null))) {
            if (((t = null), n.child !== null))
              switch (n.child.tag) {
                case 27:
                case 5:
                  t = n.child.stateNode
                  break
                case 1:
                  t = n.child.stateNode
              }
            try {
              Va(e, t)
            } catch (e) {
              Hu(n, n.return, e)
            }
          }
          break
        case 27:
          t === null && r & 4 && Kc(n)
        case 26:
        case 5:
          ;(ml(e, n), t === null && r & 4 && Bc(n), r & 512 && Rc(n, n.return))
          break
        case 12:
          ml(e, n)
          break
        case 31:
          ;(ml(e, n), r & 4 && al(e, n))
          break
        case 13:
          ;(ml(e, n),
            r & 4 && ol(e, n),
            r & 64 &&
              ((e = n.memoizedState),
              e !== null && ((e = e.dehydrated), e !== null && ((n = Ku.bind(null, n)), sf(e, n)))))
          break
        case 22:
          if (((r = n.memoizedState !== null || qc), !r)) {
            ;((t = (t !== null && t.memoizedState !== null) || Jc), (i = qc))
            var a = Jc
            ;((qc = r),
              (Jc = t) && !a ? gl(e, n, (n.subtreeFlags & 8772) != 0) : ml(e, n),
              (qc = i),
              (Jc = a))
          }
          break
        case 30:
          break
        default:
          ml(e, n)
      }
    }
    function el(e) {
      var t = e.alternate
      ;(t !== null && ((e.alternate = null), el(t)),
        (e.child = null),
        (e.deletions = null),
        (e.sibling = null),
        e.tag === 5 && ((t = e.stateNode), t !== null && ut(t)),
        (e.stateNode = null),
        (e.return = null),
        (e.dependencies = null),
        (e.memoizedProps = null),
        (e.memoizedState = null),
        (e.pendingProps = null),
        (e.stateNode = null),
        (e.updateQueue = null))
    }
    var tl = null,
      nl = !1
    function rl(e, t, n) {
      for (n = n.child; n !== null; ) (il(e, t, n), (n = n.sibling))
    }
    function il(e, t, n) {
      if (Ne && typeof Ne.onCommitFiberUnmount == `function`)
        try {
          Ne.onCommitFiberUnmount(Me, n)
        } catch {}
      switch (n.tag) {
        case 26:
          ;(Jc || zc(n, t),
            rl(e, t, n),
            n.memoizedState
              ? n.memoizedState.count--
              : n.stateNode && ((n = n.stateNode), n.parentNode.removeChild(n)))
          break
        case 27:
          Jc || zc(n, t)
          var r = tl,
            i = nl
          ;(Zd(n.type) && ((tl = n.stateNode), (nl = !1)),
            rl(e, t, n),
            pf(n.stateNode),
            (tl = r),
            (nl = i))
          break
        case 5:
          Jc || zc(n, t)
        case 6:
          if (((r = tl), (i = nl), (tl = null), rl(e, t, n), (tl = r), (nl = i), tl !== null))
            if (nl)
              try {
                ;(tl.nodeType === 9
                  ? tl.body
                  : tl.nodeName === `HTML`
                    ? tl.ownerDocument.body
                    : tl
                ).removeChild(n.stateNode)
              } catch (e) {
                Hu(n, t, e)
              }
            else
              try {
                tl.removeChild(n.stateNode)
              } catch (e) {
                Hu(n, t, e)
              }
          break
        case 18:
          tl !== null &&
            (nl
              ? ((e = tl),
                Qd(
                  e.nodeType === 9 ? e.body : e.nodeName === `HTML` ? e.ownerDocument.body : e,
                  n.stateNode
                ),
                Np(e))
              : Qd(tl, n.stateNode))
          break
        case 4:
          ;((r = tl),
            (i = nl),
            (tl = n.stateNode.containerInfo),
            (nl = !0),
            rl(e, t, n),
            (tl = r),
            (nl = i))
          break
        case 0:
        case 11:
        case 14:
        case 15:
          ;(Fc(2, n, t), Jc || Fc(4, n, t), rl(e, t, n))
          break
        case 1:
          ;(Jc ||
            (zc(n, t),
            (r = n.stateNode),
            typeof r.componentWillUnmount == `function` && Lc(n, t, r)),
            rl(e, t, n))
          break
        case 21:
          rl(e, t, n)
          break
        case 22:
          ;((Jc = (r = Jc) || n.memoizedState !== null), rl(e, t, n), (Jc = r))
          break
        default:
          rl(e, t, n)
      }
    }
    function al(e, t) {
      if (
        t.memoizedState === null &&
        ((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
      ) {
        e = e.dehydrated
        try {
          Np(e)
        } catch (e) {
          Hu(t, t.return, e)
        }
      }
    }
    function ol(e, t) {
      if (
        t.memoizedState === null &&
        ((e = t.alternate),
        e !== null && ((e = e.memoizedState), e !== null && ((e = e.dehydrated), e !== null)))
      )
        try {
          Np(e)
        } catch (e) {
          Hu(t, t.return, e)
        }
    }
    function sl(e) {
      switch (e.tag) {
        case 31:
        case 13:
        case 19:
          var t = e.stateNode
          return (t === null && (t = e.stateNode = new Xc()), t)
        case 22:
          return (
            (e = e.stateNode), (t = e._retryCache), t === null && (t = e._retryCache = new Xc()), t
          )
        default:
          throw Error(i(435, e.tag))
      }
    }
    function cl(e, t) {
      var n = sl(e)
      t.forEach(function (t) {
        if (!n.has(t)) {
          n.add(t)
          var r = qu.bind(null, e, t)
          t.then(r, r)
        }
      })
    }
    function ll(e, t) {
      var n = t.deletions
      if (n !== null)
        for (var r = 0; r < n.length; r++) {
          var a = n[r],
            o = e,
            s = t,
            c = s
          a: for (; c !== null; ) {
            switch (c.tag) {
              case 27:
                if (Zd(c.type)) {
                  ;((tl = c.stateNode), (nl = !1))
                  break a
                }
                break
              case 5:
                ;((tl = c.stateNode), (nl = !1))
                break a
              case 3:
              case 4:
                ;((tl = c.stateNode.containerInfo), (nl = !0))
                break a
            }
            c = c.return
          }
          if (tl === null) throw Error(i(160))
          ;(il(o, s, a),
            (tl = null),
            (nl = !1),
            (o = a.alternate),
            o !== null && (o.return = null),
            (a.return = null))
        }
      if (t.subtreeFlags & 13886) for (t = t.child; t !== null; ) (dl(t, e), (t = t.sibling))
    }
    var ul = null
    function dl(e, t) {
      var n = e.alternate,
        r = e.flags
      switch (e.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          ;(ll(t, e), fl(e), r & 4 && (Fc(3, e, e.return), Pc(3, e), Fc(5, e, e.return)))
          break
        case 1:
          ;(ll(t, e),
            fl(e),
            r & 512 && (Jc || n === null || zc(n, n.return)),
            r & 64 &&
              qc &&
              ((e = e.updateQueue),
              e !== null &&
                ((r = e.callbacks),
                r !== null &&
                  ((n = e.shared.hiddenCallbacks),
                  (e.shared.hiddenCallbacks = n === null ? r : n.concat(r))))))
          break
        case 26:
          var a = ul
          if ((ll(t, e), fl(e), r & 512 && (Jc || n === null || zc(n, n.return)), r & 4)) {
            var o = n === null ? null : n.memoizedState
            if (((r = e.memoizedState), n === null))
              if (r === null)
                if (e.stateNode === null) {
                  a: {
                    ;((r = e.type), (n = e.memoizedProps), (a = a.ownerDocument || a))
                    b: switch (r) {
                      case `title`:
                        ;((o = a.getElementsByTagName(`title`)[0]),
                          (!o ||
                            o[H] ||
                            o[rt] ||
                            o.namespaceURI === `http://www.w3.org/2000/svg` ||
                            o.hasAttribute(`itemprop`)) &&
                            ((o = a.createElement(r)),
                            a.head.insertBefore(o, a.querySelector(`head > title`))),
                          Pd(o, r, n),
                          (o[rt] = e),
                          mt(o),
                          (r = o))
                        break a
                      case `link`:
                        var s = Vf(`link`, `href`, a).get(r + (n.href || ``))
                        if (s) {
                          for (var c = 0; c < s.length; c++)
                            if (
                              ((o = s[c]),
                              o.getAttribute(`href`) ===
                                (n.href == null || n.href === `` ? null : n.href) &&
                                o.getAttribute(`rel`) === (n.rel == null ? null : n.rel) &&
                                o.getAttribute(`title`) === (n.title == null ? null : n.title) &&
                                o.getAttribute(`crossorigin`) ===
                                  (n.crossOrigin == null ? null : n.crossOrigin))
                            ) {
                              s.splice(c, 1)
                              break b
                            }
                        }
                        ;((o = a.createElement(r)), Pd(o, r, n), a.head.appendChild(o))
                        break
                      case `meta`:
                        if ((s = Vf(`meta`, `content`, a).get(r + (n.content || ``)))) {
                          for (c = 0; c < s.length; c++)
                            if (
                              ((o = s[c]),
                              o.getAttribute(`content`) ===
                                (n.content == null ? null : `` + n.content) &&
                                o.getAttribute(`name`) === (n.name == null ? null : n.name) &&
                                o.getAttribute(`property`) ===
                                  (n.property == null ? null : n.property) &&
                                o.getAttribute(`http-equiv`) ===
                                  (n.httpEquiv == null ? null : n.httpEquiv) &&
                                o.getAttribute(`charset`) ===
                                  (n.charSet == null ? null : n.charSet))
                            ) {
                              s.splice(c, 1)
                              break b
                            }
                        }
                        ;((o = a.createElement(r)), Pd(o, r, n), a.head.appendChild(o))
                        break
                      default:
                        throw Error(i(468, r))
                    }
                    ;((o[rt] = e), mt(o), (r = o))
                  }
                  e.stateNode = r
                } else Hf(a, e.type, e.stateNode)
              else e.stateNode = If(a, r, e.memoizedProps)
            else
              o === r
                ? r === null && e.stateNode !== null && Vc(e, e.memoizedProps, n.memoizedProps)
                : (o === null
                    ? n.stateNode !== null && ((n = n.stateNode), n.parentNode.removeChild(n))
                    : o.count--,
                  r === null ? Hf(a, e.type, e.stateNode) : If(a, r, e.memoizedProps))
          }
          break
        case 27:
          ;(ll(t, e),
            fl(e),
            r & 512 && (Jc || n === null || zc(n, n.return)),
            n !== null && r & 4 && Vc(e, e.memoizedProps, n.memoizedProps))
          break
        case 5:
          if ((ll(t, e), fl(e), r & 512 && (Jc || n === null || zc(n, n.return)), e.flags & 32)) {
            a = e.stateNode
            try {
              Bt(a, ``)
            } catch (t) {
              Hu(e, e.return, t)
            }
          }
          ;(r & 4 &&
            e.stateNode != null &&
            ((a = e.memoizedProps), Vc(e, a, n === null ? a : n.memoizedProps)),
            r & 1024 && (Yc = !0))
          break
        case 6:
          if ((ll(t, e), fl(e), r & 4)) {
            if (e.stateNode === null) throw Error(i(162))
            ;((r = e.memoizedProps), (n = e.stateNode))
            try {
              n.nodeValue = r
            } catch (t) {
              Hu(e, e.return, t)
            }
          }
          break
        case 3:
          if (
            ((Bf = null),
            (a = ul),
            (ul = gf(t.containerInfo)),
            ll(t, e),
            (ul = a),
            fl(e),
            r & 4 && n !== null && n.memoizedState.isDehydrated)
          )
            try {
              Np(t.containerInfo)
            } catch (t) {
              Hu(e, e.return, t)
            }
          Yc && ((Yc = !1), pl(e))
          break
        case 4:
          ;((r = ul), (ul = gf(e.stateNode.containerInfo)), ll(t, e), fl(e), (ul = r))
          break
        case 12:
          ;(ll(t, e), fl(e))
          break
        case 31:
          ;(ll(t, e),
            fl(e),
            r & 4 && ((r = e.updateQueue), r !== null && ((e.updateQueue = null), cl(e, r))))
          break
        case 13:
          ;(ll(t, e),
            fl(e),
            e.child.flags & 8192 &&
              (e.memoizedState !== null) != (n !== null && n.memoizedState !== null) &&
              (Xl = Ce()),
            r & 4 && ((r = e.updateQueue), r !== null && ((e.updateQueue = null), cl(e, r))))
          break
        case 22:
          a = e.memoizedState !== null
          var l = n !== null && n.memoizedState !== null,
            u = qc,
            d = Jc
          if (((qc = u || a), (Jc = d || l), ll(t, e), (Jc = d), (qc = u), fl(e), r & 8192))
            a: for (
              t = e.stateNode,
                t._visibility = a ? t._visibility & -2 : t._visibility | 1,
                a && (n === null || l || qc || Jc || hl(e)),
                n = null,
                t = e;
              ;
            ) {
              if (t.tag === 5 || t.tag === 26) {
                if (n === null) {
                  l = n = t
                  try {
                    if (((o = l.stateNode), a))
                      ((s = o.style),
                        typeof s.setProperty == `function`
                          ? s.setProperty(`display`, `none`, `important`)
                          : (s.display = `none`))
                    else {
                      c = l.stateNode
                      var f = l.memoizedProps.style,
                        p = f != null && f.hasOwnProperty(`display`) ? f.display : null
                      c.style.display = p == null || typeof p == `boolean` ? `` : (`` + p).trim()
                    }
                  } catch (e) {
                    Hu(l, l.return, e)
                  }
                }
              } else if (t.tag === 6) {
                if (n === null) {
                  l = t
                  try {
                    l.stateNode.nodeValue = a ? `` : l.memoizedProps
                  } catch (e) {
                    Hu(l, l.return, e)
                  }
                }
              } else if (t.tag === 18) {
                if (n === null) {
                  l = t
                  try {
                    var m = l.stateNode
                    a ? $d(m, !0) : $d(l.stateNode, !1)
                  } catch (e) {
                    Hu(l, l.return, e)
                  }
                }
              } else if (
                ((t.tag !== 22 && t.tag !== 23) || t.memoizedState === null || t === e) &&
                t.child !== null
              ) {
                ;((t.child.return = t), (t = t.child))
                continue
              }
              if (t === e) break a
              for (; t.sibling === null; ) {
                if (t.return === null || t.return === e) break a
                ;(n === t && (n = null), (t = t.return))
              }
              ;(n === t && (n = null), (t.sibling.return = t.return), (t = t.sibling))
            }
          r & 4 &&
            ((r = e.updateQueue),
            r !== null && ((n = r.retryQueue), n !== null && ((r.retryQueue = null), cl(e, n))))
          break
        case 19:
          ;(ll(t, e),
            fl(e),
            r & 4 && ((r = e.updateQueue), r !== null && ((e.updateQueue = null), cl(e, r))))
          break
        case 30:
          break
        case 21:
          break
        default:
          ;(ll(t, e), fl(e))
      }
    }
    function fl(e) {
      var t = e.flags
      if (t & 2) {
        try {
          for (var n, r = e.return; r !== null; ) {
            if (Hc(r)) {
              n = r
              break
            }
            r = r.return
          }
          if (n == null) throw Error(i(160))
          switch (n.tag) {
            case 27:
              var a = n.stateNode
              Gc(e, Uc(e), a)
              break
            case 5:
              var o = n.stateNode
              ;(n.flags & 32 && (Bt(o, ``), (n.flags &= -33)), Gc(e, Uc(e), o))
              break
            case 3:
            case 4:
              var s = n.stateNode.containerInfo
              Wc(e, Uc(e), s)
              break
            default:
              throw Error(i(161))
          }
        } catch (t) {
          Hu(e, e.return, t)
        }
        e.flags &= -3
      }
      t & 4096 && (e.flags &= -4097)
    }
    function pl(e) {
      if (e.subtreeFlags & 1024)
        for (e = e.child; e !== null; ) {
          var t = e
          ;(pl(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), (e = e.sibling))
        }
    }
    function ml(e, t) {
      if (t.subtreeFlags & 8772)
        for (t = t.child; t !== null; ) ($c(e, t.alternate, t), (t = t.sibling))
    }
    function hl(e) {
      for (e = e.child; e !== null; ) {
        var t = e
        switch (t.tag) {
          case 0:
          case 11:
          case 14:
          case 15:
            ;(Fc(4, t, t.return), hl(t))
            break
          case 1:
            zc(t, t.return)
            var n = t.stateNode
            ;(typeof n.componentWillUnmount == `function` && Lc(t, t.return, n), hl(t))
            break
          case 27:
            pf(t.stateNode)
          case 26:
          case 5:
            ;(zc(t, t.return), hl(t))
            break
          case 22:
            t.memoizedState === null && hl(t)
            break
          case 30:
            hl(t)
            break
          default:
            hl(t)
        }
        e = e.sibling
      }
    }
    function gl(e, t, n) {
      for (n &&= (t.subtreeFlags & 8772) != 0, t = t.child; t !== null; ) {
        var r = t.alternate,
          i = e,
          a = t,
          o = a.flags
        switch (a.tag) {
          case 0:
          case 11:
          case 15:
            ;(gl(i, a, n), Pc(4, a))
            break
          case 1:
            if ((gl(i, a, n), (r = a), (i = r.stateNode), typeof i.componentDidMount == `function`))
              try {
                i.componentDidMount()
              } catch (e) {
                Hu(r, r.return, e)
              }
            if (((r = a), (i = r.updateQueue), i !== null)) {
              var s = r.stateNode
              try {
                var c = i.shared.hiddenCallbacks
                if (c !== null)
                  for (i.shared.hiddenCallbacks = null, i = 0; i < c.length; i++) Ba(c[i], s)
              } catch (e) {
                Hu(r, r.return, e)
              }
            }
            ;(n && o & 64 && Ic(a), Rc(a, a.return))
            break
          case 27:
            Kc(a)
          case 26:
          case 5:
            ;(gl(i, a, n), n && r === null && o & 4 && Bc(a), Rc(a, a.return))
            break
          case 12:
            gl(i, a, n)
            break
          case 31:
            ;(gl(i, a, n), n && o & 4 && al(i, a))
            break
          case 13:
            ;(gl(i, a, n), n && o & 4 && ol(i, a))
            break
          case 22:
            ;(a.memoizedState === null && gl(i, a, n), Rc(a, a.return))
            break
          case 30:
            break
          default:
            gl(i, a, n)
        }
        t = t.sibling
      }
    }
    function _l(e, t) {
      var n = null
      ;(e !== null &&
        e.memoizedState !== null &&
        e.memoizedState.cachePool !== null &&
        (n = e.memoizedState.cachePool.pool),
        (e = null),
        t.memoizedState !== null &&
          t.memoizedState.cachePool !== null &&
          (e = t.memoizedState.cachePool.pool),
        e !== n && (e != null && e.refCount++, n != null && ea(n)))
    }
    function vl(e, t) {
      ;((e = null),
        t.alternate !== null && (e = t.alternate.memoizedState.cache),
        (t = t.memoizedState.cache),
        t !== e && (t.refCount++, e != null && ea(e)))
    }
    function yl(e, t, n, r) {
      if (t.subtreeFlags & 10256) for (t = t.child; t !== null; ) (bl(e, t, n, r), (t = t.sibling))
    }
    function bl(e, t, n, r) {
      var i = t.flags
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          ;(yl(e, t, n, r), i & 2048 && Pc(9, t))
          break
        case 1:
          yl(e, t, n, r)
          break
        case 3:
          ;(yl(e, t, n, r),
            i & 2048 &&
              ((e = null),
              t.alternate !== null && (e = t.alternate.memoizedState.cache),
              (t = t.memoizedState.cache),
              t !== e && (t.refCount++, e != null && ea(e))))
          break
        case 12:
          if (i & 2048) {
            ;(yl(e, t, n, r), (e = t.stateNode))
            try {
              var a = t.memoizedProps,
                o = a.id,
                s = a.onPostCommit
              typeof s == `function` &&
                s(o, t.alternate === null ? `mount` : `update`, e.passiveEffectDuration, -0)
            } catch (e) {
              Hu(t, t.return, e)
            }
          } else yl(e, t, n, r)
          break
        case 31:
          yl(e, t, n, r)
          break
        case 13:
          yl(e, t, n, r)
          break
        case 23:
          break
        case 22:
          ;((a = t.stateNode),
            (o = t.alternate),
            t.memoizedState === null
              ? a._visibility & 2
                ? yl(e, t, n, r)
                : ((a._visibility |= 2), xl(e, t, n, r, (t.subtreeFlags & 10256) != 0 || !1))
              : a._visibility & 2
                ? yl(e, t, n, r)
                : Sl(e, t),
            i & 2048 && _l(o, t))
          break
        case 24:
          ;(yl(e, t, n, r), i & 2048 && vl(t.alternate, t))
          break
        default:
          yl(e, t, n, r)
      }
    }
    function xl(e, t, n, r, i) {
      for (i &&= (t.subtreeFlags & 10256) != 0 || !1, t = t.child; t !== null; ) {
        var a = e,
          o = t,
          s = n,
          c = r,
          l = o.flags
        switch (o.tag) {
          case 0:
          case 11:
          case 15:
            ;(xl(a, o, s, c, i), Pc(8, o))
            break
          case 23:
            break
          case 22:
            var u = o.stateNode
            ;(o.memoizedState === null
              ? ((u._visibility |= 2), xl(a, o, s, c, i))
              : u._visibility & 2
                ? xl(a, o, s, c, i)
                : Sl(a, o),
              i && l & 2048 && _l(o.alternate, o))
            break
          case 24:
            ;(xl(a, o, s, c, i), i && l & 2048 && vl(o.alternate, o))
            break
          default:
            xl(a, o, s, c, i)
        }
        t = t.sibling
      }
    }
    function Sl(e, t) {
      if (t.subtreeFlags & 10256)
        for (t = t.child; t !== null; ) {
          var n = e,
            r = t,
            i = r.flags
          switch (r.tag) {
            case 22:
              ;(Sl(n, r), i & 2048 && _l(r.alternate, r))
              break
            case 24:
              ;(Sl(n, r), i & 2048 && vl(r.alternate, r))
              break
            default:
              Sl(n, r)
          }
          t = t.sibling
        }
    }
    var Cl = 8192
    function wl(e, t, n) {
      if (e.subtreeFlags & Cl) for (e = e.child; e !== null; ) (Tl(e, t, n), (e = e.sibling))
    }
    function Tl(e, t, n) {
      switch (e.tag) {
        case 26:
          ;(wl(e, t, n),
            e.flags & Cl && e.memoizedState !== null && Gf(n, ul, e.memoizedState, e.memoizedProps))
          break
        case 5:
          wl(e, t, n)
          break
        case 3:
        case 4:
          var r = ul
          ;((ul = gf(e.stateNode.containerInfo)), wl(e, t, n), (ul = r))
          break
        case 22:
          e.memoizedState === null &&
            ((r = e.alternate),
            r !== null && r.memoizedState !== null
              ? ((r = Cl), (Cl = 16777216), wl(e, t, n), (Cl = r))
              : wl(e, t, n))
          break
        default:
          wl(e, t, n)
      }
    }
    function El(e) {
      var t = e.alternate
      if (t !== null && ((e = t.child), e !== null)) {
        t.child = null
        do ((t = e.sibling), (e.sibling = null), (e = t))
        while (e !== null)
      }
    }
    function Dl(e) {
      var t = e.deletions
      if (e.flags & 16) {
        if (t !== null)
          for (var n = 0; n < t.length; n++) {
            var r = t[n]
            ;((Zc = r), Al(r, e))
          }
        El(e)
      }
      if (e.subtreeFlags & 10256) for (e = e.child; e !== null; ) (Ol(e), (e = e.sibling))
    }
    function Ol(e) {
      switch (e.tag) {
        case 0:
        case 11:
        case 15:
          ;(Dl(e), e.flags & 2048 && Fc(9, e, e.return))
          break
        case 3:
          Dl(e)
          break
        case 12:
          Dl(e)
          break
        case 22:
          var t = e.stateNode
          e.memoizedState !== null &&
          t._visibility & 2 &&
          (e.return === null || e.return.tag !== 13)
            ? ((t._visibility &= -3), kl(e))
            : Dl(e)
          break
        default:
          Dl(e)
      }
    }
    function kl(e) {
      var t = e.deletions
      if (e.flags & 16) {
        if (t !== null)
          for (var n = 0; n < t.length; n++) {
            var r = t[n]
            ;((Zc = r), Al(r, e))
          }
        El(e)
      }
      for (e = e.child; e !== null; ) {
        switch (((t = e), t.tag)) {
          case 0:
          case 11:
          case 15:
            ;(Fc(8, t, t.return), kl(t))
            break
          case 22:
            ;((n = t.stateNode), n._visibility & 2 && ((n._visibility &= -3), kl(t)))
            break
          default:
            kl(t)
        }
        e = e.sibling
      }
    }
    function Al(e, t) {
      for (; Zc !== null; ) {
        var n = Zc
        switch (n.tag) {
          case 0:
          case 11:
          case 15:
            Fc(8, n, t)
            break
          case 23:
          case 22:
            if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
              var r = n.memoizedState.cachePool.pool
              r != null && r.refCount++
            }
            break
          case 24:
            ea(n.memoizedState.cache)
        }
        if (((r = n.child), r !== null)) ((r.return = n), (Zc = r))
        else
          a: for (n = e; Zc !== null; ) {
            r = Zc
            var i = r.sibling,
              a = r.return
            if ((el(r), r === n)) {
              Zc = null
              break a
            }
            if (i !== null) {
              ;((i.return = a), (Zc = i))
              break a
            }
            Zc = a
          }
      }
    }
    var jl = {
        getCacheForType: function (e) {
          var t = Ki(Qi),
            n = t.data.get(e)
          return (n === void 0 && ((n = e()), t.data.set(e, n)), n)
        },
        cacheSignal: function () {
          return Ki(Qi).controller.signal
        }
      },
      Ml = typeof WeakMap == `function` ? WeakMap : Map,
      Nl = 0,
      Pl = null,
      Q = null,
      $ = 0,
      Fl = 0,
      Il = null,
      Ll = !1,
      Rl = !1,
      zl = !1,
      Bl = 0,
      Vl = 0,
      Hl = 0,
      Ul = 0,
      Wl = 0,
      Gl = 0,
      Kl = 0,
      ql = null,
      Jl = null,
      Yl = !1,
      Xl = 0,
      Zl = 0,
      Ql = 1 / 0,
      $l = null,
      eu = null,
      tu = 0,
      nu = null,
      ru = null,
      iu = 0,
      au = 0,
      ou = null,
      su = null,
      cu = 0,
      lu = null
    function uu() {
      return Nl & 2 && $ !== 0 ? $ & -$ : F.T === null ? et() : ld()
    }
    function du() {
      if (Gl === 0)
        if (!($ & 536870912) || Ti) {
          var e = Be
          ;((Be <<= 1), !(Be & 3932160) && (Be = 262144), (Gl = e))
        } else Gl = 536870912
      return ((e = qa.current), e !== null && (e.flags |= 32), Gl)
    }
    function fu(e, t, n) {
      ;(((e === Pl && (Fl === 2 || Fl === 9)) || e.cancelPendingCommit !== null) &&
        (yu(e, 0), gu(e, $, Gl, !1)),
        qe(e, n),
        (!(Nl & 2) || e !== Pl) &&
          (e === Pl && (!(Nl & 2) && (Ul |= n), Vl === 4 && gu(e, $, Gl, !1)), td(e)))
    }
    function pu(e, t, n) {
      if (Nl & 6) throw Error(i(327))
      var r = (!n && (t & 127) == 0 && (t & e.expiredLanes) === 0) || Ue(e, t),
        a = r ? Du(e, t) : Tu(e, t, !0),
        o = r
      do {
        if (a === 0) {
          Rl && !r && gu(e, t, 0, !1)
          break
        } else {
          if (((n = e.current.alternate), o && !hu(n))) {
            ;((a = Tu(e, t, !1)), (o = !1))
            continue
          }
          if (a === 2) {
            if (((o = t), e.errorRecoveryDisabledLanes & o)) var s = 0
            else
              ((s = e.pendingLanes & -536870913),
                (s = s === 0 ? (s & 536870912 ? 536870912 : 0) : s))
            if (s !== 0) {
              t = s
              a: {
                var c = e
                a = ql
                var l = c.current.memoizedState.isDehydrated
                if ((l && (yu(c, s).flags |= 256), (s = Tu(c, s, !1)), s !== 2)) {
                  if (zl && !l) {
                    ;((c.errorRecoveryDisabledLanes |= o), (Ul |= o), (a = 4))
                    break a
                  }
                  ;((o = Jl),
                    (Jl = a),
                    o !== null && (Jl === null ? (Jl = o) : Jl.push.apply(Jl, o)))
                }
                a = s
              }
              if (((o = !1), a !== 2)) continue
            }
          }
          if (a === 1) {
            ;(yu(e, 0), gu(e, t, 0, !0))
            break
          }
          a: {
            switch (((r = e), (o = a), o)) {
              case 0:
              case 1:
                throw Error(i(345))
              case 4:
                if ((t & 4194048) !== t) break
              case 6:
                gu(r, t, Gl, !Ll)
                break a
              case 2:
                Jl = null
                break
              case 3:
              case 5:
                break
              default:
                throw Error(i(329))
            }
            if ((t & 62914560) === t && ((a = Xl + 300 - Ce()), 10 < a)) {
              if ((gu(r, t, Gl, !Ll), V(r, 0, !0) !== 0)) break a
              ;((iu = t),
                (r.timeoutHandle = Kd(
                  mu.bind(null, r, n, Jl, $l, Yl, t, Gl, Ul, Kl, Ll, o, `Throttled`, -0, 0),
                  a
                )))
              break a
            }
            mu(r, n, Jl, $l, Yl, t, Gl, Ul, Kl, Ll, o, null, -0, 0)
          }
        }
        break
      } while (1)
      td(e)
    }
    function mu(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
      if (((e.timeoutHandle = -1), (d = t.subtreeFlags), d & 8192 || (d & 16785408) == 16785408)) {
        ;((d = {
          stylesheets: null,
          count: 0,
          imgCount: 0,
          imgBytes: 0,
          suspenseyImages: [],
          waitingForImages: !0,
          waitingForViewTransition: !1,
          unsuspend: Jt
        }),
          Tl(t, a, d))
        var m = (a & 62914560) === a ? Xl - Ce() : (a & 4194048) === a ? Zl - Ce() : 0
        if (((m = qf(d, m)), m !== null)) {
          ;((iu = a),
            (e.cancelPendingCommit = m(Pu.bind(null, e, t, a, n, r, i, o, s, c, u, d, null, f, p))),
            gu(e, a, o, !l))
          return
        }
      }
      Pu(e, t, a, n, r, i, o, s, c)
    }
    function hu(e) {
      for (var t = e; ; ) {
        var n = t.tag
        if (
          (n === 0 || n === 11 || n === 15) &&
          t.flags & 16384 &&
          ((n = t.updateQueue), n !== null && ((n = n.stores), n !== null))
        )
          for (var r = 0; r < n.length; r++) {
            var i = n[r],
              a = i.getSnapshot
            i = i.value
            try {
              if (!pr(a(), i)) return !1
            } catch {
              return !1
            }
          }
        if (((n = t.child), t.subtreeFlags & 16384 && n !== null)) ((n.return = t), (t = n))
        else {
          if (t === e) break
          for (; t.sibling === null; ) {
            if (t.return === null || t.return === e) return !0
            t = t.return
          }
          ;((t.sibling.return = t.return), (t = t.sibling))
        }
      }
      return !0
    }
    function gu(e, t, n, r) {
      ;((t &= ~Wl),
        (t &= ~Ul),
        (e.suspendedLanes |= t),
        (e.pingedLanes &= ~t),
        r && (e.warmLanes |= t),
        (r = e.expirationTimes))
      for (var i = t; 0 < i; ) {
        var a = 31 - Fe(i),
          o = 1 << a
        ;((r[a] = -1), (i &= ~o))
      }
      n !== 0 && Ye(e, n, t)
    }
    function _u() {
      return Nl & 6 ? !0 : (nd(0, !1), !1)
    }
    function vu() {
      if (Q !== null) {
        if (Fl === 0) var e = Q.return
        else ((e = Q), (Ri = Li = null), xo(e), (Ca = null), (wa = 0), (e = Q))
        for (; e !== null; ) (Nc(e.alternate, e), (e = e.return))
        Q = null
      }
    }
    function yu(e, t) {
      var n = e.timeoutHandle
      ;(n !== -1 && ((e.timeoutHandle = -1), qd(n)),
        (n = e.cancelPendingCommit),
        n !== null && ((e.cancelPendingCommit = null), n()),
        (iu = 0),
        vu(),
        (Pl = e),
        (Q = n = ei(e.current, null)),
        ($ = t),
        (Fl = 0),
        (Il = null),
        (Ll = !1),
        (Rl = Ue(e, t)),
        (zl = !1),
        (Kl = Gl = Wl = Ul = Hl = Vl = 0),
        (Jl = ql = null),
        (Yl = !1),
        t & 8 && (t |= t & 32))
      var r = e.entangledLanes
      if (r !== 0)
        for (e = e.entanglements, r &= t; 0 < r; ) {
          var i = 31 - Fe(r),
            a = 1 << i
          ;((t |= e[i]), (r &= ~a))
        }
      return ((Bl = t), Wr(), n)
    }
    function bu(e, t) {
      ;((X = null),
        (F.H = js),
        t === pa || t === ha
          ? ((t = xa()), (Fl = 3))
          : t === ma
            ? ((t = xa()), (Fl = 4))
            : (Fl =
                t === Js ? 8 : typeof t == `object` && t && typeof t.then == `function` ? 6 : 1),
        (Il = t),
        Q === null && ((Vl = 1), Hs(e, ci(t, e.current))))
    }
    function xu() {
      var e = qa.current
      return e === null
        ? !0
        : ($ & 4194048) === $
          ? Ja === null
          : ($ & 62914560) === $ || $ & 536870912
            ? e === Ja
            : !1
    }
    function Su() {
      var e = F.H
      return ((F.H = js), e === null ? js : e)
    }
    function Cu() {
      var e = F.A
      return ((F.A = jl), e)
    }
    function wu() {
      ;((Vl = 4),
        Ll || (($ & 4194048) !== $ && qa.current !== null) || (Rl = !0),
        (!(Hl & 134217727) && !(Ul & 134217727)) || Pl === null || gu(Pl, $, Gl, !1))
    }
    function Tu(e, t, n) {
      var r = Nl
      Nl |= 2
      var i = Su(),
        a = Cu()
      ;((Pl !== e || $ !== t) && (($l = null), yu(e, t)), (t = !1))
      var o = Vl
      a: do
        try {
          if (Fl !== 0 && Q !== null) {
            var s = Q,
              c = Il
            switch (Fl) {
              case 8:
                ;(vu(), (o = 6))
                break a
              case 3:
              case 2:
              case 9:
              case 6:
                qa.current === null && (t = !0)
                var l = Fl
                if (((Fl = 0), (Il = null), ju(e, s, c, l), n && Rl)) {
                  o = 0
                  break a
                }
                break
              default:
                ;((l = Fl), (Fl = 0), (Il = null), ju(e, s, c, l))
            }
          }
          ;(Eu(), (o = Vl))
          break
        } catch (t) {
          bu(e, t)
        }
      while (1)
      return (
        t && e.shellSuspendCounter++,
        (Ri = Li = null),
        (Nl = r),
        (F.H = i),
        (F.A = a),
        Q === null && ((Pl = null), ($ = 0), Wr()),
        o
      )
    }
    function Eu() {
      for (; Q !== null; ) ku(Q)
    }
    function Du(e, t) {
      var n = Nl
      Nl |= 2
      var r = Su(),
        a = Cu()
      Pl !== e || $ !== t ? (($l = null), (Ql = Ce() + 500), yu(e, t)) : (Rl = Ue(e, t))
      a: do
        try {
          if (Fl !== 0 && Q !== null) {
            t = Q
            var o = Il
            b: switch (Fl) {
              case 1:
                ;((Fl = 0), (Il = null), ju(e, t, o, 1))
                break
              case 2:
              case 9:
                if (_a(o)) {
                  ;((Fl = 0), (Il = null), Au(t))
                  break
                }
                ;((t = function () {
                  ;((Fl !== 2 && Fl !== 9) || Pl !== e || (Fl = 7), td(e))
                }),
                  o.then(t, t))
                break a
              case 3:
                Fl = 7
                break a
              case 4:
                Fl = 5
                break a
              case 7:
                _a(o) ? ((Fl = 0), (Il = null), Au(t)) : ((Fl = 0), (Il = null), ju(e, t, o, 7))
                break
              case 5:
                var s = null
                switch (Q.tag) {
                  case 26:
                    s = Q.memoizedState
                  case 5:
                  case 27:
                    var c = Q
                    if (s ? Wf(s) : c.stateNode.complete) {
                      ;((Fl = 0), (Il = null))
                      var l = c.sibling
                      if (l !== null) Q = l
                      else {
                        var u = c.return
                        u === null ? (Q = null) : ((Q = u), Mu(u))
                      }
                      break b
                    }
                }
                ;((Fl = 0), (Il = null), ju(e, t, o, 5))
                break
              case 6:
                ;((Fl = 0), (Il = null), ju(e, t, o, 6))
                break
              case 8:
                ;(vu(), (Vl = 6))
                break a
              default:
                throw Error(i(462))
            }
          }
          Ou()
          break
        } catch (t) {
          bu(e, t)
        }
      while (1)
      return (
        (Ri = Li = null),
        (F.H = r),
        (F.A = a),
        (Nl = n),
        Q === null ? ((Pl = null), ($ = 0), Wr(), Vl) : 0
      )
    }
    function Ou() {
      for (; Q !== null && !xe(); ) ku(Q)
    }
    function ku(e) {
      var t = wc(e.alternate, e, Bl)
      ;((e.memoizedProps = e.pendingProps), t === null ? Mu(e) : (Q = t))
    }
    function Au(e) {
      var t = e,
        n = t.alternate
      switch (t.tag) {
        case 15:
        case 0:
          t = cc(n, t, t.pendingProps, t.type, void 0, $)
          break
        case 11:
          t = cc(n, t, t.pendingProps, t.type.render, t.ref, $)
          break
        case 5:
          xo(t)
        default:
          ;(Nc(n, t), (t = Q = ti(t, Bl)), (t = wc(n, t, Bl)))
      }
      ;((e.memoizedProps = e.pendingProps), t === null ? Mu(e) : (Q = t))
    }
    function ju(e, t, n, r) {
      ;((Ri = Li = null), xo(t), (Ca = null), (wa = 0))
      var i = t.return
      try {
        if (qs(e, i, t, n, $)) {
          ;((Vl = 1), Hs(e, ci(n, e.current)), (Q = null))
          return
        }
      } catch (t) {
        if (i !== null) throw ((Q = i), t)
        ;((Vl = 1), Hs(e, ci(n, e.current)), (Q = null))
        return
      }
      t.flags & 32768
        ? (Ti || r === 1
            ? (e = !0)
            : Rl || $ & 536870912
              ? (e = !1)
              : ((Ll = e = !0),
                (r === 2 || r === 9 || r === 3 || r === 6) &&
                  ((r = qa.current), r !== null && r.tag === 13 && (r.flags |= 16384))),
          Nu(t, e))
        : Mu(t)
    }
    function Mu(e) {
      var t = e
      do {
        if (t.flags & 32768) {
          Nu(t, Ll)
          return
        }
        e = t.return
        var n = jc(t.alternate, t, Bl)
        if (n !== null) {
          Q = n
          return
        }
        if (((t = t.sibling), t !== null)) {
          Q = t
          return
        }
        Q = t = e
      } while (t !== null)
      Vl === 0 && (Vl = 5)
    }
    function Nu(e, t) {
      do {
        var n = Mc(e.alternate, e)
        if (n !== null) {
          ;((n.flags &= 32767), (Q = n))
          return
        }
        if (
          ((n = e.return),
          n !== null && ((n.flags |= 32768), (n.subtreeFlags = 0), (n.deletions = null)),
          !t && ((e = e.sibling), e !== null))
        ) {
          Q = e
          return
        }
        Q = e = n
      } while (e !== null)
      ;((Vl = 6), (Q = null))
    }
    function Pu(e, t, n, r, a, o, s, c, l) {
      e.cancelPendingCommit = null
      do zu()
      while (tu !== 0)
      if (Nl & 6) throw Error(i(327))
      if (t !== null) {
        if (t === e.current) throw Error(i(177))
        if (
          ((o = t.lanes | t.childLanes),
          (o |= Ur),
          Je(e, n, o, s, c, l),
          e === Pl && ((Q = Pl = null), ($ = 0)),
          (ru = t),
          (nu = e),
          (iu = n),
          (au = o),
          (ou = a),
          (su = r),
          t.subtreeFlags & 10256 || t.flags & 10256
            ? ((e.callbackNode = null),
              (e.callbackPriority = 0),
              Ju(De, function () {
                return (Bu(), null)
              }))
            : ((e.callbackNode = null), (e.callbackPriority = 0)),
          (r = (t.flags & 13878) != 0),
          t.subtreeFlags & 13878 || r)
        ) {
          ;((r = F.T), (F.T = null), (a = I.p), (I.p = 2), (s = Nl), (Nl |= 4))
          try {
            Qc(e, t, n)
          } finally {
            ;((Nl = s), (I.p = a), (F.T = r))
          }
        }
        ;((tu = 1), Fu(), Iu(), Lu())
      }
    }
    function Fu() {
      if (tu === 1) {
        tu = 0
        var e = nu,
          t = ru,
          n = (t.flags & 13878) != 0
        if (t.subtreeFlags & 13878 || n) {
          ;((n = F.T), (F.T = null))
          var r = I.p
          I.p = 2
          var i = Nl
          Nl |= 4
          try {
            dl(t, e)
            var a = zd,
              o = _r(e.containerInfo),
              s = a.focusedElem,
              c = a.selectionRange
            if (o !== s && s && s.ownerDocument && gr(s.ownerDocument.documentElement, s)) {
              if (c !== null && vr(s)) {
                var l = c.start,
                  u = c.end
                if ((u === void 0 && (u = l), `selectionStart` in s))
                  ((s.selectionStart = l), (s.selectionEnd = Math.min(u, s.value.length)))
                else {
                  var d = s.ownerDocument || document,
                    f = (d && d.defaultView) || window
                  if (f.getSelection) {
                    var p = f.getSelection(),
                      m = s.textContent.length,
                      h = Math.min(c.start, m),
                      g = c.end === void 0 ? h : Math.min(c.end, m)
                    !p.extend && h > g && ((o = g), (g = h), (h = o))
                    var _ = J(s, h),
                      v = J(s, g)
                    if (
                      _ &&
                      v &&
                      (p.rangeCount !== 1 ||
                        p.anchorNode !== _.node ||
                        p.anchorOffset !== _.offset ||
                        p.focusNode !== v.node ||
                        p.focusOffset !== v.offset)
                    ) {
                      var y = d.createRange()
                      ;(y.setStart(_.node, _.offset),
                        p.removeAllRanges(),
                        h > g
                          ? (p.addRange(y), p.extend(v.node, v.offset))
                          : (y.setEnd(v.node, v.offset), p.addRange(y)))
                    }
                  }
                }
              }
              for (d = [], p = s; (p = p.parentNode); )
                p.nodeType === 1 && d.push({ element: p, left: p.scrollLeft, top: p.scrollTop })
              for (typeof s.focus == `function` && s.focus(), s = 0; s < d.length; s++) {
                var b = d[s]
                ;((b.element.scrollLeft = b.left), (b.element.scrollTop = b.top))
              }
            }
            ;((sp = !!Rd), (zd = Rd = null))
          } finally {
            ;((Nl = i), (I.p = r), (F.T = n))
          }
        }
        ;((e.current = t), (tu = 2))
      }
    }
    function Iu() {
      if (tu === 2) {
        tu = 0
        var e = nu,
          t = ru,
          n = (t.flags & 8772) != 0
        if (t.subtreeFlags & 8772 || n) {
          ;((n = F.T), (F.T = null))
          var r = I.p
          I.p = 2
          var i = Nl
          Nl |= 4
          try {
            $c(e, t.alternate, t)
          } finally {
            ;((Nl = i), (I.p = r), (F.T = n))
          }
        }
        tu = 3
      }
    }
    function Lu() {
      if (tu === 4 || tu === 3) {
        ;((tu = 0), Se())
        var e = nu,
          t = ru,
          n = iu,
          r = su
        t.subtreeFlags & 10256 || t.flags & 10256
          ? (tu = 5)
          : ((tu = 0), (ru = nu = null), Ru(e, e.pendingLanes))
        var i = e.pendingLanes
        if (
          (i === 0 && (eu = null),
          $e(n),
          (t = t.stateNode),
          Ne && typeof Ne.onCommitFiberRoot == `function`)
        )
          try {
            Ne.onCommitFiberRoot(Me, t, void 0, (t.current.flags & 128) == 128)
          } catch {}
        if (r !== null) {
          ;((t = F.T), (i = I.p), (I.p = 2), (F.T = null))
          try {
            for (var a = e.onRecoverableError, o = 0; o < r.length; o++) {
              var s = r[o]
              a(s.value, { componentStack: s.stack })
            }
          } finally {
            ;((F.T = t), (I.p = i))
          }
        }
        ;(iu & 3 && zu(),
          td(e),
          (i = e.pendingLanes),
          n & 261930 && i & 42 ? (e === lu ? cu++ : ((cu = 0), (lu = e))) : (cu = 0),
          nd(0, !1))
      }
    }
    function Ru(e, t) {
      ;(e.pooledCacheLanes &= t) === 0 &&
        ((t = e.pooledCache), t != null && ((e.pooledCache = null), ea(t)))
    }
    function zu() {
      return (Fu(), Iu(), Lu(), Bu())
    }
    function Bu() {
      if (tu !== 5) return !1
      var e = nu,
        t = au
      au = 0
      var n = $e(iu),
        r = F.T,
        a = I.p
      try {
        ;((I.p = 32 > n ? 32 : n), (F.T = null), (n = ou), (ou = null))
        var o = nu,
          s = iu
        if (((tu = 0), (ru = nu = null), (iu = 0), Nl & 6)) throw Error(i(331))
        var c = Nl
        if (
          ((Nl |= 4),
          Ol(o.current),
          bl(o, o.current, s, n),
          (Nl = c),
          nd(0, !1),
          Ne && typeof Ne.onPostCommitFiberRoot == `function`)
        )
          try {
            Ne.onPostCommitFiberRoot(Me, o)
          } catch {}
        return !0
      } finally {
        ;((I.p = a), (F.T = r), Ru(e, t))
      }
    }
    function Vu(e, t, n) {
      ;((t = ci(n, t)),
        (t = Ws(e.stateNode, t, 2)),
        (e = Pa(e, t, 2)),
        e !== null && (qe(e, 2), td(e)))
    }
    function Hu(e, t, n) {
      if (e.tag === 3) Vu(e, e, n)
      else
        for (; t !== null; ) {
          if (t.tag === 3) {
            Vu(t, e, n)
            break
          } else if (t.tag === 1) {
            var r = t.stateNode
            if (
              typeof t.type.getDerivedStateFromError == `function` ||
              (typeof r.componentDidCatch == `function` && (eu === null || !eu.has(r)))
            ) {
              ;((e = ci(n, e)),
                (n = Gs(2)),
                (r = Pa(t, n, 2)),
                r !== null && (Ks(n, r, t, e), qe(r, 2), td(r)))
              break
            }
          }
          t = t.return
        }
    }
    function Uu(e, t, n) {
      var r = e.pingCache
      if (r === null) {
        r = e.pingCache = new Ml()
        var i = new Set()
        r.set(t, i)
      } else ((i = r.get(t)), i === void 0 && ((i = new Set()), r.set(t, i)))
      i.has(n) || ((zl = !0), i.add(n), (e = Wu.bind(null, e, t, n)), t.then(e, e))
    }
    function Wu(e, t, n) {
      var r = e.pingCache
      ;(r !== null && r.delete(t),
        (e.pingedLanes |= e.suspendedLanes & n),
        (e.warmLanes &= ~n),
        Pl === e &&
          ($ & n) === n &&
          (Vl === 4 || (Vl === 3 && ($ & 62914560) === $ && 300 > Ce() - Xl)
            ? !(Nl & 2) && yu(e, 0)
            : (Wl |= n),
          Kl === $ && (Kl = 0)),
        td(e))
    }
    function Gu(e, t) {
      ;(t === 0 && (t = Ge()), (e = qr(e, t)), e !== null && (qe(e, t), td(e)))
    }
    function Ku(e) {
      var t = e.memoizedState,
        n = 0
      ;(t !== null && (n = t.retryLane), Gu(e, n))
    }
    function qu(e, t) {
      var n = 0
      switch (e.tag) {
        case 31:
        case 13:
          var r = e.stateNode,
            a = e.memoizedState
          a !== null && (n = a.retryLane)
          break
        case 19:
          r = e.stateNode
          break
        case 22:
          r = e.stateNode._retryCache
          break
        default:
          throw Error(i(314))
      }
      ;(r !== null && r.delete(t), Gu(e, n))
    }
    function Ju(e, t) {
      return ye(e, t)
    }
    var Yu = null,
      Xu = null,
      Zu = !1,
      Qu = !1,
      $u = !1,
      ed = 0
    function td(e) {
      ;(e !== Xu && e.next === null && (Xu === null ? (Yu = Xu = e) : (Xu = Xu.next = e)),
        (Qu = !0),
        Zu || ((Zu = !0), cd()))
    }
    function nd(e, t) {
      if (!$u && Qu) {
        $u = !0
        do
          for (var n = !1, r = Yu; r !== null; ) {
            if (!t)
              if (e !== 0) {
                var i = r.pendingLanes
                if (i === 0) var a = 0
                else {
                  var o = r.suspendedLanes,
                    s = r.pingedLanes
                  ;((a = (1 << (31 - Fe(42 | e) + 1)) - 1),
                    (a &= i & ~(o & ~s)),
                    (a = a & 201326741 ? (a & 201326741) | 1 : a ? a | 2 : 0))
                }
                a !== 0 && ((n = !0), sd(r, a))
              } else
                ((a = $),
                  (a = V(
                    r,
                    r === Pl ? a : 0,
                    r.cancelPendingCommit !== null || r.timeoutHandle !== -1
                  )),
                  !(a & 3) || Ue(r, a) || ((n = !0), sd(r, a)))
            r = r.next
          }
        while (n)
        $u = !1
      }
    }
    function rd() {
      id()
    }
    function id() {
      Qu = Zu = !1
      var e = 0
      ed !== 0 && Gd() && (e = ed)
      for (var t = Ce(), n = null, r = Yu; r !== null; ) {
        var i = r.next,
          a = ad(r, t)
        ;(a === 0
          ? ((r.next = null), n === null ? (Yu = i) : (n.next = i), i === null && (Xu = n))
          : ((n = r), (e !== 0 || a & 3) && (Qu = !0)),
          (r = i))
      }
      ;((tu !== 0 && tu !== 5) || nd(e, !1), ed !== 0 && (ed = 0))
    }
    function ad(e, t) {
      for (
        var n = e.suspendedLanes,
          r = e.pingedLanes,
          i = e.expirationTimes,
          a = e.pendingLanes & -62914561;
        0 < a;
      ) {
        var o = 31 - Fe(a),
          s = 1 << o,
          c = i[o]
        ;(c === -1
          ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = We(s, t))
          : c <= t && (e.expiredLanes |= s),
          (a &= ~s))
      }
      if (
        ((t = Pl),
        (n = $),
        (n = V(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1)),
        (r = e.callbackNode),
        n === 0 || (e === t && (Fl === 2 || Fl === 9)) || e.cancelPendingCommit !== null)
      )
        return (
          r !== null && r !== null && be(r), (e.callbackNode = null), (e.callbackPriority = 0)
        )
      if (!(n & 3) || Ue(e, n)) {
        if (((t = n & -n), t === e.callbackPriority)) return t
        switch ((r !== null && be(r), $e(n))) {
          case 2:
          case 8:
            n = Ee
            break
          case 32:
            n = De
            break
          case 268435456:
            n = ke
            break
          default:
            n = De
        }
        return (
          (r = od.bind(null, e)), (n = ye(n, r)), (e.callbackPriority = t), (e.callbackNode = n), t
        )
      }
      return (
        r !== null && r !== null && be(r), (e.callbackPriority = 2), (e.callbackNode = null), 2
      )
    }
    function od(e, t) {
      if (tu !== 0 && tu !== 5) return ((e.callbackNode = null), (e.callbackPriority = 0), null)
      var n = e.callbackNode
      if (zu() && e.callbackNode !== n) return null
      var r = $
      return (
        (r = V(e, e === Pl ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1)),
        r === 0
          ? null
          : (pu(e, r, t),
            ad(e, Ce()),
            e.callbackNode != null && e.callbackNode === n ? od.bind(null, e) : null)
      )
    }
    function sd(e, t) {
      if (zu()) return null
      pu(e, t, !0)
    }
    function cd() {
      Yd(function () {
        Nl & 6 ? ye(Te, rd) : id()
      })
    }
    function ld() {
      if (ed === 0) {
        var e = ra
        ;(e === 0 && ((e = ze), (ze <<= 1), !(ze & 261888) && (ze = 256)), (ed = e))
      }
      return ed
    }
    function ud(e) {
      return e == null || typeof e == `symbol` || typeof e == `boolean`
        ? null
        : typeof e == `function`
          ? e
          : qt(`` + e)
    }
    function dd(e, t) {
      var n = t.ownerDocument.createElement(`input`)
      return (
        (n.name = t.name),
        (n.value = t.value),
        e.id && n.setAttribute(`form`, e.id),
        t.parentNode.insertBefore(n, t),
        (e = new FormData(e)),
        n.parentNode.removeChild(n),
        e
      )
    }
    function fd(e, t, n, r, i) {
      if (t === `submit` && n && n.stateNode === i) {
        var a = ud((i[it] || null).action),
          o = r.submitter
        o &&
          ((t = (t = o[it] || null) ? ud(t.formAction) : o.getAttribute(`formAction`)),
          t !== null && ((a = t), (o = null)))
        var s = new hn(`action`, `action`, null, r, i)
        e.push({
          event: s,
          listeners: [
            {
              instance: null,
              listener: function () {
                if (r.defaultPrevented) {
                  if (ed !== 0) {
                    var e = o ? dd(i, o) : new FormData(i)
                    _s(n, { pending: !0, data: e, method: i.method, action: a }, null, e)
                  }
                } else
                  typeof a == `function` &&
                    (s.preventDefault(),
                    (e = o ? dd(i, o) : new FormData(i)),
                    _s(n, { pending: !0, data: e, method: i.method, action: a }, a, e))
              },
              currentTarget: i
            }
          ]
        })
      }
    }
    for (var pd = 0; pd < Rr.length; pd++) {
      var md = Rr[pd]
      zr(md.toLowerCase(), `on` + (md[0].toUpperCase() + md.slice(1)))
    }
    ;(zr(Ar, `onAnimationEnd`),
      zr(jr, `onAnimationIteration`),
      zr(Mr, `onAnimationStart`),
      zr(`dblclick`, `onDoubleClick`),
      zr(`focusin`, `onFocus`),
      zr(`focusout`, `onBlur`),
      zr(Nr, `onTransitionRun`),
      zr(Pr, `onTransitionStart`),
      zr(Fr, `onTransitionCancel`),
      zr(Ir, `onTransitionEnd`),
      vt(`onMouseEnter`, [`mouseout`, `mouseover`]),
      vt(`onMouseLeave`, [`mouseout`, `mouseover`]),
      vt(`onPointerEnter`, [`pointerout`, `pointerover`]),
      vt(`onPointerLeave`, [`pointerout`, `pointerover`]),
      _t(
        `onChange`,
        `change click focusin focusout input keydown keyup selectionchange`.split(` `)
      ),
      _t(
        `onSelect`,
        `focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange`.split(
          ` `
        )
      ),
      _t(`onBeforeInput`, [`compositionend`, `keypress`, `textInput`, `paste`]),
      _t(`onCompositionEnd`, `compositionend focusout keydown keypress keyup mousedown`.split(` `)),
      _t(
        `onCompositionStart`,
        `compositionstart focusout keydown keypress keyup mousedown`.split(` `)
      ),
      _t(
        `onCompositionUpdate`,
        `compositionupdate focusout keydown keypress keyup mousedown`.split(` `)
      ))
    var hd =
        `abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting`.split(
          ` `
        ),
      gd = new Set(
        `beforetoggle cancel close invalid load scroll scrollend toggle`.split(` `).concat(hd)
      )
    function _d(e, t) {
      t = (t & 4) != 0
      for (var n = 0; n < e.length; n++) {
        var r = e[n],
          i = r.event
        r = r.listeners
        a: {
          var a = void 0
          if (t)
            for (var o = r.length - 1; 0 <= o; o--) {
              var s = r[o],
                c = s.instance,
                l = s.currentTarget
              if (((s = s.listener), c !== a && i.isPropagationStopped())) break a
              ;((a = s), (i.currentTarget = l))
              try {
                a(i)
              } catch (e) {
                Br(e)
              }
              ;((i.currentTarget = null), (a = c))
            }
          else
            for (o = 0; o < r.length; o++) {
              if (
                ((s = r[o]),
                (c = s.instance),
                (l = s.currentTarget),
                (s = s.listener),
                c !== a && i.isPropagationStopped())
              )
                break a
              ;((a = s), (i.currentTarget = l))
              try {
                a(i)
              } catch (e) {
                Br(e)
              }
              ;((i.currentTarget = null), (a = c))
            }
        }
      }
    }
    function vd(e, t) {
      var n = t[ot]
      n === void 0 && (n = t[ot] = new Set())
      var r = e + `__bubble`
      n.has(r) || (Sd(t, e, 2, !1), n.add(r))
    }
    function yd(e, t, n) {
      var r = 0
      ;(t && (r |= 4), Sd(n, e, r, t))
    }
    var bd = `_reactListening` + Math.random().toString(36).slice(2)
    function xd(e) {
      if (!e[bd]) {
        ;((e[bd] = !0),
          ht.forEach(function (t) {
            t !== `selectionchange` && (gd.has(t) || yd(t, !1, e), yd(t, !0, e))
          }))
        var t = e.nodeType === 9 ? e : e.ownerDocument
        t === null || t[bd] || ((t[bd] = !0), yd(`selectionchange`, !1, t))
      }
    }
    function Sd(e, t, n, r) {
      switch (mp(t)) {
        case 2:
          var i = cp
          break
        case 8:
          i = lp
          break
        default:
          i = up
      }
      ;((n = i.bind(null, t, n, e)),
        (i = void 0),
        !an || (t !== `touchstart` && t !== `touchmove` && t !== `wheel`) || (i = !0),
        r
          ? i === void 0
            ? e.addEventListener(t, n, !0)
            : e.addEventListener(t, n, { capture: !0, passive: i })
          : i === void 0
            ? e.addEventListener(t, n, !1)
            : e.addEventListener(t, n, { passive: i }))
    }
    function Cd(e, t, n, r, i) {
      var a = r
      if (!(t & 1) && !(t & 2) && r !== null)
        a: for (;;) {
          if (r === null) return
          var s = r.tag
          if (s === 3 || s === 4) {
            var c = r.stateNode.containerInfo
            if (c === i) break
            if (s === 4)
              for (s = r.return; s !== null; ) {
                var l = s.tag
                if ((l === 3 || l === 4) && s.stateNode.containerInfo === i) return
                s = s.return
              }
            for (; c !== null; ) {
              if (((s = dt(c)), s === null)) return
              if (((l = s.tag), l === 5 || l === 6 || l === 26 || l === 27)) {
                r = a = s
                continue a
              }
              c = c.parentNode
            }
          }
          r = r.return
        }
      tn(function () {
        var r = a,
          i = Xt(n),
          s = []
        a: {
          var c = Lr.get(e)
          if (c !== void 0) {
            var l = hn,
              u = e
            switch (e) {
              case `keypress`:
                if (un(n) === 0) break a
              case `keydown`:
              case `keyup`:
                l = jn
                break
              case `focusin`:
                ;((u = `focus`), (l = Cn))
                break
              case `focusout`:
                ;((u = `blur`), (l = Cn))
                break
              case `beforeblur`:
              case `afterblur`:
                l = Cn
                break
              case `click`:
                if (n.button === 2) break a
              case `auxclick`:
              case `dblclick`:
              case `mousedown`:
              case `mousemove`:
              case `mouseup`:
              case `mouseout`:
              case `mouseover`:
              case `contextmenu`:
                l = xn
                break
              case `drag`:
              case `dragend`:
              case `dragenter`:
              case `dragexit`:
              case `dragleave`:
              case `dragover`:
              case `dragstart`:
              case `drop`:
                l = Sn
                break
              case `touchcancel`:
              case `touchend`:
              case `touchmove`:
              case `touchstart`:
                l = Nn
                break
              case Ar:
              case jr:
              case Mr:
                l = wn
                break
              case Ir:
                l = Pn
                break
              case `scroll`:
              case `scrollend`:
                l = _n
                break
              case `wheel`:
                l = Fn
                break
              case `copy`:
              case `cut`:
              case `paste`:
                l = Tn
                break
              case `gotpointercapture`:
              case `lostpointercapture`:
              case `pointercancel`:
              case `pointerdown`:
              case `pointermove`:
              case `pointerout`:
              case `pointerover`:
              case `pointerup`:
                l = Mn
                break
              case `toggle`:
              case `beforetoggle`:
                l = In
            }
            var d = (t & 4) != 0,
              f = !d && (e === `scroll` || e === `scrollend`),
              p = d ? (c === null ? null : c + `Capture`) : c
            d = []
            for (var m = r, h; m !== null; ) {
              var g = m
              if (
                ((h = g.stateNode),
                (g = g.tag),
                (g !== 5 && g !== 26 && g !== 27) ||
                  h === null ||
                  p === null ||
                  ((g = nn(m, p)), g != null && d.push(wd(m, g, h))),
                f)
              )
                break
              m = m.return
            }
            0 < d.length && ((c = new l(c, u, null, n, i)), s.push({ event: c, listeners: d }))
          }
        }
        if (!(t & 7)) {
          a: {
            if (
              ((c = e === `mouseover` || e === `pointerover`),
              (l = e === `mouseout` || e === `pointerout`),
              c && n !== Yt && (u = n.relatedTarget || n.fromElement) && (dt(u) || u[at]))
            )
              break a
            if (
              (l || c) &&
              ((c =
                i.window === i
                  ? i
                  : (c = i.ownerDocument)
                    ? c.defaultView || c.parentWindow
                    : window),
              l
                ? ((u = n.relatedTarget || n.toElement),
                  (l = r),
                  (u = u ? dt(u) : null),
                  u !== null &&
                    ((f = o(u)), (d = u.tag), u !== f || (d !== 5 && d !== 27 && d !== 6)) &&
                    (u = null))
                : ((l = null), (u = r)),
              l !== u)
            ) {
              if (
                ((d = xn),
                (g = `onMouseLeave`),
                (p = `onMouseEnter`),
                (m = `mouse`),
                (e === `pointerout` || e === `pointerover`) &&
                  ((d = Mn), (g = `onPointerLeave`), (p = `onPointerEnter`), (m = `pointer`)),
                (f = l == null ? c : U(l)),
                (h = u == null ? c : U(u)),
                (c = new d(g, m + `leave`, l, n, i)),
                (c.target = f),
                (c.relatedTarget = h),
                (g = null),
                dt(i) === r &&
                  ((d = new d(p, m + `enter`, u, n, i)),
                  (d.target = h),
                  (d.relatedTarget = f),
                  (g = d)),
                (f = g),
                l && u)
              )
                b: {
                  for (d = Ed, p = l, m = u, h = 0, g = p; g; g = d(g)) h++
                  g = 0
                  for (var _ = m; _; _ = d(_)) g++
                  for (; 0 < h - g; ) ((p = d(p)), h--)
                  for (; 0 < g - h; ) ((m = d(m)), g--)
                  for (; h--; ) {
                    if (p === m || (m !== null && p === m.alternate)) {
                      d = p
                      break b
                    }
                    ;((p = d(p)), (m = d(m)))
                  }
                  d = null
                }
              else d = null
              ;(l !== null && Dd(s, c, l, d, !1), u !== null && f !== null && Dd(s, f, u, d, !0))
            }
          }
          a: {
            if (
              ((c = r ? U(r) : window),
              (l = c.nodeName && c.nodeName.toLowerCase()),
              l === `select` || (l === `input` && c.type === `file`))
            )
              var v = tr
            else if (Yn(c))
              if (nr) v = dr
              else {
                v = lr
                var y = cr
              }
            else
              ((l = c.nodeName),
                !l || l.toLowerCase() !== `input` || (c.type !== `checkbox` && c.type !== `radio`)
                  ? r && Wt(r.elementType) && (v = tr)
                  : (v = ur))
            if ((v &&= v(e, r))) {
              Xn(s, v, n, i)
              break a
            }
            ;(y && y(e, c, r),
              e === `focusout` &&
                r &&
                c.type === `number` &&
                r.memoizedProps.value != null &&
                It(c, `number`, c.value))
          }
          switch (((y = r ? U(r) : window), e)) {
            case `focusin`:
              ;(Yn(y) || y.contentEditable === `true`) && ((br = y), (xr = r), (Sr = null))
              break
            case `focusout`:
              Sr = xr = br = null
              break
            case `mousedown`:
              Cr = !0
              break
            case `contextmenu`:
            case `mouseup`:
            case `dragend`:
              ;((Cr = !1), wr(s, n, i))
              break
            case `selectionchange`:
              if (yr) break
            case `keydown`:
            case `keyup`:
              wr(s, n, i)
          }
          var b
          if (Rn)
            b: {
              switch (e) {
                case `compositionstart`:
                  var x = `onCompositionStart`
                  break b
                case `compositionend`:
                  x = `onCompositionEnd`
                  break b
                case `compositionupdate`:
                  x = `onCompositionUpdate`
                  break b
              }
              x = void 0
            }
          else
            q
              ? Wn(e, n) && (x = `onCompositionEnd`)
              : e === `keydown` && n.keyCode === 229 && (x = `onCompositionStart`)
          ;(x &&
            (Vn &&
              n.locale !== `ko` &&
              (q || x !== `onCompositionStart`
                ? x === `onCompositionEnd` && q && (b = ln())
                : ((sn = i), (cn = `value` in sn ? sn.value : sn.textContent), (q = !0))),
            (y = Td(r, x)),
            0 < y.length &&
              ((x = new K(x, e, null, n, i)),
              s.push({ event: x, listeners: y }),
              b ? (x.data = b) : ((b = Gn(n)), b !== null && (x.data = b)))),
            (b = Bn ? Kn(e, n) : qn(e, n)) &&
              ((x = Td(r, `onBeforeInput`)),
              0 < x.length &&
                ((y = new K(`onBeforeInput`, `beforeinput`, null, n, i)),
                s.push({ event: y, listeners: x }),
                (y.data = b))),
            fd(s, e, r, n, i))
        }
        _d(s, t)
      })
    }
    function wd(e, t, n) {
      return { instance: e, listener: t, currentTarget: n }
    }
    function Td(e, t) {
      for (var n = t + `Capture`, r = []; e !== null; ) {
        var i = e,
          a = i.stateNode
        if (
          ((i = i.tag),
          (i !== 5 && i !== 26 && i !== 27) ||
            a === null ||
            ((i = nn(e, n)),
            i != null && r.unshift(wd(e, i, a)),
            (i = nn(e, t)),
            i != null && r.push(wd(e, i, a))),
          e.tag === 3)
        )
          return r
        e = e.return
      }
      return []
    }
    function Ed(e) {
      if (e === null) return null
      do e = e.return
      while (e && e.tag !== 5 && e.tag !== 27)
      return e || null
    }
    function Dd(e, t, n, r, i) {
      for (var a = t._reactName, o = []; n !== null && n !== r; ) {
        var s = n,
          c = s.alternate,
          l = s.stateNode
        if (((s = s.tag), c !== null && c === r)) break
        ;((s !== 5 && s !== 26 && s !== 27) ||
          l === null ||
          ((c = l),
          i
            ? ((l = nn(n, a)), l != null && o.unshift(wd(n, l, c)))
            : i || ((l = nn(n, a)), l != null && o.push(wd(n, l, c)))),
          (n = n.return))
      }
      o.length !== 0 && e.push({ event: t, listeners: o })
    }
    var Od = /\r\n?/g,
      kd = /\u0000|\uFFFD/g
    function Ad(e) {
      return (typeof e == `string` ? e : `` + e)
        .replace(
          Od,
          `
`
        )
        .replace(kd, ``)
    }
    function jd(e, t) {
      return ((t = Ad(t)), Ad(e) === t)
    }
    function Md(e, t, n, r, a, o) {
      switch (n) {
        case `children`:
          typeof r == `string`
            ? t === `body` || (t === `textarea` && r === ``) || Bt(e, r)
            : (typeof r == `number` || typeof r == `bigint`) && t !== `body` && Bt(e, `` + r)
          break
        case `className`:
          wt(e, `class`, r)
          break
        case `tabIndex`:
          wt(e, `tabindex`, r)
          break
        case `dir`:
        case `role`:
        case `viewBox`:
        case `width`:
        case `height`:
          wt(e, n, r)
          break
        case `style`:
          Ut(e, r, o)
          break
        case `data`:
          if (t !== `object`) {
            wt(e, `data`, r)
            break
          }
        case `src`:
        case `href`:
          if (r === `` && (t !== `a` || n !== `href`)) {
            e.removeAttribute(n)
            break
          }
          if (
            r == null ||
            typeof r == `function` ||
            typeof r == `symbol` ||
            typeof r == `boolean`
          ) {
            e.removeAttribute(n)
            break
          }
          ;((r = qt(`` + r)), e.setAttribute(n, r))
          break
        case `action`:
        case `formAction`:
          if (typeof r == `function`) {
            e.setAttribute(
              n,
              `javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')`
            )
            break
          } else
            typeof o == `function` &&
              (n === `formAction`
                ? (t !== `input` && Md(e, t, `name`, a.name, a, null),
                  Md(e, t, `formEncType`, a.formEncType, a, null),
                  Md(e, t, `formMethod`, a.formMethod, a, null),
                  Md(e, t, `formTarget`, a.formTarget, a, null))
                : (Md(e, t, `encType`, a.encType, a, null),
                  Md(e, t, `method`, a.method, a, null),
                  Md(e, t, `target`, a.target, a, null)))
          if (r == null || typeof r == `symbol` || typeof r == `boolean`) {
            e.removeAttribute(n)
            break
          }
          ;((r = qt(`` + r)), e.setAttribute(n, r))
          break
        case `onClick`:
          r != null && (e.onclick = Jt)
          break
        case `onScroll`:
          r != null && vd(`scroll`, e)
          break
        case `onScrollEnd`:
          r != null && vd(`scrollend`, e)
          break
        case `dangerouslySetInnerHTML`:
          if (r != null) {
            if (typeof r != `object` || !(`__html` in r)) throw Error(i(61))
            if (((n = r.__html), n != null)) {
              if (a.children != null) throw Error(i(60))
              e.innerHTML = n
            }
          }
          break
        case `multiple`:
          e.multiple = r && typeof r != `function` && typeof r != `symbol`
          break
        case `muted`:
          e.muted = r && typeof r != `function` && typeof r != `symbol`
          break
        case `suppressContentEditableWarning`:
        case `suppressHydrationWarning`:
        case `defaultValue`:
        case `defaultChecked`:
        case `innerHTML`:
        case `ref`:
          break
        case `autoFocus`:
          break
        case `xlinkHref`:
          if (
            r == null ||
            typeof r == `function` ||
            typeof r == `boolean` ||
            typeof r == `symbol`
          ) {
            e.removeAttribute(`xlink:href`)
            break
          }
          ;((n = qt(`` + r)), e.setAttributeNS(`http://www.w3.org/1999/xlink`, `xlink:href`, n))
          break
        case `contentEditable`:
        case `spellCheck`:
        case `draggable`:
        case `value`:
        case `autoReverse`:
        case `externalResourcesRequired`:
        case `focusable`:
        case `preserveAlpha`:
          r != null && typeof r != `function` && typeof r != `symbol`
            ? e.setAttribute(n, `` + r)
            : e.removeAttribute(n)
          break
        case `inert`:
        case `allowFullScreen`:
        case `async`:
        case `autoPlay`:
        case `controls`:
        case `default`:
        case `defer`:
        case `disabled`:
        case `disablePictureInPicture`:
        case `disableRemotePlayback`:
        case `formNoValidate`:
        case `hidden`:
        case `loop`:
        case `noModule`:
        case `noValidate`:
        case `open`:
        case `playsInline`:
        case `readOnly`:
        case `required`:
        case `reversed`:
        case `scoped`:
        case `seamless`:
        case `itemScope`:
          r && typeof r != `function` && typeof r != `symbol`
            ? e.setAttribute(n, ``)
            : e.removeAttribute(n)
          break
        case `capture`:
        case `download`:
          !0 === r
            ? e.setAttribute(n, ``)
            : !1 !== r && r != null && typeof r != `function` && typeof r != `symbol`
              ? e.setAttribute(n, r)
              : e.removeAttribute(n)
          break
        case `cols`:
        case `rows`:
        case `size`:
        case `span`:
          r != null && typeof r != `function` && typeof r != `symbol` && !isNaN(r) && 1 <= r
            ? e.setAttribute(n, r)
            : e.removeAttribute(n)
          break
        case `rowSpan`:
        case `start`:
          r == null || typeof r == `function` || typeof r == `symbol` || isNaN(r)
            ? e.removeAttribute(n)
            : e.setAttribute(n, r)
          break
        case `popover`:
          ;(vd(`beforetoggle`, e), vd(`toggle`, e), Ct(e, `popover`, r))
          break
        case `xlinkActuate`:
          Tt(e, `http://www.w3.org/1999/xlink`, `xlink:actuate`, r)
          break
        case `xlinkArcrole`:
          Tt(e, `http://www.w3.org/1999/xlink`, `xlink:arcrole`, r)
          break
        case `xlinkRole`:
          Tt(e, `http://www.w3.org/1999/xlink`, `xlink:role`, r)
          break
        case `xlinkShow`:
          Tt(e, `http://www.w3.org/1999/xlink`, `xlink:show`, r)
          break
        case `xlinkTitle`:
          Tt(e, `http://www.w3.org/1999/xlink`, `xlink:title`, r)
          break
        case `xlinkType`:
          Tt(e, `http://www.w3.org/1999/xlink`, `xlink:type`, r)
          break
        case `xmlBase`:
          Tt(e, `http://www.w3.org/XML/1998/namespace`, `xml:base`, r)
          break
        case `xmlLang`:
          Tt(e, `http://www.w3.org/XML/1998/namespace`, `xml:lang`, r)
          break
        case `xmlSpace`:
          Tt(e, `http://www.w3.org/XML/1998/namespace`, `xml:space`, r)
          break
        case `is`:
          Ct(e, `is`, r)
          break
        case `innerText`:
        case `textContent`:
          break
        default:
          ;(!(2 < n.length) || (n[0] !== `o` && n[0] !== `O`) || (n[1] !== `n` && n[1] !== `N`)) &&
            ((n = Gt.get(n) || n), Ct(e, n, r))
      }
    }
    function Nd(e, t, n, r, a, o) {
      switch (n) {
        case `style`:
          Ut(e, r, o)
          break
        case `dangerouslySetInnerHTML`:
          if (r != null) {
            if (typeof r != `object` || !(`__html` in r)) throw Error(i(61))
            if (((n = r.__html), n != null)) {
              if (a.children != null) throw Error(i(60))
              e.innerHTML = n
            }
          }
          break
        case `children`:
          typeof r == `string`
            ? Bt(e, r)
            : (typeof r == `number` || typeof r == `bigint`) && Bt(e, `` + r)
          break
        case `onScroll`:
          r != null && vd(`scroll`, e)
          break
        case `onScrollEnd`:
          r != null && vd(`scrollend`, e)
          break
        case `onClick`:
          r != null && (e.onclick = Jt)
          break
        case `suppressContentEditableWarning`:
        case `suppressHydrationWarning`:
        case `innerHTML`:
        case `ref`:
          break
        case `innerText`:
        case `textContent`:
          break
        default:
          if (!gt.hasOwnProperty(n))
            a: {
              if (
                n[0] === `o` &&
                n[1] === `n` &&
                ((a = n.endsWith(`Capture`)),
                (t = n.slice(2, a ? n.length - 7 : void 0)),
                (o = e[it] || null),
                (o = o == null ? null : o[n]),
                typeof o == `function` && e.removeEventListener(t, o, a),
                typeof r == `function`)
              ) {
                ;(typeof o != `function` &&
                  o !== null &&
                  (n in e ? (e[n] = null) : e.hasAttribute(n) && e.removeAttribute(n)),
                  e.addEventListener(t, r, a))
                break a
              }
              n in e ? (e[n] = r) : !0 === r ? e.setAttribute(n, ``) : Ct(e, n, r)
            }
      }
    }
    function Pd(e, t, n) {
      switch (t) {
        case `div`:
        case `span`:
        case `svg`:
        case `path`:
        case `a`:
        case `g`:
        case `p`:
        case `li`:
          break
        case `img`:
          ;(vd(`error`, e), vd(`load`, e))
          var r = !1,
            a = !1,
            o
          for (o in n)
            if (n.hasOwnProperty(o)) {
              var s = n[o]
              if (s != null)
                switch (o) {
                  case `src`:
                    r = !0
                    break
                  case `srcSet`:
                    a = !0
                    break
                  case `children`:
                  case `dangerouslySetInnerHTML`:
                    throw Error(i(137, t))
                  default:
                    Md(e, t, o, s, n, null)
                }
            }
          ;(a && Md(e, t, `srcSet`, n.srcSet, n, null), r && Md(e, t, `src`, n.src, n, null))
          return
        case `input`:
          vd(`invalid`, e)
          var c = (o = s = a = null),
            l = null,
            u = null
          for (r in n)
            if (n.hasOwnProperty(r)) {
              var d = n[r]
              if (d != null)
                switch (r) {
                  case `name`:
                    a = d
                    break
                  case `type`:
                    s = d
                    break
                  case `checked`:
                    l = d
                    break
                  case `defaultChecked`:
                    u = d
                    break
                  case `value`:
                    o = d
                    break
                  case `defaultValue`:
                    c = d
                    break
                  case `children`:
                  case `dangerouslySetInnerHTML`:
                    if (d != null) throw Error(i(137, t))
                    break
                  default:
                    Md(e, t, r, d, n, null)
                }
            }
          Ft(e, o, c, l, u, s, a, !1)
          return
        case `select`:
          for (a in (vd(`invalid`, e), (r = s = o = null), n))
            if (n.hasOwnProperty(a) && ((c = n[a]), c != null))
              switch (a) {
                case `value`:
                  o = c
                  break
                case `defaultValue`:
                  s = c
                  break
                case `multiple`:
                  r = c
                default:
                  Md(e, t, a, c, n, null)
              }
          ;((t = o),
            (n = s),
            (e.multiple = !!r),
            t == null ? n != null && Lt(e, !!r, n, !0) : Lt(e, !!r, t, !1))
          return
        case `textarea`:
          for (s in (vd(`invalid`, e), (o = a = r = null), n))
            if (n.hasOwnProperty(s) && ((c = n[s]), c != null))
              switch (s) {
                case `value`:
                  r = c
                  break
                case `defaultValue`:
                  a = c
                  break
                case `children`:
                  o = c
                  break
                case `dangerouslySetInnerHTML`:
                  if (c != null) throw Error(i(91))
                  break
                default:
                  Md(e, t, s, c, n, null)
              }
          zt(e, r, a, o)
          return
        case `option`:
          for (l in n)
            if (n.hasOwnProperty(l) && ((r = n[l]), r != null))
              switch (l) {
                case `selected`:
                  e.selected = r && typeof r != `function` && typeof r != `symbol`
                  break
                default:
                  Md(e, t, l, r, n, null)
              }
          return
        case `dialog`:
          ;(vd(`beforetoggle`, e), vd(`toggle`, e), vd(`cancel`, e), vd(`close`, e))
          break
        case `iframe`:
        case `object`:
          vd(`load`, e)
          break
        case `video`:
        case `audio`:
          for (r = 0; r < hd.length; r++) vd(hd[r], e)
          break
        case `image`:
          ;(vd(`error`, e), vd(`load`, e))
          break
        case `details`:
          vd(`toggle`, e)
          break
        case `embed`:
        case `source`:
        case `link`:
          ;(vd(`error`, e), vd(`load`, e))
        case `area`:
        case `base`:
        case `br`:
        case `col`:
        case `hr`:
        case `keygen`:
        case `meta`:
        case `param`:
        case `track`:
        case `wbr`:
        case `menuitem`:
          for (u in n)
            if (n.hasOwnProperty(u) && ((r = n[u]), r != null))
              switch (u) {
                case `children`:
                case `dangerouslySetInnerHTML`:
                  throw Error(i(137, t))
                default:
                  Md(e, t, u, r, n, null)
              }
          return
        default:
          if (Wt(t)) {
            for (d in n)
              n.hasOwnProperty(d) && ((r = n[d]), r !== void 0 && Nd(e, t, d, r, n, void 0))
            return
          }
      }
      for (c in n) n.hasOwnProperty(c) && ((r = n[c]), r != null && Md(e, t, c, r, n, null))
    }
    function Fd(e, t, n, r) {
      switch (t) {
        case `div`:
        case `span`:
        case `svg`:
        case `path`:
        case `a`:
        case `g`:
        case `p`:
        case `li`:
          break
        case `input`:
          var a = null,
            o = null,
            s = null,
            c = null,
            l = null,
            u = null,
            d = null
          for (m in n) {
            var f = n[m]
            if (n.hasOwnProperty(m) && f != null)
              switch (m) {
                case `checked`:
                  break
                case `value`:
                  break
                case `defaultValue`:
                  l = f
                default:
                  r.hasOwnProperty(m) || Md(e, t, m, null, r, f)
              }
          }
          for (var p in r) {
            var m = r[p]
            if (((f = n[p]), r.hasOwnProperty(p) && (m != null || f != null)))
              switch (p) {
                case `type`:
                  o = m
                  break
                case `name`:
                  a = m
                  break
                case `checked`:
                  u = m
                  break
                case `defaultChecked`:
                  d = m
                  break
                case `value`:
                  s = m
                  break
                case `defaultValue`:
                  c = m
                  break
                case `children`:
                case `dangerouslySetInnerHTML`:
                  if (m != null) throw Error(i(137, t))
                  break
                default:
                  m !== f && Md(e, t, p, m, r, f)
              }
          }
          Pt(e, s, c, l, u, d, o, a)
          return
        case `select`:
          for (o in ((m = s = c = p = null), n))
            if (((l = n[o]), n.hasOwnProperty(o) && l != null))
              switch (o) {
                case `value`:
                  break
                case `multiple`:
                  m = l
                default:
                  r.hasOwnProperty(o) || Md(e, t, o, null, r, l)
              }
          for (a in r)
            if (((o = r[a]), (l = n[a]), r.hasOwnProperty(a) && (o != null || l != null)))
              switch (a) {
                case `value`:
                  p = o
                  break
                case `defaultValue`:
                  c = o
                  break
                case `multiple`:
                  s = o
                default:
                  o !== l && Md(e, t, a, o, r, l)
              }
          ;((t = c),
            (n = s),
            (r = m),
            p == null
              ? !!r != !!n && (t == null ? Lt(e, !!n, n ? [] : ``, !1) : Lt(e, !!n, t, !0))
              : Lt(e, !!n, p, !1))
          return
        case `textarea`:
          for (c in ((m = p = null), n))
            if (((a = n[c]), n.hasOwnProperty(c) && a != null && !r.hasOwnProperty(c)))
              switch (c) {
                case `value`:
                  break
                case `children`:
                  break
                default:
                  Md(e, t, c, null, r, a)
              }
          for (s in r)
            if (((a = r[s]), (o = n[s]), r.hasOwnProperty(s) && (a != null || o != null)))
              switch (s) {
                case `value`:
                  p = a
                  break
                case `defaultValue`:
                  m = a
                  break
                case `children`:
                  break
                case `dangerouslySetInnerHTML`:
                  if (a != null) throw Error(i(91))
                  break
                default:
                  a !== o && Md(e, t, s, a, r, o)
              }
          Rt(e, p, m)
          return
        case `option`:
          for (var h in n)
            if (((p = n[h]), n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)))
              switch (h) {
                case `selected`:
                  e.selected = !1
                  break
                default:
                  Md(e, t, h, null, r, p)
              }
          for (l in r)
            if (
              ((p = r[l]), (m = n[l]), r.hasOwnProperty(l) && p !== m && (p != null || m != null))
            )
              switch (l) {
                case `selected`:
                  e.selected = p && typeof p != `function` && typeof p != `symbol`
                  break
                default:
                  Md(e, t, l, p, r, m)
              }
          return
        case `img`:
        case `link`:
        case `area`:
        case `base`:
        case `br`:
        case `col`:
        case `embed`:
        case `hr`:
        case `keygen`:
        case `meta`:
        case `param`:
        case `source`:
        case `track`:
        case `wbr`:
        case `menuitem`:
          for (var g in n)
            ((p = n[g]),
              n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && Md(e, t, g, null, r, p))
          for (u in r)
            if (
              ((p = r[u]), (m = n[u]), r.hasOwnProperty(u) && p !== m && (p != null || m != null))
            )
              switch (u) {
                case `children`:
                case `dangerouslySetInnerHTML`:
                  if (p != null) throw Error(i(137, t))
                  break
                default:
                  Md(e, t, u, p, r, m)
              }
          return
        default:
          if (Wt(t)) {
            for (var _ in n)
              ((p = n[_]),
                n.hasOwnProperty(_) &&
                  p !== void 0 &&
                  !r.hasOwnProperty(_) &&
                  Nd(e, t, _, void 0, r, p))
            for (d in r)
              ((p = r[d]),
                (m = n[d]),
                !r.hasOwnProperty(d) ||
                  p === m ||
                  (p === void 0 && m === void 0) ||
                  Nd(e, t, d, p, r, m))
            return
          }
      }
      for (var v in n)
        ((p = n[v]),
          n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && Md(e, t, v, null, r, p))
      for (f in r)
        ((p = r[f]),
          (m = n[f]),
          !r.hasOwnProperty(f) || p === m || (p == null && m == null) || Md(e, t, f, p, r, m))
    }
    function Id(e) {
      switch (e) {
        case `css`:
        case `script`:
        case `font`:
        case `img`:
        case `image`:
        case `input`:
        case `link`:
          return !0
        default:
          return !1
      }
    }
    function Ld() {
      if (typeof performance.getEntriesByType == `function`) {
        for (
          var e = 0, t = 0, n = performance.getEntriesByType(`resource`), r = 0;
          r < n.length;
          r++
        ) {
          var i = n[r],
            a = i.transferSize,
            o = i.initiatorType,
            s = i.duration
          if (a && s && Id(o)) {
            for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
              var c = n[r],
                l = c.startTime
              if (l > s) break
              var u = c.transferSize,
                d = c.initiatorType
              u && Id(d) && ((c = c.responseEnd), (o += u * (c < s ? 1 : (s - l) / (c - l))))
            }
            if ((--r, (t += (8 * (a + o)) / (i.duration / 1e3)), e++, 10 < e)) break
          }
        }
        if (0 < e) return t / e / 1e6
      }
      return navigator.connection && ((e = navigator.connection.downlink), typeof e == `number`)
        ? e
        : 5
    }
    var Rd = null,
      zd = null
    function Bd(e) {
      return e.nodeType === 9 ? e : e.ownerDocument
    }
    function Vd(e) {
      switch (e) {
        case `http://www.w3.org/2000/svg`:
          return 1
        case `http://www.w3.org/1998/Math/MathML`:
          return 2
        default:
          return 0
      }
    }
    function Hd(e, t) {
      if (e === 0)
        switch (t) {
          case `svg`:
            return 1
          case `math`:
            return 2
          default:
            return 0
        }
      return e === 1 && t === `foreignObject` ? 0 : e
    }
    function Ud(e, t) {
      return (
        e === `textarea` ||
        e === `noscript` ||
        typeof t.children == `string` ||
        typeof t.children == `number` ||
        typeof t.children == `bigint` ||
        (typeof t.dangerouslySetInnerHTML == `object` &&
          t.dangerouslySetInnerHTML !== null &&
          t.dangerouslySetInnerHTML.__html != null)
      )
    }
    var Wd = null
    function Gd() {
      var e = window.event
      return e && e.type === `popstate` ? (e === Wd ? !1 : ((Wd = e), !0)) : ((Wd = null), !1)
    }
    var Kd = typeof setTimeout == `function` ? setTimeout : void 0,
      qd = typeof clearTimeout == `function` ? clearTimeout : void 0,
      Jd = typeof Promise == `function` ? Promise : void 0,
      Yd =
        typeof queueMicrotask == `function`
          ? queueMicrotask
          : Jd === void 0
            ? Kd
            : function (e) {
                return Jd.resolve(null).then(e).catch(Xd)
              }
    function Xd(e) {
      setTimeout(function () {
        throw e
      })
    }
    function Zd(e) {
      return e === `head`
    }
    function Qd(e, t) {
      var n = t,
        r = 0
      do {
        var i = n.nextSibling
        if ((e.removeChild(n), i && i.nodeType === 8))
          if (((n = i.data), n === `/$` || n === `/&`)) {
            if (r === 0) {
              ;(e.removeChild(i), Np(t))
              return
            }
            r--
          } else if (n === `$` || n === `$?` || n === `$~` || n === `$!` || n === `&`) r++
          else if (n === `html`) pf(e.ownerDocument.documentElement)
          else if (n === `head`) {
            ;((n = e.ownerDocument.head), pf(n))
            for (var a = n.firstChild; a; ) {
              var o = a.nextSibling,
                s = a.nodeName
              ;(a[H] ||
                s === `SCRIPT` ||
                s === `STYLE` ||
                (s === `LINK` && a.rel.toLowerCase() === `stylesheet`) ||
                n.removeChild(a),
                (a = o))
            }
          } else n === `body` && pf(e.ownerDocument.body)
        n = i
      } while (n)
      Np(t)
    }
    function $d(e, t) {
      var n = e
      e = 0
      do {
        var r = n.nextSibling
        if (
          (n.nodeType === 1
            ? t
              ? ((n._stashedDisplay = n.style.display), (n.style.display = `none`))
              : ((n.style.display = n._stashedDisplay || ``),
                n.getAttribute(`style`) === `` && n.removeAttribute(`style`))
            : n.nodeType === 3 &&
              (t
                ? ((n._stashedText = n.nodeValue), (n.nodeValue = ``))
                : (n.nodeValue = n._stashedText || ``)),
          r && r.nodeType === 8)
        )
          if (((n = r.data), n === `/$`)) {
            if (e === 0) break
            e--
          } else (n !== `$` && n !== `$?` && n !== `$~` && n !== `$!`) || e++
        n = r
      } while (n)
    }
    function ef(e) {
      var t = e.firstChild
      for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
        var n = t
        switch (((t = t.nextSibling), n.nodeName)) {
          case `HTML`:
          case `HEAD`:
          case `BODY`:
            ;(ef(n), ut(n))
            continue
          case `SCRIPT`:
          case `STYLE`:
            continue
          case `LINK`:
            if (n.rel.toLowerCase() === `stylesheet`) continue
        }
        e.removeChild(n)
      }
    }
    function tf(e, t, n, r) {
      for (; e.nodeType === 1; ) {
        var i = n
        if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
          if (!r && (e.nodeName !== `INPUT` || e.type !== `hidden`)) break
        } else if (!r)
          if (t === `input` && e.type === `hidden`) {
            var a = i.name == null ? null : `` + i.name
            if (i.type === `hidden` && e.getAttribute(`name`) === a) return e
          } else return e
        else if (!e[H])
          switch (t) {
            case `meta`:
              if (!e.hasAttribute(`itemprop`)) break
              return e
            case `link`:
              if (
                ((a = e.getAttribute(`rel`)),
                (a === `stylesheet` && e.hasAttribute(`data-precedence`)) ||
                  a !== i.rel ||
                  e.getAttribute(`href`) !== (i.href == null || i.href === `` ? null : i.href) ||
                  e.getAttribute(`crossorigin`) !==
                    (i.crossOrigin == null ? null : i.crossOrigin) ||
                  e.getAttribute(`title`) !== (i.title == null ? null : i.title))
              )
                break
              return e
            case `style`:
              if (e.hasAttribute(`data-precedence`)) break
              return e
            case `script`:
              if (
                ((a = e.getAttribute(`src`)),
                (a !== (i.src == null ? null : i.src) ||
                  e.getAttribute(`type`) !== (i.type == null ? null : i.type) ||
                  e.getAttribute(`crossorigin`) !==
                    (i.crossOrigin == null ? null : i.crossOrigin)) &&
                  a &&
                  e.hasAttribute(`async`) &&
                  !e.hasAttribute(`itemprop`))
              )
                break
              return e
            default:
              return e
          }
        if (((e = cf(e.nextSibling)), e === null)) break
      }
      return null
    }
    function nf(e, t, n) {
      if (t === ``) return null
      for (; e.nodeType !== 3; )
        if (
          ((e.nodeType !== 1 || e.nodeName !== `INPUT` || e.type !== `hidden`) && !n) ||
          ((e = cf(e.nextSibling)), e === null)
        )
          return null
      return e
    }
    function rf(e, t) {
      for (; e.nodeType !== 8; )
        if (
          ((e.nodeType !== 1 || e.nodeName !== `INPUT` || e.type !== `hidden`) && !t) ||
          ((e = cf(e.nextSibling)), e === null)
        )
          return null
      return e
    }
    function af(e) {
      return e.data === `$?` || e.data === `$~`
    }
    function of(e) {
      return e.data === `$!` || (e.data === `$?` && e.ownerDocument.readyState !== `loading`)
    }
    function sf(e, t) {
      var n = e.ownerDocument
      if (e.data === `$~`) e._reactRetry = t
      else if (e.data !== `$?` || n.readyState !== `loading`) t()
      else {
        var r = function () {
          ;(t(), n.removeEventListener(`DOMContentLoaded`, r))
        }
        ;(n.addEventListener(`DOMContentLoaded`, r), (e._reactRetry = r))
      }
    }
    function cf(e) {
      for (; e != null; e = e.nextSibling) {
        var t = e.nodeType
        if (t === 1 || t === 3) break
        if (t === 8) {
          if (
            ((t = e.data),
            t === `$` ||
              t === `$!` ||
              t === `$?` ||
              t === `$~` ||
              t === `&` ||
              t === `F!` ||
              t === `F`)
          )
            break
          if (t === `/$` || t === `/&`) return null
        }
      }
      return e
    }
    var lf = null
    function uf(e) {
      e = e.nextSibling
      for (var t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data
          if (n === `/$` || n === `/&`) {
            if (t === 0) return cf(e.nextSibling)
            t--
          } else (n !== `$` && n !== `$!` && n !== `$?` && n !== `$~` && n !== `&`) || t++
        }
        e = e.nextSibling
      }
      return null
    }
    function df(e) {
      e = e.previousSibling
      for (var t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data
          if (n === `$` || n === `$!` || n === `$?` || n === `$~` || n === `&`) {
            if (t === 0) return e
            t--
          } else (n !== `/$` && n !== `/&`) || t++
        }
        e = e.previousSibling
      }
      return null
    }
    function ff(e, t, n) {
      switch (((t = Bd(n)), e)) {
        case `html`:
          if (((e = t.documentElement), !e)) throw Error(i(452))
          return e
        case `head`:
          if (((e = t.head), !e)) throw Error(i(453))
          return e
        case `body`:
          if (((e = t.body), !e)) throw Error(i(454))
          return e
        default:
          throw Error(i(451))
      }
    }
    function pf(e) {
      for (var t = e.attributes; t.length; ) e.removeAttributeNode(t[0])
      ut(e)
    }
    var mf = new Map(),
      hf = new Set()
    function gf(e) {
      return typeof e.getRootNode == `function`
        ? e.getRootNode()
        : e.nodeType === 9
          ? e
          : e.ownerDocument
    }
    var _f = I.d
    I.d = { f: vf, r: yf, D: Sf, C: Cf, L: wf, m: Tf, X: Df, S: Ef, M: Of }
    function vf() {
      var e = _f.f(),
        t = _u()
      return e || t
    }
    function yf(e) {
      var t = ft(e)
      t !== null && t.tag === 5 && t.type === `form` ? ys(t) : _f.r(e)
    }
    var bf = typeof document > `u` ? null : document
    function xf(e, t, n) {
      var r = bf
      if (r && typeof t == `string` && t) {
        var i = Nt(t)
        ;((i = `link[rel="` + e + `"][href="` + i + `"]`),
          typeof n == `string` && (i += `[crossorigin="` + n + `"]`),
          hf.has(i) ||
            (hf.add(i),
            (e = { rel: e, crossOrigin: n, href: t }),
            r.querySelector(i) === null &&
              ((t = r.createElement(`link`)), Pd(t, `link`, e), mt(t), r.head.appendChild(t))))
      }
    }
    function Sf(e) {
      ;(_f.D(e), xf(`dns-prefetch`, e, null))
    }
    function Cf(e, t) {
      ;(_f.C(e, t), xf(`preconnect`, e, t))
    }
    function wf(e, t, n) {
      _f.L(e, t, n)
      var r = bf
      if (r && e && t) {
        var i = `link[rel="preload"][as="` + Nt(t) + `"]`
        t === `image` && n && n.imageSrcSet
          ? ((i += `[imagesrcset="` + Nt(n.imageSrcSet) + `"]`),
            typeof n.imageSizes == `string` && (i += `[imagesizes="` + Nt(n.imageSizes) + `"]`))
          : (i += `[href="` + Nt(e) + `"]`)
        var a = i
        switch (t) {
          case `style`:
            a = Af(e)
            break
          case `script`:
            a = Pf(e)
        }
        mf.has(a) ||
          ((e = h(
            { rel: `preload`, href: t === `image` && n && n.imageSrcSet ? void 0 : e, as: t },
            n
          )),
          mf.set(a, e),
          r.querySelector(i) !== null ||
            (t === `style` && r.querySelector(jf(a))) ||
            (t === `script` && r.querySelector(Ff(a))) ||
            ((t = r.createElement(`link`)), Pd(t, `link`, e), mt(t), r.head.appendChild(t)))
      }
    }
    function Tf(e, t) {
      _f.m(e, t)
      var n = bf
      if (n && e) {
        var r = t && typeof t.as == `string` ? t.as : `script`,
          i = `link[rel="modulepreload"][as="` + Nt(r) + `"][href="` + Nt(e) + `"]`,
          a = i
        switch (r) {
          case `audioworklet`:
          case `paintworklet`:
          case `serviceworker`:
          case `sharedworker`:
          case `worker`:
          case `script`:
            a = Pf(e)
        }
        if (
          !mf.has(a) &&
          ((e = h({ rel: `modulepreload`, href: e }, t)), mf.set(a, e), n.querySelector(i) === null)
        ) {
          switch (r) {
            case `audioworklet`:
            case `paintworklet`:
            case `serviceworker`:
            case `sharedworker`:
            case `worker`:
            case `script`:
              if (n.querySelector(Ff(a))) return
          }
          ;((r = n.createElement(`link`)), Pd(r, `link`, e), mt(r), n.head.appendChild(r))
        }
      }
    }
    function Ef(e, t, n) {
      _f.S(e, t, n)
      var r = bf
      if (r && e) {
        var i = pt(r).hoistableStyles,
          a = Af(e)
        t ||= `default`
        var o = i.get(a)
        if (!o) {
          var s = { loading: 0, preload: null }
          if ((o = r.querySelector(jf(a)))) s.loading = 5
          else {
            ;((e = h({ rel: `stylesheet`, href: e, 'data-precedence': t }, n)),
              (n = mf.get(a)) && Rf(e, n))
            var c = (o = r.createElement(`link`))
            ;(mt(c),
              Pd(c, `link`, e),
              (c._p = new Promise(function (e, t) {
                ;((c.onload = e), (c.onerror = t))
              })),
              c.addEventListener(`load`, function () {
                s.loading |= 1
              }),
              c.addEventListener(`error`, function () {
                s.loading |= 2
              }),
              (s.loading |= 4),
              Lf(o, t, r))
          }
          ;((o = { type: `stylesheet`, instance: o, count: 1, state: s }), i.set(a, o))
        }
      }
    }
    function Df(e, t) {
      _f.X(e, t)
      var n = bf
      if (n && e) {
        var r = pt(n).hoistableScripts,
          i = Pf(e),
          a = r.get(i)
        a ||
          ((a = n.querySelector(Ff(i))),
          a ||
            ((e = h({ src: e, async: !0 }, t)),
            (t = mf.get(i)) && zf(e, t),
            (a = n.createElement(`script`)),
            mt(a),
            Pd(a, `link`, e),
            n.head.appendChild(a)),
          (a = { type: `script`, instance: a, count: 1, state: null }),
          r.set(i, a))
      }
    }
    function Of(e, t) {
      _f.M(e, t)
      var n = bf
      if (n && e) {
        var r = pt(n).hoistableScripts,
          i = Pf(e),
          a = r.get(i)
        a ||
          ((a = n.querySelector(Ff(i))),
          a ||
            ((e = h({ src: e, async: !0, type: `module` }, t)),
            (t = mf.get(i)) && zf(e, t),
            (a = n.createElement(`script`)),
            mt(a),
            Pd(a, `link`, e),
            n.head.appendChild(a)),
          (a = { type: `script`, instance: a, count: 1, state: null }),
          r.set(i, a))
      }
    }
    function kf(e, t, n, r) {
      var a = (a = ae.current) ? gf(a) : null
      if (!a) throw Error(i(446))
      switch (e) {
        case `meta`:
        case `title`:
          return null
        case `style`:
          return typeof n.precedence == `string` && typeof n.href == `string`
            ? ((t = Af(n.href)),
              (n = pt(a).hoistableStyles),
              (r = n.get(t)),
              r || ((r = { type: `style`, instance: null, count: 0, state: null }), n.set(t, r)),
              r)
            : { type: `void`, instance: null, count: 0, state: null }
        case `link`:
          if (
            n.rel === `stylesheet` &&
            typeof n.href == `string` &&
            typeof n.precedence == `string`
          ) {
            e = Af(n.href)
            var o = pt(a).hoistableStyles,
              s = o.get(e)
            if (
              (s ||
                ((a = a.ownerDocument || a),
                (s = {
                  type: `stylesheet`,
                  instance: null,
                  count: 0,
                  state: { loading: 0, preload: null }
                }),
                o.set(e, s),
                (o = a.querySelector(jf(e))) && !o._p && ((s.instance = o), (s.state.loading = 5)),
                mf.has(e) ||
                  ((n = {
                    rel: `preload`,
                    as: `style`,
                    href: n.href,
                    crossOrigin: n.crossOrigin,
                    integrity: n.integrity,
                    media: n.media,
                    hrefLang: n.hrefLang,
                    referrerPolicy: n.referrerPolicy
                  }),
                  mf.set(e, n),
                  o || Nf(a, e, n, s.state))),
              t && r === null)
            )
              throw Error(i(528, ``))
            return s
          }
          if (t && r !== null) throw Error(i(529, ``))
          return null
        case `script`:
          return (
            (t = n.async),
            (n = n.src),
            typeof n == `string` && t && typeof t != `function` && typeof t != `symbol`
              ? ((t = Pf(n)),
                (n = pt(a).hoistableScripts),
                (r = n.get(t)),
                r || ((r = { type: `script`, instance: null, count: 0, state: null }), n.set(t, r)),
                r)
              : { type: `void`, instance: null, count: 0, state: null }
          )
        default:
          throw Error(i(444, e))
      }
    }
    function Af(e) {
      return `href="` + Nt(e) + `"`
    }
    function jf(e) {
      return `link[rel="stylesheet"][` + e + `]`
    }
    function Mf(e) {
      return h({}, e, { 'data-precedence': e.precedence, precedence: null })
    }
    function Nf(e, t, n, r) {
      e.querySelector(`link[rel="preload"][as="style"][` + t + `]`)
        ? (r.loading = 1)
        : ((t = e.createElement(`link`)),
          (r.preload = t),
          t.addEventListener(`load`, function () {
            return (r.loading |= 1)
          }),
          t.addEventListener(`error`, function () {
            return (r.loading |= 2)
          }),
          Pd(t, `link`, n),
          mt(t),
          e.head.appendChild(t))
    }
    function Pf(e) {
      return `[src="` + Nt(e) + `"]`
    }
    function Ff(e) {
      return `script[async]` + e
    }
    function If(e, t, n) {
      if ((t.count++, t.instance === null))
        switch (t.type) {
          case `style`:
            var r = e.querySelector(`style[data-href~="` + Nt(n.href) + `"]`)
            if (r) return ((t.instance = r), mt(r), r)
            var a = h({}, n, {
              'data-href': n.href,
              'data-precedence': n.precedence,
              href: null,
              precedence: null
            })
            return (
              (r = (e.ownerDocument || e).createElement(`style`)),
              mt(r),
              Pd(r, `style`, a),
              Lf(r, n.precedence, e),
              (t.instance = r)
            )
          case `stylesheet`:
            a = Af(n.href)
            var o = e.querySelector(jf(a))
            if (o) return ((t.state.loading |= 4), (t.instance = o), mt(o), o)
            ;((r = Mf(n)),
              (a = mf.get(a)) && Rf(r, a),
              (o = (e.ownerDocument || e).createElement(`link`)),
              mt(o))
            var s = o
            return (
              (s._p = new Promise(function (e, t) {
                ;((s.onload = e), (s.onerror = t))
              })),
              Pd(o, `link`, r),
              (t.state.loading |= 4),
              Lf(o, n.precedence, e),
              (t.instance = o)
            )
          case `script`:
            return (
              (o = Pf(n.src)),
              (a = e.querySelector(Ff(o)))
                ? ((t.instance = a), mt(a), a)
                : ((r = n),
                  (a = mf.get(o)) && ((r = h({}, n)), zf(r, a)),
                  (e = e.ownerDocument || e),
                  (a = e.createElement(`script`)),
                  mt(a),
                  Pd(a, `link`, r),
                  e.head.appendChild(a),
                  (t.instance = a))
            )
          case `void`:
            return null
          default:
            throw Error(i(443, t.type))
        }
      else
        t.type === `stylesheet` &&
          !(t.state.loading & 4) &&
          ((r = t.instance), (t.state.loading |= 4), Lf(r, n.precedence, e))
      return t.instance
    }
    function Lf(e, t, n) {
      for (
        var r = n.querySelectorAll(
            `link[rel="stylesheet"][data-precedence],style[data-precedence]`
          ),
          i = r.length ? r[r.length - 1] : null,
          a = i,
          o = 0;
        o < r.length;
        o++
      ) {
        var s = r[o]
        if (s.dataset.precedence === t) a = s
        else if (a !== i) break
      }
      a
        ? a.parentNode.insertBefore(e, a.nextSibling)
        : ((t = n.nodeType === 9 ? n.head : n), t.insertBefore(e, t.firstChild))
    }
    function Rf(e, t) {
      ;((e.crossOrigin ??= t.crossOrigin),
        (e.referrerPolicy ??= t.referrerPolicy),
        (e.title ??= t.title))
    }
    function zf(e, t) {
      ;((e.crossOrigin ??= t.crossOrigin),
        (e.referrerPolicy ??= t.referrerPolicy),
        (e.integrity ??= t.integrity))
    }
    var Bf = null
    function Vf(e, t, n) {
      if (Bf === null) {
        var r = new Map(),
          i = (Bf = new Map())
        i.set(n, r)
      } else ((i = Bf), (r = i.get(n)), r || ((r = new Map()), i.set(n, r)))
      if (r.has(e)) return r
      for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
        var a = n[i]
        if (
          !(a[H] || a[rt] || (e === `link` && a.getAttribute(`rel`) === `stylesheet`)) &&
          a.namespaceURI !== `http://www.w3.org/2000/svg`
        ) {
          var o = a.getAttribute(t) || ``
          o = e + o
          var s = r.get(o)
          s ? s.push(a) : r.set(o, [a])
        }
      }
      return r
    }
    function Hf(e, t, n) {
      ;((e = e.ownerDocument || e),
        e.head.insertBefore(n, t === `title` ? e.querySelector(`head > title`) : null))
    }
    function Uf(e, t, n) {
      if (n === 1 || t.itemProp != null) return !1
      switch (e) {
        case `meta`:
        case `title`:
          return !0
        case `style`:
          if (typeof t.precedence != `string` || typeof t.href != `string` || t.href === ``) break
          return !0
        case `link`:
          if (
            typeof t.rel != `string` ||
            typeof t.href != `string` ||
            t.href === `` ||
            t.onLoad ||
            t.onError
          )
            break
          switch (t.rel) {
            case `stylesheet`:
              return ((e = t.disabled), typeof t.precedence == `string` && e == null)
            default:
              return !0
          }
        case `script`:
          if (
            t.async &&
            typeof t.async != `function` &&
            typeof t.async != `symbol` &&
            !t.onLoad &&
            !t.onError &&
            t.src &&
            typeof t.src == `string`
          )
            return !0
      }
      return !1
    }
    function Wf(e) {
      return !(e.type === `stylesheet` && !(e.state.loading & 3))
    }
    function Gf(e, t, n, r) {
      if (
        n.type === `stylesheet` &&
        (typeof r.media != `string` || !1 !== matchMedia(r.media).matches) &&
        !(n.state.loading & 4)
      ) {
        if (n.instance === null) {
          var i = Af(r.href),
            a = t.querySelector(jf(i))
          if (a) {
            ;((t = a._p),
              typeof t == `object` &&
                t &&
                typeof t.then == `function` &&
                (e.count++, (e = Jf.bind(e)), t.then(e, e)),
              (n.state.loading |= 4),
              (n.instance = a),
              mt(a))
            return
          }
          ;((a = t.ownerDocument || t),
            (r = Mf(r)),
            (i = mf.get(i)) && Rf(r, i),
            (a = a.createElement(`link`)),
            mt(a))
          var o = a
          ;((o._p = new Promise(function (e, t) {
            ;((o.onload = e), (o.onerror = t))
          })),
            Pd(a, `link`, r),
            (n.instance = a))
        }
        ;(e.stylesheets === null && (e.stylesheets = new Map()),
          e.stylesheets.set(n, t),
          (t = n.state.preload) &&
            !(n.state.loading & 3) &&
            (e.count++,
            (n = Jf.bind(e)),
            t.addEventListener(`load`, n),
            t.addEventListener(`error`, n)))
      }
    }
    var Kf = 0
    function qf(e, t) {
      return (
        e.stylesheets && e.count === 0 && Xf(e, e.stylesheets),
        0 < e.count || 0 < e.imgCount
          ? function (n) {
              var r = setTimeout(function () {
                if ((e.stylesheets && Xf(e, e.stylesheets), e.unsuspend)) {
                  var t = e.unsuspend
                  ;((e.unsuspend = null), t())
                }
              }, 6e4 + t)
              0 < e.imgBytes && Kf === 0 && (Kf = 62500 * Ld())
              var i = setTimeout(
                function () {
                  if (
                    ((e.waitingForImages = !1),
                    e.count === 0 && (e.stylesheets && Xf(e, e.stylesheets), e.unsuspend))
                  ) {
                    var t = e.unsuspend
                    ;((e.unsuspend = null), t())
                  }
                },
                (e.imgBytes > Kf ? 50 : 800) + t
              )
              return (
                (e.unsuspend = n),
                function () {
                  ;((e.unsuspend = null), clearTimeout(r), clearTimeout(i))
                }
              )
            }
          : null
      )
    }
    function Jf() {
      if ((this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages))) {
        if (this.stylesheets) Xf(this, this.stylesheets)
        else if (this.unsuspend) {
          var e = this.unsuspend
          ;((this.unsuspend = null), e())
        }
      }
    }
    var Yf = null
    function Xf(e, t) {
      ;((e.stylesheets = null),
        e.unsuspend !== null &&
          (e.count++, (Yf = new Map()), t.forEach(Zf, e), (Yf = null), Jf.call(e)))
    }
    function Zf(e, t) {
      if (!(t.state.loading & 4)) {
        var n = Yf.get(e)
        if (n) var r = n.get(null)
        else {
          ;((n = new Map()), Yf.set(e, n))
          for (
            var i = e.querySelectorAll(`link[data-precedence],style[data-precedence]`), a = 0;
            a < i.length;
            a++
          ) {
            var o = i[a]
            ;(o.nodeName === `LINK` || o.getAttribute(`media`) !== `not all`) &&
              (n.set(o.dataset.precedence, o), (r = o))
          }
          r && n.set(null, r)
        }
        ;((i = t.instance),
          (o = i.getAttribute(`data-precedence`)),
          (a = n.get(o) || r),
          a === r && n.set(null, i),
          n.set(o, i),
          this.count++,
          (r = Jf.bind(this)),
          i.addEventListener(`load`, r),
          i.addEventListener(`error`, r),
          a
            ? a.parentNode.insertBefore(i, a.nextSibling)
            : ((e = e.nodeType === 9 ? e.head : e), e.insertBefore(i, e.firstChild)),
          (t.state.loading |= 4))
      }
    }
    var Qf = {
      $$typeof: C,
      Provider: null,
      Consumer: null,
      _currentValue: te,
      _currentValue2: te,
      _threadCount: 0
    }
    function $f(e, t, n, r, i, a, o, s, c) {
      ;((this.tag = 1),
        (this.containerInfo = e),
        (this.pingCache = this.current = this.pendingChildren = null),
        (this.timeoutHandle = -1),
        (this.callbackNode =
          this.next =
          this.pendingContext =
          this.context =
          this.cancelPendingCommit =
            null),
        (this.callbackPriority = 0),
        (this.expirationTimes = Ke(-1)),
        (this.entangledLanes =
          this.shellSuspendCounter =
          this.errorRecoveryDisabledLanes =
          this.expiredLanes =
          this.warmLanes =
          this.pingedLanes =
          this.suspendedLanes =
          this.pendingLanes =
            0),
        (this.entanglements = Ke(0)),
        (this.hiddenUpdates = Ke(null)),
        (this.identifierPrefix = r),
        (this.onUncaughtError = i),
        (this.onCaughtError = a),
        (this.onRecoverableError = o),
        (this.pooledCache = null),
        (this.pooledCacheLanes = 0),
        (this.formState = c),
        (this.incompleteTransitions = new Map()))
    }
    function ep(e, t, n, r, i, a, o, s, c, l, u, d) {
      return (
        (e = new $f(e, t, n, o, c, l, u, d, s)),
        (t = 1),
        !0 === a && (t |= 24),
        (a = Qr(3, null, null, t)),
        (e.current = a),
        (a.stateNode = e),
        (t = $i()),
        t.refCount++,
        (e.pooledCache = t),
        t.refCount++,
        (a.memoizedState = { element: r, isDehydrated: n, cache: t }),
        ja(a),
        e
      )
    }
    function tp(e) {
      return e ? ((e = Xr), e) : Xr
    }
    function np(e, t, n, r, i, a) {
      ;((i = tp(i)),
        r.context === null ? (r.context = i) : (r.pendingContext = i),
        (r = Na(t)),
        (r.payload = { element: n }),
        (a = a === void 0 ? null : a),
        a !== null && (r.callback = a),
        (n = Pa(e, r, t)),
        n !== null && (fu(n, e, t), Fa(n, e, t)))
    }
    function rp(e, t) {
      if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
        var n = e.retryLane
        e.retryLane = n !== 0 && n < t ? n : t
      }
    }
    function ip(e, t) {
      ;(rp(e, t), (e = e.alternate) && rp(e, t))
    }
    function ap(e) {
      if (e.tag === 13 || e.tag === 31) {
        var t = qr(e, 67108864)
        ;(t !== null && fu(t, e, 67108864), ip(e, 67108864))
      }
    }
    function op(e) {
      if (e.tag === 13 || e.tag === 31) {
        var t = uu()
        t = Qe(t)
        var n = qr(e, t)
        ;(n !== null && fu(n, e, t), ip(e, t))
      }
    }
    var sp = !0
    function cp(e, t, n, r) {
      var i = F.T
      F.T = null
      var a = I.p
      try {
        ;((I.p = 2), up(e, t, n, r))
      } finally {
        ;((I.p = a), (F.T = i))
      }
    }
    function lp(e, t, n, r) {
      var i = F.T
      F.T = null
      var a = I.p
      try {
        ;((I.p = 8), up(e, t, n, r))
      } finally {
        ;((I.p = a), (F.T = i))
      }
    }
    function up(e, t, n, r) {
      if (sp) {
        var i = dp(r)
        if (i === null) (Cd(e, t, r, fp, n), Cp(e, r))
        else if (Tp(i, e, t, n, r)) r.stopPropagation()
        else if ((Cp(e, r), t & 4 && -1 < Sp.indexOf(e))) {
          for (; i !== null; ) {
            var a = ft(i)
            if (a !== null)
              switch (a.tag) {
                case 3:
                  if (((a = a.stateNode), a.current.memoizedState.isDehydrated)) {
                    var o = He(a.pendingLanes)
                    if (o !== 0) {
                      var s = a
                      for (s.pendingLanes |= 2, s.entangledLanes |= 2; o; ) {
                        var c = 1 << (31 - Fe(o))
                        ;((s.entanglements[1] |= c), (o &= ~c))
                      }
                      ;(td(a), !(Nl & 6) && ((Ql = Ce() + 500), nd(0, !1)))
                    }
                  }
                  break
                case 31:
                case 13:
                  ;((s = qr(a, 2)), s !== null && fu(s, a, 2), _u(), ip(a, 2))
              }
            if (((a = dp(r)), a === null && Cd(e, t, r, fp, n), a === i)) break
            i = a
          }
          i !== null && r.stopPropagation()
        } else Cd(e, t, r, null, n)
      }
    }
    function dp(e) {
      return ((e = Xt(e)), pp(e))
    }
    var fp = null
    function pp(e) {
      if (((fp = null), (e = dt(e)), e !== null)) {
        var t = o(e)
        if (t === null) e = null
        else {
          var n = t.tag
          if (n === 13) {
            if (((e = s(t)), e !== null)) return e
            e = null
          } else if (n === 31) {
            if (((e = c(t)), e !== null)) return e
            e = null
          } else if (n === 3) {
            if (t.stateNode.current.memoizedState.isDehydrated)
              return t.tag === 3 ? t.stateNode.containerInfo : null
            e = null
          } else t !== e && (e = null)
        }
      }
      return ((fp = e), null)
    }
    function mp(e) {
      switch (e) {
        case `beforetoggle`:
        case `cancel`:
        case `click`:
        case `close`:
        case `contextmenu`:
        case `copy`:
        case `cut`:
        case `auxclick`:
        case `dblclick`:
        case `dragend`:
        case `dragstart`:
        case `drop`:
        case `focusin`:
        case `focusout`:
        case `input`:
        case `invalid`:
        case `keydown`:
        case `keypress`:
        case `keyup`:
        case `mousedown`:
        case `mouseup`:
        case `paste`:
        case `pause`:
        case `play`:
        case `pointercancel`:
        case `pointerdown`:
        case `pointerup`:
        case `ratechange`:
        case `reset`:
        case `resize`:
        case `seeked`:
        case `submit`:
        case `toggle`:
        case `touchcancel`:
        case `touchend`:
        case `touchstart`:
        case `volumechange`:
        case `change`:
        case `selectionchange`:
        case `textInput`:
        case `compositionstart`:
        case `compositionend`:
        case `compositionupdate`:
        case `beforeblur`:
        case `afterblur`:
        case `beforeinput`:
        case `blur`:
        case `fullscreenchange`:
        case `focus`:
        case `hashchange`:
        case `popstate`:
        case `select`:
        case `selectstart`:
          return 2
        case `drag`:
        case `dragenter`:
        case `dragexit`:
        case `dragleave`:
        case `dragover`:
        case `mousemove`:
        case `mouseout`:
        case `mouseover`:
        case `pointermove`:
        case `pointerout`:
        case `pointerover`:
        case `scroll`:
        case `touchmove`:
        case `wheel`:
        case `mouseenter`:
        case `mouseleave`:
        case `pointerenter`:
        case `pointerleave`:
          return 8
        case `message`:
          switch (we()) {
            case Te:
              return 2
            case Ee:
              return 8
            case De:
            case Oe:
              return 32
            case ke:
              return 268435456
            default:
              return 32
          }
        default:
          return 32
      }
    }
    var hp = !1,
      gp = null,
      _p = null,
      vp = null,
      yp = new Map(),
      bp = new Map(),
      xp = [],
      Sp =
        `mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset`.split(
          ` `
        )
    function Cp(e, t) {
      switch (e) {
        case `focusin`:
        case `focusout`:
          gp = null
          break
        case `dragenter`:
        case `dragleave`:
          _p = null
          break
        case `mouseover`:
        case `mouseout`:
          vp = null
          break
        case `pointerover`:
        case `pointerout`:
          yp.delete(t.pointerId)
          break
        case `gotpointercapture`:
        case `lostpointercapture`:
          bp.delete(t.pointerId)
      }
    }
    function wp(e, t, n, r, i, a) {
      return e === null || e.nativeEvent !== a
        ? ((e = {
            blockedOn: t,
            domEventName: n,
            eventSystemFlags: r,
            nativeEvent: a,
            targetContainers: [i]
          }),
          t !== null && ((t = ft(t)), t !== null && ap(t)),
          e)
        : ((e.eventSystemFlags |= r),
          (t = e.targetContainers),
          i !== null && t.indexOf(i) === -1 && t.push(i),
          e)
    }
    function Tp(e, t, n, r, i) {
      switch (t) {
        case `focusin`:
          return ((gp = wp(gp, e, t, n, r, i)), !0)
        case `dragenter`:
          return ((_p = wp(_p, e, t, n, r, i)), !0)
        case `mouseover`:
          return ((vp = wp(vp, e, t, n, r, i)), !0)
        case `pointerover`:
          var a = i.pointerId
          return (yp.set(a, wp(yp.get(a) || null, e, t, n, r, i)), !0)
        case `gotpointercapture`:
          return ((a = i.pointerId), bp.set(a, wp(bp.get(a) || null, e, t, n, r, i)), !0)
      }
      return !1
    }
    function Ep(e) {
      var t = dt(e.target)
      if (t !== null) {
        var n = o(t)
        if (n !== null) {
          if (((t = n.tag), t === 13)) {
            if (((t = s(n)), t !== null)) {
              ;((e.blockedOn = t),
                tt(e.priority, function () {
                  op(n)
                }))
              return
            }
          } else if (t === 31) {
            if (((t = c(n)), t !== null)) {
              ;((e.blockedOn = t),
                tt(e.priority, function () {
                  op(n)
                }))
              return
            }
          } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
            e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null
            return
          }
        }
      }
      e.blockedOn = null
    }
    function Dp(e) {
      if (e.blockedOn !== null) return !1
      for (var t = e.targetContainers; 0 < t.length; ) {
        var n = dp(e.nativeEvent)
        if (n === null) {
          n = e.nativeEvent
          var r = new n.constructor(n.type, n)
          ;((Yt = r), n.target.dispatchEvent(r), (Yt = null))
        } else return ((t = ft(n)), t !== null && ap(t), (e.blockedOn = n), !1)
        t.shift()
      }
      return !0
    }
    function Op(e, t, n) {
      Dp(e) && n.delete(t)
    }
    function kp() {
      ;((hp = !1),
        gp !== null && Dp(gp) && (gp = null),
        _p !== null && Dp(_p) && (_p = null),
        vp !== null && Dp(vp) && (vp = null),
        yp.forEach(Op),
        bp.forEach(Op))
    }
    function Ap(e, n) {
      e.blockedOn === n &&
        ((e.blockedOn = null),
        hp || ((hp = !0), t.unstable_scheduleCallback(t.unstable_NormalPriority, kp)))
    }
    var jp = null
    function Mp(e) {
      jp !== e &&
        ((jp = e),
        t.unstable_scheduleCallback(t.unstable_NormalPriority, function () {
          jp === e && (jp = null)
          for (var t = 0; t < e.length; t += 3) {
            var n = e[t],
              r = e[t + 1],
              i = e[t + 2]
            if (typeof r != `function`) {
              if (pp(r || n) === null) continue
              break
            }
            var a = ft(n)
            a !== null &&
              (e.splice(t, 3),
              (t -= 3),
              _s(a, { pending: !0, data: i, method: n.method, action: r }, r, i))
          }
        }))
    }
    function Np(e) {
      function t(t) {
        return Ap(t, e)
      }
      ;(gp !== null && Ap(gp, e),
        _p !== null && Ap(_p, e),
        vp !== null && Ap(vp, e),
        yp.forEach(t),
        bp.forEach(t))
      for (var n = 0; n < xp.length; n++) {
        var r = xp[n]
        r.blockedOn === e && (r.blockedOn = null)
      }
      for (; 0 < xp.length && ((n = xp[0]), n.blockedOn === null); )
        (Ep(n), n.blockedOn === null && xp.shift())
      if (((n = (e.ownerDocument || e).$$reactFormReplay), n != null))
        for (r = 0; r < n.length; r += 3) {
          var i = n[r],
            a = n[r + 1],
            o = i[it] || null
          if (typeof a == `function`) o || Mp(n)
          else if (o) {
            var s = null
            if (a && a.hasAttribute(`formAction`)) {
              if (((i = a), (o = a[it] || null))) s = o.formAction
              else if (pp(i) !== null) continue
            } else s = o.action
            ;(typeof s == `function` ? (n[r + 1] = s) : (n.splice(r, 3), (r -= 3)), Mp(n))
          }
        }
    }
    function Pp() {
      function e(e) {
        e.canIntercept &&
          e.info === `react-transition` &&
          e.intercept({
            handler: function () {
              return new Promise(function (e) {
                return (i = e)
              })
            },
            focusReset: `manual`,
            scroll: `manual`
          })
      }
      function t() {
        ;(i !== null && (i(), (i = null)), r || setTimeout(n, 20))
      }
      function n() {
        if (!r && !navigation.transition) {
          var e = navigation.currentEntry
          e &&
            e.url != null &&
            navigation.navigate(e.url, {
              state: e.getState(),
              info: `react-transition`,
              history: `replace`
            })
        }
      }
      if (typeof navigation == `object`) {
        var r = !1,
          i = null
        return (
          navigation.addEventListener(`navigate`, e),
          navigation.addEventListener(`navigatesuccess`, t),
          navigation.addEventListener(`navigateerror`, t),
          setTimeout(n, 100),
          function () {
            ;((r = !0),
              navigation.removeEventListener(`navigate`, e),
              navigation.removeEventListener(`navigatesuccess`, t),
              navigation.removeEventListener(`navigateerror`, t),
              i !== null && (i(), (i = null)))
          }
        )
      }
    }
    function Fp(e) {
      this._internalRoot = e
    }
    ;((Ip.prototype.render = Fp.prototype.render =
      function (e) {
        var t = this._internalRoot
        if (t === null) throw Error(i(409))
        var n = t.current
        np(n, uu(), e, t, null, null)
      }),
      (Ip.prototype.unmount = Fp.prototype.unmount =
        function () {
          var e = this._internalRoot
          if (e !== null) {
            this._internalRoot = null
            var t = e.containerInfo
            ;(np(e.current, 2, null, e, null, null), _u(), (t[at] = null))
          }
        }))
    function Ip(e) {
      this._internalRoot = e
    }
    Ip.prototype.unstable_scheduleHydration = function (e) {
      if (e) {
        var t = et()
        e = { blockedOn: null, target: e, priority: t }
        for (var n = 0; n < xp.length && t !== 0 && t < xp[n].priority; n++);
        ;(xp.splice(n, 0, e), n === 0 && Ep(e))
      }
    }
    var Lp = n.version
    if (Lp !== `19.2.5`) throw Error(i(527, Lp, `19.2.5`))
    I.findDOMNode = function (e) {
      var t = e._reactInternals
      if (t === void 0)
        throw typeof e.render == `function`
          ? Error(i(188))
          : ((e = Object.keys(e).join(`,`)), Error(i(268, e)))
      return ((e = d(t)), (e = e === null ? null : p(e)), (e = e === null ? null : e.stateNode), e)
    }
    var Rp = {
      bundleType: 0,
      version: `19.2.5`,
      rendererPackageName: `react-dom`,
      currentDispatcherRef: F,
      reconcilerVersion: `19.2.5`
    }
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < `u`) {
      var zp = __REACT_DEVTOOLS_GLOBAL_HOOK__
      if (!zp.isDisabled && zp.supportsFiber)
        try {
          ;((Me = zp.inject(Rp)), (Ne = zp))
        } catch {}
    }
    e.createRoot = function (e, t) {
      if (!a(e)) throw Error(i(299))
      var n = !1,
        r = ``,
        o = zs,
        s = Bs,
        c = Vs
      return (
        t != null &&
          (!0 === t.unstable_strictMode && (n = !0),
          t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
          t.onUncaughtError !== void 0 && (o = t.onUncaughtError),
          t.onCaughtError !== void 0 && (s = t.onCaughtError),
          t.onRecoverableError !== void 0 && (c = t.onRecoverableError)),
        (t = ep(e, 1, !1, null, null, n, r, null, o, s, c, Pp)),
        (e[at] = t.current),
        xd(e),
        new Fp(t)
      )
    }
  }),
  g = o((e, t) => {
    function n() {
      if (
        !(
          typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > `u` ||
          typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != `function`
        )
      )
        try {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n)
        } catch (e) {
          console.error(e)
        }
    }
    ;(n(), (t.exports = h()))
  }),
  _ = (...e) =>
    e
      .filter((e, t, n) => !!e && e.trim() !== `` && n.indexOf(e) === t)
      .join(` `)
      .trim(),
  v = (e) => e.replace(/([a-z0-9])([A-Z])/g, `$1-$2`).toLowerCase(),
  y = (e) =>
    e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, n) => (n ? n.toUpperCase() : t.toLowerCase())),
  b = (e) => {
    let t = y(e)
    return t.charAt(0).toUpperCase() + t.slice(1)
  },
  x = {
    xmlns: `http://www.w3.org/2000/svg`,
    width: 24,
    height: 24,
    viewBox: `0 0 24 24`,
    fill: `none`,
    stroke: `currentColor`,
    strokeWidth: 2,
    strokeLinecap: `round`,
    strokeLinejoin: `round`
  },
  S = (e) => {
    for (let t in e) if (t.startsWith(`aria-`) || t === `role` || t === `title`) return !0
    return !1
  },
  C = c(f(), 1),
  w = (0, C.createContext)({}),
  T = () => (0, C.useContext)(w),
  E = (0, C.forwardRef)(
    (
      {
        color: e,
        size: t,
        strokeWidth: n,
        absoluteStrokeWidth: r,
        className: i = ``,
        children: a,
        iconNode: o,
        ...s
      },
      c
    ) => {
      let {
          size: l = 24,
          strokeWidth: u = 2,
          absoluteStrokeWidth: d = !1,
          color: f = `currentColor`,
          className: p = ``
        } = T() ?? {},
        m = (r ?? d) ? (Number(n ?? u) * 24) / Number(t ?? l) : (n ?? u)
      return (0, C.createElement)(
        `svg`,
        {
          ref: c,
          ...x,
          width: t ?? l ?? x.width,
          height: t ?? l ?? x.height,
          stroke: e ?? f,
          strokeWidth: m,
          className: _(`lucide`, p, i),
          ...(!a && !S(s) && { 'aria-hidden': `true` }),
          ...s
        },
        [...o.map(([e, t]) => (0, C.createElement)(e, t)), ...(Array.isArray(a) ? a : [a])]
      )
    }
  ),
  D = (e, t) => {
    let n = (0, C.forwardRef)(({ className: n, ...r }, i) =>
      (0, C.createElement)(E, {
        ref: i,
        iconNode: t,
        className: _(`lucide-${v(b(e))}`, `lucide-${e}`, n),
        ...r
      })
    )
    return ((n.displayName = b(e)), n)
  },
  O = D(`message-square`, [
    [
      `path`,
      {
        d: `M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z`,
        key: `18887p`
      }
    ]
  ]),
  k = D(`pen-line`, [
    [`path`, { d: `M13 21h8`, key: `1jsn5i` }],
    [
      `path`,
      {
        d: `M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z`,
        key: `1a8usu`
      }
    ]
  ]),
  A = D(`settings`, [
    [
      `path`,
      {
        d: `M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915`,
        key: `1i5ecw`
      }
    ],
    [`circle`, { cx: `12`, cy: `12`, r: `3`, key: `1v7zrd` }]
  ]),
  j = D(`x`, [
    [`path`, { d: `M18 6 6 18`, key: `1bl5f8` }],
    [`path`, { d: `m6 6 12 12`, key: `d8bk6v` }]
  ])
function M(e, t) {
  if (e && !t) return e
  if (!e && t) return t
  if (e || t) return { ...e, ...t }
}
var N = {}
function ee(e, t, n, r, i) {
  if (!n && !r && !i && !e) return F(t)
  let a = F(e)
  return (t && (a = I(a, t)), n && (a = I(a, n)), r && (a = I(a, r)), i && (a = I(a, i)), a)
}
function P(e) {
  if (e.length === 0) return N
  if (e.length === 1) return F(e[0])
  let t = F(e[0])
  for (let n = 1; n < e.length; n += 1) t = I(t, e[n])
  return t
}
function F(e) {
  return L(e) ? { ...R(e, N) } : te(e)
}
function I(e, t) {
  return L(t) ? R(t, e) : ne(e, t)
}
function te(e) {
  let t = { ...e }
  for (let e in t) {
    let n = t[e]
    re(e, n) && (t[e] = ie(n))
  }
  return t
}
function ne(e, t) {
  if (!t) return e
  for (let n in t) {
    let r = t[n]
    switch (n) {
      case `style`:
        e[n] = M(e.style, r)
        break
      case `className`:
        e[n] = ae(e.className, r)
        break
      default:
        re(n, r) ? (e[n] = z(e[n], r)) : (e[n] = r)
    }
  }
  return e
}
function re(e, t) {
  let n = e.charCodeAt(0),
    r = e.charCodeAt(1),
    i = e.charCodeAt(2)
  return n === 111 && r === 110 && i >= 65 && i <= 90 && (typeof t == `function` || t === void 0)
}
function L(e) {
  return typeof e == `function`
}
function R(e, t) {
  return L(e) ? e(t) : (e ?? N)
}
function z(e, t) {
  return t
    ? e
      ? (...n) => {
          let r = n[0]
          if (oe(r)) {
            let i = r
            B(i)
            let a = t(...n)
            return (i.baseUIHandlerPrevented || e?.(...n), a)
          }
          let i = t(...n)
          return (e?.(...n), i)
        }
      : ie(t)
    : e
}
function ie(e) {
  return (
    e &&
    ((...t) => {
      let n = t[0]
      return (oe(n) && B(n), e(...t))
    })
  )
}
function B(e) {
  return (
    (e.preventBaseUIHandler = () => {
      e.baseUIHandlerPrevented = !0
    }),
    e
  )
}
function ae(e, t) {
  return t ? (e ? t + ` ` + e : t) : e
}
function oe(e) {
  return typeof e == `object` && !!e && `nativeEvent` in e
}
function se(e, t) {
  return function (n, ...r) {
    let i = new URL(e)
    return (
      i.searchParams.set(`code`, n.toString()),
      r.forEach((e) => i.searchParams.append(`args[]`, e)),
      `${t} error #${n}; visit ${i} for the full message.`
    )
  }
}
var ce = se(`https://base-ui.com/production-error`, `Base UI`),
  le = {}
function ue(e, t) {
  let n = C.useRef(le)
  return (n.current === le && (n.current = e(t)), n)
}
function de(e, t, n, r) {
  let i = ue(pe).current
  return (me(i, e, t, n, r) && ge(i, [e, t, n, r]), i.callback)
}
function fe(e) {
  let t = ue(pe).current
  return (he(t, e) && ge(t, e), t.callback)
}
function pe() {
  return { callback: null, cleanup: null, refs: [] }
}
function me(e, t, n, r, i) {
  return e.refs[0] !== t || e.refs[1] !== n || e.refs[2] !== r || e.refs[3] !== i
}
function he(e, t) {
  return e.refs.length !== t.length || e.refs.some((e, n) => e !== t[n])
}
function ge(e, t) {
  if (((e.refs = t), t.every((e) => e == null))) {
    e.callback = null
    return
  }
  e.callback = (n) => {
    if (((e.cleanup &&= (e.cleanup(), null)), n != null)) {
      let r = Array(t.length).fill(null)
      for (let e = 0; e < t.length; e += 1) {
        let i = t[e]
        if (i != null)
          switch (typeof i) {
            case `function`: {
              let t = i(n)
              typeof t == `function` && (r[e] = t)
              break
            }
            case `object`:
              i.current = n
              break
            default:
          }
      }
      e.cleanup = () => {
        for (let e = 0; e < t.length; e += 1) {
          let n = t[e]
          if (n != null)
            switch (typeof n) {
              case `function`: {
                let t = r[e]
                typeof t == `function` ? t() : n(null)
                break
              }
              case `object`:
                n.current = null
                break
              default:
            }
        }
      }
    }
  }
}
var _e = 19
function ve(e) {
  return _e >= e
}
function ye(e) {
  if (!C.isValidElement(e)) return null
  let t = e,
    n = t.props
  return (ve(19) ? n?.ref : t.ref) ?? null
}
function be() {}
Object.freeze([])
var xe = Object.freeze({})
function Se(e, t) {
  let n = {}
  for (let r in e) {
    let i = e[r]
    if (t?.hasOwnProperty(r)) {
      let e = t[r](i)
      e != null && Object.assign(n, e)
      continue
    }
    i === !0
      ? (n[`data-${r.toLowerCase()}`] = ``)
      : i && (n[`data-${r.toLowerCase()}`] = i.toString())
  }
  return n
}
function Ce(e, t) {
  return typeof e == `function` ? e(t) : e
}
function we(e, t) {
  return typeof e == `function` ? e(t) : e
}
function Te(e, t, n = {}) {
  let r = t.render,
    i = Ee(t, n)
  return n.enabled === !1 ? null : ke(e, r, i, n.state ?? xe)
}
function Ee(e, t = {}) {
  let { className: n, style: r, render: i } = e,
    { state: a = xe, ref: o, props: s, stateAttributesMapping: c, enabled: l = !0 } = t,
    u = l ? Ce(n, a) : void 0,
    d = l ? we(r, a) : void 0,
    f = l ? Se(a, c) : xe,
    p = l && s ? De(s) : void 0,
    m = l ? (M(f, p) ?? {}) : xe
  return (
    typeof document < `u` &&
      (l
        ? Array.isArray(o)
          ? (m.ref = fe([m.ref, ye(i), ...o]))
          : (m.ref = de(m.ref, ye(i), o))
        : de(null, null)),
    l
      ? (u !== void 0 && (m.className = ae(m.className, u)),
        d !== void 0 && (m.style = M(m.style, d)),
        m)
      : xe
  )
}
function De(e) {
  return Array.isArray(e) ? P(e) : ee(void 0, e)
}
var Oe = Symbol.for(`react.lazy`)
function ke(e, t, n, r) {
  if (t) {
    if (typeof t == `function`) return t(n, r)
    let e = ee(n, t.props)
    e.ref = n.ref
    let i = t
    return (i?.$$typeof === Oe && (i = C.Children.toArray(t)[0]), C.cloneElement(i, e))
  }
  if (e && typeof e == `string`) return Ae(e, n)
  throw Error(ce(8))
}
function Ae(e, t) {
  return e === `button`
    ? (0, C.createElement)(`button`, { type: `button`, ...t, key: t.key })
    : e === `img`
      ? (0, C.createElement)(`img`, { alt: ``, ...t, key: t.key })
      : C.createElement(e, t)
}
function je(e) {
  return Te(e.defaultTagName ?? `div`, e, e)
}
var Me = g()
function Ne(e) {
  var t,
    n,
    r = ``
  if (typeof e == `string` || typeof e == `number`) r += e
  else if (typeof e == `object`)
    if (Array.isArray(e)) {
      var i = e.length
      for (t = 0; t < i; t++) e[t] && (n = Ne(e[t])) && (r && (r += ` `), (r += n))
    } else for (n in e) e[n] && (r && (r += ` `), (r += n))
  return r
}
function Pe() {
  for (var e, t, n = 0, r = ``, i = arguments.length; n < i; n++)
    (e = arguments[n]) && (t = Ne(e)) && (r && (r += ` `), (r += t))
  return r
}
var Fe = (e) => (typeof e == `boolean` ? `${e}` : e === 0 ? `0` : e),
  Ie = Pe,
  Le = (e, t) => (n) => {
    if (t?.variants == null) return Ie(e, n?.class, n?.className)
    let { variants: r, defaultVariants: i } = t,
      a = Object.keys(r).map((e) => {
        let t = n?.[e],
          a = i?.[e]
        if (t === null) return null
        let o = Fe(t) || Fe(a)
        return r[e][o]
      }),
      o =
        n &&
        Object.entries(n).reduce((e, t) => {
          let [n, r] = t
          return (r === void 0 || (e[n] = r), e)
        }, {})
    return Ie(
      e,
      a,
      t?.compoundVariants?.reduce((e, t) => {
        let { class: n, className: r, ...a } = t
        return Object.entries(a).every((e) => {
          let [t, n] = e
          return Array.isArray(n) ? n.includes({ ...i, ...o }[t]) : { ...i, ...o }[t] === n
        })
          ? [...e, n, r]
          : e
      }, []),
      n?.class,
      n?.className
    )
  }
function Re() {
  return typeof window < `u`
}
function ze(e) {
  return He(e) ? (e.nodeName || ``).toLowerCase() : `#document`
}
function Be(e) {
  var t
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window
}
function Ve(e) {
  return ((He(e) ? e.ownerDocument : e.document) || window.document)?.documentElement
}
function He(e) {
  return Re() ? e instanceof Node || e instanceof Be(e).Node : !1
}
function V(e) {
  return Re() ? e instanceof Element || e instanceof Be(e).Element : !1
}
function Ue(e) {
  return Re() ? e instanceof HTMLElement || e instanceof Be(e).HTMLElement : !1
}
function We(e) {
  return !Re() || typeof ShadowRoot > `u`
    ? !1
    : e instanceof ShadowRoot || e instanceof Be(e).ShadowRoot
}
function Ge(e) {
  let { overflow: t, overflowX: n, overflowY: r, display: i } = nt(e)
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== `inline` && i !== `contents`
}
function Ke(e) {
  return /^(table|td|th)$/.test(ze(e))
}
function qe(e) {
  try {
    if (e.matches(`:popover-open`)) return !0
  } catch {}
  try {
    return e.matches(`:modal`)
  } catch {
    return !1
  }
}
var Je = /transform|translate|scale|rotate|perspective|filter/,
  Ye = /paint|layout|strict|content/,
  Xe = (e) => !!e && e !== `none`,
  Ze
function Qe(e) {
  let t = V(e) ? nt(e) : e
  return (
    Xe(t.transform) ||
    Xe(t.translate) ||
    Xe(t.scale) ||
    Xe(t.rotate) ||
    Xe(t.perspective) ||
    (!et() && (Xe(t.backdropFilter) || Xe(t.filter))) ||
    Je.test(t.willChange || ``) ||
    Ye.test(t.contain || ``)
  )
}
function $e(e) {
  let t = it(e)
  for (; Ue(t) && !tt(t); ) {
    if (Qe(t)) return t
    if (qe(t)) return null
    t = it(t)
  }
  return null
}
function et() {
  return (
    (Ze ??= typeof CSS < `u` && CSS.supports && CSS.supports(`-webkit-backdrop-filter`, `none`)), Ze
  )
}
function tt(e) {
  return /^(html|body|#document)$/.test(ze(e))
}
function nt(e) {
  return Be(e).getComputedStyle(e)
}
function rt(e) {
  return V(e)
    ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
    : { scrollLeft: e.scrollX, scrollTop: e.scrollY }
}
function it(e) {
  if (ze(e) === `html`) return e
  let t = e.assignedSlot || e.parentNode || (We(e) && e.host) || Ve(e)
  return We(t) ? t.host : t
}
function at(e) {
  let t = it(e)
  return tt(t) ? (e.ownerDocument ? e.ownerDocument.body : e.body) : Ue(t) && Ge(t) ? t : at(t)
}
function ot(e, t, n) {
  ;(t === void 0 && (t = []), n === void 0 && (n = !0))
  let r = at(e),
    i = r === e.ownerDocument?.body,
    a = Be(r)
  if (i) {
    let e = st(a)
    return t.concat(a, a.visualViewport || [], Ge(r) ? r : [], e && n ? ot(e) : [])
  } else return t.concat(r, ot(r, [], n))
}
function st(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null
}
var ct = C[`useInsertionEffect${Math.random().toFixed(1)}`.slice(0, -3)],
  lt = ct && ct !== C.useLayoutEffect ? ct : (e) => e()
function H(e) {
  let t = ue(ut).current
  return ((t.next = e), lt(t.effect), t.trampoline)
}
function ut() {
  let e = {
    next: void 0,
    callback: dt,
    trampoline: (...t) => e.callback?.(...t),
    effect: () => {
      e.callback = e.next
    }
  }
  return e
}
function dt() {}
var ft = { ...C },
  U = typeof document < `u` ? C.useLayoutEffect : () => {},
  pt = C.createContext(void 0)
function mt(e = !1) {
  let t = C.useContext(pt)
  if (t === void 0 && !e) throw Error(ce(16))
  return t
}
function ht(e) {
  let {
      focusableWhenDisabled: t,
      disabled: n,
      composite: r = !1,
      tabIndex: i = 0,
      isNativeButton: a
    } = e,
    o = r && t !== !1,
    s = r && t === !1
  return {
    props: C.useMemo(() => {
      let e = {
        onKeyDown(e) {
          n && t && e.key !== `Tab` && e.preventDefault()
        }
      }
      return (
        r || ((e.tabIndex = i), !a && n && (e.tabIndex = t ? i : -1)),
        ((a && (t || o)) || (!a && n)) && (e[`aria-disabled`] = n),
        a && (!t || s) && (e.disabled = n),
        e
      )
    }, [r, n, t, o, s, a, i])
  }
}
function gt(e = {}) {
  let {
      disabled: t = !1,
      focusableWhenDisabled: n,
      tabIndex: r = 0,
      native: i = !0,
      composite: a
    } = e,
    o = C.useRef(null),
    s = mt(!0),
    c = a ?? s !== void 0,
    { props: l } = ht({
      focusableWhenDisabled: n,
      disabled: t,
      composite: c,
      tabIndex: r,
      isNativeButton: i
    }),
    u = C.useCallback(() => {
      let e = o.current
      _t(e) && c && t && l.disabled === void 0 && e.disabled && (e.disabled = !1)
    }, [t, l.disabled, c])
  return (
    U(u, [u]),
    {
      getButtonProps: C.useCallback(
        (e = {}) => {
          let { onClick: n, onMouseDown: r, onKeyUp: a, onKeyDown: o, onPointerDown: s, ...u } = e
          return ee(
            {
              type: i ? `button` : void 0,
              onClick(e) {
                if (t) {
                  e.preventDefault()
                  return
                }
                n?.(e)
              },
              onMouseDown(e) {
                t || r?.(e)
              },
              onKeyDown(e) {
                if (t || (B(e), o?.(e), e.baseUIHandlerPrevented)) return
                let r = e.target === e.currentTarget,
                  a = e.currentTarget,
                  s = _t(a),
                  l = !i && vt(a),
                  u = r && (i ? s : !l),
                  d = e.key === `Enter`,
                  f = e.key === ` `,
                  p = a.getAttribute(`role`),
                  m = p?.startsWith(`menuitem`) || p === `option` || p === `gridcell`
                if (r && c && f) {
                  if (e.defaultPrevented && m) return
                  ;(e.preventDefault(),
                    l || (i && s)
                      ? (a.click(), e.preventBaseUIHandler())
                      : u && (n?.(e), e.preventBaseUIHandler()))
                  return
                }
                u && (!i && (f || d) && e.preventDefault(), !i && d && n?.(e))
              },
              onKeyUp(e) {
                if (!t) {
                  if (
                    (B(e),
                    a?.(e),
                    e.target === e.currentTarget && i && c && _t(e.currentTarget) && e.key === ` `)
                  ) {
                    e.preventDefault()
                    return
                  }
                  e.baseUIHandlerPrevented ||
                    (e.target === e.currentTarget && !i && !c && e.key === ` ` && n?.(e))
                }
              },
              onPointerDown(e) {
                if (t) {
                  e.preventDefault()
                  return
                }
                s?.(e)
              }
            },
            i ? void 0 : { role: `button` },
            l,
            u
          )
        },
        [t, l, c, i]
      ),
      buttonRef: H((e) => {
        ;((o.current = e), u())
      })
    }
  )
}
function _t(e) {
  return Ue(e) && e.tagName === `BUTTON`
}
function vt(e) {
  return !!(e?.tagName === `A` && e?.href)
}
var yt = C.forwardRef(function (e, t) {
    let {
        render: n,
        className: r,
        disabled: i = !1,
        focusableWhenDisabled: a = !1,
        nativeButton: o = !0,
        style: s,
        ...c
      } = e,
      { getButtonProps: l, buttonRef: u } = gt({ disabled: i, focusableWhenDisabled: a, native: o })
    return Te(`button`, e, { state: { disabled: i }, ref: [t, u], props: [c, l] })
  }),
  bt = (e, t) => {
    let n = Array(e.length + t.length)
    for (let t = 0; t < e.length; t++) n[t] = e[t]
    for (let r = 0; r < t.length; r++) n[e.length + r] = t[r]
    return n
  },
  xt = (e, t) => ({ classGroupId: e, validator: t }),
  St = (e = new Map(), t = null, n) => ({ nextPart: e, validators: t, classGroupId: n }),
  Ct = `-`,
  wt = [],
  Tt = `arbitrary..`,
  Et = (e) => {
    let t = kt(e),
      { conflictingClassGroups: n, conflictingClassGroupModifiers: r } = e
    return {
      getClassGroupId: (e) => {
        if (e.startsWith(`[`) && e.endsWith(`]`)) return Ot(e)
        let n = e.split(Ct)
        return Dt(n, +(n[0] === `` && n.length > 1), t)
      },
      getConflictingClassGroupIds: (e, t) => {
        if (t) {
          let t = r[e],
            i = n[e]
          return t ? (i ? bt(i, t) : t) : i || wt
        }
        return n[e] || wt
      }
    }
  },
  Dt = (e, t, n) => {
    if (e.length - t === 0) return n.classGroupId
    let r = e[t],
      i = n.nextPart.get(r)
    if (i) {
      let n = Dt(e, t + 1, i)
      if (n) return n
    }
    let a = n.validators
    if (a === null) return
    let o = t === 0 ? e.join(Ct) : e.slice(t).join(Ct),
      s = a.length
    for (let e = 0; e < s; e++) {
      let t = a[e]
      if (t.validator(o)) return t.classGroupId
    }
  },
  Ot = (e) =>
    e.slice(1, -1).indexOf(`:`) === -1
      ? void 0
      : (() => {
          let t = e.slice(1, -1),
            n = t.indexOf(`:`),
            r = t.slice(0, n)
          return r ? Tt + r : void 0
        })(),
  kt = (e) => {
    let { theme: t, classGroups: n } = e
    return At(n, t)
  },
  At = (e, t) => {
    let n = St()
    for (let r in e) {
      let i = e[r]
      jt(i, n, r, t)
    }
    return n
  },
  jt = (e, t, n, r) => {
    let i = e.length
    for (let a = 0; a < i; a++) {
      let i = e[a]
      Mt(i, t, n, r)
    }
  },
  Mt = (e, t, n, r) => {
    if (typeof e == `string`) {
      Nt(e, t, n)
      return
    }
    if (typeof e == `function`) {
      Pt(e, t, n, r)
      return
    }
    Ft(e, t, n, r)
  },
  Nt = (e, t, n) => {
    let r = e === `` ? t : It(t, e)
    r.classGroupId = n
  },
  Pt = (e, t, n, r) => {
    if (Lt(e)) {
      jt(e(r), t, n, r)
      return
    }
    ;(t.validators === null && (t.validators = []), t.validators.push(xt(n, e)))
  },
  Ft = (e, t, n, r) => {
    let i = Object.entries(e),
      a = i.length
    for (let e = 0; e < a; e++) {
      let [a, o] = i[e]
      jt(o, It(t, a), n, r)
    }
  },
  It = (e, t) => {
    let n = e,
      r = t.split(Ct),
      i = r.length
    for (let e = 0; e < i; e++) {
      let t = r[e],
        i = n.nextPart.get(t)
      ;(i || ((i = St()), n.nextPart.set(t, i)), (n = i))
    }
    return n
  },
  Lt = (e) => `isThemeGetter` in e && e.isThemeGetter === !0,
  Rt = (e) => {
    if (e < 1) return { get: () => void 0, set: () => {} }
    let t = 0,
      n = Object.create(null),
      r = Object.create(null),
      i = (i, a) => {
        ;((n[i] = a), t++, t > e && ((t = 0), (r = n), (n = Object.create(null))))
      }
    return {
      get(e) {
        let t = n[e]
        if (t !== void 0) return t
        if ((t = r[e]) !== void 0) return (i(e, t), t)
      },
      set(e, t) {
        e in n ? (n[e] = t) : i(e, t)
      }
    }
  },
  zt = `!`,
  Bt = `:`,
  Vt = [],
  Ht = (e, t, n, r, i) => ({
    modifiers: e,
    hasImportantModifier: t,
    baseClassName: n,
    maybePostfixModifierPosition: r,
    isExternal: i
  }),
  Ut = (e) => {
    let { prefix: t, experimentalParseClassName: n } = e,
      r = (e) => {
        let t = [],
          n = 0,
          r = 0,
          i = 0,
          a,
          o = e.length
        for (let s = 0; s < o; s++) {
          let o = e[s]
          if (n === 0 && r === 0) {
            if (o === Bt) {
              ;(t.push(e.slice(i, s)), (i = s + 1))
              continue
            }
            if (o === `/`) {
              a = s
              continue
            }
          }
          o === `[` ? n++ : o === `]` ? n-- : o === `(` ? r++ : o === `)` && r--
        }
        let s = t.length === 0 ? e : e.slice(i),
          c = s,
          l = !1
        s.endsWith(zt)
          ? ((c = s.slice(0, -1)), (l = !0))
          : s.startsWith(zt) && ((c = s.slice(1)), (l = !0))
        let u = a && a > i ? a - i : void 0
        return Ht(t, l, c, u)
      }
    if (t) {
      let e = t + Bt,
        n = r
      r = (t) => (t.startsWith(e) ? n(t.slice(e.length)) : Ht(Vt, !1, t, void 0, !0))
    }
    if (n) {
      let e = r
      r = (t) => n({ className: t, parseClassName: e })
    }
    return r
  },
  Wt = (e) => {
    let t = new Map()
    return (
      e.orderSensitiveModifiers.forEach((e, n) => {
        t.set(e, 1e6 + n)
      }),
      (e) => {
        let n = [],
          r = []
        for (let i = 0; i < e.length; i++) {
          let a = e[i],
            o = a[0] === `[`,
            s = t.has(a)
          o || s ? (r.length > 0 && (r.sort(), n.push(...r), (r = [])), n.push(a)) : r.push(a)
        }
        return (r.length > 0 && (r.sort(), n.push(...r)), n)
      }
    )
  },
  Gt = (e) => ({ cache: Rt(e.cacheSize), parseClassName: Ut(e), sortModifiers: Wt(e), ...Et(e) }),
  Kt = /\s+/,
  qt = (e, t) => {
    let {
        parseClassName: n,
        getClassGroupId: r,
        getConflictingClassGroupIds: i,
        sortModifiers: a
      } = t,
      o = [],
      s = e.trim().split(Kt),
      c = ``
    for (let e = s.length - 1; e >= 0; --e) {
      let t = s[e],
        {
          isExternal: l,
          modifiers: u,
          hasImportantModifier: d,
          baseClassName: f,
          maybePostfixModifierPosition: p
        } = n(t)
      if (l) {
        c = t + (c.length > 0 ? ` ` + c : c)
        continue
      }
      let m = !!p,
        h = r(m ? f.substring(0, p) : f)
      if (!h) {
        if (!m) {
          c = t + (c.length > 0 ? ` ` + c : c)
          continue
        }
        if (((h = r(f)), !h)) {
          c = t + (c.length > 0 ? ` ` + c : c)
          continue
        }
        m = !1
      }
      let g = u.length === 0 ? `` : u.length === 1 ? u[0] : a(u).join(`:`),
        _ = d ? g + zt : g,
        v = _ + h
      if (o.indexOf(v) > -1) continue
      o.push(v)
      let y = i(h, m)
      for (let e = 0; e < y.length; ++e) {
        let t = y[e]
        o.push(_ + t)
      }
      c = t + (c.length > 0 ? ` ` + c : c)
    }
    return c
  },
  Jt = (...e) => {
    let t = 0,
      n,
      r,
      i = ``
    for (; t < e.length; ) (n = e[t++]) && (r = Yt(n)) && (i && (i += ` `), (i += r))
    return i
  },
  Yt = (e) => {
    if (typeof e == `string`) return e
    let t,
      n = ``
    for (let r = 0; r < e.length; r++) e[r] && (t = Yt(e[r])) && (n && (n += ` `), (n += t))
    return n
  },
  Xt = (e, ...t) => {
    let n,
      r,
      i,
      a,
      o = (o) => (
        (n = Gt(t.reduce((e, t) => t(e), e()))), (r = n.cache.get), (i = n.cache.set), (a = s), s(o)
      ),
      s = (e) => {
        let t = r(e)
        if (t) return t
        let a = qt(e, n)
        return (i(e, a), a)
      }
    return ((a = o), (...e) => a(Jt(...e)))
  },
  Zt = [],
  Qt = (e) => {
    let t = (t) => t[e] || Zt
    return ((t.isThemeGetter = !0), t)
  },
  $t = /^\[(?:(\w[\w-]*):)?(.+)\]$/i,
  en = /^\((?:(\w[\w-]*):)?(.+)\)$/i,
  tn = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
  nn = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  rn =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  an = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
  on = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  sn =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  cn = (e) => tn.test(e),
  W = (e) => !!e && !Number.isNaN(Number(e)),
  ln = (e) => !!e && Number.isInteger(Number(e)),
  un = (e) => e.endsWith(`%`) && W(e.slice(0, -1)),
  dn = (e) => nn.test(e),
  fn = () => !0,
  pn = (e) => rn.test(e) && !an.test(e),
  mn = () => !1,
  hn = (e) => on.test(e),
  gn = (e) => sn.test(e),
  _n = (e) => !G(e) && !K(e),
  vn = (e) => Nn(e, Ln, mn),
  G = (e) => $t.test(e),
  yn = (e) => Nn(e, Rn, pn),
  bn = (e) => Nn(e, zn, W),
  xn = (e) => Nn(e, Vn, fn),
  Sn = (e) => Nn(e, Bn, mn),
  Cn = (e) => Nn(e, Fn, mn),
  wn = (e) => Nn(e, In, gn),
  Tn = (e) => Nn(e, Hn, hn),
  K = (e) => en.test(e),
  En = (e) => Pn(e, Rn),
  Dn = (e) => Pn(e, Bn),
  On = (e) => Pn(e, Fn),
  kn = (e) => Pn(e, Ln),
  An = (e) => Pn(e, In),
  jn = (e) => Pn(e, Hn, !0),
  Mn = (e) => Pn(e, Vn, !0),
  Nn = (e, t, n) => {
    let r = $t.exec(e)
    return r ? (r[1] ? t(r[1]) : n(r[2])) : !1
  },
  Pn = (e, t, n = !1) => {
    let r = en.exec(e)
    return r ? (r[1] ? t(r[1]) : n) : !1
  },
  Fn = (e) => e === `position` || e === `percentage`,
  In = (e) => e === `image` || e === `url`,
  Ln = (e) => e === `length` || e === `size` || e === `bg-size`,
  Rn = (e) => e === `length`,
  zn = (e) => e === `number`,
  Bn = (e) => e === `family-name`,
  Vn = (e) => e === `number` || e === `weight`,
  Hn = (e) => e === `shadow`,
  Un = Xt(() => {
    let e = Qt(`color`),
      t = Qt(`font`),
      n = Qt(`text`),
      r = Qt(`font-weight`),
      i = Qt(`tracking`),
      a = Qt(`leading`),
      o = Qt(`breakpoint`),
      s = Qt(`container`),
      c = Qt(`spacing`),
      l = Qt(`radius`),
      u = Qt(`shadow`),
      d = Qt(`inset-shadow`),
      f = Qt(`text-shadow`),
      p = Qt(`drop-shadow`),
      m = Qt(`blur`),
      h = Qt(`perspective`),
      g = Qt(`aspect`),
      _ = Qt(`ease`),
      v = Qt(`animate`),
      y = () => [`auto`, `avoid`, `all`, `avoid-page`, `page`, `left`, `right`, `column`],
      b = () => [
        `center`,
        `top`,
        `bottom`,
        `left`,
        `right`,
        `top-left`,
        `left-top`,
        `top-right`,
        `right-top`,
        `bottom-right`,
        `right-bottom`,
        `bottom-left`,
        `left-bottom`
      ],
      x = () => [...b(), K, G],
      S = () => [`auto`, `hidden`, `clip`, `visible`, `scroll`],
      C = () => [`auto`, `contain`, `none`],
      w = () => [K, G, c],
      T = () => [cn, `full`, `auto`, ...w()],
      E = () => [ln, `none`, `subgrid`, K, G],
      D = () => [`auto`, { span: [`full`, ln, K, G] }, ln, K, G],
      O = () => [ln, `auto`, K, G],
      k = () => [`auto`, `min`, `max`, `fr`, K, G],
      A = () => [
        `start`,
        `end`,
        `center`,
        `between`,
        `around`,
        `evenly`,
        `stretch`,
        `baseline`,
        `center-safe`,
        `end-safe`
      ],
      j = () => [`start`, `end`, `center`, `stretch`, `center-safe`, `end-safe`],
      M = () => [`auto`, ...w()],
      N = () => [
        cn,
        `auto`,
        `full`,
        `dvw`,
        `dvh`,
        `lvw`,
        `lvh`,
        `svw`,
        `svh`,
        `min`,
        `max`,
        `fit`,
        ...w()
      ],
      ee = () => [cn, `screen`, `full`, `dvw`, `lvw`, `svw`, `min`, `max`, `fit`, ...w()],
      P = () => [cn, `screen`, `full`, `lh`, `dvh`, `lvh`, `svh`, `min`, `max`, `fit`, ...w()],
      F = () => [e, K, G],
      I = () => [...b(), On, Cn, { position: [K, G] }],
      te = () => [`no-repeat`, { repeat: [``, `x`, `y`, `space`, `round`] }],
      ne = () => [`auto`, `cover`, `contain`, kn, vn, { size: [K, G] }],
      re = () => [un, En, yn],
      L = () => [``, `none`, `full`, l, K, G],
      R = () => [``, W, En, yn],
      z = () => [`solid`, `dashed`, `dotted`, `double`],
      ie = () => [
        `normal`,
        `multiply`,
        `screen`,
        `overlay`,
        `darken`,
        `lighten`,
        `color-dodge`,
        `color-burn`,
        `hard-light`,
        `soft-light`,
        `difference`,
        `exclusion`,
        `hue`,
        `saturation`,
        `color`,
        `luminosity`
      ],
      B = () => [W, un, On, Cn],
      ae = () => [``, `none`, m, K, G],
      oe = () => [`none`, W, K, G],
      se = () => [`none`, W, K, G],
      ce = () => [W, K, G],
      le = () => [cn, `full`, ...w()]
    return {
      cacheSize: 500,
      theme: {
        animate: [`spin`, `ping`, `pulse`, `bounce`],
        aspect: [`video`],
        blur: [dn],
        breakpoint: [dn],
        color: [fn],
        container: [dn],
        'drop-shadow': [dn],
        ease: [`in`, `out`, `in-out`],
        font: [_n],
        'font-weight': [
          `thin`,
          `extralight`,
          `light`,
          `normal`,
          `medium`,
          `semibold`,
          `bold`,
          `extrabold`,
          `black`
        ],
        'inset-shadow': [dn],
        leading: [`none`, `tight`, `snug`, `normal`, `relaxed`, `loose`],
        perspective: [`dramatic`, `near`, `normal`, `midrange`, `distant`, `none`],
        radius: [dn],
        shadow: [dn],
        spacing: [`px`, W],
        text: [dn],
        'text-shadow': [dn],
        tracking: [`tighter`, `tight`, `normal`, `wide`, `wider`, `widest`]
      },
      classGroups: {
        aspect: [{ aspect: [`auto`, `square`, cn, G, K, g] }],
        container: [`container`],
        columns: [{ columns: [W, G, K, s] }],
        'break-after': [{ 'break-after': y() }],
        'break-before': [{ 'break-before': y() }],
        'break-inside': [{ 'break-inside': [`auto`, `avoid`, `avoid-page`, `avoid-column`] }],
        'box-decoration': [{ 'box-decoration': [`slice`, `clone`] }],
        box: [{ box: [`border`, `content`] }],
        display: [
          `block`,
          `inline-block`,
          `inline`,
          `flex`,
          `inline-flex`,
          `table`,
          `inline-table`,
          `table-caption`,
          `table-cell`,
          `table-column`,
          `table-column-group`,
          `table-footer-group`,
          `table-header-group`,
          `table-row-group`,
          `table-row`,
          `flow-root`,
          `grid`,
          `inline-grid`,
          `contents`,
          `list-item`,
          `hidden`
        ],
        sr: [`sr-only`, `not-sr-only`],
        float: [{ float: [`right`, `left`, `none`, `start`, `end`] }],
        clear: [{ clear: [`left`, `right`, `both`, `none`, `start`, `end`] }],
        isolation: [`isolate`, `isolation-auto`],
        'object-fit': [{ object: [`contain`, `cover`, `fill`, `none`, `scale-down`] }],
        'object-position': [{ object: x() }],
        overflow: [{ overflow: S() }],
        'overflow-x': [{ 'overflow-x': S() }],
        'overflow-y': [{ 'overflow-y': S() }],
        overscroll: [{ overscroll: C() }],
        'overscroll-x': [{ 'overscroll-x': C() }],
        'overscroll-y': [{ 'overscroll-y': C() }],
        position: [`static`, `fixed`, `absolute`, `relative`, `sticky`],
        inset: [{ inset: T() }],
        'inset-x': [{ 'inset-x': T() }],
        'inset-y': [{ 'inset-y': T() }],
        start: [{ 'inset-s': T(), start: T() }],
        end: [{ 'inset-e': T(), end: T() }],
        'inset-bs': [{ 'inset-bs': T() }],
        'inset-be': [{ 'inset-be': T() }],
        top: [{ top: T() }],
        right: [{ right: T() }],
        bottom: [{ bottom: T() }],
        left: [{ left: T() }],
        visibility: [`visible`, `invisible`, `collapse`],
        z: [{ z: [ln, `auto`, K, G] }],
        basis: [{ basis: [cn, `full`, `auto`, s, ...w()] }],
        'flex-direction': [{ flex: [`row`, `row-reverse`, `col`, `col-reverse`] }],
        'flex-wrap': [{ flex: [`nowrap`, `wrap`, `wrap-reverse`] }],
        flex: [{ flex: [W, cn, `auto`, `initial`, `none`, G] }],
        grow: [{ grow: [``, W, K, G] }],
        shrink: [{ shrink: [``, W, K, G] }],
        order: [{ order: [ln, `first`, `last`, `none`, K, G] }],
        'grid-cols': [{ 'grid-cols': E() }],
        'col-start-end': [{ col: D() }],
        'col-start': [{ 'col-start': O() }],
        'col-end': [{ 'col-end': O() }],
        'grid-rows': [{ 'grid-rows': E() }],
        'row-start-end': [{ row: D() }],
        'row-start': [{ 'row-start': O() }],
        'row-end': [{ 'row-end': O() }],
        'grid-flow': [{ 'grid-flow': [`row`, `col`, `dense`, `row-dense`, `col-dense`] }],
        'auto-cols': [{ 'auto-cols': k() }],
        'auto-rows': [{ 'auto-rows': k() }],
        gap: [{ gap: w() }],
        'gap-x': [{ 'gap-x': w() }],
        'gap-y': [{ 'gap-y': w() }],
        'justify-content': [{ justify: [...A(), `normal`] }],
        'justify-items': [{ 'justify-items': [...j(), `normal`] }],
        'justify-self': [{ 'justify-self': [`auto`, ...j()] }],
        'align-content': [{ content: [`normal`, ...A()] }],
        'align-items': [{ items: [...j(), { baseline: [``, `last`] }] }],
        'align-self': [{ self: [`auto`, ...j(), { baseline: [``, `last`] }] }],
        'place-content': [{ 'place-content': A() }],
        'place-items': [{ 'place-items': [...j(), `baseline`] }],
        'place-self': [{ 'place-self': [`auto`, ...j()] }],
        p: [{ p: w() }],
        px: [{ px: w() }],
        py: [{ py: w() }],
        ps: [{ ps: w() }],
        pe: [{ pe: w() }],
        pbs: [{ pbs: w() }],
        pbe: [{ pbe: w() }],
        pt: [{ pt: w() }],
        pr: [{ pr: w() }],
        pb: [{ pb: w() }],
        pl: [{ pl: w() }],
        m: [{ m: M() }],
        mx: [{ mx: M() }],
        my: [{ my: M() }],
        ms: [{ ms: M() }],
        me: [{ me: M() }],
        mbs: [{ mbs: M() }],
        mbe: [{ mbe: M() }],
        mt: [{ mt: M() }],
        mr: [{ mr: M() }],
        mb: [{ mb: M() }],
        ml: [{ ml: M() }],
        'space-x': [{ 'space-x': w() }],
        'space-x-reverse': [`space-x-reverse`],
        'space-y': [{ 'space-y': w() }],
        'space-y-reverse': [`space-y-reverse`],
        size: [{ size: N() }],
        'inline-size': [{ inline: [`auto`, ...ee()] }],
        'min-inline-size': [{ 'min-inline': [`auto`, ...ee()] }],
        'max-inline-size': [{ 'max-inline': [`none`, ...ee()] }],
        'block-size': [{ block: [`auto`, ...P()] }],
        'min-block-size': [{ 'min-block': [`auto`, ...P()] }],
        'max-block-size': [{ 'max-block': [`none`, ...P()] }],
        w: [{ w: [s, `screen`, ...N()] }],
        'min-w': [{ 'min-w': [s, `screen`, `none`, ...N()] }],
        'max-w': [{ 'max-w': [s, `screen`, `none`, `prose`, { screen: [o] }, ...N()] }],
        h: [{ h: [`screen`, `lh`, ...N()] }],
        'min-h': [{ 'min-h': [`screen`, `lh`, `none`, ...N()] }],
        'max-h': [{ 'max-h': [`screen`, `lh`, ...N()] }],
        'font-size': [{ text: [`base`, n, En, yn] }],
        'font-smoothing': [`antialiased`, `subpixel-antialiased`],
        'font-style': [`italic`, `not-italic`],
        'font-weight': [{ font: [r, Mn, xn] }],
        'font-stretch': [
          {
            'font-stretch': [
              `ultra-condensed`,
              `extra-condensed`,
              `condensed`,
              `semi-condensed`,
              `normal`,
              `semi-expanded`,
              `expanded`,
              `extra-expanded`,
              `ultra-expanded`,
              un,
              G
            ]
          }
        ],
        'font-family': [{ font: [Dn, Sn, t] }],
        'font-features': [{ 'font-features': [G] }],
        'fvn-normal': [`normal-nums`],
        'fvn-ordinal': [`ordinal`],
        'fvn-slashed-zero': [`slashed-zero`],
        'fvn-figure': [`lining-nums`, `oldstyle-nums`],
        'fvn-spacing': [`proportional-nums`, `tabular-nums`],
        'fvn-fraction': [`diagonal-fractions`, `stacked-fractions`],
        tracking: [{ tracking: [i, K, G] }],
        'line-clamp': [{ 'line-clamp': [W, `none`, K, bn] }],
        leading: [{ leading: [a, ...w()] }],
        'list-image': [{ 'list-image': [`none`, K, G] }],
        'list-style-position': [{ list: [`inside`, `outside`] }],
        'list-style-type': [{ list: [`disc`, `decimal`, `none`, K, G] }],
        'text-alignment': [{ text: [`left`, `center`, `right`, `justify`, `start`, `end`] }],
        'placeholder-color': [{ placeholder: F() }],
        'text-color': [{ text: F() }],
        'text-decoration': [`underline`, `overline`, `line-through`, `no-underline`],
        'text-decoration-style': [{ decoration: [...z(), `wavy`] }],
        'text-decoration-thickness': [{ decoration: [W, `from-font`, `auto`, K, yn] }],
        'text-decoration-color': [{ decoration: F() }],
        'underline-offset': [{ 'underline-offset': [W, `auto`, K, G] }],
        'text-transform': [`uppercase`, `lowercase`, `capitalize`, `normal-case`],
        'text-overflow': [`truncate`, `text-ellipsis`, `text-clip`],
        'text-wrap': [{ text: [`wrap`, `nowrap`, `balance`, `pretty`] }],
        indent: [{ indent: w() }],
        'vertical-align': [
          {
            align: [
              `baseline`,
              `top`,
              `middle`,
              `bottom`,
              `text-top`,
              `text-bottom`,
              `sub`,
              `super`,
              K,
              G
            ]
          }
        ],
        whitespace: [
          { whitespace: [`normal`, `nowrap`, `pre`, `pre-line`, `pre-wrap`, `break-spaces`] }
        ],
        break: [{ break: [`normal`, `words`, `all`, `keep`] }],
        wrap: [{ wrap: [`break-word`, `anywhere`, `normal`] }],
        hyphens: [{ hyphens: [`none`, `manual`, `auto`] }],
        content: [{ content: [`none`, K, G] }],
        'bg-attachment': [{ bg: [`fixed`, `local`, `scroll`] }],
        'bg-clip': [{ 'bg-clip': [`border`, `padding`, `content`, `text`] }],
        'bg-origin': [{ 'bg-origin': [`border`, `padding`, `content`] }],
        'bg-position': [{ bg: I() }],
        'bg-repeat': [{ bg: te() }],
        'bg-size': [{ bg: ne() }],
        'bg-image': [
          {
            bg: [
              `none`,
              {
                linear: [{ to: [`t`, `tr`, `r`, `br`, `b`, `bl`, `l`, `tl`] }, ln, K, G],
                radial: [``, K, G],
                conic: [ln, K, G]
              },
              An,
              wn
            ]
          }
        ],
        'bg-color': [{ bg: F() }],
        'gradient-from-pos': [{ from: re() }],
        'gradient-via-pos': [{ via: re() }],
        'gradient-to-pos': [{ to: re() }],
        'gradient-from': [{ from: F() }],
        'gradient-via': [{ via: F() }],
        'gradient-to': [{ to: F() }],
        rounded: [{ rounded: L() }],
        'rounded-s': [{ 'rounded-s': L() }],
        'rounded-e': [{ 'rounded-e': L() }],
        'rounded-t': [{ 'rounded-t': L() }],
        'rounded-r': [{ 'rounded-r': L() }],
        'rounded-b': [{ 'rounded-b': L() }],
        'rounded-l': [{ 'rounded-l': L() }],
        'rounded-ss': [{ 'rounded-ss': L() }],
        'rounded-se': [{ 'rounded-se': L() }],
        'rounded-ee': [{ 'rounded-ee': L() }],
        'rounded-es': [{ 'rounded-es': L() }],
        'rounded-tl': [{ 'rounded-tl': L() }],
        'rounded-tr': [{ 'rounded-tr': L() }],
        'rounded-br': [{ 'rounded-br': L() }],
        'rounded-bl': [{ 'rounded-bl': L() }],
        'border-w': [{ border: R() }],
        'border-w-x': [{ 'border-x': R() }],
        'border-w-y': [{ 'border-y': R() }],
        'border-w-s': [{ 'border-s': R() }],
        'border-w-e': [{ 'border-e': R() }],
        'border-w-bs': [{ 'border-bs': R() }],
        'border-w-be': [{ 'border-be': R() }],
        'border-w-t': [{ 'border-t': R() }],
        'border-w-r': [{ 'border-r': R() }],
        'border-w-b': [{ 'border-b': R() }],
        'border-w-l': [{ 'border-l': R() }],
        'divide-x': [{ 'divide-x': R() }],
        'divide-x-reverse': [`divide-x-reverse`],
        'divide-y': [{ 'divide-y': R() }],
        'divide-y-reverse': [`divide-y-reverse`],
        'border-style': [{ border: [...z(), `hidden`, `none`] }],
        'divide-style': [{ divide: [...z(), `hidden`, `none`] }],
        'border-color': [{ border: F() }],
        'border-color-x': [{ 'border-x': F() }],
        'border-color-y': [{ 'border-y': F() }],
        'border-color-s': [{ 'border-s': F() }],
        'border-color-e': [{ 'border-e': F() }],
        'border-color-bs': [{ 'border-bs': F() }],
        'border-color-be': [{ 'border-be': F() }],
        'border-color-t': [{ 'border-t': F() }],
        'border-color-r': [{ 'border-r': F() }],
        'border-color-b': [{ 'border-b': F() }],
        'border-color-l': [{ 'border-l': F() }],
        'divide-color': [{ divide: F() }],
        'outline-style': [{ outline: [...z(), `none`, `hidden`] }],
        'outline-offset': [{ 'outline-offset': [W, K, G] }],
        'outline-w': [{ outline: [``, W, En, yn] }],
        'outline-color': [{ outline: F() }],
        shadow: [{ shadow: [``, `none`, u, jn, Tn] }],
        'shadow-color': [{ shadow: F() }],
        'inset-shadow': [{ 'inset-shadow': [`none`, d, jn, Tn] }],
        'inset-shadow-color': [{ 'inset-shadow': F() }],
        'ring-w': [{ ring: R() }],
        'ring-w-inset': [`ring-inset`],
        'ring-color': [{ ring: F() }],
        'ring-offset-w': [{ 'ring-offset': [W, yn] }],
        'ring-offset-color': [{ 'ring-offset': F() }],
        'inset-ring-w': [{ 'inset-ring': R() }],
        'inset-ring-color': [{ 'inset-ring': F() }],
        'text-shadow': [{ 'text-shadow': [`none`, f, jn, Tn] }],
        'text-shadow-color': [{ 'text-shadow': F() }],
        opacity: [{ opacity: [W, K, G] }],
        'mix-blend': [{ 'mix-blend': [...ie(), `plus-darker`, `plus-lighter`] }],
        'bg-blend': [{ 'bg-blend': ie() }],
        'mask-clip': [
          { 'mask-clip': [`border`, `padding`, `content`, `fill`, `stroke`, `view`] },
          `mask-no-clip`
        ],
        'mask-composite': [{ mask: [`add`, `subtract`, `intersect`, `exclude`] }],
        'mask-image-linear-pos': [{ 'mask-linear': [W] }],
        'mask-image-linear-from-pos': [{ 'mask-linear-from': B() }],
        'mask-image-linear-to-pos': [{ 'mask-linear-to': B() }],
        'mask-image-linear-from-color': [{ 'mask-linear-from': F() }],
        'mask-image-linear-to-color': [{ 'mask-linear-to': F() }],
        'mask-image-t-from-pos': [{ 'mask-t-from': B() }],
        'mask-image-t-to-pos': [{ 'mask-t-to': B() }],
        'mask-image-t-from-color': [{ 'mask-t-from': F() }],
        'mask-image-t-to-color': [{ 'mask-t-to': F() }],
        'mask-image-r-from-pos': [{ 'mask-r-from': B() }],
        'mask-image-r-to-pos': [{ 'mask-r-to': B() }],
        'mask-image-r-from-color': [{ 'mask-r-from': F() }],
        'mask-image-r-to-color': [{ 'mask-r-to': F() }],
        'mask-image-b-from-pos': [{ 'mask-b-from': B() }],
        'mask-image-b-to-pos': [{ 'mask-b-to': B() }],
        'mask-image-b-from-color': [{ 'mask-b-from': F() }],
        'mask-image-b-to-color': [{ 'mask-b-to': F() }],
        'mask-image-l-from-pos': [{ 'mask-l-from': B() }],
        'mask-image-l-to-pos': [{ 'mask-l-to': B() }],
        'mask-image-l-from-color': [{ 'mask-l-from': F() }],
        'mask-image-l-to-color': [{ 'mask-l-to': F() }],
        'mask-image-x-from-pos': [{ 'mask-x-from': B() }],
        'mask-image-x-to-pos': [{ 'mask-x-to': B() }],
        'mask-image-x-from-color': [{ 'mask-x-from': F() }],
        'mask-image-x-to-color': [{ 'mask-x-to': F() }],
        'mask-image-y-from-pos': [{ 'mask-y-from': B() }],
        'mask-image-y-to-pos': [{ 'mask-y-to': B() }],
        'mask-image-y-from-color': [{ 'mask-y-from': F() }],
        'mask-image-y-to-color': [{ 'mask-y-to': F() }],
        'mask-image-radial': [{ 'mask-radial': [K, G] }],
        'mask-image-radial-from-pos': [{ 'mask-radial-from': B() }],
        'mask-image-radial-to-pos': [{ 'mask-radial-to': B() }],
        'mask-image-radial-from-color': [{ 'mask-radial-from': F() }],
        'mask-image-radial-to-color': [{ 'mask-radial-to': F() }],
        'mask-image-radial-shape': [{ 'mask-radial': [`circle`, `ellipse`] }],
        'mask-image-radial-size': [
          { 'mask-radial': [{ closest: [`side`, `corner`], farthest: [`side`, `corner`] }] }
        ],
        'mask-image-radial-pos': [{ 'mask-radial-at': b() }],
        'mask-image-conic-pos': [{ 'mask-conic': [W] }],
        'mask-image-conic-from-pos': [{ 'mask-conic-from': B() }],
        'mask-image-conic-to-pos': [{ 'mask-conic-to': B() }],
        'mask-image-conic-from-color': [{ 'mask-conic-from': F() }],
        'mask-image-conic-to-color': [{ 'mask-conic-to': F() }],
        'mask-mode': [{ mask: [`alpha`, `luminance`, `match`] }],
        'mask-origin': [
          { 'mask-origin': [`border`, `padding`, `content`, `fill`, `stroke`, `view`] }
        ],
        'mask-position': [{ mask: I() }],
        'mask-repeat': [{ mask: te() }],
        'mask-size': [{ mask: ne() }],
        'mask-type': [{ 'mask-type': [`alpha`, `luminance`] }],
        'mask-image': [{ mask: [`none`, K, G] }],
        filter: [{ filter: [``, `none`, K, G] }],
        blur: [{ blur: ae() }],
        brightness: [{ brightness: [W, K, G] }],
        contrast: [{ contrast: [W, K, G] }],
        'drop-shadow': [{ 'drop-shadow': [``, `none`, p, jn, Tn] }],
        'drop-shadow-color': [{ 'drop-shadow': F() }],
        grayscale: [{ grayscale: [``, W, K, G] }],
        'hue-rotate': [{ 'hue-rotate': [W, K, G] }],
        invert: [{ invert: [``, W, K, G] }],
        saturate: [{ saturate: [W, K, G] }],
        sepia: [{ sepia: [``, W, K, G] }],
        'backdrop-filter': [{ 'backdrop-filter': [``, `none`, K, G] }],
        'backdrop-blur': [{ 'backdrop-blur': ae() }],
        'backdrop-brightness': [{ 'backdrop-brightness': [W, K, G] }],
        'backdrop-contrast': [{ 'backdrop-contrast': [W, K, G] }],
        'backdrop-grayscale': [{ 'backdrop-grayscale': [``, W, K, G] }],
        'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [W, K, G] }],
        'backdrop-invert': [{ 'backdrop-invert': [``, W, K, G] }],
        'backdrop-opacity': [{ 'backdrop-opacity': [W, K, G] }],
        'backdrop-saturate': [{ 'backdrop-saturate': [W, K, G] }],
        'backdrop-sepia': [{ 'backdrop-sepia': [``, W, K, G] }],
        'border-collapse': [{ border: [`collapse`, `separate`] }],
        'border-spacing': [{ 'border-spacing': w() }],
        'border-spacing-x': [{ 'border-spacing-x': w() }],
        'border-spacing-y': [{ 'border-spacing-y': w() }],
        'table-layout': [{ table: [`auto`, `fixed`] }],
        caption: [{ caption: [`top`, `bottom`] }],
        transition: [
          { transition: [``, `all`, `colors`, `opacity`, `shadow`, `transform`, `none`, K, G] }
        ],
        'transition-behavior': [{ transition: [`normal`, `discrete`] }],
        duration: [{ duration: [W, `initial`, K, G] }],
        ease: [{ ease: [`linear`, `initial`, _, K, G] }],
        delay: [{ delay: [W, K, G] }],
        animate: [{ animate: [`none`, v, K, G] }],
        backface: [{ backface: [`hidden`, `visible`] }],
        perspective: [{ perspective: [h, K, G] }],
        'perspective-origin': [{ 'perspective-origin': x() }],
        rotate: [{ rotate: oe() }],
        'rotate-x': [{ 'rotate-x': oe() }],
        'rotate-y': [{ 'rotate-y': oe() }],
        'rotate-z': [{ 'rotate-z': oe() }],
        scale: [{ scale: se() }],
        'scale-x': [{ 'scale-x': se() }],
        'scale-y': [{ 'scale-y': se() }],
        'scale-z': [{ 'scale-z': se() }],
        'scale-3d': [`scale-3d`],
        skew: [{ skew: ce() }],
        'skew-x': [{ 'skew-x': ce() }],
        'skew-y': [{ 'skew-y': ce() }],
        transform: [{ transform: [K, G, ``, `none`, `gpu`, `cpu`] }],
        'transform-origin': [{ origin: x() }],
        'transform-style': [{ transform: [`3d`, `flat`] }],
        translate: [{ translate: le() }],
        'translate-x': [{ 'translate-x': le() }],
        'translate-y': [{ 'translate-y': le() }],
        'translate-z': [{ 'translate-z': le() }],
        'translate-none': [`translate-none`],
        accent: [{ accent: F() }],
        appearance: [{ appearance: [`none`, `auto`] }],
        'caret-color': [{ caret: F() }],
        'color-scheme': [
          { scheme: [`normal`, `dark`, `light`, `light-dark`, `only-dark`, `only-light`] }
        ],
        cursor: [
          {
            cursor: [
              `auto`,
              `default`,
              `pointer`,
              `wait`,
              `text`,
              `move`,
              `help`,
              `not-allowed`,
              `none`,
              `context-menu`,
              `progress`,
              `cell`,
              `crosshair`,
              `vertical-text`,
              `alias`,
              `copy`,
              `no-drop`,
              `grab`,
              `grabbing`,
              `all-scroll`,
              `col-resize`,
              `row-resize`,
              `n-resize`,
              `e-resize`,
              `s-resize`,
              `w-resize`,
              `ne-resize`,
              `nw-resize`,
              `se-resize`,
              `sw-resize`,
              `ew-resize`,
              `ns-resize`,
              `nesw-resize`,
              `nwse-resize`,
              `zoom-in`,
              `zoom-out`,
              K,
              G
            ]
          }
        ],
        'field-sizing': [{ 'field-sizing': [`fixed`, `content`] }],
        'pointer-events': [{ 'pointer-events': [`auto`, `none`] }],
        resize: [{ resize: [`none`, ``, `y`, `x`] }],
        'scroll-behavior': [{ scroll: [`auto`, `smooth`] }],
        'scroll-m': [{ 'scroll-m': w() }],
        'scroll-mx': [{ 'scroll-mx': w() }],
        'scroll-my': [{ 'scroll-my': w() }],
        'scroll-ms': [{ 'scroll-ms': w() }],
        'scroll-me': [{ 'scroll-me': w() }],
        'scroll-mbs': [{ 'scroll-mbs': w() }],
        'scroll-mbe': [{ 'scroll-mbe': w() }],
        'scroll-mt': [{ 'scroll-mt': w() }],
        'scroll-mr': [{ 'scroll-mr': w() }],
        'scroll-mb': [{ 'scroll-mb': w() }],
        'scroll-ml': [{ 'scroll-ml': w() }],
        'scroll-p': [{ 'scroll-p': w() }],
        'scroll-px': [{ 'scroll-px': w() }],
        'scroll-py': [{ 'scroll-py': w() }],
        'scroll-ps': [{ 'scroll-ps': w() }],
        'scroll-pe': [{ 'scroll-pe': w() }],
        'scroll-pbs': [{ 'scroll-pbs': w() }],
        'scroll-pbe': [{ 'scroll-pbe': w() }],
        'scroll-pt': [{ 'scroll-pt': w() }],
        'scroll-pr': [{ 'scroll-pr': w() }],
        'scroll-pb': [{ 'scroll-pb': w() }],
        'scroll-pl': [{ 'scroll-pl': w() }],
        'snap-align': [{ snap: [`start`, `end`, `center`, `align-none`] }],
        'snap-stop': [{ snap: [`normal`, `always`] }],
        'snap-type': [{ snap: [`none`, `x`, `y`, `both`] }],
        'snap-strictness': [{ snap: [`mandatory`, `proximity`] }],
        touch: [{ touch: [`auto`, `none`, `manipulation`] }],
        'touch-x': [{ 'touch-pan': [`x`, `left`, `right`] }],
        'touch-y': [{ 'touch-pan': [`y`, `up`, `down`] }],
        'touch-pz': [`touch-pinch-zoom`],
        select: [{ select: [`none`, `text`, `all`, `auto`] }],
        'will-change': [{ 'will-change': [`auto`, `scroll`, `contents`, `transform`, K, G] }],
        fill: [{ fill: [`none`, ...F()] }],
        'stroke-w': [{ stroke: [W, En, yn, bn] }],
        stroke: [{ stroke: [`none`, ...F()] }],
        'forced-color-adjust': [{ 'forced-color-adjust': [`auto`, `none`] }]
      },
      conflictingClassGroups: {
        overflow: [`overflow-x`, `overflow-y`],
        overscroll: [`overscroll-x`, `overscroll-y`],
        inset: [
          `inset-x`,
          `inset-y`,
          `inset-bs`,
          `inset-be`,
          `start`,
          `end`,
          `top`,
          `right`,
          `bottom`,
          `left`
        ],
        'inset-x': [`right`, `left`],
        'inset-y': [`top`, `bottom`],
        flex: [`basis`, `grow`, `shrink`],
        gap: [`gap-x`, `gap-y`],
        p: [`px`, `py`, `ps`, `pe`, `pbs`, `pbe`, `pt`, `pr`, `pb`, `pl`],
        px: [`pr`, `pl`],
        py: [`pt`, `pb`],
        m: [`mx`, `my`, `ms`, `me`, `mbs`, `mbe`, `mt`, `mr`, `mb`, `ml`],
        mx: [`mr`, `ml`],
        my: [`mt`, `mb`],
        size: [`w`, `h`],
        'font-size': [`leading`],
        'fvn-normal': [
          `fvn-ordinal`,
          `fvn-slashed-zero`,
          `fvn-figure`,
          `fvn-spacing`,
          `fvn-fraction`
        ],
        'fvn-ordinal': [`fvn-normal`],
        'fvn-slashed-zero': [`fvn-normal`],
        'fvn-figure': [`fvn-normal`],
        'fvn-spacing': [`fvn-normal`],
        'fvn-fraction': [`fvn-normal`],
        'line-clamp': [`display`, `overflow`],
        rounded: [
          `rounded-s`,
          `rounded-e`,
          `rounded-t`,
          `rounded-r`,
          `rounded-b`,
          `rounded-l`,
          `rounded-ss`,
          `rounded-se`,
          `rounded-ee`,
          `rounded-es`,
          `rounded-tl`,
          `rounded-tr`,
          `rounded-br`,
          `rounded-bl`
        ],
        'rounded-s': [`rounded-ss`, `rounded-es`],
        'rounded-e': [`rounded-se`, `rounded-ee`],
        'rounded-t': [`rounded-tl`, `rounded-tr`],
        'rounded-r': [`rounded-tr`, `rounded-br`],
        'rounded-b': [`rounded-br`, `rounded-bl`],
        'rounded-l': [`rounded-tl`, `rounded-bl`],
        'border-spacing': [`border-spacing-x`, `border-spacing-y`],
        'border-w': [
          `border-w-x`,
          `border-w-y`,
          `border-w-s`,
          `border-w-e`,
          `border-w-bs`,
          `border-w-be`,
          `border-w-t`,
          `border-w-r`,
          `border-w-b`,
          `border-w-l`
        ],
        'border-w-x': [`border-w-r`, `border-w-l`],
        'border-w-y': [`border-w-t`, `border-w-b`],
        'border-color': [
          `border-color-x`,
          `border-color-y`,
          `border-color-s`,
          `border-color-e`,
          `border-color-bs`,
          `border-color-be`,
          `border-color-t`,
          `border-color-r`,
          `border-color-b`,
          `border-color-l`
        ],
        'border-color-x': [`border-color-r`, `border-color-l`],
        'border-color-y': [`border-color-t`, `border-color-b`],
        translate: [`translate-x`, `translate-y`, `translate-none`],
        'translate-none': [`translate`, `translate-x`, `translate-y`, `translate-z`],
        'scroll-m': [
          `scroll-mx`,
          `scroll-my`,
          `scroll-ms`,
          `scroll-me`,
          `scroll-mbs`,
          `scroll-mbe`,
          `scroll-mt`,
          `scroll-mr`,
          `scroll-mb`,
          `scroll-ml`
        ],
        'scroll-mx': [`scroll-mr`, `scroll-ml`],
        'scroll-my': [`scroll-mt`, `scroll-mb`],
        'scroll-p': [
          `scroll-px`,
          `scroll-py`,
          `scroll-ps`,
          `scroll-pe`,
          `scroll-pbs`,
          `scroll-pbe`,
          `scroll-pt`,
          `scroll-pr`,
          `scroll-pb`,
          `scroll-pl`
        ],
        'scroll-px': [`scroll-pr`, `scroll-pl`],
        'scroll-py': [`scroll-pt`, `scroll-pb`],
        touch: [`touch-x`, `touch-y`, `touch-pz`],
        'touch-x': [`touch`],
        'touch-y': [`touch`],
        'touch-pz': [`touch`]
      },
      conflictingClassGroupModifiers: { 'font-size': [`leading`] },
      orderSensitiveModifiers: [
        `*`,
        `**`,
        `after`,
        `backdrop`,
        `before`,
        `details-content`,
        `file`,
        `first-letter`,
        `first-line`,
        `marker`,
        `placeholder`,
        `selection`
      ]
    }
  })
function Wn(...e) {
  return Un(Pe(e))
}
var Gn = o((e) => {
    var t = Symbol.for(`react.transitional.element`)
    function n(e, n, r) {
      var i = null
      if ((r !== void 0 && (i = `` + r), n.key !== void 0 && (i = `` + n.key), `key` in n))
        for (var a in ((r = {}), n)) a !== `key` && (r[a] = n[a])
      else r = n
      return ((n = r.ref), { $$typeof: t, type: e, key: i, ref: n === void 0 ? null : n, props: r })
    }
    ;((e.jsx = n), (e.jsxs = n))
  }),
  q = o((e, t) => {
    t.exports = Gn()
  })(),
  Kn = Le(
    `group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
    {
      variants: {
        variant: {
          default: `bg-primary text-primary-foreground [a]:hover:bg-primary/80`,
          outline: `border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,
          secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground`,
          ghost: `hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50`,
          destructive: `bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40`,
          link: `text-primary underline-offset-4 hover:underline`
        },
        size: {
          default: `h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2`,
          xs: `h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3`,
          sm: `h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5`,
          lg: `h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2`,
          icon: `size-8`,
          'icon-xs': `size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3`,
          'icon-sm': `size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg`,
          'icon-lg': `size-9`
        }
      },
      defaultVariants: { variant: `default`, size: `default` }
    }
  )
function qn({ className: e, variant: t = `default`, size: n = `default`, ...r }) {
  return (0, q.jsx)(yt, {
    'data-slot': `button`,
    className: Wn(Kn({ variant: t, size: n, className: e })),
    ...r
  })
}
var Jn = 0
function Yn(e, t = `mui`) {
  let [n, r] = C.useState(e),
    i = e || n
  return (
    C.useEffect(() => {
      n ?? ((Jn += 1), r(`${t}-${Jn}`))
    }, [n, t]),
    i
  )
}
var Xn = ft.useId
function Zn(e, t) {
  if (Xn !== void 0) {
    let n = Xn()
    return e ?? (t ? `${t}-${n}` : n)
  }
  return Yn(e, t)
}
function Qn(e) {
  return Zn(e, `base-ui`)
}
function $n(e) {
  return e?.ownerDocument || document
}
var er = typeof navigator < `u`,
  tr = ur(),
  nr = fr(),
  rr = dr(),
  ir = typeof CSS > `u` || !CSS.supports ? !1 : CSS.supports(`-webkit-backdrop-filter:none`),
  ar =
    tr.platform === `MacIntel` && tr.maxTouchPoints > 1
      ? !0
      : /iP(hone|ad|od)|iOS/.test(tr.platform)
er && /firefox/i.test(rr)
var or = er && /apple/i.test(navigator.vendor)
er && /Edg/i.test(rr)
var sr = (er && /android/i.test(nr)) || /android/i.test(rr),
  cr = er && nr.toLowerCase().startsWith(`mac`) && !navigator.maxTouchPoints,
  lr = rr.includes(`jsdom/`)
function ur() {
  if (!er) return { platform: ``, maxTouchPoints: -1 }
  let e = navigator.userAgentData
  return e?.platform
    ? { platform: e.platform, maxTouchPoints: navigator.maxTouchPoints }
    : { platform: navigator.platform ?? ``, maxTouchPoints: navigator.maxTouchPoints ?? -1 }
}
function dr() {
  if (!er) return ``
  let e = navigator.userAgentData
  return e && Array.isArray(e.brands)
    ? e.brands.map(({ brand: e, version: t }) => `${e}/${t}`).join(` `)
    : navigator.userAgent
}
function fr() {
  if (!er) return ``
  let e = navigator.userAgentData
  return e?.platform ? e.platform : (navigator.platform ?? ``)
}
var pr = `data-base-ui-focusable`,
  mr = `input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])`
function hr(e) {
  let t = e.activeElement
  for (; t?.shadowRoot?.activeElement != null; ) t = t.shadowRoot.activeElement
  return t
}
function J(e, t) {
  if (!e || !t) return !1
  let n = t.getRootNode?.()
  if (e.contains(t)) return !0
  if (n && We(n)) {
    let n = t
    for (; n; ) {
      if (e === n) return !0
      n = n.parentNode || n.host
    }
  }
  return !1
}
function gr(e) {
  return `composedPath` in e ? e.composedPath()[0] : e.target
}
function _r(e, t) {
  if (!V(e)) return !1
  let n = e
  if (t.hasElement(n)) return !n.hasAttribute(`data-trigger-disabled`)
  for (let [, e] of t.entries()) if (J(e, n)) return !e.hasAttribute(`data-trigger-disabled`)
  return !1
}
function vr(e, t) {
  if (t == null) return !1
  if (`composedPath` in e) return e.composedPath().includes(t)
  let n = e
  return n.target != null && t.contains(n.target)
}
function yr(e) {
  return e.matches(`html,body`)
}
function br(e) {
  return (
    Ue(e) &&
    e.matches(
      `input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])`
    )
  )
}
function xr(e) {
  return (
    e?.closest(`button,a[href],[role="button"],select,[tabindex]:not([tabindex="-1"]),${mr}`) !=
    null
  )
}
function Sr(e) {
  return e ? e.getAttribute(`role`) === `combobox` && br(e) : !1
}
function Cr(e) {
  if (!e || lr) return !0
  try {
    return e.matches(`:focus-visible`)
  } catch {
    return !0
  }
}
function wr(e) {
  return e
    ? e.hasAttribute(`data-base-ui-focusable`)
      ? e
      : e.querySelector(`[data-base-ui-focusable]`) || e
    : null
}
function Tr(e, t, n = !0) {
  return e
    .filter((e) => e.parentId === t)
    .flatMap((t) => [...(!n || t.context?.open ? [t] : []), ...Tr(e, t.id, n)])
}
function Er(e, t) {
  let n = [],
    r = e.find((e) => e.id === t)?.parentId
  for (; r; ) {
    let t = e.find((e) => e.id === r)
    ;((r = t?.parentId), t && (n = n.concat(t)))
  }
  return n
}
function Dr(e) {
  ;(e.preventDefault(), e.stopPropagation())
}
function Or(e) {
  return `nativeEvent` in e
}
function kr(e) {
  return e.pointerType === `` && e.isTrusted
    ? !0
    : sr && e.pointerType
      ? e.type === `click` && e.buttons === 1
      : e.detail === 0 && !e.pointerType
}
function Ar(e) {
  return lr
    ? !1
    : (!sr && e.width === 0 && e.height === 0) ||
        (sr &&
          e.width === 1 &&
          e.height === 1 &&
          e.pressure === 0 &&
          e.detail === 0 &&
          e.pointerType === `mouse`) ||
        (e.width < 1 &&
          e.height < 1 &&
          e.pressure === 0 &&
          e.detail === 0 &&
          e.pointerType === `touch`)
}
function jr(e, t) {
  let n = [`mouse`, `pen`]
  return (t || n.push(``, void 0), n.includes(e))
}
function Mr(e) {
  let t = e.type
  return t === `click` || t === `mousedown` || t === `keydown` || t === `keyup`
}
var Nr = [`top`, `right`, `bottom`, `left`],
  Pr = Math.min,
  Fr = Math.max,
  Ir = Math.round,
  Lr = Math.floor,
  Rr = (e) => ({ x: e, y: e }),
  zr = { left: `right`, right: `left`, bottom: `top`, top: `bottom` }
function Br(e, t, n) {
  return Fr(e, Pr(t, n))
}
function Vr(e, t) {
  return typeof e == `function` ? e(t) : e
}
function Hr(e) {
  return e.split(`-`)[0]
}
function Ur(e) {
  return e.split(`-`)[1]
}
function Wr(e) {
  return e === `x` ? `y` : `x`
}
function Gr(e) {
  return e === `y` ? `height` : `width`
}
function Kr(e) {
  let t = e[0]
  return t === `t` || t === `b` ? `y` : `x`
}
function qr(e) {
  return Wr(Kr(e))
}
function Jr(e, t, n) {
  n === void 0 && (n = !1)
  let r = Ur(e),
    i = qr(e),
    a = Gr(i),
    o =
      i === `x`
        ? r === (n ? `end` : `start`)
          ? `right`
          : `left`
        : r === `start`
          ? `bottom`
          : `top`
  return (t.reference[a] > t.floating[a] && (o = ri(o)), [o, ri(o)])
}
function Yr(e) {
  let t = ri(e)
  return [Xr(e), t, Xr(t)]
}
function Xr(e) {
  return e.includes(`start`) ? e.replace(`start`, `end`) : e.replace(`end`, `start`)
}
var Zr = [`left`, `right`],
  Qr = [`right`, `left`],
  $r = [`top`, `bottom`],
  ei = [`bottom`, `top`]
function ti(e, t, n) {
  switch (e) {
    case `top`:
    case `bottom`:
      return n ? (t ? Qr : Zr) : t ? Zr : Qr
    case `left`:
    case `right`:
      return t ? $r : ei
    default:
      return []
  }
}
function ni(e, t, n, r) {
  let i = Ur(e),
    a = ti(Hr(e), n === `start`, r)
  return (i && ((a = a.map((e) => e + `-` + i)), t && (a = a.concat(a.map(Xr)))), a)
}
function ri(e) {
  let t = Hr(e)
  return zr[t] + e.slice(t.length)
}
function ii(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e }
}
function ai(e) {
  return typeof e == `number` ? { top: e, right: e, bottom: e, left: e } : ii(e)
}
function oi(e) {
  let { x: t, y: n, width: r, height: i } = e
  return { width: r, height: i, top: n, left: t, right: t + r, bottom: n + i, x: t, y: n }
}
function si(e) {
  return e.visibility === `hidden` || e.visibility === `collapse`
}
function ci(e, t = e ? nt(e) : null) {
  return !e || !e.isConnected || !t || si(t)
    ? !1
    : typeof e.checkVisibility == `function`
      ? e.checkVisibility()
      : t.display !== `none` && t.display !== `contents`
}
var li = `a[href],button,input,select,textarea,summary,details,iframe,object,embed,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls]`
function ui(e) {
  let t = e.assignedSlot
  if (t) return t
  if (e.parentElement) return e.parentElement
  let n = e.getRootNode()
  return We(n) ? n.host : null
}
function di(e) {
  for (let t of Array.from(e.children)) if (ze(t) === `summary`) return t
  return null
}
function fi(e, t) {
  let n = di(t)
  return !!n && (e === n || J(n, e))
}
function pi(e) {
  let t = e ? ze(e) : ``
  return (
    e != null &&
    e.matches(li) &&
    (t !== `summary` ||
      (e.parentElement != null &&
        ze(e.parentElement) === `details` &&
        di(e.parentElement) === e)) &&
    (t !== `details` || di(e) == null) &&
    (t !== `input` || e.type !== `hidden`)
  )
}
function mi(e) {
  if (!pi(e) || !e.isConnected || e.matches(`:disabled`)) return !1
  for (let t = e; t; t = ui(t)) {
    let n = t !== e,
      r = ze(t) === `slot`
    if (
      t.hasAttribute(`inert`) ||
      (n && ze(t) === `details` && !t.open && !fi(e, t)) ||
      t.hasAttribute(`hidden`) ||
      (!r && !hi(t, n))
    )
      return !1
  }
  return !0
}
function hi(e, t) {
  let n = nt(e)
  return t ? n.display !== `none` : ci(e, n)
}
function gi(e) {
  let t = e.tabIndex
  if (t < 0) {
    let t = ze(e)
    if (t === `details` || t === `audio` || t === `video` || (Ue(e) && e.isContentEditable))
      return 0
  }
  return t
}
function _i(e) {
  if (ze(e) !== `input`) return null
  let t = e
  return t.type === `radio` && t.name !== `` ? t : null
}
function vi(e, t) {
  let n = _i(e)
  if (!n) return !0
  let r = t.find((e) => {
    let t = _i(e)
    return t?.name === n.name && t.form === n.form && t.checked
  })
  return r
    ? r === n
    : t.find((e) => {
        let t = _i(e)
        return t?.name === n.name && t.form === n.form
      }) === n
}
function yi(e) {
  if (Ue(e) && ze(e) === `slot`) {
    let t = e.assignedElements({ flatten: !0 })
    if (t.length > 0) return t
  }
  return Ue(e) && e.shadowRoot ? Array.from(e.shadowRoot.children) : Array.from(e.children)
}
function bi(e, t) {
  yi(e).forEach((e) => {
    ;(pi(e) && t.push(e), bi(e, t))
  })
}
function xi(e, t, n) {
  yi(e).forEach((e) => {
    ;(Ue(e) && e.matches(t) && n.push(e), xi(e, t, n))
  })
}
function Si(e) {
  return mi(e) && gi(e) >= 0
}
function Ci(e) {
  let t = []
  return (bi(e, t), t.filter(mi))
}
function wi(e) {
  let t = Ci(e)
  return t.filter((e) => gi(e) >= 0 && vi(e, t))
}
function Ti(e, t) {
  let n = wi(e),
    r = n.length
  if (r === 0) return
  let i = hr($n(e)),
    a = n.indexOf(i)
  return n[a === -1 ? (t === 1 ? 0 : r - 1) : a + t]
}
function Ei(e) {
  return Ti($n(e).body, 1) || e
}
function Di(e) {
  return Ti($n(e).body, -1) || e
}
function Oi(e, t) {
  let n = t || e.currentTarget,
    r = e.relatedTarget
  return !r || !J(n, r)
}
function ki(e) {
  wi(e).forEach((e) => {
    ;((e.dataset.tabindex = e.getAttribute(`tabindex`) || ``), e.setAttribute(`tabindex`, `-1`))
  })
}
function Ai(e) {
  let t = []
  ;(xi(e, `[data-tabindex]`, t),
    t.forEach((e) => {
      let t = e.dataset.tabindex
      ;(delete e.dataset.tabindex,
        t ? e.setAttribute(`tabindex`, t) : e.removeAttribute(`tabindex`))
    }))
}
var ji = []
function Mi(e) {
  C.useEffect(e, ji)
}
var Ni = 0,
  Pi = class e {
    static create() {
      return new e()
    }
    currentId = Ni
    start(e, t) {
      ;(this.clear(),
        (this.currentId = setTimeout(() => {
          ;((this.currentId = Ni), t())
        }, e)))
    }
    isStarted() {
      return this.currentId !== Ni
    }
    clear = () => {
      this.currentId !== Ni && (clearTimeout(this.currentId), (this.currentId = Ni))
    }
    disposeEffect = () => this.clear
  }
function Fi() {
  let e = ue(Pi.create).current
  return (Mi(e.disposeEffect), e)
}
var Ii = null
globalThis.requestAnimationFrame
var Li = new (class {
    callbacks = []
    callbacksCount = 0
    nextId = 1
    startId = 1
    isScheduled = !1
    tick = (e) => {
      this.isScheduled = !1
      let t = this.callbacks,
        n = this.callbacksCount
      if (((this.callbacks = []), (this.callbacksCount = 0), (this.startId = this.nextId), n > 0))
        for (let n = 0; n < t.length; n += 1) t[n]?.(e)
    }
    request(e) {
      let t = this.nextId
      return (
        (this.nextId += 1),
        this.callbacks.push(e),
        (this.callbacksCount += 1),
        (this.isScheduled ||= (requestAnimationFrame(this.tick), !0)),
        t
      )
    }
    cancel(e) {
      let t = e - this.startId
      t < 0 || t >= this.callbacks.length || ((this.callbacks[t] = null), --this.callbacksCount)
    }
  })(),
  Ri = class e {
    static create() {
      return new e()
    }
    static request(e) {
      return Li.request(e)
    }
    static cancel(e) {
      return Li.cancel(e)
    }
    currentId = Ii
    request(e) {
      ;(this.cancel(),
        (this.currentId = Li.request(() => {
          ;((this.currentId = Ii), e())
        })))
    }
    cancel = () => {
      this.currentId !== Ii && (Li.cancel(this.currentId), (this.currentId = Ii))
    }
    disposeEffect = () => this.cancel
  }
function zi() {
  let e = ue(Ri.create).current
  return (Mi(e.disposeEffect), e)
}
function Bi(e) {
  return e == null ? e : `current` in e ? e.current : e
}
var Vi = (function (e) {
    return ((e.startingStyle = `data-starting-style`), (e.endingStyle = `data-ending-style`), e)
  })({}),
  Hi = { [Vi.startingStyle]: `` },
  Ui = { [Vi.endingStyle]: `` },
  Wi = {
    transitionStatus(e) {
      return e === `starting` ? Hi : e === `ending` ? Ui : null
    }
  },
  Gi = c(m())
function Ki(e, t = !1, n = !0) {
  let r = zi()
  return H((i, a = null) => {
    r.cancel()
    let o = Bi(e)
    if (o == null) return
    let s = o,
      c = () => {
        Gi.flushSync(i)
      }
    if (typeof s.getAnimations != `function` || globalThis.BASE_UI_ANIMATIONS_DISABLED) {
      i()
      return
    }
    function l() {
      Promise.all(s.getAnimations().map((e) => e.finished))
        .then(() => {
          a?.aborted || c()
        })
        .catch(() => {
          if (n) {
            a?.aborted || c()
            return
          }
          let e = s.getAnimations()
          !a?.aborted &&
            e.length > 0 &&
            e.some((e) => e.pending || e.playState !== `finished`) &&
            l()
        })
    }
    if (t) {
      let e = Vi.startingStyle
      if (!s.hasAttribute(e)) {
        r.request(l)
        return
      }
      let t = new MutationObserver(() => {
        s.hasAttribute(e) || (t.disconnect(), l())
      })
      ;(t.observe(s, { attributes: !0, attributeFilter: [e] }),
        a?.addEventListener(`abort`, () => t.disconnect(), { once: !0 }))
      return
    }
    r.request(l)
  })
}
function qi(e) {
  let { enabled: t = !0, open: n, ref: r, onComplete: i } = e,
    a = H(i),
    o = Ki(r, n, !1)
  C.useEffect(() => {
    if (!t) return
    let e = new AbortController()
    return (
      o(a, e.signal),
      () => {
        e.abort()
      }
    )
  }, [t, n, a, o])
}
function Ji(e, t = !1, n = !1) {
  let [r, i] = C.useState(e && t ? `idle` : void 0),
    [a, o] = C.useState(e)
  return (
    e && !a && (o(!0), i(`starting`)),
    !e && a && r !== `ending` && !n && i(`ending`),
    !e && !a && r === `ending` && i(void 0),
    U(() => {
      if (!e && a && r !== `ending` && n) {
        let e = Ri.request(() => {
          i(`ending`)
        })
        return () => {
          Ri.cancel(e)
        }
      }
    }, [e, a, r, n]),
    U(() => {
      if (!e || t) return
      let n = Ri.request(() => {
        i(void 0)
      })
      return () => {
        Ri.cancel(n)
      }
    }, [t, e]),
    U(() => {
      if (!e || !t) return
      e && a && r !== `idle` && i(`starting`)
      let n = Ri.request(() => {
        i(`idle`)
      })
      return () => {
        Ri.cancel(n)
      }
    }, [t, e, a, r]),
    { mounted: a, setMounted: o, transitionStatus: r }
  )
}
var Yi = `none`,
  Xi = `trigger-press`,
  Zi = `trigger-hover`,
  Qi = `trigger-focus`,
  $i = `outside-press`,
  ea = `close-press`,
  ta = `focus-out`,
  na = `escape-key`,
  ra = `disabled`,
  ia = `imperative-action`
function aa(e, t, n, r) {
  let i = !1,
    a = !1,
    o = r ?? xe
  return {
    reason: e,
    event: t ?? new Event(`base-ui`),
    cancel() {
      i = !0
    },
    allowPropagation() {
      a = !0
    },
    get isCanceled() {
      return i
    },
    get isPropagationAllowed() {
      return a
    },
    trigger: n,
    ...o
  }
}
var oa = C.createContext(void 0)
function sa(e) {
  let t = C.useContext(oa)
  if (e === !1 && t === void 0) throw Error(ce(27))
  return t
}
var ca = (function (e) {
    return (
      (e.open = `data-open`),
      (e.closed = `data-closed`),
      (e[(e.startingStyle = Vi.startingStyle)] = `startingStyle`),
      (e[(e.endingStyle = Vi.endingStyle)] = `endingStyle`),
      (e.anchorHidden = `data-anchor-hidden`),
      (e.side = `data-side`),
      (e.align = `data-align`),
      e
    )
  })({}),
  la = (function (e) {
    return ((e.popupOpen = `data-popup-open`), (e.pressed = `data-pressed`), e)
  })({}),
  ua = { [la.popupOpen]: `` }
;(la.popupOpen, la.pressed)
var da = { [ca.open]: `` },
  fa = { [ca.closed]: `` },
  pa = { [ca.anchorHidden]: `` },
  ma = {
    open(e) {
      return e ? ua : null
    }
  },
  ha = {
    open(e) {
      return e ? da : fa
    },
    anchorHidden(e) {
      return e ? pa : null
    }
  },
  ga = { ...ha, ...Wi },
  _a = C.forwardRef(function (e, t) {
    let { render: n, className: r, style: i, forceRender: a = !1, ...o } = e,
      { store: s } = sa(),
      c = s.useState(`open`),
      l = s.useState(`nested`),
      u = s.useState(`mounted`)
    return Te(`div`, e, {
      state: { open: c, transitionStatus: s.useState(`transitionStatus`) },
      ref: [s.context.backdropRef, t],
      stateAttributesMapping: ga,
      props: [
        {
          role: `presentation`,
          hidden: !u,
          style: { userSelect: `none`, WebkitUserSelect: `none` }
        },
        o
      ],
      enabled: a || !l
    })
  }),
  va = C.forwardRef(function (e, t) {
    let { render: n, className: r, disabled: i = !1, nativeButton: a = !0, style: o, ...s } = e,
      { store: c } = sa(),
      l = c.useState(`open`)
    function u(e) {
      l && c.setOpen(!1, aa(ea, e.nativeEvent))
    }
    let { getButtonProps: d, buttonRef: f } = gt({ disabled: i, native: a })
    return Te(`button`, e, { state: { disabled: i }, ref: [t, f], props: [{ onClick: u }, s, d] })
  }),
  ya = C.forwardRef(function (e, t) {
    let { render: n, className: r, style: i, id: a, ...o } = e,
      { store: s } = sa(),
      c = Qn(a)
    return (
      s.useSyncedValueWithCleanup(`descriptionElementId`, c),
      Te(`p`, e, { ref: t, props: [{ id: c }, o] })
    )
  })
function ba(e, t) {
  return t != null && !jr(t) ? 0 : typeof e == `function` ? e() : e
}
function xa(e, t, n) {
  let r = ba(e, n)
  return typeof r == `number` ? r : r?.[t]
}
function Sa(e) {
  return typeof e == `function` ? e() : e
}
function Ca(e, t) {
  return t || e === `click` || e === `mousedown`
}
var wa = C.createContext({
  hasProvider: !1,
  timeoutMs: 0,
  delayRef: { current: 0 },
  initialDelayRef: { current: 0 },
  timeout: new Pi(),
  currentIdRef: { current: null },
  currentContextRef: { current: null }
})
function Ta(e) {
  let { children: t, delay: n, timeoutMs: r = 0 } = e,
    i = C.useRef(n),
    a = C.useRef(n),
    o = C.useRef(null),
    s = C.useRef(null),
    c = Fi()
  return (0, q.jsx)(wa.Provider, {
    value: C.useMemo(
      () => ({
        hasProvider: !0,
        delayRef: i,
        initialDelayRef: a,
        currentIdRef: o,
        timeoutMs: r,
        currentContextRef: s,
        timeout: c
      }),
      [r, c]
    ),
    children: t
  })
}
function Ea(e, t = { open: !1 }) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`floatingId`),
    { open: i } = t,
    {
      currentIdRef: a,
      delayRef: o,
      timeoutMs: s,
      initialDelayRef: c,
      currentContextRef: l,
      hasProvider: u,
      timeout: d
    } = C.useContext(wa),
    [f, p] = C.useState(!1)
  return (
    U(() => {
      function e() {
        ;(p(!1),
          l.current?.setIsInstantPhase(!1),
          (a.current = null),
          (l.current = null),
          (o.current = c.current))
      }
      if (a.current && !i && a.current === r) {
        if ((p(!1), s)) {
          let t = r
          return (
            d.start(s, () => {
              n.select(`open`) || (a.current && a.current !== t) || e()
            }),
            () => {
              d.clear()
            }
          )
        }
        e()
      }
    }, [i, r, a, o, s, c, l, d, n]),
    U(() => {
      if (!i) return
      let e = l.current,
        t = a.current
      ;(d.clear(),
        (l.current = { onOpenChange: n.setOpen, setIsInstantPhase: p }),
        (a.current = r),
        (o.current = { open: 0, close: xa(c.current, `close`) }),
        t !== null && t !== r
          ? (p(!0), e?.setIsInstantPhase(!0), e?.onOpenChange(!1, aa(Yi)))
          : (p(!1), e?.setIsInstantPhase(!1)))
    }, [i, r, n, a, o, s, c, l, d]),
    U(
      () => () => {
        l.current = null
      },
      [l]
    ),
    C.useMemo(() => ({ hasProvider: u, delayRef: o, isInstantPhase: f }), [u, o, f])
  )
}
function Y(e, t, n, r) {
  return (
    e.addEventListener(t, n, r),
    () => {
      e.removeEventListener(t, n, r)
    }
  )
}
function Da(...e) {
  return () => {
    for (let t = 0; t < e.length; t += 1) {
      let n = e[t]
      n && n()
    }
  }
}
function Oa(e) {
  let t = ue(ka, e).current
  return ((t.next = e), U(t.effect), t)
}
function ka(e) {
  let t = {
    current: e,
    next: e,
    effect: () => {
      t.current = t.next
    }
  }
  return t
}
var Aa = {
    clipPath: `inset(50%)`,
    overflow: `hidden`,
    whiteSpace: `nowrap`,
    border: 0,
    padding: 0,
    width: 1,
    height: 1,
    margin: -1
  },
  ja = { ...Aa, position: `fixed`, top: 0, left: 0 }
;({ ...Aa })
var Ma = C.forwardRef(function (e, t) {
  let [n, r] = C.useState()
  U(() => {
    or && r(`button`)
  }, [])
  let i = { tabIndex: 0, role: n }
  return (0, q.jsx)(`span`, {
    ...e,
    ref: t,
    style: ja,
    'aria-hidden': n ? void 0 : !0,
    ...i,
    'data-base-ui-focus-guard': ``
  })
})
function Na(e) {
  return `data-base-ui-${e}`
}
var Pa = 0
function Fa(e, t = {}) {
  let { preventScroll: n = !1, cancelPrevious: r = !0, sync: i = !1 } = t
  r && cancelAnimationFrame(Pa)
  let a = () => e?.focus({ preventScroll: n })
  if (i) return (a(), be)
  let o = requestAnimationFrame(a)
  return (
    (Pa = o),
    () => {
      Pa === o && (cancelAnimationFrame(o), (Pa = 0))
    }
  )
}
var Ia = { inert: new WeakMap(), 'aria-hidden': new WeakMap() },
  La = `data-base-ui-inert`,
  Ra = { inert: new WeakSet(), 'aria-hidden': new WeakSet() },
  za = new WeakMap(),
  Ba = 0
function Va(e) {
  return Ra[e]
}
function Ha(e) {
  return e ? (We(e) ? e.host : Ha(e.parentNode)) : null
}
var Ua = (e, t) =>
    t
      .map((t) => {
        if (e.contains(t)) return t
        let n = Ha(t)
        return e.contains(n) ? n : null
      })
      .filter((e) => e != null),
  Wa = (e) => {
    let t = new Set()
    return (
      e.forEach((e) => {
        let n = e
        for (; n && !t.has(n); ) (t.add(n), (n = n.parentNode))
      }),
      t
    )
  },
  Ga = (e, t, n) => {
    let r = [],
      i = (e) => {
        !e ||
          n.has(e) ||
          Array.from(e.children).forEach((e) => {
            ze(e) !== `script` && (t.has(e) ? i(e) : r.push(e))
          })
      }
    return (i(e), r)
  }
function Ka(e, t, n, r, { mark: i = !0, markerIgnoreElements: a = [] }) {
  let o = r ? `inert` : n ? `aria-hidden` : null,
    s = null,
    c = null,
    l = Ua(t, e),
    u = i ? Ua(t, a) : [],
    d = new Set(u),
    f = i ? Ga(t, Wa(l), new Set(l)).filter((e) => !d.has(e)) : [],
    p = [],
    m = []
  if (o) {
    let e = Ia[o],
      n = Va(o)
    ;((c = n), (s = e))
    let r = Ua(t, Array.from(t.querySelectorAll(`[aria-live]`))),
      i = l.concat(r)
    Ga(t, Wa(i), new Set(i)).forEach((t) => {
      let r = t.getAttribute(o),
        i = r !== null && r !== `false`,
        a = (e.get(t) || 0) + 1
      ;(e.set(t, a),
        p.push(t),
        a === 1 && i && n.add(t),
        i || t.setAttribute(o, o === `inert` ? `` : `true`))
    })
  }
  return (
    i &&
      f.forEach((e) => {
        let t = (za.get(e) || 0) + 1
        ;(za.set(e, t), m.push(e), t === 1 && e.setAttribute(La, ``))
      }),
    (Ba += 1),
    () => {
      ;(s &&
        p.forEach((e) => {
          let t = (s.get(e) || 0) - 1
          ;(s.set(e, t), t || (!c?.has(e) && o && e.removeAttribute(o), c?.delete(e)))
        }),
        i &&
          m.forEach((e) => {
            let t = (za.get(e) || 0) - 1
            ;(za.set(e, t), t || e.removeAttribute(La))
          }),
        --Ba,
        Ba ||
          ((Ia.inert = new WeakMap()),
          (Ia[`aria-hidden`] = new WeakMap()),
          (Ra.inert = new WeakSet()),
          (Ra[`aria-hidden`] = new WeakSet()),
          (za = new WeakMap())))
    }
  )
}
function qa(e, t = {}) {
  let { ariaHidden: n = !1, inert: r = !1, mark: i = !0, markerIgnoreElements: a = [] } = t,
    o = $n(e[0]).body
  return Ka(e, o, n, r, { mark: i, markerIgnoreElements: a })
}
var Ja = { style: { transition: `none` } },
  Ya = { fallbackAxisSide: `end` },
  Xa = { clipPath: `inset(50%)`, position: `fixed`, top: 0, left: 0 },
  Za = C.createContext(null),
  Qa = () => C.useContext(Za),
  $a = Na(`portal`)
function eo(e = {}) {
  let { ref: t, container: n, componentProps: r = xe, elementProps: i } = e,
    a = Zn(),
    o = Qa()?.portalNode,
    [s, c] = C.useState(null),
    [l, u] = C.useState(null),
    d = H((e) => {
      e !== null && u(e)
    }),
    f = C.useRef(null)
  U(() => {
    if (n === null) {
      f.current && ((f.current = null), u(null), c(null))
      return
    }
    if (a == null) return
    let e = (n && (He(n) ? n : n.current)) ?? o ?? document.body
    if (e == null) {
      f.current && ((f.current = null), u(null), c(null))
      return
    }
    f.current !== e && ((f.current = e), u(null), c(e))
  }, [n, o, a])
  let p = Te(`div`, r, { ref: [t, d], props: [{ id: a, [$a]: `` }, i] })
  return { portalNode: l, portalSubtree: s && p ? Gi.createPortal(p, s) : null }
}
var to = C.forwardRef(function (e, t) {
  let { children: n, container: r, className: i, render: a, renderGuards: o, style: s, ...c } = e,
    { portalNode: l, portalSubtree: u } = eo({
      container: r,
      ref: t,
      componentProps: e,
      elementProps: c
    }),
    d = C.useRef(null),
    f = C.useRef(null),
    p = C.useRef(null),
    m = C.useRef(null),
    [h, g] = C.useState(null),
    _ = C.useRef(!1),
    v = h?.modal,
    y = h?.open,
    b = typeof o == `boolean` ? o : !!h && !h.modal && h.open && !!l
  ;(C.useEffect(() => {
    if (!l || v) return
    function e(e) {
      l &&
        e.relatedTarget &&
        Oi(e) &&
        (e.type === `focusin` ? (_.current &&= (Ai(l), !1)) : (ki(l), (_.current = !0)))
    }
    return Da(Y(l, `focusin`, e, !0), Y(l, `focusout`, e, !0))
  }, [l, v]),
    C.useEffect(() => {
      !l || y !== !1 || (Ai(l), (_.current = !1))
    }, [y, l]))
  let x = C.useMemo(
    () => ({
      beforeOutsideRef: d,
      afterOutsideRef: f,
      beforeInsideRef: p,
      afterInsideRef: m,
      portalNode: l,
      setFocusManagerState: g
    }),
    [l]
  )
  return (0, q.jsxs)(C.Fragment, {
    children: [
      u,
      (0, q.jsxs)(Za.Provider, {
        value: x,
        children: [
          b &&
            l &&
            (0, q.jsx)(Ma, {
              'data-type': `outside`,
              ref: d,
              onFocus: (e) => {
                Oi(e, l) ? p.current?.focus() : Di(h ? h.domReference : null)?.focus()
              }
            }),
          b && l && (0, q.jsx)(`span`, { 'aria-owns': l.id, style: Xa }),
          l && Gi.createPortal(n, l),
          b &&
            l &&
            (0, q.jsx)(Ma, {
              'data-type': `outside`,
              ref: f,
              onFocus: (e) => {
                Oi(e, l)
                  ? m.current?.focus()
                  : (Ei(h ? h.domReference : null)?.focus(),
                    h?.closeOnFocusOut && h?.onOpenChange(!1, aa(`focus-out`, e.nativeEvent)))
              }
            })
        ]
      })
    ]
  })
})
function no() {
  let e = new Map()
  return {
    emit(t, n) {
      e.get(t)?.forEach((e) => e(n))
    },
    on(t, n) {
      ;(e.has(t) || e.set(t, new Set()), e.get(t).add(n))
    },
    off(t, n) {
      e.get(t)?.delete(n)
    }
  }
}
var X = C.createContext(null),
  ro = C.createContext(null),
  io = () => C.useContext(X)?.id || null,
  ao = (e) => {
    let t = C.useContext(ro)
    return e ?? t
  }
function oo(e, t) {
  let n = Be(gr(e))
  return e instanceof n.KeyboardEvent
    ? `keyboard`
    : e instanceof n.FocusEvent
      ? t || `keyboard`
      : `pointerType` in e
        ? e.pointerType || `keyboard`
        : `touches` in e
          ? `touch`
          : e instanceof n.MouseEvent
            ? t || (e.detail === 0 ? `keyboard` : `mouse`)
            : ``
}
var so = 20,
  co = []
function lo() {
  co = co.filter((e) => e.deref()?.isConnected)
}
function uo(e) {
  ;(lo(),
    e && ze(e) !== `body` && (co.push(new WeakRef(e)), co.length > so && (co = co.slice(-so))))
}
function fo() {
  return (lo(), co[co.length - 1]?.deref())
}
function po(e) {
  return e ? (Si(e) ? e : wi(e)[0] || e) : null
}
function mo(e, t) {
  if (
    (e.hasAttribute(`tabindex`) && !e.hasAttribute(`data-tabindex`)) ||
    (!t.current.includes(`floating`) && !e.getAttribute(`role`)?.includes(`dialog`))
  )
    return
  let n = Ci(e).filter((e) => {
      let t = e.getAttribute(`data-tabindex`) || ``
      return Si(e) || (e.hasAttribute(`data-tabindex`) && !t.startsWith(`-`))
    }),
    r = e.getAttribute(`tabindex`)
  t.current.includes(`floating`) || n.length === 0
    ? r !== `0` && e.setAttribute(`tabindex`, `0`)
    : (r !== `-1` ||
        (e.hasAttribute(`data-tabindex`) && e.getAttribute(`data-tabindex`) !== `-1`)) &&
      (e.setAttribute(`tabindex`, `-1`), e.setAttribute(`data-tabindex`, `-1`))
}
function ho(e) {
  let {
      context: t,
      children: n,
      disabled: r = !1,
      initialFocus: i = !0,
      returnFocus: a = !0,
      restoreFocus: o = !1,
      modal: s = !0,
      closeOnFocusOut: c = !0,
      openInteractionType: l = ``,
      nextFocusableElement: u,
      previousFocusableElement: d,
      beforeContentFocusGuardRef: f,
      externalTree: p,
      getInsideElements: m
    } = e,
    h = `rootStore` in t ? t.rootStore : t,
    g = h.useState(`open`),
    _ = h.useState(`domReferenceElement`),
    v = h.useState(`floatingElement`),
    { events: y, dataRef: b } = h.context,
    x = H(() => b.current.floatingContext?.nodeId),
    S = i === !1,
    w = Sr(_) && S,
    T = C.useRef([`content`]),
    E = Oa(i),
    D = Oa(a),
    O = Oa(l),
    k = ao(p),
    A = Qa(),
    j = C.useRef(!1),
    M = C.useRef(!1),
    N = C.useRef(!1),
    ee = C.useRef(null),
    P = C.useRef(``),
    F = C.useRef(``),
    I = C.useRef(null),
    te = C.useRef(null),
    ne = de(I, f, A?.beforeInsideRef),
    re = de(te, A?.afterInsideRef),
    L = Fi(),
    R = Fi(),
    z = zi(),
    ie = A != null,
    B = wr(v),
    ae = H((e = B) => (e ? wi(e) : [])),
    oe = H(() => m?.().filter((e) => e != null) ?? [])
  ;(C.useEffect(() => {
    if (r || !s) return
    function e(e) {
      e.key === `Tab` && J(B, hr($n(B))) && ae().length === 0 && !w && Dr(e)
    }
    return Y($n(B), `keydown`, e)
  }, [r, _, B, s, T, w, ae]),
    C.useEffect(() => {
      if (r || !g) return
      let e = $n(B)
      function t() {
        N.current = !1
      }
      function n(e) {
        let t = gr(e),
          n = oe()
        ;((N.current = !(
          J(v, t) ||
          J(_, t) ||
          J(A?.portalNode, t) ||
          n.some((e) => e === t || J(e, t))
        )),
          (F.current = e.pointerType || `keyboard`),
          t?.closest(`[data-base-ui-click-trigger]`) && (M.current = !0))
      }
      function i() {
        F.current = `keyboard`
      }
      return Da(
        Y(e, `pointerdown`, n, !0),
        Y(e, `pointerup`, t, !0),
        Y(e, `pointercancel`, t, !0),
        Y(e, `keydown`, i, !0)
      )
    }, [r, v, _, B, g, A, oe]),
    C.useEffect(() => {
      if (r || !c) return
      let e = $n(B)
      function t() {
        ;((M.current = !0),
          R.start(0, () => {
            M.current = !1
          }))
      }
      function n(e) {
        let t = gr(e)
        Si(t) && (ee.current = t)
      }
      function i(t) {
        let n = t.relatedTarget,
          r = t.currentTarget,
          i = gr(t)
        queueMicrotask(() => {
          let a = x(),
            c = h.context.triggerElements,
            l = oe(),
            f =
              n?.hasAttribute(Na(`focus-guard`)) &&
              [
                I.current,
                te.current,
                A?.beforeInsideRef.current,
                A?.afterInsideRef.current,
                A?.beforeOutsideRef.current,
                A?.afterOutsideRef.current,
                Bi(d),
                Bi(u)
              ].includes(n),
            p = !(
              J(_, n) ||
              J(v, n) ||
              J(n, v) ||
              J(A?.portalNode, n) ||
              l.some((e) => e === n || J(e, n)) ||
              (n != null && c.hasElement(n)) ||
              c.hasMatchingElement((e) => J(e, n)) ||
              f ||
              (k &&
                (Tr(k.nodesRef.current, a).find(
                  (e) =>
                    J(e.context?.elements.floating, n) || J(e.context?.elements.domReference, n)
                ) ||
                  Er(k.nodesRef.current, a).find(
                    (e) =>
                      [e.context?.elements.floating, wr(e.context?.elements.floating)].includes(
                        n
                      ) || e.context?.elements.domReference === n
                  )))
            )
          if ((r === _ && B && mo(B, T), o && r !== _ && !ci(i) && hr(e) === e.body)) {
            if (Ue(B) && (B.focus(), o === `popup`)) {
              z.request(() => {
                B.focus()
              })
              return
            }
            let e = ae(),
              t = ee.current,
              n = (t && e.includes(t) ? t : null) || e[e.length - 1] || B
            Ue(n) && n.focus()
          }
          if (b.current.insideReactTree) {
            b.current.insideReactTree = !1
            return
          }
          ;(w || !s) &&
            n &&
            p &&
            !M.current &&
            (w || n !== fo()) &&
            ((j.current = !0), h.setOpen(!1, aa(ta, t)))
        })
      }
      function a() {
        N.current ||
          ((b.current.insideReactTree = !0),
          L.start(0, () => {
            b.current.insideReactTree = !1
          }))
      }
      let l = Ue(_) ? _ : null
      if (!(!v && !l))
        return Da(
          l && Y(l, `focusout`, i),
          l && Y(l, `pointerdown`, t),
          v && Y(v, `focusin`, n),
          v && Y(v, `focusout`, i),
          v && A && Y(v, `focusout`, a, !0)
        )
    }, [r, _, v, B, s, k, A, h, c, o, ae, w, x, T, b, L, R, z, u, d, oe]),
    C.useEffect(() => {
      if (r || !v || !g) return
      let e = Array.from(A?.portalNode?.querySelectorAll(`[${Na(`portal`)}]`) || []),
        t = (k ? Er(k.nodesRef.current, x()) : []).find((e) =>
          Sr(e.context?.elements.domReference || null)
        )?.context?.elements.domReference,
        n = qa(
          [
            ...[
              v,
              ...e,
              I.current,
              te.current,
              A?.beforeOutsideRef.current,
              A?.afterOutsideRef.current,
              ...oe()
            ],
            t,
            Bi(d),
            Bi(u),
            w ? _ : null
          ].filter((e) => e != null),
          { ariaHidden: s || w, mark: !1 }
        ),
        i = qa([v, ...e].filter((e) => e != null))
      return () => {
        ;(i(), n())
      }
    }, [g, r, _, v, s, T, A, w, k, x, u, d, oe]),
    U(() => {
      if (!g || r || !Ue(B)) return
      let e = hr($n(B))
      queueMicrotask(() => {
        let t = E.current,
          n = typeof t == `function` ? t(O.current || ``) : t
        if (n === void 0 || n === !1 || J(B, e)) return
        let r = null,
          i = () => ((r ??= ae(B)), r[0] || B),
          a
        ;((a = n === !0 || n === null ? i() : Bi(n)),
          (a ||= i()),
          Fa(a, { preventScroll: a === B }))
      })
    }, [r, g, B, S, ae, E, O]),
    U(() => {
      if (r || !B) return
      let e = $n(B)
      uo(hr(e))
      function t(e) {
        if (
          (e.open || (P.current = oo(e.nativeEvent, F.current)),
          e.reason === `trigger-hover` && e.nativeEvent.type === `mouseleave` && (j.current = !0),
          e.reason === `outside-press`)
        )
          if (e.nested) j.current = !1
          else if (kr(e.nativeEvent) || Ar(e.nativeEvent)) j.current = !1
          else {
            let e = !1
            ;($n(B)
              .createElement(`div`)
              .focus({
                get preventScroll() {
                  return ((e = !0), !1)
                }
              }),
              e ? (j.current = !1) : (j.current = !0))
          }
      }
      y.on(`openchange`, t)
      function n() {
        let e = D.current,
          t = typeof e == `function` ? e(P.current) : e
        if (t === void 0 || t === !1) return null
        if ((t === null && (t = !0), typeof t == `boolean`)) {
          let e = _ || fo()
          return e && e.isConnected ? e : null
        }
        let n = _ || fo()
        return Bi(t) || n || null
      }
      return () => {
        y.off(`openchange`, t)
        let r = hr(e),
          i = oe(),
          a =
            J(v, r) ||
            i.some((e) => e === r || J(e, r)) ||
            (k && Tr(k.nodesRef.current, x(), !1).some((e) => J(e.context?.elements.floating, r))),
          o = D.current,
          s = n()
        queueMicrotask(() => {
          let t = po(s),
            n = typeof o != `boolean`
          ;(o &&
            !j.current &&
            Ue(t) &&
            (!(!n && t !== r && r !== e.body) || a) &&
            t.focus({ preventScroll: !0 }),
            (j.current = !1))
        })
      }
    }, [r, v, B, D, b, y, k, _, x, oe]),
    U(() => {
      if (!ir || g || !v) return
      let e = hr($n(v))
      !Ue(e) || !br(e) || (J(v, e) && e.blur())
    }, [g, v]),
    U(() => {
      if (!(r || !A))
        return (
          A.setFocusManagerState({
            modal: s,
            closeOnFocusOut: c,
            open: g,
            onOpenChange: h.setOpen,
            domReference: _
          }),
          () => {
            A.setFocusManagerState(null)
          }
        )
    }, [r, A, s, g, h, c, _]),
    U(() => {
      if (!(r || !B))
        return (
          mo(B, T),
          () => {
            queueMicrotask(lo)
          }
        )
    }, [r, B, T]))
  let se = !r && (s ? !w : !0) && (ie || s)
  return (0, q.jsxs)(C.Fragment, {
    children: [
      se &&
        (0, q.jsx)(Ma, {
          'data-type': `inside`,
          ref: ne,
          onFocus: (e) => {
            if (s) {
              let e = ae()
              Fa(e[e.length - 1])
            } else
              A?.portalNode &&
                ((j.current = !1),
                Oi(e, A.portalNode) ? Ei(_)?.focus() : Bi(d ?? A.beforeOutsideRef)?.focus())
          }
        }),
      n,
      se &&
        (0, q.jsx)(Ma, {
          'data-type': `inside`,
          ref: re,
          onFocus: (e) => {
            s
              ? Fa(ae()[0])
              : A?.portalNode &&
                (c && (j.current = !0),
                Oi(e, A.portalNode) ? Di(_)?.focus() : Bi(u ?? A.afterOutsideRef)?.focus())
          }
        })
    ]
  })
}
function go(e, t) {
  let n = null,
    r = null,
    i = !1
  return {
    contextElement: e || void 0,
    getBoundingClientRect() {
      let a = e?.getBoundingClientRect() || { width: 0, height: 0, x: 0, y: 0 },
        o = t.axis === `x` || t.axis === `both`,
        s = t.axis === `y` || t.axis === `both`,
        c =
          [`mouseenter`, `mousemove`].includes(t.dataRef.current.openEvent?.type || ``) &&
          t.pointerType !== `touch`,
        l = a.width,
        u = a.height,
        d = a.x,
        f = a.y
      return (
        n == null && t.x && o && (n = a.x - t.x),
        r == null && t.y && s && (r = a.y - t.y),
        (d -= n || 0),
        (f -= r || 0),
        (l = 0),
        (u = 0),
        !i || c
          ? ((l = t.axis === `y` ? a.width : 0),
            (u = t.axis === `x` ? a.height : 0),
            (d = o && t.x != null ? t.x : d),
            (f = s && t.y != null ? t.y : f))
          : i && !c && ((u = t.axis === `x` ? a.height : u), (l = t.axis === `y` ? a.width : l)),
        (i = !0),
        { width: l, height: u, x: d, y: f, top: f, right: d + l, bottom: f + u, left: d }
      )
    }
  }
}
function _o(e) {
  return e != null && e.clientX != null
}
function vo(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    a = n.useState(`domReferenceElement`),
    o = n.context.dataRef,
    { enabled: s = !0, axis: c = `both` } = t,
    l = C.useRef(!1),
    u = C.useRef(null),
    [d, f] = C.useState(),
    [p, m] = C.useState([]),
    h = H((e, t, r) => {
      l.current ||
        (o.current.openEvent && !_o(o.current.openEvent)) ||
        n.set(`positionReference`, go(r ?? a, { x: e, y: t, axis: c, dataRef: o, pointerType: d }))
    }),
    g = H((e) => {
      r ? u.current || m([]) : h(e.clientX, e.clientY, e.currentTarget)
    }),
    _ = jr(d) ? i : r,
    v = C.useCallback(() => {
      if (!_ || !s) return
      let e = Be(i)
      function t(e) {
        J(i, gr(e)) ? (u.current?.(), (u.current = null)) : h(e.clientX, e.clientY)
      }
      if (!o.current.openEvent || _o(o.current.openEvent))
        return (
          (u.current = Y(e, `mousemove`, t)),
          () => {
            ;(u.current?.(), (u.current = null))
          }
        )
      n.set(`positionReference`, a)
    }, [_, s, i, o, a, n, h])
  ;(C.useEffect(() => v(), [v, p]),
    C.useEffect(() => {
      s && !i && (l.current = !1)
    }, [s, i]),
    C.useEffect(() => {
      !s && r && (l.current = !0)
    }, [s, r]))
  let y = C.useMemo(() => {
    function e(e) {
      f(e.pointerType)
    }
    return { onPointerDown: e, onPointerEnter: e, onMouseMove: g, onMouseEnter: g }
  }, [g])
  return C.useMemo(() => (s ? { reference: y, trigger: y } : {}), [s, y])
}
var yo = { intentional: `onClick`, sloppy: `onPointerDown` }
function bo() {
  return !1
}
function xo(e) {
  return {
    escapeKey: typeof e == `boolean` ? e : (e?.escapeKey ?? !1),
    outsidePress: typeof e == `boolean` ? e : (e?.outsidePress ?? !0)
  }
}
function So(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    { dataRef: a } = n.context,
    {
      enabled: o = !0,
      escapeKey: s = !0,
      outsidePress: c = !0,
      outsidePressEvent: l = `sloppy`,
      referencePress: u = bo,
      referencePressEvent: d = `sloppy`,
      bubbles: f,
      externalTree: p
    } = t,
    m = ao(p),
    h = H(typeof c == `function` ? c : () => !1),
    g = typeof c == `function` ? h : c,
    _ = g !== !1,
    v = H(() => l),
    y = C.useRef(!1),
    b = C.useRef(!1),
    x = C.useRef(!1),
    { escapeKey: S, outsidePress: w } = xo(f),
    T = C.useRef(null),
    E = Fi(),
    D = Fi(),
    O = H(() => {
      ;(D.clear(), (a.current.insideReactTree = !1))
    }),
    k = C.useRef(!1),
    A = C.useRef(``),
    j = H(u),
    M = H((e) => {
      if (!r || !o || !s || e.key !== `Escape` || k.current) return
      let t = a.current.floatingContext?.nodeId,
        i = m ? Tr(m.nodesRef.current, t) : []
      if (!S && i.length > 0) {
        let e = !0
        if (
          (i.forEach((t) => {
            t.context?.open && !t.context.dataRef.current.__escapeKeyBubbles && (e = !1)
          }),
          !e)
        )
          return
      }
      let c = aa(na, Or(e) ? e.nativeEvent : e)
      ;(n.setOpen(!1, c), !S && !c.isPropagationAllowed && e.stopPropagation())
    }),
    N = H(() => {
      ;((a.current.insideReactTree = !0), D.start(0, O))
    })
  ;(C.useEffect(() => {
    if (!r || !o) return
    ;((a.current.__escapeKeyBubbles = S), (a.current.__outsidePressBubbles = w))
    let e = new Pi(),
      t = new Pi()
    function c() {
      ;(e.clear(), (k.current = !0))
    }
    function l() {
      e.start(et() ? 5 : 0, () => {
        k.current = !1
      })
    }
    function u() {
      ;((x.current = !0),
        t.start(0, () => {
          x.current = !1
        }))
    }
    function d() {
      ;((y.current = !1), (b.current = !1))
    }
    function f() {
      let e = A.current,
        t = e === `pen` || !e ? `mouse` : e,
        n = v(),
        r = typeof n == `function` ? n() : n
      return typeof r == `string` ? r : r[t]
    }
    function p(e) {
      let t = f()
      return (t === `intentional` && e.type !== `click`) || (t === `sloppy` && e.type === `click`)
    }
    function h(e) {
      let t = a.current.floatingContext?.nodeId,
        r = m && Tr(m.nodesRef.current, t).some((t) => vr(e, t.context?.elements.floating))
      return vr(e, n.select(`floatingElement`)) || vr(e, n.select(`domReferenceElement`)) || r
    }
    function C(e) {
      if (p(e)) {
        O()
        return
      }
      if (a.current.insideReactTree) {
        O()
        return
      }
      let r = gr(e),
        i = `[${Na(`inert`)}]`,
        o = V(r) ? r.getRootNode() : null,
        s = Array.from((We(o) ? o : $n(n.select(`floatingElement`))).querySelectorAll(i)),
        c = n.context.triggerElements
      if (r && (c.hasElement(r) || c.hasMatchingElement((e) => J(e, r)))) return
      let l = V(r) ? r : null
      for (; l && !tt(l); ) {
        let e = it(l)
        if (tt(e) || !V(e)) break
        l = e
      }
      if (
        s.length &&
        V(r) &&
        !yr(r) &&
        !J(r, n.select(`floatingElement`)) &&
        s.every((e) => !J(l, e))
      )
        return
      if (Ue(r) && !(`touches` in e)) {
        let t = tt(r),
          n = nt(r),
          i = /auto|scroll/,
          a = t || i.test(n.overflowX),
          o = t || i.test(n.overflowY),
          s = a && r.clientWidth > 0 && r.scrollWidth > r.clientWidth,
          c = o && r.clientHeight > 0 && r.scrollHeight > r.clientHeight,
          l = n.direction === `rtl`,
          u = c && (l ? e.offsetX <= r.offsetWidth - r.clientWidth : e.offsetX > r.clientWidth),
          d = s && e.offsetY > r.clientHeight
        if (u || d) return
      }
      if (h(e)) return
      if (f() === `intentional` && x.current) {
        ;(t.clear(), (x.current = !1))
        return
      }
      if (typeof g == `function` && !g(e)) return
      let u = a.current.floatingContext?.nodeId,
        d = m ? Tr(m.nodesRef.current, u) : []
      if (d.length > 0) {
        let e = !0
        if (
          (d.forEach((t) => {
            t.context?.open && !t.context.dataRef.current.__outsidePressBubbles && (e = !1)
          }),
          !e)
        )
          return
      }
      ;(n.setOpen(!1, aa($i, e)), O())
    }
    function D(e) {
      f() !== `sloppy` ||
        e.pointerType === `touch` ||
        !n.select(`open`) ||
        !o ||
        vr(e, n.select(`floatingElement`)) ||
        vr(e, n.select(`domReferenceElement`)) ||
        C(e)
    }
    function j(e) {
      if (
        f() !== `sloppy` ||
        !n.select(`open`) ||
        !o ||
        vr(e, n.select(`floatingElement`)) ||
        vr(e, n.select(`domReferenceElement`))
      )
        return
      let t = e.touches[0]
      t &&
        ((T.current = {
          startTime: Date.now(),
          startX: t.clientX,
          startY: t.clientY,
          dismissOnTouchEnd: !1,
          dismissOnMouseDown: !0
        }),
        E.start(1e3, () => {
          T.current && ((T.current.dismissOnTouchEnd = !1), (T.current.dismissOnMouseDown = !1))
        }))
    }
    function N(e, t) {
      let n = gr(e)
      if (!n) return
      let r = Y(n, e.type, () => {
        ;(t(e), r())
      })
    }
    function ee(e) {
      ;((A.current = `touch`), N(e, j))
    }
    function P(e) {
      ;(E.clear(),
        e.type === `pointerdown` && (A.current = e.pointerType),
        !(e.type === `mousedown` && T.current && !T.current.dismissOnMouseDown) &&
          N(e, (e) => {
            e.type === `pointerdown` ? D(e) : C(e)
          }))
    }
    function F(e) {
      if (!y.current) return
      let n = b.current
      if ((d(), f() === `intentional`)) {
        if (e.type === `pointercancel`) {
          n && u()
          return
        }
        if (!h(e)) {
          if (n) {
            u()
            return
          }
          ;(typeof g == `function` && !g(e)) || (t.clear(), (x.current = !0), O())
        }
      }
    }
    function I(e) {
      if (
        f() !== `sloppy` ||
        !T.current ||
        vr(e, n.select(`floatingElement`)) ||
        vr(e, n.select(`domReferenceElement`))
      )
        return
      let t = e.touches[0]
      if (!t) return
      let r = Math.abs(t.clientX - T.current.startX),
        i = Math.abs(t.clientY - T.current.startY),
        a = Math.sqrt(r * r + i * i)
      ;(a > 5 && (T.current.dismissOnTouchEnd = !0),
        a > 10 && (C(e), E.clear(), (T.current = null)))
    }
    function te(e) {
      N(e, I)
    }
    function ne(e) {
      f() !== `sloppy` ||
        !T.current ||
        vr(e, n.select(`floatingElement`)) ||
        vr(e, n.select(`domReferenceElement`)) ||
        (T.current.dismissOnTouchEnd && C(e), E.clear(), (T.current = null))
    }
    function re(e) {
      N(e, ne)
    }
    let L = $n(i),
      R = Da(
        s && Da(Y(L, `keydown`, M), Y(L, `compositionstart`, c), Y(L, `compositionend`, l)),
        _ &&
          Da(
            Y(L, `click`, P, !0),
            Y(L, `pointerdown`, P, !0),
            Y(L, `pointerup`, F, !0),
            Y(L, `pointercancel`, F, !0),
            Y(L, `mousedown`, P, !0),
            Y(L, `mouseup`, F, !0),
            Y(L, `touchstart`, ee, !0),
            Y(L, `touchmove`, te, !0),
            Y(L, `touchend`, re, !0)
          )
      )
    return () => {
      ;(R(), e.clear(), t.clear(), d(), (x.current = !1))
    }
  }, [a, i, s, _, g, r, o, S, w, M, O, v, m, n, E]),
    C.useEffect(O, [g, O]))
  let ee = C.useMemo(
      () => ({
        onKeyDown: M,
        [yo[d]]: (e) => {
          j() && n.setOpen(!1, aa(Xi, e.nativeEvent))
        },
        ...(d !== `intentional` && {
          onClick(e) {
            j() && n.setOpen(!1, aa(`trigger-press`, e.nativeEvent))
          }
        })
      }),
      [M, n, d, j]
    ),
    P = H((e) => {
      if (!r || !o || e.button !== 0) return
      let t = gr(e.nativeEvent)
      J(n.select(`floatingElement`), t) && (y.current || ((y.current = !0), (b.current = !1)))
    }),
    F = H((e) => {
      !r ||
        !o ||
        ((e.defaultPrevented || e.nativeEvent.defaultPrevented) && y.current && (b.current = !0))
    }),
    I = C.useMemo(
      () => ({
        onKeyDown: M,
        onPointerDown: F,
        onMouseDown: F,
        onClickCapture: N,
        onMouseDownCapture(e) {
          ;(N(), P(e))
        },
        onPointerDownCapture(e) {
          ;(N(), P(e))
        },
        onMouseUpCapture: N,
        onTouchEndCapture: N,
        onTouchMoveCapture: N
      }),
      [M, N, P, F]
    )
  return C.useMemo(() => (o ? { reference: ee, floating: I, trigger: ee } : {}), [o, ee, I])
}
function Co(e, t, n) {
  let { reference: r, floating: i } = e,
    a = Kr(t),
    o = qr(t),
    s = Gr(o),
    c = Hr(t),
    l = a === `y`,
    u = r.x + r.width / 2 - i.width / 2,
    d = r.y + r.height / 2 - i.height / 2,
    f = r[s] / 2 - i[s] / 2,
    p
  switch (c) {
    case `top`:
      p = { x: u, y: r.y - i.height }
      break
    case `bottom`:
      p = { x: u, y: r.y + r.height }
      break
    case `right`:
      p = { x: r.x + r.width, y: d }
      break
    case `left`:
      p = { x: r.x - i.width, y: d }
      break
    default:
      p = { x: r.x, y: r.y }
  }
  switch (Ur(t)) {
    case `start`:
      p[o] -= f * (n && l ? -1 : 1)
      break
    case `end`:
      p[o] += f * (n && l ? -1 : 1)
      break
  }
  return p
}
async function wo(e, t) {
  t === void 0 && (t = {})
  let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e,
    {
      boundary: c = `clippingAncestors`,
      rootBoundary: l = `viewport`,
      elementContext: u = `floating`,
      altBoundary: d = !1,
      padding: f = 0
    } = Vr(t, e),
    p = ai(f),
    m = o[d ? (u === `floating` ? `reference` : `floating`) : u],
    h = oi(
      await i.getClippingRect({
        element:
          ((await (i.isElement == null ? void 0 : i.isElement(m))) ?? !0)
            ? m
            : m.contextElement ||
              (await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating))),
        boundary: c,
        rootBoundary: l,
        strategy: s
      })
    ),
    g =
      u === `floating`
        ? { x: n, y: r, width: a.floating.width, height: a.floating.height }
        : a.reference,
    _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)),
    v = ((await (i.isElement == null ? void 0 : i.isElement(_))) &&
      (await (i.getScale == null ? void 0 : i.getScale(_)))) || { x: 1, y: 1 },
    y = oi(
      i.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements: o,
            rect: g,
            offsetParent: _,
            strategy: s
          })
        : g
    )
  return {
    top: (h.top - y.top + p.top) / v.y,
    bottom: (y.bottom - h.bottom + p.bottom) / v.y,
    left: (h.left - y.left + p.left) / v.x,
    right: (y.right - h.right + p.right) / v.x
  }
}
var To = 50,
  Eo = async (e, t, n) => {
    let { placement: r = `bottom`, strategy: i = `absolute`, middleware: a = [], platform: o } = n,
      s = o.detectOverflow ? o : { ...o, detectOverflow: wo },
      c = await (o.isRTL == null ? void 0 : o.isRTL(t)),
      l = await o.getElementRects({ reference: e, floating: t, strategy: i }),
      { x: u, y: d } = Co(l, r, c),
      f = r,
      p = 0,
      m = {}
    for (let n = 0; n < a.length; n++) {
      let h = a[n]
      if (!h) continue
      let { name: g, fn: _ } = h,
        {
          x: v,
          y,
          data: b,
          reset: x
        } = await _({
          x: u,
          y: d,
          initialPlacement: r,
          placement: f,
          strategy: i,
          middlewareData: m,
          rects: l,
          platform: s,
          elements: { reference: e, floating: t }
        })
      ;((u = v ?? u),
        (d = y ?? d),
        (m[g] = { ...m[g], ...b }),
        x &&
          p < To &&
          (p++,
          typeof x == `object` &&
            (x.placement && (f = x.placement),
            x.rects &&
              (l =
                x.rects === !0
                  ? await o.getElementRects({ reference: e, floating: t, strategy: i })
                  : x.rects),
            ({ x: u, y: d } = Co(l, f, c))),
          (n = -1)))
    }
    return { x: u, y: d, placement: f, strategy: i, middlewareData: m }
  },
  Do = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: `flip`,
        options: e,
        async fn(t) {
          var n
          let {
              placement: r,
              middlewareData: i,
              rects: a,
              initialPlacement: o,
              platform: s,
              elements: c
            } = t,
            {
              mainAxis: l = !0,
              crossAxis: u = !0,
              fallbackPlacements: d,
              fallbackStrategy: f = `bestFit`,
              fallbackAxisSideDirection: p = `none`,
              flipAlignment: m = !0,
              ...h
            } = Vr(e, t)
          if ((n = i.arrow) != null && n.alignmentOffset) return {}
          let g = Hr(r),
            _ = Kr(o),
            v = Hr(o) === o,
            y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)),
            b = d || (v || !m ? [ri(o)] : Yr(o)),
            x = p !== `none`
          !d && x && b.push(...ni(o, m, p, y))
          let S = [o, ...b],
            C = await s.detectOverflow(t, h),
            w = [],
            T = i.flip?.overflows || []
          if ((l && w.push(C[g]), u)) {
            let e = Jr(r, a, y)
            w.push(C[e[0]], C[e[1]])
          }
          if (((T = [...T, { placement: r, overflows: w }]), !w.every((e) => e <= 0))) {
            let e = (i.flip?.index || 0) + 1,
              t = S[e]
            if (
              t &&
              (!(u === `alignment` && _ !== Kr(t)) ||
                T.every((e) => (Kr(e.placement) === _ ? e.overflows[0] > 0 : !0)))
            )
              return { data: { index: e, overflows: T }, reset: { placement: t } }
            let n = T.filter((e) => e.overflows[0] <= 0).sort(
              (e, t) => e.overflows[1] - t.overflows[1]
            )[0]?.placement
            if (!n)
              switch (f) {
                case `bestFit`: {
                  let e = T.filter((e) => {
                    if (x) {
                      let t = Kr(e.placement)
                      return t === _ || t === `y`
                    }
                    return !0
                  })
                    .map((e) => [
                      e.placement,
                      e.overflows.filter((e) => e > 0).reduce((e, t) => e + t, 0)
                    ])
                    .sort((e, t) => e[1] - t[1])[0]?.[0]
                  e && (n = e)
                  break
                }
                case `initialPlacement`:
                  n = o
                  break
              }
            if (r !== n) return { reset: { placement: n } }
          }
          return {}
        }
      }
    )
  }
function Oo(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width
  }
}
function ko(e) {
  return Nr.some((t) => e[t] >= 0)
}
var Ao = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: `hide`,
        options: e,
        async fn(t) {
          let { rects: n, platform: r } = t,
            { strategy: i = `referenceHidden`, ...a } = Vr(e, t)
          switch (i) {
            case `referenceHidden`: {
              let e = Oo(
                await r.detectOverflow(t, { ...a, elementContext: `reference` }),
                n.reference
              )
              return { data: { referenceHiddenOffsets: e, referenceHidden: ko(e) } }
            }
            case `escaped`: {
              let e = Oo(await r.detectOverflow(t, { ...a, altBoundary: !0 }), n.floating)
              return { data: { escapedOffsets: e, escaped: ko(e) } }
            }
            default:
              return {}
          }
        }
      }
    )
  },
  jo = new Set([`left`, `top`])
async function Mo(e, t) {
  let { placement: n, platform: r, elements: i } = e,
    a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)),
    o = Hr(n),
    s = Ur(n),
    c = Kr(n) === `y`,
    l = jo.has(o) ? -1 : 1,
    u = a && c ? -1 : 1,
    d = Vr(t, e),
    {
      mainAxis: f,
      crossAxis: p,
      alignmentAxis: m
    } = typeof d == `number`
      ? { mainAxis: d, crossAxis: 0, alignmentAxis: null }
      : { mainAxis: d.mainAxis || 0, crossAxis: d.crossAxis || 0, alignmentAxis: d.alignmentAxis }
  return (
    s && typeof m == `number` && (p = s === `end` ? m * -1 : m),
    c ? { x: p * u, y: f * l } : { x: f * l, y: p * u }
  )
}
var No = function (e) {
    return (
      e === void 0 && (e = 0),
      {
        name: `offset`,
        options: e,
        async fn(t) {
          var n
          let { x: r, y: i, placement: a, middlewareData: o } = t,
            s = await Mo(t, e)
          return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset
            ? {}
            : { x: r + s.x, y: i + s.y, data: { ...s, placement: a } }
        }
      }
    )
  },
  Po = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: `shift`,
        options: e,
        async fn(t) {
          let { x: n, y: r, placement: i, platform: a } = t,
            {
              mainAxis: o = !0,
              crossAxis: s = !1,
              limiter: c = {
                fn: (e) => {
                  let { x: t, y: n } = e
                  return { x: t, y: n }
                }
              },
              ...l
            } = Vr(e, t),
            u = { x: n, y: r },
            d = await a.detectOverflow(t, l),
            f = Kr(Hr(i)),
            p = Wr(f),
            m = u[p],
            h = u[f]
          if (o) {
            let e = p === `y` ? `top` : `left`,
              t = p === `y` ? `bottom` : `right`,
              n = m + d[e],
              r = m - d[t]
            m = Br(n, m, r)
          }
          if (s) {
            let e = f === `y` ? `top` : `left`,
              t = f === `y` ? `bottom` : `right`,
              n = h + d[e],
              r = h - d[t]
            h = Br(n, h, r)
          }
          let g = c.fn({ ...t, [p]: m, [f]: h })
          return { ...g, data: { x: g.x - n, y: g.y - r, enabled: { [p]: o, [f]: s } } }
        }
      }
    )
  },
  Fo = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        options: e,
        fn(t) {
          let { x: n, y: r, placement: i, rects: a, middlewareData: o } = t,
            { offset: s = 0, mainAxis: c = !0, crossAxis: l = !0 } = Vr(e, t),
            u = { x: n, y: r },
            d = Kr(i),
            f = Wr(d),
            p = u[f],
            m = u[d],
            h = Vr(s, t),
            g =
              typeof h == `number`
                ? { mainAxis: h, crossAxis: 0 }
                : { mainAxis: 0, crossAxis: 0, ...h }
          if (c) {
            let e = f === `y` ? `height` : `width`,
              t = a.reference[f] - a.floating[e] + g.mainAxis,
              n = a.reference[f] + a.reference[e] - g.mainAxis
            p < t ? (p = t) : p > n && (p = n)
          }
          if (l) {
            let e = f === `y` ? `width` : `height`,
              t = jo.has(Hr(i)),
              n =
                a.reference[d] -
                a.floating[e] +
                ((t && o.offset?.[d]) || 0) +
                (t ? 0 : g.crossAxis),
              r =
                a.reference[d] +
                a.reference[e] +
                (t ? 0 : o.offset?.[d] || 0) -
                (t ? g.crossAxis : 0)
            m < n ? (m = n) : m > r && (m = r)
          }
          return { [f]: p, [d]: m }
        }
      }
    )
  },
  Io = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: `size`,
        options: e,
        async fn(t) {
          var n, r
          let { placement: i, rects: a, platform: o, elements: s } = t,
            { apply: c = () => {}, ...l } = Vr(e, t),
            u = await o.detectOverflow(t, l),
            d = Hr(i),
            f = Ur(i),
            p = Kr(i) === `y`,
            { width: m, height: h } = a.floating,
            g,
            _
          d === `top` || d === `bottom`
            ? ((g = d),
              (_ =
                f === ((await (o.isRTL == null ? void 0 : o.isRTL(s.floating))) ? `start` : `end`)
                  ? `left`
                  : `right`))
            : ((_ = d), (g = f === `end` ? `top` : `bottom`))
          let v = h - u.top - u.bottom,
            y = m - u.left - u.right,
            b = Pr(h - u[g], v),
            x = Pr(m - u[_], y),
            S = !t.middlewareData.shift,
            C = b,
            w = x
          if (
            ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y),
            (r = t.middlewareData.shift) != null && r.enabled.y && (C = v),
            S && !f)
          ) {
            let e = Fr(u.left, 0),
              t = Fr(u.right, 0),
              n = Fr(u.top, 0),
              r = Fr(u.bottom, 0)
            p
              ? (w = m - 2 * (e !== 0 || t !== 0 ? e + t : Fr(u.left, u.right)))
              : (C = h - 2 * (n !== 0 || r !== 0 ? n + r : Fr(u.top, u.bottom)))
          }
          await c({ ...t, availableWidth: w, availableHeight: C })
          let T = await o.getDimensions(s.floating)
          return m !== T.width || h !== T.height ? { reset: { rects: !0 } } : {}
        }
      }
    )
  }
function Lo(e) {
  let t = nt(e),
    n = parseFloat(t.width) || 0,
    r = parseFloat(t.height) || 0,
    i = Ue(e),
    a = i ? e.offsetWidth : n,
    o = i ? e.offsetHeight : r,
    s = Ir(n) !== a || Ir(r) !== o
  return (s && ((n = a), (r = o)), { width: n, height: r, $: s })
}
function Ro(e) {
  return V(e) ? e : e.contextElement
}
function zo(e) {
  let t = Ro(e)
  if (!Ue(t)) return Rr(1)
  let n = t.getBoundingClientRect(),
    { width: r, height: i, $: a } = Lo(t),
    o = (a ? Ir(n.width) : n.width) / r,
    s = (a ? Ir(n.height) : n.height) / i
  return (
    (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), { x: o, y: s }
  )
}
var Bo = Rr(0)
function Vo(e) {
  let t = Be(e)
  return !et() || !t.visualViewport
    ? Bo
    : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop }
}
function Ho(e, t, n) {
  return (t === void 0 && (t = !1), !n || (t && n !== Be(e)) ? !1 : t)
}
function Uo(e, t, n, r) {
  ;(t === void 0 && (t = !1), n === void 0 && (n = !1))
  let i = e.getBoundingClientRect(),
    a = Ro(e),
    o = Rr(1)
  t && (r ? V(r) && (o = zo(r)) : (o = zo(e)))
  let s = Ho(a, n, r) ? Vo(a) : Rr(0),
    c = (i.left + s.x) / o.x,
    l = (i.top + s.y) / o.y,
    u = i.width / o.x,
    d = i.height / o.y
  if (a) {
    let e = Be(a),
      t = r && V(r) ? Be(r) : r,
      n = e,
      i = st(n)
    for (; i && r && t !== n; ) {
      let e = zo(i),
        t = i.getBoundingClientRect(),
        r = nt(i),
        a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x,
        o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y
      ;((c *= e.x),
        (l *= e.y),
        (u *= e.x),
        (d *= e.y),
        (c += a),
        (l += o),
        (n = Be(i)),
        (i = st(n)))
    }
  }
  return oi({ width: u, height: d, x: c, y: l })
}
function Wo(e, t) {
  let n = rt(e).scrollLeft
  return t ? t.left + n : Uo(Ve(e)).left + n
}
function Go(e, t) {
  let n = e.getBoundingClientRect()
  return { x: n.left + t.scrollLeft - Wo(e, n), y: n.top + t.scrollTop }
}
function Ko(e) {
  let { elements: t, rect: n, offsetParent: r, strategy: i } = e,
    a = i === `fixed`,
    o = Ve(r),
    s = t ? qe(t.floating) : !1
  if (r === o || (s && a)) return n
  let c = { scrollLeft: 0, scrollTop: 0 },
    l = Rr(1),
    u = Rr(0),
    d = Ue(r)
  if ((d || (!d && !a)) && ((ze(r) !== `body` || Ge(o)) && (c = rt(r)), d)) {
    let e = Uo(r)
    ;((l = zo(r)), (u.x = e.x + r.clientLeft), (u.y = e.y + r.clientTop))
  }
  let f = o && !d && !a ? Go(o, c) : Rr(0)
  return {
    width: n.width * l.x,
    height: n.height * l.y,
    x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
    y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
  }
}
function qo(e) {
  return Array.from(e.getClientRects())
}
function Jo(e) {
  let t = Ve(e),
    n = rt(e),
    r = e.ownerDocument.body,
    i = Fr(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth),
    a = Fr(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight),
    o = -n.scrollLeft + Wo(e),
    s = -n.scrollTop
  return (
    nt(r).direction === `rtl` && (o += Fr(t.clientWidth, r.clientWidth) - i),
    { width: i, height: a, x: o, y: s }
  )
}
var Yo = 25
function Xo(e, t) {
  let n = Be(e),
    r = Ve(e),
    i = n.visualViewport,
    a = r.clientWidth,
    o = r.clientHeight,
    s = 0,
    c = 0
  if (i) {
    ;((a = i.width), (o = i.height))
    let e = et()
    ;(!e || (e && t === `fixed`)) && ((s = i.offsetLeft), (c = i.offsetTop))
  }
  let l = Wo(r)
  if (l <= 0) {
    let e = r.ownerDocument,
      t = e.body,
      n = getComputedStyle(t),
      i =
        (e.compatMode === `CSS1Compat` && parseFloat(n.marginLeft) + parseFloat(n.marginRight)) ||
        0,
      o = Math.abs(r.clientWidth - t.clientWidth - i)
    o <= Yo && (a -= o)
  } else l <= Yo && (a += l)
  return { width: a, height: o, x: s, y: c }
}
function Zo(e, t) {
  let n = Uo(e, !0, t === `fixed`),
    r = n.top + e.clientTop,
    i = n.left + e.clientLeft,
    a = Ue(e) ? zo(e) : Rr(1)
  return { width: e.clientWidth * a.x, height: e.clientHeight * a.y, x: i * a.x, y: r * a.y }
}
function Qo(e, t, n) {
  let r
  if (t === `viewport`) r = Xo(e, n)
  else if (t === `document`) r = Jo(Ve(e))
  else if (V(t)) r = Zo(t, n)
  else {
    let n = Vo(e)
    r = { x: t.x - n.x, y: t.y - n.y, width: t.width, height: t.height }
  }
  return oi(r)
}
function $o(e, t) {
  let n = it(e)
  return n === t || !V(n) || tt(n) ? !1 : nt(n).position === `fixed` || $o(n, t)
}
function es(e, t) {
  let n = t.get(e)
  if (n) return n
  let r = ot(e, [], !1).filter((e) => V(e) && ze(e) !== `body`),
    i = null,
    a = nt(e).position === `fixed`,
    o = a ? it(e) : e
  for (; V(o) && !tt(o); ) {
    let t = nt(o),
      n = Qe(o)
    ;(!n && t.position === `fixed` && (i = null),
      (
        a
          ? !n && !i
          : (!n &&
              t.position === `static` &&
              i &&
              (i.position === `absolute` || i.position === `fixed`)) ||
            (Ge(o) && !n && $o(e, o))
      )
        ? (r = r.filter((e) => e !== o))
        : (i = t),
      (o = it(o)))
  }
  return (t.set(e, r), r)
}
function ts(e) {
  let { element: t, boundary: n, rootBoundary: r, strategy: i } = e,
    a = [...(n === `clippingAncestors` ? (qe(t) ? [] : es(t, this._c)) : [].concat(n)), r],
    o = Qo(t, a[0], i),
    s = o.top,
    c = o.right,
    l = o.bottom,
    u = o.left
  for (let e = 1; e < a.length; e++) {
    let n = Qo(t, a[e], i)
    ;((s = Fr(n.top, s)), (c = Pr(n.right, c)), (l = Pr(n.bottom, l)), (u = Fr(n.left, u)))
  }
  return { width: c - u, height: l - s, x: u, y: s }
}
function ns(e) {
  let { width: t, height: n } = Lo(e)
  return { width: t, height: n }
}
function rs(e, t, n) {
  let r = Ue(t),
    i = Ve(t),
    a = n === `fixed`,
    o = Uo(e, !0, a, t),
    s = { scrollLeft: 0, scrollTop: 0 },
    c = Rr(0)
  function l() {
    c.x = Wo(i)
  }
  if (r || (!r && !a))
    if (((ze(t) !== `body` || Ge(i)) && (s = rt(t)), r)) {
      let e = Uo(t, !0, a, t)
      ;((c.x = e.x + t.clientLeft), (c.y = e.y + t.clientTop))
    } else i && l()
  a && !r && i && l()
  let u = i && !r && !a ? Go(i, s) : Rr(0)
  return {
    x: o.left + s.scrollLeft - c.x - u.x,
    y: o.top + s.scrollTop - c.y - u.y,
    width: o.width,
    height: o.height
  }
}
function is(e) {
  return nt(e).position === `static`
}
function as(e, t) {
  if (!Ue(e) || nt(e).position === `fixed`) return null
  if (t) return t(e)
  let n = e.offsetParent
  return (Ve(e) === n && (n = n.ownerDocument.body), n)
}
function os(e, t) {
  let n = Be(e)
  if (qe(e)) return n
  if (!Ue(e)) {
    let t = it(e)
    for (; t && !tt(t); ) {
      if (V(t) && !is(t)) return t
      t = it(t)
    }
    return n
  }
  let r = as(e, t)
  for (; r && Ke(r) && is(r); ) r = as(r, t)
  return r && tt(r) && is(r) && !Qe(r) ? n : r || $e(e) || n
}
var ss = async function (e) {
  let t = this.getOffsetParent || os,
    n = this.getDimensions,
    r = await n(e.floating)
  return {
    reference: rs(e.reference, await t(e.floating), e.strategy),
    floating: { x: 0, y: 0, width: r.width, height: r.height }
  }
}
function cs(e) {
  return nt(e).direction === `rtl`
}
var ls = {
  convertOffsetParentRelativeRectToViewportRelativeRect: Ko,
  getDocumentElement: Ve,
  getClippingRect: ts,
  getOffsetParent: os,
  getElementRects: ss,
  getClientRects: qo,
  getDimensions: ns,
  getScale: zo,
  isElement: V,
  isRTL: cs
}
function us(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height
}
function ds(e, t) {
  let n = null,
    r,
    i = Ve(e)
  function a() {
    var e
    ;(clearTimeout(r), (e = n) == null || e.disconnect(), (n = null))
  }
  function o(s, c) {
    ;(s === void 0 && (s = !1), c === void 0 && (c = 1), a())
    let l = e.getBoundingClientRect(),
      { left: u, top: d, width: f, height: p } = l
    if ((s || t(), !f || !p)) return
    let m = Lr(d),
      h = Lr(i.clientWidth - (u + f)),
      g = Lr(i.clientHeight - (d + p)),
      _ = Lr(u),
      v = {
        rootMargin: -m + `px ` + -h + `px ` + -g + `px ` + -_ + `px`,
        threshold: Fr(0, Pr(1, c)) || 1
      },
      y = !0
    function b(t) {
      let n = t[0].intersectionRatio
      if (n !== c) {
        if (!y) return o()
        n
          ? o(!1, n)
          : (r = setTimeout(() => {
              o(!1, 1e-7)
            }, 1e3))
      }
      ;(n === 1 && !us(l, e.getBoundingClientRect()) && o(), (y = !1))
    }
    try {
      n = new IntersectionObserver(b, { ...v, root: i.ownerDocument })
    } catch {
      n = new IntersectionObserver(b, v)
    }
    n.observe(e)
  }
  return (o(!0), a)
}
function fs(e, t, n, r) {
  r === void 0 && (r = {})
  let {
      ancestorScroll: i = !0,
      ancestorResize: a = !0,
      elementResize: o = typeof ResizeObserver == `function`,
      layoutShift: s = typeof IntersectionObserver == `function`,
      animationFrame: c = !1
    } = r,
    l = Ro(e),
    u = i || a ? [...(l ? ot(l) : []), ...(t ? ot(t) : [])] : []
  u.forEach((e) => {
    ;(i && e.addEventListener(`scroll`, n, { passive: !0 }), a && e.addEventListener(`resize`, n))
  })
  let d = l && s ? ds(l, n) : null,
    f = -1,
    p = null
  o &&
    ((p = new ResizeObserver((e) => {
      let [r] = e
      ;(r &&
        r.target === l &&
        p &&
        t &&
        (p.unobserve(t),
        cancelAnimationFrame(f),
        (f = requestAnimationFrame(() => {
          var e
          ;(e = p) == null || e.observe(t)
        }))),
        n())
    })),
    l && !c && p.observe(l),
    t && p.observe(t))
  let m,
    h = c ? Uo(e) : null
  c && g()
  function g() {
    let t = Uo(e)
    ;(h && !us(h, t) && n(), (h = t), (m = requestAnimationFrame(g)))
  }
  return (
    n(),
    () => {
      var e
      ;(u.forEach((e) => {
        ;(i && e.removeEventListener(`scroll`, n), a && e.removeEventListener(`resize`, n))
      }),
        d?.(),
        (e = p) == null || e.disconnect(),
        (p = null),
        c && cancelAnimationFrame(m))
    }
  )
}
var ps = No,
  ms = Po,
  hs = Do,
  gs = Io,
  _s = Ao,
  vs = Fo,
  ys = (e, t, n) => {
    let r = new Map(),
      i = { platform: ls, ...n },
      a = { ...i.platform, _c: r }
    return Eo(e, t, { ...i, platform: a })
  },
  bs = typeof document < `u` ? C.useLayoutEffect : function () {}
function xs(e, t) {
  if (e === t) return !0
  if (typeof e != typeof t) return !1
  if (typeof e == `function` && e.toString() === t.toString()) return !0
  let n, r, i
  if (e && t && typeof e == `object`) {
    if (Array.isArray(e)) {
      if (((n = e.length), n !== t.length)) return !1
      for (r = n; r-- !== 0; ) if (!xs(e[r], t[r])) return !1
      return !0
    }
    if (((i = Object.keys(e)), (n = i.length), n !== Object.keys(t).length)) return !1
    for (r = n; r-- !== 0; ) if (!{}.hasOwnProperty.call(t, i[r])) return !1
    for (r = n; r-- !== 0; ) {
      let n = i[r]
      if (!(n === `_owner` && e.$$typeof) && !xs(e[n], t[n])) return !1
    }
    return !0
  }
  return e !== e && t !== t
}
function Ss(e) {
  return typeof window > `u` ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1
}
function Cs(e, t) {
  let n = Ss(e)
  return Math.round(t * n) / n
}
function ws(e) {
  let t = C.useRef(e)
  return (
    bs(() => {
      t.current = e
    }),
    t
  )
}
function Ts(e) {
  e === void 0 && (e = {})
  let {
      placement: t = `bottom`,
      strategy: n = `absolute`,
      middleware: r = [],
      platform: i,
      elements: { reference: a, floating: o } = {},
      transform: s = !0,
      whileElementsMounted: c,
      open: l
    } = e,
    [u, d] = C.useState({
      x: 0,
      y: 0,
      strategy: n,
      placement: t,
      middlewareData: {},
      isPositioned: !1
    }),
    [f, p] = C.useState(r)
  xs(f, r) || p(r)
  let [m, h] = C.useState(null),
    [g, _] = C.useState(null),
    v = C.useCallback((e) => {
      e !== S.current && ((S.current = e), h(e))
    }, []),
    y = C.useCallback((e) => {
      e !== w.current && ((w.current = e), _(e))
    }, []),
    b = a || m,
    x = o || g,
    S = C.useRef(null),
    w = C.useRef(null),
    T = C.useRef(u),
    E = c != null,
    D = ws(c),
    O = ws(i),
    k = ws(l),
    A = C.useCallback(() => {
      if (!S.current || !w.current) return
      let e = { placement: t, strategy: n, middleware: f }
      ;(O.current && (e.platform = O.current),
        ys(S.current, w.current, e).then((e) => {
          let t = { ...e, isPositioned: k.current !== !1 }
          j.current &&
            !xs(T.current, t) &&
            ((T.current = t),
            Gi.flushSync(() => {
              d(t)
            }))
        }))
    }, [f, t, n, O, k])
  bs(() => {
    l === !1 &&
      T.current.isPositioned &&
      ((T.current.isPositioned = !1), d((e) => ({ ...e, isPositioned: !1 })))
  }, [l])
  let j = C.useRef(!1)
  ;(bs(
    () => (
      (j.current = !0),
      () => {
        j.current = !1
      }
    ),
    []
  ),
    bs(() => {
      if ((b && (S.current = b), x && (w.current = x), b && x)) {
        if (D.current) return D.current(b, x, A)
        A()
      }
    }, [b, x, A, D, E]))
  let M = C.useMemo(() => ({ reference: S, floating: w, setReference: v, setFloating: y }), [v, y]),
    N = C.useMemo(() => ({ reference: b, floating: x }), [b, x]),
    ee = C.useMemo(() => {
      let e = { position: n, left: 0, top: 0 }
      if (!N.floating) return e
      let t = Cs(N.floating, u.x),
        r = Cs(N.floating, u.y)
      return s
        ? {
            ...e,
            transform: `translate(` + t + `px, ` + r + `px)`,
            ...(Ss(N.floating) >= 1.5 && { willChange: `transform` })
          }
        : { position: n, left: t, top: r }
    }, [n, s, N.floating, u.x, u.y])
  return C.useMemo(
    () => ({ ...u, update: A, refs: M, elements: N, floatingStyles: ee }),
    [u, A, M, N, ee]
  )
}
var Es = (e, t) => {
    let n = ps(e)
    return { name: n.name, fn: n.fn, options: [e, t] }
  },
  Ds = (e, t) => {
    let n = ms(e)
    return { name: n.name, fn: n.fn, options: [e, t] }
  },
  Os = (e, t) => ({ fn: vs(e).fn, options: [e, t] }),
  ks = (e, t) => {
    let n = hs(e)
    return { name: n.name, fn: n.fn, options: [e, t] }
  },
  As = (e, t) => {
    let n = gs(e)
    return { name: n.name, fn: n.fn, options: [e, t] }
  },
  js = (e, t) => {
    let n = _s(e)
    return { name: n.name, fn: n.fn, options: [e, t] }
  },
  Z = (e, t, n, r, i, a, ...o) => {
    if (o.length > 0) throw Error(ce(1))
    let s
    if (e && t && n && r && i && a)
      s = (o, s, c, l) =>
        a(e(o, s, c, l), t(o, s, c, l), n(o, s, c, l), r(o, s, c, l), i(o, s, c, l), s, c, l)
    else if (e && t && n && r && i)
      s = (a, o, s, c) => i(e(a, o, s, c), t(a, o, s, c), n(a, o, s, c), r(a, o, s, c), o, s, c)
    else if (e && t && n && r)
      s = (i, a, o, s) => r(e(i, a, o, s), t(i, a, o, s), n(i, a, o, s), a, o, s)
    else if (e && t && n) s = (r, i, a, o) => n(e(r, i, a, o), t(r, i, a, o), i, a, o)
    else if (e && t) s = (n, r, i, a) => t(e(n, r, i, a), r, i, a)
    else if (e) s = e
    else throw Error(`Missing arguments`)
    return s
  },
  Ms = o((e) => {
    var t = f()
    function n(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t)
    }
    var r = typeof Object.is == `function` ? Object.is : n,
      i = t.useState,
      a = t.useEffect,
      o = t.useLayoutEffect,
      s = t.useDebugValue
    function c(e, t) {
      var n = t(),
        r = i({ inst: { value: n, getSnapshot: t } }),
        c = r[0].inst,
        u = r[1]
      return (
        o(
          function () {
            ;((c.value = n), (c.getSnapshot = t), l(c) && u({ inst: c }))
          },
          [e, n, t]
        ),
        a(
          function () {
            return (
              l(c) && u({ inst: c }),
              e(function () {
                l(c) && u({ inst: c })
              })
            )
          },
          [e]
        ),
        s(n),
        n
      )
    }
    function l(e) {
      var t = e.getSnapshot
      e = e.value
      try {
        var n = t()
        return !r(e, n)
      } catch {
        return !0
      }
    }
    function u(e, t) {
      return t()
    }
    var d =
      typeof window > `u` || window.document === void 0 || window.document.createElement === void 0
        ? u
        : c
    e.useSyncExternalStore = t.useSyncExternalStore === void 0 ? d : t.useSyncExternalStore
  }),
  Ns = o((e, t) => {
    t.exports = Ms()
  }),
  Ps = o((e) => {
    var t = f(),
      n = Ns()
    function r(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t)
    }
    var i = typeof Object.is == `function` ? Object.is : r,
      a = n.useSyncExternalStore,
      o = t.useRef,
      s = t.useEffect,
      c = t.useMemo,
      l = t.useDebugValue
    e.useSyncExternalStoreWithSelector = function (e, t, n, r, u) {
      var d = o(null)
      if (d.current === null) {
        var f = { hasValue: !1, value: null }
        d.current = f
      } else f = d.current
      d = c(
        function () {
          function e(e) {
            if (!a) {
              if (((a = !0), (o = e), (e = r(e)), u !== void 0 && f.hasValue)) {
                var t = f.value
                if (u(t, e)) return (s = t)
              }
              return (s = e)
            }
            if (((t = s), i(o, e))) return t
            var n = r(e)
            return u !== void 0 && u(t, n) ? ((o = e), t) : ((o = e), (s = n))
          }
          var a = !1,
            o,
            s,
            c = n === void 0 ? null : n
          return [
            function () {
              return e(t())
            },
            c === null
              ? void 0
              : function () {
                  return e(c())
                }
          ]
        },
        [t, n, r, u]
      )
      var p = a(e, d[0], d[1])
      return (
        s(
          function () {
            ;((f.hasValue = !0), (f.value = p))
          },
          [p]
        ),
        l(p),
        p
      )
    }
  }),
  Fs = o((e, t) => {
    t.exports = Ps()
  }),
  Is = [],
  Ls = void 0
function Rs() {
  return Ls
}
function zs(e) {
  Is.push(e)
}
function Bs(e) {
  let t = (t, n) => {
    let r = ue(Hs).current,
      i
    try {
      Ls = r
      for (let e of Is) e.before(r)
      i = e(t, n)
      for (let e of Is) e.after(r)
      r.didInitialize = !0
    } finally {
      Ls = void 0
    }
    return i
  }
  return ((t.displayName = e.displayName || e.name), t)
}
function Vs(e) {
  return C.forwardRef(Bs(e))
}
function Hs() {
  return { didInitialize: !1 }
}
var Us = Ns(),
  Ws = Fs(),
  Gs = ve(19) ? Js : Ys
function Ks(e, t, n, r, i) {
  return Gs(e, t, n, r, i)
}
function qs(e, t, n, r, i) {
  let a = C.useCallback(() => t(e.getSnapshot(), n, r, i), [e, t, n, r, i])
  return (0, Us.useSyncExternalStore)(e.subscribe, a, a)
}
zs({
  before(e) {
    ;((e.syncIndex = 0),
      e.didInitialize ||
        ((e.syncTick = 1),
        (e.syncHooks = []),
        (e.didChangeStore = !0),
        (e.getSnapshot = () => {
          let t = !1
          for (let n = 0; n < e.syncHooks.length; n += 1) {
            let r = e.syncHooks[n],
              i = r.selector(r.store.state, r.a1, r.a2, r.a3)
            ;(r.didChange || !Object.is(r.value, i)) &&
              ((t = !0), (r.value = i), (r.didChange = !1))
          }
          return (t && (e.syncTick += 1), e.syncTick)
        })))
  },
  after(e) {
    e.syncHooks.length > 0 &&
      (e.didChangeStore &&
        ((e.didChangeStore = !1),
        (e.subscribe = (t) => {
          let n = new Set()
          for (let t of e.syncHooks) n.add(t.store)
          let r = []
          for (let e of n) r.push(e.subscribe(t))
          return () => {
            for (let e of r) e()
          }
        })),
      (0, Us.useSyncExternalStore)(e.subscribe, e.getSnapshot, e.getSnapshot))
  }
})
function Js(e, t, n, r, i) {
  let a = Rs()
  if (!a) return qs(e, t, n, r, i)
  let o = a.syncIndex
  a.syncIndex += 1
  let s
  return (
    a.didInitialize
      ? ((s = a.syncHooks[o]),
        (s.store !== e ||
          s.selector !== t ||
          !Object.is(s.a1, n) ||
          !Object.is(s.a2, r) ||
          !Object.is(s.a3, i)) &&
          (s.store !== e && (a.didChangeStore = !0),
          (s.store = e),
          (s.selector = t),
          (s.a1 = n),
          (s.a2 = r),
          (s.a3 = i),
          (s.didChange = !0)))
      : ((s = {
          store: e,
          selector: t,
          a1: n,
          a2: r,
          a3: i,
          value: t(e.getSnapshot(), n, r, i),
          didChange: !1
        }),
        a.syncHooks.push(s)),
    s.value
  )
}
function Ys(e, t, n, r, i) {
  return (0, Ws.useSyncExternalStoreWithSelector)(e.subscribe, e.getSnapshot, e.getSnapshot, (e) =>
    t(e, n, r, i)
  )
}
var Xs = class {
    constructor(e) {
      ;((this.state = e), (this.listeners = new Set()), (this.updateTick = 0))
    }
    subscribe = (e) => (
      this.listeners.add(e),
      () => {
        this.listeners.delete(e)
      }
    )
    getSnapshot = () => this.state
    setState(e) {
      if (this.state === e) return
      ;((this.state = e), (this.updateTick += 1))
      let t = this.updateTick
      for (let n of this.listeners) {
        if (t !== this.updateTick) return
        n(e)
      }
    }
    update(e) {
      for (let t in e)
        if (!Object.is(this.state[t], e[t])) {
          this.setState({ ...this.state, ...e })
          return
        }
    }
    set(e, t) {
      Object.is(this.state[e], t) || this.setState({ ...this.state, [e]: t })
    }
    notifyAll() {
      let e = { ...this.state }
      this.setState(e)
    }
    use(e, t, n, r) {
      return Ks(this, e, t, n, r)
    }
  },
  Zs = class extends Xs {
    constructor(e, t = {}, n) {
      ;(super(e), (this.context = t), (this.selectors = n))
    }
    useSyncedValue(e, t) {
      ;(C.useDebugValue(e),
        U(() => {
          this.state[e] !== t && this.set(e, t)
        }, [e, t]))
    }
    useSyncedValueWithCleanup(e, t) {
      let n = this
      U(
        () => (
          n.state[e] !== t && n.set(e, t),
          () => {
            n.set(e, void 0)
          }
        ),
        [n, e, t]
      )
    }
    useSyncedValues(e) {
      let t = this
      U(() => {
        t.update(e)
      }, [t, ...Object.values(e)])
    }
    useControlledProp(e, t) {
      C.useDebugValue(e)
      let n = t !== void 0
      U(() => {
        n && !Object.is(this.state[e], t) && super.setState({ ...this.state, [e]: t })
      }, [e, t, n])
    }
    select(e, t, n, r) {
      let i = this.selectors[e]
      return i(this.state, t, n, r)
    }
    useState(e, t, n, r) {
      return (C.useDebugValue(e), Ks(this, this.selectors[e], t, n, r))
    }
    useContextCallback(e, t) {
      C.useDebugValue(e)
      let n = H(t ?? be)
      this.context[e] = n
    }
    useStateSetter(e) {
      let t = C.useRef(void 0)
      return (
        t.current === void 0 &&
          (t.current = (t) => {
            this.set(e, t)
          }),
        t.current
      )
    }
    observe(e, t) {
      let n
      n = typeof e == `function` ? e : this.selectors[e]
      let r = n(this.state)
      return (
        t(r, r, this),
        this.subscribe((e) => {
          let i = n(e)
          if (!Object.is(r, i)) {
            let e = r
            ;((r = i), t(i, e, this))
          }
        })
      )
    }
  },
  Qs = {
    open: Z((e) => e.open),
    transitionStatus: Z((e) => e.transitionStatus),
    domReferenceElement: Z((e) => e.domReferenceElement),
    referenceElement: Z((e) => e.positionReference ?? e.referenceElement),
    floatingElement: Z((e) => e.floatingElement),
    floatingId: Z((e) => e.floatingId)
  },
  $s = class extends Zs {
    constructor(e) {
      let { syncOnly: t, nested: n, onOpenChange: r, triggerElements: i, ...a } = e
      ;(super(
        { ...a, positionReference: a.referenceElement, domReferenceElement: a.referenceElement },
        { onOpenChange: r, dataRef: { current: {} }, events: no(), nested: n, triggerElements: i },
        Qs
      ),
        (this.syncOnly = t))
    }
    syncOpenEvent = (e, t) => {
      ;(!e || !this.state.open || (t != null && Mr(t))) &&
        (this.context.dataRef.current.openEvent = e ? t : void 0)
    }
    dispatchOpenChange = (e, t) => {
      this.syncOpenEvent(e, t.event)
      let n = {
        open: e,
        reason: t.reason,
        nativeEvent: t.event,
        nested: this.context.nested,
        triggerElement: t.trigger
      }
      this.context.events.emit(`openchange`, n)
    }
    setOpen = (e, t) => {
      if (this.syncOnly) {
        this.context.onOpenChange?.(e, t)
        return
      }
      ;(this.dispatchOpenChange(e, t), this.context.onOpenChange?.(e, t))
    }
  }
function ec(e, t) {
  let n = C.useRef(null),
    r = C.useRef(null)
  return C.useCallback(
    (i) => {
      if (e !== void 0) {
        if (n.current !== null) {
          let e = n.current,
            i = r.current,
            a = t.context.triggerElements.getById(e)
          ;(i && a === i && t.context.triggerElements.delete(e),
            (n.current = null),
            (r.current = null))
        }
        i !== null && ((n.current = e), (r.current = i), t.context.triggerElements.add(e, i))
      }
    },
    [t, e]
  )
}
function tc(e, t, n, r) {
  let i = n.useState(`isMountedByTrigger`, e),
    a = ec(e, n),
    o = H((t) => {
      if ((a(t), !t || !n.select(`open`))) return
      let i = n.select(`activeTriggerId`)
      if (i === e) {
        n.update({ activeTriggerElement: t, ...r })
        return
      }
      i ?? n.update({ activeTriggerId: e, activeTriggerElement: t, ...r })
    })
  return (
    U(() => {
      i && n.update({ activeTriggerElement: t.current, ...r })
    }, [i, n, t, ...Object.values(r)]),
    { registerTrigger: o, isMountedByThisTrigger: i }
  )
}
function nc(e) {
  let t = e.useState(`open`)
  U(() => {
    if (t && !e.select(`activeTriggerId`) && e.context.triggerElements.size === 1) {
      let t = e.context.triggerElements.entries().next()
      if (!t.done) {
        let [n, r] = t.value
        e.update({ activeTriggerId: n, activeTriggerElement: r })
      }
    }
  }, [t, e])
}
function rc(e, t, n) {
  let { mounted: r, setMounted: i, transitionStatus: a } = Ji(e)
  t.useSyncedValues({ mounted: r, transitionStatus: a })
  let o = H(() => {
    ;(i(!1),
      t.update({ activeTriggerId: null, activeTriggerElement: null, mounted: !1 }),
      n?.(),
      t.context.onOpenChangeComplete?.(!1))
  })
  return (
    qi({
      enabled: !t.useState(`preventUnmountingOnClose`),
      open: e,
      ref: t.context.popupRef,
      onComplete() {
        e || o()
      }
    }),
    { forceUnmount: o, transitionStatus: a }
  )
}
var ic = class {
  constructor() {
    ;((this.elementsSet = new Set()), (this.idMap = new Map()))
  }
  add(e, t) {
    let n = this.idMap.get(e)
    n !== t &&
      (n !== void 0 && this.elementsSet.delete(n), this.elementsSet.add(t), this.idMap.set(e, t))
  }
  delete(e) {
    let t = this.idMap.get(e)
    t && (this.elementsSet.delete(t), this.idMap.delete(e))
  }
  hasElement(e) {
    return this.elementsSet.has(e)
  }
  hasMatchingElement(e) {
    for (let t of this.elementsSet) if (e(t)) return !0
    return !1
  }
  getById(e) {
    return this.idMap.get(e)
  }
  entries() {
    return this.idMap.entries()
  }
  elements() {
    return this.elementsSet.values()
  }
  get size() {
    return this.idMap.size
  }
}
function ac() {
  return new $s({
    open: !1,
    transitionStatus: void 0,
    floatingElement: null,
    referenceElement: null,
    triggerElements: new ic(),
    floatingId: ``,
    syncOnly: !1,
    nested: !1,
    onOpenChange: void 0
  })
}
function oc() {
  return {
    open: !1,
    openProp: void 0,
    mounted: !1,
    transitionStatus: void 0,
    floatingRootContext: ac(),
    preventUnmountingOnClose: !1,
    payload: void 0,
    activeTriggerId: null,
    activeTriggerElement: null,
    triggerIdProp: void 0,
    popupElement: null,
    positionerElement: null,
    activeTriggerProps: xe,
    inactiveTriggerProps: xe,
    popupProps: xe
  }
}
var sc = Z((e) => e.triggerIdProp ?? e.activeTriggerId),
  cc = {
    open: Z((e) => e.openProp ?? e.open),
    mounted: Z((e) => e.mounted),
    transitionStatus: Z((e) => e.transitionStatus),
    floatingRootContext: Z((e) => e.floatingRootContext),
    preventUnmountingOnClose: Z((e) => e.preventUnmountingOnClose),
    payload: Z((e) => e.payload),
    activeTriggerId: sc,
    activeTriggerElement: Z((e) => (e.mounted ? e.activeTriggerElement : null)),
    isTriggerActive: Z((e, t) => t !== void 0 && sc(e) === t),
    isOpenedByTrigger: Z((e, t) => t !== void 0 && sc(e) === t && e.open),
    isMountedByTrigger: Z((e, t) => t !== void 0 && sc(e) === t && e.mounted),
    triggerProps: Z((e, t) => (t ? e.activeTriggerProps : e.inactiveTriggerProps)),
    popupProps: Z((e) => e.popupProps),
    popupElement: Z((e) => e.popupElement),
    positionerElement: Z((e) => e.positionerElement)
  }
function lc(e) {
  let { open: t = !1, onOpenChange: n, elements: r = {} } = e,
    i = Zn(),
    a = io() != null,
    o = ue(
      () =>
        new $s({
          open: t,
          transitionStatus: void 0,
          onOpenChange: n,
          referenceElement: r.reference ?? null,
          floatingElement: r.floating ?? null,
          triggerElements: new ic(),
          floatingId: i,
          syncOnly: !1,
          nested: a
        })
    ).current
  return (
    U(() => {
      let e = { open: t, floatingId: i }
      ;(r.reference !== void 0 &&
        ((e.referenceElement = r.reference),
        (e.domReferenceElement = V(r.reference) ? r.reference : null)),
        r.floating !== void 0 && (e.floatingElement = r.floating),
        o.update(e))
    }, [t, i, r.reference, r.floating, o]),
    (o.context.onOpenChange = n),
    (o.context.nested = a),
    o
  )
}
function uc(e = {}) {
  let { nodeId: t, externalTree: n } = e,
    r = lc(e),
    i = e.rootContext || r,
    a = {
      reference: i.useState(`referenceElement`),
      floating: i.useState(`floatingElement`),
      domReference: i.useState(`domReferenceElement`)
    },
    [o, s] = C.useState(null),
    c = C.useRef(null),
    l = ao(n)
  U(() => {
    a.domReference && (c.current = a.domReference)
  }, [a.domReference])
  let u = Ts({ ...e, elements: { ...a, ...(o && { reference: o }) } }),
    d = C.useCallback(
      (e) => {
        let t = V(e)
          ? {
              getBoundingClientRect: () => e.getBoundingClientRect(),
              getClientRects: () => e.getClientRects(),
              contextElement: e
            }
          : e
        ;(s(t), u.refs.setReference(t))
      },
      [u.refs]
    ),
    [f, p] = C.useState(void 0),
    [m, h] = C.useState(null)
  i.useSyncedValue(`referenceElement`, f ?? null)
  let g = V(f) ? f : null
  ;(i.useSyncedValue(`domReferenceElement`, f === void 0 ? a.domReference : g),
    i.useSyncedValue(`floatingElement`, m))
  let _ = C.useCallback(
      (e) => {
        ;((V(e) || e === null) && ((c.current = e), p(e)),
          (V(u.refs.reference.current) ||
            u.refs.reference.current === null ||
            (e !== null && !V(e))) &&
            u.refs.setReference(e))
      },
      [u.refs, p]
    ),
    v = C.useCallback(
      (e) => {
        ;(h(e), u.refs.setFloating(e))
      },
      [u.refs]
    ),
    y = C.useMemo(
      () => ({
        ...u.refs,
        setReference: _,
        setFloating: v,
        setPositionReference: d,
        domReference: c
      }),
      [u.refs, _, v, d]
    ),
    b = C.useMemo(
      () => ({ ...u.elements, domReference: a.domReference }),
      [u.elements, a.domReference]
    ),
    x = i.useState(`open`),
    S = i.useState(`floatingId`),
    w = C.useMemo(
      () => ({
        ...u,
        dataRef: i.context.dataRef,
        open: x,
        onOpenChange: i.setOpen,
        events: i.context.events,
        floatingId: S,
        refs: y,
        elements: b,
        nodeId: t,
        rootStore: i
      }),
      [u, y, b, t, i, x, S]
    )
  return (
    U(() => {
      i.context.dataRef.current.floatingContext = w
      let e = l?.nodesRef.current.find((e) => e.id === t)
      e && (e.context = w)
    }),
    C.useMemo(() => ({ ...u, context: w, refs: y, elements: b, rootStore: i }), [u, y, b, w, i])
  )
}
function dc(e) {
  let { popupStore: t, treatPopupAsFloatingElement: n = !1, onOpenChange: r } = e,
    i = Zn(),
    a = io() != null,
    o = t.useState(`open`),
    s = t.useState(`activeTriggerElement`),
    c = t.useState(n ? `popupElement` : `positionerElement`),
    l = t.context.triggerElements,
    u = ue(
      () =>
        new $s({
          open: o,
          transitionStatus: void 0,
          referenceElement: s,
          floatingElement: c,
          triggerElements: l,
          onOpenChange: r,
          floatingId: i,
          syncOnly: !0,
          nested: a
        })
    ).current
  return (
    U(() => {
      let e = { open: o, floatingId: i, referenceElement: s, floatingElement: c }
      ;(V(s) && (e.domReferenceElement = s),
        u.state.positionReference === u.state.referenceElement && (e.positionReference = s),
        u.update(e))
    }, [o, i, s, c, u]),
    (u.context.onOpenChange = r),
    (u.context.nested = a),
    u
  )
}
var fc = cr && or
function pc(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    { events: r, dataRef: i } = n.context,
    { enabled: a = !0, delay: o } = t,
    s = C.useRef(!1),
    c = C.useRef(null),
    l = Fi(),
    u = C.useRef(!0)
  ;(C.useEffect(() => {
    let e = n.select(`domReferenceElement`)
    if (!a) return
    let t = Be(e)
    function r() {
      let e = n.select(`domReferenceElement`)
      !n.select(`open`) && Ue(e) && e === hr($n(e)) && (s.current = !0)
    }
    function i() {
      u.current = !0
    }
    function o() {
      u.current = !1
    }
    return Da(Y(t, `blur`, r), fc && Y(t, `keydown`, i, !0), fc && Y(t, `pointerdown`, o, !0))
  }, [n, a]),
    C.useEffect(() => {
      if (!a) return
      function e(e) {
        if (e.reason === `trigger-press` || e.reason === `escape-key`) {
          let e = n.select(`domReferenceElement`)
          V(e) && ((c.current = e), (s.current = !0))
        }
      }
      return (
        r.on(`openchange`, e),
        () => {
          r.off(`openchange`, e)
        }
      )
    }, [r, a, n]))
  let d = C.useMemo(
    () => ({
      onMouseLeave() {
        ;((s.current = !1), (c.current = null))
      },
      onFocus(e) {
        let t = e.currentTarget
        if (s.current) {
          if (c.current === t) return
          ;((s.current = !1), (c.current = null))
        }
        let r = gr(e.nativeEvent)
        if (V(r)) {
          if (fc && !e.relatedTarget) {
            if (!u.current && !br(r)) return
          } else if (!Cr(r)) return
        }
        let i = _r(e.relatedTarget, n.context.triggerElements),
          { nativeEvent: a, currentTarget: d } = e,
          f = typeof o == `function` ? o() : o
        if ((n.select(`open`) && i) || f === 0 || f === void 0) {
          n.setOpen(!0, aa(Qi, a, d))
          return
        }
        l.start(f, () => {
          s.current || n.setOpen(!0, aa(Qi, a, d))
        })
      },
      onBlur(e) {
        ;((s.current = !1), (c.current = null))
        let t = e.relatedTarget,
          r = e.nativeEvent,
          a = V(t) && t.hasAttribute(Na(`focus-guard`)) && t.getAttribute(`data-type`) === `outside`
        l.start(0, () => {
          let e = n.select(`domReferenceElement`),
            o = hr($n(e))
          ;(!t && o === e) ||
            J(i.current.floatingContext?.refs.floating.current, o) ||
            J(e, o) ||
            a ||
            _r(t ?? o, n.context.triggerElements) ||
            n.setOpen(!1, aa(Qi, r))
        })
      }
    }),
    [i, n, l, o]
  )
  return C.useMemo(() => (a ? { reference: d, trigger: d } : {}), [a, d])
}
var mc = class e {
    constructor() {
      ;((this.pointerType = void 0),
        (this.interactedInside = !1),
        (this.handler = void 0),
        (this.blockMouseMove = !0),
        (this.performedPointerEventsMutation = !1),
        (this.pointerEventsScopeElement = null),
        (this.pointerEventsReferenceElement = null),
        (this.pointerEventsFloatingElement = null),
        (this.restTimeoutPending = !1),
        (this.openChangeTimeout = new Pi()),
        (this.restTimeout = new Pi()),
        (this.handleCloseOptions = void 0))
    }
    static create() {
      return new e()
    }
    dispose = () => {
      ;(this.openChangeTimeout.clear(), this.restTimeout.clear())
    }
    disposeEffect = () => this.dispose
  },
  hc = new WeakMap()
function gc(e) {
  if (!e.performedPointerEventsMutation) return
  let t = e.pointerEventsScopeElement
  ;(t &&
    hc.get(t) === e &&
    (e.pointerEventsScopeElement?.style.removeProperty(`pointer-events`),
    e.pointerEventsReferenceElement?.style.removeProperty(`pointer-events`),
    e.pointerEventsFloatingElement?.style.removeProperty(`pointer-events`),
    hc.delete(t)),
    (e.performedPointerEventsMutation = !1),
    (e.pointerEventsScopeElement = null),
    (e.pointerEventsReferenceElement = null),
    (e.pointerEventsFloatingElement = null))
}
function _c(e, t) {
  let { scopeElement: n, referenceElement: r, floatingElement: i } = t,
    a = hc.get(n)
  ;(a && a !== e && gc(a),
    gc(e),
    (e.performedPointerEventsMutation = !0),
    (e.pointerEventsScopeElement = n),
    (e.pointerEventsReferenceElement = r),
    (e.pointerEventsFloatingElement = i),
    hc.set(n, e),
    (n.style.pointerEvents = `none`),
    (r.style.pointerEvents = `auto`),
    (i.style.pointerEvents = `auto`))
}
function vc(e) {
  let t = ue(mc.create).current,
    n = e.context.dataRef.current
  return (
    (n.hoverInteractionState ||= t),
    Mi(n.hoverInteractionState.disposeEffect),
    n.hoverInteractionState
  )
}
function yc(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    a = n.useState(`domReferenceElement`),
    { dataRef: o } = n.context,
    { enabled: s = !0, closeDelay: c = 0, nodeId: l } = t,
    u = vc(n),
    d = ao(),
    f = io(),
    p = H(() => Ca(o.current.openEvent?.type, u.interactedInside)),
    m = H(() => {
      let e = o.current.openEvent?.type
      return e?.includes(`mouse`) && e !== `mousedown`
    }),
    h = H((e) => _r(e, n.context.triggerElements)),
    g = C.useCallback(
      (e) => {
        let t = xa(c, `close`, u.pointerType),
          r = () => {
            ;(n.setOpen(!1, aa(Zi, e)), d?.events.emit(`floating.closed`, e))
          }
        t ? u.openChangeTimeout.start(t, r) : (u.openChangeTimeout.clear(), r())
      },
      [c, n, u, d]
    ),
    _ = H(() => {
      gc(u)
    }),
    v = H((e) => {
      let t = gr(e)
      if (!xr(t)) {
        u.interactedInside = !1
        return
      }
      u.interactedInside = t?.closest(`[aria-haspopup]`) != null
    })
  ;(U(() => {
    r || ((u.pointerType = void 0), (u.restTimeoutPending = !1), (u.interactedInside = !1), _())
  }, [r, u, _]),
    C.useEffect(() => _, [_]),
    U(() => {
      if (s && r && u.handleCloseOptions?.blockPointerEvents && m() && V(a) && i) {
        let e = a,
          t = i,
          n = $n(i),
          r = d?.nodesRef.current.find((e) => e.id === f)?.context?.elements.floating
        return (
          r && (r.style.pointerEvents = ``),
          _c(u, {
            scopeElement:
              u.handleCloseOptions?.getScope?.() ??
              u.pointerEventsScopeElement ??
              r ??
              e.closest(`[data-rootownerid]`) ??
              n.body,
            referenceElement: e,
            floatingElement: t
          }),
          () => {
            _()
          }
        )
      }
    }, [s, r, a, i, u, m, d, f, _]))
  let y = Fi()
  C.useEffect(() => {
    if (!s) return
    function e() {
      ;(u.openChangeTimeout.clear(), y.clear(), d?.events.off(`floating.closed`, r), _())
    }
    function t(e) {
      if (d && f && Tr(d.nodesRef.current, f).length > 0) {
        d.events.on(`floating.closed`, r)
        return
      }
      if (h(e.relatedTarget)) return
      let t = o.current.floatingContext?.nodeId ?? l,
        n = e.relatedTarget
      if (
        !(
          d &&
          t &&
          V(n) &&
          Tr(d.nodesRef.current, t, !1).some((e) => J(e.context?.elements.floating, n))
        )
      ) {
        if (u.handler) {
          u.handler(e)
          return
        }
        ;(_(), p() || g(e))
      }
    }
    function r(e) {
      !d ||
        !f ||
        Tr(d.nodesRef.current, f).length > 0 ||
        y.start(0, () => {
          ;(d.events.off(`floating.closed`, r),
            n.setOpen(!1, aa(Zi, e)),
            d.events.emit(`floating.closed`, e))
        })
    }
    let a = i
    return Da(
      a && Y(a, `mouseenter`, e),
      a && Y(a, `mouseleave`, t),
      a && Y(a, `pointerdown`, v, !0),
      () => {
        d?.events.off(`floating.closed`, r)
      }
    )
  }, [s, i, n, o, l, p, h, g, _, v, u, d, f, y])
}
var bc = { current: null }
function xc(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    { dataRef: r, events: i } = n.context,
    {
      enabled: a = !0,
      delay: o = 0,
      handleClose: s = null,
      mouseOnly: c = !1,
      restMs: l = 0,
      move: u = !0,
      triggerElementRef: d = bc,
      externalTree: f,
      isActiveTrigger: p = !0,
      getHandleCloseContext: m,
      isClosing: h
    } = t,
    g = ao(f),
    _ = vc(n),
    v = C.useRef(!1),
    y = Oa(s),
    b = Oa(o),
    x = Oa(l),
    S = Oa(a),
    w = Oa(h)
  p && (_.handleCloseOptions = y.current?.__options)
  let T = H(() => Ca(r.current.openEvent?.type, _.interactedInside)),
    E = H((e) => _r(e, n.context.triggerElements)),
    D = H((e, t, r) => {
      let i = n.context.triggerElements
      if (i.hasElement(t)) return !e || !J(e, t)
      if (!V(r)) return !1
      let a = r
      return i.hasMatchingElement((e) => J(e, a)) && (!e || !J(e, a))
    }),
    O = H((e, t = !0) => {
      let r = xa(b.current, `close`, _.pointerType)
      r
        ? _.openChangeTimeout.start(r, () => {
            ;(n.setOpen(!1, aa(Zi, e)), g?.events.emit(`floating.closed`, e))
          })
        : t &&
          (_.openChangeTimeout.clear(),
          n.setOpen(!1, aa(Zi, e)),
          g?.events.emit(`floating.closed`, e))
    }),
    k = H(() => {
      _.handler &&=
        ($n(n.select(`domReferenceElement`)).removeEventListener(`mousemove`, _.handler), void 0)
    }),
    A = H(() => {
      gc(_)
    })
  return (
    C.useEffect(() => k, [k]),
    C.useEffect(() => {
      if (!a) return
      function e(e) {
        e.open
          ? (v.current = !1)
          : ((v.current = e.reason === Zi),
            k(),
            _.openChangeTimeout.clear(),
            _.restTimeout.clear(),
            (_.blockMouseMove = !0),
            (_.restTimeoutPending = !1))
      }
      return (
        i.on(`openchange`, e),
        () => {
          i.off(`openchange`, e)
        }
      )
    }, [a, i, _, k]),
    C.useEffect(() => {
      if (!a) return
      let e = d.current ?? (p ? n.select(`domReferenceElement`) : null)
      if (!V(e)) return
      function t(e) {
        if ((_.openChangeTimeout.clear(), (_.blockMouseMove = !1), c && !jr(_.pointerType))) return
        let t = Sa(x.current),
          r = xa(b.current, `open`, _.pointerType),
          i = gr(e),
          a = e.currentTarget ?? null,
          o = n.select(`domReferenceElement`),
          s = a
        if (V(i) && !n.context.triggerElements.hasElement(i)) {
          for (let e of n.context.triggerElements.elements())
            if (J(e, i)) {
              s = e
              break
            }
        }
        V(a) && V(o) && !n.context.triggerElements.hasElement(a) && J(a, o) && (s = o)
        let l = s == null ? !1 : D(o, s, i),
          u = n.select(`open`),
          d = w.current?.() ?? n.select(`transitionStatus`) === `ending`,
          f = !u && d && v.current,
          p = !l && V(s) && V(o) && J(o, s) && f,
          m = t > 0 && !r,
          h = (l && (u || f)) || p,
          g = !u || l
        if (h) {
          n.setOpen(!0, aa(Zi, e, s))
          return
        }
        m ||
          (r
            ? _.openChangeTimeout.start(r, () => {
                g && n.setOpen(!0, aa(Zi, e, s))
              })
            : g && n.setOpen(!0, aa(Zi, e, s)))
      }
      function i(e) {
        if (T()) {
          A()
          return
        }
        k()
        let t = $n(n.select(`domReferenceElement`))
        ;(_.restTimeout.clear(), (_.restTimeoutPending = !1))
        let i = r.current.floatingContext ?? m?.()
        if (!E(e.relatedTarget)) {
          if (y.current && i) {
            n.select(`open`) || _.openChangeTimeout.clear()
            let r = d.current
            ;((_.handler = y.current({
              ...i,
              tree: g,
              x: e.clientX,
              y: e.clientY,
              onClose() {
                ;(A(), k(), S.current && !T() && r === n.select(`domReferenceElement`) && O(e, !0))
              }
            })),
              t.addEventListener(`mousemove`, _.handler),
              _.handler(e))
            return
          }
          ;(_.pointerType !== `touch` || !J(n.select(`floatingElement`), e.relatedTarget)) && O(e)
        }
      }
      return u
        ? Da(Y(e, `mousemove`, t, { once: !0 }), Y(e, `mouseenter`, t), Y(e, `mouseleave`, i))
        : Da(Y(e, `mouseenter`, t), Y(e, `mouseleave`, i))
    }, [k, A, r, b, O, n, a, y, _, p, D, T, E, c, u, x, d, g, S, m, w]),
    C.useMemo(() => {
      if (!a) return
      function e(e) {
        _.pointerType = e.pointerType
      }
      return {
        onPointerDown: e,
        onPointerEnter: e,
        onMouseMove(e) {
          let { nativeEvent: t } = e,
            r = e.currentTarget,
            i = n.select(`domReferenceElement`),
            a = n.select(`open`),
            o = D(i, r, e.target)
          if (c && !jr(_.pointerType)) return
          if (a && o && _.handleCloseOptions?.blockPointerEvents) {
            let e = n.select(`floatingElement`)
            e &&
              _c(_, {
                scopeElement: _.handleCloseOptions?.getScope?.() ?? r.ownerDocument.body,
                referenceElement: r,
                floatingElement: e
              })
          }
          let s = Sa(x.current)
          if (
            (a && !o) ||
            s === 0 ||
            (!o && _.restTimeoutPending && e.movementX ** 2 + e.movementY ** 2 < 2)
          )
            return
          _.restTimeout.clear()
          function l() {
            if (((_.restTimeoutPending = !1), T())) return
            let e = n.select(`open`)
            !_.blockMouseMove && (!e || o) && n.setOpen(!0, aa(Zi, t, r))
          }
          _.pointerType === `touch`
            ? Gi.flushSync(() => {
                l()
              })
            : o && a
              ? l()
              : ((_.restTimeoutPending = !0), _.restTimeout.start(s, l))
        }
      }
    }, [a, _, T, D, c, n, x])
  )
}
function Sc(e = []) {
  let t = e.map((e) => e?.reference),
    n = e.map((e) => e?.floating),
    r = e.map((e) => e?.item),
    i = e.map((e) => e?.trigger),
    a = C.useCallback((t) => Cc(t, e, `reference`), t),
    o = C.useCallback((t) => Cc(t, e, `floating`), n),
    s = C.useCallback((t) => Cc(t, e, `item`), r),
    c = C.useCallback((t) => Cc(t, e, `trigger`), i)
  return C.useMemo(
    () => ({ getReferenceProps: a, getFloatingProps: o, getItemProps: s, getTriggerProps: c }),
    [a, o, s, c]
  )
}
function Cc(e, t, n) {
  let r = new Map(),
    i = n === `item`,
    a = {}
  n === `floating` && ((a.tabIndex = -1), (a[pr] = ``))
  for (let t in e) (i && e && (t === `active` || t === `selected`)) || (a[t] = e[t])
  for (let o = 0; o < t.length; o += 1) {
    let s,
      c = t[o]?.[n]
    ;((s = typeof c == `function` ? (e ? c(e) : null) : c), s && wc(a, s, i, r))
  }
  return (wc(a, e, i, r), a)
}
function wc(e, t, n, r) {
  for (let i in t) {
    let a = t[i]
    ;(n && (i === `active` || i === `selected`)) ||
      (i.startsWith(`on`)
        ? (r.has(i) || r.set(i, []),
          typeof a == `function` &&
            (r.get(i)?.push(a),
            (e[i] = (...e) =>
              r
                .get(i)
                ?.map((t) => t(...e))
                .find((e) => e !== void 0))))
        : (e[i] = a))
  }
}
var Tc = new Map([
  [`select`, `listbox`],
  [`combobox`, `listbox`],
  [`label`, !1]
])
function Ec(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingId`),
    a = n.useState(`domReferenceElement`),
    o = n.useState(`floatingElement`),
    { role: s = `dialog` } = t,
    c = Zn(),
    l = a?.id || c,
    u = C.useMemo(() => wr(o)?.id || i, [o, i]),
    d = Tc.get(s) ?? s,
    f = io() != null,
    p = C.useMemo(
      () =>
        d === `tooltip` || s === `label`
          ? xe
          : {
              'aria-haspopup': d === `alertdialog` ? `dialog` : d,
              'aria-expanded': `false`,
              ...(d === `listbox` && { role: `combobox` }),
              ...(d === `menu` && f && { role: `menuitem` }),
              ...(s === `select` && { 'aria-autocomplete': `none` }),
              ...(s === `combobox` && { 'aria-autocomplete': `list` })
            },
      [d, f, s]
    ),
    m = C.useMemo(
      () =>
        d === `tooltip` || s === `label`
          ? { [`aria-${s === `label` ? `labelledby` : `describedby`}`]: r ? u : void 0 }
          : {
              ...p,
              'aria-expanded': r ? `true` : `false`,
              'aria-controls': r ? u : void 0,
              ...(d === `menu` && { id: l })
            },
      [d, u, r, l, s, p]
    ),
    h = C.useMemo(() => {
      let e = { id: u, ...(d && { role: d }) }
      return d === `tooltip` || s === `label`
        ? e
        : { ...e, ...(d === `menu` && { 'aria-labelledby': l }) }
    }, [d, u, l, s]),
    g = C.useCallback(
      ({ active: e, selected: t }) => {
        let n = { role: `option`, ...(e && { id: `${u}-fui-option` }) }
        switch (s) {
          case `select`:
          case `combobox`:
            return { ...n, 'aria-selected': t }
          default:
        }
        return {}
      },
      [u, s]
    )
  return C.useMemo(() => ({ reference: m, floating: h, item: g, trigger: p }), [m, h, p, g])
}
var Dc = 0.1,
  Oc = Dc * Dc,
  kc = 0.5
function Ac(e, t, n, r, i, a) {
  return r >= t != a >= t && e <= ((i - n) * (t - r)) / (a - r) + n
}
function jc(e, t, n, r, i, a, o, s, c, l) {
  let u = !1
  return (
    Ac(e, t, n, r, i, a) && (u = !u),
    Ac(e, t, i, a, o, s) && (u = !u),
    Ac(e, t, o, s, c, l) && (u = !u),
    Ac(e, t, c, l, n, r) && (u = !u),
    u
  )
}
function Mc(e, t, n) {
  return e >= n.x && e <= n.x + n.width && t >= n.y && t <= n.y + n.height
}
function Nc(e, t, n, r, i, a) {
  return e >= Math.min(n, i) && e <= Math.max(n, i) && t >= Math.min(r, a) && t <= Math.max(r, a)
}
function Pc(e = {}) {
  let { blockPointerEvents: t = !1 } = e,
    n = new Pi(),
    r = ({ x: e, y: t, placement: r, elements: i, onClose: a, nodeId: o, tree: s }) => {
      let c = r?.split(`-`)[0],
        l = !1,
        u = null,
        d = null,
        f = typeof performance < `u` ? performance.now() : 0
      function p(e, t) {
        let n = performance.now(),
          r = n - f
        if (u === null || d === null || r === 0) return ((u = e), (d = t), (f = n), !1)
        let i = e - u,
          a = t - d,
          o = i * i + a * a,
          s = r * r * Oc
        return ((u = e), (d = t), (f = n), o < s)
      }
      function m() {
        ;(n.clear(), a())
      }
      return function (r) {
        n.clear()
        let a = i.domReference,
          u = i.floating
        if (!a || !u || c == null || e == null || t == null) return
        let { clientX: d, clientY: f } = r,
          h = gr(r),
          g = r.type === `mouseleave`,
          _ = J(u, h),
          v = J(a, h)
        if (_ && ((l = !0), !g)) return
        if (v && ((l = !1), !g)) {
          l = !0
          return
        }
        if (g && V(r.relatedTarget) && J(u, r.relatedTarget)) return
        function y() {
          return !!(s && Tr(s.nodesRef.current, o).length > 0)
        }
        function b() {
          y() || m()
        }
        if (y()) return
        let x = a.getBoundingClientRect(),
          S = u.getBoundingClientRect(),
          C = e > S.right - S.width / 2,
          w = t > S.bottom - S.height / 2,
          T = S.width > x.width,
          E = S.height > x.height,
          D = (T ? x : S).left,
          O = (T ? x : S).right,
          k = (E ? x : S).top,
          A = (E ? x : S).bottom
        if (
          (c === `top` && t >= x.bottom - 1) ||
          (c === `bottom` && t <= x.top + 1) ||
          (c === `left` && e >= x.right - 1) ||
          (c === `right` && e <= x.left + 1)
        ) {
          b()
          return
        }
        let j = !1
        switch (c) {
          case `top`:
            j = Nc(d, f, D, x.top + 1, O, S.bottom - 1)
            break
          case `bottom`:
            j = Nc(d, f, D, S.top + 1, O, x.bottom - 1)
            break
          case `left`:
            j = Nc(d, f, S.right - 1, A, x.left + 1, k)
            break
          case `right`:
            j = Nc(d, f, x.right - 1, A, S.left + 1, k)
            break
          default:
        }
        if (j) return
        if (l && !Mc(d, f, x)) {
          b()
          return
        }
        if (!g && p(d, f)) {
          b()
          return
        }
        let M = !1
        switch (c) {
          case `top`: {
            let n = T ? kc / 2 : kc * 4,
              r = T || C ? e + n : e - n,
              i = T ? e - n : C ? e + n : e - n,
              a = t + kc + 1,
              o = C || T ? S.bottom - kc : S.top,
              s = C ? (T ? S.bottom - kc : S.top) : S.bottom - kc
            M = jc(d, f, r, a, i, a, S.left, o, S.right, s)
            break
          }
          case `bottom`: {
            let n = T ? kc / 2 : kc * 4,
              r = T || C ? e + n : e - n,
              i = T ? e - n : C ? e + n : e - n,
              a = t - kc,
              o = C || T ? S.top + kc : S.bottom,
              s = C ? (T ? S.top + kc : S.bottom) : S.top + kc
            M = jc(d, f, r, a, i, a, S.left, o, S.right, s)
            break
          }
          case `left`: {
            let n = E ? kc / 2 : kc * 4,
              r = E || w ? t + n : t - n,
              i = E ? t - n : w ? t + n : t - n,
              a = e + kc + 1,
              o = w || E ? S.right - kc : S.left,
              s = w ? (E ? S.right - kc : S.left) : S.right - kc
            M = jc(d, f, o, S.top, s, S.bottom, a, r, a, i)
            break
          }
          case `right`: {
            let n = E ? kc / 2 : kc * 4,
              r = E || w ? t + n : t - n,
              i = E ? t - n : w ? t + n : t - n,
              a = e - kc,
              o = w || E ? S.left + kc : S.right,
              s = w ? (E ? S.left + kc : S.right) : S.left + kc
            M = jc(d, f, a, r, a, i, o, S.top, s, S.bottom)
            break
          }
          default:
        }
        M ? l || n.start(40, b) : b()
      }
    }
  return ((r.__options = { ...e, blockPointerEvents: t }), r)
}
var Fc = (function (e) {
    return ((e.nestedDialogs = `--nested-dialogs`), e)
  })({}),
  Ic = (function (e) {
    return (
      (e[(e.open = ca.open)] = `open`),
      (e[(e.closed = ca.closed)] = `closed`),
      (e[(e.startingStyle = ca.startingStyle)] = `startingStyle`),
      (e[(e.endingStyle = ca.endingStyle)] = `endingStyle`),
      (e.nested = `data-nested`),
      (e.nestedDialogOpen = `data-nested-dialog-open`),
      e
    )
  })({}),
  Lc = C.createContext(void 0)
function Rc() {
  let e = C.useContext(Lc)
  if (e === void 0) throw Error(ce(26))
  return e
}
var zc = `ArrowUp`,
  Bc = `ArrowDown`,
  Vc = `ArrowLeft`,
  Hc = `ArrowRight`,
  Uc = `Home`,
  Wc = new Set([Vc, Hc]),
  Gc = new Set([zc, Bc]),
  Kc = new Set([...Wc, ...Gc])
new Set([...Kc, Uc, `End`])
var qc = new Set([zc, Bc, Vc, Hc, Uc, `End`]),
  Jc = {
    ...ha,
    ...Wi,
    nestedDialogOpen(e) {
      return e ? { [Ic.nestedDialogOpen]: `` } : null
    }
  },
  Yc = C.forwardRef(function (e, t) {
    let { className: n, finalFocus: r, initialFocus: i, render: a, style: o, ...s } = e,
      { store: c } = sa(),
      l = c.useState(`descriptionElementId`),
      u = c.useState(`disablePointerDismissal`),
      d = c.useState(`floatingRootContext`),
      f = c.useState(`popupProps`),
      p = c.useState(`modal`),
      m = c.useState(`mounted`),
      h = c.useState(`nested`),
      g = c.useState(`nestedOpenDialogCount`),
      _ = c.useState(`open`),
      v = c.useState(`openMethod`),
      y = c.useState(`titleElementId`),
      b = c.useState(`transitionStatus`),
      x = c.useState(`role`)
    ;(Rc(),
      qi({
        open: _,
        ref: c.context.popupRef,
        onComplete() {
          _ && c.context.onOpenChangeComplete?.(!0)
        }
      }))
    function S(e) {
      return e === `touch` ? c.context.popupRef.current : !0
    }
    let C = i === void 0 ? S : i,
      w = Te(`div`, e, {
        state: { open: _, nested: h, transitionStatus: b, nestedDialogOpen: g > 0 },
        props: [
          f,
          {
            'aria-labelledby': y ?? void 0,
            'aria-describedby': l ?? void 0,
            role: x,
            tabIndex: -1,
            hidden: !m,
            onKeyDown(e) {
              qc.has(e.key) && e.stopPropagation()
            },
            style: { [Fc.nestedDialogs]: g }
          },
          s
        ],
        ref: [t, c.context.popupRef, c.useStateSetter(`popupElement`)],
        stateAttributesMapping: Jc
      })
    return (0, q.jsx)(ho, {
      context: d,
      openInteractionType: v,
      disabled: !m,
      closeOnFocusOut: !u,
      initialFocus: C,
      returnFocus: r,
      modal: p !== !1,
      restoreFocus: `popup`,
      children: w
    })
  })
function Xc(e) {
  return ve(19) ? e : e ? `true` : void 0
}
var Zc = C.forwardRef(function (e, t) {
    let { cutout: n, ...r } = e,
      i
    if (n) {
      let e = n.getBoundingClientRect()
      i = `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${e.left}px ${e.top}px,${e.left}px ${e.bottom}px,${e.right}px ${e.bottom}px,${e.right}px ${e.top}px,${e.left}px ${e.top}px)`
    }
    return (0, q.jsx)(`div`, {
      ref: t,
      role: `presentation`,
      'data-base-ui-inert': ``,
      ...r,
      style: {
        position: `fixed`,
        inset: 0,
        userSelect: `none`,
        WebkitUserSelect: `none`,
        clipPath: i
      }
    })
  }),
  Qc = C.forwardRef(function (e, t) {
    let { keepMounted: n = !1, ...r } = e,
      { store: i } = sa(),
      a = i.useState(`mounted`),
      o = i.useState(`modal`),
      s = i.useState(`open`)
    return a || n
      ? (0, q.jsx)(Lc.Provider, {
          value: n,
          children: (0, q.jsxs)(to, {
            ref: t,
            ...r,
            children: [
              a &&
                o === !0 &&
                (0, q.jsx)(Zc, { ref: i.context.internalBackdropRef, inert: Xc(!s) }),
              e.children
            ]
          })
        })
      : null
  })
function $c(e) {
  let t = C.useRef(!0)
  t.current && ((t.current = !1), e())
}
var el = {},
  tl = {},
  nl = ``
function rl(e) {
  if (typeof document > `u`) return !1
  let t = $n(e)
  return Be(t).innerWidth - t.documentElement.clientWidth > 0
}
function il(e) {
  if (
    !(typeof CSS < `u` && CSS.supports && CSS.supports(`scrollbar-gutter`, `stable`)) ||
    typeof document > `u`
  )
    return !1
  let t = $n(e),
    n = t.documentElement,
    r = t.body,
    i = Ge(n) ? n : r,
    a = i.style.overflowY,
    o = n.style.scrollbarGutter
  ;((n.style.scrollbarGutter = `stable`), (i.style.overflowY = `scroll`))
  let s = i.offsetWidth
  i.style.overflowY = `hidden`
  let c = i.offsetWidth
  return ((i.style.overflowY = a), (n.style.scrollbarGutter = o), s === c)
}
function al(e) {
  let t = $n(e),
    n = t.documentElement,
    r = t.body,
    i = Ge(n) ? n : r,
    a = { overflowY: i.style.overflowY, overflowX: i.style.overflowX }
  return (
    Object.assign(i.style, { overflowY: `hidden`, overflowX: `hidden` }),
    () => {
      Object.assign(i.style, a)
    }
  )
}
function ol(e) {
  let t = $n(e),
    n = t.documentElement,
    r = t.body,
    i = Be(n),
    a = 0,
    o = 0,
    s = !1,
    c = Ri.create()
  if (ir && (i.visualViewport?.scale ?? 1) !== 1) return () => {}
  function l() {
    let t = i.getComputedStyle(n),
      c = i.getComputedStyle(r),
      l = (t.scrollbarGutter || ``).includes(`both-edges`) ? `stable both-edges` : `stable`
    ;((a = n.scrollTop),
      (o = n.scrollLeft),
      (el = {
        scrollbarGutter: n.style.scrollbarGutter,
        overflowY: n.style.overflowY,
        overflowX: n.style.overflowX
      }),
      (nl = n.style.scrollBehavior),
      (tl = {
        position: r.style.position,
        height: r.style.height,
        width: r.style.width,
        boxSizing: r.style.boxSizing,
        overflowY: r.style.overflowY,
        overflowX: r.style.overflowX,
        scrollBehavior: r.style.scrollBehavior
      }))
    let u = n.scrollHeight > n.clientHeight,
      d = n.scrollWidth > n.clientWidth,
      f = t.overflowY === `scroll` || c.overflowY === `scroll`,
      p = t.overflowX === `scroll` || c.overflowX === `scroll`,
      m = Math.max(0, i.innerWidth - r.clientWidth),
      h = Math.max(0, i.innerHeight - r.clientHeight),
      g = parseFloat(c.marginTop) + parseFloat(c.marginBottom),
      _ = parseFloat(c.marginLeft) + parseFloat(c.marginRight),
      v = Ge(n) ? n : r
    if (((s = il(e)), s)) {
      ;((n.style.scrollbarGutter = l),
        (v.style.overflowY = `hidden`),
        (v.style.overflowX = `hidden`))
      return
    }
    ;(Object.assign(n.style, { scrollbarGutter: l, overflowY: `hidden`, overflowX: `hidden` }),
      (u || f) && (n.style.overflowY = `scroll`),
      (d || p) && (n.style.overflowX = `scroll`),
      Object.assign(r.style, {
        position: `relative`,
        height: g || h ? `calc(100dvh - ${g + h}px)` : `100dvh`,
        width: _ || m ? `calc(100vw - ${_ + m}px)` : `100vw`,
        boxSizing: `border-box`,
        overflow: `hidden`,
        scrollBehavior: `unset`
      }),
      (r.scrollTop = a),
      (r.scrollLeft = o),
      n.setAttribute(`data-base-ui-scroll-locked`, ``),
      (n.style.scrollBehavior = `unset`))
  }
  function u() {
    ;(Object.assign(n.style, el),
      Object.assign(r.style, tl),
      s ||
        ((n.scrollTop = a),
        (n.scrollLeft = o),
        n.removeAttribute(`data-base-ui-scroll-locked`),
        (n.style.scrollBehavior = nl)))
  }
  function d() {
    ;(u(), c.request(l))
  }
  l()
  let f = Y(i, `resize`, d)
  return () => {
    ;(c.cancel(), u(), typeof i.removeEventListener == `function` && f())
  }
}
var sl = new (class {
  lockCount = 0
  restore = null
  timeoutLock = Pi.create()
  timeoutUnlock = Pi.create()
  acquire(e) {
    return (
      (this.lockCount += 1),
      this.lockCount === 1 &&
        this.restore === null &&
        this.timeoutLock.start(0, () => this.lock(e)),
      this.release
    )
  }
  release = () => {
    ;(--this.lockCount,
      this.lockCount === 0 && this.restore && this.timeoutUnlock.start(0, this.unlock))
  }
  unlock = () => {
    this.lockCount === 0 && this.restore && (this.restore?.(), (this.restore = null))
  }
  lock(e) {
    if (this.lockCount === 0 || this.restore !== null) return
    let t = $n(e).documentElement,
      n = Be(t).getComputedStyle(t).overflowY
    if (n === `hidden` || n === `clip`) {
      this.restore = be
      return
    }
    let r = ar || !rl(e)
    this.restore = r ? al(e) : ol(e)
  }
})()
function cl(e = !0, t = null) {
  U(() => {
    if (e) return sl.acquire(t)
  }, [e, t])
}
function ll(e) {
  let t = C.useRef(``),
    n = C.useCallback(
      (n) => {
        n.defaultPrevented || ((t.current = n.pointerType), e(n, n.pointerType))
      },
      [e]
    )
  return {
    onClick: C.useCallback(
      (n) => {
        if (n.detail === 0) {
          e(n, `keyboard`)
          return
        }
        ;(`pointerType` in n ? e(n, n.pointerType) : e(n, t.current), (t.current = ``))
      },
      [e]
    ),
    onPointerDown: n
  }
}
function ul(e, t) {
  let n = C.useRef(e),
    r = H(t)
  ;(U(() => {
    n.current !== e && r(n.current)
  }, [e, r]),
    U(() => {
      n.current = e
    }, [e]))
}
function dl(e) {
  let [t, n] = C.useState(null),
    r = H((t, r) => {
      e || n(r || (ar ? `touch` : ``))
    })
  ul(e, (t) => {
    t && !e && n(null)
  })
  let { onClick: i, onPointerDown: a } = ll(r)
  return C.useMemo(
    () => ({ openMethod: t, triggerProps: { onClick: i, onPointerDown: a } }),
    [t, i, a]
  )
}
function fl(e) {
  let { store: t, parentContext: n, actionsRef: r, isDrawer: i } = e,
    a = t.useState(`open`),
    o = t.useState(`disablePointerDismissal`),
    s = t.useState(`modal`),
    c = t.useState(`popupElement`),
    { openMethod: l, triggerProps: u } = dl(a)
  nc(t)
  let { forceUnmount: d } = rc(a, t),
    f = C.useCallback(() => {
      t.setOpen(!1, aa(ia))
    }, [t])
  C.useImperativeHandle(r, () => ({ unmount: d, close: f }), [d, f])
  let p = dc({ popupStore: t, onOpenChange: t.setOpen, treatPopupAsFloatingElement: !0 }),
    [m, h] = C.useState(0),
    [g, _] = C.useState(0),
    v = m === 0,
    y = Ec(p),
    b = So(p, {
      outsidePressEvent() {
        return t.context.internalBackdropRef.current || t.context.backdropRef.current
          ? `intentional`
          : { mouse: s === `trap-focus` ? `sloppy` : `intentional`, touch: `sloppy` }
      },
      outsidePress(e) {
        if (
          !t.context.outsidePressEnabledRef.current ||
          (`button` in e && e.button !== 0) ||
          (`touches` in e && e.touches.length !== 1)
        )
          return !1
        let n = gr(e)
        if (v && !o) {
          let e = n
          return s && (t.context.internalBackdropRef.current || t.context.backdropRef.current)
            ? t.context.internalBackdropRef.current === e ||
                t.context.backdropRef.current === e ||
                (J(e, c) && !e?.hasAttribute(`data-base-ui-portal`))
            : !0
        }
        return !1
      },
      escapeKey: v
    })
  cl(a && s === !0, c)
  let { getReferenceProps: x, getFloatingProps: S, getTriggerProps: w } = Sc([y, b])
  ;(t.useContextCallback(`onNestedDialogOpen`, (e, t) => {
    ;(h(e), _(t))
  }),
    t.useContextCallback(`onNestedDialogClose`, () => {
      ;(h(0), _(0))
    }),
    C.useEffect(
      () => (
        n?.onNestedDialogOpen && a && n.onNestedDialogOpen(m + 1, g + +!!i),
        n?.onNestedDialogClose && !a && n.onNestedDialogClose(),
        () => {
          n?.onNestedDialogClose && a && n.onNestedDialogClose()
        }
      ),
      [i, a, m, g, n]
    ))
  let T = C.useMemo(() => x(u), [x, u]),
    E = C.useMemo(() => w(u), [w, u]),
    D = C.useMemo(() => S(), [S])
  t.useSyncedValues({
    openMethod: l,
    activeTriggerProps: T,
    inactiveTriggerProps: E,
    popupProps: D,
    floatingRootContext: p,
    nestedOpenDialogCount: m,
    nestedOpenDrawerCount: g
  })
}
var pl = {
    ...cc,
    modal: Z((e) => e.modal),
    nested: Z((e) => e.nested),
    nestedOpenDialogCount: Z((e) => e.nestedOpenDialogCount),
    nestedOpenDrawerCount: Z((e) => e.nestedOpenDrawerCount),
    disablePointerDismissal: Z((e) => e.disablePointerDismissal),
    openMethod: Z((e) => e.openMethod),
    descriptionElementId: Z((e) => e.descriptionElementId),
    titleElementId: Z((e) => e.titleElementId),
    viewportElement: Z((e) => e.viewportElement),
    role: Z((e) => e.role)
  },
  ml = class e extends Zs {
    constructor(e) {
      super(
        hl(e),
        {
          popupRef: C.createRef(),
          backdropRef: C.createRef(),
          internalBackdropRef: C.createRef(),
          outsidePressEnabledRef: { current: !0 },
          triggerElements: new ic(),
          onOpenChange: void 0,
          onOpenChangeComplete: void 0
        },
        pl
      )
    }
    setOpen = (e, t) => {
      if (
        ((t.preventUnmountOnClose = () => {
          this.set(`preventUnmountingOnClose`, !0)
        }),
        !e &&
          t.trigger == null &&
          this.state.activeTriggerId != null &&
          (t.trigger = this.state.activeTriggerElement ?? void 0),
        this.context.onOpenChange?.(e, t),
        t.isCanceled)
      )
        return
      this.state.floatingRootContext.dispatchOpenChange(e, t)
      let n = { open: e },
        r = t.trigger?.id ?? null
      ;((r || e) && ((n.activeTriggerId = r), (n.activeTriggerElement = t.trigger ?? null)),
        this.update(n))
    }
    static useStore(t, n) {
      let r = ue(() => new e(n)).current
      return t ?? r
    }
  }
function hl(e = {}) {
  return {
    ...oc(),
    modal: !0,
    disablePointerDismissal: !1,
    popupElement: null,
    viewportElement: null,
    descriptionElementId: void 0,
    titleElementId: void 0,
    openMethod: null,
    nested: !1,
    nestedOpenDialogCount: 0,
    nestedOpenDrawerCount: 0,
    role: `dialog`,
    ...e
  }
}
var gl = C.createContext(!1)
function _l(e) {
  let {
      children: t,
      open: n,
      defaultOpen: r = !1,
      onOpenChange: i,
      onOpenChangeComplete: a,
      disablePointerDismissal: o = !1,
      modal: s = !0,
      actionsRef: c,
      handle: l,
      triggerId: u,
      defaultTriggerId: d = null
    } = e,
    f = sa(!0),
    p = C.useContext(gl),
    m = !!f,
    h = ml.useStore(l?.store, {
      open: r,
      openProp: n,
      activeTriggerId: d,
      triggerIdProp: u,
      modal: s,
      disablePointerDismissal: o,
      nested: m
    })
  ;($c(() => {
    n === void 0 && h.state.open === !1 && r === !0 && h.update({ open: !0, activeTriggerId: d })
  }),
    h.useControlledProp(`openProp`, n),
    h.useControlledProp(`triggerIdProp`, u),
    h.useSyncedValues({ disablePointerDismissal: o, nested: m, modal: s }),
    h.useContextCallback(`onOpenChange`, i),
    h.useContextCallback(`onOpenChangeComplete`, a))
  let g = h.useState(`payload`)
  fl({
    store: h,
    actionsRef: c,
    parentContext: f?.store.context,
    isDrawer: p,
    onOpenChange: i,
    triggerIdProp: u
  })
  let _ = C.useMemo(() => ({ store: h }), [h])
  return (0, q.jsx)(gl.Provider, {
    value: !1,
    children: (0, q.jsx)(oa.Provider, {
      value: _,
      children: typeof t == `function` ? t({ payload: g }) : t
    })
  })
}
var vl = C.forwardRef(function (e, t) {
  let { render: n, className: r, style: i, id: a, ...o } = e,
    { store: s } = sa(),
    c = Qn(a)
  return (
    s.useSyncedValueWithCleanup(`titleElementId`, c), Te(`h2`, e, { ref: t, props: [{ id: c }, o] })
  )
})
function yl({ ...e }) {
  return (0, q.jsx)(_l, { 'data-slot': `sheet`, ...e })
}
function bl({ ...e }) {
  return (0, q.jsx)(Qc, { 'data-slot': `sheet-portal`, ...e })
}
function xl({ className: e, ...t }) {
  return (0, q.jsx)(_a, {
    'data-slot': `sheet-overlay`,
    className: Wn(
      `fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs`,
      e
    ),
    ...t
  })
}
function Sl({ className: e, children: t, side: n = `right`, showCloseButton: r = !0, ...i }) {
  return (0, q.jsxs)(bl, {
    children: [
      (0, q.jsx)(xl, {}),
      (0, q.jsxs)(Yc, {
        'data-slot': `sheet-content`,
        'data-side': n,
        className: Wn(
          `fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm`,
          e
        ),
        ...i,
        children: [
          t,
          r &&
            (0, q.jsxs)(va, {
              'data-slot': `sheet-close`,
              render: (0, q.jsx)(qn, {
                variant: `ghost`,
                className: `absolute top-3 right-3`,
                size: `icon-sm`
              }),
              children: [
                (0, q.jsx)(j, {}),
                (0, q.jsx)(`span`, { className: `sr-only`, children: `Close` })
              ]
            })
        ]
      })
    ]
  })
}
function Cl({ className: e, ...t }) {
  return (0, q.jsx)(`div`, {
    'data-slot': `sheet-header`,
    className: Wn(`flex flex-col gap-0.5 p-4`, e),
    ...t
  })
}
function wl({ className: e, ...t }) {
  return (0, q.jsx)(vl, {
    'data-slot': `sheet-title`,
    className: Wn(`font-heading text-base font-medium text-foreground`, e),
    ...t
  })
}
function Tl({ className: e, ...t }) {
  return (0, q.jsx)(ya, {
    'data-slot': `sheet-description`,
    className: Wn(`text-sm text-muted-foreground`, e),
    ...t
  })
}
var El = C.createContext(void 0)
function Dl(e) {
  let t = C.useContext(El)
  if (t === void 0 && !e) throw Error(ce(72))
  return t
}
var Ol = {
    ...cc,
    disabled: Z((e) => e.disabled),
    instantType: Z((e) => e.instantType),
    isInstantPhase: Z((e) => e.isInstantPhase),
    trackCursorAxis: Z((e) => e.trackCursorAxis),
    disableHoverablePopup: Z((e) => e.disableHoverablePopup),
    lastOpenChangeReason: Z((e) => e.openChangeReason),
    closeOnClick: Z((e) => e.closeOnClick),
    closeDelay: Z((e) => e.closeDelay),
    hasViewport: Z((e) => e.hasViewport)
  },
  kl = class e extends Zs {
    constructor(e) {
      super(
        { ...Al(), ...e },
        {
          popupRef: C.createRef(),
          onOpenChange: void 0,
          onOpenChangeComplete: void 0,
          triggerElements: new ic()
        },
        Ol
      )
    }
    setOpen = (e, t) => {
      let n = t.reason,
        r = n === Zi,
        i = e && n === `trigger-focus`,
        a = !e && (n === `trigger-press` || n === `escape-key`)
      if (
        ((t.preventUnmountOnClose = () => {
          this.set(`preventUnmountingOnClose`, !0)
        }),
        this.context.onOpenChange?.(e, t),
        t.isCanceled)
      )
        return
      this.state.floatingRootContext.dispatchOpenChange(e, t)
      let o = () => {
        let r = { open: e, openChangeReason: n }
        i
          ? (r.instantType = `focus`)
          : a
            ? (r.instantType = `dismiss`)
            : n === `trigger-hover` && (r.instantType = void 0)
        let o = t.trigger?.id ?? null
        ;((o || e) && ((r.activeTriggerId = o), (r.activeTriggerElement = t.trigger ?? null)),
          this.update(r))
      }
      r ? Gi.flushSync(o) : o()
    }
    static useStore(t, n) {
      let r = ue(() => new e(n)).current,
        i = t ?? r,
        a = dc({ popupStore: i, onOpenChange: i.setOpen })
      return ((i.state.floatingRootContext = a), i)
    }
  }
function Al() {
  return {
    ...oc(),
    disabled: !1,
    instantType: void 0,
    isInstantPhase: !1,
    trackCursorAxis: `none`,
    disableHoverablePopup: !1,
    openChangeReason: null,
    closeOnClick: !0,
    closeDelay: 0,
    hasViewport: !1
  }
}
var jl = Bs(function (e) {
    let {
        disabled: t = !1,
        defaultOpen: n = !1,
        open: r,
        disableHoverablePopup: i = !1,
        trackCursorAxis: a = `none`,
        actionsRef: o,
        onOpenChange: s,
        onOpenChangeComplete: c,
        handle: l,
        triggerId: u,
        defaultTriggerId: d = null,
        children: f
      } = e,
      p = kl.useStore(l?.store, { open: n, openProp: r, activeTriggerId: d, triggerIdProp: u })
    ;($c(() => {
      r === void 0 && p.state.open === !1 && n === !0 && p.update({ open: !0, activeTriggerId: d })
    }),
      p.useControlledProp(`openProp`, r),
      p.useControlledProp(`triggerIdProp`, u),
      p.useContextCallback(`onOpenChange`, s),
      p.useContextCallback(`onOpenChangeComplete`, c))
    let m = p.useState(`open`),
      h = !t && m,
      g = p.useState(`activeTriggerId`),
      _ = p.useState(`payload`)
    ;(p.useSyncedValues({ trackCursorAxis: a, disableHoverablePopup: i }),
      U(() => {
        m && t && p.setOpen(!1, aa(ra))
      }, [m, t, p]),
      p.useSyncedValue(`disabled`, t),
      nc(p))
    let { forceUnmount: v, transitionStatus: y } = rc(h, p),
      b = p.select(`floatingRootContext`),
      x = p.useState(`isInstantPhase`),
      S = p.useState(`instantType`),
      w = p.useState(`lastOpenChangeReason`),
      T = C.useRef(null)
    ;(U(() => {
      ;(y === `ending` && w === `none`) || (y !== `ending` && x)
        ? (S !== `delay` && (T.current = S), p.set(`instantType`, `delay`))
        : T.current !== null && (p.set(`instantType`, T.current), (T.current = null))
    }, [y, x, w, S, p]),
      U(() => {
        h && (g ?? p.set(`payload`, void 0))
      }, [p, g, h]))
    let E = C.useCallback(() => {
      p.setOpen(!1, aa(ia))
    }, [p])
    C.useImperativeHandle(o, () => ({ unmount: v, close: E }), [v, E])
    let {
        getReferenceProps: D,
        getFloatingProps: O,
        getTriggerProps: k
      } = Sc([
        So(b, { enabled: !t, referencePress: () => p.select(`closeOnClick`) }),
        vo(b, { enabled: !t && a !== `none`, axis: a === `none` ? void 0 : a })
      ]),
      A = C.useMemo(() => D(), [D]),
      j = C.useMemo(() => k(), [k]),
      M = C.useMemo(() => O(), [O])
    return (
      p.useSyncedValues({ activeTriggerProps: A, inactiveTriggerProps: j, popupProps: M }),
      (0, q.jsx)(El.Provider, {
        value: p,
        children: typeof f == `function` ? f({ payload: _ }) : f
      })
    )
  }),
  Ml = C.createContext(void 0)
function Nl() {
  return C.useContext(Ml)
}
var Pl = (function (e) {
    return (
      (e[(e.popupOpen = la.popupOpen)] = `popupOpen`),
      (e.triggerDisabled = `data-trigger-disabled`),
      e
    )
  })({}),
  Q = Vs(function (e, t) {
    let {
        className: n,
        render: r,
        handle: i,
        payload: a,
        disabled: o,
        delay: s,
        closeOnClick: c = !0,
        closeDelay: l,
        id: u,
        style: d,
        ...f
      } = e,
      p = Dl(!0),
      m = i?.store ?? p
    if (!m) throw Error(ce(82))
    let h = Qn(u),
      g = m.useState(`isTriggerActive`, h),
      _ = m.useState(`isOpenedByTrigger`, h),
      v = m.useState(`floatingRootContext`),
      y = C.useRef(null),
      b = s ?? 600,
      x = l ?? 0,
      { registerTrigger: S, isMountedByThisTrigger: w } = tc(h, y, m, {
        payload: a,
        closeOnClick: c,
        closeDelay: x
      }),
      T = Nl(),
      { delayRef: E, isInstantPhase: D, hasProvider: O } = Ea(v, { open: _ })
    m.useSyncedValue(`isInstantPhase`, D)
    let k = m.useState(`disabled`),
      A = o ?? k,
      j = m.useState(`trackCursorAxis`),
      M = m.useState(`disableHoverablePopup`),
      N = xc(v, {
        enabled: !A,
        mouseOnly: !0,
        move: !1,
        handleClose: !M && j !== `both` ? Pc() : null,
        restMs() {
          let e = T?.delay,
            t = typeof E.current == `object` ? E.current.open : void 0,
            n = b
          return (O && (n = t === 0 ? 0 : (s ?? e ?? b)), n)
        },
        delay() {
          let e = typeof E.current == `object` ? E.current.close : void 0,
            t = x
          return (l == null && O && (t = e), { close: t })
        },
        triggerElementRef: y,
        isActiveTrigger: g,
        isClosing: () => m.select(`transitionStatus`) === `ending`
      }),
      ee = pc(v, { enabled: !A }).reference,
      P = { open: _ },
      F = m.useState(`triggerProps`, w)
    return Te(`button`, e, {
      state: P,
      ref: [t, S, y],
      props: [
        N,
        ee,
        F,
        {
          onPointerDown() {
            m.set(`closeOnClick`, c)
          },
          id: h,
          [Pl.triggerDisabled]: A ? `` : void 0
        },
        f
      ],
      stateAttributesMapping: ma
    })
  }),
  $ = C.createContext(void 0)
function Fl() {
  let e = C.useContext($)
  if (e === void 0) throw Error(ce(70))
  return e
}
var Il = C.forwardRef(function (e, t) {
    let { children: n, container: r, className: i, render: a, style: o, ...s } = e,
      { portalNode: c, portalSubtree: l } = eo({
        container: r,
        ref: t,
        componentProps: e,
        elementProps: s
      })
    return !l && !c ? null : (0, q.jsxs)(C.Fragment, { children: [l, c && Gi.createPortal(n, c)] })
  }),
  Ll = C.forwardRef(function (e, t) {
    let { keepMounted: n = !1, ...r } = e
    return Dl().useState(`mounted`) || n
      ? (0, q.jsx)($.Provider, { value: n, children: (0, q.jsx)(Il, { ref: t, ...r }) })
      : null
  }),
  Rl = C.createContext(void 0)
function zl() {
  let e = C.useContext(Rl)
  if (e === void 0) throw Error(ce(71))
  return e
}
var Bl = C.createContext(void 0)
function Vl() {
  return C.useContext(Bl)?.direction ?? `ltr`
}
var Hl = (e) => ({
    name: `arrow`,
    options: e,
    async fn(t) {
      let { x: n, y: r, placement: i, rects: a, platform: o, elements: s, middlewareData: c } = t,
        { element: l, padding: u = 0, offsetParent: d = `real` } = Vr(e, t) || {}
      if (l == null) return {}
      let f = ai(u),
        p = { x: n, y: r },
        m = qr(i),
        h = Gr(m),
        g = await o.getDimensions(l),
        _ = m === `y`,
        v = _ ? `top` : `left`,
        y = _ ? `bottom` : `right`,
        b = _ ? `clientHeight` : `clientWidth`,
        x = a.reference[h] + a.reference[m] - p[m] - a.floating[h],
        S = p[m] - a.reference[m],
        C = d === `real` ? await o.getOffsetParent?.(l) : s.floating,
        w = s.floating[b] || a.floating[h]
      ;(!w || !(await o.isElement?.(C))) && (w = s.floating[b] || a.floating[h])
      let T = x / 2 - S / 2,
        E = w / 2 - g[h] / 2 - 1,
        D = Math.min(f[v], E),
        O = Math.min(f[y], E),
        k = D,
        A = w - g[h] - O,
        j = w / 2 - g[h] / 2 + T,
        M = Br(k, j, A),
        N =
          !c.arrow &&
          Ur(i) != null &&
          j !== M &&
          a.reference[h] / 2 - (j < k ? D : O) - g[h] / 2 < 0,
        ee = N ? (j < k ? j - k : j - A) : 0
      return {
        [m]: p[m] + ee,
        data: { [m]: M, centerOffset: j - M - ee, ...(N && { alignmentOffset: ee }) },
        reset: N
      }
    }
  }),
  Ul = (e, t) => ({ ...Hl(e), options: [e, t] }),
  Wl = {
    name: `hide`,
    async fn(e) {
      let { width: t, height: n, x: r, y: i } = e.rects.reference,
        a = t === 0 && n === 0 && r === 0 && i === 0
      return { data: { referenceHidden: (await js().fn(e)).data?.referenceHidden || a } }
    }
  },
  Gl = { sideX: `left`, sideY: `top` },
  Kl = {
    name: `adaptiveOrigin`,
    async fn(e) {
      let {
          x: t,
          y: n,
          rects: { floating: r },
          elements: { floating: i },
          platform: a,
          strategy: o,
          placement: s
        } = e,
        c = Be(i),
        l = c.getComputedStyle(i)
      if (!(l.transitionDuration !== `0s` && l.transitionDuration !== ``))
        return { x: t, y: n, data: Gl }
      let u = await a.getOffsetParent?.(i),
        d = { width: 0, height: 0 }
      if (o === `fixed` && c?.visualViewport)
        d = { width: c.visualViewport.width, height: c.visualViewport.height }
      else if (u === c) {
        let e = $n(i)
        d = { width: e.documentElement.clientWidth, height: e.documentElement.clientHeight }
      } else (await a.isElement?.(u)) && (d = await a.getDimensions(u))
      let f = Hr(s),
        p = t,
        m = n
      ;(f === `left` && (p = d.width - (t + r.width)),
        f === `top` && (m = d.height - (n + r.height)))
      let h = f === `left` ? `right` : Gl.sideX,
        g = f === `top` ? `bottom` : Gl.sideY
      return { x: p, y: m, data: { sideX: h, sideY: g } }
    }
  }
function ql(e, t, n) {
  let r = e === `inline-start` || e === `inline-end`
  return {
    top: `top`,
    right: r ? (n ? `inline-start` : `inline-end`) : `right`,
    bottom: `bottom`,
    left: r ? (n ? `inline-end` : `inline-start`) : `left`
  }[t]
}
function Jl(e, t, n) {
  let { rects: r, placement: i } = e
  return {
    side: ql(t, Hr(i), n),
    align: Ur(i) || `center`,
    anchor: { width: r.reference.width, height: r.reference.height },
    positioner: { width: r.floating.width, height: r.floating.height }
  }
}
function Yl(e) {
  let {
      anchor: t,
      positionMethod: n = `absolute`,
      side: r = `bottom`,
      sideOffset: i = 0,
      align: a = `center`,
      alignOffset: o = 0,
      collisionBoundary: s,
      collisionPadding: c = 5,
      sticky: l = !1,
      arrowPadding: u = 5,
      disableAnchorTracking: d = !1,
      keepMounted: f = !1,
      floatingRootContext: p,
      mounted: m,
      collisionAvoidance: h,
      shiftCrossAxis: g = !1,
      nodeId: _,
      adaptiveOrigin: v,
      lazyFlip: y = !1,
      externalTree: b
    } = e,
    [x, S] = C.useState(null)
  !m && x !== null && S(null)
  let w = h.side || `flip`,
    T = h.align || `flip`,
    E = h.fallbackAxisSide || `end`,
    D = typeof t == `function` ? t : void 0,
    O = H(D),
    k = D ? O : t,
    A = Oa(t),
    j = Oa(m),
    M = Vl() === `rtl`,
    N =
      x ||
      {
        top: `top`,
        right: `right`,
        bottom: `bottom`,
        left: `left`,
        'inline-end': M ? `left` : `right`,
        'inline-start': M ? `right` : `left`
      }[r],
    ee = a === `center` ? N : `${N}-${a}`,
    P = c,
    F = +(r === `bottom`),
    I = +(r === `top`),
    te = +(r === `right`),
    ne = +(r === `left`)
  typeof P == `number`
    ? (P = { top: P + F, right: P + ne, bottom: P + I, left: P + te })
    : (P &&= {
        top: (P.top || 0) + F,
        right: (P.right || 0) + ne,
        bottom: (P.bottom || 0) + I,
        left: (P.left || 0) + te
      })
  let re = { boundary: s === `clipping-ancestors` ? `clippingAncestors` : s, padding: P },
    L = C.useRef(null),
    R = Oa(i),
    z = Oa(o),
    ie = [
      Es(
        (e) => {
          let t = Jl(e, r, M),
            n = typeof R.current == `function` ? R.current(t) : R.current,
            i = typeof z.current == `function` ? z.current(t) : z.current
          return { mainAxis: n, crossAxis: i, alignmentAxis: i }
        },
        [typeof i == `function` ? 0 : i, typeof o == `function` ? 0 : o, M, r]
      )
    ],
    B = T === `none` && w !== `shift`,
    ae = !B && (l || g || w === `shift`),
    oe =
      w === `none`
        ? null
        : ks({
            ...re,
            padding: { top: P.top + 1, right: P.right + 1, bottom: P.bottom + 1, left: P.left + 1 },
            mainAxis: !g && w === `flip`,
            crossAxis: T === `flip` ? `alignment` : !1,
            fallbackAxisSideDirection: E
          }),
    se = B
      ? null
      : Ds(
          (e) => {
            let t = $n(e.elements.floating).documentElement
            return {
              ...re,
              rootBoundary: g
                ? { x: 0, y: 0, width: t.clientWidth, height: t.clientHeight }
                : void 0,
              mainAxis: T !== `none`,
              crossAxis: ae,
              limiter:
                l || g
                  ? void 0
                  : Os((e) => {
                      if (!L.current) return {}
                      let { width: t, height: n } = L.current.getBoundingClientRect(),
                        r = Kr(Hr(e.placement)),
                        i = r === `y` ? t : n,
                        a = r === `y` ? P.left + P.right : P.top + P.bottom
                      return { offset: i / 2 + a / 2 }
                    })
            }
          },
          [re, l, g, P, T]
        )
  ;(w === `shift` || T === `shift` || a === `center` ? ie.push(se, oe) : ie.push(oe, se),
    ie.push(
      As({
        ...re,
        apply({ elements: { floating: e }, availableWidth: t, availableHeight: n, rects: r }) {
          if (!j.current) return
          let i = e.style
          ;(i.setProperty(`--available-width`, `${t}px`),
            i.setProperty(`--available-height`, `${n}px`))
          let a = Be(e).devicePixelRatio || 1,
            { x: o, y: s, width: c, height: l } = r.reference,
            u = (Math.round((o + c) * a) - Math.round(o * a)) / a,
            d = (Math.round((s + l) * a) - Math.round(s * a)) / a
          ;(i.setProperty(`--anchor-width`, `${u}px`), i.setProperty(`--anchor-height`, `${d}px`))
        }
      }),
      Ul(
        () => ({
          element: L.current || $n(L.current).createElement(`div`),
          padding: u,
          offsetParent: `floating`
        }),
        [u]
      ),
      {
        name: `transformOrigin`,
        fn(e) {
          let { elements: t, middlewareData: n, placement: a, rects: o, y: s } = e,
            c = Hr(a),
            l = Kr(c),
            u = L.current,
            d = n.arrow?.x || 0,
            f = n.arrow?.y || 0,
            p = u?.clientWidth || 0,
            m = u?.clientHeight || 0,
            h = d + p / 2,
            g = f + m / 2,
            _ = Math.abs(n.shift?.y || 0),
            v = o.reference.height / 2,
            y = typeof i == `function` ? i(Jl(e, r, M)) : i,
            b = _ > y,
            x = {
              top: `${h}px calc(100% + ${y}px)`,
              bottom: `${h}px ${-y}px`,
              left: `calc(100% + ${y}px) ${g}px`,
              right: `${-y}px ${g}px`
            }[c],
            S = `${h}px ${o.reference.y + v - s}px`
          return (
            t.floating.style.setProperty(`--transform-origin`, ae && l === `y` && b ? S : x), {}
          )
        }
      },
      Wl,
      v
    ),
    U(() => {
      !m &&
        p &&
        p.update({
          referenceElement: null,
          floatingElement: null,
          domReferenceElement: null,
          positionReference: null
        })
    }, [m, p]))
  let ce = C.useMemo(
      () => ({
        elementResize: !d && typeof ResizeObserver < `u`,
        layoutShift: !d && typeof IntersectionObserver < `u`
      }),
      [d]
    ),
    {
      refs: le,
      elements: ue,
      x: de,
      y: fe,
      middlewareData: pe,
      update: me,
      placement: he,
      context: ge,
      isPositioned: _e,
      floatingStyles: ve
    } = uc({
      rootContext: p,
      open: f ? m : void 0,
      placement: ee,
      middleware: ie,
      strategy: n,
      whileElementsMounted: f ? void 0 : (...e) => fs(...e, ce),
      nodeId: _,
      externalTree: b
    }),
    { sideX: ye, sideY: be } = pe.adaptiveOrigin || Gl,
    xe = _e ? n : `fixed`,
    Se = C.useMemo(() => {
      let e = v ? { position: xe, [ye]: de, [be]: fe } : { position: xe, ...ve }
      return (_e || (e.opacity = 0), e)
    }, [v, xe, ye, de, be, fe, ve, _e]),
    Ce = C.useRef(null)
  ;(U(() => {
    if (!m) return
    let e = A.current,
      t = typeof e == `function` ? e() : e,
      n = (Xl(t) ? t.current : t) || null
    n !== Ce.current && (le.setPositionReference(n), (Ce.current = n))
  }, [m, le, k, A]),
    C.useEffect(() => {
      if (!m) return
      let e = A.current
      typeof e != `function` &&
        Xl(e) &&
        e.current !== Ce.current &&
        (le.setPositionReference(e.current), (Ce.current = e.current))
    }, [m, le, k, A]),
    C.useEffect(() => {
      if (f && m && ue.domReference && ue.floating) return fs(ue.domReference, ue.floating, me, ce)
    }, [f, m, ue, me, ce]))
  let we = Hr(he),
    Te = ql(r, we, M),
    Ee = Ur(he) || `center`,
    De = !!pe.hide?.referenceHidden
  U(() => {
    y && m && _e && S(we)
  }, [y, m, _e, we])
  let Oe = C.useMemo(
      () => ({ position: `absolute`, top: pe.arrow?.y, left: pe.arrow?.x }),
      [pe.arrow]
    ),
    ke = pe.arrow?.centerOffset !== 0
  return C.useMemo(
    () => ({
      positionerStyles: Se,
      arrowStyles: Oe,
      arrowRef: L,
      arrowUncentered: ke,
      side: Te,
      align: Ee,
      physicalSide: we,
      anchorHidden: De,
      refs: le,
      context: ge,
      isPositioned: _e,
      update: me
    }),
    [Se, Oe, L, ke, Te, Ee, we, De, le, ge, _e, me]
  )
}
function Xl(e) {
  return e != null && `current` in e
}
function Zl(e) {
  return e === `starting` ? Ja : xe
}
function Ql(e, t, { styles: n, transitionStatus: r, props: i, refs: a, hidden: o, inert: s = !1 }) {
  let c = { ...n }
  return (
    s && (c.pointerEvents = `none`),
    Te(`div`, e, {
      state: t,
      ref: a,
      props: [{ role: `presentation`, hidden: o, style: c }, Zl(r), i],
      stateAttributesMapping: ha
    })
  )
}
var $l = C.forwardRef(function (e, t) {
    let {
        render: n,
        className: r,
        anchor: i,
        positionMethod: a = `absolute`,
        side: o = `top`,
        align: s = `center`,
        sideOffset: c = 0,
        alignOffset: l = 0,
        collisionBoundary: u = `clipping-ancestors`,
        collisionPadding: d = 5,
        arrowPadding: f = 5,
        sticky: p = !1,
        disableAnchorTracking: m = !1,
        collisionAvoidance: h = Ya,
        style: g,
        ..._
      } = e,
      v = Dl(),
      y = Fl(),
      b = v.useState(`open`),
      x = v.useState(`mounted`),
      S = v.useState(`trackCursorAxis`),
      w = v.useState(`disableHoverablePopup`),
      T = v.useState(`floatingRootContext`),
      E = v.useState(`instantType`),
      D = v.useState(`transitionStatus`),
      O = Yl({
        anchor: i,
        positionMethod: a,
        floatingRootContext: T,
        mounted: x,
        side: o,
        sideOffset: c,
        align: s,
        alignOffset: l,
        collisionBoundary: u,
        collisionPadding: d,
        sticky: p,
        arrowPadding: f,
        disableAnchorTracking: m,
        keepMounted: y,
        collisionAvoidance: h,
        adaptiveOrigin: v.useState(`hasViewport`) ? Kl : void 0
      }),
      k = Ql(
        e,
        C.useMemo(
          () => ({
            open: b,
            side: O.side,
            align: O.align,
            anchorHidden: O.anchorHidden,
            instant: S === `none` ? E : `tracking-cursor`
          }),
          [b, O.side, O.align, O.anchorHidden, S, E]
        ),
        {
          styles: O.positionerStyles,
          transitionStatus: D,
          props: _,
          refs: [t, v.useStateSetter(`positionerElement`)],
          hidden: !x,
          inert: !b || S === `both` || w
        }
      )
    return (0, q.jsx)(Rl.Provider, { value: O, children: k })
  }),
  eu = { ...ha, ...Wi },
  tu = C.forwardRef(function (e, t) {
    let { className: n, render: r, style: i, ...a } = e,
      o = Dl(),
      { side: s, align: c } = zl(),
      l = o.useState(`open`),
      u = o.useState(`instantType`),
      d = o.useState(`transitionStatus`),
      f = o.useState(`popupProps`),
      p = o.useState(`floatingRootContext`)
    qi({
      open: l,
      ref: o.context.popupRef,
      onComplete() {
        l && o.context.onOpenChangeComplete?.(!0)
      }
    })
    let m = o.useState(`disabled`),
      h = o.useState(`closeDelay`)
    return (
      yc(p, { enabled: !m, closeDelay: h }),
      Te(`div`, e, {
        state: { open: l, side: s, align: c, instant: u, transitionStatus: d },
        ref: [t, o.context.popupRef, o.useStateSetter(`popupElement`)],
        props: [f, Zl(d), a],
        stateAttributesMapping: eu
      })
    )
  }),
  nu = C.forwardRef(function (e, t) {
    let { className: n, render: r, style: i, ...a } = e,
      o = Dl(),
      s = o.useState(`open`),
      c = o.useState(`instantType`),
      { arrowRef: l, side: u, align: d, arrowUncentered: f, arrowStyles: p } = zl()
    return Te(`div`, e, {
      state: { open: s, side: u, align: d, uncentered: f, instant: c },
      ref: [t, l],
      props: [{ style: p, 'aria-hidden': !0 }, a],
      stateAttributesMapping: ha
    })
  }),
  ru = function (e) {
    let { delay: t, closeDelay: n, timeout: r = 400 } = e,
      i = C.useMemo(() => ({ delay: t, closeDelay: n }), [t, n]),
      a = C.useMemo(() => ({ open: t, close: n }), [t, n])
    return (0, q.jsx)(Ml.Provider, {
      value: i,
      children: (0, q.jsx)(Ta, { delay: a, timeoutMs: r, children: e.children })
    })
  }
function iu({ delay: e = 0, ...t }) {
  return (0, q.jsx)(ru, { 'data-slot': `tooltip-provider`, delay: e, ...t })
}
function au({ ...e }) {
  return (0, q.jsx)(jl, { 'data-slot': `tooltip`, ...e })
}
function ou({ ...e }) {
  return (0, q.jsx)(Q, { 'data-slot': `tooltip-trigger`, ...e })
}
function su({
  className: e,
  side: t = `top`,
  sideOffset: n = 4,
  align: r = `center`,
  alignOffset: i = 0,
  children: a,
  ...o
}) {
  return (0, q.jsx)(Ll, {
    children: (0, q.jsx)($l, {
      align: r,
      alignOffset: i,
      side: t,
      sideOffset: n,
      className: `isolate z-50`,
      children: (0, q.jsxs)(tu, {
        'data-slot': `tooltip-content`,
        className: Wn(
          `z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`,
          e
        ),
        ...o,
        children: [
          a,
          (0, q.jsx)(nu, {
            className: `bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5`
          })
        ]
      })
    })
  })
}
var cu = 768
function lu() {
  let [e, t] = C.useState(void 0)
  return (
    C.useEffect(() => {
      let e = window.matchMedia(`(max-width: ${cu - 1}px)`),
        n = () => {
          t(window.innerWidth < cu)
        }
      return (
        e.addEventListener(`change`, n),
        t(window.innerWidth < cu),
        () => e.removeEventListener(`change`, n)
      )
    }, []),
    !!e
  )
}
var uu = `sidebar_state`,
  du = 3600 * 24 * 7,
  fu = `16rem`,
  pu = `18rem`,
  mu = `3rem`,
  hu = `b`,
  gu = C.createContext(null)
function _u() {
  let e = C.useContext(gu)
  if (!e) throw Error(`useSidebar must be used within a SidebarProvider.`)
  return e
}
function vu({
  defaultOpen: e = !0,
  open: t,
  onOpenChange: n,
  className: r,
  style: i,
  children: a,
  ...o
}) {
  let s = lu(),
    [c, l] = C.useState(!1),
    [u, d] = C.useState(e),
    f = t ?? u,
    p = C.useCallback(
      (e) => {
        let t = typeof e == `function` ? e(f) : e
        ;(n ? n(t) : d(t), (document.cookie = `${uu}=${t}; path=/; max-age=${du}`))
      },
      [n, f]
    ),
    m = C.useCallback(() => (s ? l((e) => !e) : p((e) => !e)), [s, p, l])
  C.useEffect(() => {
    let e = (e) => {
      e.key === hu && (e.metaKey || e.ctrlKey) && (e.preventDefault(), m())
    }
    return (window.addEventListener(`keydown`, e), () => window.removeEventListener(`keydown`, e))
  }, [m])
  let h = f ? `expanded` : `collapsed`,
    g = C.useMemo(
      () => ({
        state: h,
        open: f,
        setOpen: p,
        isMobile: s,
        openMobile: c,
        setOpenMobile: l,
        toggleSidebar: m
      }),
      [h, f, p, s, c, l, m]
    )
  return (0, q.jsx)(gu.Provider, {
    value: g,
    children: (0, q.jsx)(`div`, {
      'data-slot': `sidebar-wrapper`,
      style: { '--sidebar-width': fu, '--sidebar-width-icon': mu, ...i },
      className: Wn(
        `group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar`,
        r
      ),
      ...o,
      children: a
    })
  })
}
function yu({
  side: e = `left`,
  variant: t = `sidebar`,
  collapsible: n = `offcanvas`,
  className: r,
  children: i,
  dir: a,
  ...o
}) {
  let { isMobile: s, state: c, openMobile: l, setOpenMobile: u } = _u()
  return n === `none`
    ? (0, q.jsx)(`div`, {
        'data-slot': `sidebar`,
        className: Wn(
          `flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground`,
          r
        ),
        ...o,
        children: i
      })
    : s
      ? (0, q.jsx)(yl, {
          open: l,
          onOpenChange: u,
          ...o,
          children: (0, q.jsxs)(Sl, {
            dir: a,
            'data-sidebar': `sidebar`,
            'data-slot': `sidebar`,
            'data-mobile': `true`,
            className: `bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden`,
            style: { '--sidebar-width': pu },
            side: e,
            children: [
              (0, q.jsxs)(Cl, {
                className: `sr-only`,
                children: [
                  (0, q.jsx)(wl, { children: `Sidebar` }),
                  (0, q.jsx)(Tl, { children: `Displays the mobile sidebar.` })
                ]
              }),
              (0, q.jsx)(`div`, { className: `flex h-full w-full flex-col`, children: i })
            ]
          })
        })
      : (0, q.jsxs)(`div`, {
          className: `group peer text-sidebar-foreground hidden md:block`,
          'data-state': c,
          'data-collapsible': c === `collapsed` ? n : ``,
          'data-variant': t,
          'data-side': e,
          'data-slot': `sidebar`,
          children: [
            (0, q.jsx)(`div`, {
              'data-slot': `sidebar-gap`,
              className: Wn(
                `relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear`,
                `group-data-[collapsible=offcanvas]:w-0`,
                `group-data-[side=right]:rotate-180`,
                t === `floating` || t === `inset`
                  ? `group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]`
                  : `group-data-[collapsible=icon]:w-(--sidebar-width-icon)`
              )
            }),
            (0, q.jsx)(`div`, {
              'data-slot': `sidebar-container`,
              'data-side': e,
              className: Wn(
                `fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex`,
                t === `floating` || t === `inset`
                  ? `p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]`
                  : `group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l`,
                r
              ),
              ...o,
              children: (0, q.jsx)(`div`, {
                'data-sidebar': `sidebar`,
                'data-slot': `sidebar-inner`,
                className: `bg-sidebar group-data-[variant=floating]:ring-sidebar-border flex size-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1`,
                children: i
              })
            })
          ]
        })
}
function bu({ className: e, ...t }) {
  return (0, q.jsx)(`div`, {
    'data-slot': `sidebar-footer`,
    'data-sidebar': `footer`,
    className: Wn(`flex flex-col gap-2 p-2`, e),
    ...t
  })
}
function xu({ className: e, ...t }) {
  return (0, q.jsx)(`div`, {
    'data-slot': `sidebar-content`,
    'data-sidebar': `content`,
    className: Wn(
      `no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden`,
      e
    ),
    ...t
  })
}
function Su({ className: e, ...t }) {
  return (0, q.jsx)(`div`, {
    'data-slot': `sidebar-group`,
    'data-sidebar': `group`,
    className: Wn(`relative flex w-full min-w-0 flex-col p-2`, e),
    ...t
  })
}
function Cu({ className: e, ...t }) {
  return (0, q.jsx)(`div`, {
    'data-slot': `sidebar-group-content`,
    'data-sidebar': `group-content`,
    className: Wn(`w-full text-sm`, e),
    ...t
  })
}
function wu({ className: e, ...t }) {
  return (0, q.jsx)(`ul`, {
    'data-slot': `sidebar-menu`,
    'data-sidebar': `menu`,
    className: Wn(`flex w-full min-w-0 flex-col gap-0`, e),
    ...t
  })
}
function Tu({ className: e, ...t }) {
  return (0, q.jsx)(`li`, {
    'data-slot': `sidebar-menu-item`,
    'data-sidebar': `menu-item`,
    className: Wn(`group/menu-item relative`, e),
    ...t
  })
}
var Eu = Le(
  `peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate`,
  {
    variants: {
      variant: {
        default: `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`,
        outline: `bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]`
      },
      size: {
        default: `h-8 text-sm`,
        sm: `h-7 text-xs`,
        lg: `h-12 text-sm group-data-[collapsible=icon]:p-0!`
      }
    },
    defaultVariants: { variant: `default`, size: `default` }
  }
)
function Du({
  render: e,
  isActive: t = !1,
  variant: n = `default`,
  size: r = `default`,
  tooltip: i,
  className: a,
  ...o
}) {
  let { isMobile: s, state: c } = _u(),
    l = je({
      defaultTagName: `button`,
      props: ee({ className: Wn(Eu({ variant: n, size: r }), a) }, o),
      render: i ? (0, q.jsx)(ou, { render: e }) : e,
      state: { slot: `sidebar-menu-button`, sidebar: `menu-button`, size: r, active: t }
    })
  return i
    ? (typeof i == `string` && (i = { children: i }),
      (0, q.jsxs)(au, {
        children: [
          l,
          (0, q.jsx)(su, { side: `right`, align: `center`, hidden: c !== `collapsed` || s, ...i })
        ]
      }))
    : l
}
var Ou = [
  { id: `discuter`, label: `Chatbot`, icon: O },
  { id: `repondre`, label: `Générer une réponse`, icon: k }
]
function ku({ activeTab: e, isLoggedIn: t, onTabChange: n }) {
  return (0, q.jsxs)(yu, {
    collapsible: `none`,
    className: `h-full w-12 shrink-0 border-r border-gray-300`,
    children: [
      (0, q.jsx)(xu, {
        children: (0, q.jsx)(Su, {
          children: (0, q.jsx)(Cu, {
            children: (0, q.jsx)(wu, {
              children: Ou.map(({ id: r, label: i, icon: a }) =>
                (0, q.jsx)(
                  Tu,
                  {
                    children: (0, q.jsxs)(au, {
                      children: [
                        (0, q.jsxs)(ou, {
                          render: (0, q.jsx)(Du, {
                            isActive: e === r,
                            disabled: !t,
                            onClick: () => n(r),
                            className: t ? `` : `cursor-not-allowed opacity-40`
                          }),
                          children: [
                            (0, q.jsx)(a, { className: `size-4` }),
                            (0, q.jsx)(`span`, { className: `sr-only`, children: i })
                          ]
                        }),
                        (0, q.jsx)(su, { side: `right`, children: i })
                      ]
                    })
                  },
                  r
                )
              )
            })
          })
        })
      }),
      (0, q.jsx)(bu, {
        children: (0, q.jsx)(wu, {
          children: (0, q.jsx)(Tu, {
            children: (0, q.jsxs)(au, {
              children: [
                (0, q.jsxs)(ou, {
                  render: (0, q.jsx)(Du, {
                    isActive: e === `parametres`,
                    onClick: () => n(`parametres`)
                  }),
                  children: [
                    (0, q.jsx)(A, { className: `size-4` }),
                    (0, q.jsx)(`span`, { className: `sr-only`, children: `Paramètres` })
                  ]
                }),
                (0, q.jsx)(su, { side: `right`, children: `Paramètres` })
              ]
            })
          })
        })
      })
    ]
  })
}
function Au({ hidden: e, isLoggedIn: t, url: n }) {
  let r = (0, C.useRef)(null),
    [i, a] = (0, C.useState)(!0)
  return (
    (0, C.useEffect)(() => {
      if (e || !t || !n) {
        e || a(!0)
        return
      }
      let i = r.current
      if (!i) return
      let o = `${n}/c`
      ;(i.getAttribute(`src`) !== o && i.setAttribute(`src`, o), a(!1))
    }, [e, t, n]),
    (0, q.jsxs)(`div`, {
      className: `tab-panel relative flex-1 overflow-hidden ${e ? `hidden` : `flex`}`,
      children: [
        (0, q.jsx)(`webview`, {
          ref: r,
          partition: `persist:pierre`,
          style: {
            position: `absolute`,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: `100%`,
            height: `100%`
          }
        }),
        i &&
          (0, q.jsxs)(`div`, {
            className: `absolute inset-0 flex flex-col items-center justify-center bg-white p-8`,
            style: { zIndex: 10 },
            children: [
              (0, q.jsx)(`p`, { className: `mb-2 text-2xl`, children: `💬` }),
              (0, q.jsx)(`p`, {
                className: `font-['Inter'] text-[13px] font-semibold text-gray-800`,
                children: `Chatbot`
              }),
              (0, q.jsx)(`p`, {
                className: `mt-1 text-[12px] text-gray-400`,
                children: `Configurez et connectez-vous pour accéder au chatbot.`
              })
            ]
          })
      ]
    })
  )
}
function ju({ hidden: e, settings: t, isLoggedIn: n, onLogin: r, onLogout: i }) {
  let [a, o] = (0, C.useState)(``),
    [s, c] = (0, C.useState)(``),
    [l, u] = (0, C.useState)(``),
    [d, f] = (0, C.useState)(!1),
    [p, m] = (0, C.useState)(``),
    [, h] = (0, C.useState)(null),
    [g, _] = (0, C.useState)(!1)
  ;(0, C.useEffect)(() => {
    ;(o(t.url ?? ``), c(t.email ?? ``), u(t.password ?? ``), n && h(`ok`))
  }, [t, n])
  async function v() {
    let e
    try {
      e = new URL(a.trim()).origin
    } catch {
      m(`URL invalide. Exemple : http://localhost:3000`)
      return
    }
    if (!s.trim() || !l.trim()) {
      m(`Tous les champs sont obligatoires.`)
      return
    }
    ;(m(``), _(!0))
    let t = { url: e, email: s.trim(), password: l.trim(), loggedOut: !1 }
    try {
      await window.api.saveSettings(t)
      let e = await Fu(t)
      ;(h(e ? `ok` : `error`), e ? r(t) : m(`Identifiant ou mot de passe incorrect.`))
    } catch {
      m(`Impossible de joindre le serveur. Vérifiez l'URL.`)
    } finally {
      _(!1)
    }
  }
  async function y() {
    ;(await window.api.saveSettings({ ...t, password: ``, loggedOut: !0 }),
      await window.api.logout(),
      u(``),
      h(null),
      i())
  }
  return (0, q.jsxs)(`div`, {
    className: `flex flex-1 flex-col p-8 justify-between${e ? ` hidden` : ``}`,
    children: [
      (0, q.jsxs)(`div`, {
        children: [
          (0, q.jsxs)(`h1`, {
            className: `mb-2 text-8xl font-bold tracking-tight`,
            children: [
              `Pierre`,
              ` `,
              (0, q.jsx)(`span`, {
                className: `ml-3 inline-block w-12 animate-[blink_1s_step-end_infinite] bg-gray-800 leading-none`,
                children: `\xA0`
              })
            ]
          }),
          (0, q.jsxs)(`h2`, {
            className: `mb-5 text-[42px]/[41px] font-medium tracking-tight`,
            children: [`Agent IA open source`, (0, q.jsx)(`br`, {}), `au service des HLM`]
          })
        ]
      }),
      (0, q.jsxs)(`div`, {
        children: [
          (0, q.jsxs)(`div`, {
            className: `flex flex-col`,
            children: [
              (0, q.jsx)(`label`, {
                className: `mb-1.5 text-[11px] font-semibold tracking-wider text-gray-900 uppercase`,
                children: `Adresse du serveur`
              }),
              (0, q.jsx)(`input`, {
                type: `url`,
                value: a,
                onChange: (e) => o(e.target.value),
                placeholder: `https://exemple.pierre-ia.org`,
                className: `mb-5 w-full rounded-sm border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900/10`
              })
            ]
          }),
          (0, q.jsxs)(`div`, {
            className: `flex flex-col`,
            children: [
              (0, q.jsx)(`label`, {
                className: `mb-1.5 text-[11px] font-semibold tracking-wider text-gray-900 uppercase`,
                children: `Email professionnel`
              }),
              (0, q.jsx)(`input`, {
                type: `email`,
                value: s,
                onChange: (e) => c(e.target.value),
                placeholder: `votre@email.com`,
                className: `mb-5 w-full rounded-sm border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900/10`
              })
            ]
          }),
          (0, q.jsxs)(`div`, {
            className: `flex flex-col`,
            children: [
              (0, q.jsx)(`label`, {
                className: `mb-1.5 text-[11px] font-semibold tracking-wider text-gray-900 uppercase`,
                children: `Mot de passe`
              }),
              (0, q.jsxs)(`div`, {
                className: `relative`,
                children: [
                  (0, q.jsx)(`input`, {
                    type: d ? `text` : `password`,
                    value: l,
                    onChange: (e) => u(e.target.value),
                    placeholder: `••••••••`,
                    className: `mb-5 w-full rounded-sm border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900/10`
                  }),
                  (0, q.jsx)(`button`, {
                    type: `button`,
                    onClick: () => f((e) => !e),
                    className: `absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer border-none bg-transparent text-xs text-gray-300 transition-colors hover:text-gray-500`,
                    children: `👁`
                  })
                ]
              })
            ]
          }),
          p && (0, q.jsx)(`p`, { className: `text-center text-[11px] text-red-500`, children: p }),
          n
            ? (0, q.jsx)(`button`, {
                onClick: () => void y(),
                className: `w-full cursor-pointer rounded-sm border-none bg-gray-900 py-3 font-['Inter'] text-[13px] font-bold text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40`,
                children: `Se déconnecter`
              })
            : (0, q.jsx)(`button`, {
                onClick: () => void v(),
                disabled: g,
                className: `w-full cursor-pointer rounded-sm border-none bg-gray-900 py-3 font-['Inter'] text-[13px] font-bold text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40`,
                children: g ? `Connexion…` : `Se connecter →`
              })
        ]
      })
    ]
  })
}
function Mu({ hidden: e, settings: t, clipboard: n, clipboardKey: r }) {
  let [i, a] = (0, C.useState)(``),
    [o, s] = (0, C.useState)([]),
    [c, l] = (0, C.useState)(``),
    [u, d] = (0, C.useState)(!1),
    [f, p] = (0, C.useState)(!1),
    [m, h] = (0, C.useState)(``),
    [g, _] = (0, C.useState)(!1),
    [v, y] = (0, C.useState)(!1),
    [b, x] = (0, C.useState)(`Générer la réponse`),
    [S, w] = (0, C.useState)(`Regénérer`),
    [T, E] = (0, C.useState)(``),
    [D, O] = (0, C.useState)(!1),
    [k, A] = (0, C.useState)([]),
    [j, M] = (0, C.useState)(`skill_answer`),
    N = (0, C.useRef)(crypto.randomUUID()),
    ee = (0, C.useRef)(!1),
    P = (0, C.useRef)(n),
    F = (0, C.useRef)(i),
    I = (0, C.useRef)(m),
    te = (0, C.useRef)(t.url),
    ne = (0, C.useRef)(o),
    re = (0, C.useRef)(j)
  ;((0, C.useEffect)(() => {
    P.current = n
  }, [n]),
    (0, C.useEffect)(() => {
      F.current = i
    }, [i]),
    (0, C.useEffect)(() => {
      I.current = m
    }, [m]),
    (0, C.useEffect)(() => {
      te.current = t.url
    }, [t.url]),
    (0, C.useEffect)(() => {
      ne.current = o
    }, [o]),
    (0, C.useEffect)(() => {
      re.current = j
    }, [j]),
    (0, C.useEffect)(() => {
      let e = t.url
      e &&
        (async () => {
          let t = await window.api.getSkills({ url: e })
          Array.isArray(t) && t.length > 0 && (A(t), M(t[0].id))
        })()
    }, [t.url]))
  let L = (0, C.useRef)(!0)
  ;(0, C.useEffect)(() => {
    if (L.current) {
      L.current = !1
      return
    }
    ee.current ||
      ((N.current = crypto.randomUUID()),
      l(``),
      d(!1),
      a(``),
      s([]),
      h(``),
      _(!1),
      y(!1),
      x(`Générer la réponse`))
  }, [r])
  function R(e) {
    ;((ee.current = !1), l(e), p(!1), d(!0), y(!0), _(!0), w(`Regénérer`))
  }
  function z(e) {
    ;((ee.current = !1),
      p(!1),
      x(`Réessayer`),
      w(`Regénérer`),
      e && (E(e), setTimeout(() => E(``), 4e3)))
  }
  function ie(e) {
    return new Promise((t, n) => {
      let r = new FileReader()
      ;((r.onload = () => t(r.result)), (r.onerror = () => n(r.error)), r.readAsArrayBuffer(e))
    })
  }
  let B = (0, C.useCallback)(async (e = !1) => {
    if (ee.current) return
    let t = te.current
    if (!t) return
    let n = e ? I.current.trim() || `Améliore la réponse précédente.` : P.current,
      r = e ? `` : F.current.trim()
    if (!(!e && !P.current)) {
      ;((ee.current = !0), p(!0), e ? w(`Génération…`) : (x(`Génération…`), l(``), y(!1), _(!1)))
      try {
        let e = ne.current,
          i = await Promise.all(
            e.map(async (e) => ({
              name: e.name,
              type: e.file.type || `application/octet-stream`,
              buffer: await ie(e.file)
            }))
          ),
          a = await window.api.generateAnswer({
            url: t,
            conv_id: N.current,
            message: n,
            context: r,
            skill: re.current,
            files: i
          })
        if (!ee.current) return
        ;`error` in a ? z(`Une erreur est survenue lors de la génération.`) : R(a.content)
      } catch {
        z(`Une erreur est survenue lors de la génération.`)
      }
    }
  }, [])
  ;(0, C.useEffect)(() => {
    function e(e) {
      ;(e.metaKey || e.ctrlKey) && e.key === `Enter` && (e.preventDefault(), B(u))
    }
    return (
      document.addEventListener(`keydown`, e), () => document.removeEventListener(`keydown`, e)
    )
  }, [B, u])
  function ae(e) {
    s((t) => {
      let n = [...t]
      for (let t of e)
        n.some((e) => e.name === t.name && e.size === t.size) ||
          n.push({ name: t.name, size: t.size, file: t })
      return n
    })
  }
  function oe(e) {
    s((t) => t.filter((t, n) => n !== e))
  }
  async function se() {
    ;(await window.api.writeClipboard(c), O(!0), setTimeout(() => O(!1), 1500))
  }
  function ce(e) {
    ;(a(e.target.value),
      (e.target.style.height = `auto`),
      (e.target.style.height = `${e.target.scrollHeight}px`))
  }
  return (0, q.jsxs)(`div`, {
    className: `tab-panel min-h-0 flex-1 flex-col ${e ? `hidden` : `flex`}`,
    children: [
      (0, q.jsxs)(`main`, {
        className: `flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-white p-4`,
        children: [
          (0, q.jsxs)(`section`, {
            className: `shrink-0`,
            children: [
              (0, q.jsx)(`p`, {
                className: `mb-2 font-['Inter'] text-[12px] font-semibold text-gray-900`,
                children: `CONTEXTE`
              }),
              (0, q.jsx)(`textarea`, {
                rows: 5,
                value: n,
                readOnly: !0,
                placeholder: `Le texte placé dans le presse-papier apparaît ici.
Pensez à utiliser CTRL + C.`,
                className: `mb-1 w-full resize-none overflow-y-auto rounded border border-dashed border-gray-300 bg-gray-50/50 px-4 py-2 font-['Inter'] text-[13px] text-gray-600 transition outline-none placeholder:text-gray-400`
              }),
              (0, q.jsx)(`textarea`, {
                rows: 1,
                value: i,
                onChange: ce,
                placeholder: `Facultatif · Contexte complémentaire`,
                className: `mb-1 w-full resize-none overflow-hidden rounded border border-dashed border-gray-300 bg-gray-50/50 px-3.5 py-2 text-[13px] leading-relaxed text-gray-600 transition outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300/10`
              }),
              (0, q.jsx)(Nu, { onFiles: ae }),
              o.length > 0 &&
                (0, q.jsx)(`div`, {
                  className: `flex flex-col`,
                  children: o.map((e, t) =>
                    (0, q.jsxs)(
                      `div`,
                      {
                        className: `flex items-center justify-between rounded-md px-2.5 py-0.5 text-[11px] text-gray-500 first:mt-1 hover:bg-gray-50`,
                        children: [
                          (0, q.jsx)(`span`, { className: `flex-1 truncate`, children: e.name }),
                          (0, q.jsx)(`button`, {
                            onClick: () => oe(t),
                            className: `cursor-pointer border-none bg-transparent px-1 text-[11px] text-gray-400 transition-colors hover:text-red-500`,
                            children: `✕`
                          })
                        ]
                      },
                      `${e.name}-${e.size}`
                    )
                  )
                })
            ]
          }),
          (0, q.jsxs)(`section`, {
            className: `flex min-h-45 flex-1 flex-col`,
            children: [
              (0, q.jsx)(`p`, {
                className: `my-2 font-['Inter'] text-[12px] font-semibold text-gray-900`,
                children: `PROPOSITION DE RÉPONSE`
              }),
              (0, q.jsx)(`textarea`, {
                value: c,
                onChange: (e) => l(e.target.value),
                className: `w-full flex-1 resize-none rounded border border-gray-200 bg-gray-50/50 p-4 font-['Source'] text-[14px] font-medium text-gray-900 caret-blue-600 transition outline-none placeholder:text-gray-300`
              })
            ]
          })
        ]
      }),
      (0, q.jsxs)(`footer`, {
        className: `flex shrink-0 flex-col gap-1.5 border-t border-gray-100/80 px-4 pt-2 pb-4`,
        children: [
          k.length > 1 &&
            (0, q.jsx)(`select`, {
              value: j,
              onChange: (e) => M(e.target.value),
              disabled: f,
              className: `w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 font-['Inter'] text-[12px] text-gray-600 transition outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-40`,
              children: k.map((e) =>
                (0, q.jsx)(`option`, { value: e.id, children: e.display }, e.id)
              )
            }),
          !v &&
            (0, q.jsx)(`button`, {
              onClick: () => void B(!1),
              disabled: f,
              className: `w-full cursor-pointer truncate rounded border-none bg-gray-900 py-3 font-['Inter'] text-[13px] font-bold text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40`,
              children: b
            }),
          v &&
            (0, q.jsx)(`button`, {
              onClick: () => void se(),
              className: `w-full cursor-pointer rounded border-none bg-gray-900 py-2.5 font-['Inter'] text-[13px] font-bold tracking-wide text-white transition-all hover:bg-gray-800 active:scale-[0.98]`,
              children: D ? `✓ Copié` : `Copier dans le presse-papiers`
            }),
          g &&
            (0, q.jsxs)(`div`, {
              className: `flex gap-1.5`,
              children: [
                (0, q.jsx)(`input`, {
                  type: `text`,
                  value: m,
                  onChange: (e) => h(e.target.value),
                  placeholder: `ex : plus détaillé, plus précis…`,
                  className: `min-w-0 flex-1 rounded border-none bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 transition outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10`
                }),
                (0, q.jsx)(`button`, {
                  onClick: () => void B(!0),
                  disabled: f,
                  className: `cursor-pointer rounded border-none bg-gray-200 px-3 py-1.5 font-['Inter'] text-[11px] font-semibold whitespace-nowrap text-gray-500 transition-all hover:bg-gray-200 active:scale-[0.98]`,
                  children: S
                })
              ]
            }),
          T &&
            (0, q.jsx)(`p`, { className: `mt-1 text-center text-[11px] text-red-500`, children: T })
        ]
      })
    ]
  })
}
function Nu({ onFiles: e }) {
  let [t, n] = (0, C.useState)(!1),
    r = (0, C.useRef)(null)
  return (0, q.jsxs)(`div`, {
    onClick: () => r.current?.click(),
    onDragOver: (e) => {
      ;(e.preventDefault(), n(!0))
    },
    onDragLeave: (e) => {
      ;(e.preventDefault(), n(!1))
    },
    onDrop: (t) => {
      ;(t.preventDefault(),
        n(!1),
        t.dataTransfer.files.length && e(Array.from(t.dataTransfer.files)))
    },
    className: `cursor-pointer rounded border border-dashed border-gray-300 bg-gray-50/50 px-3.5 py-2 transition-colors ${t ? `drag-over` : ``}`,
    children: [
      (0, q.jsx)(`input`, {
        ref: r,
        type: `file`,
        multiple: !0,
        hidden: !0,
        onChange: (t) => {
          t.target.files?.length && (e(Array.from(t.target.files)), (t.target.value = ``))
        }
      }),
      (0, q.jsx)(`span`, {
        className: `text-[13px] text-gray-400`,
        children: `Facultatif · Parcourir ou déposer des PDF`
      })
    ]
  })
}
function Pu({ isLoggedIn: e, onSettingsClick: t }) {
  return (0, q.jsxs)(`div`, {
    className: `drag flex h-10 shrink-0 items-center border-b border-gray-300 bg-gray-50 pr-3`,
    children: [
      (0, q.jsx)(`div`, { className: `flex-1` }),
      e
        ? (0, q.jsxs)(`button`, {
            onClick: t,
            className: `no-drag flex items-center gap-1.5 px-3 py-1 text-[12px] text-gray-500 hover:text-gray-800`,
            children: [
              (0, q.jsx)(`span`, { className: `h-2 w-2 rounded-full bg-green-500` }),
              `Connecté`
            ]
          })
        : (0, q.jsxs)(`span`, {
            className: `flex items-center gap-1.5 px-3 py-1 text-[12px] text-gray-400`,
            children: [
              (0, q.jsx)(`span`, { className: `h-2 w-2 rounded-full bg-red-500` }),
              `Non connecté`
            ]
          })
    ]
  })
}
async function Fu({ url: e, email: t, password: n }) {
  try {
    let r = new URLSearchParams({ email: t, password: n, action: `login` }),
      i = await fetch(`${e}/a/login`, {
        method: `POST`,
        body: r,
        headers: { 'Content-Type': `application/x-www-form-urlencoded` },
        redirect: `follow`
      })
    return i.ok && !i.url.includes(`message=`)
  } catch {
    return !1
  }
}
function Iu(e) {
  return !!(e?.url && e?.email && e?.password && !e?.loggedOut)
}
function Lu() {
  let [e, t] = (0, C.useState)(`parametres`),
    [n, r] = (0, C.useState)({}),
    [i, a] = (0, C.useState)(!1),
    [o, s] = (0, C.useState)(``),
    [c, l] = (0, C.useState)(0)
  ;((0, C.useEffect)(() => {
    ;(async () => {
      let e = await window.api?.getSettings()
      if (!e) return
      ;(r(e), Iu(e) && (await Fu(e)) && (a(!0), t(`discuter`)))
      let n = await window.api?.readClipboard()
      n && s(n)
    })()
  }, []),
    (0, C.useEffect)(() => {
      window.api?.onClipboardUpdate((e) => {
        ;(s(e), l((e) => e + 1))
      })
    }, []))
  let u = (0, C.useCallback)(
      (e) => {
        ;(!i && (e === `repondre` || e === `discuter`)) || t(e)
      },
      [i]
    ),
    d = (0, C.useCallback)((e) => {
      ;(r(e), a(!0), setTimeout(() => t(`discuter`), 700))
    }, []),
    f = (0, C.useCallback)(() => {
      ;(a(!1), t(`parametres`))
    }, [])
  return (0, q.jsx)(iu, {
    children: (0, q.jsxs)(`div`, {
      className: `flex h-screen flex-col overflow-hidden bg-gray-50 font-sans text-gray-800 antialiased`,
      children: [
        (0, q.jsx)(Pu, { isLoggedIn: i, onSettingsClick: () => u(`parametres`) }),
        (0, q.jsxs)(vu, {
          defaultOpen: !1,
          className: `min-h-0 flex-1 overflow-hidden`,
          children: [
            (0, q.jsx)(ku, { activeTab: e, isLoggedIn: i, onTabChange: u }),
            (0, q.jsxs)(`main`, {
              className: `flex flex-1 overflow-hidden`,
              children: [
                (0, q.jsx)(Mu, {
                  hidden: e !== `repondre`,
                  settings: n,
                  clipboard: o,
                  clipboardKey: c
                }),
                (0, q.jsx)(Au, { hidden: e !== `discuter`, isLoggedIn: i, url: n.url }),
                (0, q.jsx)(ju, {
                  hidden: e !== `parametres`,
                  settings: n,
                  isLoggedIn: i,
                  onLogin: d,
                  onLogout: f
                })
              ]
            })
          ]
        })
      ]
    })
  })
}
;(0, Me.createRoot)(document.getElementById(`root`)).render((0, q.jsx)(Lu, {}))
