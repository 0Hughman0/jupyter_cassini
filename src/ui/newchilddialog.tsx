import { Widget, PanelLayout } from '@lumino/widgets';
import { InputDialog, Dialog } from '@jupyterlab/apputils';

import { ITreeData, cassini } from '../core';
import {
  InputDialogBase,
  InputTextDialog,
  InputItemsDialog,
  InputTextAreaDialog,
  InputNumberDialog
} from './dialogwidgets';

export interface IIdDialogOptions extends InputDialog.ITextOptions {
  idRegex: string;
  nameTemplate: string;
}

/**
 * Version of InputTextDialog that indicates is the contents of the input does not match `idRegex`
 */
export class IdDialog extends InputTextDialog {
  idRegex: RegExp;
  nameTemplate: string;
  previewBox: HTMLSpanElement;

  constructor(options: IIdDialogOptions) {
    super(options);
    this.idRegex = new RegExp(`^${options.idRegex}$`);
    this.nameTemplate = options.nameTemplate;

    this.input.addEventListener('input', this.validateInput.bind(this));

    this.previewBox = document.createElement('span');
    this.node.appendChild(this.previewBox);
    this.previewBox.textContent = `Preview: ${this.nameTemplate.replace(
      '{}',
      '?'
    )}`;
  }

  validateInput(): boolean {
    const id = this.input.value;

    this.previewBox.textContent = `Preview: ${this.nameTemplate.replace(
      '{}',
      id
    )}`;

    if (id && !this.idRegex.test(id)) {
      this.input.classList.add('cas-invalid-id');

      return false;
    } else {
      this.input.classList.remove('cas-invalid-id');

      return true;
    }
  }
}

/**
 * A widget that creates a dialog for creating a new tier child.
 */
export class NewChildWidget extends Widget {
  parentName: string;

  identifierInput: IdDialog;
  descriptionInput: InputTextAreaDialog;
  templateSelector: InputItemsDialog;

  metaInputs: (InputTextDialog | InputNumberDialog)[];

  subInputs: { [name: string]: InputDialogBase<any> };

  constructor(tier: Required<ITreeData>) {
    super();
    this.parentName = tier.name;

    const layout = (this.layout = new PanelLayout());
    const namePrefix = tier.identifiers.length ? tier.name : '';
    const nameTemplate = namePrefix + tier.childClsInfo.namePartTemplate;
    const identifierInput = (this.identifierInput = new IdDialog({
      title: 'Identitifier',
      label: 'Identifier',
      idRegex: tier.childClsInfo.idRegex as string,
      nameTemplate: nameTemplate
    }));
    const descriptionInput = (this.descriptionInput = new InputTextAreaDialog({
      title: 'Da Description',
      label: 'Description'
    }));
    const templateSelector = (this.templateSelector = new InputItemsDialog({
      title: 'template',
      label: 'Template',
      items: tier.childClsInfo.templates || []
    }));

    this.subInputs = {
      id: identifierInput,
      description: descriptionInput,
      template: templateSelector
    };

    const metaInputs: (InputTextDialog | InputNumberDialog)[] =
      (this.metaInputs = []);

    layout.addWidget(identifierInput);
    layout.addWidget(descriptionInput);
    layout.addWidget(templateSelector);

    for (const additionalMeta of tier.childClsInfo.metaNames) {
      let input;

      if (typeof additionalMeta === 'string') {
        input = new InputTextDialog({ title: '', label: additionalMeta });
      } else {
        input = new InputNumberDialog({ title: '', label: additionalMeta });
      }

      metaInputs.push(input);
      this.subInputs[additionalMeta] = input;

      layout.addWidget(input);
    }
  }

  /**
   * Serilaises the contents of the dialogs widgets into an object and returns them for handling.
   * @returns
   */
  getValue() {
    const values: { [name: string]: any } = {};
    for (const name in this.subInputs) {
      values[name] = this.subInputs[name].getValue();
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
