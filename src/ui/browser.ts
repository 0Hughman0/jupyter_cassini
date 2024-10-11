/* eslint-disable prettier/prettier */
import { SplitPanel } from '@lumino/widgets';

import { cassini, ILaunchable } from '../core';
import { NotebookTierModel, TierBrowserModel } from '../models';
import { TierTreeBrowser } from './treeview';
import { TierViewer } from './tierviewer';
import { openNewChildDialog } from './newchilddialog';

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
export class TierBrowser extends SplitPanel {
  model: TierBrowserModel;
  browser: TierTreeBrowser;
  viewer: TierViewer;

  constructor(identifiers?: string[]) {
    super();

    const ids = identifiers || [];

    this.id = `cas-container-${ids}`;

    const treeModel = (this.model = new TierBrowserModel());

    console.log(this);

    const browser = (this.browser = new TierTreeBrowser(
      treeModel,
      (path: string[], name: string) => this.previewTier(name),
      this.launchTier,
      currentTier => openNewChildDialog(currentTier)
    ));

    this.addWidget(browser);
    SplitPanel.setStretch(browser, 0);

    const tierContent = (this.viewer = new TierViewer());

    this.addWidget(tierContent);
    SplitPanel.setStretch(tierContent, 1);

    this.setRelativeSizes([5, 2]);

    cassini.treeManager.get(ids).then(tier => {
      if (!tier) {
        return;
      }

      treeModel.currentPath.clear();
      treeModel.currentPath.pushAll(ids);
      this.previewTier(tier.name);
    });
  }

  /**
   * View a tier in the brower's TierViewer, which is kinda like a preview.
   *
   * @param name { string }
   */
  previewTier(name: string): void {
    cassini.tierModelManager.get(name).then(tierModel => {
      if (tierModel instanceof NotebookTierModel) {
        this.viewer.model = tierModel;
      }
    });
  }

  /**
   * 'Launch' or 'open' a tier i.e. if it has a notebook, open the notebook. If does not, open explorer on its folder.
   * @param tier
   */
  launchTier(tier: ILaunchable): void {
    cassini.launchTier(tier);
  }
}
