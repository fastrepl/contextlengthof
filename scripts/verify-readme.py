from pathlib import Path


readme = Path(__file__).resolve().parents[1] / "README.md"
content = readme.read_text()

expected = (
    "[App.svelte](https://github.com/fastrepl/contextlengthof/blob/main/src/App.svelte) "
    "contains the main app code."
)

if expected not in content:
    raise SystemExit(
        "README should describe App.svelte as containing the main app code."
    )

if "is all you need to edit" in content:
    raise SystemExit("README should not imply App.svelte is always the only file to edit.")

print("PASS: README clearly describes App.svelte.")
