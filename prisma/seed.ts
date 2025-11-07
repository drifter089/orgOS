import { type CollectionFrequency, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SampleMetric {
  name: string;
  description: string;
  type: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  collectionFrequency: CollectionFrequency;
  dataSource: string;
}

const sampleMetrics: SampleMetric[] = [
  {
    name: "Customer Satisfaction",
    description:
      "Measure of how satisfied customers are with products and services",
    type: "percentage",
    targetValue: 85,
    currentValue: 82.5,
    unit: "%",
    category: "user_satisfaction",
    collectionFrequency: "WEEKLY",
    dataSource: "manual",
  },
  {
    name: "Response Time",
    description: "Average time to respond to customer inquiries",
    type: "duration",
    targetValue: 200,
    currentValue: 157,
    unit: "ms",
    category: "performance",
    collectionFrequency: "REAL_TIME",
    dataSource: "monitoring",
  },
  {
    name: "Task Completion Rate",
    description: "Percentage of tasks completed on time",
    type: "percentage",
    targetValue: 90,
    currentValue: 87.3,
    unit: "%",
    category: "productivity",
    collectionFrequency: "DAILY",
    dataSource: "manual",
  },
  {
    name: "Code Quality Score",
    description: "Quality metric based on code reviews and tests",
    type: "number",
    targetValue: 8.5,
    currentValue: 8.2,
    unit: "score",
    category: "code_quality",
    collectionFrequency: "WEEKLY",
    dataSource: "sonarqube",
  },
  {
    name: "User Engagement",
    description: "Active daily user engagement metric",
    type: "percentage",
    targetValue: 75,
    currentValue: 68.4,
    unit: "%",
    category: "user_metrics",
    collectionFrequency: "DAILY",
    dataSource: "analytics",
  },
  {
    name: "Bug Resolution Time",
    description: "Average time to resolve reported bugs",
    type: "duration",
    targetValue: 24,
    currentValue: 18.5,
    unit: "hours",
    category: "development",
    collectionFrequency: "WEEKLY",
    dataSource: "jira",
  },
  {
    name: "Feature Adoption Rate",
    description: "Rate of new feature adoption by users",
    type: "percentage",
    targetValue: 60,
    currentValue: 54.2,
    unit: "%",
    category: "product",
    collectionFrequency: "MONTHLY",
    dataSource: "analytics",
  },
  {
    name: "Team Velocity",
    description: "Sprint velocity measured in story points",
    type: "number",
    targetValue: 50,
    currentValue: 47,
    unit: "points",
    category: "productivity",
    collectionFrequency: "WEEKLY",
    dataSource: "jira",
  },
  {
    name: "System Uptime",
    description: "System availability percentage",
    type: "percentage",
    targetValue: 99.9,
    currentValue: 99.5,
    unit: "%",
    category: "reliability",
    collectionFrequency: "REAL_TIME",
    dataSource: "monitoring",
  },
  {
    name: "API Error Rate",
    description: "Percentage of API requests that result in errors",
    type: "rate",
    targetValue: 0.5,
    currentValue: 0.3,
    unit: "%",
    category: "error_tracking",
    collectionFrequency: "REAL_TIME",
    dataSource: "sentry",
  },
];

/**
 * Generate mock historical values for a metric over the last 30 days
 */
function generateHistoricalValues(
  metric: SampleMetric,
  days = 30,
): Array<{ value: number; timestamp: Date }> {
  const values: Array<{ value: number; timestamp: Date }> = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - i);
    timestamp.setHours(12, 0, 0, 0); // Noon each day

    // Generate value with some randomness around current value
    const variance = metric.currentValue * 0.15; // ±15% variance
    const randomOffset = (Math.random() - 0.5) * 2 * variance;
    let value = metric.currentValue + randomOffset;

    // Ensure value stays within reasonable bounds
    if (metric.type === "percentage" || metric.type === "rate") {
      value = Math.max(0, Math.min(100, value));
    } else if (metric.type === "duration") {
      value = Math.max(0, value);
    }

    // Round to 2 decimal places
    value = Math.round(value * 100) / 100;

    values.push({ value, timestamp });
  }

  return values;
}

async function main() {
  console.info("🌱 Starting database seed...");

  // Use actual organization ID for seeding
  const defaultOrgId = "org_01K8NCCRYC2ZEYDAQ85GAMQTZ2";

  // Clear existing data in correct order (respecting foreign keys)
  console.info("Clearing existing data...");
  await prisma.metricValue.deleteMany();
  await prisma.role.deleteMany(); // Must delete roles before metrics
  await prisma.team.deleteMany();
  await prisma.metric.deleteMany();

  // Seed metrics with historical data
  console.info("Creating sample metrics with historical data...");
  let totalValues = 0;

  for (const metricData of sampleMetrics) {
    // Create the metric
    const metric = await prisma.metric.create({
      data: {
        name: metricData.name,
        description: metricData.description,
        type: metricData.type,
        targetValue: metricData.targetValue,
        currentValue: metricData.currentValue,
        unit: metricData.unit,
        category: metricData.category,
        collectionFrequency: metricData.collectionFrequency,
        dataSource: metricData.dataSource,
        organizationId: defaultOrgId,
      },
    });

    // Generate and create historical values
    const historicalValues = generateHistoricalValues(metricData, 30);
    for (const { value, timestamp } of historicalValues) {
      await prisma.metricValue.create({
        data: {
          metricId: metric.id,
          value,
          timestamp,
          metadata: {
            source: metricData.dataSource,
            generated: true,
          },
        },
      });
      totalValues++;
    }

    console.info(
      `  ✓ Created "${metric.name}" with ${historicalValues.length} historical values`,
    );
  }

  console.info("✅ Seeded", sampleMetrics.length, "metrics");
  console.info("✅ Generated", totalValues, "historical data points");
  console.info("🌱 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
