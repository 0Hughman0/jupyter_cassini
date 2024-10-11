/* eslint-disable prettier/prettier */
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';

import { ILauncher } from '@jupyterlab/launcher';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { LabIcon } from '@jupyterlab/ui-components';

import { WidgetExtension } from './widgetextension';

import { cassini } from './core';
import cassiniLogo from '../style/logo.svg';

const cassiniIcon = new LabIcon({
  name: 'cassini:logo',
  svgstr: cassiniLogo
});

/**
 * Initialization data for the jupyter_cassini extension.
 *
 * This plugin provides the cassini instance that looks after the state of the application and also creates the cassini browser extension.
 *
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-cassini',
  autoStart: true,
  requires: [
    ICommandPalette,
    IDocumentManager,
    IEditorServices,
    IRenderMimeRegistry,
    ILauncher
  ],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    docManager: IDocumentManager,
    editorService: IEditorServices,
    rendermimeRegistry: IRenderMimeRegistry,
    launcher: ILauncher
  ) => {
    console.log(
      'JupyterLab extension jupyter-cassini is activated holy cow that was hard!'
    );
    const { commands } = app;
    const command = 'cascommand';

    cassini.initialize(
      app,
      docManager.services,
      editorService.factoryService,
      rendermimeRegistry,
      commands
    );

    console.log(cassini);

    commands.addCommand(command, {
      label: args => (args['isPalette'] ? 'What key' : 'Browser'),
      caption: 'Launch a Cassini Browser Window',
      execute: cassini.launchTierBrowserCommand,
      icon: cassiniIcon
    });

    palette.addItem({ command, category: 'Cassini' });

    launcher.add({
      command,
      category: 'Cassini',
      rank: 1
    });
  }
};

/**
 * Adds the cassini toolbar to the notebook panel.
 */
const notebookExtension: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-cassini:notebookExtension',
  description: 'Adds a widget to the notebook header.',
  autoStart: true,
  activate: app => {
    app.docRegistry.addWidgetExtension('Notebook', new WidgetExtension());
  }
};

export default [extension, notebookExtension];
