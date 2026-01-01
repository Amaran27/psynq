Standards and Regulatory Coverage (summary)

Goal: Ensure the CPaaS / CCAAS platform enforces industry standards by design. Include these compliance tasks in OpenProject (see CSV) and implement controls in code and infra.

Regulatory / Standards to consider (not exhaustive):
- HIPAA (US): Protect PHI. Design controls: encryption at rest (AES-256), TLS 1.2+/mTLS in transit, audit logs, BAA for any third-party hosting, access controls, data minimization, DSR handling.
- GDPR (EU): Data subject rights, retention, lawful basis, DSR handling, data portability, breach notification.
- TRAI (India): Telecom-specific rules (caller-id validation, retention periods, lawful interception), number masking rules for CPaaS providers in India.
- PCI-DSS: If handling payments or card data in any flows (maybe for billing), ensure tokenization and out-of-scope design.
- ISO 27001 / SOC2: For operational maturity; include controls and audit readiness tasks.

Design-by-default controls to include in work packages:
- Privacy & data classification: tag data types (PII, PHI, non-sensitive)
- Encryption: at rest and in transit (TLS + secure KMS)
- Least privilege & RBAC: SSO, role mapping, and audit trails
- Audit logging & retention: immutable logs, retention policy, and searchability
- Incident response & breach notification runbooks
- Data deletion workflows (soft delete + permanent purge)
- Vendor / BAA checks for third-party services (e.g., MinIO, hosting)
- Automated compliance checks in CI (static checks, policy-as-code)

Suggested immediate actions (already included in CSV tasks):
- Add Compliance Epic with HIPAA/GDPR/TRAI tasks
- Threat modeling across features
- Pen-test and remediation cycle scheduled before Release-1
- Include compliance acceptance criteria in DoD for security-sensitive tasks

If you want, I can expand the standards list and auto-generate detailed compliance checklists per regulation and per feature (e.g., call recordings retention & encryption requirements per region).