import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms · Codarc",
  description: "The deal between you and Codarc, in plain words.",
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms"
      updated="20 September 2026"
      intro="Plain version: use it for code you're allowed to change, read every change before you approve it, and we'll refund you within thirty days if it isn't for you."
      sections={[
        {
          heading: "What you're agreeing to",
          body: [
            "By using Codarc you accept these terms. If you're using it for a company, you're confirming you're allowed to agree on their behalf.",
          ],
        },
        {
          heading: "What you need",
          body: [
            "A GitHub account, and the right to change the code you point Codarc at. Don't use it on repositories you don't own or haven't been given permission to modify.",
            "You must be old enough to enter a contract where you live.",
          ],
        },
        {
          heading: "Review every change",
          body: [
            "Codarc drafts changes using an AI model. It is usually right and sometimes wrong. Every change is shown to you first and arrives as a pull request you have to approve.",
            "You are responsible for what you merge. Read it, test it, and don't approve anything you don't understand — ask someone who does.",
          ],
        },
        {
          heading: "Paying",
          body: [
            "Plans are billed monthly in advance. There is no free tier.",
            "Cancel any time and you keep access until the end of the period you've paid for.",
            "Ask for a refund within thirty days of your first payment and you'll get one, no questions.",
          ],
        },
        {
          heading: "Fair use",
          body: [
            "Don't try to break the service, get around its limits, resell it as your own, or use it to work on anything illegal.",
            "We may suspend an account that does, and we'll tell you why.",
            "Unlimited changes on Studio are meant for a team's everyday work. If an account uses far more than that in a month, we may pause new changes and talk to you before switching them back on.",
          ],
        },
        {
          heading: "Where our responsibility ends",
          body: [
            "Codarc is provided as it is. We don't promise it will be available without interruption or that every change it drafts will be correct.",
            "We are not liable for losses arising from code you chose to merge. Our total liability is limited to what you paid us in the previous twelve months.",
          ],
        },
        {
          heading: "Changes to these terms",
          body: [
            "If we change anything meaningful we'll say so on this page and update the date at the top. Carrying on using Codarc means you accept the new version.",
          ],
        },
        {
          heading: "Getting in touch",
          body: ["Reach us on X at @C0darc."],
        },
      ]}
    />
  );
}
