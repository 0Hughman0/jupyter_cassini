/* 

Adapted from https://github.com/jupyterlab/jupyterlab/blob/master/packages/apputils/src/inputdialog.ts

Because these classes are not exported, we have to copy them!

*/
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

import { Styling, InputDialog } from '@jupyterlab/apputils';
import { JSONObject } from '@lumino/coreutils';
import { CodeEditorWrapper, CodeEditor } from '@jupyterlab/codeeditor';

import { cassini } from '../core';

const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';
const INPUT_BOOLEAN_DIALOG_CLASS = 'jp-Input-Boolean-Dialog';

export interface IDialogueInput<T> extends Widget {
  input: HTMLInputElement | HTMLTextAreaElement | HTMLDivElement;
  getValue(): T | undefined;
}

export abstract class InputDialogBase<T>
  extends Widget
  implements IDialogueInput<T>
{
  /**
   * InputDialog constructor
   *
   * @param label Input field label
   */

  protected _dirty: boolean;

  get elem(): string {
    return 'input';
  }

  get inputType(): string | null {
    return 'text';
  }

  get dirty(): boolean {
    return this._dirty;
  }

  constructor(options: { label?: string }) {
    super();
    this._dirty = false;
    this.addClass(INPUT_DIALOG_CLASS);
    this.addClass('cas-dialogue-input');

    const { label } = options;

    this.input = document.createElement(this.elem) as HTMLInputElement;

    if (this.input instanceof HTMLInputElement && this.inputType) {
      this.input.type = this.inputType;
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

    this.input.addEventListener('input', this);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'input': {
        this._dirty = true;
      }
    }
  }

  protected undefinedIfClean(value: T): T | undefined {
    if (this.dirty) {
      return value;
    } else {
      return undefined;
    }
  }

  abstract getValue(): T | undefined;

  /** For internal testing */
  abstract _setValue(value: string | boolean): void;

  /** Input HTML node, access is not part of public API */
  input: HTMLInputElement | HTMLTextAreaElement | HTMLDivElement;
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
    return 'checkbox';
  }

  constructor(options: InputDialog.IBooleanOptions) {
    super(options);

    this.addClass(INPUT_BOOLEAN_DIALOG_CLASS);
    this.input.checked = options.value ? true : false;
  }

  /**
   * Get the text specified by the user
   */
  getValue(): boolean | undefined {
    return this.undefinedIfClean(this.input.checked);
  }

  _setValue(value: boolean): void {
    this.input.checked = value;
    this.input.dispatchEvent(new Event('input'));
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
    return 'number';
  }

  constructor(options: InputDialog.INumberOptions) {
    super(options);

    this.input.value = options.value ? options.value.toString() : '0';
  }

  /**
   * Get the number specified by the user.
   */
  getValue(): number | undefined {
    if (this.input.value) {
      return this.undefinedIfClean(Number(this.input.value));
    } else {
      return this.undefinedIfClean(Number.NaN);
    }
  }

  _setValue(value: string): void {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input'));
  }
}

/**
 * Widget body for input text dialog
 */
export class InputTextDialog extends InputDialogBase<string> {
  input: HTMLInputElement;

  get inputType() {
    return 'text';
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
  getValue(): string | undefined {
    return this.undefinedIfClean(this.input.value);
  }

  _setValue(value: string): void {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input'));
  }

  private _initialSelectionRange: number;
}

/**
 * Widget body for input password dialog
 */
export class InputPasswordDialog extends InputDialogBase<string> {
  input: HTMLInputElement;

  get inputType() {
    return 'password';
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
  getValue(): string | undefined {
    return this.undefinedIfClean(this.input.value);
  }

  _setValue(value: string): void {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input'));
  }
}

/**
 * Widget body for input list dialog
 */
export class InputItemsDialog extends InputDialogBase<string> {
  input: HTMLInputElement;
  list: HTMLSelectElement;

  get inputType() {
    return 'list';
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

    this.list.addEventListener('input', this);
  }

  /**
   * Get the user choice
   */
  getValue(): string | undefined {
    if (this._editable) {
      return this.undefinedIfClean(this.input.value);
    } else {
      return this.undefinedIfClean(this.list.value);
    }
  }

  _setValue(value: string): void {
    if (this._editable) {
      this.input.value = value;
    } else {
      this.list.value = value;
    }

    this.input.dispatchEvent(new Event('input'));
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
    return null;
  }

  constructor(options: InputDialog.ITextOptions) {
    super(options);
    if (options.text) {
      this.input.value = options.text;
    }
  }

  getValue(): string | undefined {
    return this.undefinedIfClean(this.input.value);
  }

  _setValue(value: string): void {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input'));
  }
}

export interface IDateOptions extends InputDialog.IOptions {
  value: Date | undefined;
}

export class InputDateDialog extends InputDialogBase<Date> {
  input: HTMLInputElement;

  get inputType() {
    return 'date';
  }

  constructor(options: IDateOptions) {
    super(options);
    if (options.value && !isNaN(options.value.getTime())) {
      this.input.value = options.value.toISOString().slice(0, 10);
    }
  }

  getValue(): Date | undefined {
    return this.undefinedIfClean(new Date(this.input.value));
  }

  _setValue(value: string): void {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input'));
  }
}

export class InputDatetimeDialog extends InputDialogBase<Date> {
  input: HTMLInputElement;

  get inputType() {
    return 'datetime-local';
  }

  constructor(options: IDateOptions) {
    super(options);
    if (options.value && !isNaN(options.value.getTime())) {
      this.input.value = options.value.toISOString().split('.')[0];
    }
  }

  getValue(): Date | undefined {
    return this.undefinedIfClean(new Date(this.input.value + 'Z'));
  }

  _setValue(value: string): void {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input'));
  }
}

export interface IJSONOptions extends InputDialog.IOptions {
  value?: JSONObject;
}

export class InputJSONDialog extends InputDialogBase<JSONObject | undefined> {
  editor: CodeEditorWrapper;
  input: HTMLDivElement;

  get elem(): string {
    return 'div';
  }

  constructor(options: IJSONOptions) {
    super(options);
    const editor = (this.editor = new CodeEditorWrapper({
      model: new CodeEditor.Model({ mimeType: 'application/json' }),
      factory: cassini.contentFactory.newInlineEditor,
      editorOptions: { config: { lineNumbers: false }, inline: true }
    }));

    //this.input.remove();
    this.input.appendChild(editor.node);
    // this.node.append(editor.node);

    editor.model.sharedModel.setSource(JSON.stringify(options.value) ?? '');

    this.editor.model.sharedModel.changed.connect((sender, change) => {
      this.input.dispatchEvent(new Event('input')); // act like an input element
    });
  }

  /*
  Returns undefined if cannot parse
  */
  getValue(): JSONObject | undefined {
    try {
      return this.undefinedIfClean(
        JSON.parse(this.editor.model.sharedModel.getSource())
      );
    } catch (SyntaxError) {
      return undefined;
    }
  }

  _setValue(value: string): void {
    this.editor.model.sharedModel.setSource(value);
  }
}

export interface IInputIdDialogueOptions extends InputDialog.ITextOptions {
  nameTemplate: string;
}

/**
 * Version of InputTextDialog that indicates is the contents of the input does not match `idRegex`
 */
export class InputIdDialogue extends InputTextDialog {
  nameTemplate: string;
  previewBox: HTMLSpanElement;

  constructor(options: IInputIdDialogueOptions) {
    super(options);
    this.nameTemplate = options.nameTemplate;

    this.previewBox = document.createElement('span');
    this.previewBox.className = 'cas-floating-preview';
    this.node.appendChild(this.previewBox);
    this.previewBox.textContent = `Preview: ${this.nameTemplate.replace(
      '{}',
      '?'
    )}`;
  }

  handleEvent(event: Event): void {
    super.handleEvent(event);

    switch (event.type) {
      case 'input': {
        const id = this.input.value;
        this.previewBox.textContent = `Preview: ${this.nameTemplate.replace(
          '{}',
          id
        )}`;
      }
    }
  }
}

/*

Validator Wrapper.

Be wary that DialogueWidgets can return undefined e.g. when they haven't been updated. This will always be invalid, regardless of how you
set your postprocessor
*/
export class ValidatingInput<R, T = R> {
  validator: (value: R) => boolean;
  postProcessor:
    | ((value: (T extends R ? R : T) | undefined) => R | undefined)
    | null;
  wrappedInput: InputDialogBase<T extends R ? R : T>;

  constructor(
    inputWidget: InputDialogBase<T extends R ? R : T>,
    validator: (value: R) => boolean,
    postProcessor?: (value: (T extends R ? R : T) | undefined) => R | undefined
  ) {
    this.wrappedInput = inputWidget;
    this.validator = validator;
    this.postProcessor = postProcessor ?? null;
    this.input.addEventListener('input', this);
  }

  get input() {
    return this.wrappedInput.input;
  }

  /* 
  Get processed value of the Validated Input.
  This value can be processed by this.postProcessor
  */
  getValue(): R | undefined {
    if (this.postProcessor) {
      return this.postProcessor(this.wrappedInput.getValue());
    } else {
      return this.wrappedInput.getValue() as R;
    }
  }

  /*
  Validate the getValue() of the widget.

  Note that undefined is _never_ valid.

  */
  validate(): boolean {
    const value = this.getValue();

    let valid: boolean;

    if (value === undefined) {
      valid = false;
    } else {
      valid = this.validator(value);
    }

    if (valid) {
      this.wrappedInput.input.classList.remove('cas-invalid-id');
      return valid;
    } else {
      this.wrappedInput.input.classList.add('cas-invalid-id');
      return valid;
    }
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'input': {
        this.validate();
      }
    }
  }
}
