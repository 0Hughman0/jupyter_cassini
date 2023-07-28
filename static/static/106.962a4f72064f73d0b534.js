(self.webpackChunkjupyter_cassini =
  self.webpackChunkjupyter_cassini || []).push([
  [106],
  {
    106: (e, t, r) => {
      'use strict';
      r.r(t), r.d(t, { default: () => _ });
      var n = r(441),
        s = r(70),
        i = r(390),
        a = r(275),
        o = r(290),
        l = r(168),
        c = r(419),
        h = r(142),
        d = r(42),
        u = r(271),
        p = r.n(u),
        g = r(510);
      function m(e) {
        return p().createElement(
          'a',
          {
            onClick: t => {
              t.ctrlKey ? e.openTier(e.name) : e.setTier(e.name);
            }
          },
          e.name
        );
      }
      class w extends p().Component {
        constructor(e, t) {
          super(e, t);
        }
        render() {
          return (
            console.log(JSON.stringify(this.props.children)),
            console.log(JSON.stringify(this.props.parents)),
            p().createElement(
              'div',
              null,
              p().createElement(
                'div',
                null,
                this.props.parents.map(e =>
                  p().createElement(
                    'div',
                    null,
                    p().createElement(
                      'h2',
                      null,
                      p().createElement(m, {
                        name: e,
                        setTier: e => this.props.browser.setTier(e),
                        openTier: e => this.props.browser.openTier(e)
                      })
                    ),
                    p().createElement('a', null, '->')
                  )
                )
              ),
              p().createElement(
                'ul',
                null,
                this.props.children.map(e =>
                  p().createElement(
                    'li',
                    null,
                    p().createElement(m, {
                      name: e,
                      setTier: e => this.props.browser.setTier(e),
                      openTier: e => this.props.browser.openTier(e)
                    })
                  )
                )
              )
            )
          );
        }
      }
      class T extends p().Component {
        constructor(e, t) {
          super(e, t),
            (this.state = { query: '', status: '' }),
            (this.handleQueryChange = e => {
              this.setState({ query: e.target.value });
            }),
            (this.handleKeyUp = e => {
              'Enter' == e.key && this.handleSearch();
            }),
            (this.handleSearch = () => {
              this.props.onSearch(this.state.query);
            }),
            (this.handleQueryChange = this.handleQueryChange.bind(this)),
            (this.handleKeyUp = this.handleKeyUp.bind(this));
        }
        render() {
          return p().createElement(
            'div',
            null,
            p().createElement(
              'label',
              null,
              p().createElement(c.InputGroup, {
                type: 'text',
                rightIcon: 'search',
                onChange: this.handleQueryChange,
                onKeyUp: this.handleKeyUp
              })
            )
          );
        }
      }
      class y extends n.ReactWidget {
        constructor(e) {
          super(),
            (this.browser = e),
            this.addClass('cas-search'),
            (this.id = 'cas-search'),
            (this.title.label = 'searchy');
        }
        onSearch(e) {
          this.browser.lookupTier(e, e => {
            this.browser.currentTier = e;
          });
        }
        render() {
          return p().createElement(
            'div',
            null,
            p().createElement(T, {
              onSearch: e => {
                this.onSearch(e);
              }
            }),
            p().createElement(
              n.UseSignal,
              { signal: this.browser.currentTierChanged },
              (e, t) =>
                p().createElement(w, {
                  children: this.browser.currentTier.children,
                  parents: this.browser.currentTier.parents,
                  browser: this.browser
                })
            )
          );
        }
      }
      class b extends p().Component {
        constructor(e, t) {
          super(e, t);
        }
        render() {
          const e = this.props.browser;
          return p().createElement(
            'div',
            null,
            p().createElement(
              'h1',
              null,
              p().createElement(m, {
                openTier: t => {
                  e.openTier(t);
                },
                setTier: t => {
                  e.setTier(t);
                },
                name: this.props.tier.name
              })
            ),
            p().createElement('h2', null, this.props.tier.started),
            p().createElement('p', null)
          );
        }
      }
      class C extends n.ReactWidget {
        constructor(e) {
          super(), (this.browser = e), this.addClass('cas-tier-widget');
          const t = new g.BoxLayout();
          this.layout = t;
          const r = new h.MarkdownCellModel({}),
            n = new d.RenderMimeRegistry({
              initialFactories: d.standardRendererFactories
            }),
            s = new h.MarkdownCell({ rendermime: n.clone(), model: r });
          console.log(n.clone()),
            t.addWidget(s),
            g.BoxLayout.setStretch(s, 1),
            s.initializeState(),
            s.show();
        }
        render() {
          return p().createElement(
            n.UseSignal,
            { signal: this.browser.currentTierChanged },
            (e, t) =>
              p().createElement(b, {
                browser: this.browser,
                tier: this.browser.currentTier
              })
          );
        }
      }
      class S extends g.Widget {
        constructor(e) {
          super(),
            (this.browser = e),
            (this.id = 'cas-container'),
            (this.title.label = 'What Am I doing');
          const t = new g.SplitPanel({ orientation: 'horizontal' }),
            r = new g.BoxLayout(),
            n = (this.searchWidget = new y(e)),
            s = (this.tierWidget = new C(e));
          t.addWidget(n),
            g.SplitPanel.setStretch(n, 1),
            t.addWidget(s),
            g.SplitPanel.setStretch(s, 1),
            t.setRelativeSizes([1, 4]),
            r.addWidget(t),
            (this.layout = r),
            window.addEventListener('resize', e => {
              t.update();
            });
        }
      }
      const E = {
        name: 'Blank',
        started: 'Never',
        description: 'I got nothing',
        parents: [],
        children: []
      };
      async function k(e = '', t = {}, r = {}) {
        const n = o.ServerConnection.makeSettings(),
          s =
            a.URLExt.join(n.baseUrl, 'jupyter_cassini', e) +
            a.URLExt.objectToQueryString(r);
        let i;
        try {
          i = await o.ServerConnection.makeRequest(s, t, n);
        } catch (e) {
          throw new o.ServerConnection.NetworkError(e);
        }
        let l = await i.text();
        if (l.length > 0)
          try {
            l = JSON.parse(l);
          } catch (e) {
            console.log('Not a JSON response body.', i);
          }
        if (!i.ok)
          throw new o.ServerConnection.ResponseError(i, l.message || l);
        return l;
      }
      class v {
        constructor(e, t) {
          (this._currentTierChanged = new l.Signal(this)),
            (this._treeChanged = new l.Signal(this)),
            (this.app = e),
            (this.docManager = t),
            (this._currentTier = E),
            (this._tree = {}),
            (this.widget = new S(this)),
            this.refreshTree();
        }
        get currentTier() {
          return this._currentTier;
        }
        set currentTier(e) {
          e !== this._currentTier &&
            ((this._currentTier = e), this._currentTierChanged.emit(e));
        }
        get currentTierChanged() {
          return this._currentTierChanged;
        }
        get tree() {
          return this._tree;
        }
        set tree(e) {
          e !== this._tree && ((this._tree = e), this._treeChanged.emit(e));
        }
        get treeChanged() {
          return this._treeChanged;
        }
        lookupTier(e, t) {
          k('lookup', {}, { id: e }).then(e => {
            t(e);
          });
        }
        setTier(e) {
          this.lookupTier(e, e => {
            this.currentTier = e;
          });
        }
        lookupTree(e) {
          k('tree', {}).then(t => {
            e(t);
          });
        }
        refreshTree() {
          this.lookupTree(e => {
            this.tree = e;
          });
        }
        openTier(e) {
          this.lookupTier(e, t => {
            this.docManager.openOrReveal(t.file).title.label = e;
          });
        }
      }
      const _ = {
        id: 'jupyter-cassini',
        autoStart: !0,
        requires: [n.ICommandPalette, s.IDocumentManager],
        optional: [i.ILauncher],
        activate: (e, t, r, s) => {
          console.log('JupyterLab extension jupyter-cassini is activated!');
          const { commands: i } = e,
            a = 'cascommand';
          i.addCommand(a, {
            label: e => (e.isPalette ? 'What key' : 'What value'),
            caption: "Run this thing that doesn't do anything",
            execute: async t => {
              const s = new v(e, r).widget,
                i = new n.MainAreaWidget({ content: s });
              (i.id = 'cassini-browser'),
                (i.title.label = 'Cassini Browser'),
                (i.title.closable = !0),
                i.isAttached || e.shell.add(i, 'main'),
                e.shell.activateById(i.id);
            }
          }),
            console.log(a.toString()),
            t.addItem({ command: a, category: 'Cassini' }),
            s && s.add({ command: a, category: 'Cassini', rank: 1 });
        }
      };
    }
  }
]);
