import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

import { TierNotebookHeaderTB } from './ui/nbheader';

export class WidgetExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  /**
   * Attaches an additional toolbar to the NotebookPanel widget.
   */
  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const getWidget = TierNotebookHeaderTB.attachToNotebook(panel, context);

    return new DisposableDelegate(() => {
      getWidget.then(widget => widget?.dispose());
    });
  }
}
