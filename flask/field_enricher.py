"""
field_enricher.py
-----------------
AI-powered field enrichment: generates synonyms (for Step 2 header matching)
and value hints (for Step 3 value cleaning) for each template field.

Results are cached in MongoDB `field_enrichments` keyed by SHA256 of the field
definition — so unchanged fields cost zero API calls on subsequent saves.

Enrichment is always fired non-blocking (background thread) from template_api.py.
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
import concurrent.futures
from datetime import datetime
from typing import Optional

import requests
from db_config import get_field_enrichments_collection

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ENRICHMENT_MODEL = "gpt-4o-mini"   # cheapest, fast, deterministic
ENRICHMENT_MAX_TOKENS = 400
ENRICHMENT_TEMPERATURE = 0         # deterministic → consistent caching
MAX_CONCURRENT_ENRICHMENTS = 5     # fields enriched in parallel per template save


# ---------------------------------------------------------------------------
# Hashing
# ---------------------------------------------------------------------------

def _field_hash(template_key: str, field: dict) -> str:
    """
    Stable SHA256 of the field's semantic definition.
    Any change to key, label, pattern, allowed values, or description
    produces a new hash → cache miss → new AI call.
    """
    canonical = json.dumps({
        "templateKey": template_key,
        "key":         field.get("key", ""),
        "label":       field.get("label", ""),
        "pattern":     field.get("pattern", ""),
        "allowed":     sorted(field.get("allowed") or []),
        "description": field.get("description", ""),
    }, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Cache layer
# ---------------------------------------------------------------------------

def get_cached_enrichment(field_hash: str) -> Optional[dict]:
    """Return cached enrichment doc or None on miss / DB unavailable."""
    try:
        coll = get_field_enrichments_collection()
        if coll is None:
            return None
        return coll.find_one({"fieldHash": field_hash}, {"_id": 0})
    except Exception as e:
        print(f"ENRICH: cache read error: {e}")
        return None


def _write_cache(enrichment_doc: dict) -> None:
    """Upsert enrichment doc into MongoDB. Silently fails if DB unavailable."""
    try:
        coll = get_field_enrichments_collection()
        if coll is None:
            return
        coll.update_one(
            {"fieldHash": enrichment_doc["fieldHash"]},
            {"$set": enrichment_doc},
            upsert=True,
        )
    except Exception as e:
        print(f"ENRICH: cache write error: {e}")


# ---------------------------------------------------------------------------
# AI call
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a data schema assistant helping improve a CSV import engine. "
    "Given a template field definition, return ONLY a valid JSON object "
    "with 'synonyms' and 'valueHints'. No explanations, no markdown fences."
)

_USER_PROMPT_TMPL = """
Template: "{template_label}" (key: "{template_key}")
Field:
  key:         "{key}"
  label:       "{label}"
  pattern:     "{pattern}"{allowed_line}{description_line}

Return JSON exactly like this:
{{
  "synonyms": ["<header variant 1>", "<header variant 2>", "...up to 10 common CSV column names for this field>"],
  "valueHints": {{
    "regex":          "<Python regex that valid values should match, or null>",
    "formatExample":  "<one example of a valid value>",
    "enumExpansions": {{"<canonical allowed value>": ["<spelling variant>", "..."]}},
    "notes":          "<one sentence about common data quality issues for this field>"
  }}
}}
""".strip()


def call_ai_for_enrichment(field: dict, template_key: str, template_label: str) -> Optional[dict]:
    """
    Call OpenAI to generate synonyms + value hints for one field.
    Returns the parsed JSON dict or None on failure.
    """
    if not OPENAI_API_KEY:
        return None

    allowed = field.get("allowed") or []
    allowed_line = f'\n  allowed:     {json.dumps(allowed)}' if allowed else ""
    desc = field.get("description", "").strip()
    description_line = f'\n  description: "{desc}"' if desc else ""

    prompt = _USER_PROMPT_TMPL.format(
        template_label=template_label,
        template_key=template_key,
        key=field.get("key", ""),
        label=field.get("label", ""),
        pattern=field.get("pattern", "string"),
        allowed_line=allowed_line,
        description_line=description_line,
    )

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": ENRICHMENT_MODEL,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                "temperature": ENRICHMENT_TEMPERATURE,
                "max_tokens":  ENRICHMENT_MAX_TOKENS,
            },
            timeout=30,
        )
        if resp.status_code != 200:
            print(f"ENRICH: OpenAI error {resp.status_code} for field '{field.get('key')}'")
            return None

        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Strip accidental markdown fences
        if content.startswith("```"):
            import re
            m = re.search(r"```(?:json)?(.*?)```", content, re.DOTALL)
            content = m.group(1).strip() if m else content

        return json.loads(content)

    except Exception as e:
        print(f"ENRICH: AI call failed for field '{field.get('key')}': {e}")
        return None


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def enrich_field(
    field: dict,
    template_key: str,
    template_label: str,
    force: bool = False,
) -> Optional[dict]:
    """
    Enrich a single field.
    1. Compute hash.
    2. Return cached doc if hit (and not force).
    3. Call AI.
    4. Write result to cache.
    5. Return enrichment doc.
    """
    fhash = _field_hash(template_key, field)
    field_key = field.get("key", "unknown")

    if not force:
        cached = get_cached_enrichment(fhash)
        if cached:
            print(f"ENRICH: cache hit  [{template_key}.{field_key}]")
            return cached

    print(f"ENRICH: cache miss [{template_key}.{field_key}] -- calling AI...")
    ai_result = call_ai_for_enrichment(field, template_key, template_label)

    if not ai_result:
        print(f"ENRICH: no result  [{template_key}.{field_key}]")
        return None

    doc = {
        "fieldHash":    fhash,
        "templateKey":  template_key,
        "fieldKey":     field_key,
        "synonyms":     ai_result.get("synonyms") or [],
        "valueHints":   ai_result.get("valueHints") or {},
        "generatedAt":  datetime.utcnow(),
        "model":        ENRICHMENT_MODEL,
    }
    _write_cache(doc)
    print(f"ENRICH: written    [{template_key}.{field_key}] synonyms={len(doc['synonyms'])}")
    return doc


def enrich_fields_async(
    fields: list,
    template_key: str,
    template_label: str,
    changed_hashes: Optional[set] = None,
) -> None:
    """
    Enrich all fields in parallel (background).
    If changed_hashes is provided, skip fields whose hash is unchanged (cache hit guaranteed).
    This is the entry point called from template_api.py in a daemon thread.
    """
    def _run():
        to_enrich = []
        for f in fields:
            fhash = _field_hash(template_key, f)
            # If caller already knows this hash is unchanged, skip entirely
            if changed_hashes is not None and fhash not in changed_hashes:
                continue
            to_enrich.append(f)

        if not to_enrich:
            print(f"ENRICH: all fields cached for {template_key}, nothing to do.")
            return

        print(f"ENRICH: enriching {len(to_enrich)}/{len(fields)} fields for {template_key}...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_CONCURRENT_ENRICHMENTS) as ex:
            futures = {
                ex.submit(enrich_field, f, template_key, template_label): f.get("key")
                for f in to_enrich
            }
            for future in concurrent.futures.as_completed(futures):
                fk = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"ENRICH: error for field '{fk}': {e}")

        print(f"ENRICH: completed for {template_key}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()


# ---------------------------------------------------------------------------
# Runtime injection (called by get_template / get_templates in main.py)
# ---------------------------------------------------------------------------

def apply_enrichments_to_fields(fields: list, template_key: str) -> list:
    """
    Fetch all cached enrichments for a template's fields and inject:
      - field['ai_synonyms']   → list[str]   (for waterfall T3)
      - field['ai_valueHints'] → dict         (for clean_value Step 3)

    Fetched in a single bulk MongoDB query (one round-trip per template fetch).
    Returns the mutated fields list.
    """
    if not fields:
        return fields

    try:
        coll = get_field_enrichments_collection()
        if coll is None:
            return fields

        # Build hash → field index map
        hash_to_idx = {}
        for i, f in enumerate(fields):
            fhash = _field_hash(template_key, f)
            hash_to_idx[fhash] = i

        # Single bulk query
        docs = coll.find(
            {"fieldHash": {"$in": list(hash_to_idx.keys())}},
            {"fieldHash": 1, "synonyms": 1, "valueHints": 1, "_id": 0},
        )

        for doc in docs:
            idx = hash_to_idx.get(doc["fieldHash"])
            if idx is not None:
                fields[idx]["ai_synonyms"]   = doc.get("synonyms") or []
                fields[idx]["ai_valueHints"] = doc.get("valueHints") or {}

    except Exception as e:
        print(f"ENRICH: apply_enrichments error: {e}")

    return fields
