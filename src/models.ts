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

export class TierModel {
  readonly name: string;
  readonly identifiers: string[];
  readonly notebookPath: string | undefined;
  readonly started: Date;

  readonly hltsPath: string | undefined

  readonly children: {[id: string]: {name: string}}; // should be observable

  metaFile?: Context<DocumentRegistry.ICodeModel>;
  hltsFile?: Context<DocumentRegistry.ICodeModel>;
  
  constructor(options: TierModel.IOptions) {
    this.name = options.name;
    this.identifiers = options.identifiers;
    this.notebookPath = options.notebookPath;

    this.hltsPath = options.hltsPath
    
    this.children = options.children || {}

    if (options.metaPath) {
      this.metaFile = new Context<DocumentRegistry.ICodeModel>({
        manager: cassini.contentService,
        factory: new TextModelFactory(),
        path: options.metaPath as string
      });
      this.metaFile.initialize(false);
      this.metaFile.ready.then(() => {
        this.metaFile?.model.sharedModel.changed.connect(() => this._changed.emit())
      })
    }

    if (options.hltsPath) {
      // check the file exists.
      cassini.contentService.contents.get(options.hltsPath, {content: false}).then((model) => {
        // only create Context if it does.
        const hltsFile = this.hltsFile = new Context({
          manager: cassini.contentService,
          factory: new TextModelFactory(),
          path: options.hltsPath as string
        });
        hltsFile.initialize(false);
      }).catch((reason) => reason) // fails if file doesn't exist
      
      if (this.hltsFile) {
        this.hltsFile.ready.then(() => {
          this.hltsFile?.model.sharedModel.changed.connect(() => {
            this._changed.emit()
          })
        })
      }
    }
  }

  private _changed = new Signal<TierModel, void>(this)
  
  get changed(): ISignal<TierModel, void> {
    return this._changed
  }

  get ready(): Promise<TierModel> {
    const required = [this.metaFile?.ready, this.hltsFile?.ready]

    return Promise.all(required).then(
      () => this
    );
  }

  get meta(): JSONObject {
    if (this.metaFile?.isReady) {
      // before metaFile ready, metaFile.model.toJSON returns null!
      return this.metaFile.model.toJSON() as JSONObject;
    } else {
      return {};
    }
  }

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
      return;
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
      return;
    }

    const oldMeta = this.meta;
    oldMeta['conclusion'] = value;
    this.metaFile.model.fromJSON(oldMeta);
  }
  
  get dirty(): boolean {
    return this.metaFile?.model.dirty || false
  }

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

  save(): Promise<void> {
    return Promise.all([this.metaFile?.save(), this.hltsFile?.save()]).then(() => {})
  }

  revert() {
    if (this.hltsPath && !this.hltsFile) {
      // Highlights may have been added since initialisation - so check!
      cassini.contentService.contents.get(this.hltsPath, {content: false}).then((model) => {

        const hltsFile = this.hltsFile = new Context({
          manager: cassini.contentService,
          factory: new TextModelFactory(),
          path: this.hltsPath as string
        });
        
        hltsFile.initialize(false);
      }).catch(reason => reason)
    }
    
    return Promise.all([this.metaFile?.revert(), this.hltsFile?.ready.then(() => this.hltsFile?.revert())]).then(() => {})
  }
}

export namespace TierModel {
  export interface IOptions {
    name: string;
    identifiers: string[]
    children?: {[id: string]: {name: string}}
    metaPath?: string;
    hltsPath?: string;
    notebookPath?: string;
  }
}

export interface IAdditionalColumnsStore {
  additionalColumns: Set<string>;
  children: { [id: string]: IAdditionalColumnsStore };
}

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

    this._additionalColumnsStore = {
      additionalColumns: new Set(),
      children: {}
    };
  }

  private _childrenUpdated = new Signal<this, Promise<ITreeData | null>>(this);

  public get childrenUpdated(): ISignal<this, Promise<ITreeData | null>> {
    return this._childrenUpdated;
  }

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

  getChildren(): Promise<{ [name: string]: ITreeChildData }> {
    return this.current.then(tierData => {
      if (tierData?.children) {
        return tierData.children;
      } else {
        return {};
      }
    });
  }

  get current(): Promise<ITreeData | null> {
    return this.treeManager.get(this.sCurrentPath);
  }

  get sCurrentPath(): string[] {
    return Array.from(this.currentPath);
  }

  refresh(): Promise<ITreeData | null> {
    return this.treeManager.fetchTierData(this.sCurrentPath).then(() => {
      const current = this.current;
      this._childrenUpdated.emit(current);
      return current;
    });
  }
}
