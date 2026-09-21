/** The plans, in one place, so pricing can't drift between pages. */

export type PlanId = "solo" | "studio";

/** Beyond this many people, the conversation moves to email. */
export const MAX_SEATS = 5;

export type Limits = {
  /** Repositories you can use paid features on. null = no limit. */
  projects: number | null;
  /** Drafted changes per calendar month. null = no limit. */
  changesPerMonth: number | null;
  /**
   * The cap is a quiet safety net, not something we advertise: the plan says
   * "unlimited", the number never appears on screen, and hitting it reads as
   * a pause to talk rather than a wall. Each change costs real money to make.
   */
  changesCapHidden?: boolean;
  /** People on the account, owner included. */
  seats: number;
};

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  featured: boolean;
  /** Enforced, not just advertised — change a number here and it changes everywhere. */
  limits: Limits;
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
      "40 changes a month",
      "Changes arrive as proposals to approve",
      "Works with Python and JavaScript apps",
    ],
    featured: false,
    limits: { projects: 3, changesPerMonth: 40, seats: 1 },
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
    // "Unlimited" on the card; 200 a month across the whole team, quietly.
    limits: { projects: null, changesPerMonth: 200, changesCapHidden: true, seats: MAX_SEATS },
  },
];

export function planById(id: string | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
