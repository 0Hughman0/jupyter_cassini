import { Widget } from '@lumino/widgets';
import { Dialog } from '@jupyterlab/apputils';

import { InputTextDialog, InputDialogBase, IDialogueInput } from "./dialogwidgets";
import { IIdDialogOptions } from "./newchilddialog";

type AllowedTypes = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
type AllowedFormats = 'date' | 'date-time' | 'password' | 'float' | 'double' | 'int32' | 'int64'
type InputType = 'text' | 'number' | 'checkbox' | 'date' | 'datetime-local' | 'password'

export const INPUT_MAP: {[info in (AllowedTypes | AllowedFormats)]?: InputType} = {
  'string': 'text',
  'number': 'number',
  'integer': 'number',
  'boolean': 'checkbox',
  'array': 'text',
  'object': 'text',
  'date': 'date',
  'date-time': 'datetime-local',
  'password': 'password',
}


export interface IValidatingInput<T> extends IDialogueInput<T> {}


export class ValidatingInput<T> extends Widget implements Required<Dialog.IBodyWidget<T>> {
  validator: (value: T) => boolean
  wrappedInput: InputDialogBase<T>

  constructor(inputWidget: InputDialogBase<T>, validator: (value: T) => boolean) {
    super();
    this.wrappedInput = inputWidget
    this.validator = validator
    
    this.wrappedInput.input.addEventListener('input', this.handleInput.bind(this));
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
