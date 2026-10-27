from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx

from ..core.config import settings


class GroqClient:
    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.groq_api_key
        self.api_url = api_url or settings.groq_api_url
        self.model = model or settings.groq_model

    async def ask(self, prompt: str, temperature: float = 0.2, max_output_tokens: int = 1024) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("Groq API key is not configured.")

        payload = {
            "model": self.model,
            "input": prompt,
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()


def extract_groq_answer(payload: dict[str, Any]) -> str:
    output = payload.get("output")
    if isinstance(output, list):
        for item in output:
            if isinstance(item, dict) and item.get("type") == "message":
                content = item.get("content")
                if isinstance(content, list):
                    parts = []
                    for chunk in content:
                        if isinstance(chunk, dict):
                            text = chunk.get("text") or chunk.get("value")
                            if isinstance(text, str) and text.strip():
                                parts.append(text.strip())
                    if parts:
                        return "\n\n".join(parts).strip()
                if isinstance(content, str) and content.strip():
                    return content.strip()
    alt = payload.get("output_text") or payload.get("text")
    if isinstance(alt, str) and alt.strip():
        return alt.strip()
    return ""
