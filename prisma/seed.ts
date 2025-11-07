import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleMetrics = [
  {
    name: "Customer Satisfaction",
    description:
      "Measure of how satisfied customers are with products and services",
    type: "percentage",
    targetValue: 85,
    currentValue: 82.5,
    unit: "%",
  },
  {
    name: "Response Time",
    description: "Average time to respond to customer inquiries",
    type: "duration",
    targetValue: 200,
    currentValue: 157,
    unit: "ms",
  },
  {
    name: "Task Completion Rate",
    description: "Percentage of tasks completed on time",
    type: "percentage",
    targetValue: 90,
    currentValue: 87.3,
    unit: "%",
  },
  {
    name: "Code Quality Score",
    description: "Quality metric based on code reviews and tests",
    type: "number",
    targetValue: 8.5,
    currentValue: 8.2,
    unit: "score",
  },
  {
    name: "User Engagement",
    description: "Active daily user engagement metric",
    type: "percentage",
    targetValue: 75,
    currentValue: 68.4,
    unit: "%",
  },
  {
    name: "Bug Resolution Time",
    description: "Average time to resolve reported bugs",
    type: "duration",
    targetValue: 24,
    currentValue: 18.5,
    unit: "hours",
  },
  {
    name: "Feature Adoption Rate",
    description: "Rate of new feature adoption by users",
    type: "percentage",
    targetValue: 60,
    currentValue: 54.2,
    unit: "%",
  },
  {
    name: "Team Velocity",
    description: "Sprint velocity measured in story points",
    type: "number",
    targetValue: 50,
    currentValue: 47,
    unit: "points",
  },
  {
    name: "System Uptime",
    description: "System availability percentage",
    type: "percentage",
    targetValue: 99.9,
    currentValue: 99.5,
    unit: "%",
  },
  {
    name: "API Error Rate",
    description: "Percentage of API requests that result in errors",
    type: "rate",
    targetValue: 0.5,
    currentValue: 0.3,
    unit: "%",
  },
];

async function main() {
  console.info("🌱 Starting database seed...");

  // Clear existing metrics (optional)
  console.info("Clearing existing metrics...");
  await prisma.metric.deleteMany();

  // Seed metrics
  console.info("Creating sample metrics...");
  for (const metric of sampleMetrics) {
    await prisma.metric.create({
      data: metric,
    });
  }

  console.info("✅ Seeded", sampleMetrics.length, "metrics");
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
