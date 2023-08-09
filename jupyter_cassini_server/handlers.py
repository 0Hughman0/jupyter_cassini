import json
import os.path
import functools

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

import tornado

from cassini import env
from cassini import TierBase
from cassini.defaults import DataSet


def needs_project(meth):
    @functools.wraps(meth)
    def wraps(self, *args, **kwargs):
        if not env.project:
            self.finish("Current project not set, jupyterlab needs to be launched by Cassini")
            return

        return meth(self, *args, **kwargs)

    return wraps


def serialize_child(tier: TierBase):
    project_folder = env.project.project_folder
    """
    Note, doesn't populate children field... maybe will later...
    """
    branch = {'name': tier.name}

    branch['folder'] = tier.folder.relative_to(project_folder).as_posix()

    if hasattr(tier, 'meta'):
        branch['metaPath'] = tier.meta_file.relative_to(project_folder).as_posix()
        branch['additionalMeta'] = {k: tier.meta[k] for k in tier.meta.keys() if k not in ['description', 'started', 'conclusion'] }

    if hasattr(tier, 'info'):
        branch['info'] = tier.info

    if hasattr(tier, 'started'):
        branch['started'] = tier.started.isoformat()
        
    if hasattr(tier, 'highlights_file') and tier.highlights_file: # don't check if exists, because what if one arrives later!
        branch['hltsPath'] = tier.highlights_file.relative_to(project_folder).as_posix()
    
    if hasattr(tier, 'file') and tier.file and tier.file.exists():
        branch['notebookPath'] = tier.file.relative_to(project_folder).as_posix()
    
    return branch


def serialize_branch(tier: TierBase):
    tree = serialize_child(tier)
    tree['children'] = {}

    child_metas = set()

    for child in tier:
        
        if not isinstance(child, TierBase):
            continue

        tree['children'][child.id] = serialize_child(child)

        if hasattr(child, 'meta'):
            child_metas.update(child.meta.keys())

    child_metas.discard('name')
    child_metas.discard('started')
    child_metas.discard('description')
    child_metas.discard('conclusion')

    tree['childMetas'] = list(child_metas)

    if tier.child_cls:
        tree['childTemplates'] = [template.name for template in tier.child_cls.get_templates()]

        tree['childIdRegex'] = tier.child_cls.id_regex
    else:
        tree['childTemplates'] = []
        tree['childIdRegex'] = None

    return tree


class LookupHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    def get(self):
        cas_id = self.get_argument('id', '')
        try:
            tier = env.project[cas_id]

            if not tier.exists():
                return self.send_error(404)
            
            data = serialize_branch(tier)
            data['identifiers'] = tier.identifiers

            self.finish(data)
        except (ValueError, AttributeError):
            self.finish("Not found")


class OpenHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    @needs_project
    def get(self):
        cas_id = self.get_argument('id', '')
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

        try:
            parent = env.project[parent_name]
        except (ValueError, AttributeError):
            return self.finish(0)

        child = parent[identifier]

        description = data.pop('description')

        template = {path.name: path for path in parent.child_cls.get_templates()}.get(template_name)

        child.setup_files(template)

        if child.meta_file:

            child.description = description

            for k, v in data.items():
                child.meta[k] = v

        self.finish(serialize_branch(child))
    

class TreeHandler(APIHandler):

    @tornado.web.authenticated
    @needs_project
    def get(self):
        cas_ids = self.get_argument('identifiers', None)
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

