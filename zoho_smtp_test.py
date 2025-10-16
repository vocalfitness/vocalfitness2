#!/usr/bin/env python3
"""
Zoho SMTP Email Testing for VocalFitness Contact Form
Tests the newly configured Zoho SMTP functionality
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend/.env
BACKEND_URL = "https://fluency-coach-9.preview.emergentagent.com/api"

def test_zoho_smtp_email_sending():
    """Test POST /api/contact with Zoho SMTP configuration"""
    print("\n=== Testing Zoho SMTP Email Sending ===")
    
    # Use the exact payload from the review request
    payload = {
        "name": "Test Zoho SMTP",
        "email": "test@example.com",
        "phone": "+39 333 123 4567",
        "message": "Testing email sending with Zoho SMTP configuration",
        "discount": "",
        "language": "it"
    }
    
    print(f"Testing with payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/contact",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        
        # Check for 201 status code
        if response.status_code == 201:
            print("✅ HTTP 201 Created - Contact form submission successful")
            
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
            print(f"Full response: {json.dumps(data, indent=2, default=str)}")
            
            # Check for required fields in ContactFormResponse
            required_fields = ['id', 'name', 'email', 'phone', 'created_at', 'email_sent']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            else:
                print("✅ All required fields present in response")
            
            # Verify the data matches what we sent
            for key in ['name', 'email', 'phone', 'message', 'discount', 'language']:
                if data.get(key) == payload[key]:
                    print(f"✅ {key}: {payload[key]}")
                else:
                    print(f"❌ {key}: expected {payload[key]}, got {data.get(key)}")
                    return False
            
            # Check auto-generated fields
            if data.get('id') and data.get('created_at'):
                print("✅ Auto-generated id and created_at present")
            else:
                print("❌ Missing auto-generated fields")
                return False
            
            # CRITICAL CHECK: email_sent field should be TRUE with Zoho SMTP
            email_sent = data.get('email_sent')
            if isinstance(email_sent, bool):
                if email_sent:
                    print("✅ email_sent: TRUE - Email was sent successfully via Zoho SMTP")
                    return True
                else:
                    print("❌ email_sent: FALSE - Email was NOT sent (SMTP configuration issue)")
                    return False
            else:
                print(f"❌ email_sent should be boolean, got {type(email_sent)}")
                return False
                
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_zoho_smtp_multiple_languages():
    """Test Zoho SMTP with both Italian and English languages"""
    print("\n=== Testing Zoho SMTP with Multiple Languages ===")
    
    test_cases = [
        {
            "name": "Marco Italiano",
            "email": "marco@test.it",
            "phone": "+39 333 111 2222",
            "message": "Messaggio di test in italiano per Zoho SMTP",
            "discount": "10%",
            "language": "it"
        },
        {
            "name": "John English",
            "email": "john@test.com",
            "phone": "+44 20 1234 5678",
            "message": "English test message for Zoho SMTP configuration",
            "discount": "15%",
            "language": "en"
        }
    ]
    
    all_passed = True
    
    for i, payload in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i}: {payload['language'].upper()} ---")
        print(f"Testing: {payload['name']} ({payload['language']})")
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/contact",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                data = response.json()
                email_sent = data.get('email_sent')
                
                if email_sent:
                    print(f"✅ {payload['language'].upper()} email sent successfully")
                else:
                    print(f"❌ {payload['language'].upper()} email NOT sent")
                    all_passed = False
            else:
                print(f"❌ {payload['language'].upper()} request failed: {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"❌ {payload['language'].upper()} test error: {str(e)}")
            all_passed = False
    
    return all_passed

def check_backend_logs():
    """Check backend logs for SMTP-related messages"""
    print("\n=== Checking Backend Logs for SMTP Messages ===")
    
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "20", "/var/log/supervisor/backend.out.log"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logs = result.stdout
            print("Recent backend logs:")
            print("-" * 50)
            print(logs)
            print("-" * 50)
            
            # Check for SMTP-related messages
            if "SMTP not configured" in logs:
                print("❌ Found 'SMTP not configured' message in logs")
                return False
            elif "Error sending email" in logs:
                print("❌ Found email sending error in logs")
                return False
            else:
                print("✅ No SMTP configuration errors found in recent logs")
                return True
        else:
            print("❌ Could not read backend logs")
            return False
            
    except Exception as e:
        print(f"❌ Error checking logs: {str(e)}")
        return False

def main():
    """Run Zoho SMTP email tests"""
    print("🚀 Starting Zoho SMTP Email Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print("Expected: SMTP Server: smtp.zoho.eu, Port: 587, User: admissions@vocalfitness.org")
    
    tests = [
        ("Zoho SMTP Email Sending", test_zoho_smtp_email_sending),
        ("Zoho SMTP Multiple Languages", test_zoho_smtp_multiple_languages),
        ("Backend Logs Check", check_backend_logs),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("ZOHO SMTP TEST SUMMARY")
    print('='*60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All Zoho SMTP tests passed!")
        print("✅ Email sending is working correctly with Zoho SMTP configuration")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        print("❌ Zoho SMTP configuration needs attention")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)