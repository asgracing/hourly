from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]


def main():
    print("Hourly parser scaffold")
    print(f"Root: {ROOT_DIR}")
    print("Planned responsibilities:")
    print("- read ACC result files for the hourly server")
    print("- build recent_races.json")
    print("- rebuild announcement.json if needed")
    print("- optionally rebuild schedule.json for the public page")


if __name__ == "__main__":
    main()
