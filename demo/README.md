# Conditional release rehearsal

`proof.txt` is the deterministic `file-sha256` condition used by the
simulation-only rehearsal. Its content is intentionally public and contains no
credential or transaction authorization.

Compute the approved digest with:

```bash
shasum -a 256 demo/proof.txt
```

Before the event execution window, `release prepare` may read this file and
call KeeperHub with strict `simulate: true`; `release execute` and cross-process
`release retry` remain hard-locked.
