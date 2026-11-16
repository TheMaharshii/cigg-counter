"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export default function AppSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  className = "",
  disabled = false,
}) {
  return (
    <Select.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger id={id} className={`app-select-trigger ${className}`} aria-label={ariaLabel}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="app-select-trigger-icon"><ChevronDown aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="app-select-content" position="popper" sideOffset={4} align="start" collisionPadding={8}>
          <Select.ScrollUpButton className="app-select-scroll-button" aria-label="Scroll options up">
            <ChevronUp aria-hidden="true" />
          </Select.ScrollUpButton>
          <Select.Viewport className="app-select-viewport">
            {options.map((option, index) => {
              if (option.options) {
                return (
                  <Select.Group key={option.label}>
                    <Select.Label className="app-select-label">{option.label}</Select.Label>
                    {option.options.map(item => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                    {index < options.length - 1 && <Select.Separator className="app-select-separator" />}
                  </Select.Group>
                );
              }
              return <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>;
            })}
          </Select.Viewport>
          <Select.ScrollDownButton className="app-select-scroll-button" aria-label="Scroll options down">
            <ChevronDown aria-hidden="true" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function SelectItem({ value, children }) {
  return (
    <Select.Item className="app-select-item" value={value}>
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="app-select-item-indicator"><Check aria-hidden="true" /></Select.ItemIndicator>
    </Select.Item>
  );
}