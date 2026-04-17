# Investigation: Opus 4.7 Day 0 Launch Regression - Haiku 4.5 Cost Spike on Bedrock

## Issue Summary

**Reported by:** User on Slack (#llms-engineering)  
**Date:** April 17, 2026  
**Versions affected:**
- **Working:** `v1.82.3-stable.patch.4`
- **Broken:** `v1.82.3-stable.opus-4.7`

### Symptoms
- Upgrade from `v1.82.3-stable.patch.4` to `v1.82.3-stable.opus-4.7` caused a **significant cost spike** on Haiku 4.5 on Bedrock
- Downgrade restored normal costs
- Errors reported: **"unsupported thinking metadata"**
- The issue affects Haiku 4.5 specifically, not Opus 4.7

---

## Investigation Findings

### 1. Opus 4.7 Day 0 Launch PRs

**PR #25867** - "Litellm day 0 opus 4.7 support" (merged into main via PR #25876)
- **Merged:** April 16, 2026
- **Changes:** Added Claude Opus 4.7 support across all providers (Anthropic direct, Bedrock, Vertex AI, Azure AI)

**PR #25876** - "Litellm hotfix opus 4.7" (merged April 16, 2026)
- **Purpose:** Hotfix for Opus 4.7 support
- **Key changes (per Greptile review):**
  - Added `_is_opus_4_7_model()` and `_is_claude_4_7_model()` functions
  - Extended `_is_adaptive_thinking_model()` to include Opus 4.7
  - Updated `is_claude_4_5_on_bedrock()` to include Opus 4.7 patterns
  - Added Opus 4.7 to `_supports_extended_thinking_on_bedrock()`
  - Added model entries to `model_prices_and_context_window.json`

### 2. Root Cause: Hardcoded Model Checks Violating Design Principles

#### The Architectural Problem

LiteLLM has documented "Day 0 Model Release Gaps" (GitHub Discussion #22555) which explicitly identifies the problem:

**Gap G4 (Anthropic):**
> "Thinking/reasoning gated on hardcoded Claude version strings"
> 
> File: `litellm/llms/anthropic/chat/transformation.py:172–210`
> 
> `_is_claude_4_6_model()` and similar checks control whether `thinking` blocks and `budget_tokens` are sent. Any Claude 5.x model added only to JSON will silently get thinking stripped out.

**Gap G13 (Bedrock):**
> "Parallel tool use on Bedrock gated on hardcoded Claude 4.5/4.6 patterns"
> 
> File: `litellm/llms/bedrock/common_utils.py:462–490`
> 
> `is_claude_4_5_on_bedrock()` controls whether `parallel_tool_use` is enabled. Claude 5.x models on Bedrock will have features silently disabled until this list is updated.

#### What Happened with Opus 4.7

When Opus 4.7 support was added:

1. **Extended existing hardcoded checks** - Added "opus-4.7", "opus_4_7", "opus-4-7", "opus_4_7" patterns to functions like:
   - `is_claude_4_5_on_bedrock()` (which now covers 4.5, 4.6, AND 4.7 despite its name)
   - `_supports_extended_thinking_on_bedrock()`
   - `_is_adaptive_thinking_model()`

2. **Broad substring matching** - Some checks use broad patterns like:
   - `"claude-3-7"` in model
   - `"claude-sonnet-4"` in model
   - `"claude-opus-4"` in model
   - `"claude-haiku-4"` in model

### 3. The Haiku 4.5 Cost Spike Root Cause

#### Hypothesis 1: Thinking Metadata Incorrectly Sent to Haiku 4.5

**Most likely cause:** The broad substring checks or function extensions added for Opus 4.7 are now causing thinking/reasoning metadata to be sent to Haiku 4.5 models that don't support it (or support it differently), resulting in:

1. **API errors** - Bedrock rejecting requests with "unsupported thinking metadata"
2. **Retries** - LiteLLM retrying failed requests, increasing costs
3. **Fallback behavior** - Potentially using different (more expensive) code paths

#### Evidence from PR #24053 (Open, Not Merged)

PR #24053 attempted to add thinking support for all Claude 4+ models on Bedrock (including Haiku 4.5) but was flagged by Greptile as violating design principles:

> "The correct approach is to let `supports_reasoning()` (backed by `model_prices_and_context_window.json`) be the single source of truth... The real problem is that `supports_reasoning()` fails for Bedrock models due to a provider/cost-map key mismatch."

**The core bug:** `supports_reasoning()` doesn't work properly for Bedrock because:
- Model entries use `litellm_provider: "bedrock_converse"` or `litellm_provider: "bedrock"`
- But lookups use `custom_llm_provider: "bedrock"` or `"bedrock_converse"`
- The mismatch causes `supports_reasoning()` to return `False` even when the model supports it

#### Hypothesis 2: Function Name/Scope Mismatch

From Greptile review of PR #25876:

> "`is_claude_4_5_on_bedrock` now covers 4.5, 4.6, *and* 4.7 model families. The name and docstring are misleading to any caller."

**Risk:** If `is_claude_4_5_on_bedrock()` is used to gate Bedrock-specific thinking behavior, adding Opus 4.7 patterns might have inadvertently changed behavior for other Claude 4.x models (including Haiku 4.5).

### 4. Specific Code Locations to Investigate

Based on the analysis, these files likely contain the bug:

1. **`litellm/llms/bedrock/common_utils.py`**
   - `is_claude_4_5_on_bedrock()` - Extended to include Opus 4.7 patterns
   - Line 565-597 per Greptile review

2. **`litellm/llms/anthropic/chat/transformation.py`**
   - `_is_opus_4_7_model()` and thinking/reasoning logic
   - Lines 172-210, 237-248 per Gap G4 and Greptile review

3. **`litellm/llms/bedrock/messages/invoke_transformations/anthropic_claude3_transformation.py`**
   - `_supports_extended_thinking_on_bedrock()` - Extended to include Opus 4.7
   - May have incorrect logic for Haiku 4.5

4. **`litellm/llms/bedrock/chat/converse_transformation.py`**
   - `get_supported_openai_params()` with hardcoded substring checks
   - Lines 565-580 per PR #24053 review

### 5. Why Downgrading Fixed It

The previous version (`v1.82.3-stable.patch.4`) likely had:
- **More conservative checks** - Thinking metadata only sent to models explicitly known to support it
- **Narrower pattern matching** - Only Opus 4.5/4.6 covered, not all Claude 4.x
- **No Opus 4.7 extensions** - The functions weren't modified to include new patterns

---

## Reproduction Scenario

1. User makes request to Bedrock with Haiku 4.5 model
2. LiteLLM routes through Bedrock provider
3. **Bug trigger:** One of these happens:
   - `is_claude_4_5_on_bedrock()` returns `True` for Haiku 4.5 due to broad pattern matching
   - Substring check `"claude-haiku-4" in model` matches Haiku 4.5
   - Thinking metadata is added to request
4. Bedrock API returns error: "unsupported thinking metadata"
5. LiteLLM retries or uses fallback logic
6. **Cost spike:** Multiple retries or expensive fallback code path

---

## Recommended Investigation Steps for LiteLLM Team

1. **Check git diff between versions:**
   ```bash
   git diff v1.82.3-stable.patch.4..v1.82.3-stable.opus-4.7 -- \
     litellm/llms/bedrock/common_utils.py \
     litellm/llms/anthropic/chat/transformation.py \
     litellm/llms/bedrock/messages/invoke_transformations/anthropic_claude3_transformation.py
   ```

2. **Test Haiku 4.5 on Bedrock with thinking parameters:**
   - Send request with `thinking` or `reasoning_effort` params
   - Verify if Bedrock rejects it with "unsupported thinking metadata"

3. **Review function scope:**
   - Audit `is_claude_4_5_on_bedrock()` call sites
   - Check what behavior is gated by this function
   - Verify if Opus 4.7 addition affected Haiku 4.5 logic

4. **Check model capability flags:**
   - Review `model_prices_and_context_window.json` entries for Haiku 4.5
   - Verify `supports_reasoning`, `supports_extended_thinking`, etc.
   - Ensure Haiku 4.5 is correctly marked (likely should NOT have these flags)

---

## Recommended Fixes

### Short-term Fix (Hotfix)
Ensure Haiku 4.5 is explicitly excluded from thinking/reasoning metadata logic:
- Add explicit checks: `if "haiku-4-5" in model: return False` before broad Claude 4.x checks
- Or narrow the patterns in `is_claude_4_5_on_bedrock()` to only match 4.5/4.6/4.7 Opus and Sonnet

### Long-term Fix (Architectural)
Implement the fix described in Discussion #22555:

1. **Fix `supports_reasoning()` for Bedrock:**
   - Normalize provider names in `_get_model_info_helper()` or `_supports_factory()`
   - Handle `"bedrock"` vs `"bedrock_converse"` mismatch
   - Make `model_prices_and_context_window.json` the single source of truth

2. **Remove hardcoded model checks:**
   - Delete `_is_claude_4_6_model()`, `_is_opus_4_7_model()`, etc.
   - Replace with `supports_reasoning(model, provider)` calls
   - Let JSON entries drive behavior

3. **Add proper capability flags to JSON:**
   - `supports_extended_thinking`
   - `supports_adaptive_thinking`
   - `supports_reasoning_effort`
   - `supports_xhigh_reasoning_effort`

---

## Related Issues & Context

- **GitHub Discussion #22555** - "Day 0 Model Release Gaps" (documents the architectural problem)
- **PR #24053** (Open) - "fix: added thinking and reasoning support for all claude 4+ models on bedrock"
  - Flagged for violating no-hardcode policy
  - Shows the root cause in `supports_reasoning()` provider mismatch
- **PR #25867** - "Litellm day 0 opus 4.7 support" (merged)
- **PR #25876** - "Litellm hotfix opus 4.7" (merged April 16, 2026)
- **Anthropic Opus 4.7 Announcement** - April 16, 2026

---

## Conclusion

The Opus 4.7 day 0 launch PRs extended hardcoded model checks (known anti-pattern) to support the new model. This likely caused unintended side effects for Haiku 4.5 on Bedrock:

1. **Thinking metadata incorrectly sent** to Haiku 4.5 models
2. **Bedrock API rejections** with "unsupported thinking metadata" errors
3. **Retry storms** or expensive fallback logic
4. **Cost spike** observed by users

The root cause is the architectural pattern of hardcoded model checks instead of using the model capability JSON as the single source of truth, combined with the `supports_reasoning()` function not working correctly for Bedrock providers.

**Immediate action needed:** Revert or patch the Opus 4.7 changes to explicitly exclude Haiku 4.5 from thinking/reasoning metadata logic.

**Follow-up action:** Implement the architectural fix described in Discussion #22555 to prevent this category of bugs in future model releases.
