// import * as React from 'react'
import { signalToPromise } from '@jupyterlab/testutils';
import { screen, render } from '@testing-library/react'

import { BrowserComponent } from '../../ui/treeview';
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
    
    const widget = new BrowserComponent({ 
        model: model, 
        onCreateChild: jest.fn(), 
        onTierSelected: jest.fn(), 
        onTierLaunched: jest.fn(), 
    });

    render(widget.render())

    const updated = signalToPromise(model.currentPath.changed);
    const childrenUpdated = signalToPromise(model.childrenUpdated);
    model.currentPath.clear();

    await childrenUpdated;
    await updated;

    await screen.findByText('WP1')
    //expect(mockSetState).toBeCalled();
    expect(widget.state.children).toMatchObject(TreeManager._treeResponseToData(HOME_TREE, []))
})