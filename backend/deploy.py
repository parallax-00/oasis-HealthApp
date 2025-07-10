import subprocess
import sys
import yaml

CONFIG_FILE = "deploy-config.yaml"

def load_config(file_path):
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

def run_command(cmd):
    print(f"Running command: {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def main():
    config = load_config(CONFIG_FILE)

    install_cmd = config['build']['install_command']
    start_cmd = config['deploy']['start_command']

    # Install dependencies
    run_command(install_cmd)

    # Start the app
    run_command(start_cmd)

if __name__ == "__main__":
    main()