import { Footer } from "./_components/footer";
import { Hero, Pricing, Steps } from "./_components/landing";

export default function Home() {
  return (
    <main className="bg-background relative w-full overflow-x-hidden">
      <Hero />
      <Steps />
      <Pricing />
      <Footer />
    </main>
  );
}
