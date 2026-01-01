import asyncio
import importlib.util
import json
from pathlib import Path

REPO_ROOT = Path('.')
config = json.load((REPO_ROOT / '.vscode' / 'mcp.json').open())
env = config['servers']['openproject']['env']
module_path = REPO_ROOT / 'deploy' / 'openproject' / 'openproject-mcp-server' / 'openproject-mcp.py'
spec = importlib.util.spec_from_file_location('openproject_mcp', module_path)
openproject_mcp = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = openproject_mcp
spec.loader.exec_module(openproject_mcp)

client = openproject_mcp.OpenProjectClient(env['OPENPROJECT_URL'], env['OPENPROJECT_API_KEY'])
result = asyncio.run(client.get_work_packages(3, page_size=100))

print(f"Total WPs: {result.get('total', 0)}")
wps = result.get('_embedded', {}).get('elements', [])
for wp in wps[:30]:
    wp_type = wp.get('_links', {}).get('type', {}).get('title', '?')
    print(f"  #{wp['id']}: [{wp_type:>10}] {wp['subject'][:60]}")
