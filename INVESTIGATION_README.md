# Investigation: Opus 4.7 Haiku 4.5 Bedrock Cost Spike

This investigation was conducted in response to a Slack report on April 17, 2026, regarding a cost spike on Haiku 4.5 Bedrock after upgrading from `v1.82.3-stable.patch.4` to `v1.82.3-stable.opus-4.7`.

---

## Documents in This Investigation

### 1. [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - **START HERE**
Quick executive summary for the team with:
- TL;DR and root cause
- What happened and why
- Immediate action items
- Files to check

**Read this first if you need to understand the issue quickly.**

### 2. [INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md](./INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md)
Full investigation report including:
- Detailed issue summary
- Investigation findings
- Root cause analysis
- Evidence from PRs and discussions
- Recommended fixes (short-term and long-term)
- References to related issues

**Read this for complete context and evidence.**

### 3. [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md)
Technical deep-dive showing:
- Specific code patterns that caused the bug
- Before/after comparisons
- Why each pattern breaks
- Request flow diagrams
- Detailed fix strategies

**Read this if you need to understand the exact code changes.**

---

## Quick Context

### The Problem
After upgrading to the Opus 4.7 release, users saw **significant cost spikes** on Haiku 4.5 models on Bedrock, accompanied by errors: **"unsupported thinking metadata"**

### The Root Cause
The Opus 4.7 day 0 launch PRs (#25867, #25876) extended hardcoded model pattern checks using **broad substring matching** that inadvertently matched Haiku 4.5 models. This caused LiteLLM to send thinking/reasoning metadata to Haiku 4.5, which Bedrock rejects, leading to retry storms and cost spikes.

### Key Pattern
```python
# This pattern matches BOTH Haiku 4.7 AND Haiku 4.5!
if "claude-haiku-4" in model:
    add_thinking_metadata()  # ❌ Haiku 4.5 doesn't support this!
```

---

## For LiteLLM Team

### Immediate Actions Needed

1. **Verify the issue**
   ```bash
   # Check customer logs for "unsupported thinking metadata" errors
   # Correlate with Haiku 4.5 requests on Bedrock
   ```

2. **Test current behavior**
   ```python
   # Test if Haiku 4.5 is getting thinking metadata
   # Test if Bedrock rejects it
   ```

3. **Deploy hotfix**
   - See [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md) → "Fix Strategy" → "1. Immediate Hotfix"
   - Explicitly exclude Haiku 4.5 from thinking metadata logic

4. **Run full CI/CD for the hotfix**
   - Include integration tests for all Claude 4.x models on Bedrock
   - Verify Haiku 4.5 behavior specifically

### Strategic Actions

This is the **3rd occurrence** of hardcoded model checks causing regressions. Time to fix the root cause:

1. **Implement provider name normalization** in `supports_reasoning()`
2. **Remove all hardcoded model version checks**
3. **Enforce JSON-based capability system**
4. **Require full CI/CD for all model launches** (no exceptions)

See [Discussion #22555 "Day 0 Model Release Gaps"](https://github.com/BerriAI/litellm/discussions/22555) for the full architectural fix plan.

---

## For Reviewers

### What Went Wrong

1. **Design principle violation**
   - LiteLLM has a documented principle: model capabilities should be in JSON, not hardcoded
   - Opus 4.7 PRs violated this principle (acknowledged in Greptile reviews)

2. **Broad pattern matching**
   - Used `"claude-haiku-4" in model` which matches 4.0, 4.5, 4.6, 4.7, 4.8...
   - Should have used explicit version checks

3. **Function scope creep**
   - `is_claude_4_5_on_bedrock()` now covers 4.5, 4.6, AND 4.7
   - Name no longer matches behavior

4. **Skipped CI/CD**
   - Opus 4.7 didn't go through full CI/CD (confirmed in Slack thread)
   - Integration tests would have caught this

### Why It Wasn't Caught

- **No Haiku 4.5 tests** for the new logic paths
- **Hardcoded checks** bypassed the broken `supports_reasoning()` function
- **Function name** (`is_claude_4_5_on_bedrock`) suggested it was only for 4.5
- **Greptile flagged issues** but PRs merged anyway (P2 severity, not blocking)

---

## Evidence Trail

### GitHub PRs
- **PR #25867** - "Litellm day 0 opus 4.7 support" (merged April 16)
- **PR #25876** - "Litellm hotfix opus 4.7" (merged April 16, 7:19pm)
- **PR #24053** - "fix: added thinking and reasoning support for all claude 4+ models" (OPEN, documents root cause)

### GitHub Discussions
- **Discussion #22555** - "Day 0 Model Release Gaps" (documents the architectural problem)
  - Gap G4: Thinking/reasoning gated on hardcoded strings
  - Gap G13: Parallel tool use on Bedrock hardcoded

### Slack Thread
- **Channel:** #llms-engineering
- **Date:** April 17, 2026
- **Reporter:** User upgraded and saw cost spike on Haiku 4.5
- **Key quote:** "unsupported thinking metadata" errors
- **Confirmation:** Downgrade restored normal costs

### Greptile Reviews
Both PRs flagged by Greptile for:
- Hardcoded model checks (P2)
- Function name mismatch (P2)
- Redundant checks (P2)

All flagged as violating the "no-hardcode" design principle.

---

## Files Changed in Opus 4.7 PRs

Based on Greptile review of PR #25876:

1. `litellm/llms/anthropic/chat/transformation.py`
   - Added `_is_opus_4_7_model()`
   - Extended thinking/reasoning logic

2. `litellm/llms/anthropic/common_utils.py`
   - Added `_is_claude_4_7_model()`
   - Extended `_is_adaptive_thinking_model()`

3. `litellm/llms/bedrock/common_utils.py`
   - Extended `is_claude_4_5_on_bedrock()` with 4.7 patterns

4. `litellm/llms/bedrock/chat/converse_transformation.py`
   - Added Opus 4.7 to computer-use beta header selection

5. `litellm/llms/bedrock/messages/invoke_transformations/anthropic_claude3_transformation.py`
   - Extended `_supports_extended_thinking_on_bedrock()`

6. `model_prices_and_context_window.json`
   - Added Opus 4.7 entries with pricing and capabilities

7. `litellm/setup_wizard.py`
   - Added claude-opus-4-7 to model list

---

## Testing Strategy (for Hotfix)

```python
# Test 1: Verify Haiku 4.5 does NOT get thinking metadata
def test_haiku_45_no_thinking():
    model = "anthropic.claude-haiku-4-5-20251001-v1:0"
    assert not _supports_extended_thinking_on_bedrock(model)
    assert not is_thinking_enabled(model)

# Test 2: Verify Opus 4.7 DOES get thinking metadata  
def test_opus_47_has_thinking():
    model = "anthropic.claude-opus-4-7-20260416-v1:0"
    assert _supports_extended_thinking_on_bedrock(model)
    assert is_thinking_enabled(model)

# Test 3: Verify Haiku 4.6+ gets thinking (if supported)
def test_haiku_46_has_thinking():
    model = "anthropic.claude-haiku-4-6-20260101-v1:0"
    # Check JSON first!
    if supports_extended_thinking_in_json(model):
        assert _supports_extended_thinking_on_bedrock(model)

# Test 4: Verify no "unsupported thinking metadata" errors
def test_bedrock_haiku_45_request():
    model = "anthropic.claude-haiku-4-5-20251001-v1:0"
    response = make_bedrock_request(model, messages=[...])
    assert response.status_code == 200
    assert "unsupported" not in response.error_message
```

---

## Related Resources

### LiteLLM Documentation
- [Day 0 Model Release Gaps](https://github.com/BerriAI/litellm/discussions/22555)
- [Contributing Guide](https://docs.litellm.ai/docs/extras/contributing_code)

### Anthropic Resources  
- [Claude Opus 4.7 Announcement](https://www.anthropic.com/news/claude-opus-4-7) (April 16, 2026)
- [AWS Bedrock Opus 4.7](https://aws.amazon.com/blogs/aws/introducing-anthropics-claude-opus-4-7-model-in-amazon-bedrock/)

### External Analysis
- [Dev.to: Claude Opus 4.7 Migration Guide](https://dev.to/lavellehatcherjr/anthropic-releases-claude-opus-47-key-changes-and-migration-guide-for-developers-3an4)

---

## Contact

This investigation was conducted by Cursor Cloud Agent on April 17, 2026.

**For questions about this investigation:**
- Review the three documents linked above
- Check the Slack thread in #llms-engineering
- Review PRs #25867 and #25876 on GitHub

**For technical questions about the fix:**
- See [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md) → "Fix Strategy"
- See [Discussion #22555](https://github.com/BerriAI/litellm/discussions/22555) for architectural fix

---

## Status

- ✅ Investigation complete
- ✅ Root cause identified
- ✅ Fix strategies documented
- ⏳ Awaiting LiteLLM team implementation
- ⏳ Hotfix needed
- ⏳ Architectural fix needed

---

**Last Updated:** April 17, 2026  
**Investigation Branch:** `cursor/investigate-opus-4-7-haiku-regression-5249`
