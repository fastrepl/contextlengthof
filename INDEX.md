# Investigation Index

## Quick Navigation

### 🚀 Start Here
- **[INVESTIGATION_README.md](./INVESTIGATION_README.md)** - Overview of all documents

### 📋 Executive Summary  
- **[SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md)** - Quick TL;DR for team (5 min read)

### 🔍 Full Investigation
- **[INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md](./INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md)** - Complete analysis (15 min read)

### 💻 Technical Deep-Dive
- **[CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md)** - Code patterns & fixes (20 min read)

### 📊 Visual Explanation
- **[VISUAL_TIMELINE.md](./VISUAL_TIMELINE.md)** - Diagrams & timeline (10 min read)

---

## Reading Paths

### Path 1: Quick Brief (10 minutes)
1. [INVESTIGATION_README.md](./INVESTIGATION_README.md) - Overview
2. [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - Action items

**Result:** Understand what happened and what needs to be done.

### Path 2: Implementation (30 minutes)
1. [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - Context
2. [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md) - Specific fixes
3. [VISUAL_TIMELINE.md](./VISUAL_TIMELINE.md) - Before/after comparison

**Result:** Ready to implement the hotfix.

### Path 3: Complete Understanding (60 minutes)
1. [INVESTIGATION_README.md](./INVESTIGATION_README.md) - Start here
2. [VISUAL_TIMELINE.md](./VISUAL_TIMELINE.md) - See the timeline
3. [INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md](./INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md) - Full details
4. [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md) - Technical depth
5. [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - Action plan

**Result:** Complete context for planning long-term fix.

---

## Documents by Audience

### For Engineering Managers
- [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - What happened, impact, action items
- [VISUAL_TIMELINE.md](./VISUAL_TIMELINE.md) - Timeline and cost impact

### For Developers Implementing Fix
- [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md) - Exact code changes needed
- [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - Files to modify

### For Architects Planning Long-term Fix
- [INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md](./INVESTIGATION_OPUS_4_7_HAIKU_REGRESSION.md) - Root cause analysis
- [CODE_PATTERNS_ANALYSIS.md](./CODE_PATTERNS_ANALYSIS.md) - Architectural fix strategy

### For Customer Success / Support
- [VISUAL_TIMELINE.md](./VISUAL_TIMELINE.md) - What customers experienced
- [SUMMARY_FOR_TEAM.md](./SUMMARY_FOR_TEAM.md) - Timeline of events

---

## Key Findings Summary

### The Issue
Upgrading from `v1.82.3-stable.patch.4` to `v1.82.3-stable.opus-4.7` caused cost spikes on Haiku 4.5 Bedrock due to "unsupported thinking metadata" errors.

### Root Cause
Broad pattern matching (`"claude-haiku-4" in model`) added for Opus 4.7 support inadvertently matched Haiku 4.5, causing thinking metadata to be sent to models that don't support it.

### Immediate Fix
Explicitly exclude Haiku 4.5 before checking broader Claude 4.x patterns.

### Long-term Fix
Fix `supports_reasoning()` provider name mismatch and remove all hardcoded model version checks.

---

## Files to Review in LiteLLM Repo

Priority order:

1. **`litellm/llms/bedrock/common_utils.py`**
   - Function: `is_claude_4_5_on_bedrock()`
   - Lines: 565-597

2. **`litellm/llms/bedrock/messages/invoke_transformations/anthropic_claude3_transformation.py`**
   - Function: `_supports_extended_thinking_on_bedrock()`

3. **`litellm/llms/anthropic/chat/transformation.py`**
   - Functions: `_is_opus_4_7_model()`, thinking logic
   - Lines: 172-210, 237-248

4. **`litellm/llms/bedrock/chat/converse_transformation.py`**
   - Function: `get_supported_openai_params()`
   - Lines: 565-580

---

## Related GitHub Resources

### PRs
- [#25867](https://github.com/BerriAI/litellm/pull/25867) - Day 0 Opus 4.7 support (merged)
- [#25876](https://github.com/BerriAI/litellm/pull/25876) - Opus 4.7 hotfix (merged April 16)
- [#24053](https://github.com/BerriAI/litellm/pull/24053) - Claude 4+ thinking support (open)

### Discussions
- [#22555](https://github.com/BerriAI/litellm/discussions/22555) - Day 0 Model Release Gaps

### Issues
Referenced in investigation but no specific issue filed yet for this regression.

---

## Timeline

- **April 16, 2026 5:19pm** - PR #25867 merged
- **April 16, 2026 7:19pm** - PR #25876 merged, v1.82.3-stable.opus-4.7 released
- **April 17, 2026 7:32pm** - User reports cost spike on Slack
- **April 17, 2026 7:47pm** - Investigation requested
- **April 17, 2026 [Now]** - Investigation complete

---

## Next Steps

- [ ] LiteLLM team validates findings
- [ ] Deploy immediate hotfix
- [ ] Notify affected users
- [ ] Plan architectural fix
- [ ] Update CI/CD requirements
- [ ] Document lessons learned

---

**Investigation Status:** ✅ Complete  
**Branch:** `cursor/investigate-opus-4-7-haiku-regression-5249`  
**Created by:** Cursor Cloud Agent  
**Date:** April 17, 2026
