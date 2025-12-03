export function Pricing() {
  const tiers = [
    {
      name: "start",
      price: "free",
      description: "for small teams getting started",
      features: ["up to 10 roles", "up to 10 metrics"],
    },
    {
      name: "grow",
      price: "€100",
      period: "/month",
      description: "for growing organizations",
      features: ["up to 20 roles", "up to 20 metrics", "ai check-ins"],
    },
    {
      name: "scale",
      price: "€200",
      period: "/month",
      description: "for established teams",
      features: [
        "up to 50 roles",
        "up to 50 metrics",
        "ai check-ins",
        "priority support",
      ],
    },
  ];

  return (
    <section className="px-6 py-24 sm:px-12 lg:px-20 lg:py-32">
      <div className="mb-16 lg:mb-24">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          pricing
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="border-border flex flex-col border p-8"
          >
            <span className="text-muted-foreground mb-8 font-mono text-[10px] tracking-widest uppercase">
              {tier.name}
            </span>

            <div className="mb-4">
              <span
                className="text-foreground font-sans text-3xl sm:text-4xl"
                style={{ letterSpacing: "-0.03em", lineHeight: "1" }}
              >
                {tier.price}
              </span>
              {tier.period && (
                <span
                  className="text-muted-foreground text-sm"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {tier.period}
                </span>
              )}
            </div>

            <p
              className="text-muted-foreground mb-8 text-sm"
              style={{ letterSpacing: "-0.03em" }}
            >
              {tier.description}
            </p>

            <ul className="mt-auto flex flex-col gap-3">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="text-foreground text-sm"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Custom pricing note */}
      <div className="mt-16 text-center lg:mt-20">
        <p
          className="text-muted-foreground text-sm"
          style={{ letterSpacing: "-0.03em" }}
        >
          need more?{" "}
          <a
            href="#contact"
            className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            reach out for custom pricing
          </a>
        </p>
      </div>

      {/* Subtle bottom line */}
      <div className="mt-24 lg:mt-32">
        <div className="bg-border h-px w-full" />
      </div>
    </section>
  );
}
