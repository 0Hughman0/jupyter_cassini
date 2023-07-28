import { BoxPanel, Panel, Widget, SplitPanel } from '@lumino/widgets';

import { INotebookModel, NotebookPanel } from "@jupyterlab/notebook";
import { DocumentRegistry } from "@jupyterlab/docregistry";
import { IRenderMime } from '@jupyterlab/rendermime-interfaces'
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { PathExt } from '@jupyterlab/coreutils';
import { Toolbar, ToolbarButton } from '@jupyterlab/ui-components';
import { treeViewIcon } from '@jupyterlab/ui-components';

import { ITreeData, cassini } from '../core';
import { MarkdownEditor } from './tierviewer';
import { TierModel } from '../models';
import { ChildrenSummaryWidget, ChildrenSummaryRow } from './nbheadercomponents';



export class TierNotebookHeaderTB extends BoxPanel {
  toolbar: Toolbar;
  model: TierModel;
  nameLabel: Widget;

  constructor(tierInfo: ITreeData) {
    super();

    this.addClass('cas-TierNotebookHeader')
    
    const toolbar = this.toolbar = new Toolbar();

    this.model = cassini.tierModelManager.get(tierInfo.name)(tierInfo)

    const nameLabel = this.nameLabel= new Widget()
    nameLabel.node.textContent = this.model.name

    toolbar.addItem('name', nameLabel);
    
    const started = new Widget()
    started.node.textContent = this.model.started?.toLocaleDateString() && ''

    toolbar.addItem('started', started);

    const showInBrowserButton = new ToolbarButton({
      icon: treeViewIcon,
      onClick: () => {
        this.showInBrowser()
      },
      tooltip: `Show ${this.model.name} in browser`
    })

    toolbar.addItem('show in browser', showInBrowserButton);

    this.addWidget(toolbar);
    BoxPanel.setStretch(toolbar, 0)
    
    this.model.changed.connect(() => this.onContentChanged())
  }

  static attachToNotebook(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): Promise<TierNotebookHeaderTB | undefined> {
    const tierName = PathExt.basename(context.path, '.ipynb');

    return cassini.treeManager.lookup(tierName).then(tierInfo => {
      if (tierInfo) {
        const widget = new TierNotebookHeaderTB(tierInfo);
        
        panel.contentHeader.addWidget(widget)
        
        context.saveState.connect((sender, state) => {
          if (state == "started") {
            widget.model.save();
          }
        })

        return widget
      }
    });
  }

  showInBrowser() {
    cassini.launchTierBrowser(this.model.identifiers)
  }

  onContentChanged() {
    if (this.model.dirty) {
      this.nameLabel.node.textContent = this.model.name + '*'
    } else {
      this.nameLabel.node.textContent = this.model.name
    }
  }
}

export class TierNotebookHeader extends Panel {
  _path: string;
  model: TierModel;
  content: SplitPanel;

  descriptionEditor: MarkdownEditor
  conclusionEditor: MarkdownEditor

  constructor(tierInfo: ITreeData) {
    super();

    this.addClass('cas-TierNotebookHeader')

    this.model = cassini.tierModelManager.get(tierInfo.name)(tierInfo)

    const title = document.createElement('h1')
    title.textContent = this.model.name
    
    this.addWidget(new Widget({node: title}))

    const content = this.content = new SplitPanel()
    content.addClass('cas-TierNotebookHeader-content')

    const descriptionBox = new Panel()
    descriptionBox.addClass('cas-TierNotebookHeader-content-child')
    
    const descriptionLabel = document.createElement('h3')
    descriptionLabel.textContent = "Description"
    descriptionBox.addWidget(new Widget( {node: descriptionLabel }))
    
    const descriptionEditor = this.descriptionEditor = new MarkdownEditor(this.model.description, true, (description) => {this.model.description = description})
    descriptionBox.addWidget(descriptionEditor)

    content.addWidget(descriptionBox)

    const conclusionBox = new Panel()
    conclusionBox.addClass('cas-TierNotebookHeader-content-child')
    
    const conclusionLabel = document.createElement('h3')
    conclusionLabel.textContent = "Conclusion"
    conclusionBox.addWidget(new Widget( {node: conclusionLabel} ))

    const conclusionEditor = this.conclusionEditor = new MarkdownEditor(this.model.conclusion, true, (conclusion) => {this.model.conclusion = conclusion})
    conclusionBox.addWidget(conclusionEditor)

    content.addWidget(conclusionBox)

    this.addWidget(content)

    const childrenBox = new Panel()
    childrenBox.addClass('cas-TierNotebookHeader-content-child')
    
    const childrenLabel = document.createElement('h3')
    childrenLabel.textContent = "Children"
    childrenBox.addWidget(new Widget ({node: childrenLabel}))

    const data = Object.entries(this.model.children).map((val) => new Object({name: val[1].name, id: val[0]}) as ChildrenSummaryRow )
    
    const childrenSummary = new ChildrenSummaryWidget(data, 
      (id) => {
        cassini.treeManager.get([...this.model.identifiers, id]).then((data) => data && cassini.launchTier(data))
      },
      (id) => {
        cassini.launchTierBrowser([...this.model.identifiers, id])
      }
    )

    childrenBox.addWidget(childrenSummary)

    content.addWidget(childrenBox)

    this.model.changed.connect(() => this.onContentChanged())
    this.model.ready.then(() => this.onContentChanged())
  }

  showInBrowser() {
    cassini.launchTierBrowser(this.model.identifiers)
  }

  onContentChanged() {
    this.descriptionEditor.source = this.model.description
    this.conclusionEditor.source = this.model.conclusion
  }
}

/**
 * A notebook widget extension that adds a widget in the notebook header (widget below the toolbar).
 */


export class RMHeader
  extends Panel
  implements IRenderMime.IRenderer {
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

      this.addWidget(new TierNotebookHeader(tierInfo))
      
      this.tierModel = cassini.tierModelManager.get(tierInfo.name)(tierInfo);
      
      return this.tierModel
    })
  }

  ready(): Promise<void> {
    return this.fetchModel.then(model => model?.ready.then(() => {}));
  }

  get path(): string {
    return this._path;
  }

  get name(): string {
    return PathExt.basename(this.path, '.ipynb');
  }

  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this._mimeType
    // mimedata seems to have to be an Object, or it won't be save properly
    return Promise.resolve();
  }

  private _mimeType: string;
}
