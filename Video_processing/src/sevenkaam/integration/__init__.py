"""Platform integration.

THIS IS THE ONLY PACKAGE PERMITTED TO IMPORT httpx, socket, or any other
network-capable module. tests/test_offline_boundary.py AST-walks every other
module in the package and fails if that rule is broken.

Keeping the boundary structural rather than a scattering of `if offline:` checks
is what lets the whole test suite run with no credentials and no network.
"""
