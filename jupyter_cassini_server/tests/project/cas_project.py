from cassini import DEFAULT_TIERS, Project

project = Project(DEFAULT_TIERS, __file__)

if __name__ == '__main__':
    project.launch()
