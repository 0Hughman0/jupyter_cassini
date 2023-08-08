import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { RenderMimeMetaEditor as RenderMimeMetaEditorWidget } from './ui/metaeditor';
import { RMHeader } from './ui/nbheader';

namespace RenderMimeMetaEditor {
  export const MIME_TYPE = 'application/cassini.metaeditor+json'; // need the +json or technically invalid!

  export const rendererFactory: IRenderMime.IRendererFactory = {
    safe: true,
    mimeTypes: [MIME_TYPE],
    createRenderer: options => new RenderMimeMetaEditorWidget(options)
  };
}

/**
 * Adds a new rendermime render for application/cassini.metaeditor+json
 *
 * Which creates a MetaEditorWidget.
 */
const rmMetaEditorExtension: IRenderMime.IExtension = {
  id: 'jupyter-cassini:metaeditor',
  rendererFactory: RenderMimeMetaEditor.rendererFactory,
  dataType: 'json'
};

namespace RenderMimeHeader {
  export const MIME_TYPE = 'application/cassini.header+json'; // need the +json or technically invalid!

  export const rendererFactory: IRenderMime.IRendererFactory = {
    safe: true,
    mimeTypes: [MIME_TYPE],
    createRenderer: options => new RMHeader(options)
  };
}

/**
 * Adds a new rendermime renderer for application/cassini.header+json
 *
 * Which creates a TierHeader widget.
 */
const rmHeaderExtension: IRenderMime.IExtension = {
  id: 'jupyter-cassini:header',
  rendererFactory: RenderMimeHeader.rendererFactory,
  dataType: 'json'
};

export default [rmMetaEditorExtension, rmHeaderExtension];
