/* 

Taken from https://github.com/jupyterlab/jupyterlab/blob/master/packages/apputils/src/inputdialog.ts

Because these classes are not exported, we have to copy them!

*/
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

import { Dialog, Styling, InputDialog } from '@jupyterlab/apputils';

const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';
const INPUT_BOOLEAN_DIALOG_CLASS = 'jp-Input-Boolean-Dialog';

export abstract class InputDialogBase<T>
  extends Widget
  implements Dialog.IBodyWidget<T>
{
  /**
   * InputDialog constructor
   *
   * @param label Input field label
   */
  get elem(): string {
    return 'input';
  }

  constructor(label?: string) {
    super();
    this.addClass(INPUT_DIALOG_CLASS);

    this._input = document.createElement(this.elem) as HTMLInputElement;
    this._input.classList.add('jp-mod-styled');
    this._input.id = 'jp-dialog-input-id';

    if (label !== undefined) {
      const labelElement = document.createElement('label');
      labelElement.textContent = label;
      labelElement.htmlFor = this._input.id;

      // Initialize the node
      this.node.appendChild(labelElement);
    }

    this.node.appendChild(this._input);
  }

  abstract getValue(): any;
  /** Input HTML node */
  protected _input: HTMLInputElement | HTMLTextAreaElement;
}

/**
 * Widget body for input boolean dialog
 */
export class InputBooleanDialog extends InputDialogBase<boolean> {
  /**
   * InputBooleanDialog constructor
   *
   * @param options Constructor options
   */
  protected _input: HTMLInputElement;

  constructor(options: InputDialog.IBooleanOptions) {
    super(options.label);

    this.addClass(INPUT_BOOLEAN_DIALOG_CLASS);

    this._input.type = 'checkbox';
    this._input.checked = options.value ? true : false;
  }

  /**
   * Get the text specified by the user
   */
  getValue(): boolean {
    return this._input.checked;
  }
}

/**
 * Widget body for input number dialog
 */
export class InputNumberDialog extends InputDialogBase<number> {
  /**
   * InputNumberDialog constructor
   *
   * @param options Constructor options
   */

  protected _input: HTMLInputElement;

  constructor(options: InputDialog.INumberOptions) {
    super(options.label);

    this._input.type = 'number';
    this._input.value = options.value ? options.value.toString() : '0';
  }

  /**
   * Get the number specified by the user.
   */
  getValue(): number {
    if (this._input.value) {
      return Number(this._input.value);
    } else {
      return Number.NaN;
    }
  }
}

/**
 * Widget body for input text dialog
 */
export class InputTextDialog extends InputDialogBase<string> {
  protected _input: HTMLInputElement;

  /**
   * InputTextDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.ITextOptions) {
    super(options.label);

    this._input.type = 'text';
    this._input.value = options.text ? options.text : '';
    if (options.placeholder) {
      this._input.placeholder = options.placeholder;
    }
    this._initialSelectionRange = Math.min(
      this._input.value.length,
      Math.max(0, this._input.value.length)
    );
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._initialSelectionRange > 0 && this._input.value) {
      this._input.setSelectionRange(0, this._initialSelectionRange);
    }
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this._input.value;
  }

  private _initialSelectionRange: number;
}

/**
 * Widget body for input password dialog
 */
export class InputPasswordDialog extends InputDialogBase<string> {
  protected _input: HTMLInputElement;
  /**
   * InputPasswordDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.ITextOptions) {
    super(options.label);

    this._input.type = 'password';
    this._input.value = options.text ? options.text : '';
    if (options.placeholder) {
      this._input.placeholder = options.placeholder;
    }
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._input.value) {
      this._input.select();
    }
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this._input.value;
  }
}

/**
 * Widget body for input list dialog
 */
export class InputItemsDialog extends InputDialogBase<string> {
  protected _input: HTMLInputElement;
  /**
   * InputItemsDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.IItemOptions) {
    super(options.label);

    this._editable = options.editable || false;

    let current = options.current || 0;
    let defaultIndex: number;
    if (typeof current === 'number') {
      defaultIndex = Math.max(0, Math.min(current, options.items.length - 1));
      current = '';
    }

    this._list = document.createElement('select');
    options.items.forEach((item, index) => {
      const option = document.createElement('option');
      if (index === defaultIndex) {
        option.selected = true;
        current = item;
      }
      option.value = item;
      option.textContent = item;
      this._list.appendChild(option);
    });

    if (options.editable) {
      /* Use of list and datalist */
      const data = document.createElement('datalist');
      data.id = 'input-dialog-items';
      data.appendChild(this._list);

      this._input.type = 'list';
      this._input.value = current;
      this._input.setAttribute('list', data.id);
      if (options.placeholder) {
        this._input.placeholder = options.placeholder;
      }
      this.node.appendChild(data);
    } else {
      /* Use select directly */
      this._input.remove();
      this.node.appendChild(Styling.wrapSelect(this._list));
    }
  }

  /**
   * Get the user choice
   */
  getValue(): string {
    if (this._editable) {
      return this._input.value;
    } else {
      return this._list.value;
    }
  }

  private _list: HTMLSelectElement;
  private _editable: boolean;
}

export class InputTextAreaDialog extends InputDialogBase<string> {
  protected _input: HTMLTextAreaElement;

  get elem(): string {
    return 'textarea';
  }

  constructor(options: InputDialog.ITextOptions) {
    super(options.label);
  }

  getValue(): string {
    return this._input.value;
  }
}
