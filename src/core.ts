import { CommandRegistry } from '@lumino/commands';
import { Signal, ISignal } from '@lumino/signaling';

import { MainAreaWidget } from '@jupyterlab/apputils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ServiceManager } from '@jupyterlab/services';
import { IEditorFactoryService } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import {
  CassiniServer,
  ITreeResponse,
  ITreeChildResponse,
  INewChildInfo
} from './services';
import { TierModel } from './models';
import { BrowserPanel } from './ui/browser';

export interface ILaunchable {
  name: string;
  notebookPath?: string;
}

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface IViewable extends TierModel.IOptions {}

/**
 * All ITreeData instances must implement ITreeChild data.
 *
 * The lack of children on ITreeChild data prevents the structure being recursive.
 *
 * children can then be overwritten with ITreeData to add a new level.
 */
export interface ITreeData extends Omit<ITreeResponse, 'started' | 'children'> {
  started: Date | null;
  children: { [id: string]: ITreeChildData };
  identifiers: string[];
}

export interface ITreeChildData extends Omit<ITreeChildResponse, 'started'> {
  started: Date | null;
}

/**
 * Looks after the 'tree' of tiers. Idea is to match the file structure of a cassini project. Because asking the server to generate this tree is
 * expensive, the treeManager looks after a cache of this structure.
 *
 * There should only be one instance of this class.
 *
 * All TierBrowserModels should be fetching their contents from the global instance.
 *
 * @property cache - The object that stores the tree. Is a nested structure. I'm too dumb to work out how to do a proper type definition :(
 *
 */
export class TreeManager {
  cache: any;
  nameCache: { [name: string]: ITreeData }; // name -> identifiers

  constructor() {
    this.cache = {};
    this.nameCache = {};
  }

  private _changed = new Signal<
    TreeManager,
    { ids: string[]; data: ITreeData }
  >(this);

  /**
   * Signal emitted whenever new data is inserted into the cache at a position ids.
   */
  get changed(): ISignal<TreeManager, { ids: string[]; data: ITreeData }> {
    return this._changed;
  }

  /**
   * Setup the tree. Asks the server for the contents at Home (i.e. a path of [])
   *
   * Technically overwrites cache, so maybe that's bad...
   */
  initialize(): Promise<ITreeData | null> {
    return this.fetchTierData([]).then(homeBranch => {
      //this.cache = homeBranch as ITreeData;
      return homeBranch;
    });
  }

  /**
   * Get the TierTreeData for a given path of identifiers, sometimes reffered to as casPath... apparently.
   *
   * This has to be a promise because if the TierTreeData for the provided path is not in the cache, the manager has to fetch it.
   *
   * If it's already in the cache, the promise will immediately resolve with its contents.
   *
   * If not found then ITreeData will be null.
   *
   */
  get(casPath: string[], forceRefresh = false): Promise<ITreeData | null> {
    if (forceRefresh) {
      return this.fetchTierData(casPath);
    }

    let branch = this.cache;

    for (const id of casPath) {
      const children = branch?.children;

      if (children === undefined) {
        return this.fetchTierData(casPath);
      }

      branch = children[id] as ITreeData;

      if (branch === undefined) {
        return this.fetchTierData(casPath);
      }
    }

    if (branch?.children === undefined) {
      // need to load one level down for the tier tree
      return this.fetchTierData(casPath);
    }

    return new Promise(resolve => resolve(branch));
  }

  /**
   * Get a tiers ITreeData by name... this can be useful if you know the name but not the identifiers/ casPath.
   *
   * Behaves the same as `this.get()`
   *
   * These are also cached in `this.nameCache`.
   */
  async lookup(name: string): Promise<ITreeData | null> {
    if (Object.keys(this.nameCache).includes(name)) {
      return Promise.resolve(this.nameCache[name]);
    }

    const tierInfo = await CassiniServer.lookup(name);
    return this.get(tierInfo.identifiers);
  }

  /**
   * Add treeData to the location provided by ids to the cache (will also add to nameCache).
   *
   * So actually we have 3 different names ids, identifiers and casPath... they all mean the same thing -.-
   *
   *
   */
  cacheTreeData(ids: string[], treeData: ITreeData): ITreeData {
    let branch = this.cache;

    for (const id of ids) {
      if (!branch) {
        break;
      }

      let children = branch.children;

      if (children === undefined) {
        children = branch.children = {};
      }

      if (children[id] === undefined) {
        children[id] = {};
      }

      branch = children[id];
    }

    Object.assign(branch, treeData);

    this.nameCache[treeData.name] = branch;

    this._changed.emit({ ids: ids, data: treeData });

    return branch;
  }

  /**
   * Ask the cassini server to provide TreeData for a given set of ids/ indentifiers/ casPath.
   *
   * This will also update the cache with that data.
   */
  fetchTierData(ids: string[]): Promise<ITreeData | null> {
    return CassiniServer.tree(ids)
      .then(treeResponse => {
        const newTree = TreeManager._treeResponseToData(treeResponse, ids);

        return this.cacheTreeData(ids, newTree) as ITreeData;
      })
      .catch(reason => {
        return null;
      });
  }

  /**
   * Convenience method for converting between ITreeRepsonse to ITreeData.
   *
   * This does a bit of basic parsing of the ITreeReponse, which can only be JSON, into an Object.
   *
   * Currently just parses started into an actual Date object.
   */
  static _treeResponseToData(
    treeResponse: ITreeResponse,
    ids: string[]
  ): ITreeData {
    const { started, children, ...rest } = treeResponse;

    const newTree: ITreeData = {
      started: null,
      children: {},
      identifiers: ids,
      ...rest
    };

    if (started) {
      newTree.started = new Date(started);
    }

    for (const id of Object.keys(children)) {
      const child = children[id];

      const { started, ...rest } = child;

      const newChild: ITreeChildData = {
        started: null,
        ...rest
      };

      if (child.started) {
        newChild['started'] = new Date(child.started);
      }

      newTree.children[id] = newChild;
    }

    return newTree;
  }
}

export type ITierModelTreeCache = { [id: string]: TierModel };

/**
 * Manages instances of TierModels. There should only ever be one instance per tier, or all hell will break loose.
 *
 * Instances are created here.
 */
export class TierModelTreeManager {
  cache: ITierModelTreeCache;

  constructor() {
    this.cache = {};
  }

  /**
   * Ask the manager for a tier model for the given name.
   *
   * The desired behaviour is that if a model is not in the cache, it must be created, inserted and returned.
   *
   * This makes it a bit tricky to implement...
   *
   * In order to create a new model, we need more than the name. Therefore the returned value from this manager is a callable.
   *
   * If the model is found, the callable just returns the model.
   *
   * if the model is not found, the callable takes in the needed parameters, creates the model, inserts it into the cache and returns it...
   *
   * There is almost certainly a better way of doing this.
   *
   * I wanted this to be synchronus, but an alternative, which is probably sensible is to use the treeManager.lookup.
   */
  get(
    name: string,
    forceRefresh?: boolean
  ): (tierInfo: TierModel.IOptions) => TierModel {
    if (Object.keys(this.cache).includes(name) && !forceRefresh) {
      return tierInfo => this.cache[name];
    }

    return (tierInfo: TierModel.IOptions) =>
      this._insertNewTierModel(name, tierInfo);
  }

  _insertNewTierModel(name: string, tierInfo: TierModel.IOptions) {
    const model = new TierModel(tierInfo);

    this.cache[name] = model;

    return model;
  }
}

/**
 * Looks after the state of a cassini application.
 *
 * Only one instance should exist at a time.
 *
 */
export class Cassini {
  treeManager: TreeManager;
  app: JupyterFrontEnd;
  contentService: ServiceManager.IManager;
  contentFactory: IEditorFactoryService;
  rendermimeRegistry: IRenderMimeRegistry;
  tierModelManager: TierModelTreeManager;
  commandRegistry: CommandRegistry;

  protected resolveReady: (value: void | PromiseLike<void>) => void;

  ready: Promise<void>;

  /**
   * Creates treeManager and tierModelManager instances.
   */
  constructor() {
    this.treeManager = new TreeManager();
    this.tierModelManager = new TierModelTreeManager();

    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
    });
  }

  /**
   * Initialise the cassini global.
   *
   * Returns a promise that resolves once everything is ready to go.
   *
   * Calls this.treeManager.initialize() in particular!
   */
  async initialize(
    app: JupyterFrontEnd,
    contentService: ServiceManager.IManager,
    contentFactory: IEditorFactoryService,
    rendermimeRegistry: IRenderMimeRegistry,
    commandRegistry: CommandRegistry
  ): Promise<void> {
    this.app = app;
    this.contentService = contentService;
    this.contentFactory = contentFactory;
    this.rendermimeRegistry = rendermimeRegistry;
    this.commandRegistry = commandRegistry;

    this.treeManager.initialize().then(() => this.resolveReady());
    return this.ready;
  }

  /* istanbul ignore next */
  /**
   *
   *
   * Creates a TierBrowser widget, attaches it to the main area and shows it.
   *
   * identifiers paramter determines where the browser inializes and the tierView/
   *
   * If there's already a window open that has the same indentifiers, it will just show that window.
   *
   * @param {string[]} [identifiers] - the identifiers for the tier to be opened. if not provided will just open a new window... I think!
   *
   */
  async launchTierBrowser(identifiers?: string[]) {
    await this.ready;

    const id = `cassini-browser-${identifiers}`;

    // if no identifiers provided, assume user wants a new browser, otherwise open existing.
    if (
      identifiers &&
      Array.from(this.app.shell.widgets())
        .map(w => w.id)
        .includes(id)
    ) {
      this.app.shell.activateById(id);
      return;
    }

    const browser = new BrowserPanel(identifiers);

    const content = browser;

    const mainArea = new MainAreaWidget({ content });

    mainArea.id = id;
    mainArea.title.label = 'Cassini Browser';
    mainArea.title.closable = true;

    if (!mainArea.isAttached) {
      // Attach the widget to the main work area if it's not there
      this.app.shell.add(mainArea, 'main');
    }

    // Activate the widget
    this.app.shell.activateById(mainArea.id);
  }

  /* istanbul ignore next */
  /**
   * Creates a CommandFunc to add to the command registry. Wraps around `this.launchTierBrowser`.
   *
   */
  get launchTierBrowserCommand(): CommandRegistry.CommandFunc<void> {
    return async args => {
      return this.launchTierBrowser.bind(this)();
    };
  }

  /* istanbul ignore next */
  /**
   * 'launches' a tier. I actually use open externally, so maybe should be open idk.
   *
   * If the tier has a notebook, then open the notebook.
   *
   * If it does not, then ask CassiniServer to open it, which means call the tier.open_folder() method serverside.
   */
  launchTier(tier: ILaunchable) {
    if (tier.notebookPath) {
      this.app.commands.execute('docmanager:open', {
        path: tier.notebookPath
      });
    } else {
      CassiniServer.openTier(tier.name).then(status => {
        if (!status) {
          // handle error
        }
      });
    }
  }

  newChild(
    parentTier: ITreeData,
    newChildInfo: INewChildInfo
  ): Promise<ITreeData | null> {
    return CassiniServer.newChild(newChildInfo).then(treeResponse => {
      return this.treeManager.fetchTierData(parentTier.identifiers); // refresh the tree.
    });
  }
}

/**
 * The global instance of cassini.
 *
 * Needs to be initialized via `await cassini.initialize()` before use.
 *
 * @global cassini - the global instance of cassini
 */
export const cassini = new Cassini();
