"""Real unit tests for backend.py's pure, I/O-free helpers.

Deliberately scoped to functions that need no network/HDF5 access - most of
backend.py's get_*/render_* functions fetch real data over HTTP and aren't
good unit-test candidates without mocking, which this project's real-data
discipline (no fabricated data shown to users) makes unappealing to reach
for. These are the exceptions: pure logic with no I/O, chosen from a direct
read of backend.py, not guessed.
"""

import numpy as np
import pytest

import backend as B


class TestResolveSetName:
    def test_sb_resolves_to_real_per_suite_folder(self):
        assert B.resolve_set_name("IllustrisTNG", "SB") == "SB28"
        assert B.resolve_set_name("Astrid", "SB") == "SB7"

    def test_sb_on_unsupported_suite_stays_literal(self):
        # SIMBA/Swift-EAGLE have no real SB set - resolve_set_name's own
        # docstring says this is deliberate so the real fetch 404s honestly
        # instead of guessing a folder name that doesn't exist.
        assert B.resolve_set_name("SIMBA", "SB") == "SB"

    def test_non_sb_set_names_are_a_no_op(self):
        for set_name in ("LH", "CV", "1P", "EX"):
            assert B.resolve_set_name("IllustrisTNG", set_name) == set_name


class TestOnepRealizationId:
    def test_known_variations_format_correctly(self):
        assert B.onep_realization_id(11, 2) == "p11_2"
        assert B.onep_realization_id(3, -2) == "p3_n2"
        assert B.onep_realization_id(1, 0) == "p1_0"

    def test_unknown_variation_raises(self):
        # ONEP_VARIATION_SUFFIX only has -2..2 - anything else is a real
        # caller bug, not a value this function should silently accept.
        with pytest.raises(KeyError):
            B.onep_realization_id(1, 3)


class TestSeed:
    def test_same_inputs_are_deterministic(self):
        assert B._seed("IllustrisTNG", "LH", 3, 10) == B._seed("IllustrisTNG", "LH", 3, 10)

    def test_different_inputs_differ(self):
        assert B._seed("IllustrisTNG", "LH", 3, 10) != B._seed("IllustrisTNG", "LH", 4, 10)


class TestSnapshotToRedshift:
    def test_last_snapshot_is_z0(self):
        assert B._snapshot_to_redshift(B.N_SNAPSHOTS - 1) == pytest.approx(0.0)

    def test_matches_the_table_directly(self):
        assert B._snapshot_to_redshift(0) == B.SNAPSHOT_REDSHIFTS[0]


class TestParseIndexedHeader:
    def test_strips_trailing_index_and_leading_hash(self):
        assert B._parse_indexed_header("#Mvir(1) Rvir(2) Vmax(3)") == ["Mvir", "Rvir", "Vmax"]

    def test_tokens_without_index_pass_through_unchanged(self):
        assert B._parse_indexed_header("#ID Mvir(1)") == ["ID", "Mvir"]


class TestRealDataLookupTables:
    """Regression tests for hand-confirmed facts encoded as module-level
    lookup tables - these aren't functions, but a silent edit to either
    dict (e.g. someone "fixing" what looks like an inconsistency) would be
    a real, silent regression with no other test catching it."""

    def test_profiles_field_index_has_the_four_real_fields(self):
        assert set(B.PROFILES_FIELD_INDEX) == {"Gas Density", "Thermal Pressure", "Metallicity", "Temperature"}

    def test_cmd_mass_type_fields_are_exactly_the_four_mass_fields(self):
        assert B.CMD_MASS_TYPE_FIELDS == {"Mtot", "Mgas", "Mcdm", "Mstar"}
        assert "Temperature" not in B.CMD_MASS_TYPE_FIELDS


class TestPngRenderConcurrency:
    """Real regression test for the matplotlib thread-safety bug found and
    fixed in this same pass (render_field_map_2d_png and 7 other
    render_*_png functions were rewritten to use Figure/FigureCanvasAgg +
    _PNG_RENDER_LOCK instead of plt.subplots()/plt.close(), after
    confirming concurrent requests to the unfixed functions failed ~8/9 of
    the time). Builds a real, hand-constructed Result (no fetch) and drives
    it through the exact render path multiple statistics share
    (_render_result_png -> _finish_png), from real concurrent threads - a
    fake-data-but-real-code-path test, not an end-to-end network test."""

    def _fake_result(self, seed):
        x = np.linspace(1.0, 10.0, 20)
        return B.Result(x=x, y=x ** 2 + seed, x_label="x", y_label="y", log_x=False, log_y=False)

    def test_single_render_produces_valid_png_bytes(self):
        png = B._render_result_png(lambda r: self._fake_result(r), "LH", [0])
        assert png is not None
        assert png.startswith(b"\x89PNG\r\n\x1a\n")

    def test_no_data_returns_none(self):
        assert B._render_result_png(lambda r: None, "LH", [0, 1, 2]) is None

    def test_concurrent_renders_all_succeed(self):
        import concurrent.futures

        def render_one(i):
            return B._render_result_png(lambda r: self._fake_result(r), "LH", [i])

        with concurrent.futures.ThreadPoolExecutor(max_workers=9) as pool:
            results = list(pool.map(render_one, range(9)))

        assert len(results) == 9
        for png in results:
            assert png is not None
            assert png.startswith(b"\x89PNG\r\n\x1a\n")
