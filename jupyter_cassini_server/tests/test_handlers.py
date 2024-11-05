import shutil
import os
from unittest.mock import Mock
import sys

import pytest
from tornado.httpclient import HTTPClientError
from cassini import env
from cassini.utils import find_project

from ..schema.models import NotebookTierInfo, FolderTierInfo, TreeResponse, Status, Status1, NewChildInfo


CWD = os.getcwd()


@pytest.fixture
def project_via_env(tmp_path):
    env._reset()
    
    assert env.project is None

    project_file = shutil.copy(
        "jupyter_cassini_server/tests/project/cas_project.py",
        tmp_path / "cas_project.py",
    )

    os.environ["CASSINI_PROJECT"] = project_file.as_posix()
    project = find_project()
    project.setup_files()

    yield project

    del sys.modules['cas_project']


async def test_lookup_home(project_via_env, jp_fetch) -> None:
    reponse = await jp_fetch("jupyter_cassini", "lookup", params={"name": "Home"})

    assert reponse.code == 200

    home_info = FolderTierInfo.model_validate_json(reponse.body.decode())
    assert home_info.name == 'Home'


async def test_lookup_WP1(project_via_env, jp_fetch) -> None:
    project = project_via_env
    project['WP1'].setup_files()

    reponse = await jp_fetch("jupyter_cassini", "lookup", params={"name": "WP1"})

    assert reponse.code == 200

    info = NotebookTierInfo.model_validate_json(reponse.body.decode())
    assert info.name == 'WP1'


async def test_tree_home(project_via_env, jp_fetch) -> None:    
    reponse = await jp_fetch("jupyter_cassini", "tree")

    assert reponse.code == 200

    tree = TreeResponse.model_validate_json(reponse.body.decode())
    assert tree.name == 'Home'


async def test_tree_home_with_query_bit(project_via_env, jp_fetch) -> None:    
    reponse = await jp_fetch("jupyter_cassini", "tree/?1231623")

    assert reponse.code == 200

    tree = TreeResponse.model_validate_json(reponse.body.decode())
    assert tree.name == 'Home'
    

async def test_tree_WP1(project_via_env, jp_fetch) -> None:    
    project = project_via_env
    project['WP1'].setup_files()

    reponse = await jp_fetch("jupyter_cassini", "tree/1")

    assert reponse.code == 200

    tree = TreeResponse.model_validate_json(reponse.body.decode())
    assert tree.name == 'WP1'


async def test_tree_WP1_1(project_via_env, jp_fetch) -> None:    
    project = project_via_env
    project['WP1'].setup_files()
    project['WP1.1'].setup_files()

    reponse = await jp_fetch("jupyter_cassini", "tree/1/1")

    assert reponse.code == 200

    tree = TreeResponse.model_validate_json(reponse.body.decode())
    assert tree.name == 'WP1.1'


async def test_tree_WP1_1_with_query_bit(project_via_env, jp_fetch) -> None:    
    project = project_via_env
    project['WP1'].setup_files()
    project['WP1.1'].setup_files()

    reponse = await jp_fetch("jupyter_cassini", "tree/1/1?1232341")

    assert reponse.code == 200

    tree = TreeResponse.model_validate_json(reponse.body.decode())
    assert tree.name == 'WP1.1'


async def test_tree_old_query(project_via_env, jp_fetch) -> None:    
    project = project_via_env
    project['WP1'].setup_files()

    with pytest.raises(HTTPClientError):
        reponse = await jp_fetch("jupyter_cassini", "tree", params={"ids[]": ["1", "2"]})
    

async def test_open_valid(project_via_env, jp_fetch) -> None:
    project = project_via_env
    project['Home'].open_folder = Mock()

    assert not project['Home'].open_folder.called

    response = await jp_fetch("jupyter_cassini", "open", params={'name': 'Home'})

    assert Status.model_validate_json(response.body.decode()).status == Status1.success
    assert project['Home'].open_folder.called


async def test_open_invalid(project_via_env, jp_fetch) -> None:
    response = await jp_fetch("jupyter_cassini", "open", params={'name': 'sdfdf'})

    assert Status.model_validate_json(response.body.decode()).status == Status1.failure


async def test_new_child(project_via_env, jp_fetch) -> None:
    project = project_via_env
    new_child_info = NewChildInfo(id='1', parent='Home', template='WorkPackage.ipynb')

    assert not project['WP1'].exists()

    response = await jp_fetch("jupyter_cassini", "newChild", body=new_child_info.model_dump_json(), method='POST')

    assert response.code == 200
    tree = TreeResponse.model_validate_json(response.body.decode())
    assert tree.name == 'WP1'

    assert project['WP1'].exists()

