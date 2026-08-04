"""Generic JSON serialization for backend.py's return types.

backend.py's ~24 get_* functions return a handful of shapes: dataclasses
(Result, Field3D, Catalog, ...), plain dicts, numpy arrays, pandas
DataFrames, or None - and dataclass fields nest all of the above. Rather
than hand-writing per-endpoint serialization (24x drift risk, e.g. someone
adds a field to Catalog and three endpoints silently keep the old shape),
every router funnels its backend call's return value through to_jsonable()
once. One place to get right, one place to fix if a new field type shows up.

This module has no knowledge of what a Result or a Catalog *means* - it only
knows how to walk dataclass/DataFrame/ndarray/dict/list structure into plain
JSON-safe Python. Domain meaning stays entirely in backend.py.
"""

from __future__ import annotations

import dataclasses
import math

import numpy as np
import pandas as pd


def to_jsonable(obj):
    """Recursively convert a backend.py return value into JSON-safe Python.

    NaN/Inf become None (JSON has no representation for them) rather than
    the non-standard `NaN`/`Infinity` tokens Python's json module would
    otherwise emit - a frontend calling JSON.parse() on those would throw.
    """
    if obj is None or isinstance(obj, (bool, str, int)):
        return obj
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None

    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {f.name: to_jsonable(getattr(obj, f.name)) for f in dataclasses.fields(obj)}

    if isinstance(obj, np.ndarray):
        return to_jsonable(obj.tolist())
    if isinstance(obj, (np.floating,)):
        return to_jsonable(float(obj))
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)

    if isinstance(obj, pd.DataFrame):
        # NaN -> None before to_dict, or NaN survives as float('nan') inside
        # the records and breaks JSON encoding the same way a raw numpy NaN would.
        return to_jsonable(obj.where(pd.notna(obj), None).to_dict(orient="records"))

    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(v) for v in obj]

    # Fallback for anything unanticipated (e.g. a future dataclass field of a
    # type this function doesn't know yet) - fail loudly during development
    # rather than silently emit something a frontend can't parse.
    raise TypeError(f"to_jsonable: no handler for {type(obj)!r}")
