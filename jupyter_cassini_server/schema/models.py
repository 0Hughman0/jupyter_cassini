# generated by datamodel-codegen:
#   filename:  openapi.yaml
#   timestamp: 2024-10-10T18:48:54+00:00

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, RootModel
from typing_extensions import Literal


class Status1(Enum):
    success = 'success'
    failure = 'failure'


class Status(BaseModel):
    status: Status1


class CommonTierInfo(BaseModel):
    name: str
    ids: List[str]
    children: Optional[List[str]] = None


class FolderTierInfo(CommonTierInfo):
    tierType: Literal['folder']


class XCasField(Enum):
    private = 'private'
    core = 'core'


class Properties(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    default: Optional[Any] = None
    format: Optional[str] = None
    x_cas_field: Optional[XCasField] = Field(None, alias='x-cas-field')


class MetaSchema(BaseModel):
    model_config = ConfigDict(
        extra='allow',
    )
    properties: Dict[str, Properties]


class CommonChildClsInfo(BaseModel):
    name: Optional[str] = None
    idRegex: Optional[str] = None
    namePartTemplate: Optional[str] = None


class ChildClsFolderInfo(CommonChildClsInfo):
    tierType: Literal['folder']


class ChildClsNotebookInfo(CommonChildClsInfo):
    templates: List[str]
    metaSchema: MetaSchema
    tierType: Literal['notebook']


class TreePathQuery(BaseModel):
    path: List[str]


class TreeChildResponse(BaseModel):
    name: str
    info: Optional[str] = None
    outcome: Optional[str] = None
    started: Optional[AwareDatetime] = None
    hltsPath: Optional[str] = None
    metaPath: Optional[str] = None
    notebookPath: Optional[str] = None
    additionalMeta: Optional[Dict[str, Any]] = None


class NewChildInfo(BaseModel):
    model_config = ConfigDict(
        extra='allow',
    )
    id: str
    parent: str
    template: Optional[str] = None


class LookupGetParametersQuery(BaseModel):
    name: str


class OpenGetParametersQuery(BaseModel):
    name: str


class NotebookTierInfo(CommonTierInfo):
    started: AwareDatetime
    notebookPath: str
    metaPath: str
    hltsPath: Optional[str] = None
    metaSchema: MetaSchema
    tierType: Literal['notebook']


class ChildClsInfo(RootModel[Union[ChildClsFolderInfo, ChildClsNotebookInfo]]):
    root: Union[ChildClsFolderInfo, ChildClsNotebookInfo] = Field(
        ..., discriminator='tierType'
    )


class TreeResponse(TreeChildResponse):
    folder: str
    childClsInfo: Optional[ChildClsInfo] = None
    children: Dict[str, TreeChildResponse]
    name: str


class TierInfo(RootModel[Union[FolderTierInfo, NotebookTierInfo]]):
    root: Union[FolderTierInfo, NotebookTierInfo] = Field(..., discriminator='tierType')
