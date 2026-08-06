/** Shared label formatting for FlatHUB's real field metadata - used by
 * CustomFieldsForm (flat axis pickers), CustomFilterTree (the nested
 * Filters tree), and CustomFilterValues (sidebar range sliders), so all
 * three render the exact same real title/units for a given field rather
 * than drifting. Split out of CustomFieldsForm.tsx specifically to avoid a
 * circular import (CustomFieldsForm -> CustomFilterTree -> this file, not
 * CustomFieldsForm <-> CustomFilterTree). */

// Real gap, only partially addressed: FlatHUB's own live schema sometimes
// returns `title`/`units`/`descr` as raw LaTeX (e.g. units
// "\(10^{10}M_\odot/h\)", or Group_BHMdot's own title "\(\dot{M}_{\rm
// BH}\)") - not sanitized server-side, and a full LaTeX renderer is out of
// scope here. Stripping just the outer `\( \)` delimiters removes the
// most visually-jarring part without risking mangling the many fields
// whose title/units are already plain text; the rarer inner macros
// (`\odot`, `_{\rm BH}`) can still leak through for a handful of fields.
export function stripLatexDelims(s: string): string {
  return s.replace(/^\\\(/, '').replace(/\\\)$/, '');
}

export function labelFromTitleUnits(title: string, units?: string): string {
  const t = stripLatexDelims(title);
  return units ? `${t} [${stripLatexDelims(units)}]` : t;
}
