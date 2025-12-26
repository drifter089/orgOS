"use client";

import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SliderWithInputsProps {
  value: number;
  onChange: (value: number) => void;
  suggestedMin?: number;
  suggestedMax?: number;
  step?: number;
  label?: string;
  suffix?: string;
  className?: string;
}

export function SliderWithInputs({
  value,
  onChange,
  suggestedMin = 0,
  suggestedMax = 100,
  step = 1,
  label,
  suffix,
  className,
}: SliderWithInputsProps) {
  const [min, setMin] = useState(suggestedMin);
  const [max, setMax] = useState(suggestedMax);
  const [minInput, setMinInput] = useState(String(suggestedMin));
  const [maxInput, setMaxInput] = useState(String(suggestedMax));

  useEffect(() => {
    setMin(suggestedMin);
    setMax(suggestedMax);
    setMinInput(String(suggestedMin));
    setMaxInput(String(suggestedMax));
  }, [suggestedMin, suggestedMax]);

  useEffect(() => {
    if (value < min) onChange(min);
    if (value > max) onChange(max);
  }, [min, max, value, onChange]);

  const handleMinChange = useCallback(
    (inputValue: string) => {
      setMinInput(inputValue);
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed) && parsed < max) {
        setMin(parsed);
        if (value < parsed) onChange(parsed);
      }
    },
    [max, value, onChange],
  );

  const handleMaxChange = useCallback(
    (inputValue: string) => {
      setMaxInput(inputValue);
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed) && parsed > min) {
        setMax(parsed);
        if (value > parsed) onChange(parsed);
      }
    },
    [min, value, onChange],
  );

  const handleMinBlur = useCallback(() => {
    const parsed = parseFloat(minInput);
    if (isNaN(parsed) || parsed >= max) {
      setMinInput(String(min));
    }
  }, [minInput, min, max]);

  const handleMaxBlur = useCallback(() => {
    const parsed = parseFloat(maxInput);
    if (isNaN(parsed) || parsed <= min) {
      setMaxInput(String(max));
    }
  }, [maxInput, min, max]);

  const dynamicStep =
    step ??
    (() => {
      const range = max - min;
      if (range <= 10) return 0.1;
      if (range <= 100) return 1;
      if (range <= 1000) return 10;
      return 100;
    })();

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <span className="text-muted-foreground text-[10px]">{label}</span>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={minInput}
          onChange={(e) => handleMinChange(e.target.value)}
          onBlur={handleMinBlur}
          className="h-7 w-16 text-center text-xs"
          aria-label="Minimum value"
        />

        <Slider
          value={[value]}
          min={min}
          max={max}
          step={dynamicStep}
          onValueChange={([v]) => v !== undefined && onChange(v)}
          className="flex-1"
        />

        <Input
          type="number"
          value={maxInput}
          onChange={(e) => handleMaxChange(e.target.value)}
          onBlur={handleMaxBlur}
          className="h-7 w-16 text-center text-xs"
          aria-label="Maximum value"
        />
      </div>

      <div className="text-center text-xs font-medium">
        Target: {value}
        {suffix && (
          <span className="text-muted-foreground ml-0.5">{suffix}</span>
        )}
      </div>
    </div>
  );
}
