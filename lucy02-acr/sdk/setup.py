from setuptools import setup, find_packages

setup(
    name="lucy02-sdk",
    version="0.1.0",
    description="Lucy02 Agent Control Room SDK",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "httpx>=0.27.0",
        "pydantic>=2.0.0",
    ],
    extras_require={
        "langchain": ["langchain>=0.3.0"],
        "openai": ["openai>=1.0.0"],
        "anthropic": ["anthropic>=0.36.0"],
    },
)
