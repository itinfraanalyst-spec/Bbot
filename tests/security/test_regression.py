import requests, jwt, os, sys
from datetime import datetime, timedelta, timezone

API_BASE = 'http://127.0.0.1:8000'
sys.path.append(os.getcwd())
from src.config import settings

def token(user, exp_mins=30):
    return jwt.encode({'sub': user, 'exp': datetime.now(timezone.utc) + timedelta(minutes=exp_mins), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

print('--- Regression Test ---')
# 1. Login implicitly via token generation
valid_h = {'Authorization': 'Bearer ' + token('reguser')}
# 2. Expired token
expired_h = {'Authorization': 'Bearer ' + token('reguser', exp_mins=-10)}
r_exp = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': None, 'message': 'hi'}, headers=expired_h)
print(f'Expired token response: {r_exp.status_code}')

# 3. Old chat
c_old = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': None, 'message': 'hi'}, headers=valid_h)
import json
cid = ''
if c_old.status_code == 200:
    for line in c_old.iter_lines():
        if line.startswith(b'data: '):
            data = json.loads(line[6:].decode())
            if 'conversation_id' in data: cid = data['conversation_id']; break

r_old = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': cid, 'message': 'hi again'}, headers=valid_h)
print(f'Send message in old chat: {r_old.status_code}')

if r_exp.status_code == 401 and r_old.status_code == 200:
    print('PASS')
else:
    print('FAIL')
    sys.exit(1)
