import os
import ipaddress
import logging
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from src.config import settings
from src.auth.security import decode_access_token
from src.auth.db import get_user_by_username

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(request: Request, token: str | None = Depends(oauth2_scheme)):
    """
    Validates the JWT token and returns the current user dict.
    """
    if os.environ.get("BYPASS_AUTH") == "1" and settings.ENVIRONMENT == "development":
        try:
            is_loopback = ipaddress.ip_address(settings.API_HOST).is_loopback
        except ValueError:
            is_loopback = settings.API_HOST.lower() in {"localhost", "127.0.0.1"}
        if not is_loopback:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Auth bypass is only permitted on loopback host",
            )
        return {"id": "dev-admin-id", "username": "admin", "is_admin": True, "status": "approved"}

    if not token:
        token = request.cookies.get("access_token")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # 2. Standard JWT Validation
    payload = decode_access_token(token)
    username = payload.get("sub") if payload else None
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    if user.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is no longer active.")

    if payload.get("token_version") is None or payload.get("token_version") != user.get("token_version", 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        
    return user

def require_admin(current_user: dict = Depends(get_current_user)):
    """
    Ensures the current user is an administrator.
    """
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
