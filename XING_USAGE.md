# XING Profile Automation - Usage Guide

## Basic Usage

Run all entries from the beginning:
```bash
node xing.js
```

## Advanced Usage with Parameters

### Start from specific entry
```bash
# Start from entry #9 (since you already added 1-8)
node xing.js 9

# Start from entry #15
node xing.js 15
```

### Limit number of entries to process
```bash
# Process only 5 entries starting from the beginning
node xing.js 1 5

# Process 3 entries starting from entry #9
node xing.js 9 3
```

## Examples

Since you've already added entries 1-8, continue with:
```bash
# Add entries 9-23 (all remaining)
node xing.js 9

# Or add them in batches of 5 to avoid timeouts
node xing.js 9 5    # Adds entries 9-13
node xing.js 14 5   # Adds entries 14-18
node xing.js 19     # Adds entries 19-23
```

## Status Indicators

When running, the script shows:
- ✓ = Already processed (skipped)
- 📝 = Will be processed
- ⏭️ = Will be skipped (beyond max entries limit)

## Notes

- The browser stays open after completion for review
- Press Ctrl+C to exit
- A screenshot is saved as `xing-profile-updated.png` after each run
- If the script times out, just restart from where it left off using the entry number