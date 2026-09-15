import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

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
  menuMaxHeight = 260,
  searchable = false,
  searchPlaceholder = "Buscar...",
}) {
  const [openState, setOpenState] = useState(false);
  const [search, setSearch] = useState("");
  const [menuVisibleHeight, setMenuVisibleHeight] = useState(menuMaxHeight);
  const [menuRect, setMenuRect] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const onToggleRef = useRef(onToggle);
  const open = controlledOpen ?? openState;
  const menuThemeClass = className.includes("custom-select-white") ? "custom-select-menu-white" : "custom-select-menu-default";
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  const selectedLabel =
    selectedOption?.label || placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const term = search.trim().toLowerCase();
    return options.filter((option) =>
      String(option.label || "").toLowerCase().includes(term),
    );
  }, [options, search, searchable]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideTrigger = ref.current && ref.current.contains(event.target);
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsideMenu) {
        if (onToggleRef.current) onToggleRef.current(false);
        else setOpenState(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  useLayoutEffect(() => {
    if (!open || !ref.current) return undefined;

    const updatePlacement = () => {
      const trigger = ref.current?.querySelector(".custom-select-trigger");
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceBelow = Math.max(0, viewportHeight - rect.bottom - 12);

      const availableHeight = Math.max(48, Math.min(menuMaxHeight, spaceBelow));

      setMenuVisibleHeight(availableHeight);
      setMenuRect(rect);
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, menuMaxHeight]);

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
          <span className="custom-select-trigger-label">{selectedLabel}</span>
          {selectedOption?.badge && (
            <span className={`custom-select-option-badge ${selectedOption.badge === "Gestionable" ? "is-managed" : "is-readonly"}`}>
              {selectedOption.badge}
            </span>
          )}
          <span className="custom-select-arrow">▾</span>
        </button>
      )}

      {open && menuRect && typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={menuRef}
            className={`custom-select-menu ${menuThemeClass}`}
            role="listbox"
            style={{
              position: "fixed",
              top: `${menuRect.bottom + 6}px`,
              left:
                variant === "popover"
                  ? menuAlign === "left"
                    ? `${menuRect.left}px`
                    : "auto"
                  : `${menuRect.left}px`,
              right:
                variant === "popover"
                  ? menuAlign === "left"
                    ? "auto"
                    : `${Math.max(12, window.innerWidth - menuRect.right)}px`
                  : "auto",
              width: `${menuRect.width}px`,
              minWidth: variant === "popover" || hideTrigger ? "230px" : `${menuRect.width}px`,
              zIndex: 3000,
              marginTop: 0,
              padding: "0.4rem",
              listStyle: "none",
              maxHeight: `${menuVisibleHeight}px`,
              overflowY: "auto",
            }}
          >
            {searchable && (
              <li style={{ position: "sticky", top: 0, zIndex: 1, background: "inherit", paddingBottom: 6 }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  onClick={(e) => e.stopPropagation()}
                  ref={searchRef}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.55rem 0.7rem",
                    border: "1px solid #d9e3f2",
                    borderRadius: 10,
                    fontSize: "0.9rem",
                    outline: "none",
                    background: "#f8fbff",
                  }}
                />
              </li>
            )}
            {searchable && filteredOptions.length === 0 && (
              <li
                style={{
                  padding: "0.7rem 0.75rem",
                  color: "#6b7a99",
                  fontSize: "0.88rem",
                }}
              >
                Sin resultados
              </li>
            )}
            {filteredOptions.map((option) => (
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
                <span className="custom-select-option-label">{option.label}</span>
                {option.badge && (
                  <span className={`custom-select-option-badge ${option.badge === "Gestionable" ? "is-managed" : "is-readonly"}`}>
                    {option.badge}
                  </span>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
