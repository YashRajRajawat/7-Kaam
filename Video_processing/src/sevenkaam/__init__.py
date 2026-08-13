"""7Kaam Practical Skill Verification and Trust Engine (deterministic prototype).

Import-light on purpose: nothing here pulls in FastAPI, OpenCV, or anything
network-capable, so `import sevenkaam` stays cheap and the offline boundary
test can walk the package without side effects.
"""

from sevenkaam.version import ENGINE_VERSION, RULE_VERSION, SCHEMA_VERSION

__all__ = ["ENGINE_VERSION", "RULE_VERSION", "SCHEMA_VERSION"]
