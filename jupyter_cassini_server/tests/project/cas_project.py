from cassini import DEFAULT_TIERS, Project
from cassini.ext import cassini_lib

project = Project(DEFAULT_TIERS, __file__)
project = cassini_lib.extend_project(project)

if __name__ == '__main__':
    project.launch()
