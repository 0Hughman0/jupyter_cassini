/* eslint-disable prettier/prettier */
import { SplitPanel } from '@lumino/widgets';

import { cassini, ILaunchable } from '../core';
import { TierModel, TierBrowserModel as TierTreeModel } from '../models';
import { TierBrowser as TierTree } from './treeview';
import { TierViewer } from './tierviewer';

/**
 * BrowserPanel contains a TierBrowser, and TierViewer.
 *
 * Sits as a tab in the main area.
 *
 * TODO, open and launch are confusing, open is reffered to as preview to users (better name?)
 *
 * launch refered to as open.
 *
 *
 */
export class BrowserPanel extends SplitPanel {
  model: TierTreeModel;
  browser: TierTree;
  viewer: TierViewer;

  constructor(identifiers?: string[]) {
    super();

    const ids = identifiers || [];

    this.id = `cas-container-${ids}`;

    const treeModel = (this.model = new TierTreeModel());

    console.log(this);

    cassini.treeManager.get(ids).then(tier => {
      if (!tier) {
        return;
      }

      const browser = (this.browser = new TierTree(treeModel));

      browser.tierSelected.connect((sender, tierSelectedSignal) => {
        this.openTier(tierSelectedSignal.path, tierSelectedSignal.tier);
      }, this);
      browser.tierLaunched.connect((sender, tierData) => {
        this.launchTier(tierData);
      }, this);

      this.addWidget(browser);
      SplitPanel.setStretch(browser, 0);

      const tierContent = (this.viewer = new TierViewer(tier));

      this.addWidget(tierContent);
      SplitPanel.setStretch(tierContent, 1);

      this.setRelativeSizes([3, 1]);

      browser.renderPromise?.then(val => {
        // browser.renderPromise is undefined until the react widget is attached to the window... I think!
        treeModel.currentPath.clear();
        treeModel.currentPath.pushAll(ids);
      });
    });
  }

  /**
   * View a tier in the brower's TierViewer, which is kinda like a preview.
   *
   * @param casPath { string[] } - not currently used.
   * @param tierData { TierModel.IOptions } - info required to open (preview?) a tier in a tierView
   */
  openTier(casPath: string[], tierData: TierModel.IOptions): void {
    this.viewer.setHidden(true);
    this.viewer.dispose();
    const newTier = (this.viewer = new TierViewer(tierData));

    if (newTier.model.metaFile) {
      newTier.model.metaFile.ready.then(value => {
        this.viewer.update();
      });
    }

    if (newTier.model.hltsFile) {
      newTier.model.hltsFile.ready.then(value => {
        this.viewer.update();
      });
    }

    this.addWidget(newTier);
    SplitPanel.setStretch(newTier, 1);
  }

  /**
   * 'Launch' or 'open' a tier i.e. if it has a notebook, open the notebook. If does not, open explorer on its folder.
   * @param tier
   */
  launchTier(tier: ILaunchable): void {
    cassini.launchTier(tier);
  }
}
