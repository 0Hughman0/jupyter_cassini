/* eslint-disable prettier/prettier */
import React, { useMemo } from 'react';

import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    createColumnHelper,
} from '@tanstack/react-table';

import { ReactWidget } from '@jupyterlab/apputils';
import { launchIcon, treeViewIcon, ToolbarButtonComponent } from '@jupyterlab/ui-components'


export type ChildrenSummaryRow = {
  name: string,
  id: string
}

/**
 * @property onChildLaunch - callback for when the launch button is pressed for a child
 * @property onChildView - callback for when the child view button is pressed.
 */
export interface IMetaTableProps {
    children: ChildrenSummaryRow[]
    onChildLaunch: (id: string) => void
    onChildView: (id: string) => void
}

/**
 * Component that creates a table that summarises children, like a less detailed version of the ChildrenTable.
 * 
 * @param props { IMetaTableProps }
 * @returns 
 */
export function ChildrenSummary(props: IMetaTableProps) {
    const onChildLaunch = props.onChildLaunch;
    const onChildView = props.onChildView

    const data = useMemo(
      () => (props.children),
      [props.children]
    );
  
    const columnHelper = createColumnHelper<ChildrenSummaryRow>();
  
    const createColumns = () => {
      let columns = [
        columnHelper.accessor('name', {
          cell: props => <span className='cas-tier-name'>{props.getValue()}</span>,
          header: "Name"
        }),
        columnHelper.display({
          id: 'actions',
          cell: props => {
            const row = data[props.row.index]
            return (
              <div className='cas-row-icon-area'>
                <ToolbarButtonComponent icon={launchIcon} onClick={() => onChildLaunch(row.id)} tooltip={`Open ${row.name}`}/>
                <ToolbarButtonComponent icon={treeViewIcon} onClick={() => onChildView(row.id)} tooltip={`Show ${row.name} in browser`}/>
              </div>
            )
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
        </table>
      </div>
    );
  }


/**
 * ReactWidget wrapper of ChildrenSummary component.
 */
export class ChildrenSummaryWidget extends ReactWidget {
  _data: ChildrenSummaryRow[]
  onChildLaunch: (id: string) => void
  onChildView: (id: string) => void

  constructor(data: ChildrenSummaryRow[], onChildLaunch: (id: string) => void, onChildView: (id: string) => void) {
    super()
    this._data = data
    this.onChildLaunch = onChildLaunch
    this.onChildView = onChildView
  }

  get data(): ChildrenSummaryRow[] {
    return this._data
  }
  set data(val: ChildrenSummaryRow[]) {
    this._data = val
    this.update()
  }
  
  render() {
    return (
    <div>
      <ChildrenSummary children={this.data} onChildLaunch={this.onChildLaunch} onChildView={this.onChildView}/>
    </div>
    )
  }
}