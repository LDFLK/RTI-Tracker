import requests
from src.core import settings
from typing import Optional, Any, Dict

ORG = settings.ASGARDIO_ORG
CLIENT_ID = settings.CLIENT_ID
CLIENT_SECRET = settings.CLIENT_SECRET

class AuthService:
    def introspect_token(self, token: str) -> Optional[Dict[str, Any]]:
        url = f'https://api.asgardeo.io/t/{ORG}/oauth2/introspect'
        data = {'token': token, 'token_type_hint': 'access_token'}
        auth = (CLIENT_ID, CLIENT_SECRET)
        
        try:
            res = requests.post(url, data=data, auth=auth)
            res.raise_for_status()
            res_data = res.json()
            
            if res_data.get("active", False):
                return res_data
            return None
        except Exception:
            return None

    def get_user_info(self, token: str) -> Optional[Dict[str, Any]]:
        url = f'https://api.asgardeo.io/t/{ORG}/oauth2/userinfo'
        headers = {'Authorization': f'Bearer {token}'}
        
        try:
            res = requests.get(url, headers=headers)
            res.raise_for_status()
            return res.json()
        except Exception:
            return None



