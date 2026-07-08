"""Environment configuration. Loads .env once at import."""

import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
from pymongo import MongoClient
from pymongo.collection import Collection

load_dotenv()


@lru_cache
def get_chat_model() -> AzureChatOpenAI:
    return AzureChatOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        azure_deployment=os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-5-mini"),
        # GPT-5 family models only accept the default temperature
    )


@lru_cache
def get_embeddings() -> AzureOpenAIEmbeddings:
    return AzureOpenAIEmbeddings(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        azure_deployment=os.environ.get(
            "AZURE_OPENAI_EMBED_DEPLOYMENT", "text-embedding-3-small"
        ),
    )


@lru_cache
def get_rules_collection() -> Collection:
    client = MongoClient(os.environ["MONGODB_URI"])
    return client["contractguard"]["rules"]
