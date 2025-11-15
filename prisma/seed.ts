import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Placeholder organization ID for seed data
// In production, metrics are scoped to actual WorkOS organization IDs
const SEED_ORG_ID = "seed-org-01234567";

const sampleMetrics = [
  {
    name: "Customer Satisfaction",
    description:
      "Measure of how satisfied customers are with products and services",
    type: "percentage",
    targetValue: 85,
    initialValue: 82.5,
    unit: "%",
    sourceType: "self_reported",
  },
  {
    name: "Response Time",
    description: "Average time to respond to customer inquiries",
    type: "duration",
    targetValue: 200,
    initialValue: 157,
    unit: "ms",
    sourceType: "self_reported",
  },
  {
    name: "Task Completion Rate",
    description: "Percentage of tasks completed on time",
    type: "percentage",
    targetValue: 90,
    initialValue: 87.3,
    unit: "%",
    sourceType: "self_reported",
  },
  {
    name: "Code Quality Score",
    description: "Quality metric based on code reviews and tests",
    type: "number",
    targetValue: 8.5,
    initialValue: 8.2,
    unit: "score",
    sourceType: "self_reported",
  },
  {
    name: "User Engagement",
    description: "Active daily user engagement metric",
    type: "percentage",
    targetValue: 75,
    initialValue: 68.4,
    unit: "%",
    sourceType: "self_reported",
  },
  {
    name: "Bug Resolution Time",
    description: "Average time to resolve reported bugs",
    type: "duration",
    targetValue: 24,
    initialValue: 18.5,
    unit: "hours",
    sourceType: "self_reported",
  },
  {
    name: "Feature Adoption Rate",
    description: "Rate of new feature adoption by users",
    type: "percentage",
    targetValue: 60,
    initialValue: 54.2,
    unit: "%",
    sourceType: "self_reported",
  },
  {
    name: "Team Velocity",
    description: "Sprint velocity measured in story points",
    type: "number",
    targetValue: 50,
    initialValue: 47,
    unit: "points",
    sourceType: "self_reported",
  },
  {
    name: "System Uptime",
    description: "System availability percentage",
    type: "percentage",
    targetValue: 99.9,
    initialValue: 99.5,
    unit: "%",
    sourceType: "self_reported",
  },
  {
    name: "API Error Rate",
    description: "Percentage of API requests that result in errors",
    type: "rate",
    targetValue: 0.5,
    initialValue: 0.3,
    unit: "%",
    sourceType: "self_reported",
  },
];

async function main() {
  console.info("🌱 Starting database seed...");

  // Clear existing metrics and their data points (cascade delete)
  console.info("Clearing existing metrics...");
  await prisma.metric.deleteMany();

  // Seed metrics with initial data points
  console.info("Creating sample metrics with time-series data...");
  for (const metricData of sampleMetrics) {
    const { initialValue, ...metricFields } = metricData;

    // Create metric
    const metric = await prisma.metric.create({
      data: {
        ...metricFields,
        organizationId: SEED_ORG_ID,
      },
    });

    // Create initial data point
    await prisma.metricDataPoint.create({
      data: {
        metricId: metric.id,
        value: initialValue,
        timestamp: new Date(),
      },
    });
  }

  console.info("✅ Seeded", sampleMetrics.length, "metrics with initial data points");
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
