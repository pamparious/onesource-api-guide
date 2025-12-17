# Open Arena Integration Setup Guide

## Overview
This guide provides step-by-step instructions for setting up Thomson Reuters Open Arena LLM integration in a Python project, based on the `knowledge-library-agent` implementation.

## Project: knowledge-library-agent
**Location:** `C:\Users\6134505\code\knowledge-library-agent`
**Purpose:** XML Troubleshooting Agent with Open Arena LLM integration

---

## 1. Prerequisites

### Required
- Python 3.11 or higher
- Thomson Reuters Open Arena access (ESSO token)
- Open Arena Workflow ID
- Access to Thomson Reuters internal network

### API Details
- **Base URL:** `https://aiopenarena.gcs.int.thomsonreuters.com`
- **Authentication:** Bearer token (ESSO)
- **API Version:** v1/inference
- **Protocol:** HTTP/2 with connection pooling

---

## 2. Project Structure

```
project_root/
├── mcp_servers/
│   └── xml_troubleshooter/
│       ├── config.py                    # Configuration with Open Arena settings
│       └── agent/
│           ├── client.py                # Open Arena client implementation
│           ├── schemas.py               # Pydantic models for requests/responses
│           ├── loop_manager.py          # Agent orchestration
│           └── __init__.py
├── requirements.txt                     # Python dependencies
├── .env                                 # Environment variables (DO NOT COMMIT)
└── kb/                                  # Knowledge base directory
```

---

## 3. Dependencies

### Install Required Packages

Create `requirements.txt`:

```txt
# LLM Integration
httpx==0.28.1                # HTTP client with HTTP/2 support
h2==4.3.0                    # HTTP/2 protocol
hyperframe==6.1.0            # HTTP/2 framing
hpack==4.1.0                 # HTTP/2 header compression
tenacity==9.0.0              # Retry logic with exponential backoff

# Data Validation
pydantic==2.10.3             # Data models and validation
pydantic-settings==2.7.0     # Settings management from env vars

# Environment Variables
python-dotenv==1.0.1         # Load .env files

# Optional: OpenAI SDK (if using OpenAI models as fallback)
openai==1.57.4
```

Install:
```bash
pip install -r requirements.txt
```

---

## 4. Configuration Setup

### 4.1 Create Configuration File (`config.py`)

Location: `mcp_servers/xml_troubleshooter/config.py`

```python
"""Configuration settings with Open Arena integration."""

import os
from pathlib import Path
from typing import Optional, List
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Type-safe configuration using Pydantic BaseSettings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Repository paths
    repo_root: Path = Field(
        default_factory=lambda: Path(__file__).parent.parent.parent,
        description="Repository root directory"
    )

    # Open Arena LLM Configuration
    open_arena_token: Optional[str] = Field(
        default=None,
        description="Thomson Reuters Open Arena ESSO token"
    )

    open_arena_base_url: str = Field(
        default="https://aiopenarena.gcs.int.thomsonreuters.com",
        description="Open Arena API base URL"
    )

    open_arena_workflow_id: Optional[str] = Field(
        default=None,
        description="Open Arena workflow ID for inference"
    )

    open_arena_model: str = Field(
        default="claude-sonnet-4",
        description="Default LLM model name"
    )

    # Agent Configuration
    agent_max_iterations: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum agent troubleshooting iterations"
    )

    agent_timeout: int = Field(
        default=60,
        ge=10,
        le=300,
        description="Timeout per agent iteration (seconds)"
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance (singleton pattern)."""
    return Settings()


# Module-level convenience accessor
settings = get_settings()
```

### 4.2 Create Environment File (`.env`)

**IMPORTANT:** Never commit this file to version control!

```bash
# Thomson Reuters Open Arena Configuration
OPEN_ARENA_TOKEN=your_esso_token_here
OPEN_ARENA_WORKFLOW_ID=your_workflow_id_here
OPEN_ARENA_BASE_URL=https://aiopenarena.gcs.int.thomsonreuters.com
OPEN_ARENA_MODEL=claude-sonnet-4

# Agent Settings
AGENT_MAX_ITERATIONS=3
AGENT_TIMEOUT=60
```

**How to get credentials:**
1. **ESSO Token:** Obtain from TR authentication system
2. **Workflow ID:** Get from Open Arena dashboard after creating a workflow
3. **Model:** Available models: `claude-sonnet-4`, `openai_gpt-4-turbo`, etc.

---

## 5. Open Arena Client Implementation

### 5.1 Create Pydantic Schemas (`schemas.py`)

Location: `mcp_servers/xml_troubleshooter/agent/schemas.py`

```python
"""Agent schemas for structured LLM communication."""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import json


class ActionType(str, Enum):
    """Agent action types."""
    PROPOSE_FIX = "propose_fix"
    REFLECT_AND_RETRY = "reflect_and_retry"
    REPORT_COMPLETE = "report_complete"


class AgentAction(BaseModel):
    """Structured agent action response from LLM."""
    action: ActionType
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    reasoning: Optional[str] = Field(default=None, description="LLM reasoning")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Action data")
    next_steps: List[str] = Field(default_factory=list, description="Follow-up actions")

    @classmethod
    def parse_from_text(cls, text: str) -> Optional["AgentAction"]:
        """Parse AgentAction from raw LLM text response."""
        if not text:
            return None

        # Extract JSON from text (handles markdown code blocks)
        json_start = text.find('{')
        json_end = text.rfind('}') + 1

        if json_start < 0 or json_end <= json_start:
            return None

        try:
            json_content = text[json_start:json_end]
            data = json.loads(json_content)
            return cls(**data)
        except (json.JSONDecodeError, ValueError):
            return None


class LLMInferenceRequest(BaseModel):
    """Request schema for LLM inference."""
    query: str = Field(description="Task description")
    context: Dict[str, Any] = Field(description="Context data")
    model_params: Optional[Dict[str, Any]] = Field(
        default_factory=lambda: {
            "model": "claude-sonnet-4",
            "max_tokens": 4000,
            "temperature": 0.1
        }
    )


class LLMInferenceResponse(BaseModel):
    """Response schema for LLM inference."""
    success: bool
    response: Optional[AgentAction]
    raw_content: str
    tokens_used: int
    inference_time: float
    model_used: str
    error_message: Optional[str]
```

### 5.2 Create Open Arena Client (`client.py`)

Location: `mcp_servers/xml_troubleshooter/agent/client.py`

```python
"""Thomson Reuters Open Arena LLM Client."""

import os
import json
import time
from typing import Optional, Dict, Any
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .schemas import LLMInferenceRequest, LLMInferenceResponse, AgentAction


class OpenArenaClientError(Exception):
    """Base exception for Open Arena client errors."""
    pass


class AuthenticationError(OpenArenaClientError):
    """Authentication or authorization failure."""
    pass


class RateLimitError(OpenArenaClientError):
    """API rate limit exceeded."""
    pass


class OpenArenaClient:
    """
    Thomson Reuters Open Arena LLM client with workflow-based inference.

    Features:
    - HTTP/2 connection pooling
    - Automatic retry with exponential backoff
    - Structured response parsing
    - Context manager support
    """

    def __init__(
        self,
        api_token: Optional[str] = None,
        api_base: Optional[str] = None,
        workflow_id: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: int = 60,
        max_retries: int = 3
    ):
        """
        Initialize Open Arena client.

        Args:
            api_token: ESSO token (env: OPEN_ARENA_TOKEN)
            api_base: API base URL (env: OPEN_ARENA_BASE_URL)
            workflow_id: Workflow ID (env: OPEN_ARENA_WORKFLOW_ID)
            default_model: Model name (env: OPEN_ARENA_MODEL)
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
        """
        self.api_token = api_token or os.getenv("OPEN_ARENA_TOKEN")
        self.api_base = api_base or os.getenv(
            "OPEN_ARENA_BASE_URL",
            "https://aiopenarena.gcs.int.thomsonreuters.com"
        )
        self.default_workflow_id = workflow_id or os.getenv("OPEN_ARENA_WORKFLOW_ID")
        self.default_model = default_model or os.getenv(
            "OPEN_ARENA_MODEL",
            "claude-sonnet-4"
        )
        self.timeout = timeout
        self.max_retries = max_retries

        # Validate required credentials
        if not self.api_token:
            raise AuthenticationError(
                "No API token provided. Set OPEN_ARENA_TOKEN environment variable."
            )

        if not self.default_workflow_id:
            raise OpenArenaClientError(
                "No workflow ID provided. Set OPEN_ARENA_WORKFLOW_ID environment variable."
            )

        # HTTP client initialized lazily
        self._client: Optional[httpx.AsyncClient] = None

        # Usage statistics
        self.total_tokens = 0
        self.request_count = 0
        self.error_count = 0

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client with connection pooling."""
        if self._client is None:
            limits = httpx.Limits(
                max_keepalive_connections=5,
                max_connections=10,
                keepalive_expiry=30.0
            )

            self._client = httpx.AsyncClient(
                base_url=self.api_base,
                timeout=self.timeout,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                },
                limits=limits,
                http2=True  # Enable HTTP/2
            )

        return self._client

    async def __aenter__(self):
        """Context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.close()
        return False

    def _create_system_prompt(self) -> str:
        """Create system prompt for your use case."""
        return """You are an AI assistant. Respond with structured JSON."""

    def _create_user_prompt(
        self,
        query: str,
        context: Dict[str, Any]
    ) -> str:
        """Create user prompt with context."""
        return f"Task: {query}\n\nContext: {json.dumps(context, indent=2)}"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def infer(self, request: LLMInferenceRequest) -> LLMInferenceResponse:
        """
        Execute LLM inference using Open Arena workflow API.

        Args:
            request: Structured inference request

        Returns:
            Parsed LLM response
        """
        start_time = time.time()

        try:
            # Extract parameters
            model_params = request.model_params or {}
            model = model_params.get("model", self.default_model)
            workflow_id = model_params.get("workflow_id", self.default_workflow_id)

            # Build prompts
            system_prompt = self._create_system_prompt()
            user_prompt = self._create_user_prompt(request.query, request.context)
            combined_query = f"{system_prompt}\n\n{user_prompt}"

            # Open Arena API payload
            payload = {
                "workflow_id": workflow_id,
                "query": combined_query,
                "is_persistence_allowed": False,
                "modelparams": {
                    model: {
                        "temperature": str(model_params.get("temperature", 0.1)),
                        "max_tokens": str(model_params.get("max_tokens", 4000)),
                        "system_prompt": system_prompt
                    }
                }
            }

            # Make API request
            response = await self.client.post("/v1/inference", json=payload)
            response.raise_for_status()

            # Parse response
            response_data = response.json()
            result_data = response_data.get("result", {})

            # Extract content from Open Arena response structure
            # Open Arena format: result.answer[model_name]
            raw_content = ""
            if isinstance(result_data, dict):
                answer_data = result_data.get("answer", {})
                if isinstance(answer_data, dict):
                    # Try to find model response
                    raw_content = answer_data.get(model, "")
                    if not raw_content:
                        # Fallback to first available value
                        raw_content = next(iter(answer_data.values()), "")

            if not isinstance(raw_content, str):
                raw_content = str(raw_content)

            inference_time = time.time() - start_time
            tokens_used = response_data.get("tokens_used", 0)

            # Update statistics
            self.total_tokens += tokens_used
            self.request_count += 1

            # Parse structured response
            agent_action = AgentAction.parse_from_text(raw_content)

            if agent_action:
                return LLMInferenceResponse(
                    success=True,
                    response=agent_action,
                    raw_content=raw_content,
                    tokens_used=tokens_used,
                    inference_time=inference_time,
                    model_used=model,
                    error_message=None
                )
            else:
                return LLMInferenceResponse(
                    success=False,
                    response=None,
                    raw_content=raw_content,
                    tokens_used=tokens_used,
                    inference_time=inference_time,
                    model_used=model,
                    error_message="No valid AgentAction found in response"
                )

        except httpx.HTTPStatusError as e:
            self.error_count += 1
            inference_time = time.time() - start_time

            if e.response.status_code == 401:
                raise AuthenticationError(f"Authentication failed: {str(e)}")
            elif e.response.status_code == 429:
                raise RateLimitError(f"Rate limit exceeded: {str(e)}")
            else:
                return LLMInferenceResponse(
                    success=False,
                    response=None,
                    raw_content="",
                    tokens_used=0,
                    inference_time=inference_time,
                    model_used=model or self.default_model,
                    error_message=f"HTTP {e.response.status_code}: {str(e)}"
                )

        except Exception as e:
            self.error_count += 1
            inference_time = time.time() - start_time

            return LLMInferenceResponse(
                success=False,
                response=None,
                raw_content="",
                tokens_used=0,
                inference_time=inference_time,
                model_used=model or self.default_model,
                error_message=str(e)
            )

    async def health_check(self) -> bool:
        """Verify API connectivity and authentication."""
        try:
            response = await self.client.get("/v2/workflow?show_all=true")
            response.raise_for_status()
            return True
        except Exception:
            return False

    async def close(self):
        """Close HTTP client and cleanup resources."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get client usage statistics."""
        return {
            "total_tokens": self.total_tokens,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1)
        }
```

---

## 6. Usage Examples

### 6.1 Basic Usage

```python
import asyncio
from agent.client import OpenArenaClient
from agent.schemas import LLMInferenceRequest


async def main():
    # Initialize client (reads from environment variables)
    async with OpenArenaClient() as client:
        # Check connectivity
        if await client.health_check():
            print("✓ Connected to Open Arena")
        else:
            print("✗ Connection failed")
            return

        # Create inference request
        request = LLMInferenceRequest(
            query="Analyze this XML validation error",
            context={
                "error_summary": "Missing required field: Invoice/ID",
                "xml_context": "<Invoice>...</Invoice>"
            },
            model_params={
                "model": "claude-sonnet-4",
                "temperature": 0.1,
                "max_tokens": 4000
            }
        )

        # Execute inference
        response = await client.infer(request)

        if response.success:
            print(f"Action: {response.response.action}")
            print(f"Confidence: {response.response.confidence}")
            print(f"Reasoning: {response.response.reasoning}")
        else:
            print(f"Error: {response.error_message}")

        # Get usage stats
        stats = client.get_usage_stats()
        print(f"Tokens used: {stats['total_tokens']}")


if __name__ == "__main__":
    asyncio.run(main())
```

### 6.2 Advanced Usage with Error Handling

```python
from agent.client import OpenArenaClient, AuthenticationError, RateLimitError


async def run_with_error_handling():
    try:
        async with OpenArenaClient(timeout=120) as client:
            request = LLMInferenceRequest(
                query="Your task here",
                context={"data": "your context"}
            )

            response = await client.infer(request)

            if response.success:
                # Process successful response
                action = response.response
                print(f"Action: {action.action}")
                print(f"Next steps: {action.next_steps}")
            else:
                # Handle inference failure
                print(f"Inference failed: {response.error_message}")

    except AuthenticationError as e:
        print(f"Authentication error: {e}")
        print("Check your OPEN_ARENA_TOKEN")

    except RateLimitError as e:
        print(f"Rate limit exceeded: {e}")
        print("Wait and retry")

    except Exception as e:
        print(f"Unexpected error: {e}")
```

---

## 7. Open Arena Workflow Configuration

### 7.1 Create Workflow in Open Arena Dashboard

1. Log into Open Arena: https://aiopenarena.gcs.int.thomsonreuters.com
2. Navigate to **Workflows**
3. Create new workflow with these components:
   - **LLM Component:** Claude Sonnet 4 or GPT-4 Turbo
   - **Input:** Query string
   - **Output:** Model response
4. Save and note the **Workflow ID**
5. Add Workflow ID to your `.env` file

### 7.2 Workflow Response Structure

Open Arena returns responses in this format:

```json
{
  "result": {
    "answer": {
      "claude-sonnet-4": "Your model response here",
      "llm_LLM_task": "Alternative key for response"
    },
    "metadata": {
      "workflow_id": "...",
      "execution_time": 1.23
    }
  },
  "tokens_used": 500
}
```

The client automatically extracts the content from `result.answer[model_name]`.

---

## 8. Testing

### 8.1 Test Configuration

```python
import asyncio
from agent.client import OpenArenaClient


async def test_connection():
    """Test Open Arena connection."""
    try:
        async with OpenArenaClient() as client:
            # Test health check
            healthy = await client.health_check()
            print(f"Health check: {'PASS' if healthy else 'FAIL'}")

            # Test inference
            from agent.schemas import LLMInferenceRequest
            request = LLMInferenceRequest(
                query="Say hello",
                context={}
            )

            response = await client.infer(request)
            print(f"Inference: {'PASS' if response.success else 'FAIL'}")

            if response.success:
                print(f"Response: {response.raw_content[:100]}")
            else:
                print(f"Error: {response.error_message}")

    except Exception as e:
        print(f"Test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_connection())
```

### 8.2 Run Tests

```bash
# Test connection
python test_connection.py

# Expected output:
# Health check: PASS
# Inference: PASS
# Response: {...}
```

---

## 9. Security Best Practices

### 9.1 Environment Variables

- **Never commit `.env` to version control**
- Add `.env` to `.gitignore`
- Use separate tokens for dev/prod environments
- Rotate tokens regularly

### 9.2 Token Management

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
echo ".env.*" >> .gitignore
```

### 9.3 Example `.env.template`

Create this file to document required variables (safe to commit):

```bash
# Open Arena Configuration Template
# Copy to .env and fill in your actual values

OPEN_ARENA_TOKEN=your_esso_token_here
OPEN_ARENA_WORKFLOW_ID=your_workflow_id_here
OPEN_ARENA_BASE_URL=https://aiopenarena.gcs.int.thomsonreuters.com
OPEN_ARENA_MODEL=claude-sonnet-4

AGENT_MAX_ITERATIONS=3
AGENT_TIMEOUT=60
```

---

## 10. Troubleshooting

### Common Issues

#### 1. Authentication Error (401)
```
AuthenticationError: Authentication failed
```
**Solution:** Check your ESSO token is valid and not expired

#### 2. Workflow Not Found (404)
```
HTTP 404: Workflow not found
```
**Solution:** Verify OPEN_ARENA_WORKFLOW_ID is correct

#### 3. Connection Timeout
```
TimeoutException: Request timed out
```
**Solution:**
- Check network connectivity to TR internal network
- Increase timeout: `OpenArenaClient(timeout=120)`

#### 4. Rate Limit (429)
```
RateLimitError: Rate limit exceeded
```
**Solution:** Implement exponential backoff (already built into client)

#### 5. Invalid Response Format
```
No valid AgentAction found in response
```
**Solution:** Check your system prompt instructs the model to return valid JSON

### Debug Mode

Enable detailed logging:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("agent.client")
logger.setLevel(logging.DEBUG)
```

---

## 11. Key Features

### Connection Pooling
- HTTP/2 enabled for better performance
- Persistent connections (max 5 keepalive)
- Automatic connection reuse

### Retry Logic
- 3 retry attempts with exponential backoff
- Waits 4s, 8s, 10s between retries
- Automatic handling of transient failures

### Structured Responses
- Pydantic models ensure type safety
- Automatic JSON parsing from LLM responses
- Handles markdown code blocks and plain JSON

### Usage Tracking
- Tracks tokens, requests, and errors
- Provides usage statistics
- Enables cost monitoring

---

## 12. Reference Implementation

The complete working implementation can be found at:

```
C:\Users\6134505\code\knowledge-library-agent\
├── mcp_servers\xml_troubleshooter\
│   ├── config.py                    # Lines 84-102: Open Arena config
│   └── agent\
│       ├── client.py                # Lines 47-472: Complete client
│       └── schemas.py               # Lines 1-210: Data models
```

Key files:
- **Configuration:** `config.py:84-102`
- **Client Implementation:** `client.py:47-472`
- **Request/Response Models:** `schemas.py:186-210`
- **API Endpoint:** `/v1/inference`
- **Health Check Endpoint:** `/v2/workflow?show_all=true`

---

## 13. Quick Start Checklist

- [ ] Install Python 3.11+
- [ ] Install dependencies from requirements.txt
- [ ] Obtain Thomson Reuters ESSO token
- [ ] Create workflow in Open Arena dashboard
- [ ] Copy workflow ID
- [ ] Create `.env` file with credentials
- [ ] Copy `config.py`, `client.py`, and `schemas.py` files
- [ ] Run test connection script
- [ ] Verify health check passes
- [ ] Make test inference request
- [ ] Check usage statistics

---

## Questions or Issues?

Contact Thomson Reuters Open Arena support or refer to the internal documentation at:
https://aiopenarena.gcs.int.thomsonreuters.com/docs

---

**Document Version:** 1.0
**Last Updated:** December 2025
**Based on:** knowledge-library-agent implementation
