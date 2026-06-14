# readme-passive-osint

## What It Is

Tania built a passive OSINT (open source intelligence) CLI tool for aggregating publicly available information about a target domain without sending any active probes. The distinction matters: active scanning touches the target directly and can be detected, logged, or in some jurisdictions treated as unauthorised access. Passive OSINT uses only data that is already public — DNS records, WHOIS registration data, certificate transparency logs, and archived web content — to build a profile of the target's infrastructure footprint.

The tool is designed for defenders and security researchers. Its intended use cases are pre-engagement reconnaissance in authorised penetration tests, attack surface mapping for assets you own, and security posture audits before a product launch. The design choices at every layer reflect this intent — rate limiting against source APIs, no active network probing, and clear documentation of responsible use scope.

## CLI Architecture

Tania structured the tool as a subcommand CLI using Python's `argparse` module, with each reconnaissance category as its own subcommand: `dns`, `whois`, `certs`, and `summary`. The `summary` subcommand runs all of the above and aggregates the results into a single report, which is the typical entry point for a full engagement.

Each subcommand is implemented as an isolated module with a consistent interface: it takes a validated target domain as input and returns a structured dictionary of findings. The output layer handles formatting separately — results can be printed as plain text for terminal review or written as JSON for downstream tooling. This separation means the data collection logic is testable independently of the output format.

The tool respects `--output` for file destination, `--format` for output type, and `--timeout` for per-request ceilings. All network requests go through a shared session object with a configurable timeout and retry limit, so a slow external API does not block indefinitely.

## Design Decisions

Tania made a deliberate decision to restrict the tool to sources that require no authentication and produce no server-side access logs on the target. Certificate transparency logs are queried via crt.sh, which aggregates certificates issued for a domain and its subdomains — a technique commonly used by security teams to discover undocumented infrastructure. WHOIS data is retrieved from the authoritative registrar where possible, with a fallback to a public WHOIS aggregator.

DNS enumeration uses a wordlist-driven subdomain check against the public resolver rather than zone transfer attempts. Zone transfers are an active technique that requires server cooperation and can be logged; resolver-based enumeration is passive and mimics what any user on the internet can already see.

The tool does not store results between runs. Each invocation is stateless — there is no database, no session file, no persistent cache. This is a security decision: a tool designed to collect intelligence about systems should not accumulate that intelligence in a place where it could be exposed.

## Security and Responsibility

The tool ships with a `USAGE.md` that explicitly defines its scope: authorised use only, against assets you own or have written permission to assess. This is not performative — it is part of the design. Tania deliberately excluded techniques that cross the line into active scanning even when those techniques are technically straightforward to implement, because the tool's value is in being something a responsible security team can actually run.

Rate limiting is applied against all external APIs. The crt.sh and WHOIS endpoints have published usage policies; the tool enforces a configurable inter-request delay and retries with exponential backoff on 429 responses. This is both responsible API usage and a practical reliability decision — a tool that gets rate-banned mid-run is not useful in a time-sensitive engagement.

User-supplied domain input is validated against a strict allowlist pattern before any network requests are made. The domain must match a valid DNS label format; IP addresses, URLs with schemes, and paths are rejected. This prevents a class of injection where a crafted "domain" string could influence the constructed API request URL.

## Summary

Tania built a passive OSINT CLI tool in Python that aggregates publicly available intelligence — DNS records, WHOIS data, certificate transparency logs — about a target domain without making any active network probes to the target itself. The tool uses a subcommand architecture with isolated, testable modules for each data source and a separate output layer that supports plain text and JSON. Key design decisions include restricting collection to passive public sources only, stateless operation to avoid accumulating sensitive data at rest, rate limiting against external APIs to comply with usage policies, and strict input validation to prevent injection via crafted domain strings. The tool ships with an explicit responsible use scope document. It is designed for defenders: authorised penetration testers, security engineers mapping their own attack surface, and developers auditing their infrastructure before launch.
