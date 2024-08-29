import os
import sys
import functools
from pathlib import Path
import importlib
from typing import TypeVar, Type, Callable, Any, Mapping, Dict, Generic, Literal, Union, List, cast, ParamSpec, Concatenate
import datetime

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

import tornado
from pydantic import BaseModel

from cassini import env
from cassini.core import TierABC, NotebookTierBase
import yaml

from .schema.models import ChildClsInfo, TreeChildResponse, TreeResponse, TierInfo


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
                query = {}
                
                raw_arguments = self.request.arguments

                for key, raw_query in raw_arguments.items():
                    query[key] = ''.join(b.decode() for b in raw_query)
                
                try:
                    response = response_model.model_validate(func(self, query_model.model_validate(query)))
                    self.finish(response.model_dump_json())
                except ValueError:
                    self.send_error(404)

            return wrap_get
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


def serialize_child(tier: TierABC):
    project_folder = env.project.project_folder
    """
    Note, doesn't populate children field... maybe will later...
    """
    branch = {'name': tier.name}

    branch['folder'] = tier.folder.relative_to(project_folder).as_posix()

    if isinstance(tier, NotebookTierBase):
        branch['metaPath'] = tier.meta_file.relative_to(project_folder).as_posix()
        branch['additionalMeta'] = {k: tier.meta[k] for k in tier.meta.keys() if k not in ['description', 'started', 'conclusion']}
        branch['started'] = tier.started.isoformat()

        if tier.description:
            branch['info'] = tier.description.split('\n')[0]

        if tier.conclusion:
            branch['outcome'] = tier.conclusion.split('\n')[0]
        
        branch['hltsPath'] = tier.highlights_file.relative_to(project_folder).as_posix()
        branch['notebookPath'] = tier.file.relative_to(project_folder).as_posix()
    
    return branch


def serialize_branch(tier: TierABC):
    tree = serialize_child(tier)

    tree['children'] = {}

    child_cls = tier.child_cls

    if not child_cls:
        tree['childClsInfo'] = None

        return tree

    child_cls_info = {}
    
    child_cls_info['idRegex'] = child_cls.id_regex
    child_cls_info['name'] = child_cls.__name__
    child_cls_info['namePartTemplate'] = child_cls.name_part_template

    child_metas = set()
    
    for child in tier:
        tree['children'][child.id] = serialize_child(child)

        if isinstance(child, NotebookTierBase):
            child_metas.update(child.meta.keys())

    if issubclass(child_cls, NotebookTierBase):
        child_metas.discard('name')
        child_metas.discard('started')
        child_metas.discard('description')
        child_metas.discard('conclusion')

        child_cls_info['metaNames'] = list(child_metas)

        child_cls_info['templates'] = [template.name for template in child_cls.get_templates(env.project)]

    tree['childClsInfo'] = child_cls_info
    return tree


class QueryParams(BaseModel):
    name: str


class LookupHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    @with_types(QueryParams, TierInfo, 'GET')
    def get(self, query: QueryParams) -> TierInfo:
        assert env.project

        name = query.name
        tier = env.project[name]

        if not tier.exists():
            raise ValueError("Not found")
        
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
    def get(self):
        cas_id = self.get_argument('name', '')
        try:
            tier = env.project[cas_id]
            tier.open_folder()
            self.finish(1)
        except (ValueError, AttributeError):
            self.finish(0)


class NewChildHandler(APIHandler):

    @tornado.web.authenticated
    @needs_project
    def post(self):
        data = self.get_json_body()

        parent_name = data.pop('parent')
        template_name = data.pop('template')
        identifier = data.pop('id')

        meta = data

        try:
            parent = env.project[parent_name]
        except (ValueError, AttributeError):
            return self.finish(0)

        child = parent[identifier]

        template = {path.name: path for path in parent.child_cls.get_templates(env.project)}.get(template_name)

        child.setup_files(template, meta=meta)

        self.finish(serialize_branch(child))
    

class TreeHandler(APIHandler):

    @tornado.web.authenticated
    @needs_project
    def get(self):
        cas_ids = self.get_argument('ids', None)
        cas_ids = [] if not cas_ids else cas_ids.split(',')

        try:
            tier = env.project.home

            while cas_ids:
                id_ = cas_ids.pop(0)
                tier = tier[id_]
        except (ValueError, AttributeError):
            return self.send_error(404)

        if not tier.exists():
            return self.send_error(404)

        self.finish(serialize_branch(tier))


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

