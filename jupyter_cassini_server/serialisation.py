from pathlib import Path

from typing import Set, Union
from .schema.models import (
    ChildClsInfo, 
    TreeChildResponse, 
    TreeResponse, 
    ChildClsNotebookInfo, 
    ChildClsFolderInfo,
    MetaSchema
)


from cassini import env, Project
from cassini.core import NotebookTierBase, TierABC


def encode_path(path: Path, project: Project) -> str:
    project_folder = project.project_folder
    return path.relative_to(project_folder).as_posix()


def serialize_child(tier: TierABC) -> TreeChildResponse:
    """
    Note, doesn't populate children field... maybe will later...
    """
    assert env.project
    project_folder = env.project.project_folder

    if isinstance(tier, NotebookTierBase):
        notebookPath = tier.file.relative_to(project_folder).as_posix()

        metaPath = tier.meta_file.relative_to(project_folder).as_posix()
        additionalMeta = {
            key: tier.meta.get(key)
            for key in tier.meta.keys()
            if key not in ["description", "conclusion", "started"]
        }

        started = tier.started.isoformat()

        if tier.description:
            info = tier.description.split("\n")[0]
        else:
            info = None

        if tier.conclusion:
            outcome = tier.conclusion.split("\n")[0]
        else:
            outcome = None

        if tier.highlights_file:
            hltsPath = tier.highlights_file.relative_to(project_folder).as_posix()
        else:
            hltsPath = None
    else:
        notebookPath = None
        info = None
        outcome = None
        started = None
        metaPath = None
        hltsPath = None
        additionalMeta = {}

    return TreeChildResponse(
        name=tier.name,
        info=info,
        outcome=outcome,
        started=started,
        metaPath=metaPath,
        hltsPath=hltsPath,
        notebookPath=notebookPath,
        additionalMeta=additionalMeta,
    )


def serialize_branch(tier: TierABC) -> TreeResponse:
    assert env.project

    core = serialize_child(tier)
    folder = tier.folder.relative_to(env.project.project_folder).as_posix()

    child_cls = tier.child_cls

    if not child_cls:
        return TreeResponse(
            name=core.name,
            outcome=core.outcome,
            started=core.started,
            hltsPath=core.hltsPath,
            metaPath=core.metaPath,
            notebookPath=core.notebookPath,
            additionalMeta=core.additionalMeta,
            folder=folder,
            childClsInfo=None,
            children={},
        )

    child_metas: Set[str] = set()
    children = {}

    for child in tier:
        children[child.id] = serialize_child(child)

        if isinstance(child, NotebookTierBase):
            child_metas.update(child.meta.keys())

    child_cls_info: Union[ChildClsNotebookInfo, ChildClsFolderInfo]

    if issubclass(child_cls, NotebookTierBase):
        child_metas.discard("name")
        child_metas.discard("started")
        child_metas.discard("description")
        child_metas.discard("conclusion")

        schema = child_cls.__meta_manager__.build_model().model_json_schema()

        for name in schema['properties']:
            child_metas.discard(name)

        child_templates = [
            template.name for template in child_cls.get_templates(env.project)
        ]

        child_cls_info = ChildClsNotebookInfo(
            tierType="notebook",
            name=child_cls.pretty_type,
            idRegex=child_cls.id_regex,
            namePartTemplate=child_cls.name_part_template,
            templates=child_templates,
            metaSchema=MetaSchema.model_validate(schema),
            additionalMetaKeys=list(child_metas)
        )
    else:
        child_templates = []

        child_cls_info = ChildClsFolderInfo(
            tierType='folder',
            name=child_cls.pretty_type,
            idRegex=child_cls.id_regex,
            namePartTemplate=child_cls.name_part_template
        )

    return TreeResponse(
        name=core.name,
        outcome=core.outcome,
        started=core.started,
        hltsPath=core.hltsPath,
        metaPath=core.metaPath,
        notebookPath=core.notebookPath,
        additionalMeta=core.additionalMeta,
        folder=folder,
        childClsInfo=ChildClsInfo(child_cls_info),
        children=children,
    )
