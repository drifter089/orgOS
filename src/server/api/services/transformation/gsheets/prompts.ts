/**
 * Google Sheets Specific AI Prompts
 *
 * These prompts are designed specifically for Google Sheets data which:
 * - Comes as a 2D array of strings
 * - May have headers in first row, first column, or both
 * - May contain time-series OR categorical data
 * - Data might not start at A1 (could start at any cell)
 */

export const GSHEETS_DATA_INGESTION_PROMPT = `Generate JavaScript: function transform(apiResponse, endpointConfig) → DataPoint[]

You are processing Google Sheets data. The API response is:
{
  "range": "Sheet1!A1:Z1000",
  "majorDimension": "ROWS",
  "values": [
    ["cell1", "cell2", ...],  // row 0
    ["cell1", "cell2", ...],  // row 1
    ...
  ]
}

DataPoint = { timestamp: Date, value: number, dimensions: object|null }

YOUR JOB: Analyze the 2D array and intelligently extract data points.

ANALYSIS STEPS:
1. DETECT HEADERS:
   - First row might be column headers (text describing columns)
   - First column might be row labels (categories, names, dates)
   - Both could be true (table with row and column headers)
   - Neither could be true (raw numeric grid)

2. DETECT DATA TYPE:
   - TIME-SERIES: If first column contains dates/times, treat as time-series
   - CATEGORICAL: If first column contains text labels (products, regions, names)
   - NUMERIC GRID: If all cells are numbers

3. EXTRACT DATA:
   - For time-series: timestamp from date column, values from numeric columns
   - For categorical: use artificial timestamps (Date.now() + index), store labels in dimensions
   - Store row labels in dimensions.label
   - Store column headers in dimensions.series (for multi-column data)

4. HANDLE MULTIPLE VALUE COLUMNS:
   - If multiple numeric columns exist, create separate DataPoints for each
   - Use dimensions.series to identify which column the value came from
   - This enables multi-series charts (stacked bars, multiple lines)

CRITICAL RULES:
1. NO TypeScript - plain JavaScript only
2. Parse numbers with parseFloat(), skip NaN values
3. Each DataPoint needs UNIQUE timestamp - add index offset: new Date(baseTime + index * 1000)
4. Empty cells or non-numeric values in value columns should be skipped
5. Return [] if data is invalid or empty

EXAMPLE - Categorical data with column headers:
Input: [["Product", "Sales", "Profit"], ["Widget A", "100", "20"], ["Widget B", "150", "35"]]
Output:
[
  { timestamp: new Date(now), value: 100, dimensions: { label: "Widget A", series: "Sales" } },
  { timestamp: new Date(now+1), value: 20, dimensions: { label: "Widget A", series: "Profit" } },
  { timestamp: new Date(now+2), value: 150, dimensions: { label: "Widget B", series: "Sales" } },
  { timestamp: new Date(now+3), value: 35, dimensions: { label: "Widget B", series: "Profit" } },
]

EXAMPLE - Time-series data:
Input: [["Date", "Revenue"], ["2024-01-01", "1000"], ["2024-01-02", "1200"]]
Output:
[
  { timestamp: new Date("2024-01-01"), value: 1000, dimensions: { series: "Revenue" } },
  { timestamp: new Date("2024-01-02"), value: 1200, dimensions: { series: "Revenue" } },
]

EXAMPLE - Simple numeric column with labels:
Input: [["Region", "Count"], ["North", "50"], ["South", "75"], ["East", "60"]]
Output:
[
  { timestamp: new Date(now), value: 50, dimensions: { label: "North" } },
  { timestamp: new Date(now+1), value: 75, dimensions: { label: "South" } },
  { timestamp: new Date(now+2), value: 60, dimensions: { label: "East" } },
]

Output ONLY the function code, no markdown.`;

export const GSHEETS_CHART_PROMPT = `Generate JavaScript: function transform(dataPoints, preferences) → ChartConfig

You are creating a chart for Google Sheets data. The dataPoints come from spreadsheet cells.
NOTE: Google Sheets data may be TIME-SERIES or CATEGORICAL - analyze the data to determine which.

Input:
- dataPoints: Array of { timestamp: string (ISO), value: number, dimensions: { label?, series?, rowIndex? } }
- preferences: { chartType: string, cadence: string }
  - cadence: "DAILY"|"WEEKLY"|"MONTHLY" - only applies to TIME-SERIES data
  - For CATEGORICAL data (dimensions.label present, no real dates), ignore cadence

Output ChartConfig (shadcn/ui chart format):
{
  chartType: "line"|"bar"|"area"|"pie"|"radar"|"radial",
  chartData: Array of objects,
  chartConfig: { [dataKey]: { label: string, color: string } },
  xAxisKey: string,
  dataKeys: string[],
  title: string,
  showLegend?: boolean,
  showTooltip?: boolean,
  stacked?: boolean
}

ANALYSIS STEPS:
1. DETECT DATA TYPE FIRST:
   - TIME-SERIES: timestamps are real dates (not just sequential numbers)
   - CATEGORICAL: has dimensions.label with text labels (products, regions, names)
2. CHECK dimensions.series - if present, this is MULTI-SERIES data
3. For TIME-SERIES: apply cadence preference for aggregation
4. For CATEGORICAL: ignore cadence, use labels directly

CHART TYPE SELECTION:
- BAR: Best for categorical comparisons (has dimensions.label, no real dates)
- STACKED BAR: Multi-series categorical data (multiple series values per label)
- PIE: Single series, few categories (<8), showing proportions
- LINE/AREA: Time-series data (real dates in timestamps)
- STACKED AREA: Multi-series time-series
- RADAR: Comparing multiple metrics across categories
- RADIAL: Single value progress/gauge

MULTI-SERIES HANDLING:
If dataPoints have different dimensions.series values:
1. Group by label
2. Pivot series into separate columns
3. Use stacked: true for bar/area charts

Example multi-series transformation:
Input dataPoints:
  [{ value: 100, dimensions: { label: "Q1", series: "Sales" } },
   { value: 20, dimensions: { label: "Q1", series: "Profit" } },
   { value: 150, dimensions: { label: "Q2", series: "Sales" } },
   { value: 35, dimensions: { label: "Q2", series: "Profit" } }]

Output chartData:
  [{ name: "Q1", Sales: 100, Profit: 20 },
   { name: "Q2", Sales: 150, Profit: 35 }]

RULES:
1. NO TypeScript - plain JavaScript only
2. Colors: var(--chart-1) through var(--chart-12)
3. Use dimensions.label for xAxisKey when available
4. For multi-series, dataKeys should be the series names
5. Set showLegend: true for multi-series
6. Set stacked: true for stacked bar/area when appropriate
7. Title should describe the data meaningfully

EXAMPLES:

Single series bar chart:
{
  chartType: "bar",
  chartData: [
    { name: "North", value: 50 },
    { name: "South", value: 75 }
  ],
  chartConfig: { value: { label: "Count", color: "var(--chart-1)" } },
  xAxisKey: "name",
  dataKeys: ["value"],
  title: "Regional Distribution",
  showTooltip: true
}

Multi-series stacked bar:
{
  chartType: "bar",
  chartData: [
    { name: "Q1", Sales: 100, Profit: 20 },
    { name: "Q2", Sales: 150, Profit: 35 }
  ],
  chartConfig: {
    Sales: { label: "Sales", color: "var(--chart-1)" },
    Profit: { label: "Profit", color: "var(--chart-2)" }
  },
  xAxisKey: "name",
  dataKeys: ["Sales", "Profit"],
  title: "Quarterly Performance",
  showLegend: true,
  showTooltip: true,
  stacked: true
}

Pie chart:
{
  chartType: "pie",
  chartData: [
    { name: "Category A", value: 40, fill: "var(--chart-1)" },
    { name: "Category B", value: 30, fill: "var(--chart-2)" },
    { name: "Category C", value: 30, fill: "var(--chart-3)" }
  ],
  chartConfig: {
    value: { label: "Distribution" },
    "Category A": { color: "var(--chart-1)" },
    "Category B": { color: "var(--chart-2)" },
    "Category C": { color: "var(--chart-3)" }
  },
  xAxisKey: "name",
  dataKeys: ["value"],
  title: "Category Distribution",
  showLegend: true,
  showTooltip: true
}

Output ONLY the function code, no markdown.`;
