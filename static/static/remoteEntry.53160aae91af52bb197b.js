var _JUPYTERLAB;
(() => {
  'use strict';
  var e,
    r,
    t,
    n,
    a,
    o,
    i,
    u,
    l,
    s,
    f,
    d,
    c,
    p,
    h,
    v,
    b,
    y,
    g,
    m,
    w,
    j = {
      41: (e, r, t) => {
        var n = {
            './index': () => t.e(106).then(() => () => t(106)),
            './extension': () => t.e(106).then(() => () => t(106)),
            './style': () => t.e(534).then(() => () => t(534))
          },
          a = (e, r) => (
            (t.R = r),
            (r = t.o(n, e)
              ? n[e]()
              : Promise.resolve().then(() => {
                  throw new Error(
                    'Module "' + e + '" does not exist in container.'
                  );
                })),
            (t.R = void 0),
            r
          ),
          o = (e, r) => {
            if (t.S) {
              var n = t.S.default,
                a = 'default';
              if (n && n !== e)
                throw new Error(
                  'Container initialization failed as it has already been initialized with a different share scope'
                );
              return (t.S[a] = e), t.I(a, r);
            }
          };
        t.d(r, { get: () => a, init: () => o });
      }
    },
    S = {};
  function E(e) {
    var r = S[e];
    if (void 0 !== r) return r.exports;
    var t = (S[e] = { id: e, exports: {} });
    return j[e](t, t.exports, E), t.exports;
  }
  (E.m = j),
    (E.c = S),
    (E.n = e => {
      var r = e && e.__esModule ? () => e.default : () => e;
      return E.d(r, { a: r }), r;
    }),
    (E.d = (e, r) => {
      for (var t in r)
        E.o(r, t) &&
          !E.o(e, t) &&
          Object.defineProperty(e, t, { enumerable: !0, get: r[t] });
    }),
    (E.f = {}),
    (E.e = e =>
      Promise.all(Object.keys(E.f).reduce((r, t) => (E.f[t](e, r), r), []))),
    (E.u = e =>
      e +
      '.' +
      { 106: '962a4f72064f73d0b534', 534: '5e402f8f8d2d109cab98' }[e] +
      '.js?v=' +
      { 106: '962a4f72064f73d0b534', 534: '5e402f8f8d2d109cab98' }[e]),
    (E.g = (function () {
      if ('object' == typeof globalThis) return globalThis;
      try {
        return this || new Function('return this')();
      } catch (e) {
        if ('object' == typeof window) return window;
      }
    })()),
    (E.o = (e, r) => Object.prototype.hasOwnProperty.call(e, r)),
    (e = {}),
    (r = 'jupyter_cassini:'),
    (E.l = (t, n, a, o) => {
      if (e[t]) e[t].push(n);
      else {
        var i, u;
        if (void 0 !== a)
          for (
            var l = document.getElementsByTagName('script'), s = 0;
            s < l.length;
            s++
          ) {
            var f = l[s];
            if (
              f.getAttribute('src') == t ||
              f.getAttribute('data-webpack') == r + a
            ) {
              i = f;
              break;
            }
          }
        i ||
          ((u = !0),
          ((i = document.createElement('script')).charset = 'utf-8'),
          (i.timeout = 120),
          E.nc && i.setAttribute('nonce', E.nc),
          i.setAttribute('data-webpack', r + a),
          (i.src = t)),
          (e[t] = [n]);
        var d = (r, n) => {
            (i.onerror = i.onload = null), clearTimeout(c);
            var a = e[t];
            if (
              (delete e[t],
              i.parentNode && i.parentNode.removeChild(i),
              a && a.forEach(e => e(n)),
              r)
            )
              return r(n);
          },
          c = setTimeout(
            d.bind(null, void 0, { type: 'timeout', target: i }),
            12e4
          );
        (i.onerror = d.bind(null, i.onerror)),
          (i.onload = d.bind(null, i.onload)),
          u && document.head.appendChild(i);
      }
    }),
    (E.r = e => {
      'undefined' != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(e, '__esModule', { value: !0 });
    }),
    (() => {
      E.S = {};
      var e = {},
        r = {};
      E.I = (t, n) => {
        n || (n = []);
        var a = r[t];
        if ((a || (a = r[t] = {}), !(n.indexOf(a) >= 0))) {
          if ((n.push(a), e[t])) return e[t];
          E.o(E.S, t) || (E.S[t] = {});
          var o = E.S[t],
            i = 'jupyter_cassini',
            u = [];
          switch (t) {
            case 'default':
              ((e, r, t, n) => {
                var a = (o[e] = o[e] || {}),
                  u = a[r];
                (!u || (!u.loaded && (1 != !u.eager ? n : i > u.from))) &&
                  (a[r] = {
                    get: () => E.e(106).then(() => () => E(106)),
                    from: i,
                    eager: !1
                  });
              })('jupyter_cassini', '0.1.0');
          }
          return (e[t] = u.length ? Promise.all(u).then(() => (e[t] = 1)) : 1);
        }
      };
    })(),
    (() => {
      var e;
      E.g.importScripts && (e = E.g.location + '');
      var r = E.g.document;
      if (!e && r && (r.currentScript && (e = r.currentScript.src), !e)) {
        var t = r.getElementsByTagName('script');
        t.length && (e = t[t.length - 1].src);
      }
      if (!e)
        throw new Error(
          'Automatic publicPath is not supported in this browser'
        );
      (e = e
        .replace(/#.*$/, '')
        .replace(/\?.*$/, '')
        .replace(/\/[^\/]+$/, '/')),
        (E.p = e);
    })(),
    (t = e => {
      var r = e => e.split('.').map(e => (+e == e ? +e : e)),
        t = /^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(e),
        n = t[1] ? r(t[1]) : [];
      return (
        t[2] && (n.length++, n.push.apply(n, r(t[2]))),
        t[3] && (n.push([]), n.push.apply(n, r(t[3]))),
        n
      );
    }),
    (n = (e, r) => {
      (e = t(e)), (r = t(r));
      for (var n = 0; ; ) {
        if (n >= e.length) return n < r.length && 'u' != (typeof r[n])[0];
        var a = e[n],
          o = (typeof a)[0];
        if (n >= r.length) return 'u' == o;
        var i = r[n],
          u = (typeof i)[0];
        if (o != u) return ('o' == o && 'n' == u) || 's' == u || 'u' == o;
        if ('o' != o && 'u' != o && a != i) return a < i;
        n++;
      }
    }),
    (a = e => {
      var r = e[0],
        t = '';
      if (1 === e.length) return '*';
      if (r + 0.5) {
        t +=
          0 == r
            ? '>='
            : -1 == r
            ? '<'
            : 1 == r
            ? '^'
            : 2 == r
            ? '~'
            : r > 0
            ? '='
            : '!=';
        for (var n = 1, o = 1; o < e.length; o++)
          n--,
            (t +=
              'u' == (typeof (u = e[o]))[0]
                ? '-'
                : (n > 0 ? '.' : '') + ((n = 2), u));
        return t;
      }
      var i = [];
      for (o = 1; o < e.length; o++) {
        var u = e[o];
        i.push(
          0 === u
            ? 'not(' + l() + ')'
            : 1 === u
            ? '(' + l() + ' || ' + l() + ')'
            : 2 === u
            ? i.pop() + ' ' + i.pop()
            : a(u)
        );
      }
      return l();
      function l() {
        return i.pop().replace(/^\((.+)\)$/, '$1');
      }
    }),
    (o = (e, r) => {
      if (0 in e) {
        r = t(r);
        var n = e[0],
          a = n < 0;
        a && (n = -n - 1);
        for (var i = 0, u = 1, l = !0; ; u++, i++) {
          var s,
            f,
            d = u < e.length ? (typeof e[u])[0] : '';
          if (i >= r.length || 'o' == (f = (typeof (s = r[i]))[0]))
            return !l || ('u' == d ? u > n && !a : ('' == d) != a);
          if ('u' == f) {
            if (!l || 'u' != d) return !1;
          } else if (l)
            if (d == f)
              if (u <= n) {
                if (s != e[u]) return !1;
              } else {
                if (a ? s > e[u] : s < e[u]) return !1;
                s != e[u] && (l = !1);
              }
            else if ('s' != d && 'n' != d) {
              if (a || u <= n) return !1;
              (l = !1), u--;
            } else {
              if (u <= n || f < d != a) return !1;
              l = !1;
            }
          else 's' != d && 'n' != d && ((l = !1), u--);
        }
      }
      var c = [],
        p = c.pop.bind(c);
      for (i = 1; i < e.length; i++) {
        var h = e[i];
        c.push(1 == h ? p() | p() : 2 == h ? p() & p() : h ? o(h, r) : !p());
      }
      return !!p();
    }),
    (i = (e, r) => {
      var t = E.S[e];
      if (!t || !E.o(t, r))
        throw new Error(
          'Shared module ' + r + " doesn't exist in shared scope " + e
        );
      return t;
    }),
    (u = (e, r) => {
      var t = e[r];
      return (
        (r = Object.keys(t).reduce((e, r) => (!e || n(e, r) ? r : e), 0)) &&
        t[r]
      );
    }),
    (l = (e, r) => {
      var t = e[r];
      return Object.keys(t).reduce(
        (e, r) => (!e || (!t[e].loaded && n(e, r)) ? r : e),
        0
      );
    }),
    (s = (e, r, t) =>
      'Unsatisfied version ' +
      r +
      ' of shared singleton module ' +
      e +
      ' (required ' +
      a(t) +
      ')'),
    (f = (e, r, t, n) => {
      var a = l(e, t);
      return (
        o(n, a) ||
          ('undefined' != typeof console &&
            console.warn &&
            console.warn(s(t, a, n))),
        h(e[t][a])
      );
    }),
    (d = (e, r, t) => {
      var a = e[r];
      return (
        (r = Object.keys(a).reduce(
          (e, r) => (!o(t, r) || (e && !n(e, r)) ? e : r),
          0
        )) && a[r]
      );
    }),
    (c = (e, r, t, n) => {
      var o = e[t];
      return (
        'No satisfying version (' +
        a(n) +
        ') of shared module ' +
        t +
        ' found in shared scope ' +
        r +
        '.\nAvailable versions: ' +
        Object.keys(o)
          .map(e => e + ' from ' + o[e].from)
          .join(', ')
      );
    }),
    (p = (e, r, t, n) => {
      'undefined' != typeof console &&
        console.warn &&
        console.warn(c(e, r, t, n));
    }),
    (h = e => ((e.loaded = 1), e.get())),
    (b = (v = e =>
      function (r, t, n, a) {
        var o = E.I(r);
        return o && o.then
          ? o.then(e.bind(e, r, E.S[r], t, n, a))
          : e(r, E.S[r], t, n, a);
      })((e, r, t, n) => (i(e, t), h(d(r, t, n) || p(r, e, t, n) || u(r, t))))),
    (y = v((e, r, t, n) => (i(e, t), f(r, 0, t, n)))),
    (g = {}),
    (m = {
      42: () => y('default', '@jupyterlab/rendermime', [1, 3, 0, 6]),
      70: () => y('default', '@jupyterlab/docmanager', [1, 3, 0, 7]),
      142: () => b('default', '@jupyterlab/cells', [1, 3, 0, 7]),
      168: () => y('default', '@lumino/signaling', [1, 1, 4, 3]),
      271: () => y('default', 'react', [1, 17, 0, 1]),
      275: () => y('default', '@jupyterlab/coreutils', [1, 5, 0, 3]),
      290: () => y('default', '@jupyterlab/services', [1, 6, 0, 5]),
      390: () => y('default', '@jupyterlab/launcher', [1, 3, 0, 5]),
      419: () => y('default', '@jupyterlab/ui-components', [1, 3, 0, 4]),
      441: () => y('default', '@jupyterlab/apputils', [1, 3, 0, 5]),
      510: () => y('default', '@lumino/widgets', [1, 1, 16, 1])
    }),
    (w = { 106: [42, 70, 142, 168, 271, 275, 290, 390, 419, 441, 510] }),
    (E.f.consumes = (e, r) => {
      E.o(w, e) &&
        w[e].forEach(e => {
          if (E.o(g, e)) return r.push(g[e]);
          var t = r => {
              (g[e] = 0),
                (E.m[e] = t => {
                  delete E.c[e], (t.exports = r());
                });
            },
            n = r => {
              delete g[e],
                (E.m[e] = t => {
                  throw (delete E.c[e], r);
                });
            };
          try {
            var a = m[e]();
            a.then ? r.push((g[e] = a.then(t).catch(n))) : t(a);
          } catch (e) {
            n(e);
          }
        });
    }),
    (() => {
      var e = { 540: 0 };
      E.f.j = (r, t) => {
        var n = E.o(e, r) ? e[r] : void 0;
        if (0 !== n)
          if (n) t.push(n[2]);
          else {
            var a = new Promise((t, a) => (n = e[r] = [t, a]));
            t.push((n[2] = a));
            var o = E.p + E.u(r),
              i = new Error();
            E.l(
              o,
              t => {
                if (E.o(e, r) && (0 !== (n = e[r]) && (e[r] = void 0), n)) {
                  var a = t && ('load' === t.type ? 'missing' : t.type),
                    o = t && t.target && t.target.src;
                  (i.message =
                    'Loading chunk ' + r + ' failed.\n(' + a + ': ' + o + ')'),
                    (i.name = 'ChunkLoadError'),
                    (i.type = a),
                    (i.request = o),
                    n[1](i);
                }
              },
              'chunk-' + r,
              r
            );
          }
      };
      var r = (r, t) => {
          var n,
            a,
            [o, i, u] = t,
            l = 0;
          for (n in i) E.o(i, n) && (E.m[n] = i[n]);
          for (u && u(E), r && r(t); l < o.length; l++)
            (a = o[l]), E.o(e, a) && e[a] && e[a][0](), (e[o[l]] = 0);
        },
        t = (self.webpackChunkjupyter_cassini =
          self.webpackChunkjupyter_cassini || []);
      t.forEach(r.bind(null, 0)), (t.push = r.bind(null, t.push.bind(t)));
    })();
  var k = E(41);
  (_JUPYTERLAB = void 0 === _JUPYTERLAB ? {} : _JUPYTERLAB).jupyter_cassini = k;
})();
