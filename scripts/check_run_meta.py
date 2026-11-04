import urllib.request
import json
import re
import subprocess

url = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], cwd=r'C:\Users\WizTech\.gemini\antigravity\scratch\animated-shorts').decode().strip()
m = re.search(r'x-access-token:([^@]+)@', url)
token = m.group(1) if m else ''

headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Antigravity'
}

req = urllib.request.Request('https://api.github.com/repos/moonis2006/animated-shorts/actions/runs/41823182218', headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

print("Run ID:", data.get('id'))
print("Status:", data.get('status'))
print("Conclusion:", data.get('conclusion'))
print("Created at:", data.get('created_at'))
print("Updated at:", data.get('updated_at'))
print("Event:", data.get('event'))
print("Triggering actor:", data.get('triggering_actor', {}).get('login'))
print("Cancel reason / message:", data.get('cancel_reason', 'none'))

# Also check other recent runs
req_all = urllib.request.Request('https://api.github.com/repos/moonis2006/animated-shorts/actions/runs?per_page=5', headers=headers)
with urllib.request.urlopen(req_all) as resp:
    all_data = json.loads(resp.read().decode())
print("\nRecent runs:")
for r in all_data.get('workflow_runs', []):
    print(f"ID: {r['id']} | Head branch: {r['head_branch']} | Event: {r['event']} | Status: {r['status']} | Conclusion: {r['conclusion']} | Created: {r['created_at']}")
