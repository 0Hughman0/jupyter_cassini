import { Panel } from '@lumino/widgets';
import { JSONObject } from '@lumino/coreutils'

import { IRenderMime } from '@jupyterlab/rendermime-interfaces'
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { PathExt } from '@jupyterlab/coreutils';

import { TierModel } from '../models';
import { MetaTableWidget } from './metatable';
import { JSONValue } from '@lumino/coreutils';

import { cassini } from '../core';


export class MetaEditor extends Panel {
  protected model: TierModel;
  table: MetaTableWidget

  constructor(tierModel: TierModel, attributes?: string[]) {
    super();

    this.model = tierModel;

    const table = this.table = new MetaTableWidget({}, 
      this.onMetaUpdate.bind(this),
      this.onRemoveMeta.bind(this),
      this.model.changed
    )
    
    this.addWidget(table)
      
    if (attributes) {
      this.render(attributes);
    }
  }

  ready() {
    return this.model.ready;
  }

  onMetaUpdate(attribute: string, newValue: string): void {
    const meta = this.model.metaFile?.model.toJSON() as JSONObject
  
    meta[attribute] = JSON.parse(newValue);

    this.model.metaFile?.model.fromJSON(meta);
  }

  onRemoveMeta(attribute: string) {
    const meta = this.model.metaFile?.model.toJSON() as JSONObject
    delete meta[attribute]

    this.model.metaFile?.model.fromJSON(meta);
  }

  render(attributes: string[]) {
    this.ready().then(() => {

      const meta: {[name: string]: JSONValue} = {}

      for (const key of attributes) {
        const val = this.model.additionalMeta[key]
        meta[key] = val
      }

      this.table.attributes = meta
      this.table.update()
    });
  }
}


export interface IMetaEditorRendorMimeData {
  values: string[];
}


export class RenderMimeMetaEditor
  extends Panel
  implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  protected _path: string;
  protected tierModel: TierModel;
  protected editor: MetaEditor;
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

      this.tierModel = cassini.tierModelManager.get(tierInfo.name)(tierInfo);

      console.log("B")
      console.log(this.tierModel)
      return this.tierModel
    })
    
    this.fetchModel.then((model) => {
      if (model) {
        this.editor = new MetaEditor(model);
        this.addWidget(this.editor)
      }
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
    // mimedata seems to have to be an Object, or it won't be save properly
    const data = model.data[this._mimeType] as any as IMetaEditorRendorMimeData;

    let attributes = data['values'] as string | string[];

    if (typeof attributes === 'string') {
      attributes = [attributes];
    }

    this.ready().then(() => {
      this.editor.render(attributes as string[])
      });

    return Promise.resolve();
  }

  private _mimeType: string;
}
