from typing import TypeVar, Callable, Union
import datetime

from jupyter_server.utils import url_path_join
from jupyter_server.base.handlers import APIHandler

import tornado

from cassini import env
from cassini.core import NotebookTierBase

from jupyter_cassini_server.safety import needs_project, with_types
from jupyter_cassini_server.serialisation import serialize_branch, serialize_child, encode_path
from jupyter_cassini_server.schema.models import (
    NewChildInfo,
    TreePathQuery,
    TreeResponse,
    TierInfo,
    MetaSchema,
    LookupGetParametersQuery,
    OpenGetParametersQuery,
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
        project = env.project

        name = query.name
        tier = project[name]

        if not tier.exists():
            raise ValueError(name, "not found")

        if isinstance(tier, NotebookTierBase):
            started = tier.started.replace(tzinfo=datetime.timezone.utc)
            raw_hlts_path = tier.highlights_file if tier.highlights_file else None

            if raw_hlts_path and raw_hlts_path.exists():
                hlts_path = encode_path(raw_hlts_path, project)
            else:
                hlts_path = None

            return TierInfo(NotebookTierInfo(
                tierType='notebook',
                name=tier.name,
                ids=list(tier.identifiers),
                notebookPath=encode_path(tier.file, project),
                metaPath=encode_path(tier.meta_file, project),
                hltsPath=hlts_path,
                started=started,
                children={child.id: serialize_child(child) for child in tier},
                metaSchema=MetaSchema.model_validate(tier.__meta_manager__.build_model().model_json_schema())
            ))
        else:
            return TierInfo(FolderTierInfo(
                tierType='folder',
                name=tier.name,
                ids=list(tier.identifiers),
                children={child.id: serialize_child(child) for child in tier}
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
    @with_types(TreePathQuery, TreeResponse, "GET")
    def get(self, query: TreePathQuery) -> TreeResponse:
        assert env.project

        ids = query.path

        try:
            tier = env.project.home

            while ids:
                id_ = ids.pop(0)
                tier = tier[id_]

        except ValueError:
            raise ValueError("Invalid tier name", ids)

        if not tier.exists():
            raise ValueError("Tier does not exist", ids)

        return serialize_branch(tier)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    lookup_pattern = url_path_join(base_url, "jupyter_cassini", "lookup")
    tree_pattern = url_path_join(base_url, "jupyter_cassini", r"tree(?P<path>(?:(?:/[^/]+)+|/?))")
    open_pattern = url_path_join(base_url, "jupyter_cassini", "open")
    new_child_pattern = url_path_join(base_url, "jupyter_cassini", "newChild")

    handlers = [
        (lookup_pattern, LookupHandler),
        (tree_pattern, TreeHandler),
        (open_pattern, OpenHandler),
        (new_child_pattern, NewChildHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
