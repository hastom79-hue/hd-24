# HD-24 future-month horizon hardening

Purpose: fail closed when a mapped Actual row contains a numeric month later than the plant's dominant latest month. The current valid July source profile must remain accepted (India: mostly July with a small June tail; Brazil: July).

Implementation target: `safe-kpi-mapping.js`, plus cache-bust loader updates.
