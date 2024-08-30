from typing import TypeVar, Callable, Any, Union
import datetime

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

import tornado

from cassini import env
from cassini.core import NotebookTierBase

from jupyter_cassini_server.safety import needs_project, with_types
from jupyter_cassini_server.serialisation import serialize_branch

from .schema.models import (
    NewChildInfo,
    TreeResponse,
    TierInfo,
    LookupGetParametersQuery,
    OpenGetParametersQuery,
    TreeGetParametersQuery,
    FolderTierInfo,
    NotebookTierInfo,
    Status,
    Status1,
)


class LookupHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    @with_types(LookupGetParametersQuery, TierInfo, "GET")
    def get(self, query: LookupGetParametersQuery) -> TierInfo:
        assert env.project

        name = query.name
        tier = env.project[name]

        if not tier.exists():
            raise ValueError(name, "not found")

        if isinstance(tier, NotebookTierBase):
            started = tier.started.replace(tzinfo=datetime.timezone.utc)

            return TierInfo(NotebookTierInfo(
                tierType='NotebookTierInfo',
                name=tier.name,
                identifiers=list(tier.identifiers),
                started=started,
                children=[child.name for child in tier]
            ))
        else:
            return TierInfo(FolderTierInfo(
                tierType='FolderTierInfo',
                name=tier.name,
                identifiers=list(tier.identifiers),
                children=[child.name for child in tier]
            ))


class OpenHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    @with_types(OpenGetParametersQuery, Status, "GET")
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
    @with_types(NewChildInfo, TreeResponse, "POST")
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
            template_options = {
                path.name: path for path in child.get_templates(env.project)
            }
            template = template_options.get(template_name)
        else:
            template = None

        child.setup_files(template, meta=meta)

        return serialize_branch(child)


class TreeHandler(APIHandler):

    @tornado.web.authenticated
    @needs_project
    @with_types(TreeGetParametersQuery, TreeResponse, "GET")
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

    handlers = [
        (lookup_pattern, LookupHandler),
        (tree_pattern, TreeHandler),
        (open_pattern, OpenHandler),
        (new_child_pattern, NewChildHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
