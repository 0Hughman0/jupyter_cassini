import { BoxPanel, Panel, Widget } from '@lumino/widgets';

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
import { TierModel } from '../models';
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

  onContentChanged: (content: string) => void;

  /**
   *
   * @param content
   * @param rendered
   * @param onContentChanged - callback that's called with the content of the widget when the check Button is pressed...
   */
  constructor(
    content: string,
    rendered: boolean,
    onContentChanged: (content: string) => void
  ) {
    super();

    this.addClass('cas-MarkdownEditor');

    this.onContentChanged = onContentChanged;

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
    };
  }

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
      this.onContentChanged(this.source);
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
  model: TierModel;
  toolbar: Toolbar;

  protected hltsRenderPromise: Promise<boolean>;

  constructor(tierData: TierModel.IOptions) {
    super();
    this.model = cassini.tierModelManager.get(tierData.name)(tierData);
    console.log(this.model);

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
        this.fetch();
      },
      tooltip: 'Fetch from disk'
    });

    const launchButton = new ToolbarButton({
      icon: launchIcon,
      onClick: () => {
        cassini.launchTier(this.model);
      },
      tooltip: `Open ${this.model.name}`
    });

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
      this.model.description,
      true,
      description => (this.model.description = description)
    ));

    content.addWidget(descriptionCell);

    content.addWidget(createElementWidget('h2', 'Highlights'));

    this.highlightsBox = new Panel();
    this.highlightsBox.addClass('cas-tier-highlights-box');

    this.hltsRenderPromise = Promise.resolve(true);
    this.renderHighlights();

    content.addWidget(this.highlightsBox);

    content.addWidget(createElementWidget('h2', 'Conclusion'));

    const concCell = (this.concCell = new MarkdownEditor(
      this.model.conclusion,
      true,
      conclusion => (this.model.conclusion = conclusion)
    ));

    content.addWidget(concCell);

    content.addWidget(createElementWidget('h2', 'Meta'));

    const metaView = (this.metaView = new MetaEditor(
      this.model,
      Object.keys(this.model.additionalMeta)
    ));

    content.addWidget(metaView);

    this.model.ready.then(() => this.onContentChanged());
    this.model.changed.connect(model => this.onContentChanged());
  }

  /**
   * Handle the model changing and update the contents of the widget.
   * @returns
   */
  onContentChanged(): void {
    if (!this.model.metaFile) {
      return;
    }

    if (this.model.dirty) {
      this.tierTitle.node.textContent = this.model.name + '*';
    } else {
      this.tierTitle.node.textContent = this.model.name;
    }

    this.descriptionCell.source = this.model.description;

    this.concCell.source = this.model.conclusion;

    // the update could be new meta
    this.metaView.render(Object.keys(this.model.additionalMeta));

    this.renderHighlights();
  }

  renderHighlights() {
    if (!this.highlightsBox) {
      return true;
    }

    for (const child of Array.from(this.highlightsBox.widgets)) {
      child.dispose();
    }

    const registry = cassini.rendermimeRegistry.clone({
      resolver: new RenderMimeRegistry.UrlResolver({
        contents: cassini.contentService.contents,
        path: this.model.notebookPath as string
      })
    });

    for (const data of this.model.hltsOutputs) {
      const mimeBundle = data.data as IMimeBundle;

      for (const mimeType of Object.keys(mimeBundle)) {
        const widget = registry.createRenderer(mimeType);
        this.highlightsBox.addWidget(widget);

        widget.renderModel(new MimeModel({ data: mimeBundle, trusted: false }));
      }
    }
  }

  save(): void {
    this.model.save(); // this could be bad if people are half-way through editing a value in a different widget somewhere.
  }

  fetch(): void {
    this.model.revert();
  }
}
