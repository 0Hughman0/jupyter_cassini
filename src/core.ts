import { CommandRegistry } from '@lumino/commands'

import { MainAreaWidget } from '@jupyterlab/apputils'
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ServiceManager } from '@jupyterlab/services';
import { IEditorFactoryService } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { CassiniServer, ITreeResponse, ITreeChildResponse } from './services';
import { TierModel } from './models';
import { BrowserPanel } from './ui/browser';

export interface ITreeChildData extends Omit<ITreeChildResponse, 'started'> {
  started: Date | null;
}

export interface ITreeData extends Omit<ITreeResponse, 'started' | 'children'> {
  started: Date | null;
  children: { [id: string]: ITreeChildData };
  identifiers: string[]
}

export class TreeManager {
  cache: any;
  nameCache: { [name: string]: ITreeData }; // name -> identifiers

  constructor() {
    this.cache = null;
    this.nameCache = {};
  }

  initialize(): Promise<ITreeData | null> {
    return this.fetchTierData([]).then(homeBranch => {
      this.cache = homeBranch as ITreeData;
      return homeBranch;
    });
  }

  get(
    casPath: string[],
    forceRefresh: Boolean = false
  ): Promise<ITreeData | null> {
    if (forceRefresh) {
      return this.fetchTierData(casPath);
    }

    let branch = this.cache;

    for (let id of casPath) {
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

  async lookup(name: string): Promise<ITreeData | null> {
    if (name in Object.keys(this.nameCache)) {
      return Promise.resolve(this.nameCache[name]);
    }

    const tierInfo = await CassiniServer.lookup(name);
    return this.get(tierInfo.identifiers);
  }

  cacheTreeData(ids: string[], treeData: ITreeData) {
    let branch = this.cache;

    for (let id of ids) {
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

    if (branch) {
      Object.assign(branch, treeData);

      this.nameCache[treeData.name] = treeData;
    }
  }

  fetchTierData(ids: string[]): Promise<ITreeData | null> {
    return CassiniServer.tree(ids)
      .then(treeResponse => {
        const newTree = TreeManager._treeResponseToData(treeResponse, ids);

        this.cacheTreeData(ids, newTree);

        return newTree as ITreeData;
      })
      .catch(reason => {
        return null;
      });
  }

  static _treeResponseToData(treeResponse: ITreeResponse, ids: string[]): ITreeData {
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

export class TierModelTreeManager {
  cache: ITierModelTreeCache;

  constructor() {
    this.cache = {};
  }

  get(name: string, forceRefresh?: boolean): (tierInfo: TierModel.IOptions) => TierModel {
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

export class Cassini {
  treeManager: TreeManager;
  app: JupyterFrontEnd;
  contentService: ServiceManager.IManager;
  contentFactory: IEditorFactoryService;
  rendermimeRegistry: IRenderMimeRegistry;
  tierModelManager: TierModelTreeManager;
  commandRegistry: CommandRegistry;

  ready: Promise<void>

  constructor() {
    this.treeManager = new TreeManager();
    this.tierModelManager = new TierModelTreeManager();
  }

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

    this.ready = this.treeManager.initialize().then()
    return this.ready;
  }

  async launchTierBrowser(identifiers?: string[]) {
    await this.ready;

    const id = `cassini-browser-${identifiers}`
    
    // if no identifiers provided, assume user wants a new browser, otherwise open existing.
    if (identifiers && Array.from(this.app.shell.widgets()).map((w) => w.id).includes(id)) {
      this.app.shell.activateById(id)
      return
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

  get launchTierBrowserCommand(): CommandRegistry.CommandFunc<void> {
    return async (args) => {
      return this.launchTierBrowser.bind(this)()
    }
  }

  launchTier(tier: TierModel.IOptions) {
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
}

export const cassini = new Cassini();
