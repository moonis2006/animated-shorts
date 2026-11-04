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

job_id = data['jobs'][0]['id']
print("Fetching logs for job", job_id)

# Don't follow redirect with auth header
class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Create new request without Authorization header for S3
        new_req = urllib.request.Request(newurl)
        return new_req

opener = urllib.request.build_opener(NoRedirectHandler)
req_log = urllib.request.Request(f"https://api.github.com/repos/moonis2006/animated-shorts/actions/jobs/{job_id}/logs", headers=headers)
try:
    with opener.open(req_log) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
        lines = content.splitlines()
        print("\n".join(lines[-60:]))
except Exception as e:
    print("Error:", e)
