import { JSONValue } from '@lumino/coreutils';
import { Widget, PanelLayout } from '@lumino/widgets';

import { Dialog } from '@jupyterlab/apputils';

import { ITreeData, cassini } from '../core';
import {
  InputIdDialogue,
  IDialogueInput,
  InputItemsDialog,
  InputTextAreaDialog,
  ValidatingInput
} from './dialogwidgets';
import { NotebookTierModel } from '../models';
import { MetaTableWidget } from './metatable';
import { createElementWidget } from '../utils';
import { NewChildInfo } from '../schema/types';

/**
 * A widget that creates a dialog for creating a new tier child.
 */
export class NewChildWidget extends Widget {
  parentName: string;

  identifierInput: ValidatingInput<string | undefined, string>;
  descriptionInput: InputTextAreaDialog;
  templateSelector: InputItemsDialog;

  subInputs: { [name: string]: ValidatingInput<any> | IDialogueInput<any> };

  metaTable?: MetaTableWidget;

  constructor(tier: Required<ITreeData>) {
    super();
    this.addClass('cas-new-child-body');

    this.parentName = tier.name;

    const layout = (this.layout = new PanelLayout());
    const namePrefix = tier.ids.length ? tier.name : '';
    const idRegex = new RegExp(`^${tier.childClsInfo.idRegex}$`);

    const nameTemplate = namePrefix + tier.childClsInfo.namePartTemplate;
    const identifierInput = (this.identifierInput = new ValidatingInput(
      new InputIdDialogue({
        title: 'Identitifier',
        nameTemplate: nameTemplate,
        label: 'Identifier'
      }),
      (value: string | undefined) => {
        if (value) {
          return (
            idRegex.test(value) && !Object.keys(tier.children).includes(value)
          );
        } else {
          return false;
        }
      }
    ));
    identifierInput.wrappedInput.addClass('cas-new-child-input');

    this.subInputs = {
      id: identifierInput
    };

    layout.addWidget(identifierInput.wrappedInput);

    if (tier.childClsInfo.tierType === 'notebook') {
      const descriptionInput = (this.descriptionInput = new InputTextAreaDialog(
        {
          title: 'Description',
          label: 'Description'
        }
      ));
      descriptionInput.addClass('cas-new-child-input');

      layout.addWidget(descriptionInput);

      const templateSelector = (this.templateSelector = new InputItemsDialog({
        title: 'template',
        label: 'Template',
        items: tier.childClsInfo.templates || [],
        placeholder: 'Select a Template'
      }));
      templateSelector.addClass('cas-new-child-input');

      layout.addWidget(templateSelector);

      this.subInputs.description = descriptionInput;
      this.subInputs.template = templateSelector;

      const metaTable = (this.metaTable = new MetaTableWidget(
        NotebookTierModel.createPublicMetaSchema(tier.childClsInfo.metaSchema),
        Object.fromEntries(
          tier.childClsInfo.additionalMetaKeys.map(v => [v, undefined])
        ),
        undefined,
        undefined,
        false
      ));
      metaTable.addClass('cas-new-child-input');

      const metaLabel = createElementWidget('label', 'Meta');
      (metaLabel.node as HTMLLabelElement).htmlFor = metaTable.node.id =
        'cas-meta-editor-id';
      layout.addWidget(metaLabel);
      layout.addWidget(metaTable);
    }
  }

  /**
   * Serilaises the contents of the dialogs widgets into an object and returns them for handling.
   * @returns
   */
  getValue(): NewChildInfo {
    const values: { [name: string]: JSONValue } = {};

    for (const name in this.subInputs) {
      const value = this.subInputs[name].getValue();
      if (value !== undefined) {
        values[name] = value;
      }
    }
    values['parent'] = this.parentName;

    if (this.metaTable) {
      Object.assign(values, this.metaTable.getValue());
    }

    return values as NewChildInfo;
  }
}

class textAreaAbleDialog<T> extends Dialog<T> {
  protected _evtKeydown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case 13: {
        if (document.activeElement instanceof HTMLTextAreaElement) {
          return;
        }
      }
    }
    super._evtKeydown(event);
  }
}

/**
 * Opens a big dialog asking the user to provide values for a new tier.
 *
 * Uses the `Dialog` class from jlab.
 *
 * @param tier
 */
export function openNewChildDialog(tier: ITreeData): Promise<ITreeData | null> {
  const body = new NewChildWidget(tier as Required<ITreeData>);
  const dialog = new textAreaAbleDialog<any>({
    title: `Create New ${tier.childClsInfo?.name}`,
    body: body
  });
  return dialog.launch().then(outcome => {
    if (outcome.value) {
      return cassini.newChild(tier, outcome.value);
    } else {
      return Promise.resolve(null);
    }
  });
}
