"""
Popup Messages API Tests
Tests for the popup message system including:
- Admin CRUD operations (create, read, update, delete)
- Toggle active/inactive
- Target specific users vs all users
- Client popup retrieval
- Popup dismissal
- Media upload
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://canonical-voice-lab.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"username": "admin", "password": "VocalFitness2026!"}
CLIENT_CREDENTIALS = {"username": "test.client", "password": "Test1234!"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def client_user():
    """Create a client user for testing and return their token"""
    # First login as admin
    admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if admin_resp.status_code != 200:
        pytest.skip("Admin login failed")
    admin_token = admin_resp.json().get("access_token")
    
    # Try to create client user
    client_data = {
        "username": "test.client",
        "password": "Test1234!",
        "email": "test.client@example.com",
        "full_name": "Test Client",
        "role": "client"
    }
    create_resp = requests.post(
        f"{BASE_URL}/api/admin/users",
        json=client_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Login as client
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=CLIENT_CREDENTIALS)
    if login_resp.status_code != 200:
        pytest.skip(f"Client login failed: {login_resp.status_code} - {login_resp.text}")
    
    data = login_resp.json()
    return {
        "token": data.get("access_token"),
        "user": data.get("user")
    }


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAdminPopupCRUD:
    """Admin popup message CRUD operations"""
    
    def test_list_popups_as_admin(self, api_client, admin_token):
        """Admin can list popup messages"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/popups",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ List popups: Found {len(response.json())} popup messages")
    
    def test_create_text_popup(self, api_client, admin_token):
        """Admin can create a text popup message"""
        popup_data = {
            "title": f"TEST_Text_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "This is a test text popup message for testing purposes.",
            "target_users": [],  # All users
            "is_active": True,
            "button_text": "Learn More",
            "button_url": "https://example.com"
        }
        response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == popup_data["title"]
        assert data["message_type"] == "text"
        assert data["is_active"] == True
        print(f"✅ Created text popup: {data['id']}")
        return data["id"]
    
    def test_create_video_popup_with_youtube(self, api_client, admin_token):
        """Admin can create a video popup with YouTube link"""
        popup_data = {
            "title": f"TEST_Video_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "video",
            "content": "Check out this video message!",
            "media_url": "",  # No direct URL
            "embed_code": '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>',
            "target_users": [],
            "is_active": True
        }
        response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["message_type"] == "video"
        assert "embed_code" in data
        print(f"✅ Created video popup with YouTube embed: {data['id']}")
        return data["id"]
    
    def test_toggle_popup_active(self, api_client, admin_token):
        """Admin can toggle popup active/inactive"""
        # First create a popup
        popup_data = {
            "title": f"TEST_Toggle_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "Toggle test popup",
            "target_users": [],
            "is_active": True
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        popup_id = create_response.json()["id"]
        
        # Toggle to inactive
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["is_active"] == False
        print(f"✅ Toggled popup to inactive: {popup_id}")
        
        # Toggle back to active
        update_response2 = api_client.put(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            json={"is_active": True},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response2.status_code == 200
        assert update_response2.json()["is_active"] == True
        print(f"✅ Toggled popup back to active: {popup_id}")
    
    def test_edit_popup_message(self, api_client, admin_token):
        """Admin can edit a popup message"""
        # Create
        popup_data = {
            "title": f"TEST_Edit_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "Original content",
            "target_users": [],
            "is_active": True
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        popup_id = create_response.json()["id"]
        
        # Edit
        update_data = {
            "title": "Updated Title",
            "content": "Updated content after edit"
        }
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["title"] == "Updated Title"
        assert data["content"] == "Updated content after edit"
        print(f"✅ Edited popup: {popup_id}")
    
    def test_delete_popup_message(self, api_client, admin_token):
        """Admin can delete a popup message"""
        # Create
        popup_data = {
            "title": f"TEST_Delete_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "To be deleted",
            "target_users": [],
            "is_active": True
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        popup_id = create_response.json()["id"]
        
        # Delete
        delete_response = api_client.delete(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        print(f"✅ Deleted popup: {popup_id}")
        
        # Verify deletion
        get_response = api_client.get(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404
        print(f"✅ Verified popup no longer exists")


class TestClientPopups:
    """Client popup retrieval and dismissal tests"""
    
    def test_client_get_popups(self, api_client, client_user, admin_token):
        """Client can retrieve active popups"""
        # Create an active popup for all users
        popup_data = {
            "title": f"TEST_Client_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "Popup visible to clients",
            "target_users": [],  # All users
            "is_active": True
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        created_popup_id = create_response.json()["id"]
        
        # Client retrieves popups
        client_response = api_client.get(
            f"{BASE_URL}/api/members/popups",
            headers={"Authorization": f"Bearer {client_user['token']}"}
        )
        assert client_response.status_code == 200
        popups = client_response.json()
        assert isinstance(popups, list)
        
        # Check if our created popup is in the list
        popup_ids = [p["id"] for p in popups]
        assert created_popup_id in popup_ids, f"Created popup {created_popup_id} should be visible to client"
        print(f"✅ Client retrieved {len(popups)} popups, including test popup")
        
        return created_popup_id
    
    def test_client_dismiss_popup(self, api_client, client_user, admin_token):
        """Client can dismiss a popup permanently"""
        # Create a popup for testing
        popup_data = {
            "title": f"TEST_Dismiss_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "This popup will be dismissed",
            "target_users": [],
            "is_active": True
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        popup_id = create_response.json()["id"]
        
        # Client dismisses the popup
        dismiss_response = api_client.post(
            f"{BASE_URL}/api/members/popups/{popup_id}/dismiss",
            headers={"Authorization": f"Bearer {client_user['token']}"}
        )
        assert dismiss_response.status_code == 200
        print(f"✅ Client dismissed popup: {popup_id}")
        
        # Verify popup no longer appears for this client
        popups_response = api_client.get(
            f"{BASE_URL}/api/members/popups",
            headers={"Authorization": f"Bearer {client_user['token']}"}
        )
        assert popups_response.status_code == 200
        popup_ids = [p["id"] for p in popups_response.json()]
        assert popup_id not in popup_ids, "Dismissed popup should not appear"
        print(f"✅ Verified dismissed popup no longer appears")
    
    def test_inactive_popup_not_visible(self, api_client, client_user, admin_token):
        """Inactive popups should not be visible to clients"""
        # Create inactive popup
        popup_data = {
            "title": f"TEST_Inactive_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "This popup is inactive",
            "target_users": [],
            "is_active": False  # Inactive!
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        popup_id = create_response.json()["id"]
        
        # Client should not see this popup
        client_response = api_client.get(
            f"{BASE_URL}/api/members/popups",
            headers={"Authorization": f"Bearer {client_user['token']}"}
        )
        assert client_response.status_code == 200
        popup_ids = [p["id"] for p in client_response.json()]
        assert popup_id not in popup_ids, "Inactive popup should not be visible"
        print(f"✅ Verified inactive popup not visible to client")


class TestTargetedPopups:
    """Tests for targeting specific users"""
    
    def test_popup_for_specific_user(self, api_client, admin_token, client_user):
        """Popup targeted to specific user should only appear for that user"""
        user_id = client_user["user"]["id"]
        
        # Create popup for this specific user
        popup_data = {
            "title": f"TEST_Targeted_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": f"This popup is only for {client_user['user']['username']}",
            "target_users": [user_id],  # Specific user
            "is_active": True
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        popup_id = create_response.json()["id"]
        
        # Client should see this popup
        client_response = api_client.get(
            f"{BASE_URL}/api/members/popups",
            headers={"Authorization": f"Bearer {client_user['token']}"}
        )
        assert client_response.status_code == 200
        popup_ids = [p["id"] for p in client_response.json()]
        assert popup_id in popup_ids, "Targeted popup should be visible to targeted user"
        print(f"✅ Targeted popup visible to intended user: {popup_id}")


class TestPopupWithCTA:
    """Tests for popup CTA button"""
    
    def test_popup_with_cta_button(self, api_client, admin_token):
        """Popup with CTA button should include button_text and button_url"""
        popup_data = {
            "title": f"TEST_CTA_Popup_{uuid.uuid4().hex[:8]}",
            "message_type": "text",
            "content": "Check out our new feature!",
            "target_users": [],
            "is_active": True,
            "button_text": "Try It Now",
            "button_url": "https://example.com/feature"
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201]
        data = create_response.json()
        assert data["button_text"] == "Try It Now"
        assert data["button_url"] == "https://example.com/feature"
        print(f"✅ Created popup with CTA button: {data['id']}")


class TestCleanup:
    """Cleanup test popups"""
    
    def test_cleanup_test_popups(self, api_client, admin_token):
        """Clean up all TEST_ prefixed popups"""
        # List all popups
        response = api_client.get(
            f"{BASE_URL}/api/admin/popups",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            popups = response.json()
            deleted_count = 0
            for popup in popups:
                if popup.get("title", "").startswith("TEST_"):
                    delete_response = api_client.delete(
                        f"{BASE_URL}/api/admin/popups/{popup['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"✅ Cleaned up {deleted_count} test popups")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
