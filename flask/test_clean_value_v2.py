"""
Standalone tests for the pure cleansing / normalisation functions in main.py.

Strategy: import sys, patch every problematic external module BEFORE importing main,
then use importlib to load main from the flask/ subdirectory without it being on the
default sys.path (so any existing stale .pyc is bypassed too).
"""

import sys
import os
import types
import importlib
import importlib.util
import unittest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# 1. Patch every dependency that main.py would try to import at module-level
#    with a MagicMock that also exposes a usable __name__ on its functions
#    (Flask route decorators need __name__).
# ---------------------------------------------------------------------------

def _make_fn_mock(name="mock_fn"):
    """Create a callable MagicMock that has a __name__ attribute."""
    m = MagicMock()
    m.__name__ = name
    return m


# Core replacements
_STUBS = {
    "db_config": MagicMock(),
    "api_keys": MagicMock(),
    "audit_logger": MagicMock(),
    "schema_builder": MagicMock(),
    "auth0": MagicMock(),
    "flasgger": MagicMock(),
    "flask_graphql": MagicMock(),
    "graphene": MagicMock(),
    "processing_worker": MagicMock(),
    "template_api": MagicMock(),
}

# auth_utils: require_auth and require_role must be passthrough decorators
_auth_stub = types.ModuleType("auth_utils")
_auth_stub.require_auth = lambda f: f          # passthrough decorator
_auth_stub.require_role = lambda *a, **k: (lambda f: f)
_auth_stub.ROLE_ADMIN = "ADMIN"
_auth_stub.ROLE_EDITOR = "EDITOR"
_auth_stub.ROLE_VIEWER = "VIEWER"
_auth_stub.get_current_user_id = lambda: "test-user"
_STUBS["auth_utils"] = _auth_stub

# core_config
_core_stub = types.ModuleType("core_config")
_core_stub.PEOPLE_STATUSES = ["Active", "Inactive"]
_core_stub.BOOKING_STATUSES = ["Pending", "Booked", "Completed", "Cancelled"]
_core_stub.PATIENT_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"]
_core_stub.TEMPLATES = {}
_STUBS["core_config"] = _core_stub

# template_utils
_tpl_stub = types.ModuleType("template_utils")
_tpl_stub.get_execution_order = lambda *a, **k: []
_tpl_stub.validate_template_dependencies = lambda *a, **k: None
_tpl_stub.get_templates = lambda *a, **k: {}
_tpl_stub.get_template = lambda key, *a, **k: {"fields": [], "references": {}}
_STUBS["template_utils"] = _tpl_stub

for name, stub in _STUBS.items():
    sys.modules[name] = stub


# ---------------------------------------------------------------------------
# 2. Temporarily add the flask/ dir to sys.path so `import main` resolves.
# ---------------------------------------------------------------------------
FLASK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "flask")
sys.path.insert(0, os.path.abspath(FLASK_DIR))

# Flasgger's Swagger() call needs to succeed — give it a no-op
_flasgger_stub = types.ModuleType("flasgger")
class _FakeSwagger:
    def __init__(self, *a, **k): pass
_flasgger_stub.Swagger = _FakeSwagger
sys.modules["flasgger"] = _flasgger_stub

import main  # noqa: E402  (the flask/main.py)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestParseToDdMmYyyy(unittest.TestCase):

    def p(self, s):
        return main.parse_to_dd_mm_yyyy(s)

    def test_already_in_target_format(self):
        self.assertEqual(self.p("28-02-2026"), "28-02-2026")

    def test_slash_delimited(self):
        self.assertEqual(self.p("28/02/2026"), "28-02-2026")

    def test_iso_format(self):
        self.assertEqual(self.p("2026-02-28"), "28-02-2026")

    def test_dot_delimited(self):
        self.assertEqual(self.p("28.02.2026"), "28-02-2026")

    def test_ordinal_th(self):
        self.assertEqual(self.p("28th Feb 2026"), "28-02-2026")

    def test_ordinal_st(self):
        self.assertEqual(self.p("1st January 2026"), "01-01-2026")

    def test_text_month_short(self):
        self.assertEqual(self.p("28 Feb 2026"), "28-02-2026")

    def test_text_month_full(self):
        self.assertEqual(self.p("28 February 2026"), "28-02-2026")

    def test_text_month_reversed(self):
        self.assertEqual(self.p("Feb 28 2026"), "28-02-2026")

    def test_text_month_comma(self):
        self.assertEqual(self.p("February 28, 2026"), "28-02-2026")

    def test_hyphen_text_month(self):
        self.assertEqual(self.p("28-Feb-2026"), "28-02-2026")

    def test_2digit_year_recent(self):
        self.assertEqual(self.p("28/02/26"), "28-02-2026")

    def test_2digit_year_old(self):
        self.assertEqual(self.p("15/06/85"), "15-06-1985")

    def test_excel_serial(self):
        result = self.p("46000")
        self.assertIsNotNone(result)
        self.assertRegex(result, r"^\d{2}-\d{2}-\d{4}$")

    def test_invalid_returns_none(self):
        self.assertIsNone(self.p("not a date"))
        self.assertIsNone(self.p(""))
        self.assertIsNone(self.p(None))


class TestCleanPhone(unittest.TestCase):

    def c(self, raw, required=False):
        return main.clean_phone(raw, required)

    def test_au_mobile_spaces(self):
        val, st = self.c("0412 345 678")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "0412 345 678")

    def test_au_mobile_no_spaces(self):
        val, st = self.c("0412345678")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "0412 345 678")

    def test_au_landline(self):
        val, st = self.c("0298765432")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "02 9876 5432")

    def test_international_plus61_mobile(self):
        val, st = self.c("+61412345678")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "0412 345 678")

    def test_international_plus61_landline(self):
        val, st = self.c("+61298765432")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "02 9876 5432")

    def test_too_short_required(self):
        _, st = self.c("123", required=True)
        self.assertEqual(st, "bad")

    def test_empty_optional(self):
        _, st = self.c("", required=False)
        self.assertEqual(st, "ok")

    def test_empty_required(self):
        _, st = self.c("", required=True)
        self.assertEqual(st, "bad")


class TestToTitleCaseName(unittest.TestCase):

    def t(self, s):
        return main.to_title_case_name(s)

    def test_basic_title_case(self):
        self.assertEqual(self.t("john smith"), "John Smith")

    def test_all_caps(self):
        self.assertEqual(self.t("JOHN SMITH"), "John Smith")

    def test_hyphenated(self):
        self.assertEqual(self.t("mary-jane doe"), "Mary-Jane Doe")

    def test_mc_prefix(self):
        self.assertEqual(self.t("john mcdonald"), "John McDonald")

    def test_o_apostrophe(self):
        self.assertEqual(self.t("patrick o'brien"), "Patrick O'Brien")

    def test_abbreviation_preserved(self):
        # All-caps abbreviations of <=3 chars are kept as-is
        self.assertEqual(self.t("JOHN JR"), "John JR")

    def test_strips_digits(self):
        self.assertEqual(self.t("John2 Smith"), "John Smith")

    def test_empty(self):
        self.assertEqual(self.t(""), "")
        self.assertEqual(self.t(None), "")


class TestCleanStringUniversal(unittest.TestCase):

    def u(self, s):
        return main._clean_string_universal(s)

    def test_zero_width_space(self):
        self.assertEqual(self.u("Joe\u200b Smith"), "Joe Smith")

    def test_non_breaking_space(self):
        self.assertEqual(self.u("Joe\u00a0Smith"), "Joe Smith")

    def test_html_entities(self):
        self.assertEqual(self.u("Johnson &amp; Co"), "Johnson & Co")

    def test_multi_space_collapse(self):
        self.assertEqual(self.u("John   Smith"), "John Smith")

    def test_bom_stripped(self):
        self.assertEqual(self.u("\ufeffHello"), "Hello")

    def test_empty_passthrough(self):
        self.assertEqual(self.u(""), "")


class TestCleanEmail(unittest.TestCase):

    def e(self, raw, required=False):
        return main.clean_email(raw, required)

    def test_valid_email(self):
        _, st = self.e("john@example.com")
        self.assertEqual(st, "ok")

    def test_tld_typo_cmo(self):
        val, st = self.e("john@example.cmo")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "john@example.com")

    def test_tld_typo_og(self):
        val, st = self.e("john@example.og")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "john@example.org")

    def test_at_obfuscation(self):
        val, st = self.e("john(at)example.com")
        self.assertEqual(st, "ok")
        self.assertIn("@", val)

    def test_empty_optional(self):
        _, st = self.e("", required=False)
        self.assertEqual(st, "ok")

    def test_empty_required(self):
        _, st = self.e("", required=True)
        self.assertEqual(st, "bad")


class TestCleanNumericId(unittest.TestCase):

    def n(self, raw, required=False):
        return main.clean_numeric_id(raw, required)

    def test_plain_integer_string(self):
        val, st = self.n("1001")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "1001")

    def test_float_value(self):
        val, st = self.n(1001.0)
        self.assertEqual(st, "ok")
        self.assertEqual(val, "1001")

    def test_float_string(self):
        val, st = self.n("1001.0")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "1001")

    def test_leading_zeros_stripped(self):
        val, st = self.n("00123")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "123")

    def test_none_optional(self):
        _, st = self.n(None, required=False)
        self.assertEqual(st, "ok")

    def test_none_required(self):
        _, st = self.n(None, required=True)
        self.assertEqual(st, "bad")


class TestCleanValueRegression(unittest.TestCase):
    """Guard against regressions in clean_value for the original behaviour."""

    def test_enum_case_insensitive(self):
        field = {
            "key": "status", "label": "Status",
            "pattern": "enum", "allowed": ["Active", "Inactive"],
            "caseSensitive": False,
        }
        val, st = main.clean_value("Any", field, "active")
        self.assertEqual(st, "ok")
        self.assertEqual(val, "Active")

    def test_no_crash_on_none(self):
        field = {"key": "test", "pattern": "string"}
        try:
            main.clean_value("Any", field, None)
            main.clean_value("Any", field, 123)
            main.clean_value("Any", field, "Safe")
        except Exception as e:
            self.fail(f"clean_value crashed: {e}")


if __name__ == "__main__":
    unittest.main()
