import { Panel } from '@lumino/widgets';
import { JSONObject } from '@lumino/coreutils';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { PathExt } from '@jupyterlab/coreutils';

import { TierModel } from '../models';
import { MetaTableWidget } from './metatable';
import { JSONValue } from '@lumino/coreutils';

import { cassini } from '../core';

/**
 * Widget for modifying the meta of a TierModel.
 */
export class MetaEditor extends Panel {
  protected model: TierModel;
  table: MetaTableWidget;

  constructor(tierModel: TierModel, attributes?: string[]) {
    super();

    this.model = tierModel;

    const table = (this.table = new MetaTableWidget(
      {},
      this.onMetaUpdate.bind(this),
      this.onRemoveMeta.bind(this),
      this.model.changed
    ));

    this.addWidget(table);

    if (attributes) {
      this.render(attributes);
    }
  }

  ready() {
    /**
     * Does the widget have all the data it needs to render correctly?
     */
    return this.model.ready;
  }

  onMetaUpdate(attribute: string, newValue: string): void {
    /**
     * TODO this is badly named and maybe not the best implementation
     *
     * inserts updated meta into model.
     */
    const meta = this.model.metaFile?.model.toJSON() as JSONObject;

    meta[attribute] = JSON.parse(newValue);

    this.model.metaFile?.model.fromJSON(meta);
  }

  onRemoveMeta(attribute: string) {
    /**
     * TODO this is badly named and maybe not the best implementation
     *
     * Removes a meta from the model
     */
    const meta = this.model.metaFile?.model.toJSON() as JSONObject;
    delete meta[attribute];

    this.model.metaFile?.model.fromJSON(meta);
  }

  render(attributes: string[]) {
    /**
     * Asks the widget to re-render with the attributes provided. This is a bit odd, but is kinda needed because of how mimetype renders.
     */
    this.ready().then(() => {
      const meta: { [name: string]: JSONValue } = {};

      for (const key of attributes) {
        const val = this.model.additionalMeta[key];
        meta[key] = val;
      }

      this.table.attributes = meta;
      this.table.update();
    });
  }
}

export interface IMetaEditorRendorMimeData {
  values: string[];
}

/**
 * Version of MetaEditor that works as a RenderMime Renderer i.e. implements a renderModel method.
 */
export class RenderMimeMetaEditor
  extends Panel
  implements IRenderMime.IRenderer
{
  protected _path: string;
  protected tierModel: TierModel;
  protected editor: MetaEditor;
  private fetchModel: Promise<TierModel | undefined>;

  /**
   * Strange thing is that the data from the rendermime are not passed at initialisation, but during renderModel, hence we have to be ready for that.
   *
   * The widget needs to know what tier it is creating an editor for. Because tier names are unique. Extracting the name from the provided URLResolver is the
   * solution I've gone with.
   *
   * TODO there should probably be a check that the whole path to the notebook matches that expected for the widget, to avoid name clashing documents from tricking
   * cassini into thinking its a tier notebook. (or maybe that's a helpful hack) - the issue is and remains that the notebook intepretter can think a notebook corresponds
   * to a tier that it doesn't.
   *
   * @param options
   *
   */
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

      console.log('B');
      console.log(this.tierModel);
      return this.tierModel;
    });

    this.fetchModel.then(model => {
      if (model) {
        this.editor = new MetaEditor(model);
        this.addWidget(this.editor);
      }
    });
  }

  /**
   * Is the widget model ready?
   */
  ready(): Promise<void> {
    return this.fetchModel.then(model => model?.ready.then());
  }

  get path(): string {
    return this._path;
  }

  get name(): string {
    return PathExt.basename(this.path, '.ipynb');
  }

  /**
   * Is called by the notebook to actually update the contents of the widget.
   *
   * In theory this can be called multiple times by the notebook, after the widget instance has been created.
   *
   * @param model
   * @returns
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // mimedata seems to have to be an Object, or it won't be save properly
    const data = model.data[this._mimeType] as any as IMetaEditorRendorMimeData;

    let attributes = data['values'] as string | string[];

    if (typeof attributes === 'string') {
      attributes = [attributes];
    }

    this.ready().then(() => {
      this.editor.render(attributes as string[]);
    });

    return Promise.resolve();
  }

  private _mimeType: string;
}
