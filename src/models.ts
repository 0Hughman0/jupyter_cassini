/* eslint-disable prettier/prettier */
import { ObservableList } from '@jupyterlab/observables';
import {
  DocumentRegistry,
  Context,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { IOutput } from '@jupyterlab/nbformat';

import { PartialJSONObject, JSONObject, JSONValue } from '@lumino/coreutils';
import { Signal, ISignal } from '@lumino/signaling';

import { cassini, ITreeChildData, ITreeData, TreeManager } from './core';

const CORE_META: (keyof TierModel)[] = ['description', 'conclusion', 'started'];

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
export class TierModel {
  readonly name: string;
  readonly identifiers: string[];
  readonly notebookPath: string | undefined;
  readonly started: Date;

  readonly hltsPath: string | undefined;

  metaFile?: Context<DocumentRegistry.ICodeModel>;
  hltsFile?: Context<DocumentRegistry.ICodeModel>;

  protected _required: Promise<any>[];

  constructor(options: TierModel.IOptions) {
    this.name = options.name;
    this.identifiers = options.identifiers;
    this.notebookPath = options.notebookPath;

    this.hltsPath = options.hltsPath;

    cassini.treeManager.changed.connect((sender, { ids, data }) => {
      if (ids.toString() === this.identifiers.toString()) {
        this._changed.emit();
      }
    });

    this._required = [];

    if (options.metaPath) {
      const metaFile = (this.metaFile =
        new Context<DocumentRegistry.ICodeModel>({
          manager: cassini.contentService,
          factory: new TextModelFactory(),
          path: options.metaPath as string
        }));
      this._required.push(metaFile.ready);

      metaFile.initialize(false);
      metaFile.ready.then(() => {
        metaFile.model.contentChanged.connect(() => this._changed.emit(), this);
        metaFile.model.stateChanged.connect((sender, change) => {
          if (change.name === 'dirty') {
            this._changed.emit(); // the dirtiness of the metaFile is also part of the state of this model.
          }
        });
      });
    }

    if (options.hltsPath) {
      // check the file exists.
      cassini.contentService.contents
        .get(options.hltsPath, { content: false })
        .then(model => {
          // only create Context if it does.
          const hltsFile = (this.hltsFile = new Context({
            manager: cassini.contentService,
            factory: new TextModelFactory(),
            path: options.hltsPath as string
          }));
          this._required.push(hltsFile.ready);

          hltsFile.initialize(false);

          this.hltsFile.ready.then(() => {
            this.hltsFile?.model.contentChanged.connect(() => {
              this._changed.emit();
            }, this);
          });
        })
        .catch(reason => reason); // fails if file doesn't exist
    }
  }

  private _changed = new Signal<TierModel, void>(this);

  get changed(): ISignal<TierModel, void> {
    return this._changed;
  }

  /**
   * Promise that resolves when the metaFile and hltsFile are ready. (if they exist!)
   *
   * Models should not be considered in a valid state until this happens... although the readonly attributes are probably fine...
   */
  get ready(): Promise<TierModel> {
    return Promise.all(this._required).then(() => this);
  }

  get treeData(): Promise<ITreeData | null> {
    return cassini.treeManager.get(this.identifiers);
  }

  get children(): Promise<{ [id: string]: ITreeChildData } | null> {
    return this.treeData.then(data => data?.children || null);
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

  /**
   * Get contents of meta, excluding the CORE_META, which are the required ones.
   *
   */
  get additionalMeta(): JSONObject {
    const o = {} as JSONObject;
    const metaJSON = this.meta;
    for (const key in metaJSON) {
      if ((CORE_META as string[]).indexOf(key) < 0) {
        o[key] = metaJSON[key] as JSONValue;
      }
    }
    return o;
  }

  get description(): string {
    return (this.meta['description'] as string) || '';
  }
  set description(value: string) {
    if (!this.metaFile) {
      throw 'Tier has no meta, cannot store description';
    }

    const oldMeta = this.meta;
    oldMeta['description'] = value;
    this.metaFile.model.fromJSON(oldMeta);
  }

  get conclusion(): string {
    return (this.meta['conclusion'] as string) || '';
  }
  set conclusion(value: string) {
    if (!this.metaFile) {
      throw 'Tier has no meta, cannot store conclusion';
    }

    const oldMeta = this.meta;
    oldMeta['conclusion'] = value;
    this.metaFile.model.fromJSON(oldMeta);
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
    let highlightsExists: Promise<void>;

    if (this.hltsPath && !this.hltsFile) {
      // Highlights may have been added since initialisation - so check!
      highlightsExists = cassini.contentService.contents
        .get(this.hltsPath, { content: false })
        .then(model => {
          const hltsFile = (this.hltsFile = new Context({
            manager: cassini.contentService,
            factory: new TextModelFactory(),
            path: this.hltsPath as string
          }));

          hltsFile.initialize(false);
        })
        .catch(reason => reason);
    } else {
      highlightsExists = Promise.resolve();
    }

    return Promise.all([
      this.metaFile?.revert(),
      highlightsExists.then(() =>
        this.hltsFile?.ready.then(() => this.hltsFile?.revert())
      )
    ]).then();
  }
}

export namespace TierModel {
  export interface IOptions {
    name: string;
    identifiers: string[];
    children?: { [id: string]: { name: string } };
    metaPath?: string;
    hltsPath?: string;
    notebookPath?: string;
  }
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

  constructor() {
    this.currentPath = new ObservableList<string>();
    this.treeManager = cassini.treeManager;
    this.currentPath.changed.connect(() => {
      this._childrenUpdated.emit(this.current);
    }, this);

    cassini.treeManager.changed.connect((sender, { ids, data }) => {
      if (ids.toString() === this.sCurrentPath.toString()) {
        this._childrenUpdated.emit(this.current);
      }
    });

    this._additionalColumnsStore = {
      additionalColumns: new Set(),
      children: {}
    };
  }

  private _childrenUpdated = new Signal<this, Promise<ITreeData | null>>(this);

  public get childrenUpdated(): ISignal<this, Promise<ITreeData | null>> {
    return this._childrenUpdated;
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
   * Promise that resolves with the children of the currentTier
   */
  getChildren(): Promise<{ [name: string]: ITreeChildData }> {
    return this.current.then(tierData => {
      if (tierData?.children) {
        return tierData.children;
      } else {
        return {};
      }
    });
  }

  /**
   * The current tier that's displayed in the Tree
   */
  get current(): Promise<ITreeData | null> {
    return this.treeManager.get(this.sCurrentPath);
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
