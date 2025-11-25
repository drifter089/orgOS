import {
  CTASection,
  FeaturesProductCarousel,
  Footer,
  HeroSection,
  SmoothScrollWrapper,
} from "./_components";
import { FeaturesCarouselV2 } from "./_components/features-carousel-v2";

export default function Home() {
  return (
    <SmoothScrollWrapper>
      <main className="bg-background relative w-full overflow-x-hidden">
        <HeroSection />
        <FeaturesCarouselV2 />
        <FeaturesProductCarousel />
        <CTASection />
        <Footer />
      </main>
    </SmoothScrollWrapper>
  );
}
