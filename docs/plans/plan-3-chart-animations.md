# Plan 3: Chart Entry Animations

## Overview

- **Can Start**: Immediately (no dependencies)
- **Parallel With**: Plan 1, Plan 2, Plan 7
- **Enables**: Nothing (independent)

## Goals

1. Add smooth entry animations to charts on every load
2. Animation triggers when chart data loads
3. Keep animations subtle and performant

---

## Task 1: Add Animation Config to Chart Component

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-chart.tsx`

Recharts supports `isAnimationActive` prop. We need to ensure animations play on every render.

```typescript
// Add animation constants at top of file
const CHART_ANIMATION_CONFIG = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-out" as const,
};

// For staggered animations on multiple data series
const getAnimationDelay = (index: number) => index * 100;
```

---

## Task 2: Apply Animation to Area/Line Charts

In the AreaChart/LineChart rendering:

```typescript
<AreaChart data={chartData} {...commonChartProps}>
  {/* ... CartesianGrid, XAxis, YAxis, Tooltip ... */}

  {dataKeys.map((key, index) => (
    <Area
      key={key}
      type="monotone"
      dataKey={key}
      stroke={chartConfig[key]?.color ?? `hsl(var(--chart-${index + 1}))`}
      fill={chartConfig[key]?.color ?? `hsl(var(--chart-${index + 1}))`}
      fillOpacity={0.3}
      // Animation props
      isAnimationActive={true}
      animationDuration={800}
      animationEasing="ease-out"
      animationBegin={index * 100}  // Stagger by 100ms per series
    />
  ))}
</AreaChart>
```

---

## Task 3: Apply Animation to Bar Charts

```typescript
<BarChart data={chartData} {...commonChartProps}>
  {/* ... other elements ... */}

  {dataKeys.map((key, index) => (
    <Bar
      key={key}
      dataKey={key}
      fill={chartConfig[key]?.color ?? `hsl(var(--chart-${index + 1}))`}
      radius={[4, 4, 0, 0]}
      // Animation props
      isAnimationActive={true}
      animationDuration={600}
      animationEasing="ease-out"
      animationBegin={index * 80}
    />
  ))}
</BarChart>
```

---

## Task 4: Apply Animation to Pie Charts

```typescript
<PieChart>
  <Pie
    data={chartData}
    dataKey={dataKeys[0]}
    nameKey={xAxisKey}
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={80}
    paddingAngle={2}
    // Animation props
    isAnimationActive={true}
    animationDuration={800}
    animationEasing="ease-out"
  >
    {chartData.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={chartConfig[entry[xAxisKey] as string]?.color ?? `hsl(var(--chart-${index + 1}))`}
      />
    ))}
  </Pie>
</PieChart>
```

---

## Task 5: Apply Animation to Radar Charts

```typescript
<RadarChart data={chartData}>
  <PolarGrid />
  <PolarAngleAxis dataKey={xAxisKey} />
  <PolarRadiusAxis />

  {dataKeys.map((key, index) => (
    <Radar
      key={key}
      name={chartConfig[key]?.label ?? key}
      dataKey={key}
      stroke={chartConfig[key]?.color ?? `hsl(var(--chart-${index + 1}))`}
      fill={chartConfig[key]?.color ?? `hsl(var(--chart-${index + 1}))`}
      fillOpacity={0.3}
      // Animation props
      isAnimationActive={true}
      animationDuration={800}
      animationEasing="ease-out"
      animationBegin={index * 100}
    />
  ))}
</RadarChart>
```

---

## Task 6: Apply Animation to Radial Bar Charts

```typescript
<RadialBarChart
  data={chartData}
  innerRadius="30%"
  outerRadius="100%"
  startAngle={90}
  endAngle={-270}
>
  <RadialBar
    dataKey={dataKeys[0] ?? "value"}
    background={{ fill: "hsl(var(--muted))" }}
    // Animation props
    isAnimationActive={true}
    animationDuration={1000}
    animationEasing="ease-out"
  >
    {chartData.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={chartConfig[entry.name as string]?.color ?? `hsl(var(--chart-${index + 1}))`}
      />
    ))}
  </RadialBar>
</RadialBarChart>
```

---

## Task 7: Add Key Prop for Animation Reset

To ensure animations replay when data changes, add a key prop based on data:

```typescript
// Generate a key that changes when chart data changes
const chartKey = useMemo(() => {
  if (!chartData || chartData.length === 0) return "empty";
  // Use first and last data point to detect changes
  const first = JSON.stringify(chartData[0]);
  const last = JSON.stringify(chartData[chartData.length - 1]);
  return `${first}-${last}-${chartData.length}`;
}, [chartData]);

// Apply to chart wrapper
<div key={chartKey} className="h-full w-full">
  {renderChart()}
</div>
```

---

## Task 8: Add CSS Fade-In for Card

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-card.tsx`

Add subtle fade-in when card appears:

```typescript
// Add to card className
<Card className="animate-in fade-in duration-300 ...">
```

Or create custom animation in globals.css:

```css
/* src/app/globals.css */
@keyframes chart-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-chart-enter {
  animation: chart-fade-in 0.3s ease-out;
}
```

---

## Files Summary

| Action | File                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-chart.tsx`                   |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-card.tsx` (optional fade-in) |
| MODIFY | `src/app/globals.css` (optional custom animation)                                     |

---

## Animation Settings Reference

| Chart Type | Duration | Easing   | Stagger          |
| ---------- | -------- | -------- | ---------------- |
| Area/Line  | 800ms    | ease-out | 100ms per series |
| Bar        | 600ms    | ease-out | 80ms per series  |
| Pie        | 800ms    | ease-out | N/A              |
| Radar      | 800ms    | ease-out | 100ms per series |
| Radial     | 1000ms   | ease-out | N/A              |

---

## Testing Checklist

- [ ] Line chart animates from left to right on load
- [ ] Bar chart bars grow upward on load
- [ ] Pie chart slices animate in
- [ ] Radar chart fills in smoothly
- [ ] Animation replays when chart data updates
- [ ] Animation replays on refresh
- [ ] Performance is smooth (no jank)
- [ ] Multiple charts on dashboard don't cause performance issues
