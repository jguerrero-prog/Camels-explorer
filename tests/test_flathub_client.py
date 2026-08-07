"""Real unit tests for flathub_client.py's pure, network-free helpers."""

from flathub_client import _flatten_fields, range_filter


class TestFlattenFields:
    def test_leaf_fields_pass_through_unchanged(self):
        fields = [{"name": "params_Omega_m"}, {"name": "snapshot"}]
        assert _flatten_fields(fields) == fields

    def test_nested_sub_fields_flatten_without_reprefixing(self):
        # Real bug this guards against (see the function's own docstring):
        # an earlier version re-prefixed sub-fields and produced bogus
        # double-qualified names like "params_params_Omega_m".
        fields = [
            {"name": "Group_CM", "sub": [{"name": "Group_CM_x"}, {"name": "Group_CM_y"}]},
            {"name": "snapshot"},
        ]
        result = _flatten_fields(fields)
        assert result == [{"name": "Group_CM_x"}, {"name": "Group_CM_y"}, {"name": "snapshot"}]

    def test_deeply_nested_fields_flatten_recursively(self):
        fields = [{"name": "a", "sub": [{"name": "b", "sub": [{"name": "c"}]}]}]
        assert _flatten_fields(fields) == [{"name": "c"}]


class TestRangeFilter:
    def test_no_bounds_gives_empty_dict(self):
        assert range_filter() == {}

    def test_only_gte(self):
        assert range_filter(gte=1.5) == {"gte": 1.5}

    def test_only_lte(self):
        assert range_filter(lte=2.5) == {"lte": 2.5}

    def test_both_bounds(self):
        assert range_filter(gte=1.0, lte=2.0) == {"gte": 1.0, "lte": 2.0}
