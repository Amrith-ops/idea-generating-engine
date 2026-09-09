import os
import json
import logging
from typing import Dict, Any, Optional, List, Callable

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

class BaseAgent:
    """
    Base Agent class providing structured JSON reasoning, multi-model fallback,
    and anti-hallucination grounding across all specialized agents.
    """

    def __init__(self, name: str, role_description: str, api_key: Optional[str] = None):
        self.name = name
        self.role_description = role_description
        self.logger = logging.getLogger(self.name)
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.client = None
        
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.logger.info(f"Agent '{self.name}' initialized successfully with Gemini SDK.")
            except Exception as e:
                self.logger.warning(f"Could not initialize GenAI Client for '{self.name}': {e}")

    def run_prompt_with_fallback(
        self,
        prompt: str,
        fallback_data_fn: Optional[Callable[[], Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Executes a prompt across resilient Gemini model fallbacks and returns parsed JSON.
        """
        models_to_try = ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-3.5-flash"]
        
        if self.client:
            for model_name in models_to_try:
                try:
                    self.logger.info(f"Agent '{self.name}' executing task using model: {model_name}...")
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={"response_mime_type": "application/json"}
                    )
                    parsed = json.loads(response.text)
                    self.logger.info(f"Agent '{self.name}' successfully completed reasoning step.")
                    return parsed
                except Exception as e:
                    self.logger.warning(f"Agent '{self.name}' model {model_name} encountered error: {e}. Trying fallback...")

        if fallback_data_fn:
            self.logger.info(f"Agent '{self.name}' activating deterministic fallback heuristic.")
            return fallback_data_fn()

        self.logger.error(f"Agent '{self.name}' failed all model fallbacks with no deterministic fallback provided.")
        return {}
