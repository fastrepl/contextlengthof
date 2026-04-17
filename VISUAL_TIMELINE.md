# Visual Timeline: Opus 4.7 Regression

## The Story

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BEFORE OPUS 4.7                              │
│                    (v1.82.3-stable.patch.4)                         │
└─────────────────────────────────────────────────────────────────────┘

User Request: Haiku 4.5 on Bedrock
        │
        ↓
┌───────────────────────┐
│ is_claude_4_5_on_     │
│ bedrock()             │ → TRUE (has "haiku-4.5" pattern)
└───────────────────────┘
        │
        ↓
┌───────────────────────────┐
│ _supports_extended_       │
│ thinking_on_bedrock()     │ → FALSE (no "haiku-4" check)
└───────────────────────────┘
        │
        ↓
Request: NO thinking metadata
        │
        ↓
    ┌──────┐
    │ AWS  │ ✅ 200 OK
    │ API  │ → Normal response, normal cost
    └──────┘


┌─────────────────────────────────────────────────────────────────────┐
│                  AFTER OPUS 4.7 (April 16, 2026)                    │
│                    (v1.82.3-stable.opus-4.7)                        │
│                                                                      │
│  PRs #25867 & #25876 merged at 7:19pm                              │
└─────────────────────────────────────────────────────────────────────┘

User Request: Haiku 4.5 on Bedrock (SAME REQUEST!)
        │
        ↓
┌───────────────────────┐
│ is_claude_4_5_on_     │
│ bedrock()             │ → TRUE (has "haiku-4.5" pattern)
└───────────────────────┘                          ↑
        │                                          │
        ↓                                    ALSO NOW CHECKS
┌───────────────────────────┐                "opus-4.7" !!!
│ _supports_extended_       │                      │
│ thinking_on_bedrock()     │ → TRUE ❌ (NEW!)     │
│                           │   Added: if "claude-haiku-4" in model
│                           │          ↑
└───────────────────────────┘          │
        │                        MATCHES BOTH 4.5 AND 4.7!
        ↓
Request: WITH thinking metadata ❌
        │
        ↓
    ┌──────┐
    │ AWS  │ ❌ 400 Error
    │ API  │ → "unsupported thinking metadata"
    └──────┘
        │
        ↓
    Retry #1 ❌
        │
        ↓
    Retry #2 ❌
        │
        ↓
    Retry #3 ❌
        │
        ↓
    💰💰💰 Cost = 3x-5x normal!
```

---

## The Code Change That Broke It

### Before (v1.82.3-stable.patch.4)

```python
def _supports_extended_thinking_on_bedrock(model: str) -> bool:
    """Check if model supports extended thinking"""
    
    # Only checked specific models
    if "claude-3-7" in model:
        return True
    
    if "claude-sonnet-4-5" in model:
        return True
    
    if "claude-opus-4-5" in model:
        return True
        
    if "claude-opus-4-6" in model:
        return True
    
    # ❌ NO CHECK FOR "haiku-4" → Haiku 4.5 returns FALSE
    
    return False
```

**Result:** Haiku 4.5 does NOT get thinking metadata ✅

### After (v1.82.3-stable.opus-4.7)

```python
def _supports_extended_thinking_on_bedrock(model: str) -> bool:
    """Check if model supports extended thinking"""
    
    if "claude-3-7" in model:
        return True
    
    if "claude-sonnet-4" in model:  # ← BROADENED
        return True
    
    if "claude-opus-4" in model:  # ← BROADENED
        return True
    
    # 🚨 NEW: Added to support Haiku 4.6, 4.7, etc.
    if "claude-haiku-4" in model:  # ← THIS IS THE BUG!
        return True
        
    return False
```

**Result:** Haiku 4.5 DOES get thinking metadata ❌

**Why?** `"anthropic.claude-haiku-4-5-20251001-v1:0"` contains `"claude-haiku-4"`!

---

## Pattern Matching Visualization

```
Model Name: "anthropic.claude-haiku-4-5-20251001-v1:0"
                                  └─────┬────┘
                                        │
                              This matches "claude-haiku-4"!
                                        │
                                        ↓
                              Function returns TRUE
                                        │
                                        ↓
                              Thinking metadata added
                                        │
                                        ↓
                              Bedrock rejects ❌
```

### Models Affected by "claude-haiku-4" Pattern

```
✅ INTENDED TO MATCH:
   anthropic.claude-haiku-4-6-...  ✓
   anthropic.claude-haiku-4-7-...  ✓
   anthropic.claude-haiku-4-8-...  ✓

❌ ACCIDENTALLY MATCHED:
   anthropic.claude-haiku-4-5-...  ← BUG! Doesn't support thinking!
   anthropic.claude-haiku-4-0-...  ← If it existed
   anthropic.claude-haiku-4-1-...  ← If it existed
```

---

## User Impact Timeline

```
April 16, 2026
├─ 5:19pm  │ PR #25867 merged
├─ 7:19pm  │ PR #25876 merged (hotfix)
│          │ v1.82.3-stable.opus-4.7 released
└──────────┘

April 17, 2026
├─ [Time?] │ User upgrades from v1.82.3-stable.patch.4
│          │                  to v1.82.3-stable.opus-4.7
│          │
├─ [Time?] │ Cost spike begins
│          │ - Haiku 4.5 requests start failing
│          │ - Retries multiply costs
│          │ - User notices unusual spend
│          │
├─ [Time?] │ User downgrades back to patch.4
│          │ - Costs return to normal
│          │ - Confirms issue is with opus-4.7 version
│          │
├─ 7:32pm  │ User reports on Slack #llms-engineering
│          │ "saw a big increase in spend on Haiku 4.5 on Bedrock"
│          │ "errors about unsupported thinking metadata"
│          │
├─ 7:33pm  │ Krrish asks if patch went through CI/CD
├─ 7:42pm  │ Yuneng: "no not for opus 4.7"
├─ 7:43pm  │ Krrish: "i assume that would have prevented this"
├─ 7:44pm  │ Krrish: "can we fix this?"
│          │
├─ 7:47pm  │ Ishaan requests Cursor investigation
│          │ "can u investigate this, what caused it?"
│          │ "review the PRs added for day 0 launch"
│          │
└─ [Now]   │ Investigation complete
           │ Root cause identified
           │ Fix documented
```

---

## Cost Impact Calculation

### Normal Request (Before)

```
Request → Success (1 attempt)
Cost: 1x base cost
Example: $0.01
```

### Failed Request (After)

```
Request 1 → Fail (unsupported thinking metadata)
Request 2 → Fail (retry)
Request 3 → Fail (retry)

Cost: 3x base cost (minimum)
Example: $0.03

If fallback logic kicks in:
Cost: Could be 5x-10x depending on fallback behavior
```

### Volume Impact

If user processes:
- 1M tokens per day on Haiku 4.5
- Base cost: $0.40 per million input tokens
- Normal daily cost: $0.40

With regression:
- 3x multiplier (retries): $1.20/day → +$0.80/day
- 5x multiplier (fallback): $2.00/day → +$1.60/day

**Monthly impact:**
- 3x: +$24/month
- 5x: +$48/month

For high-volume users (100M tokens/day):
- 3x: +$2,400/month
- 5x: +$4,800/month

**This is why user noticed immediately!**

---

## The Cascade Effect

```
1. Anthropic announces Opus 4.7
   └→ April 16, 2026
      
2. LiteLLM rushes day 0 support
   └→ PRs #25867, #25876
      └→ Uses hardcoded checks (known anti-pattern)
         └→ Violates Discussion #22555 guidelines
            └→ Broadens patterns to catch all 4.x models
               └→ Accidentally catches Haiku 4.5
                  └→ Haiku 4.5 gets thinking metadata
                     └→ Bedrock rejects requests
                        └→ Retries kick in
                           └→ Costs multiply
                              └→ User reports issue
                                 └→ Investigation needed
```

---

## Why This Keeps Happening

### The Broken Foundation

```
                    ┌─────────────────────────┐
                    │  supports_reasoning()   │
                    │  (should work via JSON) │
                    └─────────────────────────┘
                              │
                              ↓
                    ❌ BROKEN FOR BEDROCK ❌
                    (provider name mismatch)
                              │
                              ↓
                    ┌─────────────────────────┐
                    │  Developers add         │
                    │  hardcoded workarounds  │
                    └─────────────────────────┘
                              │
                              ↓
                    ┌─────────────────────────┐
                    │  Workarounds use broad  │
                    │  pattern matching       │
                    └─────────────────────────┘
                              │
                              ↓
                    ┌─────────────────────────┐
                    │  Broad patterns catch   │
                    │  unintended models      │
                    └─────────────────────────┘
                              │
                              ↓
                    🐛 PRODUCTION REGRESSION 🐛
```

### The Cycle Repeats

```
Opus 4.5 Launch → Hardcoded checks → Issues
                         ↓
Opus 4.6 Launch → More hardcoded checks → Issues
                         ↓
Opus 4.7 Launch → Even more hardcoded checks → THIS ISSUE
                         ↓
                    BREAK THE CYCLE!
                    Fix supports_reasoning()
```

---

## The Fix

### Short-term (Hotfix)

```python
def _supports_extended_thinking_on_bedrock(model: str) -> bool:
    model_lower = model.lower()
    
    # ✅ STEP 1: Explicitly exclude 4.5
    if any(p in model_lower for p in [
        "haiku-4-5", "haiku_4_5", "haiku-4.5"
    ]):
        return False  # ← FIXES THE BUG!
    
    # ✅ STEP 2: Then check broader patterns
    if "claude-haiku-4" in model_lower:
        return True  # Now safe: 4.5 already excluded
    
    # ... rest of checks
```

### Long-term (Architectural)

```python
# FIX THE ROOT CAUSE
def _get_model_info_helper(model, custom_llm_provider):
    # ✅ Normalize Bedrock provider names
    if custom_llm_provider in ["bedrock", "bedrock_converse"]:
        info = _lookup(model, "bedrock_converse")
        if not info:
            info = _lookup(model, "bedrock")
        return info
    return _lookup(model, custom_llm_provider)

# THEN REMOVE ALL HARDCODED CHECKS
# Just use:
if supports_reasoning(model, provider):
    add_reasoning_params()
```

---

## Lessons for Future Launches

```
✅ DO:
  - Use JSON-based capability system
  - Run full CI/CD (no exceptions!)
  - Test affected models explicitly
  - Use explicit version checks
  - Follow architectural guidelines

❌ DON'T:
  - Use broad substring patterns
  - Add hardcoded model checks
  - Skip CI/CD for "simple" launches
  - Rush day 0 support
  - Ignore Greptile P2 warnings
```

---

**Investigation by:** Cursor Cloud Agent  
**Date:** April 17, 2026  
**Status:** Complete, awaiting LiteLLM team fix
