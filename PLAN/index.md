# Library Enum Field for Public Channel API (Issue #5821) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a `library` enum field (`"KOLIBRI"`, `"COMMUNITY"`, or `null`) to the v1 and v2 public channel API endpoints, and gate v1 ChannelVersion token resolution behind a `channel_versions=true` query parameter.

**Architecture:** The v1 endpoint branches between `PublicChannelSerializer` (channel tokens) and `_serialize_channel_version()` (channel-version tokens); both paths get a `library` field. The v2 `consolidate()` method already post-processes every item, so `library` is appended there. The gate in v1 wraps the ChannelVersion lookup in `_get_channel_list_v1` with a `params.get("channel_versions") == "true"` guard.

**Tech Stack:** Python 3.10, Django 3.2, DRF, le-utils 0.2.17 (`le_utils.constants.library`)

> **Note:** le-utils 0.2.17 is already installed in the environment; `requirements.txt` still pins 0.2.14 and must be updated. The `pip install` step in Task 1 will be a no-op but `requirements.txt` still needs the version bump committed.

---

## File Map

| File | Change |
|---|---|
| `requirements.txt` | Bump `le-utils` from `0.2.14` → `0.2.17` |
| `contentcuration/kolibri_public/views_v1.py` | Gate ChannelVersion lookup; add `library` to `_serialize_channel_version()`; import `library` and `community_library_submission` constants |
| `contentcuration/contentcuration/serializers.py` | Add `library` `SerializerMethodField` to `PublicChannelSerializer` |
| `contentcuration/kolibri_public/views.py` | Append `library` in `consolidate()`; import `library` constants |
| `contentcuration/kolibri_public/tests/test_public_v1_api.py` | Update 3 existing channel-version tests to add `?channel_versions=true`; add 5 new tests covering the gate, `library` values, and key parity |
| `contentcuration/kolibri_public/tests/test_channelmetadata_viewset.py` | Add 2 tests for `library` field on v2 public/non-public channels |

---

## Phase 1 — Update le-utils dependency

### Task 1: Bump le-utils to 0.2.17

**Files:**
- Modify: `requirements.txt:180`

- [x] **Step 1: Replace the le-utils pin in requirements.txt**

Change line 180 from:
```
le-utils==0.2.14
```
to:
```
le-utils==0.2.17
```

- [x] **Step 2: Install the updated dependency**

```bash
pip install "le-utils==0.2.17"
```

Expected: Successfully installed le-utils-0.2.17

- [x] **Step 3: Verify the library constants are importable**

```bash
python -c "from le_utils.constants import library; print(library.KOLIBRI, library.COMMUNITY)"
```

Expected output: `KOLIBRI COMMUNITY`

- [x] **Step 4: Run the full test suite to confirm no regressions**

```bash
pytest contentcuration/kolibri_public/tests/ -v
```

Expected: All existing tests pass.

- [x] **Step 5: Commit**

```bash
git add requirements.txt
git commit -m "chore: update le-utils to 0.2.17 for library constants"
```

- [x] **Step 6: /simplify pass on Phase 1 changes**

Run the `simplify` skill on `requirements.txt`. Confirm no unnecessary changes were introduced.

---

## Phase 2 — Gate V1 ChannelVersion lookup behind `channel_versions=true`

### Context

The test file `test_public_v1_api.py` carries this note:
> "IMPORTANT: These tests are to never be changed. They are enforcing a public API contract."

This issue **intentionally changes that contract** by adding a query-parameter gate. The three existing channel-version lookup tests must be updated to supply `?channel_versions=true`; otherwise they would fail by design. This is the correct response to a deliberate API contract change.

### Task 2: Write the failing gate test

**Files:**
- Modify: `contentcuration/kolibri_public/tests/test_public_v1_api.py`

- [x] **Step 1: Add the gate test to `PublicAPITestCase`**

Add after the last existing test method:

```python
def test_channel_version_token_lookup_requires_channel_versions_param(self):
    """
    Without channel_versions=true, a channel-version token must return 404.
    With channel_versions=true it must return 200 with the correct version.
    """
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.version = 4
    self.channel.published_data = {"4": {"version_notes": "v4 notes"}}
    self.channel.save()
    # Channel.on_update() auto-creates ChannelVersion(version=4) when channel.save() is called.
    # The get_or_create below finds that existing record; defaults are not applied.
    # new_token() creates the secret token if it doesn't already exist.
    channel_version, _created = ChannelVersion.objects.get_or_create(
        channel=self.channel,
        version=4,
        defaults={
            "kind_count": [],
            "included_languages": [],
            "resource_count": 0,
            "size": 0,
        },
    )
    version_token = channel_version.new_token().token

    lookup_url = reverse(
        "get_public_channel_lookup",
        kwargs={"version": "v1", "identifier": version_token},
    )

    # Without the param: must 404
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 404)

    # With channel_versions=true: must 200 with the correct version
    response = self.client.get(lookup_url + "?channel_versions=true")
    self.assertEqual(response.status_code, 200)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["version"], 4)
```

- [x] **Step 2: Run the new test to verify it fails**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py::PublicAPITestCase::test_channel_version_token_lookup_requires_channel_versions_param -v
```

Expected: FAIL (currently both requests return 200; the first should 404 after the gate is added).

### Task 3: Implement the gate in `_get_channel_list_v1`

**Files:**
- Modify: `contentcuration/kolibri_public/views_v1.py:89-101`

- [x] **Step 1: Wrap the ChannelVersion block with the gate**

Replace the existing `if not channels.exists():` block (lines 89–101):

```python
        if not channels.exists():
            # If channels doesnt exist with the given token, check if this is a token of
            # a channel version.
            channel_version = ChannelVersion.objects.select_related(
                "secret_token", "channel"
            ).filter(
                secret_token__token=identifier,
                channel__deleted=False,
                channel__main_tree__published=True,
            )
            if channel_version.exists():
                # return early as we won't need to apply the other filters for channel version tokens
                return channel_version
```

with:

```python
        if not channels.exists() and params.get("channel_versions") == "true":
            # Only resolve ChannelVersion tokens when the caller explicitly opts in.
            # This prevents older Kolibri clients from accidentally retrieving data
            # they cannot parse correctly.
            channel_version = ChannelVersion.objects.select_related(
                "secret_token", "channel"
            ).filter(
                secret_token__token=identifier,
                channel__deleted=False,
                channel__main_tree__published=True,
            )
            if channel_version.exists():
                # return early as we won't need to apply the other filters for channel version tokens
                return channel_version
```

- [x] **Step 2: Run the gate test to verify it passes**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py::PublicAPITestCase::test_channel_version_token_lookup_requires_channel_versions_param -v
```

Expected: PASS

### Task 4: Update the three existing channel-version tests

The three tests below call the lookup endpoint with a channel-version token but do not include `?channel_versions=true`. They will now return 404 instead of 200. Update each one.

**Files:**
- Modify: `contentcuration/kolibri_public/tests/test_public_v1_api.py`

- [x] **Step 1: Update `test_public_channel_lookup_with_channel_version_token_uses_channel_version`**

Find this line (around line 109–113):
```python
        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        response = self.client.get(lookup_url)
```

Replace with:
```python
        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        response = self.client.get(lookup_url + "?channel_versions=true")
```

- [x] **Step 2: Update `test_public_channel_lookup_channel_version_and_channel_tokens_have_same_keys`**

Find the channel-version request (around line 153–158):
```python
        channel_version_response = self.client.get(
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": latest_version_token},
            )
        )
```

Replace with:
```python
        channel_version_response = self.client.get(
            reverse(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": latest_version_token},
            )
            + "?channel_versions=true"
        )
```

- [x] **Step 3: Update `test_channel_version_token_returns_snapshot_info_not_current_channel_info`**

Find the lookup call (around line 205–209):
```python
        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        response = self.client.get(lookup_url)
```

Replace with:
```python
        lookup_url = reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        response = self.client.get(lookup_url + "?channel_versions=true")
```

- [x] **Step 4: Run all v1 tests to verify they pass**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py -v
```

Expected: All tests pass.

- [x] **Step 5: Commit**

```bash
git add contentcuration/kolibri_public/views_v1.py
git add contentcuration/kolibri_public/tests/test_public_v1_api.py
git commit -m "feat: gate v1 ChannelVersion token resolution behind channel_versions=true param"
```

- [x] **Step 6: /simplify pass on Phase 2 changes**

Run the `simplify` skill on `views_v1.py` and the test file. Confirm the gate condition is expressed as cleanly as possible.

---

## Phase 3 — Add `library` field to V1 responses

Both V1 response paths (channel-version tokens and regular channel tokens) must include `library`.

### Task 5: Write failing tests for V1 `library` field

**Files:**
- Modify: `contentcuration/kolibri_public/tests/test_public_v1_api.py`

- [x] **Step 1: Add imports at top of test file**

The existing import block is:
```python
from contentcuration.models import ChannelVersion
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.testdata import generated_base64encoding
```

Replace it with (maintaining alphabetical sort — `constants` before `models`, `CommunityLibrarySubmission` after `ChannelVersion`):
```python
from contentcuration.constants import community_library_submission as cls_constants
from contentcuration.models import ChannelVersion
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.testdata import generated_base64encoding
```

- [x] **Step 2: Add test for COMMUNITY library value on channel-version token**

```python
def test_channel_version_token_with_approved_submission_returns_library_community(self):
    """
    A channel-version token whose ChannelVersion has a CommunityLibrarySubmission
    with APPROVED status returns library: "COMMUNITY".
    """
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.version = 5
    self.channel.published_data = {"5": {"version_notes": "v5 notes"}}
    self.channel.save()

    # CommunityLibrarySubmission.save() calls ChannelVersion.objects.get_or_create(version=5)
    # (finding the one already created by Channel.on_update()) and then calls new_token()
    # to create the secret token. self.user is already an editor of self.channel (from setUp).
    CommunityLibrarySubmission.objects.create(
        channel=self.channel,
        channel_version=5,
        author=self.user,
        status=cls_constants.STATUS_APPROVED,
    )

    channel_version = ChannelVersion.objects.get(channel=self.channel, version=5)
    version_token = channel_version.secret_token.token

    lookup_url = (
        reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        + "?channel_versions=true"
    )
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data[0]["library"], "COMMUNITY")
```

- [x] **Step 3: Add test for COMMUNITY library value on channel-version token with LIVE submission**

```python
def test_channel_version_token_with_live_submission_returns_library_community(self):
    """
    A channel-version token whose ChannelVersion has a CommunityLibrarySubmission
    with LIVE status returns library: "COMMUNITY".
    """
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.version = 7
    self.channel.published_data = {"7": {"version_notes": "v7 notes"}}
    self.channel.save()

    # CommunityLibrarySubmission.save() validates that self.channel.public is False
    # (it is False by default) and that self.user is a channel editor (added in setUp).
    # It also calls ChannelVersion.objects.get_or_create(version=7) and new_token().
    CommunityLibrarySubmission.objects.create(
        channel=self.channel,
        channel_version=7,
        author=self.user,
        status=cls_constants.STATUS_LIVE,
    )

    channel_version = ChannelVersion.objects.get(channel=self.channel, version=7)
    version_token = channel_version.secret_token.token

    lookup_url = (
        reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        + "?channel_versions=true"
    )
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data[0]["library"], "COMMUNITY")
```

- [x] **Step 4: Add test for null library value on channel-version token with non-qualifying submission status**

```python
def test_channel_version_token_with_pending_submission_returns_library_null(self):
    """
    A channel-version token whose ChannelVersion has a CommunityLibrarySubmission
    with PENDING status (not approved or live) returns library: null.
    This validates that the status filter in _get_channel_version_library is correct.
    """
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.version = 8
    self.channel.published_data = {"8": {"version_notes": "v8 notes"}}
    self.channel.save()

    # CommunityLibrarySubmission with PENDING status should NOT qualify.
    CommunityLibrarySubmission.objects.create(
        channel=self.channel,
        channel_version=8,
        author=self.user,
        status=cls_constants.STATUS_PENDING,
    )

    channel_version = ChannelVersion.objects.get(channel=self.channel, version=8)
    version_token = channel_version.secret_token.token

    lookup_url = (
        reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        + "?channel_versions=true"
    )
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 200)
    self.assertIsNone(response.data[0]["library"])
```

- [x] **Step 5: Add test for null library value on channel-version token without community submission**

```python
def test_channel_version_token_without_submission_returns_library_null(self):
    """
    A channel-version token with no associated CommunityLibrarySubmission
    returns library: null.
    """
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.version = 6
    self.channel.published_data = {"6": {"version_notes": "v6 notes"}}
    self.channel.save()

    # Channel.on_update() creates ChannelVersion(version=6); get_or_create finds it.
    # No CommunityLibrarySubmission is created, so no token is auto-generated.
    # new_token() creates the secret token here.
    channel_version, _created = ChannelVersion.objects.get_or_create(
        channel=self.channel,
        version=6,
        defaults={
            "kind_count": [],
            "included_languages": [],
            "resource_count": 0,
            "size": 0,
        },
    )
    version_token = channel_version.new_token().token

    lookup_url = (
        reverse(
            "get_public_channel_lookup",
            kwargs={"version": "v1", "identifier": version_token},
        )
        + "?channel_versions=true"
    )
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 200)
    self.assertIsNone(response.data[0]["library"])
```

- [x] **Step 6: Add test for KOLIBRI library value on regular public channel token**

```python
def test_public_channel_token_returns_library_kolibri(self):
    """
    A regular channel token for a public channel returns library: "KOLIBRI".
    """
    self.channel.public = True
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.save()

    channel_token = self.channel.make_token().token

    lookup_url = reverse(
        "get_public_channel_lookup",
        kwargs={"version": "v1", "identifier": channel_token},
    )
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data[0]["library"], "KOLIBRI")
```

- [x] **Step 7: Add test for null library value on regular non-public channel token**

```python
def test_non_public_channel_token_returns_library_null(self):
    """
    A regular channel token for a non-public channel returns library: null.
    """
    self.channel.public = False
    self.channel.main_tree.published = True
    self.channel.main_tree.save()
    self.channel.save()

    channel_token = self.channel.make_token().token

    lookup_url = reverse(
        "get_public_channel_lookup",
        kwargs={"version": "v1", "identifier": channel_token},
    )
    response = self.client.get(lookup_url)
    self.assertEqual(response.status_code, 200)
    self.assertIsNone(response.data[0]["library"])
```

- [x] **Step 8: Run new tests to verify they all fail**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py -k "library" -v
```

Expected: All 6 new tests FAIL with `KeyError: 'library'` or `AssertionError`.

### Task 6: Implement `library` in `_serialize_channel_version()`

**Files:**
- Modify: `contentcuration/kolibri_public/views_v1.py`

- [x] **Step 1: Add imports at the top of `views_v1.py`**

After the existing imports, add (respecting import ordering — le_utils is third-party non-Django, contentcuration is local):

```python
from le_utils.constants import library as library_constants

from contentcuration.constants import community_library_submission as cls_constants
```

- [x] **Step 2: Add helper function `_get_channel_version_library`**

Insert directly above `_serialize_channel_version` (after `get_thumbnail_encoding`):

```python
def _get_channel_version_library(channel, channel_version):
    """Return the library enum value for a ChannelVersion token lookup."""
    if channel.community_library_submissions.filter(
        channel_version=channel_version.version,
        status__in=[cls_constants.STATUS_APPROVED, cls_constants.STATUS_LIVE],
    ).exists():
        return library_constants.COMMUNITY
    return None
```

- [x] **Step 3: Add `library` to the dict returned by `_serialize_channel_version`**

In the `return [{ ... }]` block, add after `"matching_tokens"`:

```python
            "library": _get_channel_version_library(channel, channel_version),
```

The full updated dict should be:
```python
    return [
        {
            "id": channel_version.channel_id,
            "name": channel_version.channel_name,
            "language": channel_version.channel_language_id,
            "public": channel.public,
            "description": channel_version.channel_description,
            "icon_encoding": get_thumbnail_encoding(channel_version),
            "version_notes": _get_version_notes(channel, channel_version),
            "version": channel_version.version,
            "kind_count": channel_version.kind_count,
            "included_languages": channel_version.included_languages,
            "total_resource_count": channel_version.resource_count,
            "published_size": channel_version.size,
            "last_published": channel_version.date_published,
            "matching_tokens": [channel_version.secret_token.token]
            if channel_version.secret_token
            else [],
            "library": _get_channel_version_library(channel, channel_version),
        }
    ]
```

- [x] **Step 4: Run the channel-version library tests to verify they pass**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py -k "channel_version_token" -v
```

Expected: `test_channel_version_token_with_approved_submission_returns_library_community`, `test_channel_version_token_with_live_submission_returns_library_community`, `test_channel_version_token_with_pending_submission_returns_library_null`, and `test_channel_version_token_without_submission_returns_library_null` all PASS.

### Task 7: Add `library` field to `PublicChannelSerializer`

**Files:**
- Modify: `contentcuration/contentcuration/serializers.py`

- [x] **Step 1: Add le-utils import at the top of `serializers.py`**

Add after existing imports (in the third-party non-Django section):

```python
from le_utils.constants import library as library_constants
```

- [x] **Step 2: Add `library` SerializerMethodField to `PublicChannelSerializer`**

After the existing field declarations (after `version_notes = ...`), add:

```python
    library = serializers.SerializerMethodField()
```

- [x] **Step 3: Add the `get_library` method**

After the `sort_published_data` method and before `class Meta`:

```python
    def get_library(self, channel):
        return library_constants.KOLIBRI if channel.public else None
```

- [x] **Step 4: Add `library` to `Meta.fields`**

In `class Meta`, extend `fields`:

```python
        fields = (
            "id",
            "name",
            "language",
            "included_languages",
            "description",
            "total_resource_count",
            "version",
            "kind_count",
            "published_size",
            "last_published",
            "icon_encoding",
            "matching_tokens",
            "public",
            "version_notes",
            "library",
        )
```

- [x] **Step 5: Run all v1 library tests to confirm all 6 pass**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py -k "library" -v
```

Expected: All 6 tests PASS.

- [x] **Step 6: Run the key-parity test to confirm `library` appears in both paths**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py::PublicAPITestCase::test_public_channel_lookup_channel_version_and_channel_tokens_have_same_keys -v
```

Expected: PASS (both paths now include `library`).

- [x] **Step 7: Run all v1 tests**

```bash
pytest contentcuration/kolibri_public/tests/test_public_v1_api.py -v
```

Expected: All tests pass.

- [x] **Step 8: Commit**

```bash
git add contentcuration/kolibri_public/views_v1.py
git add contentcuration/contentcuration/serializers.py
git add contentcuration/kolibri_public/tests/test_public_v1_api.py
git commit -m "feat: add library field to v1 public channel API responses"
```

- [x] **Step 9: /simplify pass on Phase 3 changes**

Run the `simplify` skill on `views_v1.py` and `serializers.py`. Confirm `_get_channel_version_library` is well-named, the import block is ordered correctly per conventions, and `get_library` in the serializer is minimal.

---

## Phase 4 — Add `library` field to V2 response

### Task 8: Write failing tests for V2 `library` field

**Files:**
- Modify: `contentcuration/kolibri_public/tests/test_channelmetadata_viewset.py`

- [x] **Step 1: Add a new test class at the end of the file**

No new imports are needed. `ChannelMetadata`, `KolibriPublicMixer`, `testdata`, `StudioAPITestCase`, and `reverse_with_query` are all already imported in `test_channelmetadata_viewset.py`.

```python
class ChannelMetadataLibraryFieldTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()
        self.mixer = KolibriPublicMixer()
        self.user = testdata.user("library@test.com")
        self.client.force_authenticate(self.user)

    def test_public_channel_returns_library_kolibri(self):
        """
        A public channel in the v2 API returns library: "KOLIBRI".
        """
        channel = self.mixer.blend(ChannelMetadata, public=True)

        response = self.client.get(
            reverse_with_query(
                "publicchannel-detail",
                args=[channel.id],
                query={"public": "true"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["library"], "KOLIBRI")

    def test_non_public_channel_returns_library_community(self):
        """
        A non-public channel in the v2 API returns library: "COMMUNITY".
        """
        channel = self.mixer.blend(ChannelMetadata, public=False)

        response = self.client.get(
            reverse_with_query(
                "publicchannel-detail",
                args=[channel.id],
                query={"public": "false"},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["library"], "COMMUNITY")
```

- [x] **Step 2: Run the new tests to verify they fail**

```bash
pytest contentcuration/kolibri_public/tests/test_channelmetadata_viewset.py::ChannelMetadataLibraryFieldTestCase -v
```

Expected: Both tests FAIL with `KeyError: 'library'`.

### Task 9: Implement `library` in V2 `consolidate()`

**Files:**
- Modify: `contentcuration/kolibri_public/views.py`

- [x] **Step 1: Add le-utils import to `views.py`**

In the third-party non-Django import block (near the existing `from le_utils.constants import content_kinds` import), add:

```python
from le_utils.constants import library as library_constants
```

- [x] **Step 2: Append `library` inside the `for item in items:` loop in `consolidate()`**

Find the loop that ends with `item["last_published"] = item["last_updated"]` and add one line after it:

```python
        for item in items:
            item["included_languages"] = included_languages.get(item["id"], [])
            item["countries"] = countries.get(item["id"], [])
            item["token"] = channel_tokens.get(item["id"])
            item["last_published"] = item["last_updated"]
            item["library"] = library_constants.KOLIBRI if item["public"] else library_constants.COMMUNITY
```

- [x] **Step 3: Run the v2 library tests to verify they pass**

```bash
pytest contentcuration/kolibri_public/tests/test_channelmetadata_viewset.py::ChannelMetadataLibraryFieldTestCase -v
```

Expected: Both tests PASS.

- [x] **Step 4: Run all channelmetadata viewset tests**

```bash
pytest contentcuration/kolibri_public/tests/test_channelmetadata_viewset.py -v
```

Expected: All tests pass.

- [x] **Step 5: Run the complete public API test suite**

```bash
pytest contentcuration/kolibri_public/tests/ -v
```

Expected: All tests pass.

- [x] **Step 6: Commit**

```bash
git add contentcuration/kolibri_public/views.py
git add contentcuration/kolibri_public/tests/test_channelmetadata_viewset.py
git commit -m "feat: add library field to v2 public channel metadata API"
```

- [x] **Step 7: /simplify pass on Phase 4 changes**

Run the `simplify` skill on `views.py` and `test_channelmetadata_viewset.py`. Confirm the `library` assignment in `consolidate()` is readable and the import is in the correct position.

---

## Self-Review Checklist

### Spec Coverage

| Acceptance criterion | Task |
|---|---|
| V1 channel lookup response includes a `library` field | Task 6–7 |
| V2 channel metadata response includes a `library` field | Task 9 |
| Channel version tokens with approved/live CommunityLibrarySubmission → `library: "COMMUNITY"` | Task 5 steps 2–3, Task 6 |
| Regular channel tokens for public channels → `library: "KOLIBRI"` | Task 5 step 6, Task 7 |
| All other tokens → `library: null` | Task 5 steps 4, 5, 7, Tasks 6–7 |
| V2 public channels → `library: "KOLIBRI"`, non-public → `library: "COMMUNITY"` | Task 8–9 |
| le-utils dependency updated | Task 1 |
| V1 channel version token resolution gated behind `channel_versions=true` | Task 2–4 |
| Tests cover all three `library` values (KOLIBRI, COMMUNITY, null) across token types on v1 | Tasks 5–7 |
| Tests cover STATUS_LIVE returning COMMUNITY (not just STATUS_APPROVED) | Task 5 step 3 |
| Tests cover non-qualifying status (PENDING) returning null | Task 5 step 4 |
| Tests cover `library` field on v2 for public and non-public channels | Task 8 |

All criteria accounted for. No gaps.

### Type / Name Consistency

- `library_constants.KOLIBRI` and `library_constants.COMMUNITY` are used consistently across `views_v1.py`, `serializers.py`, and `views.py`.
- `_get_channel_version_library(channel, channel_version)` helper is called only from `_serialize_channel_version()`.
- `cls_constants` alias for `community_library_submission` constants is used only in `views_v1.py`.

### No Placeholders

All code steps are complete and concrete. No TBDs.
