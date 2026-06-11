"""
Quick test script to verify the /v1/bin/upload endpoint
Tests the complete flow with mock data
"""

import requests
import base64
import time
import hmac
import hashlib
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuration
BASE_URL = "http://localhost:8000"
BIN_CODE = "BIN_TEST_001"
HARDWARE_API_KEY = os.getenv("TEST_HARDWARE_API_KEY", "YOUR_API_KEY_HERE")


def generate_hmac_signature(bin_code: str, timestamp: str, body_str: str, api_key: str) -> str:
    """Generate HMAC-SHA256 signature over the exact raw JSON body."""
    message = f"{bin_code}{timestamp}{body_str}"
    signature = hmac.new(
        api_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature


def create_mock_image() -> str:
    """Create a small mock image (1x1 pixel PNG) as base64"""
    # Tiny 1x1 red pixel PNG
    png_bytes = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    ])
    return base64.b64encode(png_bytes).decode('utf-8')


def create_real_session() -> str:
    """Authenticate as test user and create a real active session."""
    print("\n=== Creating Real User Session ===")
    
    # 1. Login with test user (created by setup.py)
    login_data = {"username": "test@ecomais.com", "password": "password123"}
    login_resp = requests.post(f"{BASE_URL}/v1/auth/login", data=login_data)
    
    if login_resp.status_code != 200:
        print(f"❌ Login failed: {login_resp.json()}")
        return ""
        
    access_token = login_resp.json()["access_token"]
    
    # 2. Start a recycling session
    headers = {"Authorization": f"Bearer {access_token}"}
    session_resp = requests.post(
        f"{BASE_URL}/v1/sessions/start",
        json={"bin_code": BIN_CODE},
        headers=headers
    )
    
    if session_resp.status_code != 201:
        print(f"❌ Session start failed: {session_resp.json()}")
        return ""
        
    session_token = session_resp.json()["session_token"]
    print(f"✅ Session created! Token starts with: {session_token[:10]}...")
    return session_token


def check_health():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200


def check_bin_upload(session_token: str):
    """Test /v1/bin/upload endpoint with HMAC signature"""
    print("\n=== Testing /v1/bin/upload ===")

    # Prepare request
    timestamp = str(int(time.time()))
    body = {
        "session_token": session_token,
        "weight_grams": 245.5,
        "image": create_mock_image()
    }

    # Serialize once and reuse the exact same string for signing and sending.
    body_str = json.dumps(body, separators=(",", ":"), ensure_ascii=False)

    # Generate HMAC signature
    signature = generate_hmac_signature(BIN_CODE, timestamp, body_str, HARDWARE_API_KEY)

    # Headers
    headers = {
        "X-Bin-ID": BIN_CODE,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "Content-Type": "application/json"
    }

    # Send request
    print(f"Sending request to {BASE_URL}/v1/bin/upload...")
    print(f"Headers: {headers}")
    print(f"Body (weight): {body['weight_grams']}g")

    response = requests.post(
        f"{BASE_URL}/v1/bin/upload",
        headers=headers,
        data=body_str.encode('utf-8')
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

    return response.status_code == 200


def check_bin_heartbeat():
    """Test /v1/bin/heartbeat endpoint"""
    print("\n=== Testing /v1/bin/heartbeat ===")

    timestamp = str(int(time.time()))
    body = {
        "firmware_version": "1.0.0",
        "current_load_kg": 12.5,
        "status": "active"
    }

    body_str = json.dumps(body, separators=(",", ":"), ensure_ascii=False)

    signature = generate_hmac_signature(BIN_CODE, timestamp, body_str, HARDWARE_API_KEY)

    headers = {
        "X-Bin-ID": BIN_CODE,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"{BASE_URL}/v1/bin/heartbeat",
        headers=headers,
        data=body_str.encode('utf-8')
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

    return response.status_code == 200


def main():
    """Run all tests"""
    print("=" * 60)
    print("Eco Mais API Test Script")
    print("=" * 60)

    # Check if API is running
    try:
        health_ok = check_health()
        if not health_ok:
            print("\n❌ Health check failed. Is the API running?")
            print("   Start it with: uvicorn main:app --reload")
            return
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to API. Is it running?")
        print("   Start it with: uvicorn main:app --reload")
        return

    # Run tests
    print("\n" + "=" * 60)

    # Note: Upload and heartbeat tests will fail without proper setup
    print("\n⚠️  NOTE: To test upload/heartbeat endpoints:")
    print("   1. Run setup.py to create test data")
    print("   2. Update HARDWARE_API_KEY and SESSION_TOKEN in this script")
    print("   3. Run this script again")

    # Uncomment these when you have valid credentials:
    check_bin_heartbeat()
    
    session_token = create_real_session()
    if session_token:
        check_bin_upload(session_token)

    print("\n" + "=" * 60)
    print("✅ Basic tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
