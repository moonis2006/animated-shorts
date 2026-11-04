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

req = urllib.request.Request('https://api.github.com/repos/moonis2006/animated-shorts/actions/runs/41823182218/jobs', headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return urllib.request.Request(newurl)

opener = urllib.request.build_opener(NoRedirectHandler)

for job in data['jobs']:
    jid = job['id']
    jname = job['name']
    req_log = urllib.request.Request(f"https://api.github.com/repos/moonis2006/animated-shorts/actions/jobs/{jid}/logs", headers=headers)
    try:
        with opener.open(req_log) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            lines = content.splitlines()
            err_lines = [l for l in lines if '##[error]' in l or 'Error:' in l or 'timed out' in l or 'The operation was canceled' in l]
            last_lines = lines[-15:]
            print(f"=== {jname} (ID: {jid}) ===")
            print("Errors found:", err_lines[:5])
            print("Tail:")
            print("\n".join(last_lines[-6:]))
    except Exception as e:
        print(f"=== {jname} Error:", e)
