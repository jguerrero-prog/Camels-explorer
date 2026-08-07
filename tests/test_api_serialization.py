"""Real unit tests for api/serialization.py's to_jsonable() - the single
funnel every router's return value passes through before becoming an HTTP
response. Fully pure (no I/O), and the highest-value test candidate in the
API layer since a silent regression here would corrupt every endpoint's
response shape at once.
"""

import math

import numpy as np
import pandas as pd
import pytest

import backend as B
from api.serialization import to_jsonable


class TestScalars:
    def test_none_bool_str_int_pass_through(self):
        assert to_jsonable(None) is None
        assert to_jsonable(True) is True
        assert to_jsonable("x") == "x"
        assert to_jsonable(3) == 3

    def test_finite_float_passes_through(self):
        assert to_jsonable(1.5) == 1.5

    def test_nan_and_inf_become_none(self):
        # JSON has no NaN/Infinity token - json.dumps would emit the
        # non-standard literals, which a frontend's JSON.parse() throws on.
        assert to_jsonable(float("nan")) is None
        assert to_jsonable(float("inf")) is None
        assert to_jsonable(float("-inf")) is None


class TestNumpyScalars:
    def test_numpy_float_converts_and_respects_nan_rule(self):
        assert to_jsonable(np.float64(2.5)) == 2.5
        assert to_jsonable(np.float64("nan")) is None

    def test_numpy_int_converts_to_native_int(self):
        result = to_jsonable(np.int64(7))
        assert result == 7
        assert isinstance(result, int)

    def test_numpy_bool_converts_to_native_bool(self):
        result = to_jsonable(np.bool_(True))
        assert result is True


class TestContainers:
    def test_ndarray_becomes_list(self):
        assert to_jsonable(np.array([1.0, 2.0, float("nan")])) == [1.0, 2.0, None]

    def test_dict_keys_stringified_and_values_recursed(self):
        assert to_jsonable({1: float("nan"), "b": 2}) == {"1": None, "b": 2}

    def test_list_and_tuple_recurse(self):
        assert to_jsonable([1, (2, float("nan"))]) == [1, [2, None]]


class TestDataclass:
    def test_result_dataclass_becomes_field_dict(self):
        result = B.Result(x=np.array([1.0]), y=np.array([2.0]), x_label="x", y_label="y")
        out = to_jsonable(result)
        assert out == {
            "x": [1.0], "y": [2.0], "x_label": "x", "y_label": "y",
            "log_x": True, "log_y": True, "source": "real", "note": "",
        }


class TestDataFrame:
    def test_nan_rows_become_none_records(self):
        df = pd.DataFrame({"a": [1, math.nan], "b": [3, 4]})
        assert to_jsonable(df) == [{"a": 1.0, "b": 3}, {"a": None, "b": 4}]


class TestUnhandledType:
    def test_unknown_type_raises_typeerror(self):
        # Deliberate: a future dataclass field of an unhandled type should
        # fail loudly during development, not silently emit something a
        # frontend can't parse.
        with pytest.raises(TypeError):
            to_jsonable({1, 2, 3})
