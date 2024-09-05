import datetime
from typing import Literal

from cassini import Project, DEFAULT_TIERS, WorkPackage
from cassini.meta import MetaManager
from cassini.ext import cassini_lib


manager = MetaManager()

@manager.connect_class
class MyWP(WorkPackage):
    name_part_template = 'WP{}'
    pretty_type = 'WorkPackage'
    a = manager.meta_attr(datetime.datetime, datetime.datetime)
    b = manager.meta_attr(Literal['bees', 'fish'], str)

project = Project([DEFAULT_TIERS[0], MyWP, *DEFAULT_TIERS[2:]], __file__)
project = cassini_lib.extend_project(project)

if __name__ == '__main__':
    project.launch()
