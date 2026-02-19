"""
Test suite for Thumbnail Generation Feature
Tests for: 
- YouTube thumbnail extraction from various URL formats
- Google Drive thumbnail URL generation
- Custom thumbnail upload
- Video file upload with auto-thumbnail generation
- Content creation with thumbnail_url field
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'VocalFitness2026!'


class TestThumbnailEndpoints:
    """Tests for thumbnail API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()

    # ==================== YouTube Thumbnail Tests ====================
    
    def test_youtube_thumbnail_standard_url(self):
        """Test YouTube thumbnail from standard watch URL: youtube.com/watch?v=VIDEO_ID"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/thumbnail/generate-from-url",
            json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        assert data["success"] is True, f"Success should be True: {data}"
        assert "thumbnail_url" in data
        assert "img.youtube.com/vi/dQw4w9WgXcQ" in data["thumbnail_url"]
        assert "hqdefault.jpg" in data["thumbnail_url"]
        print(f"✓ YouTube watch URL thumbnail: {data['thumbnail_url']}")

    def test_youtube_thumbnail_shorturl(self):
        """Test YouTube thumbnail from short URL: youtu.be/VIDEO_ID"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/thumbnail/generate-from-url",
            json={"url": "https://youtu.be/dQw4w9WgXcQ"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "img.youtube.com/vi/dQw4w9WgXcQ" in data["thumbnail_url"]
        print(f"✓ YouTube youtu.be URL thumbnail: {data['thumbnail_url']}")

    def test_youtube_thumbnail_shorts_url(self):
        """Test YouTube thumbnail from Shorts URL: youtube.com/shorts/VIDEO_ID"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/thumbnail/generate-from-url",
            json={"url": "https://www.youtube.com/shorts/abc123XYZ"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "img.youtube.com/vi/abc123XYZ" in data["thumbnail_url"]
        print(f"✓ YouTube Shorts URL thumbnail: {data['thumbnail_url']}")

    def test_youtube_thumbnail_embed_url(self):
        """Test YouTube thumbnail from embed URL: youtube.com/embed/VIDEO_ID"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/thumbnail/generate-from-url",
            json={"url": "https://www.youtube.com/embed/dQw4w9WgXcQ"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "img.youtube.com/vi/dQw4w9WgXcQ" in data["thumbnail_url"]
        print(f"✓ YouTube embed URL thumbnail: {data['thumbnail_url']}")

    # ==================== Google Drive Thumbnail Tests ====================
    
    def test_google_drive_thumbnail(self):
        """Test Google Drive thumbnail from file link"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/thumbnail/generate-from-url",
            json={"url": "https://drive.google.com/file/d/1ABC123xyz456/view?usp=sharing"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True, f"Should return success for Drive URL: {data}"
        assert "thumbnail_url" in data
        assert "drive.google.com/thumbnail" in data["thumbnail_url"]
        assert "1ABC123xyz456" in data["thumbnail_url"]
        assert "sz=w480" in data["thumbnail_url"]
        print(f"✓ Google Drive thumbnail: {data['thumbnail_url']}")

    # ==================== No Thumbnail Cases ====================
    
    def test_invalid_url_no_thumbnail(self):
        """Test that invalid/unsupported URLs return success=False"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/thumbnail/generate-from-url",
            json={"url": "https://example.com/somefile.pdf"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["thumbnail_url"] == ""
        print("✓ Invalid URL returns no thumbnail (expected)")

    # ==================== Custom Thumbnail Upload Tests ====================
    
    def test_custom_thumbnail_upload(self):
        """Test uploading a custom thumbnail image"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG (1x1 red pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_thumb.png', png_data, 'image/png')
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": self.session.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/thumbnail/upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "thumbnail_url" in data
        assert "/api/uploads/thumbnails/" in data["thumbnail_url"]
        print(f"✓ Custom thumbnail uploaded: {data['thumbnail_url']}")

    def test_custom_thumbnail_invalid_file_type(self):
        """Test uploading non-image file as thumbnail fails"""
        files = {
            'file': ('test.txt', b'This is not an image', 'text/plain')
        }
        
        headers = {"Authorization": self.session.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/thumbnail/upload",
            files=files,
            headers=headers
        )
        
        # Should return error
        assert response.status_code == 400, f"Should reject non-image: {response.text}"
        print("✓ Non-image file rejected for thumbnail upload (expected)")


class TestUploadWithThumbnailGeneration:
    """Tests for file upload endpoint with auto-thumbnail generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()

    def test_upload_returns_thumbnail_url_field(self):
        """Test that POST /api/admin/upload returns thumbnail_url field in response"""
        # Create a small test PDF file
        import base64
        # Minimal valid PDF
        pdf_data = b"%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF"
        
        files = {
            'file': ('test_document.pdf', pdf_data, 'application/pdf')
        }
        
        headers = {"Authorization": self.session.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure contains thumbnail_url
        assert "thumbnail_url" in data, f"Response should include thumbnail_url: {data}"
        assert "url" in data
        assert "file_type" in data
        print(f"✓ Upload response includes thumbnail_url field: {data.get('thumbnail_url', 'empty')}")


class TestContentThumbnailIntegration:
    """Tests for content creation with thumbnail_url field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_content_ids = []
        yield
        # Cleanup: Delete any created content
        for content_id in self.created_content_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/content/{content_id}")
            except:
                pass
        self.session.close()

    def test_create_content_with_youtube_thumbnail(self):
        """Test creating content item with YouTube URL stores correct thumbnail"""
        content_data = {
            "title": "TEST_YouTube Video with Thumbnail",
            "description": "Testing thumbnail generation for YouTube video",
            "content_type": "video",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            "is_public": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/content",
            json=content_data
        )
        
        assert response.status_code == 201, f"Content creation failed: {response.text}"
        data = response.json()
        self.created_content_ids.append(data["id"])
        
        # Verify thumbnail_url is stored
        assert "thumbnail_url" in data
        assert data["thumbnail_url"] == content_data["thumbnail_url"]
        print(f"✓ Content created with YouTube thumbnail: {data['thumbnail_url']}")

    def test_content_thumbnail_persisted_in_list(self):
        """Test that thumbnail_url is returned when listing content"""
        # First create content with thumbnail
        content_data = {
            "title": "TEST_Content with Thumbnail for List",
            "description": "Testing thumbnail persistence",
            "content_type": "video",
            "url": "https://www.youtube.com/watch?v=test123",
            "thumbnail_url": "https://img.youtube.com/vi/test123/hqdefault.jpg",
            "is_public": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/content",
            json=content_data
        )
        assert create_response.status_code == 201
        created = create_response.json()
        self.created_content_ids.append(created["id"])
        
        # Now list all content and verify thumbnail is included
        list_response = self.session.get(f"{BASE_URL}/api/admin/content")
        assert list_response.status_code == 200
        
        content_list = list_response.json()
        found_content = None
        for item in content_list:
            if item["id"] == created["id"]:
                found_content = item
                break
        
        assert found_content is not None, "Created content not found in list"
        assert "thumbnail_url" in found_content
        assert found_content["thumbnail_url"] == content_data["thumbnail_url"]
        print(f"✓ Content thumbnail persisted in list: {found_content['thumbnail_url']}")


class TestPopupThumbnailIntegration:
    """Tests for popup message thumbnail/cover functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_popup_ids = []
        yield
        # Cleanup
        for popup_id in self.created_popup_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/popups/{popup_id}")
            except:
                pass
        self.session.close()

    def test_create_popup_with_thumbnail(self):
        """Test creating a popup message with thumbnail_url"""
        popup_data = {
            "title": "TEST_Popup with Thumbnail",
            "message_type": "video",
            "content": "Check out this video!",
            "media_url": "https://www.youtube.com/watch?v=abc123",
            "thumbnail_url": "https://img.youtube.com/vi/abc123/hqdefault.jpg",
            "is_active": True,
            "target_users": []
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data
        )
        
        assert response.status_code in [200, 201], f"Popup creation failed: {response.text}"
        data = response.json()
        self.created_popup_ids.append(data["id"])
        
        assert "thumbnail_url" in data
        assert data["thumbnail_url"] == popup_data["thumbnail_url"]
        print(f"✓ Popup created with thumbnail: {data['thumbnail_url']}")

    def test_popup_thumbnail_update(self):
        """Test updating popup thumbnail_url"""
        # Create popup without thumbnail first
        popup_data = {
            "title": "TEST_Popup to Update Thumbnail",
            "message_type": "text",
            "content": "Initial popup",
            "is_active": True,
            "target_users": []
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data
        )
        assert create_response.status_code in [200, 201]
        created = create_response.json()
        self.created_popup_ids.append(created["id"])
        
        # Update with thumbnail
        update_response = self.session.put(
            f"{BASE_URL}/api/admin/popups/{created['id']}",
            json={"thumbnail_url": "https://example.com/custom-thumbnail.jpg"}
        )
        
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["thumbnail_url"] == "https://example.com/custom-thumbnail.jpg"
        print(f"✓ Popup thumbnail updated: {updated['thumbnail_url']}")


class TestMembersAreaThumbnailDisplay:
    """Tests for thumbnail display in members area"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get both admin and client tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json()["access_token"]
        
        # Create test client if not exists
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        # Try to login as test client
        client_login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test.client", "password": "Test1234!"}
        )
        if client_login.status_code == 200:
            self.client_token = client_login.json()["access_token"]
        else:
            # Create client user
            create_user_response = self.session.post(
                f"{BASE_URL}/api/admin/users",
                json={
                    "username": "test.client",
                    "password": "Test1234!",
                    "email": "test@example.com",
                    "full_name": "Test Client",
                    "role": "client"
                }
            )
            if create_user_response.status_code in [200, 201]:
                client_login = requests.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"username": "test.client", "password": "Test1234!"}
                )
                if client_login.status_code == 200:
                    self.client_token = client_login.json()["access_token"]
                else:
                    pytest.skip("Could not create or login as test client")
            else:
                pytest.skip("Could not create test client")
        
        self.created_content_ids = []
        yield
        # Cleanup
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        for content_id in self.created_content_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/content/{content_id}")
            except:
                pass
        self.session.close()

    def test_client_receives_thumbnail_in_content(self):
        """Test that clients receive thumbnail_url when fetching content"""
        # Create content as admin with thumbnail
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        content_data = {
            "title": "TEST_Client Thumbnail Test",
            "description": "Testing thumbnail display for clients",
            "content_type": "video",
            "url": "https://www.youtube.com/watch?v=clienttest123",
            "thumbnail_url": "https://img.youtube.com/vi/clienttest123/hqdefault.jpg",
            "is_public": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/content",
            json=content_data
        )
        assert create_response.status_code == 201
        created = create_response.json()
        self.created_content_ids.append(created["id"])
        
        # Fetch content as client
        client_session = requests.Session()
        client_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.client_token}"
        })
        
        content_response = client_session.get(f"{BASE_URL}/api/members/content")
        assert content_response.status_code == 200
        
        content_list = content_response.json()
        found_content = None
        for item in content_list:
            if item["id"] == created["id"]:
                found_content = item
                break
        
        assert found_content is not None, "Content not visible to client"
        assert "thumbnail_url" in found_content, "thumbnail_url should be in client response"
        assert found_content["thumbnail_url"] == content_data["thumbnail_url"]
        print(f"✓ Client receives thumbnail in content: {found_content['thumbnail_url']}")
        client_session.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
