import logging
from aiohttp import BasicAuth
from src.core import settings
from typing import Optional, Any, Dict
from src.utils import http_client
from aiohttp import ClientSession

ORG = settings.ASGARDEO_ORG
CLIENT_ID = settings.CLIENT_ID
CLIENT_SECRET = settings.CLIENT_SECRET

logger = logging.getLogger(__name__)

class AuthService:

    @property
    def session(self) -> ClientSession:
        return http_client.session

    async def introspect_token(self, token: str) -> Optional[Dict[str, Any]]:
        url = f'https://api.asgardeo.io/t/{ORG}/oauth2/introspect'
        data = {'token': token, 'token_type_hint': 'access_token'}
        auth = BasicAuth(CLIENT_ID, CLIENT_SECRET)
        
        try:
            async with self.session.post(url, data=data, auth=auth) as response:                
                response.raise_for_status()
                response_data = await response.json()
                
                if response_data.get("active", False):
                    logger.info(f"Token introspection: {response_data}")
                    return response_data
                
                logger.warning("Token introspection returned inactive token")
                return None
        except Exception as e:
            logger.error(f"Error during token introspection: {str(e)}")
            return None

    async def get_user_info(self, token: str) -> Optional[Dict[str, Any]]:
        url = f'https://api.asgardeo.io/t/{ORG}/oauth2/userinfo'
        headers = {'Authorization': f'Bearer {token}'}
        
        try:
            async with self.session.get(url, headers=headers) as response:
                response.raise_for_status()
                response_data = await response.json()
                return response_data
        except Exception as e:
            logger.error(f"Error fetching user info: {str(e)}")
            return None



