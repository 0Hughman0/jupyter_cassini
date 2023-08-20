import { BoxPanel, Panel, Widget, SplitPanel } from '@lumino/widgets';

import { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { PathExt } from '@jupyterlab/coreutils';
import { Toolbar, ToolbarButton } from '@jupyterlab/ui-components';
import { treeViewIcon } from '@jupyterlab/ui-components';

import { ITreeData, cassini } from '../core';
import { MarkdownEditor } from './tierviewer';
import { TierModel } from '../models';
import { ChildrenSummaryWidget } from './nbheadercomponents';
import { openNewChildDialog } from './newchilddialog';

/**
 * Additional toolbar to insert at the top of notebooks that correspond to tiers.
 *
 * Currently just provides a button for showing the tier in the browser.
 *
 * Also indicates the 'dirty' status of the TierModel with a lil' asterix.
 *
 * Saving is bolted onto the notebook save... which I think is smart but maybe isn't(?)
 */
export class TierNotebookHeaderTB extends BoxPanel {
  toolbar: Toolbar;
  model: TierModel;
  nameLabel: Widget;

  constructor(tierInfo: ITreeData) {
    super();

    this.addClass('cas-TierNotebookHeader');

    const toolbar = (this.toolbar = new Toolbar());

    this.model = cassini.tierModelManager.get(tierInfo.name)(tierInfo);

    const nameLabel = (this.nameLabel = new Widget());
    nameLabel.node.textContent = this.model.name;

    toolbar.addItem('name', nameLabel);

    const started = new Widget();
    started.node.textContent = this.model.started?.toLocaleDateString() && '';

    toolbar.addItem('started', started);

    const showInBrowserButton = new ToolbarButton({
      icon: treeViewIcon,
      onClick: () => {
        this.showInBrowser();
      },
      tooltip: `Show ${this.model.name} in browser`
    });

    toolbar.addItem('show in browser', showInBrowserButton);

    this.addWidget(toolbar);
    BoxPanel.setStretch(toolbar, 0);

    this.model.changed.connect(() => this.onContentChanged());
  }

  /**
   *
   * @param panel Notebook panel to attach the widget to
   * @param context The context for that panel. Name from the path is used to fetch the tier model (same as editor and header mimes)
   * @returns
   */
  static attachToNotebook(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): Promise<TierNotebookHeaderTB | undefined> {
    const tierName = PathExt.basename(context.path, '.ipynb');

    return cassini.treeManager.lookup(tierName).then(tierInfo => {
      if (tierInfo) {
        const widget = new TierNotebookHeaderTB(tierInfo);

        panel.contentHeader.addWidget(widget);

        context.saveState.connect((sender, state) => {
          if (state === 'started') {
            widget.model.save();
          }
        });

        return widget;
      }
    });
  }

  /**
   * Show the tier this notebook corresponds to in the browser
   */
  showInBrowser() {
    cassini.launchTierBrowser(this.model.identifiers);
  }

  /**
   * Handle a change to the TierModel.
   */
  onContentChanged() {
    if (this.model.dirty) {
      this.nameLabel.node.textContent = this.model.name + '*';
    } else {
      this.nameLabel.node.textContent = this.model.name;
    }
  }
}

/**
 * Widget to go at the top of notebooks, allowing for editing and nice rendering of conclusion and description.
 *
 * Also has table of children, this is useful for opening datasets.
 *
 * TODO add a new child button to the childrenTable.
 */
export class TierNotebookHeader extends Panel {
  _path: string;
  model: TierModel;
  content: SplitPanel;

  descriptionEditor: MarkdownEditor;
  conclusionEditor: MarkdownEditor;
  childrenSummary: ChildrenSummaryWidget;

  constructor(tierInfo: ITreeData) {
    super();

    this.addClass('cas-TierNotebookHeader');

    this.model = cassini.tierModelManager.get(tierInfo.name)(tierInfo);

    const title = document.createElement('h1');
    title.textContent = this.model.name;

    this.addWidget(new Widget({ node: title }));

    const content = (this.content = new SplitPanel());
    content.addClass('cas-TierNotebookHeader-content');

    const descriptionBox = new Panel();
    descriptionBox.addClass('cas-TierNotebookHeader-content-child');

    const descriptionLabel = document.createElement('h3');
    descriptionLabel.textContent = 'Description';
    descriptionBox.addWidget(new Widget({ node: descriptionLabel }));

    const descriptionEditor = (this.descriptionEditor = new MarkdownEditor(
      this.model.description,
      true,
      description => {
        this.model.description = description;
      }
    ));
    descriptionBox.addWidget(descriptionEditor);

    content.addWidget(descriptionBox);

    const conclusionBox = new Panel();
    conclusionBox.addClass('cas-TierNotebookHeader-content-child');

    const conclusionLabel = document.createElement('h3');
    conclusionLabel.textContent = 'Conclusion';
    conclusionBox.addWidget(new Widget({ node: conclusionLabel }));

    const conclusionEditor = (this.conclusionEditor = new MarkdownEditor(
      this.model.conclusion,
      true,
      conclusion => {
        this.model.conclusion = conclusion;
      }
    ));
    conclusionBox.addWidget(conclusionEditor);

    content.addWidget(conclusionBox);

    this.addWidget(content);

    const childrenBox = new Panel();
    childrenBox.addClass('cas-TierNotebookHeader-content-child');

    const childrenLabel = document.createElement('h3');
    childrenLabel.textContent = 'Children';
    childrenBox.addWidget(new Widget({ node: childrenLabel }));

    this.model.children.then(children => {
      const childrenSummary = (this.childrenSummary = new ChildrenSummaryWidget(
        children ? Object.entries(children) : [],
        data => data && cassini.launchTier(data),
        (data, id) =>
          cassini.launchTierBrowser([...this.model.identifiers, id]),
        () => this.model.treeData.then(data => data && openNewChildDialog(data))
      ));
      childrenBox.addWidget(childrenSummary);

      content.addWidget(childrenBox);
    });

    this.model.changed.connect(() => this.onContentChanged());
    this.model.ready.then(() => this.onContentChanged());
  }

  showInBrowser() {
    cassini.launchTierBrowser(this.model.identifiers);
  }

  /**
   * Update content of the widget when the model changes
   */
  onContentChanged() {
    this.descriptionEditor.source = this.model.description;
    this.conclusionEditor.source = this.model.conclusion;
    this.model.children.then(children => {
      this.childrenSummary.data = children ? Object.entries(children) : [];
    });
  }
}

/**
 * Wrapper of the TierNotebookHeader widget that works as a mimetype renderer.
 */
export class RMHeader extends Panel implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  protected _path: string;
  protected tierModel: TierModel;
  private fetchModel: Promise<TierModel | undefined>;

  constructor(options: IRenderMime.IRendererOptions) {
    super();

    this._mimeType = options.mimeType;

    const resolver = options.resolver as RenderMimeRegistry.UrlResolver; // uhoh this could be unstable!
    this._path = resolver.path;

    this.fetchModel = cassini.treeManager.lookup(this.name).then(tierInfo => {
      if (!tierInfo) {
        return;
      }

      this.addWidget(new TierNotebookHeader(tierInfo));

      this.tierModel = cassini.tierModelManager.get(tierInfo.name)(tierInfo);

      return this.tierModel;
    });
  }

  ready(): Promise<void> {
    return this.fetchModel.then(model => model?.ready.then());
  }

  get path(): string {
    return this._path;
  }

  get name(): string {
    return PathExt.basename(this.path, '.ipynb');
  }

  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this._mimeType;
    // mimedata seems to have to be an Object, or it won't be save properly
    return Promise.resolve();
  }

  private _mimeType: string;
}
