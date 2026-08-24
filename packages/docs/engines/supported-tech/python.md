# Python Support

Sentinel parses Python codebases using the `tree-sitter-python` grammar, allowing for extremely fast, non-executing static analysis.

## Frameworks Analyzed

- **Django**: Analyzes `views.py` and `models.py` to ensure proper ORM usage and CSRF protections are in place.
- **FastAPI**: Traces Pydantic schemas and dependency injections for logic flaws.
- **Flask**: Tracks `@app.route()` decorators and `request.args` inputs.

## AI & Data Science (Specialized)

Because Python is heavily used in AI and data science, Sentinel includes specialized rules for:

1. **Pickle Deserialization**: Flags unsafe `pickle.loads()` usage.
2. **LangChain Prompts**: Analyzes hardcoded prompt templates for injection vulnerabilities.
3. **Jupyter Notebooks**: Experimental support for parsing `.ipynb` files to detect exposed API keys and credentials.
