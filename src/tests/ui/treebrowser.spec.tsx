import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { signalToPromise } from '@jupyterlab/testutils';
import { Notification } from '@jupyterlab/apputils';

import { TierBrowser } from '../../ui/browser';
import {
  CassiniCrumbs,
  TierTreeBrowser,
  ChildrenTable,
  CasSearch
} from '../../ui/treeview';
import { TierBrowserModel, NotebookTierModel } from '../../models';
import { treeResponseToData } from '../../utils';

import {
  mockServerAPI,
  createTierFiles,
  mockCassini,
  awaitSignalType
} from '../tools';
import {
  HOME_TREE,
  WP1_TREE,
  WP1_INFO,
  TEST_META_CONTENT,
  TEST_HLT_CONTENT
} from '../test_cases';
import { TreeResponse } from '../../schema/types';
import { TierViewer } from '../../ui/tierviewer';
import { ObservableList } from '@jupyterlab/observables';
import userEvent from '@testing-library/user-event';

let home_tree: TreeResponse;
let wp1_tree: TreeResponse;

beforeEach(async () => {
  mockCassini();

  const INFO = WP1_INFO;
  //delete INFO['hltsPath'];

  home_tree = structuredClone(HOME_TREE);
  wp1_tree = structuredClone(WP1_TREE);

  mockServerAPI({
    '/tree/{ids}': [
      { path: '', response: home_tree },
      { path: '1', response: wp1_tree },
      {
        path: 'invalid',
        response: {
          response: {
            reason: 'Not Found',
            message: 'Could not find'
          },
          status: 404
        }
      }
    ],
    '/lookup': [
      { query: { name: 'WP1' }, response: INFO },
      {
        query: { name: 'Home' },
        response: {
          name: 'Home',
          ids: [],
          children: ['WP1', 'WP2'],
          tierType: 'folder'
        }
      },
      {
        query: { name: 'invalid' },
        response: {
          reason: 'Not Found',
          message: 'Could not find'
        },
        status: 404
      }
    ]
  });
  createTierFiles([
    { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
    { path: WP1_INFO.hltsPath || '', content: TEST_HLT_CONTENT }
  ]);

  Notification.manager.dismiss();
});

describe('tier browser', () => {
  test('construct', async () => {
    const widget = new TierBrowser(['1']);

    expect(widget.browser).toBeInstanceOf(TierTreeBrowser);
    expect(widget.viewer).toBeInstanceOf(TierViewer);

    await awaitSignalType(widget.model.changed, 'current');
    expect(widget.browser.currentTier?.name).toEqual('WP1');

    await signalToPromise(widget.viewer.modelChanged);
    expect(widget.viewer.tierTitle.node.textContent).toEqual('WP1');
  });

  test('preview invalid ids', async () => {
    expect(Notification.manager.notifications[0]?.message).toBeUndefined();

    const widget = new TierBrowser();
    widget.previewTier('invalid');

    await signalToPromise(Notification.manager.changed);

    expect(Notification.manager.notifications[0]?.message).toContain(
      'Not Found'
    );
  });
});

describe('tree browser', () => {
  test('construct', async () => {
    const model = new TierBrowserModel();

    const widget = new TierTreeBrowser(model, jest.fn(), jest.fn(), jest.fn());
    expect(widget.render()).toEqual(
      <div>
        <a>Loading</a>
      </div>
    );

    model.currentPath.clear();
    await signalToPromise(model.changed);

    expect(widget.render()).not.toEqual(
      <div>
        <a>Loading</a>
      </div>
    );

    expect(widget?.currentTier?.name).toBe('Home');
    expect(widget.currentTier).toBe(model.current);
    expect(widget.tierChildren).toMatchObject(
      treeResponseToData(HOME_TREE, []).children
    );
    expect(widget.currentPath).toBe(model.currentPath);
    expect(widget.childMetas).toEqual(new Set(['Fishes', 'Crabs']));
    expect(widget.additionalColumns).toEqual(new Set());
  });

  test('current path update', async () => {
    const model = new TierBrowserModel();
    const widget = new TierTreeBrowser(model, jest.fn(), jest.fn(), jest.fn());

    model.currentPath.clear();
    await awaitSignalType(model.changed, 'current');

    model.currentPath.push('1');
    await awaitSignalType(model.changed, 'current');

    expect(Array.from(widget.currentPath)).toEqual(['1']);
    expect(widget.currentTier?.name).toEqual('WP1');
    expect(widget.currentTier).toEqual(treeResponseToData(WP1_TREE, ['1']));
    expect(widget.tierChildren).toEqual(
      treeResponseToData(WP1_TREE, ['1']).children
    );
    expect(widget.childMetas).toEqual(new Set());
  });

  test('children updated and refresh', async () => {
    const model = new TierBrowserModel();
    const widget = new TierTreeBrowser(model, jest.fn(), jest.fn(), jest.fn());

    model.currentPath.clear();
    await awaitSignalType(model.changed, 'current');

    expect(widget.tierChildren).toEqual(
      treeResponseToData(HOME_TREE, []).children
    );
    expect(widget.childMetas).toEqual(new Set(['Fishes', 'Crabs']));

    home_tree['children']['3'] = {
      name: 'WP3',
      additionalMeta: { x: 'y' },
      metaPath: 'ignore'
    };

    await model.refresh();

    expect(widget.tierChildren).not.toEqual(
      treeResponseToData(HOME_TREE, []).children
    );

    expect(Object.keys(widget.tierChildren)).toContain('3');
    expect(widget.childMetas).toEqual(new Set(['Fishes', 'Crabs', 'x']));
  });
});

describe('CasSearch', () => {
  test('search', async () => {
    const model = new TierBrowserModel();
    render(<CasSearch model={model}></CasSearch>);

    expect(model.current?.name).not.toEqual('WP1');

    const user = userEvent.setup();

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('WP1');
    user.keyboard('{Enter}'); // no wait here, or somehow it also waits for the signal below...?

    await awaitSignalType(model.changed, 'current');

    expect(model.current?.name).toEqual('WP1');
  });

  test('invalid name notifies', async () => {
    const model = new TierBrowserModel();
    render(<CasSearch model={model}></CasSearch>);

    Notification.dismiss();

    const user = userEvent.setup();

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('invalid');
    user.keyboard('{Enter}'); // no wait here, or somehow it also waits for the signal below...?

    await signalToPromise(Notification.manager.changed);

    expect(Notification.manager.notifications[0].message).toContain(
      'Not Found'
    );
  });
});

describe('crumbs', () => {
  let onTierSelected: jest.Mock;
  let onRefreshTree: jest.Mock;
  let onTierLaunched: jest.Mock;
  let onCreateChild: jest.Mock;

  beforeEach(() => {
    onTierSelected = jest.fn();
    onRefreshTree = jest.fn();
    onTierLaunched = jest.fn();
    onCreateChild = jest.fn();
  });

  test('preview button notebooktier', async () => {
    const user = userEvent.setup();

    const currentPath = new ObservableList<string>();
    const currentTier = treeResponseToData(WP1_TREE, ['1']);

    render(
      <CassiniCrumbs
        currentPath={currentPath}
        currentTier={currentTier}
        onRefreshTree={onRefreshTree}
        onCreateChild={onCreateChild}
        onTierLaunched={onTierLaunched}
        onTierSelected={onTierSelected}
      ></CassiniCrumbs>
    );

    await user.click(screen.getByRole('button', { name: 'Preview WP1' }));

    expect(onTierSelected).toBeCalledWith([], 'WP1');
  });

  test('cannot preview folder tier in crumbs', async () => {
    const currentPath = new ObservableList<string>();
    const currentTier = treeResponseToData(HOME_TREE, []);

    render(
      <CassiniCrumbs
        currentPath={currentPath}
        currentTier={currentTier}
        onRefreshTree={onRefreshTree}
        onCreateChild={onCreateChild}
        onTierLaunched={onTierLaunched}
        onTierSelected={onTierSelected}
      ></CassiniCrumbs>
    );

    expect(screen.getByRole('button', { name: 'Preview Home' })).toBeDisabled();
    expect(onTierSelected).not.toBeCalledWith([], 'Home');
  });
});

describe('tree browser component', () => {
  let onTierSelected: jest.Mock;
  let onTierLaunched: jest.Mock;
  let onCreateChild: jest.Mock;
  let onSelectMetas: jest.Mock;

  beforeEach(() => {
    onTierSelected = jest.fn();
    onTierLaunched = jest.fn();
    onCreateChild = jest.fn();
    onSelectMetas = jest.fn();
  });

  test('folder tier preview disabled', async () => {
    const currentPath = new ObservableList<string>();
    const currentTier = treeResponseToData(WP1_TREE, ['1']);
    currentTier.childClsInfo = {
      tierType: 'folder',
      idRegex: '(d+)',
      namePartTemplate: '{}',
      name: 'A Folder Tier'
    };

    render(
      <ChildrenTable
        currentPath={currentPath}
        currentTier={currentTier}
        children={currentTier.children}
        additionalColumns={new Set()}
        onTierLaunched={onTierLaunched}
        onTierSelected={onTierSelected}
        onCreateChild={onCreateChild}
        onSelectMetas={onSelectMetas}
      ></ChildrenTable>
    );

    const previewButton = screen.getByRole('button', { name: 'Preview WP1.1' });
    expect(previewButton).toBeDisabled();
  });
});

describe('tier viewer', () => {
  test('construct', async () => {
    const model = new NotebookTierModel(WP1_INFO);
    const widget = new TierViewer(model);

    await awaitSignalType(model.changed, 'ready');

    expect(widget.descriptionCell.source).toEqual(
      TEST_META_CONTENT.description
    );
    expect(widget.concCell.source).toEqual(TEST_META_CONTENT.conclusion);
    expect(widget.highlightsBox?.widgets[0].node.textContent).toEqual('## cos');
  });

  test('refresh raises', async () => {
    const model = new NotebookTierModel(WP1_INFO);
    const widget = new TierViewer(model);

    await awaitSignalType(model.changed, 'ready');
    mockServerAPI({
      '/lookup': [
        {
          query: { name: 'WP1' },
          response: {
            reason: 'Not Found',
            message: 'Could not find'
          },
          status: 404
        }
      ]
    });

    widget.refresh();

    await signalToPromise(Notification.manager.changed);

    expect(Notification.manager.notifications[0]?.message).toContain(
      'Not Found'
    );
  });
});
