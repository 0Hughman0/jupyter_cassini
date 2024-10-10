/* eslint-disable prettier/prettier */
import { ValidateFunction } from 'ajv';

import { PartialJSONObject, JSONObject, JSONValue } from '@lumino/coreutils';
import { Signal, ISignal } from '@lumino/signaling';
import { IDisposable } from '@lumino/disposable';

import { ObservableList } from '@jupyterlab/observables';
import {
  DocumentRegistry,
  Context,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { IOutput } from '@jupyterlab/nbformat';
import { Notification } from '@jupyterlab/apputils';

import { cassini, TreeChildren, ITreeData, TreeManager } from './core';
import { MetaSchema, FolderTierInfo, NotebookTierInfo } from './schema/types';
import { treeChildrenToData } from './utils';

export interface INewModel<Old, New> {
  old: Old;
  new: New;
}

export interface IModelChange {
  type: string;
}

export type TierModel = FolderTierModel | NotebookTierModel;

export class FolderTierModel {
  readonly name: string;
  readonly ids: string[];
  readonly children: TreeChildren | null;

  constructor(options: FolderTierInfo) {
    this.name = options.name;
    this.ids = options.ids;
    this.children = options.children
      ? treeChildrenToData(options.children)
      : null;
  }
}

/**
 * Browser-side model of a cassini tier.
 *
 * Most of the data for a tier is stored in its meta file. Which is a json file stored on disk and managed by the cassini server and cassini library.
 *
 * Highlights are a separate json file that is created by the python-side cassini. This is never edited by cassini.
 *
 * The meta file is managed by Context, but the Context assumes you only want to edit the file in its entirity. Therefore we have to wrap this
 * nicely. I do not want to ever have users interacting with the metaFile object directly. Instead all management of the metaFile should be handled by
 * this class... it should possibly be private!
 *
 * currently, the way to check if the model has changed is a fairly blunt:
 *
 * @property {ISignal} changed - signal emitted when the model changes
 *
 * This signal is currently emitted when any changes are made to the metaFile or hltsFile Context models. Ideally, we would return some information about
 * what has changed to prevent unecessary re-renders, but this is not currently implemented.
 *
 *
 * Note that before any values are got from the model, model.ready should be waited for. In future might be worth decorating all values to help with this.
 *
 */
export class NotebookTierModel implements IDisposable {
  readonly name: string;
  readonly ids: string[];

  readonly notebookPath: string;

  readonly metaSchema: MetaSchema;
  readonly publicMetaSchema: MetaSchema;
  readonly metaValidator: ValidateFunction<MetaSchema>;

  readonly metaFile: Context<DocumentRegistry.ICodeModel>;

  protected _hltsFile?: Context<DocumentRegistry.ICodeModel>;
  protected _children: TreeChildren | null;

  protected _required: Promise<any>[];
  protected _isDisposed: boolean;

  constructor(options: NotebookTierInfo) {
    this.name = options.name;
    this.ids = options.ids;
    this.notebookPath = options.notebookPath;

    this.metaSchema = options.metaSchema;
    this.publicMetaSchema = NotebookTierModel.createPublicMetaSchema(
      this.metaSchema
    );

    this.metaValidator = cassini.ajv.compile<MetaSchema>(this.metaSchema);

    this._children = options.children
      ? treeChildrenToData(options.children)
      : null;

    this._isDisposed = false;
    this._required = [];

    const metaFile = (this.metaFile = new Context<DocumentRegistry.ICodeModel>({
      manager: cassini.contentService,
      factory: new TextModelFactory(),
      path: options.metaPath as string
    }));

    metaFile.model.contentChanged.connect(
      () => this._changed.emit({ type: 'meta' }),
      this
    );
    metaFile.model.stateChanged.connect((sender, change) => {
      if (change.name === 'dirty') {
        this._changed.emit({ type: 'dirty' }); // the dirtiness of the metaFile is also part of the state of this model.
      }
    }, this);
    this._required.push(metaFile.initialize(false));

    if (options.hltsPath) {
      const hltsFile = (this._hltsFile = new Context({
        manager: cassini.contentService,
        factory: new TextModelFactory(),
        path: options.hltsPath as string
      }));

      hltsFile.model.contentChanged.connect(() => {
        this._changed.emit({ type: 'hlts' });
      }, this);

      this._required.push(hltsFile.initialize(false));
    }

    this.ready.then(() => this._changed.emit({ type: 'ready' }));
  }

  static createPublicMetaSchema(schema: MetaSchema): MetaSchema {
    const publicMetaSchema = structuredClone(schema);
    const names = Object.keys(publicMetaSchema.properties);

    for (const name of names) {
      const info = publicMetaSchema.properties[name];
      if (info['x-cas-field'] === 'core' || info['x-cas-field'] === 'private') {
        delete publicMetaSchema.properties[name];
      }
    }

    return publicMetaSchema;
  }

  get children() {
    return this._children;
  }

  get hltsFile() {
    return this._hltsFile;
  }

  private _changed = new Signal<
    NotebookTierModel,
    NotebookTierModel.ModelChange
  >(this);

  get changed(): ISignal<NotebookTierModel, NotebookTierModel.ModelChange> {
    return this._changed;
  }

  /**
   * Promise that resolves when the metaFile and hltsFile are ready. (if they exist!)
   *
   * Models should not be considered in a valid state until this happens... although the readonly attributes are probably fine...
   */
  get ready(): Promise<NotebookTierModel> {
    return Promise.all(this._required).then(() => {
      return this;
    });
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get treeData(): Promise<ITreeData | null> {
    return cassini.treeManager.get(this.ids);
  }

  /**
   * get contents of meta file as JSON
   */
  get meta(): JSONObject {
    if (this.metaFile?.isReady) {
      // before metaFile ready, metaFile.model.toJSON returns null!
      return this.metaFile.model.toJSON() as JSONObject;
    } else {
      return {};
    }
  }

  protected updateMeta(newMeta: JSONObject): boolean {
    if (this.metaValidator(newMeta)) {
      this.metaFile?.model.fromJSON(newMeta);
      return true;
    } else {
      const error = this.metaValidator.errors && this.metaValidator.errors[0];

      if (!error) {
        return false;
      }

      const name = error.instancePath.split('/')[1];
      const value = newMeta[name];
      Notification.error(
        `Cassini Error - ${name} ${error.message}, got: ${JSON.stringify(
          value
        )}`
      );

      return false;
    }
  }

  /**
   * Get contents of meta, excluding the CORE_META, which are the required ones.
   *
   */
  get additionalMeta(): JSONObject {
    const o = {} as JSONObject;
    const metaJSON = this.meta;

    const properties = this.metaSchema.properties;

    for (const key in metaJSON) {
      if (
        properties &&
        properties[key] &&
        ['core', 'private'].includes(properties[key]['x-cas-field'] || '')
      ) {
        continue;
      }

      o[key] = metaJSON[key] as JSONValue;
    }

    return o;
  }

  setMetaValue<T extends JSONValue>(key: string, value: T): boolean {
    const newMeta = this.meta;
    newMeta[key] = value;
    const outcome = this.updateMeta(newMeta);
    this._changed.emit({ type: 'meta' });
    return outcome;
  }

  removeMeta(key: string) {
    const newMeta = this.meta;
    delete newMeta[key];
    this.updateMeta(newMeta);
    this._changed.emit({ type: 'meta' });
  }

  get description(): string {
    return (this.meta['description'] as string) || '';
  }

  set description(value: string) {
    this.setMetaValue('description', value);
  }

  get conclusion(): string {
    return (this.meta['conclusion'] as string) || '';
  }

  set conclusion(value: string) {
    this.setMetaValue('conclusion', value);
  }

  get started(): Date {
    return new Date(this.meta['started'] as string);
  }

  get dirty(): boolean {
    return this.metaFile?.model.dirty || false;
  }

  /**
   * Gets a form of hltsFile contents that can be rendered by a mimeRenderer.
   *
   */
  get hltsOutputs(): IOutput[] {
    if (typeof this.hltsFile === 'undefined') {
      return [];
    }
    const all_outputs = [];
    const highlights = this.hltsFile.model.toJSON() as PartialJSONObject;
    for (const title in highlights) {
      const outputs = highlights[title] as PartialJSONObject;
      for (const i in outputs) {
        const output = outputs[i] as PartialJSONObject;
        all_outputs.push({ output_type: 'display_data', ...output } as IOutput);
      }
    }
    return all_outputs;
  }

  /**
   * Writes the current state of the metaFile and hltsFile models to the disk.
   *
   * If another program has made changes to these docs in the mean-time e.g. a user is manually changing tier.meta in their python-side code
   * Jupyter may complain, creating a big window about the conflict... this is useful!
   */
  save(): Promise<void> {
    return Promise.all([this.metaFile?.save(), this.hltsFile?.save()]).then();
  }

  /**
   * Overrides the contents of the metaFile and hltsFile models so they match with the conents of their files.
   *
   * Remember that the models are changed browser-side, but these changes are only applied to the files after save() is called.
   *
   * This is the opposite function, which reverts their contents to match.
   *
   * A user may create a highlights file that wasn't there when this object was initialised (see constructor). This method will pick up on that
   * and initialize the new hltsFile Context.
   *
   * Keep in mind there is no way to receive a signal when a file is changed server-side by an external application. We can only check to see its state.
   *
   */
  revert() {
    return Promise.all([
      this.metaFile?.revert(),
      this.hltsFile?.revert()
    ]).then();
  }

  refresh(
    options: Partial<
      Omit<NotebookTierInfo, 'metaPath' | 'id' | 'name' | 'notebookPath'>
    >
  ) {
    if (options.hltsPath && this.hltsFile?.localPath !== options.hltsPath) {
      const hltsFile = (this._hltsFile = new Context({
        manager: cassini.contentService,
        factory: new TextModelFactory(),
        path: options.hltsPath as string
      }));

      hltsFile.model.contentChanged.connect(() => {
        this._changed.emit({ type: 'hlts' });
      }, this);

      this._required.push(hltsFile.initialize(false));
    }

    const childrenData = options.children
      ? treeChildrenToData(options.children)
      : null;

    if (childrenData !== this.children) {
      this._children = childrenData;
      this._changed.emit({ type: 'children' });
    }

    return Promise.all([this.ready, this.revert()]);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.metaFile.dispose();
    this.hltsFile?.dispose();

    Signal.clearData(this);
  }
}

export namespace NotebookTierModel {
  export type NewModel = INewModel<
    NotebookTierModel | null,
    NotebookTierModel | null
  >;

  export type ModelChange = {
    type: 'meta' | 'hlts' | 'dirty' | 'ready' | 'children';
  };
}

export interface IAdditionalColumnsStore {
  additionalColumns: Set<string>;
  children: { [id: string]: IAdditionalColumnsStore };
}

/**
 * Model reprenting the state of a TierBrowser widget.
 *
 * The browser widget displays the children of the currentTier, which is found at the currentPath - which is a list of identifiers/ casPath/ ids -.-
 *
 * @property { ObservableList<string> } currentPath - an observable of the current path i.e. which tier are we looking at in the tier tree
 * @property { ISignal } childrenUpdated - a signal emitted when the children of the currentTier have changed for some reason.
 *
 * @protected { IAdditionalColumnsStore } _additionalColumnsStore - a little cache of what additional columns to display for a given currentPath.
 * This means users only have to add columns once (per BrowserWidget) - this could be moved, not sure what's best!
 *
 *
 */
export class TierBrowserModel {
  currentPath: ObservableList<string>;
  treeManager: TreeManager;
  protected _additionalColumnsStore: IAdditionalColumnsStore;
  protected _current: ITreeData | null;

  constructor() {
    this.currentPath = new ObservableList<string>();
    this.treeManager = cassini.treeManager;
    this._current = null;

    this.currentPath.changed.connect(path => {
      this._changed.emit({ type: 'path', path: path });

      this.treeManager.get(this.sCurrentPath).then(value => {
        this._current = value;
        this._changed.emit({ type: 'current', current: value });

        if (value?.children) {
          this._changed.emit({ type: 'children', children: value.children });
        }
      });
    }, this);

    cassini.treeManager.changed.connect((sender, { ids, data }) => {
      if (ids.toString() === this.sCurrentPath.toString()) {
        if (this.current?.children) {
          this._changed.emit({ type: 'refresh' });
        }
      }
    }, this);

    this._additionalColumnsStore = {
      additionalColumns: new Set(),
      children: {}
    };
  }

  private _changed = new Signal<this, TierBrowserModel.ModelChange>(this);

  get changed(): ISignal<this, TierBrowserModel.ModelChange> {
    return this._changed;
  }

  get current(): ITreeData | null {
    return this._current;
  }

  get childMetas(): Set<string> {
    const children = this.current?.children;
    const childMetas = new Set<string>();

    if (children) {
      for (const child of Object.values(children)) {
        for (const key of Object.keys(child.additionalMeta || {})) {
          childMetas.add(key);
        }
      }
    }
    return childMetas;
  }

  /**
   * Get the potential additional columns to be displayed from the _additionalColumnsStore.
   */
  get additionalColumns(): Set<string> {
    let branch = this._additionalColumnsStore;
    for (const id of this.currentPath) {
      let newBranch = branch.children[id];

      if (!newBranch) {
        newBranch = branch.children[id] = {
          additionalColumns: new Set(),
          children: {}
        };
      }

      branch = newBranch;
    }

    return branch.additionalColumns;
  }

  /**
   * Convenience way of getting a string version of currentPath
   */
  get sCurrentPath(): string[] {
    return Array.from(this.currentPath);
  }

  /**
   * Ask the treeManager to re-fetch the data for the current tier.
   *
   * Use if changes have been made to the TreeData since they were fetched from the cache e.g. by adding new meta in the TierView or adding new children.
   *
   */
  refresh(): Promise<ITreeData | null> {
    return this.treeManager.fetchTierData(this.sCurrentPath);
  }
}

export namespace TierBrowserModel {
  export type ModelChange =
    | {
        type: 'path';
        path: ObservableList<string>;
      }
    | {
        type: 'current';
        current: ITreeData | null;
      }
    | {
        type: 'children';
        children: TreeChildren | null;
      }
    | {
        type: 'refresh';
      };
}
