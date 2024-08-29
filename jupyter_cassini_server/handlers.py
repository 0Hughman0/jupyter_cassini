import functools
from typing import TypeVar, Type, Callable, Any, Dict, Literal, Union, List, cast, Set
import datetime
import urllib.parse

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

import tornado
from pydantic import BaseModel

from cassini import env
from cassini.core import TierABC, NotebookTierBase

from .schema.models import (
    NewChildInfo,
    ChildClsInfo, 
    TreeChildResponse, 
    TreeResponse, 
    TierInfo, 
    LookupGetParametersQuery, 
    OpenGetParametersQuery,
    TreeGetParametersQuery,
    Status, 
    Status1
)

Q = TypeVar('Q', bound=BaseModel)
R = TypeVar('R', bound=BaseModel)
S = TypeVar('S', bound=APIHandler)

DecoratoredType = Callable[[APIHandler, Q], R]
MethodType = Callable[[APIHandler], None]


def with_types(query_model: Type[Q], 
               response_model: Type[R], 
               method: Union[Literal["GET"], Literal["POST"]]) -> \
                Callable[[Callable[[S, Q], R]], Callable[[S], None]]:
    
    def wrapper(func: Callable[[S, Q], R]) -> Callable[[S], None]:

        if method == 'GET':
            def wrap_get(self: S) -> None:
                query: Dict[str, Union[str, List[str]]] = {}
                
                raw_arguments = urllib.parse.parse_qs(self.request.query)

                for key, raw_val in raw_arguments.items():
                    val = ''.join(raw_val)
                    
                    if '[]' in key:  # we aren't compatible with object encoding and rely on form no explode.
                        query[key] = val.split(',')
                    else:
                        query[key] = val
                try:
                    response = response_model.model_validate(func(self, query_model.model_validate(query)))
                    self.finish(response.model_dump_json())
                except ValueError:
                    self.send_error(404)

            return wrap_get
        elif method == 'POST':
            def wrap_post(self: S) -> None:
                try:
                    query = self.get_json_body()
                    response = response_model.model_validate(func(self, query_model.model_validate(query)))
                    self.finish(response.model_dump_json())
                except ValueError:
                    self.send_error(404)

            return wrap_post
        else:
            raise NotImplementedError

    return wrapper


F = TypeVar('F', bound=Callable[..., Any])


def needs_project(meth: F) -> F:
    
    @functools.wraps(meth)
    def wraps(self, *args, **kwargs):
        if not env.project:
            self.finish("Current project not set, jupyterlab needs to be launched by Cassini")
            return

        return meth(self, *args, **kwargs)

    return cast(F, wraps)


def serialize_child(tier: TierABC) -> TreeChildResponse:
    """
    Note, doesn't populate children field... maybe will later...
    """
    assert env.project
    project_folder = env.project.project_folder
    
    if isinstance(tier, NotebookTierBase):
        notebookPath = tier.file.relative_to(project_folder).as_posix()

        metaPath = tier.meta_file.relative_to(project_folder).as_posix()
        additionalMeta = {key: tier.meta.get(key) for key in tier.meta.keys() if key not in ['description', 'conclusion', 'started']}
        
        started = tier.started.astimezone().isoformat()

        if tier.description:
            info = tier.description.split('\n')[0]
        else:
            info = None

        if tier.conclusion:
            outcome = tier.conclusion.split('\n')[0]
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
        additionalMeta=additionalMeta
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
            children={}
        )

    child_metas: Set[str] = set()
    children = {}
    
    for child in tier:
        children[child.id] = serialize_child(child)

        if isinstance(child, NotebookTierBase):
            child_metas.update(child.meta.keys())

    if issubclass(child_cls, NotebookTierBase):
        child_metas.discard('name')
        child_metas.discard('started')
        child_metas.discard('description')
        child_metas.discard('conclusion')

        child_metaNames = list(child_metas)

        child_templates = [template.name for template in child_cls.get_templates(env.project)]
    else:
        child_templates = []
        child_metaNames = []

    child_cls_info = ChildClsInfo(
        name=child_cls.pretty_type,
        idRegex=child_cls.id_regex,
        namePartTemplate=child_cls.name_part_template,
        templates=child_templates,
        metaNames=child_metaNames
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
            childClsInfo=child_cls_info,
            children=children,
        )


class LookupHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    @with_types(LookupGetParametersQuery, TierInfo, 'GET')
    def get(self, query: LookupGetParametersQuery) -> TierInfo:
        assert env.project

        name = query.name
        tier = env.project[name]

        if not tier.exists():
            raise ValueError(name, "not found")
        
        if isinstance(tier, NotebookTierBase):
            started = tier.started.replace(tzinfo=datetime.timezone.utc)
        else:
            started = None
        
        return TierInfo(
            name=tier.name,
            identifiers=list(tier.identifiers),
            started=started,
            children=[child.name for child in tier]
        )


class OpenHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    @with_types(OpenGetParametersQuery, Status, 'GET')
    def get(self, query: OpenGetParametersQuery) -> Status:
        assert env.project

        name = query.name
        try:
            tier = env.project[name]
            tier.open_folder()
            return Status(status=Status1.success)
        
        except (ValueError, AttributeError):
            return Status(status=Status1.failure)


class NewChildHandler(APIHandler):

    @tornado.web.authenticated
    @needs_project
    @with_types(NewChildInfo, TreeResponse, 'POST')
    def post(self, query: NewChildInfo) -> TreeResponse:
        assert env.project

        parent_name = query.parent
        identifier = query.id
        template_name = query.template

        meta = query.model_extra

        parent = env.project[parent_name]

        if not parent.child_cls:
            raise ValueError("parent has no child class", query.parent)
        
        child = parent[identifier]

        if isinstance(child, NotebookTierBase) and template_name:
            template_options = {path.name: path for path in child.get_templates(env.project)}
            template = template_options.get(template_name)
        else:
            template = None

        child.setup_files(template, meta=meta)

        return serialize_branch(child)
    

class TreeHandler(APIHandler):

    @tornado.web.authenticated
    @needs_project
    @with_types(TreeGetParametersQuery, TreeResponse, 'GET')
    def get(self, query: TreeGetParametersQuery) -> TreeResponse:
        assert env.project
        
        cas_ids = query.ids__
        
        try:
            tier = env.project.home

            while cas_ids:
                id_ = cas_ids.pop(0)
                tier = tier[id_]

        except ValueError:
            raise ValueError("Invalid tier name", cas_ids)

        if not tier.exists():
            raise ValueError("Tier does not exist", cas_ids)

        return serialize_branch(tier)


def setup_handlers(web_app):
    host_pattern = ".*$"
    
    base_url = web_app.settings["base_url"]
    lookup_pattern = url_path_join(base_url, "jupyter_cassini", "lookup")
    tree_pattern = url_path_join(base_url, "jupyter_cassini", "tree")
    open_pattern = url_path_join(base_url, "jupyter_cassini", "open")
    new_child_pattern = url_path_join(base_url, "jupyter_cassini", "newChild")
    
    handlers = [(lookup_pattern, LookupHandler), 
                (tree_pattern, TreeHandler),
                (open_pattern, OpenHandler),
                (new_child_pattern, NewChildHandler)
                ]
    web_app.add_handlers(host_pattern, handlers)

