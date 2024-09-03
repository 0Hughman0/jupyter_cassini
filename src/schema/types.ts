import { components } from "./schema"

export type ChildClsInfo = components['schemas']['ChildClsInfo'];
export type ChildClsNotebookInfo = components['schemas']['ChildClsNotebookInfo'];

export type TreeChildResponse = components['schemas']['TreeChildResponse'];
export type TreeResponse = components['schemas']['TreeResponse'];

export type FolderTierInfo = components["schemas"]["FolderTierInfo"]
export type NotebookTierInfo = components["schemas"]["NotebookTierInfo"]
export type TierInfo = components['schemas']['TierInfo'];

export type NewChildInfo = components['schemas']['NewChildInfo'];

export type Status = components["schemas"]["Status"]

export type MetaSchema = components["schemas"]["metaSchema"]

export interface IChange<Old, New> {
    old: Old
    new: New
}
