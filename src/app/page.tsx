import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { How } from "@/components/landing/how";
import { What } from "@/components/landing/what";
import { Pricing } from "@/components/landing/pricing";
import { Closing } from "@/components/landing/closing";

export default function Landing() {
  return (
    <div className="bg-page">
      <Nav />
      <main>
        <Hero />
        <How />
        <What />
        <Pricing />
        <Closing />
      </main>
    </div>
  );
}
