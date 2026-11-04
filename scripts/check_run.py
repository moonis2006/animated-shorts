import urllib.request
import json
import re
import subprocess

try:
    url = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], cwd=r'C:\Users\WizTech\.gemini\antigravity\scratch\animated-shorts').decode().strip()
    m = re.search(r'x-access-token:([^@]+)@', url)
    token = m.group(1) if m else ''

    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Antigravity'
    }

    req = urllib.request.Request('https://api.github.com/repos/moonis2006/animated-shorts/actions/runs/41823182218/jobs', headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())

    for job in data.get('jobs', []):
        jname = job.get('name')
        jstatus = job.get('status')
        jconc = job.get('conclusion')
        print(f"Job: {jname} | Status: {jstatus} | Conclusion: {jconc}")
        for step in job.get('steps', []):
            sname = step.get('name')
            sconc = step.get('conclusion')
            if sconc and sconc not in ('success', 'skipped'):
                print(f"   Step: {sname} -> {sconc}")
except Exception as e:
    print("Error:", e)
