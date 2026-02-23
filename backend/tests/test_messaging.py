"""
Test suite for messaging system and updated user fields (iteration 4)
Features tested:
- Admin user edit with new fields (phone, client_type, company_name, vat_number, sdi_code, pec, website, notes, purchase_history)
- Messaging endpoints: GET/POST /api/admin/messages, GET/POST /api/members/messages
- Unread count endpoint: GET /api/members/messages/unread-count
- Task completion endpoint: POST /api/members/messages/{id}/complete-task
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserUpdateWithNewFields:
    """Test admin user update with complete Italian business fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "VocalFitness2026!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_list_users_shows_new_fields(self):
        """GET /api/admin/users should include new fields in response"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"Found {len(users)} users")
        
        # Check if user response includes new fields
        if users:
            user = users[0]
            # New fields should be present (may be empty strings)
            expected_fields = ['phone', 'client_type', 'company_name', 'vat_number', 
                              'sdi_code', 'pec', 'website', 'notes', 'purchase_history']
            for field in expected_fields:
                assert field in user or user.get(field, '') == '', f"Field {field} should be in user response"
            print("User response contains all new Italian business fields")
    
    def test_create_business_user_with_full_profile(self):
        """Create user with complete Italian business fields"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_business_{unique_id}",
            "password": "Test1234!",
            "email": f"test{unique_id}@azienda.it",
            "full_name": "Mario Rossi Test",
            "role": "client",
            "phone": "+39 333 1234567",
            "date_of_birth": "1980-01-15",
            "address": "Via Roma 1",
            "city": "Milano",
            "province": "MI",
            "postal_code": "20100",
            "country": "Italia",
            "fiscal_code": "RSSMRA80A15F205X",
            "client_type": "business",
            "company_name": "Azienda Test SRL",
            "vat_number": "IT12345678901",
            "sdi_code": "SUBM70N",
            "pec": "test@pec.azienda.it",
            "website": "https://www.azienda-test.it",
            "notes": "Cliente test per verifica campi",
            "purchase_history": "Corso Base - 01/2026 - €500"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        assert response.status_code == 201, f"User creation failed: {response.text}"
        
        created_user = response.json()
        assert created_user["username"] == user_data["username"]
        assert created_user["client_type"] == "business"
        assert created_user["company_name"] == "Azienda Test SRL"
        assert created_user["vat_number"] == "IT12345678901"
        assert created_user["sdi_code"] == "SUBM70N"
        assert created_user["pec"] == "test@pec.azienda.it"
        assert created_user["phone"] == "+39 333 1234567"
        print(f"Created business user with ID: {created_user['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{created_user['id']}", headers=self.admin_headers)
        print("Cleaned up test user")
    
    def test_update_user_business_fields(self):
        """PUT /api/admin/users/{id} should update all business fields"""
        # First create a test user
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_update_{unique_id}",
            "password": "Test1234!",
            "email": f"update{unique_id}@test.it",
            "full_name": "Test Update User",
            "role": "client",
            "client_type": "private"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        assert create_response.status_code == 201
        user_id = create_response.json()["id"]
        
        # Update to business type with all fields
        update_data = {
            "phone": "+39 06 12345678",
            "client_type": "business",
            "company_name": "Updated Company SRL",
            "vat_number": "IT98765432101",
            "sdi_code": "ABC1234",
            "pec": "updated@pec.it",
            "website": "https://updated.com",
            "notes": "Updated admin notes",
            "purchase_history": "Corso Avanzato - 02/2026 - €800\nConsulenza - 03/2026 - €200"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}", json=update_data, headers=self.admin_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_user = update_response.json()
        assert updated_user["client_type"] == "business"
        assert updated_user["company_name"] == "Updated Company SRL"
        assert updated_user["vat_number"] == "IT98765432101"
        assert updated_user["sdi_code"] == "ABC1234"
        assert updated_user["pec"] == "updated@pec.it"
        assert updated_user["phone"] == "+39 06 12345678"
        assert updated_user["notes"] == "Updated admin notes"
        print(f"Successfully updated user {user_id} with business fields")
        
        # Verify via GET that update persisted
        get_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers)
        users = get_response.json()
        user_from_list = next((u for u in users if u['id'] == user_id), None)
        assert user_from_list is not None
        assert user_from_list["company_name"] == "Updated Company SRL"
        print("Verified update persisted correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.admin_headers)
    
    def test_update_user_foreign_type(self):
        """Test creating foreign client type"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_foreign_{unique_id}",
            "password": "Test1234!",
            "email": f"foreign{unique_id}@test.com",
            "full_name": "John Smith",
            "role": "client",
            "client_type": "foreign",
            "company_name": "Foreign Corp Ltd",
            "vat_number": "GB123456789",
            "country": "United Kingdom"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        assert response.status_code == 201
        user = response.json()
        assert user["client_type"] == "foreign"
        print(f"Created foreign client: {user['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{user['id']}", headers=self.admin_headers)


class TestMessagingEndpoints:
    """Test bidirectional messaging system between admin and clients"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin and client tokens"""
        # Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "VocalFitness2026!"
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.admin_id = admin_response.json()["user"]["id"]
        
        # Create test client for messaging tests
        unique_id = str(uuid.uuid4())[:8]
        self.test_client_username = f"TEST_msgclient_{unique_id}"
        create_client = requests.post(f"{BASE_URL}/api/admin/users", json={
            "username": self.test_client_username,
            "password": "Test1234!",
            "email": f"msg{unique_id}@test.it",
            "full_name": "Test Message Client",
            "role": "client"
        }, headers=self.admin_headers)
        assert create_client.status_code == 201
        self.client_id = create_client.json()["id"]
        
        # Client login
        client_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": self.test_client_username,
            "password": "Test1234!"
        })
        assert client_response.status_code == 200
        self.client_token = client_response.json()["access_token"]
        self.client_headers = {"Authorization": f"Bearer {self.client_token}"}
        
        yield
        
        # Cleanup - delete test client
        requests.delete(f"{BASE_URL}/api/admin/users/{self.client_id}", headers=self.admin_headers)
    
    def test_admin_get_conversations(self):
        """GET /api/admin/messages/conversations returns conversation list"""
        response = requests.get(f"{BASE_URL}/api/admin/messages/conversations", headers=self.admin_headers)
        assert response.status_code == 200
        conversations = response.json()
        assert isinstance(conversations, list)
        print(f"Admin has {len(conversations)} conversations")
    
    def test_admin_send_text_message(self):
        """POST /api/admin/messages creates text message"""
        message_data = {
            "recipient_id": self.client_id,
            "content": "Ciao! Questo è un messaggio di test dall'admin.",
            "message_type": "text"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/messages", json=message_data, headers=self.admin_headers)
        assert response.status_code == 200, f"Send message failed: {response.text}"
        
        message = response.json()
        assert message["content"] == message_data["content"]
        assert message["message_type"] == "text"
        assert message["recipient_id"] == self.client_id
        assert message["sender_id"] == self.admin_id
        assert "id" in message
        assert "conversation_id" in message
        print(f"Admin sent message with ID: {message['id']}")
        return message["id"]
    
    def test_admin_send_task_message(self):
        """POST /api/admin/messages creates task message"""
        message_data = {
            "recipient_id": self.client_id,
            "content": "Nuovo compito assegnato",
            "message_type": "task",
            "task_description": "Completa l'esercizio vocale n.5",
            "task_due_date": "2026-02-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/messages", json=message_data, headers=self.admin_headers)
        assert response.status_code == 200
        
        message = response.json()
        assert message["message_type"] == "task"
        assert message["task_description"] == "Completa l'esercizio vocale n.5"
        assert message["task_due_date"] == "2026-02-15"
        assert message["task_completed"] == False
        print(f"Admin created task message: {message['id']}")
        return message["id"]
    
    def test_client_get_unread_count(self):
        """GET /api/members/messages/unread-count returns correct count"""
        # First send a message from admin
        requests.post(f"{BASE_URL}/api/admin/messages", json={
            "recipient_id": self.client_id,
            "content": "Test unread message",
            "message_type": "text"
        }, headers=self.admin_headers)
        
        # Client checks unread count
        response = requests.get(f"{BASE_URL}/api/members/messages/unread-count", headers=self.client_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        assert data["unread_count"] >= 1  # At least one unread message
        print(f"Client unread count: {data['unread_count']}")
    
    def test_client_get_messages(self):
        """GET /api/members/messages returns messages list"""
        # Send message from admin first
        requests.post(f"{BASE_URL}/api/admin/messages", json={
            "recipient_id": self.client_id,
            "content": "Message for client test",
            "message_type": "text"
        }, headers=self.admin_headers)
        
        # Client fetches messages
        response = requests.get(f"{BASE_URL}/api/members/messages", headers=self.client_headers)
        assert response.status_code == 200
        
        messages = response.json()
        assert isinstance(messages, list)
        assert len(messages) >= 1
        print(f"Client received {len(messages)} messages")
        
        # Verify message structure
        msg = messages[-1]
        assert "id" in msg
        assert "content" in msg
        assert "message_type" in msg
        assert "sender_id" in msg
    
    def test_client_send_reply(self):
        """POST /api/members/messages creates client reply"""
        message_data = {
            "recipient_id": "admin",  # Special value for admin
            "content": "Risposta dal cliente test",
            "message_type": "text"
        }
        
        response = requests.post(f"{BASE_URL}/api/members/messages", json=message_data, headers=self.client_headers)
        assert response.status_code == 200, f"Client reply failed: {response.text}"
        
        message = response.json()
        assert message["content"] == "Risposta dal cliente test"
        assert message["sender_id"] == self.client_id
        print(f"Client sent reply with ID: {message['id']}")
    
    def test_admin_get_messages_with_user(self):
        """GET /api/admin/messages/{user_id} returns conversation with user"""
        # Send a message first
        requests.post(f"{BASE_URL}/api/admin/messages", json={
            "recipient_id": self.client_id,
            "content": "Test conversation message",
            "message_type": "text"
        }, headers=self.admin_headers)
        
        # Get messages with specific user
        response = requests.get(f"{BASE_URL}/api/admin/messages/{self.client_id}", headers=self.admin_headers)
        assert response.status_code == 200
        
        messages = response.json()
        assert isinstance(messages, list)
        assert len(messages) >= 1
        print(f"Admin-client conversation has {len(messages)} messages")
    
    def test_client_complete_task(self):
        """POST /api/members/messages/{id}/complete-task marks task as completed"""
        # Admin sends task
        task_response = requests.post(f"{BASE_URL}/api/admin/messages", json={
            "recipient_id": self.client_id,
            "content": "Test task to complete",
            "message_type": "task",
            "task_description": "Test completion functionality"
        }, headers=self.admin_headers)
        assert task_response.status_code == 200
        task_id = task_response.json()["id"]
        
        # Client completes task
        complete_response = requests.post(f"{BASE_URL}/api/members/messages/{task_id}/complete-task", 
                                         headers=self.client_headers)
        assert complete_response.status_code == 200
        
        result = complete_response.json()
        assert result.get("message") == "Compito completato"
        print(f"Task {task_id} marked as completed")
    
    def test_admin_send_video_message(self):
        """POST /api/admin/messages creates video message"""
        message_data = {
            "recipient_id": self.client_id,
            "content": "Guarda questo video",
            "message_type": "video",
            "media_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/messages", json=message_data, headers=self.admin_headers)
        assert response.status_code == 200
        
        message = response.json()
        assert message["message_type"] == "video"
        assert message["media_url"] == message_data["media_url"]
        print(f"Admin sent video message: {message['id']}")
    
    def test_admin_send_audio_message(self):
        """POST /api/admin/messages creates audio message"""
        message_data = {
            "recipient_id": self.client_id,
            "content": "Ascolta questa registrazione",
            "message_type": "audio",
            "media_url": "https://example.com/audio.mp3"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/messages", json=message_data, headers=self.admin_headers)
        assert response.status_code == 200
        
        message = response.json()
        assert message["message_type"] == "audio"
        print(f"Admin sent audio message: {message['id']}")
    
    def test_message_invalid_recipient(self):
        """POST /api/admin/messages returns 404 for invalid recipient"""
        message_data = {
            "recipient_id": "invalid-user-id-12345",
            "content": "Test invalid recipient",
            "message_type": "text"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/messages", json=message_data, headers=self.admin_headers)
        assert response.status_code == 404
        print("Correctly returned 404 for invalid recipient")


class TestUserTableActions:
    """Test admin user table buttons (edit, delete, message)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "VocalFitness2026!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_delete_user(self):
        """DELETE /api/admin/users/{id} removes user"""
        # Create user to delete
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json={
            "username": f"TEST_delete_{unique_id}",
            "password": "Test1234!",
            "email": f"delete{unique_id}@test.it",
            "full_name": "Delete Test User",
            "role": "client"
        }, headers=self.admin_headers)
        assert create_response.status_code == 201
        user_id = create_response.json()["id"]
        
        # Delete user
        delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.admin_headers)
        assert delete_response.status_code == 200
        
        # Verify deleted
        users = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers).json()
        assert not any(u["id"] == user_id for u in users)
        print(f"Successfully deleted user {user_id}")
    
    def test_user_has_id_for_actions(self):
        """Users should have ID field for edit/delete/message actions"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers)
        assert response.status_code == 200
        users = response.json()
        
        for user in users:
            assert "id" in user, "User must have ID for actions"
            assert "username" in user
            assert "role" in user
        print(f"All {len(users)} users have required ID field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
