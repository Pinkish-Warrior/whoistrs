# readme-rust-game-server

## What It Is

Tania built a multiplayer game server in Rust as a deliberate exercise in systems-level engineering — the kind of project where every design decision about memory, concurrency, and failure modes is visible in the code. The goal was not to ship a commercial product but to prove competency in a language that exposes what other languages hide: ownership, borrowing, lifetime guarantees, and zero-cost abstractions.

The server handles concurrent client connections over TCP, maintains shared game state across threads, and is designed to degrade gracefully rather than crash under load. Rust's ownership model makes the concurrency story provable at compile time — there are no data races that can sneak into production because the compiler refuses to build code that allows them.

The project deliberately avoids game-specific complexity in favour of making the infrastructure story clear: connection management, message serialisation, broadcast logic, and graceful shutdown handling are the things Tania cared about demonstrating.

## Architecture and Concurrency Model

The server is built on Tokio, Rust's async runtime, using an asynchronous task-per-connection model. Each client connection is handled in its own Tokio task, which is lightweight compared to an OS thread and allows the server to handle a large number of concurrent connections without proportionally increasing memory consumption.

Shared game state is held behind an `Arc<Mutex<>>` — an atomic reference-counted pointer wrapping a mutex-guarded state struct. Tasks acquire the lock only for the minimum duration needed, reducing contention. Tania chose this over message-passing channels for this project because the state access patterns were read-heavy and point-in-time, not stream-based.

Client messages are length-prefixed and serialised with `serde_json`. The framing prevents the partial-read problem inherent in TCP streams, where a single logical message may arrive across multiple packets. The deserialisation layer validates message shape before passing anything into game logic.

## Key Technical Decisions

Tania chose Rust over Go for this project specifically because Go's garbage collector, while low-latency, introduces non-deterministic pauses. In a game server context, even a 5ms GC pause can cause dropped frames or desync events that are visible to players. Rust has no runtime GC — memory is freed deterministically when values go out of scope — which makes latency predictable rather than statistical.

The server implements exponential backoff on reconnection attempts from the client side, with a cap at 30 seconds. This prevents thundering herd behaviour if the server restarts during an active session: all clients do not attempt reconnection simultaneously.

Graceful shutdown is handled via a `CancellationToken` from the `tokio-util` crate. When SIGTERM is received, the server stops accepting new connections, drains in-flight messages on existing connections, and exits cleanly rather than dropping clients mid-session.

## Security and Reliability Decisions

Tania applied several hardening decisions beyond the minimum needed for a working server. All incoming messages have a maximum byte length enforced before deserialisation — this blocks a category of denial-of-service attack where a client sends a malformed or oversized payload to exhaust allocator memory.

Client IDs are generated server-side using a secure random UUID on connection establishment, not derived from or influenced by client-supplied input. This prevents ID spoofing and ensures the server, not the client, controls session identity.

Rust's type system eliminates entire classes of memory vulnerabilities by construction: buffer overflows, use-after-free, and null pointer dereferences are not possible in safe Rust. This is not just a theoretical property — it means the attack surface for memory corruption exploits, which account for a large proportion of CVEs in C and C++ server software, does not exist.

Connection limits are enforced at the server level. If the active connection count exceeds a configured threshold, new connection attempts are rejected with a clean error rather than silently queued — preventing resource exhaustion under spike traffic.

## Summary

Tania built a Rust multiplayer game server using Tokio's async runtime to demonstrate systems-level engineering competency in a language where memory, concurrency, and failure modes are first-class design concerns. Each client connection runs in its own Tokio task; shared state is protected by `Arc<Mutex<>>` with minimal lock duration; messages are length-prefixed and validated before touching game logic. Key decisions include choosing Rust over Go to eliminate GC-induced latency jitter, implementing exponential backoff for reconnection, and using cancellation tokens for graceful shutdown. Security hardening includes server-side session identity, message size enforcement, and connection limits. The project is a direct demonstration of the principle that reliability is designed in, not added later.
