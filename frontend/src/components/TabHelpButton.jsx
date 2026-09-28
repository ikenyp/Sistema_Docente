import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import "../styles/tab-help.css";

function TabHelpButton({ title, description, items = [], steps }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [multipleTargets, setMultipleTargets] = useState(false);
  const ref = useRef(null);
  const popoverRef = useRef(null);
  const [popoverHeight, setPopoverHeight] = useState(0);
  const guide = steps?.length ? steps : [{ title, description, items }];
  const current = guide[step] || guide[0];

  useEffect(() => {
    const closeOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (!open || !current.target) {
      setTargetRect(null);
      setMultipleTargets(false);
      return undefined;
    }
    setPopoverHeight(0);
    const targetNames = Array.isArray(current.target) ? current.target : [current.target];
    const targets = targetNames.flatMap((name) =>
      Array.from(document.querySelectorAll(`[data-help-target="${name}"]`)),
    );
    if (!targets.length) {
      setMultipleTargets(false);
      return undefined;
    }
    const firstRect = targets[0].getBoundingClientRect();
    const minimumTargetTop = 280;
    if (firstRect.top < minimumTargetTop && window.scrollY > 0) {
      window.scrollTo({
        top: Math.max(0, window.scrollY - (minimumTargetTop - firstRect.top)),
        behavior: "auto",
      });
    } else if (firstRect.top > window.innerHeight) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + firstRect.top - (window.innerHeight - 300)),
        behavior: "auto",
      });
    } else if (firstRect.bottom < 0) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + firstRect.bottom - 24),
        behavior: "auto",
      });
    }
    setMultipleTargets(targets.length > 1);
    if (targets.length === 1) {
      targets[0].classList.add("tab-help-active-target");
    } else {
      targets.forEach((target) => {
        target.classList.remove("tab-help-active-target");
        target.classList.add("tab-help-group-target");
      });
    }
    let autoScrolled = false;
    const update = () => {
      const firstRect = targets[0].getBoundingClientRect();
      const completelyOutside = firstRect.bottom < 0 || firstRect.top > window.innerHeight;
      const targetTooLow = firstRect.top > window.innerHeight - 300;
      if (!autoScrolled && (completelyOutside || targetTooLow)) {
        autoScrolled = true;
        if (targetTooLow && !completelyOutside) {
          window.scrollTo({ top: Math.max(0, window.scrollY + firstRect.top - (window.innerHeight - 300)), behavior: "auto" });
        } else {
          window.scrollTo({ top: Math.max(0, window.scrollY + firstRect.top - (window.innerHeight - 300)), behavior: "auto" });
        }
      }
      const rects = targets.map((target) => target.getBoundingClientRect());
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      setTargetRect({ left, top, right, bottom, width: right - left, height: bottom - top });
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      targets.forEach((target) => target.classList.remove("tab-help-active-target"));
      targets.forEach((target) => target.classList.remove("tab-help-group-target"));
      window.removeEventListener("resize", update);
    };
  }, [current, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    setPopoverHeight(popoverRef.current.getBoundingClientRect().height);
  }, [current, open, targetRect]);

  const close = () => {
    setOpen(false);
    setStep(0);
  };
  const popoverStyle = targetRect
    ? (() => {
      const cardHeight = popoverHeight || 250;
      const below = targetRect.bottom + 12;
      const spaceAbove = targetRect.top - 12;
      const top = spaceAbove >= cardHeight
        ? targetRect.top - cardHeight - 12
        : Math.min(below, window.innerHeight - cardHeight - 16);
      return {
        top,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 332)),
        visibility: popoverHeight || !targetRect ? "visible" : "hidden",
      };
    })()
    : undefined;

  return (
    <span className="tab-help" ref={ref}>
      <button
        type="button"
        className="tab-help-trigger"
        aria-label={`Ayuda sobre ${title}`}
        aria-expanded={open}
        onClick={() => { setStep(0); setOpen((value) => !value); }}
      >
        <CircleHelp size={17} />
      </button>
      {open && (
        <>
          {multipleTargets && targetRect && (
            <span
              className="tab-help-focus-box"
              style={{ top: targetRect.top - 5, left: targetRect.left - 5, width: targetRect.width + 10, height: targetRect.height + 10 }}
              aria-hidden="true"
            />
          )}
          <div ref={popoverRef} className={`tab-help-popover${targetRect ? " tab-help-popover-contextual" : ""}`} style={popoverStyle} role="dialog" aria-label={`Ayuda sobre ${title}`}>
          <div className="tab-help-popover-header">
            <strong>{title}</strong>
            <button type="button" className="tab-help-close" aria-label="Cerrar ayuda" onClick={close}>
              <X size={15} />
            </button>
          </div>
          <p>{current.description}</p>
          {current.items?.length > 0 && (
            <ul>{current.items.map((item) => <li key={item}>{item}</li>)}</ul>
          )}
          {guide.length > 1 && <div className="tab-help-progress">Paso {step + 1} de {guide.length}</div>}
          {guide.length > 1 && <div className="tab-help-actions">
            {step > 0 && <button type="button" onClick={() => setStep((value) => value - 1)}>Atrás</button>}
            {step < guide.length - 1 ? <button type="button" onClick={() => setStep((value) => value + 1)}>Siguiente</button> : <button type="button" onClick={close}>Entendido</button>}
          </div>}
          </div>
        </>
      )}
    </span>
  );
}

export default TabHelpButton;
