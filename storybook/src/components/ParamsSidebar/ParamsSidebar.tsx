import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './ParamsSidebar.css';

export type ParamsSidebarProps = {
  /** The statistic's own name, e.g. "SFR History". */
  title: string;
  /** Real fields are heterogeneous - SelectField, Slider, NumberStepper,
   * Checkbox, MultiSelect all appear in the real params panel depending on
   * the statistic (confirmed 2026-08-04 across multiple frames). ParamsSidebar
   * only owns the panel shell (title/divider/scroll/footer) - composing the
   * right fields for a given statistic is the caller's job, matching
   * STUDIO_PLAN.md's "only show controls a statistic actually consumes"
   * rule. This is the SCROLLABLE region - see `footer` for content that
   * must stay pinned below it. */
  children: ReactNode;
  /** Real (generalized 2026-08-06 from CustomSidebar's own original
   * per-component fix - every one of the other 12 sidebars hardcoded the
   * exact same trailing `<Button variant="secondary" onClick={onRemove}>
   * Remove plot</Button>` as a plain child, which is exactly the content a
   * user must always be able to reach even if `children` overflows -
   * pinned outside the scrollable area, never scrolling out of view. */
  footer?: ReactNode;
};

/** Real fix (2026-08-06, generalized from CustomSidebar's own 2026-08-05
 * fix - see that component's git history): a statistic with enough real
 * controls (many filter fields, a long field-tree, several sliders) can
 * genuinely overflow this panel's fixed-height column - previously that
 * silently bled past the sidebar's own bottom edge (or FlatHUB long field
 * names caused actual horizontal overflow, see CustomTab.css's own
 * 2026-08-06 fix). Every one of the ~13 real per-statistic sidebars shares
 * this shell, so the fix belongs here once, not copy-pasted per statistic -
 * CustomSidebar previously hand-rolled its own version of exactly this
 * scroll-wrap/fade/MutationObserver, now removed as a duplicate. */
export function ParamsSidebar({ title, children, footer }: ParamsSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    update();
    el.addEventListener('scroll', update);
    // A MutationObserver (not just scroll/resize) - this wrapper's own box
    // is sized by flexbox (`flex: 1 1 auto`), so it doesn't itself resize
    // when content grows/shrinks (adding a filter, expanding a tree group,
    // a field finishing its own async load); only its `scrollHeight` does.
    // A ResizeObserver alongside it catches size changes with no DOM
    // mutation at all (e.g. a custom font finishing load, the window
    // itself resizing).
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="params-sidebar">
      <div className="params-sidebar__header">
        <p className="params-sidebar__title">{title}</p>
        <div className="params-sidebar__divider" />
      </div>
      <div className="params-sidebar__scroll-wrap">
        <div className="params-sidebar__scroll" ref={scrollRef}>
          {children}
        </div>
        {canScrollMore && <div className="params-sidebar__fade" aria-hidden="true" />}
      </div>
      {footer && <div className="params-sidebar__footer">{footer}</div>}
    </div>
  );
}
