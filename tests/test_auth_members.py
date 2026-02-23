"""
Backend API Tests for VocalFitness Area Riservata
Tests: Authentication, Admin User Management, Content Management, Members Area
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vocal-members-pro.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"username": "admin", "password": "VocalFitness2024!"}
CLIENT_CREDENTIALS = {"username": "mario.rossi", "password": "TestClient123!"}


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root working: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['username']}")
        return data["access_token"]
    
    def test_login_client_success(self):
        """Test client login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
        assert response.status_code == 200, f"Client login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "mario.rossi"
        assert data["user"]["role"] == "client"
        print(f"✓ Client login successful: {data['user']['username']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_get_current_user_admin(self):
        """Test /auth/me endpoint for admin"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert data["role"] == "admin"
        print(f"✓ Admin /auth/me working: {data['username']}")
    
    def test_get_current_user_client(self):
        """Test /auth/me endpoint for client"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "mario.rossi"
        assert data["role"] == "client"
        print(f"✓ Client /auth/me working: {data['username']}")
    
    def test_protected_endpoint_without_token(self):
        """Test that protected endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ Protected endpoint correctly requires authentication")


class TestAdminUserManagement:
    """Admin user management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def client_token(self):
        """Get client token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_list_users_as_admin(self, admin_token):
        """Test listing users as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 1  # At least admin exists
        print(f"✓ Admin can list users: {len(users)} users found")
    
    def test_list_users_as_client_forbidden(self, client_token):
        """Test that client cannot list users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
        print("✓ Client correctly forbidden from listing users")
    
    def test_create_user_as_admin(self, admin_token):
        """Test creating a new user as admin"""
        test_user = {
            "username": "TEST_newuser",
            "password": "TestPassword123!",
            "email": "test@example.com",
            "full_name": "Test User",
            "role": "client"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json=test_user,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 400 and "già esistente" in response.text:
            # User already exists, try to delete and recreate
            users_response = requests.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            users = users_response.json()
            for u in users:
                if u["username"] == "TEST_newuser":
                    requests.delete(
                        f"{BASE_URL}/api/admin/users/{u['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
            # Retry creation
            response = requests.post(
                f"{BASE_URL}/api/admin/users",
                json=test_user,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        assert response.status_code == 201, f"Failed to create user: {response.text}"
        data = response.json()
        assert data["username"] == "TEST_newuser"
        assert data["role"] == "client"
        print(f"✓ Admin created user: {data['username']}")
        
        # Cleanup - delete the test user
        requests.delete(
            f"{BASE_URL}/api/admin/users/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_create_user_as_client_forbidden(self, client_token):
        """Test that client cannot create users"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={
                "username": "TEST_forbidden",
                "password": "Test123!",
                "role": "client"
            },
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
        print("✓ Client correctly forbidden from creating users")


class TestAdminContentManagement:
    """Admin content management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def client_token(self):
        """Get client token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_list_content_as_admin(self, admin_token):
        """Test listing content as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        contents = response.json()
        assert isinstance(contents, list)
        print(f"✓ Admin can list content: {len(contents)} items found")
    
    def test_list_content_as_client_forbidden(self, client_token):
        """Test that client cannot access admin content endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/content",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
        print("✓ Client correctly forbidden from admin content endpoint")
    
    def test_create_content_as_admin(self, admin_token):
        """Test creating content as admin"""
        test_content = {
            "title": "TEST_Content",
            "description": "Test content description",
            "content_type": "video",
            "url": "https://example.com/test-video.mp4",
            "category": "Test Category",
            "order": 99
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/content",
            json=test_content,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 201, f"Failed to create content: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Content"
        assert data["content_type"] == "video"
        print(f"✓ Admin created content: {data['title']}")
        
        # Cleanup - delete the test content
        requests.delete(
            f"{BASE_URL}/api/admin/content/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_update_content_as_admin(self, admin_token):
        """Test updating content as admin"""
        # First create content
        test_content = {
            "title": "TEST_UpdateContent",
            "description": "Original description",
            "content_type": "pdf",
            "url": "https://example.com/test.pdf",
            "order": 98
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/content",
            json=test_content,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        content_id = create_response.json()["id"]
        
        # Update content
        update_response = requests.put(
            f"{BASE_URL}/api/admin/content/{content_id}",
            json={"title": "TEST_UpdatedTitle", "description": "Updated description"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["title"] == "TEST_UpdatedTitle"
        print(f"✓ Admin updated content: {updated_data['title']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/content/{content_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestMembersArea:
    """Members area content access tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def client_token(self):
        """Get client token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_get_member_content_as_client(self, client_token):
        """Test that client can access member content"""
        response = requests.get(
            f"{BASE_URL}/api/members/content",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        contents = response.json()
        assert isinstance(contents, list)
        print(f"✓ Client can access member content: {len(contents)} items")
    
    def test_get_member_content_as_admin(self, admin_token):
        """Test that admin can also access member content"""
        response = requests.get(
            f"{BASE_URL}/api/members/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        contents = response.json()
        assert isinstance(contents, list)
        print(f"✓ Admin can access member content: {len(contents)} items")
    
    def test_get_member_content_without_auth(self):
        """Test that member content requires authentication"""
        response = requests.get(f"{BASE_URL}/api/members/content")
        assert response.status_code in [401, 403]
        print("✓ Member content correctly requires authentication")
    
    def test_get_content_categories(self, client_token):
        """Test getting content categories"""
        response = requests.get(
            f"{BASE_URL}/api/members/categories",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        print(f"✓ Categories endpoint working: {data['categories']}")


class TestRouteProtection:
    """Test route protection and access control"""
    
    def test_admin_endpoints_require_admin_role(self):
        """Test that admin endpoints reject non-admin users"""
        # Login as client
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
        client_token = login_response.json()["access_token"]
        
        # Try to access admin endpoints
        admin_endpoints = [
            ("GET", "/api/admin/users"),
            ("GET", "/api/admin/content"),
            ("POST", "/api/admin/users"),
            ("POST", "/api/admin/content"),
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers={"Authorization": f"Bearer {client_token}"}
                )
            else:
                response = requests.post(
                    f"{BASE_URL}{endpoint}",
                    json={},
                    headers={"Authorization": f"Bearer {client_token}"}
                )
            assert response.status_code == 403, f"{method} {endpoint} should be forbidden for client"
        
        print("✓ All admin endpoints correctly protected from client access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
