import checkIcon from './assets/check.svg';
import './Toast.css';

export type ToastProps = {
  title: string;
  detail?: string;
};

/** Real (Figma node 1066-10's toast-copy-provenance) - a transient,
 * auto-dismissed confirmation toast. Currently only Copy provenance uses
 * this, but it's a standalone component (not inlined into Toolbar/App)
 * since a future tool showing its own confirmation would want the exact
 * same shell rather than a second hand-rolled one. */
export function Toast({ title, detail }: ToastProps) {
  return (
    <div className="toast" role="status">
      <div className="toast__check-wrap">
        <img src={checkIcon} alt="" />
      </div>
      <div className="toast__text-col">
        <p className="toast__title">{title}</p>
        {detail && <p className="toast__detail">{detail}</p>}
      </div>
    </div>
  );
}
