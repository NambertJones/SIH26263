import React from 'react';

/** Standard site footer. The affiliation line stays so the site is never mistaken for a government portal. */
export const FOOTER_TEXT =
  '© 2026 APAAR ReconX · Smart India Hackathon 2026 (SIH26263) · Not affiliated with AICTE or the APAAR programme.';

export const SiteFooter: React.FC = () => (
  <footer className="w-full border-t border-slate-200 bg-white text-slate-500 text-[11px] px-4 py-3 text-center">
    {FOOTER_TEXT}
  </footer>
);
