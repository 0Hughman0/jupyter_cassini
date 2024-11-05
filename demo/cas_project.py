import datetime
from typing import Literal

from cassini import Project, DEFAULT_TIERS, WorkPackage
from cassini.meta import MetaAttr
from cassini.ext import cassini_lib
from pydantic import SecretStr


class MyWP(WorkPackage):
    name_part_template = 'WP{}'
    pretty_type = 'WorkPackage'
    a_datetime = MetaAttr(datetime.datetime, datetime.datetime)
    a_date = MetaAttr(datetime.date, datetime.date)
    one_of = MetaAttr(Literal['bees', 'fish'], str)
    an_int = MetaAttr(int, int)

project = Project([DEFAULT_TIERS[0], MyWP, *DEFAULT_TIERS[2:]], __file__)
project = cassini_lib.extend_project(project)

if __name__ == '__main__':
    project.launch()
