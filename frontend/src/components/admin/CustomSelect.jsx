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
}) {
  const [openState, setOpenState] = useState(false);
  const ref = useRef(null);
  const open = controlledOpen ?? openState;

  const selectedLabel =
    options.find((option) => option.value === value)?.label || placeholder;

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        if (onToggle) onToggle(false);
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
      style={{ position: "relative", width: "100%" }}
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
            left: menuAlign === "left" ? 0 : "auto",
            right: menuAlign === "left" ? "auto" : 0,
            width: "100%",
            zIndex: 30,
          }}
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`custom-select-option ${option.value === value ? "active" : ""}`}
              onClick={() => {
                onChange(option.value);
                if (onToggle) onToggle(false);
                else setOpenState(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
