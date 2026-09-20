import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy · Codarc",
  description: "What Codarc reads, what it keeps, and what it never does.",
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      updated="20 September 2026"
      intro="Plain version: Codarc reads your code to answer the question you asked, and then it's done. Nothing is kept to train a model. Here's the detail."
      sections={[
        {
          heading: "What we read",
          body: [
            "When you point Codarc at a repository, we fetch the files needed to draw your map — source files only, capped at a couple of hundred. We do not clone your repository and we do not read files we don't need.",
            "For a public repository we read it the way anyone can, without an account. For a private one, only after you install our GitHub App and choose which repositories it may see.",
          ],
        },
        {
          heading: "What we keep",
          body: [
            "Your GitHub username, display name, numeric id and avatar, held in a signed cookie in your own browser. We do not run a database of users.",
            "A drafted change is held in memory on the server for thirty minutes so you can send it, then discarded.",
            "Maps are cached for a few minutes so a reload is fast. They are not stored beyond that.",
          ],
        },
        {
          heading: "What we never do",
          body: [
            "We do not use your code to train any model, ours or anyone else's.",
            "We do not sell or share your code or your details with anyone.",
            "We do not write to your repository unless you press the button that says so, and never to your default branch.",
          ],
        },
        {
          heading: "Who else sees your code",
          body: [
            "To draft a change, the relevant files are sent to Anthropic's API, which processes them to produce the edit and does not train on them. GitHub obviously sees your repository, because it's theirs. Our site runs on Vercel.",
            "That is the complete list.",
          ],
        },
        {
          heading: "Taking it back",
          body: [
            "Remove Codarc from a repository in your GitHub settings under Applications, and our access ends immediately.",
            "Sign out and the cookie holding your identity is deleted.",
          ],
        },
        {
          heading: "Getting in touch",
          body: [
            "Questions about any of this: reach us on X at @C0darc.",
          ],
        },
      ]}
    />
  );
}
