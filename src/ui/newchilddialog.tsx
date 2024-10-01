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

import { createValidatedInput } from './metaeditor';
import { JSONValue } from '@lumino/coreutils';

/**
 * A widget that creates a dialog for creating a new tier child.
 */
export class NewChildWidget extends Widget {
  parentName: string;

  identifierInput: ValidatingInput<string | undefined, string>;
  descriptionInput: InputTextAreaDialog;
  templateSelector: InputItemsDialog;

  subInputs: { [name: string]: ValidatingInput<any> | IDialogueInput<any> };

  constructor(tier: Required<ITreeData>) {
    super();
    this.parentName = tier.name;

    const layout = (this.layout = new PanelLayout());
    const namePrefix = tier.ids.length ? tier.name : '';
    const idRegex = new RegExp(`^${tier.childClsInfo.idRegex}$`);

    const nameTemplate = namePrefix + tier.childClsInfo.namePartTemplate;
    const identifierInput = (this.identifierInput = new ValidatingInput(
      new InputIdDialogue({
        title: 'Identitifier',
        label: 'Identifier',
        nameTemplate: nameTemplate
      }),
      (value: string | undefined) => idRegex.test(value ?? '')
    ));

    this.subInputs = {
      id: identifierInput
    };

    layout.addWidget(identifierInput.wrappedInput);

    if (tier.childClsInfo.tierType === 'notebook') {
      const descriptionInput = (this.descriptionInput = new InputTextAreaDialog(
        {
          title: 'Da Description',
          label: 'Description'
        }
      ));

      layout.addWidget(descriptionInput);

      const templateSelector = (this.templateSelector = new InputItemsDialog({
        title: 'template',
        label: 'Template',
        items: tier.childClsInfo.templates || []
      }));

      layout.addWidget(templateSelector);

      this.subInputs.description = descriptionInput;
      this.subInputs.template = templateSelector;

      for (const [name, info] of Object.entries(
        tier.childClsInfo.metaSchema.properties
      )) {
        if (['private', 'core'].includes(info['x-cas-field'] ?? '')) {
          continue;
        }

        const vinput = createValidatedInput(info, undefined, name);

        this.subInputs[name] = vinput;

        layout.addWidget(vinput.wrappedInput);
      }
    }
  }

  /**
   * Serilaises the contents of the dialogs widgets into an object and returns them for handling.
   * @returns
   */
  getValue() {
    const values: { [name: string]: JSONValue } = {};
    for (const name in this.subInputs) {
      const value = this.subInputs[name].getValue();
      if (value !== undefined) {
        values[name] = value;
      }
    }
    values['parent'] = this.parentName;
    return values;
  }
}

class textAreaAbleDialog extends Dialog<any> {
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
  const dialog = new textAreaAbleDialog({
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
