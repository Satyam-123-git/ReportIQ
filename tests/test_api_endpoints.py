import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "ReportIQ" in data["app_name"]

@pytest.mark.asyncio
async def test_documents_list_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/documents")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_analytics_overview_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        assert "total_documents" in data
        assert "system_status" in data

@pytest.mark.asyncio
async def test_chat_ask_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "question": "What is the recorded literacy rate?",
            "document_id": None
        }
        response = await ac.post("/api/chat/ask", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "citations" in data
