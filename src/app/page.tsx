import { FaqSection } from "@/components/home/faq-section";
import { FeaturesSection } from "@/components/home/features-section";
import { HomeCta } from "@/components/home/home-cta";
import { HomeHero } from "@/components/home/hero";
import { MobileBar } from "@/components/home/mobile-bar";
import { ModesSection } from "@/components/home/modes-section";
import { SiteFooter } from "@/components/home/footer";
import { StepsSection } from "@/components/home/steps-section";
import { UsesMarquee } from "@/components/home/uses-marquee";

export default function HomePage() {
  return (
    <div className="home">
      <main>
        <div className="wrap">
          <HomeHero />
          <UsesMarquee />
          <StepsSection />
          <ModesSection />
          <FeaturesSection />
          <FaqSection />
          <HomeCta />
        </div>
      </main>
      <SiteFooter />
      <MobileBar />
    </div>
  );
}
