from __future__ import annotations

import os

from openai import OpenAI


def get_openai_client() -> OpenAI:
    api_key = (
        os.environ.get('ALIYUN_API_KEY')
        or os.environ.get('DASHSCOPE_API_KEY')
        or os.environ.get('AI_CBDES_ALIYUN_API_KEY')
    )
    if not api_key:
        raise RuntimeError('missing_aliyun_api_key')

    base_url = os.environ.get('AI_CBDES_ALIYUN_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
    return OpenAI(api_key=api_key, base_url=base_url)


def get_embedding_model() -> str:
    return os.environ.get('AI_CBDES_ALIYUN_EMBED_MODEL', 'text-embedding-v4')


def get_chat_model() -> str:
    return os.environ.get('AI_CBDES_ALIYUN_CHAT_MODEL', 'glm-4.7')
