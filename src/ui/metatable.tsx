/* eslint-disable prettier/prettier */
import React, { useMemo } from 'react';

import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    createColumnHelper,
} from '@tanstack/react-table';

import { JSONValue } from '@lumino/coreutils'
import { ISignal } from '@lumino/signaling'

import { CodeEditorWrapper, CodeEditor } from '@jupyterlab/codeeditor';
import { ReactWidget, InputDialog } from '@jupyterlab/apputils';
import { checkIcon, ToolbarButtonComponent, addIcon, closeIcon } from '@jupyterlab/ui-components'


import { cassini } from '../core';
import { TierModel } from '../models';

export type MetaTableCallback = {name: string, editor: CodeEditorWrapper}

export type MetaTableRow = {
  name: string,
  editor: () => CodeEditorWrapper
}

export interface IMetaTableProps {
    metas: MetaTableRow[]
    onMetaUpdate: (attribute: string, newValue: string) => void
    onNewMetaKey: ((attribute: string) => void) | null
    onRemoveMeta: ((attribute: string) => void) | null
}


export function MetaTable(props: IMetaTableProps) {
    const onMetaUpdate = props.onMetaUpdate;
    const onRemoveMeta = props.onRemoveMeta;
    const onNewMetaKey = props.onNewMetaKey

    const data = useMemo(
      () => (props.metas),
      [props.metas]
    );

    const askNewAttribute = () => InputDialog.getText({
      title: "New meta attribute", 
      label: "name"
    }).then((outcome) => {
      if (outcome.value) {
        onNewMetaKey && onNewMetaKey(outcome.value)
    }})
  
    const columnHelper = createColumnHelper<MetaTableRow>();
  
    const createColumns = () => {
      let columns = [
        columnHelper.accessor('name', {
          cell: props => props.getValue(),
          header: "Name"
        }),
        columnHelper.accessor('editor', {
          cell: props => {
            const widget = props.getValue()()
            // I have no idea what this means or how it works: https://stackoverflow.com/questions/69185915/how-to-cast-an-htmlelement-to-a-react-element
            return (<span ref={ ref => {
              if (ref && !widget.isAttached) {
                ref.appendChild(widget.node)
              }
              if (ref === null && widget.isAttached) {
                widget.dispose()
              }}}/>
            )
          },
          header: "Value"
        }),
        columnHelper.display({
          id: 'edit',
          cell: props => {
            const row = data[props.row.index]
            return (<span className='cas-row-icon-area'>
                      {onRemoveMeta && <ToolbarButtonComponent 
                        icon={closeIcon}
                        onClick={() => onRemoveMeta(row.name)}
                        tooltip={`Delete (${row.name})`}
                      />}
                      <ToolbarButtonComponent 
                        icon={checkIcon} 
                        onClick={() => onMetaUpdate(row.name, row.editor().model.sharedModel.getSource())}
                        tooltip='Apply changes'
                      />
                    </span>)
          }
        })
      ]
      return columns;
    };
  
    const columns = createColumns();

    const table = useReactTable({
      columns: columns, 
      data: data,
      getCoreRowModel: getCoreRowModel()
    })

    return (
      <div>
        <table className='cas-ChildrenTable-table'>
        <thead>
          <tr>
            {table.getFlatHeaders().map(header => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <span><tr><td colSpan={3}>
            {onNewMetaKey && <ToolbarButtonComponent 
              icon={addIcon} 
              onClick={askNewAttribute}
              tooltip={`Add a new meta attribute`}
            />}
          </td></tr></span>
        </tfoot>
        </table>
      </div>
    );
  }


  export class MetaTableWidget extends ReactWidget {
    attributes: { [name: string]: JSONValue | undefined}
    onMetaUpdate: ((attribute: string, newValue: string) => void)
    onRemoveMeta: ((attribute: string) => void) | null

    constructor(attributes: { [name: string]: JSONValue | undefined}, 
      onMetaUpdate: ((attribute: string, newValue: string) => void),
      onRemoveMeta: ((attribute: string) => void) | null, 
      metaChanged: ISignal<TierModel, void>) {
      super()
      this.attributes = attributes
      this.onMetaUpdate = onMetaUpdate
      this.onRemoveMeta = onRemoveMeta

      metaChanged.connect((model) => this.onMetaChanged(model.additionalMeta))
    }

    onMetaChanged(newMeta: { [name: string]: JSONValue}) {
      const meta: {[name: string]: JSONValue} = {}

      for (const key of Object.keys(this.attributes)) {
        const val = newMeta[key]
        meta[key] = val
      }
      
      this.attributes = meta
      this.update()
    }

    onNewMetaKey(key: string) {
      this.attributes[key] = undefined
      this.update()
    }
    
    render() {
      const metas = []

      for (const name of Object.keys(this.attributes)) {
        const editor = new CodeEditorWrapper({
          model: new CodeEditor.Model({ mimeType: 'application/json'}),
          factory: cassini.contentFactory.newInlineEditor,
          editorOptions: { config: { lineNumbers: false } },
        });

        const val = this.attributes[name]

        editor.model.sharedModel.setSource(val ? JSON.stringify(val): '')

        metas.push({name: name, editor: () => editor})
      }

      const onNewMetaKey = this.onNewMetaKey.bind(this)

      return (
      <div>
        <MetaTable metas={metas} onMetaUpdate={this.onMetaUpdate} onNewMetaKey={onNewMetaKey} onRemoveMeta={this.onRemoveMeta}/>
      </div>
      )
    }
  }