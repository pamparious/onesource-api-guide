# Open Arena Integration - Quick Reference

## Essential Configuration

### Environment Variables (.env)
```bash
OPEN_ARENA_TOKEN=your_esso_token_here
OPEN_ARENA_WORKFLOW_ID=your_workflow_id_here
OPEN_ARENA_BASE_URL=https://aiopenarena.gcs.int.thomsonreuters.com
OPEN_ARENA_MODEL=claude-sonnet-4
```

### Dependencies
```bash
pip install httpx==0.28.1 h2==4.3.0 tenacity==9.0.0 pydantic==2.10.3 pydantic-settings==2.7.0 python-dotenv==1.0.1
```

---

## Minimal Implementation

### 1. Config (config.py)
```python
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    open_arena_token: str = Field(default=None)
    open_arena_base_url: str = Field(default="https://aiopenarena.gcs.int.thomsonreuters.com")
    open_arena_workflow_id: str = Field(default=None)
    open_arena_model: str = Field(default="claude-sonnet-4")

    class Config:
        env_file = ".env"

settings = Settings()
```

### 2. Client (client.py)
```python
import os
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

class OpenArenaClient:
    def __init__(self):
        self.api_token = os.getenv("OPEN_ARENA_TOKEN")
        self.api_base = os.getenv("OPEN_ARENA_BASE_URL")
        self.workflow_id = os.getenv("OPEN_ARENA_WORKFLOW_ID")
        self.model = os.getenv("OPEN_ARENA_MODEL", "claude-sonnet-4")
        self._client = None

    @property
    def client(self):
        if not self._client:
            self._client = httpx.AsyncClient(
                base_url=self.api_base,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                },
                http2=True,
                timeout=60
            )
        return self._client

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=4, max=10))
    async def infer(self, query: str, context: dict) -> str:
        payload = {
            "workflow_id": self.workflow_id,
            "query": query,
            "is_persistence_allowed": False,
            "modelparams": {
                self.model: {
                    "temperature": "0.1",
                    "max_tokens": "4000"
                }
            }
        }

        response = await self.client.post("/v1/inference", json=payload)
        response.raise_for_status()

        result = response.json().get("result", {})
        answer = result.get("answer", {})
        return answer.get(self.model, "")

    async def close(self):
        if self._client:
            await self._client.aclose()
```

### 3. Usage
```python
import asyncio

async def main():
    client = OpenArenaClient()

    try:
        response = await client.infer(
            query="Analyze this error",
            context={"error": "validation failed"}
        )
        print(response)
    finally:
        await client.close()

asyncio.run(main())
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/inference` | POST | Execute LLM inference |
| `/v2/workflow?show_all=true` | GET | List workflows (health check) |

---

## Response Structure

```json
{
  "result": {
    "answer": {
      "claude-sonnet-4": "Model response here",
      "llm_LLM_task": "Alternative response key"
    }
  },
  "tokens_used": 500
}
```

Extract: `response.json()["result"]["answer"]["claude-sonnet-4"]`

---

## Common Models

| Model ID | Provider | Use Case |
|----------|----------|----------|
| `claude-sonnet-4` | Anthropic | General purpose, fast |
| `openai_gpt-4-turbo` | OpenAI | High quality, slower |
| `claude-4-sonnet` | Anthropic | Alternative format |

---

## Error Handling

```python
try:
    response = await client.infer(query, context)
except httpx.HTTPStatusError as e:
    if e.response.status_code == 401:
        print("Invalid token")
    elif e.response.status_code == 429:
        print("Rate limited")
    elif e.response.status_code == 404:
        print("Workflow not found")
```

---

## File Locations (Reference Project)

```
C:\Users\6134505\code\knowledge-library-agent\

Key files:
├── mcp_servers\xml_troubleshooter\config.py (lines 84-102)
├── mcp_servers\xml_troubleshooter\agent\client.py (lines 47-472)
└── mcp_servers\xml_troubleshooter\agent\schemas.py (lines 186-210)
```

---

## Quick Test

```python
# test_connection.py
import asyncio
import httpx
import os

async def test():
    async with httpx.AsyncClient(
        base_url=os.getenv("OPEN_ARENA_BASE_URL"),
        headers={"Authorization": f"Bearer {os.getenv('OPEN_ARENA_TOKEN')}"}
    ) as client:
        resp = await client.get("/v2/workflow?show_all=true")
        print(f"Status: {resp.status_code}")
        print("✓ Connected" if resp.status_code == 200 else "✗ Failed")

asyncio.run(test())
```

---

## Checklist

- [ ] Get ESSO token from TR auth
- [ ] Create workflow in Open Arena dashboard
- [ ] Set environment variables in `.env`
- [ ] Install dependencies
- [ ] Test connection with health check
- [ ] Run inference test

---

**Full Guide:** See `OPEN_ARENA_SETUP_GUIDE.md`
