import { BoxPanel, Panel, Widget } from '@lumino/widgets';
import { Signal, ISignal } from '@lumino/signaling';

import {
  Toolbar,
  ToolbarButton,
  refreshIcon,
  editIcon,
  checkIcon,
  launchIcon,
  saveIcon
} from '@jupyterlab/ui-components';
import {
  RenderMimeRegistry,
  renderMarkdown,
  MimeModel
} from '@jupyterlab/rendermime';
import { IMimeBundle } from '@jupyterlab/nbformat';

import { CodeEditorWrapper, CodeEditor } from '@jupyterlab/codeeditor';

import { cassini } from '../core';
import { NotebookTierModel } from '../models';
import { MetaEditor } from './metaeditor';

export function createElementWidget(
  element: string,
  textContent: string
): Widget {
  const node = document.createElement(element);
  node.textContent = textContent;
  const widget = new Widget({ node: node });
  return widget;
}

/**
 * Widget for editing markdown content.
 *
 * Can render the content as markdown.
 *
 * TODO reimplement with signals rather than callbacks.
 */
export class MarkdownEditor extends Panel {
  editor: CodeEditorWrapper;
  _rendered: boolean;
  output: Widget;
  editButton: ToolbarButton;
  checkButton: ToolbarButton;

  /**
   *
   * @param content
   * @param rendered
   */
  constructor(content: string, rendered: boolean) {
    super();

    this.addClass('cas-MarkdownEditor');

    const iconArea = document.createElement('div');
    iconArea.className = 'cas-icon-area';
    iconArea.classList.add('jp-ToolbarButtonComponent-icon');

    this.node.appendChild(iconArea);

    this.editButton = new ToolbarButton({
      icon: editIcon,
      onClick: () => {
        this.setRendered(false);
      },
      tooltip: 'Edit'
    });

    this.checkButton = new ToolbarButton({
      icon: checkIcon,
      onClick: () => {
        this.setRendered(true);
      },
      tooltip: 'Apply changes'
    });

    const output = (this.output = new Widget({
      node: document.createElement('div')
    }));
    output.addClass('cas-markdown-editor-content');

    this.addWidget(output);

    this.editor = new CodeEditorWrapper({
      model: new CodeEditor.Model({ mimeType: 'text/x-markdown' }),
      factory: cassini.contentFactory.newInlineEditor,
      editorOptions: { config: { lineNumbers: false } }
    });
    this.editor.addClass('cas-markdown-editor-content');

    this.source = content;

    this.addWidget(this.editor);

    output.node.ondblclick = event => {
      this.setRendered(false);
    };
    this.editor.node.addEventListener('focusout', ev => {
      this.setRendered(true);
    });

    this.onAfterAttach = () => {
      Widget.attach(this.editButton, iconArea);
      Widget.attach(this.checkButton, iconArea);

      this.setRendered(rendered);
    };
  }

  get contentChanged(): ISignal<this, string> {
    return this._contentChanged;
  }

  private _contentChanged = new Signal<this, string>(this);

  /**
   * The content of the text editor.
   */
  get source(): string {
    return this.editor.model.sharedModel.source;
  }
  set source(val: string) {
    this.editor.model.sharedModel.source = val;
    this.onStateChanged();
  }

  get rendered(): boolean {
    return this._rendered;
  }

  setRendered(val: boolean) {
    this._rendered = val;
    this.onStateChanged();

    if (val === true) {
      this._contentChanged.emit(this.source);
    }
  }

  /**
   * Handle a change to the content.
   */
  onStateChanged(): void {
    if (this.rendered) {
      const registry = cassini.rendermimeRegistry;

      renderMarkdown({
        host: this.output.node,
        source: this.source,
        trusted: false,
        sanitizer: registry.sanitizer,
        resolver: registry.resolver,
        linkHandler: registry.linkHandler,
        latexTypesetter: registry.latexTypesetter,
        shouldTypeset: true,
        markdownParser: registry.markdownParser
      });

      this.editor.setHidden(true);
      this.checkButton.setHidden(true);

      this.output.setHidden(false);
      this.editButton.setHidden(false);
    } else {
      this.editor.setHidden(false);
      this.checkButton.setHidden(false);

      this.output.setHidden(true);
      this.editButton.setHidden(true);
    }
  }
}

/**
 * Widget that summarises a TierModel which a tier in your project.
 *
 *
 */
export class TierViewer extends BoxPanel {
  tierTitle: Widget;
  descriptionCell: MarkdownEditor;
  concCell: MarkdownEditor;
  highlightsBox: Panel | undefined;
  metaView: MetaEditor;
  _model: NotebookTierModel | null;
  toolbar: Toolbar;
  launchButton: ToolbarButton;

  protected hltsRenderPromise: Promise<boolean>;

  constructor(model: NotebookTierModel | null = null) {
    super();

    this.modelChanged.connect(
      (sender, model) => this.handleNewModel(model),
      this
    );
    this.model = model;

    this.addClass('cas-tier-widget');

    const toolbar = (this.toolbar = new Toolbar());

    const saveButton = new ToolbarButton({
      icon: saveIcon,
      onClick: () => {
        this.save();
      },
      tooltip: 'Save changes to disk'
    });

    const refreshButton = new ToolbarButton({
      icon: refreshIcon,
      onClick: () => {
        this.refresh();
      },
      tooltip: 'Fetch from disk'
    });

    const launchButton = (this.launchButton = new ToolbarButton({
      icon: launchIcon,
      tooltip: 'Open Tier'
    }));

    toolbar.addItem('save', saveButton);
    toolbar.addItem('refresh', refreshButton);
    toolbar.addItem('launch', launchButton);

    this.addWidget(toolbar);
    BoxPanel.setStretch(toolbar, 0);

    const content = new Panel();
    content.addClass('cas-tier-widget-content');
    this.addWidget(content);
    BoxPanel.setStretch(content, 1);

    this.tierTitle = createElementWidget('h1', 'Name');

    content.addWidget(this.tierTitle);

    content.addWidget(createElementWidget('h2', 'Description'));

    const descriptionCell = (this.descriptionCell = new MarkdownEditor(
      '',
      true
    ));

    content.addWidget(descriptionCell);

    content.addWidget(createElementWidget('h2', 'Highlights'));

    this.highlightsBox = new Panel();
    this.highlightsBox.addClass('cas-tier-highlights-box');

    content.addWidget(this.highlightsBox);

    content.addWidget(createElementWidget('h2', 'Conclusion'));

    const concCell = (this.concCell = new MarkdownEditor('', true));

    content.addWidget(concCell);

    content.addWidget(createElementWidget('h2', 'Meta'));

    const metaView = (this.metaView = new MetaEditor(this.model));

    content.addWidget(metaView);
  }

  get modelChanged(): ISignal<TierViewer, NotebookTierModel.NewModel> {
    return this._modelChanged;
  }

  private _modelChanged = new Signal<TierViewer, NotebookTierModel.NewModel>(
    this
  );

  get model(): NotebookTierModel | null {
    return this._model;
  }

  set model(model: NotebookTierModel | null) {
    const oldModel = this._model;
    this._model = model;
    this._modelChanged.emit({ old: oldModel, new: model });
  }

  /**
   * Handle the model changing and update the contents of the widget.
   * @returns
   */
  handleModelChanged(
    model: NotebookTierModel,
    change: NotebookTierModel.ModelChange
  ): void {
    switch (change.type) {
      case 'ready': {
        this.descriptionCell.source = model.description;
        this.concCell.source = model.conclusion;
        this.renderHighlights(model);
        this.tierTitle.node.textContent = model.name + (model.dirty ? '*' : '');
        break;
      }
      case 'meta': {
        this.descriptionCell.source = model.description;
        this.concCell.source = model.conclusion;
        break;
      }
      case 'hlts': {
        this.renderHighlights(model);
        break;
      }
      case 'dirty': {
        this.tierTitle.node.textContent = model.name + (model.dirty ? '*' : '');
        break;
      }
    }
  }

  handleNewModel(change: NotebookTierModel.NewModel): void {
    if (change.old) {
      Signal.disconnectBetween(change.old, this);
      Signal.disconnectSender(this.descriptionCell);
      Signal.disconnectSender(this.concCell);
    }

    if (!change.new) {
      return;
    }

    const model = change.new;

    console.log(model);

    model.changed.connect(this.handleModelChanged, this);

    this.descriptionCell.contentChanged.connect((sender, description) => {
      model.description = description;
    }, this);

    this.concCell.contentChanged.connect((sender, conclusion) => {
      model.conclusion = conclusion;
    }, this);

    this.launchButton.onClick = () => {
      cassini.launchTier(model);
    };

    this.metaView.model = model;

    this.handleModelChanged(model, { type: 'ready' });
  }

  private renderHighlights(model: NotebookTierModel) {
    if (!this.highlightsBox) {
      return true;
    }

    for (const child of Array.from(this.highlightsBox.widgets)) {
      child.dispose();
    }

    const registry = cassini.rendermimeRegistry.clone({
      resolver: new RenderMimeRegistry.UrlResolver({
        contents: cassini.contentService.contents,
        path: model.notebookPath as string
      })
    });

    for (const data of model.hltsOutputs) {
      const mimeBundle = data.data as IMimeBundle;

      for (const mimeType of Object.keys(mimeBundle)) {
        const widget = registry.createRenderer(mimeType);
        this.highlightsBox.addWidget(widget);

        widget.renderModel(new MimeModel({ data: mimeBundle, trusted: false }));
      }
    }
  }

  save(): void {
    this.model && this.model.save(); // this could be bad if people are half-way through editing a value in a different widget somewhere.
  }

  refresh(): void {
    cassini.tierModelManager
      .get(this.model?.name || '', true)
      .then(tierModel => {
        if (tierModel instanceof NotebookTierModel) {
          this.model = tierModel;
        }
      });
  }
}
