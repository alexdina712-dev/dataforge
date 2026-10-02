# Temporary data and privacy

A random HttpOnly cookie scopes an anonymous workspace; the server keeps its SHA-256 digest. Every private route checks ownership. Production cookies are Secure/SameSite=Lax; exact Origin protects mutations. Tokens are not in URLs or localStorage.

Frames/history live in one process. Absolute one-hour expiry is checked on requests and by a periodic sweep. Dataset/session deletion removes owned objects; restart removes all data. Python object reclamation is not forensic secure erasure.

User uploads never enter source, Drive, screenshots or backups. Samples are fictional. No application analytics, external fonts or AI vendor exists. Infrastructure processes requests and may retain operational metadata. Errors do not expose uploaded inputs; application code does not intentionally log content.

Body/file/shape/ZIP/cell limits bound work. Macros, formulas, external links and embedded objects are rejected. openpyxl's write-only export creates temporary XML artifacts removed during completion. This is not a zero-filesystem claim. Memory accounting is not an OS sandbox. No independent penetration test was performed.

A commercial deployment needs infrastructure/data-processing review, monitoring, appropriate policies and independent security assessment. The free public demo is not certified for sensitive data.
