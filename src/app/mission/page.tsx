import Link from "next/link";

export const metadata = {
  title: "Mission",
  description:
    "Our belief in maximizing team performance through clarity in roles and accountability.",
};

export default function MissionPage() {
  return (
    <main className="bg-background relative min-h-screen">
      {/* Subtle texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <article className="relative mx-auto max-w-2xl px-6 py-24 sm:px-8 lg:py-32">
        {/* Back link */}
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-16 inline-flex items-center gap-2 text-sm transition-colors"
          style={{ letterSpacing: "-0.02em" }}
        >
          <span className="text-border">←</span>
          <span>back</span>
        </Link>

        {/* Date stamp */}
        <p
          className="text-muted-foreground/60 mb-12 font-mono text-xs tracking-wider uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          Berlin, November 2025
        </p>

        {/* Opening */}
        <div className="mb-16">
          <h1
            className="text-foreground mb-4 font-sans text-3xl font-normal sm:text-4xl"
            style={{
              letterSpacing: "-0.03em",
              lineHeight: "1.15",
            }}
          >
            Why we&apos;re building Ryō.
          </h1>
          <div className="bg-foreground/10 h-px w-16" />
        </div>

        {/* Letter content */}
        <div
          className="text-foreground/85 space-y-8 font-sans text-base leading-[1.85] sm:text-lg"
          style={{ letterSpacing: "-0.015em" }}
        >
          <p>
            We believe most organizations are broken by design—not by intention.
          </p>

          <p>
            People wake up wanting to do meaningful work. They join companies
            with conviction. Then slowly, invisibly, something shifts. Meetings
            multiply. Ownership blurs. The gap between effort and impact widens
            until no one remembers why things feel so hard.
          </p>

          <p>
            The problem isn&apos;t people. It&apos;s the absence of{" "}
            <em className="text-foreground not-italic">clarity</em>.
          </p>

          <p>
            We discovered this through holacracy and self-management—radical
            ideas about distributing authority through explicit roles rather
            than implicit hierarchies. The insight was profound: when everyone
            knows exactly what they own, accountability stops being a burden and
            becomes freedom.
          </p>

          <p
            className="border-foreground/10 text-foreground my-12 border-l-2 py-2 pl-6 text-xl font-normal italic sm:text-2xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Structure creates freedom.
          </p>

          <p>
            But implementing these ideas has always required too much friction.
            Consultants. Workshops. Complex software that demands behavior
            change before delivering value.
          </p>

          <p>
            Ryō takes a different approach. We start by mapping what already
            exists—the real roles people play, not the ones on paper. We connect
            those roles to actual metrics, creating a living system that reveals
            where attention is needed before problems become crises.
          </p>

          <p>
            This isn&apos;t about control. It&apos;s about making the invisible
            visible. When you can see how work actually flows through your
            organization, you can make it flow better.
          </p>

          <p>
            We&apos;re building for the operators—the founders, the heads of
            product, the COOs—who know their org should run smoother but can
            never quite see where the friction lives. We&apos;re building the
            tool we wished we had.
          </p>

          <p className="text-foreground">
            The best organizations feel effortless from the inside. That&apos;s
            what we&apos;re after.
          </p>
        </div>

        {/* Signatures */}
        <div className="mt-20 flex flex-col gap-10 sm:flex-row sm:gap-16">
          <div className="group">
            <p
              className="text-foreground mb-1 font-sans text-lg"
              style={{ letterSpacing: "-0.02em" }}
            >
              Louis
            </p>
            <p
              className="text-muted-foreground text-sm"
              style={{ letterSpacing: "-0.01em" }}
            >
              Co-founder
            </p>
          </div>
          <div className="group">
            <p
              className="text-foreground mb-1 font-sans text-lg"
              style={{ letterSpacing: "-0.02em" }}
            >
              Akshat
            </p>
            <p
              className="text-muted-foreground text-sm"
              style={{ letterSpacing: "-0.01em" }}
            >
              Founding Engineer
            </p>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="mt-24 flex items-center justify-between">
          <div className="bg-border h-px flex-1" />
          <span
            className="text-muted-foreground/50 px-6 font-mono text-[10px] uppercase"
            style={{ letterSpacing: "0.15em" }}
          >
            ryō
          </span>
          <div className="bg-border h-px flex-1" />
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p
            className="text-muted-foreground mb-6 text-sm"
            style={{ letterSpacing: "-0.01em" }}
          >
            Ready to see your organization clearly?
          </p>
          <a
            href="https://forms.acta.so/r/ODQR7g"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-foreground text-background inline-block px-8 py-3 text-sm transition-opacity hover:opacity-90"
            style={{ letterSpacing: "-0.02em" }}
          >
            Schedule a demo
          </a>
        </div>
      </article>
    </main>
  );
}
