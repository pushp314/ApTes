from setuptools import setup, find_packages

setup(
    name="sentinel-security",
    version="0.1.0",
    description="Zero-dependency security assessment, reconnaissance, and pentest toolkit",
    author="Sentinel Team",
    packages=find_packages(),
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "sentinel-py=sentinel:main",
            "sentinel-pentest=sentinel:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Security",
    ],
)
