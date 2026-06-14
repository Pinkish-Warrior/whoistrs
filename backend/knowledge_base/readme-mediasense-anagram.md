# readme-mediasense-anagram

## What It Is

Tania built Anagram Grouper as a focused exercise in algorithmic design and memory-efficiency trade-offs — the kind of problem where the right solution depends entirely on the constraints, not just on whether the code is correct. The tool groups words from a file by their anagram signature: given a word list, it outputs clusters of words that share the same letters rearranged.

The project ships three separate implementations covering a spectrum of memory strategies, plus a smart dispatcher that selects the appropriate implementation automatically based on file size relative to available RAM. The implementations are tested against files ranging from 9 words to 30 million words (262 MB), and the scaling behaviour of each approach is measured and documented with a benchmarking script.

The naive approach is deliberately structured with no I/O side effects — pure logic that takes input and returns output — so it can slot directly into a FastAPI endpoint without refactoring. That interface decision was made before the code was written, not discovered afterwards.

## Architecture and Algorithm Design

The project is organised around a shared utility module, `signature.py`, which exports a single function: `make_signature()`. It converts any word to its canonical anagram key by sorting its letters. All three grouping implementations import this function. If the algorithm for generating signatures ever changes, it changes in exactly one place.

The naive implementation, `group_anagrams.py`, reads the entire file into a Python dictionary keyed by signature. It is fast and simple, but its memory footprint scales linearly with the word list. The external-sort implementation, `anagram_external_sort.py`, delegates the heavy lifting to the Unix `sort` command via subprocess. Because `sort` uses a merge-sort algorithm with disk spill, it can process files far larger than available RAM without loading them entirely into memory.

The smart dispatcher, `smart_anagram.py`, checks the file size against 15% of current free RAM before choosing. On macOS, free RAM is read from the system; on other platforms, a fixed 100 MB threshold is used as a conservative fallback. The threshold is conservative by design — it prefers the faster naive approach wherever it safely fits.

## Key Technical Decisions

Tania made the decision to extract `make_signature()` into its own module before writing any of the three grouping implementations. This is a small decision with a concrete consequence: every grouper is guaranteed to produce compatible output because they all use the same canonical key. It also means the shared logic has its own tests, independent of any particular grouping strategy.

The 15% RAM threshold in the smart dispatcher was chosen after running the `prove_scaling.py` script, which benchmarks naive versus external sort across word counts from 1,000 to 200,000. The crossover point — where the naive approach's memory usage becomes risky — informed the threshold. The decision is data-driven and documented, not a round number guess.

The test suite covers 47 cases across 6 modules: correctness, edge cases, subprocess failure paths (what happens when `sort` is unavailable), cross-platform fallback behaviour, and memory benchmarks. Writing tests for subprocess failure paths specifically was a deliberate investment — the external-sort implementation depends on an external binary, and that dependency needs to be handled gracefully.

## Security and Reliability Decisions

The external-sort implementation calls the Unix `sort` binary via `subprocess.run` with the file path passed as a list argument, not interpolated into a shell command string. This matters: a filename containing spaces, semicolons, or shell metacharacters would break a naive string-interpolated subprocess call and could be exploited to inject arbitrary commands. Using the list-form API passes arguments directly to the OS without shell interpretation, which eliminates the injection surface entirely.

The smart dispatcher validates that the input file exists before making any memory calculations or dispatching to a strategy. It fails fast with a clear error rather than attempting to process a missing or inaccessible file and producing a confusing failure downstream.

CI runs on every push via GitHub Actions. The badge in the README reflects live build status. With 47 tests covering correctness, edge cases, and platform-specific behaviour, the test suite catches regressions automatically before they reach the main branch.

The `anagram_scalability.py` file is explicitly documented as a learning artefact that should not be used in production — its memory characteristics are worse than the naive approach at scale. Clearly labelling experimental code rather than leaving it unlabelled is a discipline that matters in a shared codebase.

## Summary

Tania built Anagram Grouper in Python as a rigorous study in algorithmic trade-offs under real-world memory constraints. The project ships three implementations — naive dictionary, Unix `sort`-backed external sort, and a smart dispatcher — plus benchmarking tooling that proves how memory diverges with scale across 1,000 to 30 million words. Key decisions include extracting the shared signature function into its own tested module, using a data-driven 15% RAM threshold for the dispatcher, and calling subprocess with list-form arguments to eliminate shell injection risk. 47 tests cover correctness, edge cases, subprocess failure paths, and cross-platform fallback. The naive implementation is designed as pure logic with no I/O side effects so it can be called directly from a FastAPI endpoint without modification. CI runs on every push.
