import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './ParamsSidebar.css';

export type ParamsSidebarProps = {
  /** The statistic's name, for example "SFR History". */
  title: string;
  /**
   * The statistic's controls, in display order. This region scrolls. Fields are
   * heterogeneous by design: compose whichever of SelectField, Slider,
   * NumberStepper, Checkbox, Radio and MultiSelect the statistic consumes.
   */
  children: ReactNode;
  /**
   * Pinned below the scroll region and never scrolled out of view. In every
   * current caller this is the Remove plot button.
   */
  footer?: ReactNode;
};

/**
 * The shell every statistic sidebar shares: title, divider, a scrolling
 * control region with a bottom fade, and a pinned footer.
 */
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
