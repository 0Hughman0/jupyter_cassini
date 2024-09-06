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
    a_date = manager.meta_attr(datetime.datetime, datetime.datetime)
    one_of = manager.meta_attr(Literal['bees', 'fish'], str)
    an_int = manager.meta_attr(int, int)
    a_bool = manager.meta_attr(bool, int)
    a_float = manager.meta_attr(float, int)

project = Project([DEFAULT_TIERS[0], MyWP, *DEFAULT_TIERS[2:]], __file__)
project = cassini_lib.extend_project(project)

if __name__ == '__main__':
    project.launch()
