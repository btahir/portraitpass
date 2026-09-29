import type { ReactNode } from "react";
import { ISSUES_URL, LEGAL_UPDATED, REPO_URL, SUPPORT_URL } from "../../config";
import { PageShell } from "./parts";

function Shell({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <PageShell
      id={id}
      eyebrow={eyebrow}
      title={title}
      lede={lede}
      crumbs={[{ label: eyebrow }]}
    >
      <div className="pg-prose">{children}</div>
      <p className="fine-print">Last updated {LEGAL_UPDATED}.</p>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <Shell
      id="privacy"
      eyebrow="Privacy"
      title="Your photo never leaves your device."
      lede="PortraitPass is a static website. Everything that touches your photo runs in your browser. There is no upload, no account and no server that receives your image."
    >
      <h2>Your photo</h2>
      <p>
        Cropping, print sheets, face detection, background replacement and
        exports all run on your device. The working photo lives in this
        browser tab’s memory and is cleared when you close or reload the page.
        Photos and face data are never written to cookies, local storage or
        IndexedDB. The one thing this site remembers in your browser is a flag
        that you have seen the face detection notice, so it is not repeated.
      </p>
      <h2>Face detection</h2>
      <p>
        Face detection runs on your device to frame your photo. It starts after
        you have seen the notice and chosen to auto-frame, and you can always
        frame the photo by hand instead. The model files load from this site
        the first time. We never receive your photo or any face data.
      </p>
      <h2>Camera</h2>
      <p>
        If you use the camera, the video is shown and analysed in your browser
        only. Nothing is recorded or sent anywhere, and the picture you take goes
        into the same in-memory workflow as an uploaded photo. Your browser asks
        for permission first, and you can revoke it in its settings.
      </p>
      <h2>Saved project files</h2>
      <p>
        When you choose Save project, the file is written to your own device. It
        contains your photo, your settings, the head positions (set by you or found by face detection)
        and, only if background replacement is on, the background mask. Treat
        it like the photo itself and share it deliberately.
      </p>
      <h2>Offline use</h2>
      <p>
        The offline feature stores only this site’s own files (pages, scripts,
        fonts and, if you use face assist, its models) in your browser’s cache.
        Your photos never go through it, and no data is sent anywhere.
      </p>
      <h2>Hosting and logs</h2>
      <p>
        The site is hosted on Vercel. Like any web host, Vercel logs request
        data such as IP address, requested address, time and browser type to
        deliver and protect the site. We do not add cookies, analytics,
        advertising or third-party scripts of our own. Fonts and tools are
        served from the same site.
      </p>
      <h2>Tips</h2>
      <p>
        If you choose to leave a tip, you are sent to Stripe. Stripe handles the
        payment under its own privacy policy. PortraitPass never sees your card
        details and your photo is never involved.
      </p>
      <h2>Contact</h2>
      <p>
        Questions or concerns: open an issue at{" "}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          the project’s issue tracker
        </a>
        . Please do not post photos or personal data there. The source code is
        at{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          the project repository
        </a>
        .
      </p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell
      id="terms"
      eyebrow="Terms"
      title="Free, open source, provided as is."
      lede="PortraitPass is a free tool. These terms are short on purpose."
    >
      <h2>The tool</h2>
      <p>
        PortraitPass is free, open-source software released under the MIT
        License. It is provided as is, without warranty of any kind, and the
        maker is not liable for losses that come from using it, including
        rejected applications, fees or delays, to the extent the law allows.
      </p>
      <h2>No guarantee of acceptance</h2>
      <p>
        PortraitPass checks sizes and positions and shows you the numbers. It
        cannot judge every rule, such as expression, lighting, glasses or how
        recent the photo is. The issuing authority decides whether a photo is
        accepted. It gives no guarantee that any photo will be.
      </p>
      <h2>Your responsibility</h2>
      <p>
        Photo rules change. You are responsible for checking the current rules
        of the office or organisation that receives your photo. We link to the
        source we used and show the date we last checked it. Use photos of
        yourself, or of someone who has agreed.
      </p>
      <h2>Independence</h2>
      <p>
        PortraitPass is an independent project. It is not affiliated with or
        endorsed by any government, passport office or agency.
      </p>
      <h2>Tips</h2>
      <p>
        Tips on the{" "}
        <a href={SUPPORT_URL}>support page</a> are optional. They do not unlock
        features and do not affect any photo.
      </p>
      <h2>Contact</h2>
      <p>
        Open an issue at{" "}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          the project’s issue tracker
        </a>
        .
      </p>
    </Shell>
  );
}

export function AccessibilityPage() {
  return (
    <Shell
      id="accessibility"
      eyebrow="Accessibility"
      title="Built to work with a keyboard and a screen reader."
      lede="We aim to meet WCAG 2.2 level AA. This page says what works, what does not yet, and how to tell us."
    >
      <h2>What we do</h2>
      <ul>
        <li>Every control can be used with the keyboard alone.</li>
        <li>
          The photo preview moves with the arrow keys; hold Shift for larger
          steps. Sliders offer the same positioning without dragging.
        </li>
        <li>
          Measurements are plain text with a symbol and a word, never colour
          alone.
        </li>
        <li>Light and dark themes, and reduced motion, are respected.</li>
        <li>
          Automated axe checks run on the studio in our test suite. They do not
          replace testing with real assistive technology.
        </li>
      </ul>
      <h2>Known limits</h2>
      <p>
        The preview is a picture, so its content is described but not
        readable as text. Pinch and drag gestures on the preview have keyboard
        and slider equivalents. Whether a photo looks right, for example
        expression or lighting, still needs your own eyes or a helper.
      </p>
      <h2>Tell us about a barrier</h2>
      <p>
        Open an issue at{" "}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          the project’s issue tracker
        </a>{" "}
        and describe the page, your browser and assistive technology. Please do
        not attach photos.
      </p>
    </Shell>
  );
}
