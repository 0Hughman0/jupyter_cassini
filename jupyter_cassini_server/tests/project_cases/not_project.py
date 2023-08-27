from cassini import Project, DEFAULT_TIERS

my_project = Project(DEFAULT_TIERS, __file__)

if __name__ == '__main__':
    my_project.launch()
