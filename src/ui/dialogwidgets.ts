/* 

Taken from https://github.com/jupyterlab/jupyterlab/blob/master/packages/apputils/src/inputdialog.ts

Because these classes are not exported, we have to copy them!

*/
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

import { Dialog, Styling, InputDialog } from '@jupyterlab/apputils';

const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';
const INPUT_BOOLEAN_DIALOG_CLASS = 'jp-Input-Boolean-Dialog';

export interface IDialogueInput<T> extends Required<Dialog.IBodyWidget<T>>{}


export abstract class InputDialogBase<T>
  extends Widget
  implements IDialogueInput<T>
{
  /**
   * InputDialog constructor
   *
   * @param label Input field label
   */
  get elem(): string {
    return 'input';
  }

  get inputType(): string | null {
    return 'text'
  }

  constructor(options: {label?: string}) {
    super();
    this.addClass(INPUT_DIALOG_CLASS);

    const { label } = options

    this.input = document.createElement(this.elem) as HTMLInputElement;
    if (this.inputType) {
      this.input.type = this.inputType
    }
    
    this.input.classList.add('jp-mod-styled');
    this.input.id = 'jp-dialog-input-id';

    if (label !== undefined) {
      const labelElement = document.createElement('label');
      labelElement.textContent = label;
      labelElement.htmlFor = this.input.id;

      // Initialize the node
      this.node.appendChild(labelElement);
    }

    this.node.appendChild(this.input);
  }

  abstract getValue(): T;
  /** Input HTML node, access is not part of public API */
  input: HTMLInputElement | HTMLTextAreaElement;
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
  input: HTMLInputElement;
  get inputType() {
    return 'checkbox'
  }

  constructor(options: InputDialog.IBooleanOptions) {
    super(options);

    this.addClass(INPUT_BOOLEAN_DIALOG_CLASS);
    this.input.checked = options.value ? true : false;
  }

  /**
   * Get the text specified by the user
   */
  getValue(): boolean {
    return this.input.checked;
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

  input: HTMLInputElement;

  get inputType() {
    return 'number'
  }

  constructor(options: InputDialog.INumberOptions) {
    super(options);

    this.input.value = options.value ? options.value.toString() : '0';
  }

  /**
   * Get the number specified by the user.
   */
  getValue(): number {
    if (this.input.value) {
      return Number(this.input.value);
    } else {
      return Number.NaN;
    }
  }
}

/**
 * Widget body for input text dialog
 */
export class InputTextDialog extends InputDialogBase<string> {
  input: HTMLInputElement;

  get inputType() {
    return 'text'
  }
  
  /**
   * InputTextDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.ITextOptions) {
    super(options);
    this.input.value = options.text ? options.text : '';
    if (options.placeholder) {
      this.input.placeholder = options.placeholder;
    }
    this._initialSelectionRange = Math.min(
      this.input.value.length,
      Math.max(0, this.input.value.length)
    );
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._initialSelectionRange > 0 && this.input.value) {
      this.input.setSelectionRange(0, this._initialSelectionRange);
    }
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this.input.value;
  }

  private _initialSelectionRange: number;
}

/**
 * Widget body for input password dialog
 */
export class InputPasswordDialog extends InputDialogBase<string> {
  input: HTMLInputElement;

  get inputType() {
    return 'password'
  }
  
  /**
   * InputPasswordDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.ITextOptions) {
    super(options);

    this.input.value = options.text ? options.text : '';
    if (options.placeholder) {
      this.input.placeholder = options.placeholder;
    }
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this.input.value) {
      this.input.select();
    }
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this.input.value;
  }
}

/**
 * Widget body for input list dialog
 */
export class InputItemsDialog extends InputDialogBase<string> {
  input: HTMLInputElement;
  list: HTMLSelectElement;

  get inputType() {
    return 'list'
  }
  /**
   * InputItemsDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.IItemOptions) {
    super(options);

    this._editable = options.editable || false;

    let current = options.current || 0;
    let defaultIndex: number;
    if (typeof current === 'number') {
      defaultIndex = Math.max(0, Math.min(current, options.items.length - 1));
      current = '';
    }

    this.list = document.createElement('select');
    options.items.forEach((item, index) => {
      const option = document.createElement('option');
      if (index === defaultIndex) {
        option.selected = true;
        current = item;
      }
      option.value = item;
      option.textContent = item;
      this.list.appendChild(option);
    });

    if (options.editable) {
      /* Use of list and datalist */
      const data = document.createElement('datalist');
      data.id = 'input-dialog-items';
      data.appendChild(this.list);
      
      this.input.value = current;
      this.input.setAttribute('list', data.id);
      if (options.placeholder) {
        this.input.placeholder = options.placeholder;
      }
      this.node.appendChild(data);
    } else {
      /* Use select directly */
      this.input.remove();
      this.node.appendChild(Styling.wrapSelect(this.list));
    }
  }

  /**
   * Get the user choice
   */
  getValue(): string {
    if (this._editable) {
      return this.input.value;
    } else {
      return this.list.value;
    }
  }

  private _editable: boolean;
}

/* Cassini defined dialogue widgets */

export class InputTextAreaDialog extends InputDialogBase<string> {
  input: HTMLTextAreaElement;

  get elem(): string {
    return 'textarea';
  }

  get inputType(): null {
    return null
  }

  constructor(options: InputDialog.ITextOptions) {
    super(options);
  }

  getValue(): string {
    return this.input.value;
  }
}

export class InputDateDialog extends InputDialogBase<string> {

  get inputType() {
    return 'date'
  }

  constructor(options: InputDialog.ITextOptions) {
    super(options);
  }

  getValue(): string {
    return new Date(this.input.value).toISOString();
  }
}

export class InputDatetimeDialog extends InputDialogBase<string> {
  get inputType() {
    return 'datetime-local'
  }

  constructor(options: InputDialog.ITextOptions) {
    super(options);
  }

  getValue(): string {
    return new Date(this.input.value + 'Z').toISOString();
  }
}

/*

Validator Wrapper.

*/ 


export class ValidatingInput<T> {
  validator: (value: T) => boolean
  wrappedInput: InputDialogBase<T>

  constructor(inputWidget: InputDialogBase<T>, validator: (value: T) => boolean) {
    this.wrappedInput = inputWidget
    this.validator = validator
    this.input.addEventListener('input', this.handleInput.bind(this));
  }

  get input () {
    return this.wrappedInput.input
  }
  
  getValue(): T{
    return this.wrappedInput.getValue()
  }

  handleInput(): boolean {
    const value = this.getValue();
    
    if (this.validator(value)) {
      this.wrappedInput.input.classList.remove('cas-invalid-id');
      return false;
    } else {
      this.wrappedInput.input.classList.add('cas-invalid-id');  
      return true;
    }
  }
}


