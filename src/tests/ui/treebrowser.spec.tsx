import { signalToPromise } from '@jupyterlab/testutils';

import { TierBrowser } from '../../ui/treeview';
import { TierBrowserModel } from '../../models';
import { TreeManager } from '../../core';

import { mockServerAPI } from '../tools';
import { HOME_TREE, WP1_TREE } from '../test_cases';



beforeEach(() => {
    mockServerAPI({
      '/tree': [
        { query: { 'ids[]': '' }, response: HOME_TREE },
        { query: { 'ids[]': '1' }, response: WP1_TREE }
      ]
    });
});

test('construct', async () => {
    const model = new TierBrowserModel();
    
    const widget = new TierBrowser( 
        model, 
        jest.fn(), 
        jest.fn(), 
        jest.fn(), 
    );

    const updated = signalToPromise(model.currentPath.changed);
    const childrenUpdated = signalToPromise(model.childrenUpdated);
    model.currentPath.clear();

    await childrenUpdated;
    await updated;

    expect(widget.tierChildren).toMatchObject(TreeManager._treeResponseToData(HOME_TREE, []).children)
})