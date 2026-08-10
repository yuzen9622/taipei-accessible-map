"use client";

import { XIcon } from "@animateicons/react/lucide";
import { PartyPopper } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/i18n/client";
import useAuthStore from "@/stores/useAuthStore";
import useOnboardingStore from "@/stores/useOnboardingStore";

/**
 * S3a of the UX blueprint: a one-time, dismissible tip card at the top of the
 * home screen pointing at the 3 things worth knowing on day one. Only makes
 * sense once the first-run tour (S1) is behind the user — onboarding !== null
 * is what marks that transition, same gate `OnboardingHost` uses.
 */
export default function WelcomeCard() {
  const { t } = useAppTranslation();
  const {
    hydrated,
    onboarding,
    welcomeCardDismissed,
    coachMarksActive,
    dismissWelcomeCard,
    startCoachMarks,
  } = useOnboardingStore(
    useShallow((s) => ({
      hydrated: s.hydrated,
      onboarding: s.onboarding,
      welcomeCardDismissed: s.welcomeCardDismissed,
      coachMarksActive: s.coachMarksActive,
      dismissWelcomeCard: s.dismissWelcomeCard,
      startCoachMarks: s.startCoachMarks,
    })),
  );
  const user = useAuthStore((s) => s.user);

  if (
    !hydrated ||
    onboarding === null ||
    welcomeCardDismissed ||
    coachMarksActive ||
    // The full 4-step onboarding (intro → needs → location → done) already
    // ends on its own "here's what to try" screen — showing this card
    // immediately after that felt like a second, near-identical welcome
    // back to back. Only someone who skipped straight past onboarding
    // (never saw any of that) gets this as their first orientation.
    !onboarding.skipped
  ) {
    return null;
  }

  return (
    <section
      aria-label={t("welcomeCard.ariaLabel")}
      className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <PartyPopper className="h-4 w-4 shrink-0 text-primary" />
          {user
            ? t("welcomeCard.greeting", { name: user.name })
            : t("welcomeCard.greetingGuest")}
        </p>
        <button
          type="button"
          onClick={dismissWelcomeCard}
          aria-label={t("welcomeCard.dismiss")}
          className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <XIcon size={16} />
        </button>
      </div>
      {/* Kept to exactly the 4 things `CoachMarks` can actually spotlight
          (search / a11y filter / AI / SOS) — anything listed here that the
          tour can't walk the user to is worse than not mentioning it. */}
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>{t("welcomeCard.tip1")}</li>
        <li>{t("welcomeCard.tip2")}</li>
        <li>{t("welcomeCard.tip3")}</li>
        <li>{t("welcomeCard.tip4")}</li>
      </ul>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 rounded-full"
          onClick={startCoachMarks}
        >
          {t("welcomeCard.tour")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 rounded-full"
          onClick={dismissWelcomeCard}
        >
          {t("welcomeCard.selfExplore")}
        </Button>
      </div>
    </section>
  );
}
