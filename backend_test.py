#!/usr/bin/env python3
"""
Backend API Testing for VocalFitness Application
Tests testimonials and clients endpoints
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend/.env
BACKEND_URL = "https://vocalfitness-modern.preview.emergentagent.com/api"

def test_testimonials_get_all():
    """Test GET /api/testimonials - Get all testimonials"""
    print("\n=== Testing GET /api/testimonials (all testimonials) ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/testimonials")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response structure: {list(data.keys())}")
            
            if 'testimonials' in data:
                testimonials = data['testimonials']
                print(f"Number of testimonials: {len(testimonials)}")
                
                if len(testimonials) > 0:
                    print(f"Sample testimonial keys: {list(testimonials[0].keys())}")
                    # Check for required fields
                    required_fields = ['id', 'text', 'author', 'role', 'language', 'featured', 'created_at']
                    sample = testimonials[0]
                    missing_fields = [field for field in required_fields if field not in sample]
                    if missing_fields:
                        print(f"❌ Missing required fields: {missing_fields}")
                        return False
                    else:
                        print("✅ All required fields present")
                        
                    # Expected: Should return 6 testimonials
                    if len(testimonials) == 6:
                        print("✅ Expected 6 testimonials found")
                        return True
                    else:
                        print(f"❌ Expected 6 testimonials, got {len(testimonials)}")
                        return False
                else:
                    print("❌ No testimonials found")
                    return False
            else:
                print("❌ 'testimonials' key not found in response")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_testimonials_filter_english():
    """Test GET /api/testimonials?language=en - Filter by English language"""
    print("\n=== Testing GET /api/testimonials?language=en ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/testimonials?language=en")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            testimonials = data.get('testimonials', [])
            print(f"Number of English testimonials: {len(testimonials)}")
            
            # Check all are English
            all_english = all(t.get('language') == 'en' for t in testimonials)
            if all_english:
                print("✅ All testimonials are in English")
                # Expected: Should return 3 English testimonials
                if len(testimonials) == 3:
                    print("✅ Expected 3 English testimonials found")
                    return True
                else:
                    print(f"❌ Expected 3 English testimonials, got {len(testimonials)}")
                    return False
            else:
                print("❌ Some testimonials are not in English")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_testimonials_filter_italian():
    """Test GET /api/testimonials?language=it - Filter by Italian language"""
    print("\n=== Testing GET /api/testimonials?language=it ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/testimonials?language=it")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            testimonials = data.get('testimonials', [])
            print(f"Number of Italian testimonials: {len(testimonials)}")
            
            # Check all are Italian
            all_italian = all(t.get('language') == 'it' for t in testimonials)
            if all_italian:
                print("✅ All testimonials are in Italian")
                # Expected: Should return 3 Italian testimonials
                if len(testimonials) == 3:
                    print("✅ Expected 3 Italian testimonials found")
                    return True
                else:
                    print(f"❌ Expected 3 Italian testimonials, got {len(testimonials)}")
                    return False
            else:
                print("❌ Some testimonials are not in Italian")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_testimonials_filter_featured():
    """Test GET /api/testimonials?featured=true - Filter by featured status"""
    print("\n=== Testing GET /api/testimonials?featured=true ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/testimonials?featured=true")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            testimonials = data.get('testimonials', [])
            print(f"Number of featured testimonials: {len(testimonials)}")
            
            # Check all are featured
            all_featured = all(t.get('featured') == True for t in testimonials)
            if all_featured:
                print("✅ All testimonials are featured")
                # Expected: Should return all 6 testimonials (all are featured)
                if len(testimonials) == 6:
                    print("✅ Expected 6 featured testimonials found")
                    return True
                else:
                    print(f"❌ Expected 6 featured testimonials, got {len(testimonials)}")
                    return False
            else:
                print("❌ Some testimonials are not featured")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_testimonials_create():
    """Test POST /api/testimonials - Create new testimonial"""
    print("\n=== Testing POST /api/testimonials ===")
    
    payload = {
        "text": "VocalFitness transformed my presentation skills completely. The techniques are practical and effective.",
        "author": "Marco Rossi",
        "role": "Marketing Director",
        "company": "Innovation Labs",
        "location": "Milan, Italy",
        "language": "en",
        "featured": False
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/testimonials",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Created testimonial keys: {list(data.keys())}")
            
            # Check for auto-generated fields
            if 'id' in data and 'created_at' in data:
                print("✅ Auto-generated id and created_at present")
                
                # Verify the data matches what we sent
                for key, value in payload.items():
                    if data.get(key) == value:
                        print(f"✅ {key}: {value}")
                    else:
                        print(f"❌ {key}: expected {value}, got {data.get(key)}")
                        return False
                
                print("✅ Testimonial created successfully")
                return True
            else:
                print("❌ Missing auto-generated fields (id or created_at)")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_clients_get_all():
    """Test GET /api/clients - Get all clients"""
    print("\n=== Testing GET /api/clients (all clients) ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/clients")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response structure: {list(data.keys())}")
            
            if 'clients' in data:
                clients = data['clients']
                print(f"Number of clients: {len(clients)}")
                
                if len(clients) > 0:
                    print(f"Sample client keys: {list(clients[0].keys())}")
                    # Check for required fields
                    required_fields = ['id', 'name', 'logo_url', 'featured', 'created_at']
                    sample = clients[0]
                    missing_fields = [field for field in required_fields if field not in sample]
                    if missing_fields:
                        print(f"❌ Missing required fields: {missing_fields}")
                        return False
                    else:
                        print("✅ All required fields present")
                        
                    # Expected: Should return 9 clients
                    if len(clients) == 9:
                        print("✅ Expected 9 clients found")
                        return True
                    else:
                        print(f"❌ Expected 9 clients, got {len(clients)}")
                        return False
                else:
                    print("❌ No clients found")
                    return False
            else:
                print("❌ 'clients' key not found in response")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_clients_filter_featured():
    """Test GET /api/clients?featured=true - Filter by featured status"""
    print("\n=== Testing GET /api/clients?featured=true ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/clients?featured=true")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            clients = data.get('clients', [])
            print(f"Number of featured clients: {len(clients)}")
            
            # Check all are featured
            all_featured = all(c.get('featured') == True for c in clients)
            if all_featured:
                print("✅ All clients are featured")
                # Expected: Should return all 9 clients (all are featured)
                if len(clients) == 9:
                    print("✅ Expected 9 featured clients found")
                    return True
                else:
                    print(f"❌ Expected 9 featured clients, got {len(clients)}")
                    return False
            else:
                print("❌ Some clients are not featured")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_clients_create():
    """Test POST /api/clients - Create new client"""
    print("\n=== Testing POST /api/clients ===")
    
    payload = {
        "name": "Digital Solutions Corp",
        "logo_url": "https://example.com/digital-solutions-logo.png",
        "website": "https://digitalsolutions.com",
        "sector": "Technology",
        "featured": False
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/clients",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Created client keys: {list(data.keys())}")
            
            # Check for auto-generated fields
            if 'id' in data and 'created_at' in data:
                print("✅ Auto-generated id and created_at present")
                
                # Verify the data matches what we sent
                for key, value in payload.items():
                    if data.get(key) == value:
                        print(f"✅ {key}: {value}")
                    else:
                        print(f"❌ {key}: expected {value}, got {data.get(key)}")
                        return False
                
                print("✅ Client created successfully")
                return True
            else:
                print("❌ Missing auto-generated fields (id or created_at)")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Run all backend API tests"""
    print("🚀 Starting VocalFitness Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    
    tests = [
        ("Testimonials - Get All", test_testimonials_get_all),
        ("Testimonials - Filter English", test_testimonials_filter_english),
        ("Testimonials - Filter Italian", test_testimonials_filter_italian),
        ("Testimonials - Filter Featured", test_testimonials_filter_featured),
        ("Testimonials - Create New", test_testimonials_create),
        ("Clients - Get All", test_clients_get_all),
        ("Clients - Filter Featured", test_clients_filter_featured),
        ("Clients - Create New", test_clients_create),
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
    print("TEST SUMMARY")
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
        print("\n🎉 All tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)