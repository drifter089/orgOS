import { Hero } from "@/app/_components/landing/hero";
import { Pricing } from "@/app/_components/landing/pricing";
import { Steps } from "@/app/_components/landing/steps";

export default function Home() {
  return (
    <main>
      <Hero />
      <Steps />
      <Pricing />
    </main>
  );
}
