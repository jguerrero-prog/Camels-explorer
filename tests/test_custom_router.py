"""Real unit test for api/routers/custom.py's error-handling - a
FlathubError used to be re-raised with the raw underlying exception text
embedded directly in the client-facing HTTPException detail (leaking
internal detail like urllib error text/hostnames). Verifies the fix:
the client-facing detail is now one fixed, generic message regardless of
what the real underlying error says.
"""

import pytest
from fastapi import HTTPException

import flathub_client as F
from api.routers import custom


def _raise_flathub_error(*_args, **_kwargs):
    raise F.FlathubError("Connection to internal-host-10-0-0-5 refused")


class TestCustomCountErrorHandling:
    def test_flathub_error_detail_is_generic_not_the_raw_message(self, monkeypatch):
        monkeypatch.setattr(F, "real_fields", lambda: [])
        monkeypatch.setattr(F, "count", _raise_flathub_error)

        with pytest.raises(HTTPException) as exc_info:
            custom.custom_count(filters=None)

        assert exc_info.value.status_code == 502
        assert "internal-host-10-0-0-5" not in exc_info.value.detail
        assert exc_info.value.detail == custom._FLATHUB_ERROR_DETAIL


class TestCustomDataErrorHandling:
    def test_flathub_error_detail_is_generic_not_the_raw_message(self, monkeypatch):
        # A real field name, so this exercises the FlathubError path, not
        # the separate "Unknown field" validation added alongside this fix.
        monkeypatch.setattr(F, "real_fields", lambda: [{"name": "params_Omega_m"}])
        monkeypatch.setattr(F, "data", _raise_flathub_error)

        with pytest.raises(HTTPException) as exc_info:
            custom.custom_data(fields="params_Omega_m", filters=None, limit=100)

        assert exc_info.value.status_code == 502
        assert "internal-host-10-0-0-5" not in exc_info.value.detail


class TestCustomDataFieldValidation:
    def test_unknown_field_name_gets_a_clean_400(self, monkeypatch):
        # Real fix (2026-08-06, code-quality audit): `fields` used to pass
        # straight through to FlatHUB unvalidated, unlike `filters` (whose
        # keys were already checked against the real schema).
        monkeypatch.setattr(F, "real_fields", lambda: [{"name": "params_Omega_m"}])

        with pytest.raises(HTTPException) as exc_info:
            custom.custom_data(fields="params_Omega_m,not_a_real_field", filters=None, limit=100)

        assert exc_info.value.status_code == 400
        assert "not_a_real_field" in exc_info.value.detail

    def test_known_field_names_pass_through_to_flathub(self, monkeypatch):
        monkeypatch.setattr(F, "real_fields", lambda: [{"name": "params_Omega_m"}])
        monkeypatch.setattr(F, "data", lambda fields, filters, limit: {"fields": fields, "limit": limit})

        result = custom.custom_data(fields="params_Omega_m", filters=None, limit=100)
        assert result == {"fields": ["params_Omega_m"], "limit": 100}


class TestCustomHistogramErrorHandling:
    def test_flathub_error_detail_is_generic_not_the_raw_message(self, monkeypatch):
        monkeypatch.setattr(F, "real_fields", lambda: [])
        monkeypatch.setattr(F, "histogram", _raise_flathub_error)

        with pytest.raises(HTTPException) as exc_info:
            custom.custom_histogram(fields='[{"field": "params_Omega_m"}]', filters=None, quartiles=None)

        assert exc_info.value.status_code == 502
        assert "internal-host-10-0-0-5" not in exc_info.value.detail
