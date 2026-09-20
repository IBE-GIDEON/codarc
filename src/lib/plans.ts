/** The plans, in one place, so pricing can't drift between pages. */

export type PlanId = "solo" | "studio";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  featured: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    price: 29,
    tagline: "For the founder who built it on their own.",
    features: [
      "3 projects",
      "Redraw your app as often as you like",
      "100 changes a month",
      "Changes arrive as proposals to approve",
      "Works with Python and JavaScript apps",
    ],
    featured: false,
  },
  {
    id: "studio",
    name: "Studio",
    price: 79,
    tagline: "For when someone else has to understand it too.",
    features: [
      "As many projects as you want",
      "5 people, sharing the same map",
      "Unlimited changes",
      "Faster reading of big projects",
      "Handover pack — your whole app written out in plain English",
      "Private deployment on request",
    ],
    featured: true,
  },
];

export function planById(id: string | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
