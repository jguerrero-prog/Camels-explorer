"""Real unit tests for api/deps.py's shared helpers."""

import pytest
from fastapi import HTTPException

from api.deps import require, resolved_set_name


class TestRequire:
    def test_none_raises_404(self):
        with pytest.raises(HTTPException) as exc_info:
            require(None)
        assert exc_info.value.status_code == 404

    def test_non_none_value_passes_through_unchanged(self):
        assert require(42) == 42
        assert require("x") == "x"
        assert require([1, 2]) == [1, 2]

    def test_falsy_but_non_none_values_pass_through(self):
        # Only None means "no data" - an empty list/0/False are real,
        # legitimate values that should NOT 404.
        assert require(0) == 0
        assert require([]) == []
        assert require(False) is False


class TestResolvedSetName:
    def test_delegates_to_backend_resolve_set_name(self):
        assert resolved_set_name("IllustrisTNG", "SB") == "SB28"
        assert resolved_set_name("IllustrisTNG", "LH") == "LH"
