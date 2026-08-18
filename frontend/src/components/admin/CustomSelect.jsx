import React, { useState, useRef, useEffect } from "react";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccione una opción",
  className = "",
  disabled = false,
  hideTrigger = false,
  open: controlledOpen,
  onToggle,
  menuAlign = "right",
  variant = "field",
}) {
  const [openState, setOpenState] = useState(false);
  const ref = useRef(null);
  const onToggleRef = useRef(onToggle);
  const open = controlledOpen ?? openState;

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  const selectedLabel =
    options.find((option) => option.value === value)?.label || placeholder;

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        if (onToggleRef.current) onToggleRef.current(false);
        else setOpenState(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`custom-select ${className}`}
      ref={ref}
      style={{
        position: "relative",
        width: variant === "popover" || hideTrigger ? "max-content" : "100%",
        display: "block",
      }}
    >
      {!hideTrigger && (
        <button
          type="button"
          className="custom-select-trigger"
          onClick={() => {
            if (!disabled) {
              if (onToggle) onToggle(!open);
              else setOpenState((prev) => !prev);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
        >
          <span>{selectedLabel}</span>
          <span className="custom-select-arrow">▾</span>
        </button>
      )}

      {open && (
        <ul
          className="custom-select-menu"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: variant === "popover" ? (menuAlign === "left" ? 0 : "auto") : (menuAlign === "left" ? 0 : "auto"),
            right: variant === "popover" ? (menuAlign === "left" ? "auto" : 0) : (menuAlign === "left" ? "auto" : 0),
            width: variant === "popover" || hideTrigger ? "max-content" : "100%",
            minWidth: variant === "popover" || hideTrigger ? "230px" : "100%",
            zIndex: 30,
            marginTop: 0,
            padding: "0.4rem",
            listStyle: "none",
            background: "#ffffff",
            border: "1px solid #d9e3f2",
            borderRadius: "14px",
            boxShadow: "0 16px 34px rgba(23, 39, 72, 0.14)",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`custom-select-option ${option.value === value ? "active" : ""} ${variant === "popover" ? "custom-select-option-popover" : ""}`}
              onClick={() => {
                onChange(option.value);
                if (onToggle) onToggle(false);
                else setOpenState(false);
              }}
              style={
                variant === "popover"
                  ? {
                      padding: "0.55rem 0.75rem",
                      borderRadius: "10px",
                      color: "#21314d",
                      cursor: "pointer",
                      background: "transparent",
                    }
                  : undefined
              }
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
