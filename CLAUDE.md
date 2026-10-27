# APAAR ReconX (SIH26263)

The project specification is `docs/spec.md`. Read it before planning any change.

- Truthfulness, privacy and security rules in the spec (§5, §12, §17.2, §18, §21) override existing code; otherwise preserve existing code and conventions (§0.1).
- Work P0 items before P1, P1 before P2 (§2). Track progress in `docs/status.md`.
- All status values come from Appendix A of the spec — no synonyms.
- Synthetic data only. Never commit `.env` or real student data.
- Backend tests: `cd backend && pytest -q`.
