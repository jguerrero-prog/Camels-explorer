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


def _fits_card(keyword, value, comment=None):
    body = f"{value} / {comment}" if comment else str(value)
    card = f"{keyword:<8}= {body}"
    return card[:80].ljust(80)


def _fits_block(cards):
    text = "".join(c[:80].ljust(80) for c in cards)
    return text.ljust(B.FITS_BLOCK_BYTES)[:B.FITS_BLOCK_BYTES].encode("ascii")


def _real_phlist_header_bytes():
    """Synthetic bytes matching this app's own real, direct-fetch-confirmed
    phlist.fits layout (2026-08-07, issue #18): Primary HDU (1 block, empty)
    + BINTABLE extension (1 block, 3 columns: ENERGY float32, RA float64,
    DEC float64 - 20 real bytes/row)."""
    primary = _fits_block([
        f"{'SIMPLE':<8}=                    T",
        f"{'BITPIX':<8}=                    8",
        f"{'NAXIS':<8}=                    0",
        f"{'EXTEND':<8}=                    T",
        f"{'END':<80}",
    ])
    ext = _fits_block([
        _fits_card("XTENSION", "'BINTABLE'"),
        _fits_card("NAXIS1", "20"),
        _fits_card("NAXIS2", "25853"),
        _fits_card("TFIELDS", "3"),
        _fits_card("TTYPE1", "'ENERGY  '"),
        _fits_card("TFORM1", "'E       '"),
        _fits_card("TTYPE2", "'RA      '"),
        _fits_card("TFORM2", "'D       '"),
        _fits_card("TTYPE3", "'DEC     '"),
        _fits_card("TFORM3", "'D       '"),
        _fits_card("HDUCLASS", "'HEASARC/SIMPUT'"),  # real embedded-slash value, see _fits_card_value
        _fits_card("REFRA", "0.0"),
        _fits_card("REFDEC", "0.0"),
        f"{'END':<80}",
    ])
    return primary + ext


class TestFitsBinTableLayout:
    def test_real_phlist_layout_parses_correctly(self):
        layout = B._read_fits_bintable_layout(_real_phlist_header_bytes())
        assert layout is not None
        assert layout["data_start"] == 2 * B.FITS_BLOCK_BYTES
        assert layout["row_bytes"] == 20
        assert layout["n_rows"] == 25853
        assert layout["ref_ra"] == 0.0 and layout["ref_dec"] == 0.0
        assert layout["row_dtype"].names == ("ENERGY", "RA", "DEC")
        assert layout["row_dtype"].itemsize == 20

    def test_embedded_slash_in_quoted_value_is_not_treated_as_a_comment(self):
        # HDUCLASS = 'HEASARC/SIMPUT' is real (this app's own phlist.fits
        # files) - a naive split on the first "/" would truncate this to
        # "HEASARC", which _fits_card_value must not do.
        card = _fits_card("HDUCLASS", "'HEASARC/SIMPUT'").ljust(80)
        assert B._fits_card_value(card) == "HEASARC/SIMPUT"

    def test_missing_end_card_within_fetched_bytes_returns_none(self):
        # Simulates fetching too few header bytes (a real risk this app
        # guards against by fetching 4 blocks up front) - no truncation
        # should ever be silently treated as a valid layout.
        truncated = _real_phlist_header_bytes()[:B.FITS_BLOCK_BYTES + 80]
        assert B._read_fits_bintable_layout(truncated) is None

    def test_non_bintable_extension_returns_none(self):
        primary = _fits_block([f"{'SIMPLE':<8}=                    T", f"{'NAXIS':<8}=                    0", f"{'END':<80}"])
        ext = _fits_block([_fits_card("XTENSION", "'IMAGE   '"), f"{'END':<80}"])
        assert B._read_fits_bintable_layout(primary + ext) is None

    def test_unrecognized_tform_code_returns_none(self):
        primary = _fits_block([f"{'SIMPLE':<8}=                    T", f"{'NAXIS':<8}=                    0", f"{'END':<80}"])
        ext = _fits_block([
            _fits_card("XTENSION", "'BINTABLE'"), _fits_card("NAXIS1", "20"),
            _fits_card("NAXIS2", "1"), _fits_card("TFIELDS", "1"),
            _fits_card("TTYPE1", "'WEIRD   '"), _fits_card("TFORM1", "'P       '"),  # real
            # code this app doesn't handle (variable-length array descriptor)
            f"{'END':<80}",
        ])
        assert B._read_fits_bintable_layout(primary + ext) is None


class TestProfilesOnepFlatIndex:
    """Real, direct-fetch-confirmed formula (issue #26): Profiles' 1P
    files embed a flat 0-65 index (param-major, variation -5..5), not the
    (param, variation) pair the real folder name itself uses."""

    def test_matches_real_confirmed_cases(self):
        # Each of these was independently confirmed against a real file
        # listing (2 suites) before trusting the formula.
        cases = [(1, -2, 3), (1, 0, 5), (2, 3, 19), (6, -5, 55), (4, 2, 40), (3, -3, 24), (5, 5, 54)]
        for param, variation, expected in cases:
            assert B._profiles_onep_flat_index(param, variation) == expected

    def test_parse_round_trips_with_real_folder_suffix_format(self):
        assert B._parse_profiles_onep_realization("1_n2") == (1, -2)
        assert B._parse_profiles_onep_realization("6_5") == (6, 5)
        assert B._parse_profiles_onep_realization("3_0") == (3, 0)

    def test_parse_rejects_non_onep_strings(self):
        assert B._parse_profiles_onep_realization("garbage") is None
        assert B._parse_profiles_onep_realization("42") is None


class TestRealDataLookupTables:
    """Regression tests for hand-confirmed facts encoded as module-level
    lookup tables - these aren't functions, but a silent edit to either
    dict (e.g. someone "fixing" what looks like an inconsistency) would be
    a real, silent regression with no other test catching it."""

    def test_profiles_field_index_has_the_four_real_fields(self):
        assert set(B.PROFILES_FIELD_INDEX) == {"Gas Density", "Thermal Pressure", "Metallicity", "Temperature"}

    def test_cmd_mass_type_fields_are_the_five_mass_fields(self):
        assert B.CMD_MASS_TYPE_FIELDS == {"Mtot", "Mgas", "Mcdm", "Mstar", "Mtot_Nbody"}
        assert "Temperature" not in B.CMD_MASS_TYPE_FIELDS

    def test_sam_set_folder_and_realizations_cover_every_public_sam_set(self):
        # Real, confirmed via direct fetches (issue #24): LH uses folder
        # "sc-sam" (1000 realizations), CV uses "fid-sc-sam" (5 - CV_5 is
        # a real, confirmed-empty folder). A set missing from either dict
        # would silently 404 or misconstruct a URL, not fail loudly.
        assert set(B.SAM_SET_FOLDER) == B.PUBLIC_SAM_SETS
        assert set(B.SAM_SET_REALIZATIONS) == B.PUBLIC_SAM_SETS
        assert B.SAM_SET_FOLDER["LH"] == "sc-sam" and B.SAM_SET_FOLDER["CV"] == "fid-sc-sam"
        assert B.SAM_SET_REALIZATIONS["LH"] == 1000 and B.SAM_SET_REALIZATIONS["CV"] == 5

    def test_spread_metric_snap_covers_every_public_suite(self):
        # Real, confirmed via direct fetches (issue #30): a suite missing
        # from SPREAD_METRIC_SNAP would KeyError inside
        # _fetch_spread_metric_sample rather than failing closed - every
        # public suite must have a real snapshot number.
        assert set(B.SPREAD_METRIC_SNAP) == B.PUBLIC_SPREAD_METRIC_SUITES
        assert B.SPREAD_METRIC_SNAP["SIMBA"] == "033" and B.SPREAD_METRIC_SNAP["Astrid"] == "090"
        assert B.PUBLIC_SPREAD_METRIC_SETS["SIMBA"] == {"LH", "CV"}
        assert B.PUBLIC_SPREAD_METRIC_SETS["Astrid"] == {"LH", "CV", "1P"}


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
