"use client";

import { useEffect, useRef, useState } from "react";
import { Joyride } from "react-joyride";

type TourStep = {
  target: string;
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
};

const JoyrideComponent = Joyride as unknown as React.ComponentType<{
  steps: TourStep[];
  run: boolean;
  continuous?: boolean;
}>;

export default function NotaryOnboardingTour({
  hasSeenOnboarding,
}: {
  hasSeenOnboarding: boolean | null;
}) {
  const [run] = useState(!hasSeenOnboarding);
  const hasMarkedComplete = useRef(false);

  async function completeOnboarding() {
    try {
      const response = await fetch("/onboarding/complete", {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();
      console.log("Onboarding marked complete:", result);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  }

  useEffect(() => {
    if (!hasSeenOnboarding && !hasMarkedComplete.current) {
      hasMarkedComplete.current = true;
      completeOnboarding();
    }
  }, [hasSeenOnboarding]);

  const steps: TourStep[] = [
    {
      target: '[data-tour="tour-dashboard"]',
      title: "Dashboard",
      content:
        "This is your main dashboard. You’ll see assignments, credential alerts, earnings, and important updates here.",
      placement: "right",
    },
    {
      target: '[data-tour="tour-profile"]',
      title: "Complete Your Profile",
      content:
        "Add your contact information, commission details, and notification preferences so INS can contact you for assignments.",
      placement: "right",
    },
    {
      target: '[data-tour="tour-credentials"]',
      title: "Upload Credentials",
      content:
        "Upload your notary commission, E&O insurance, bond, background check, title license, and W9 here.",
      placement: "right",
    },
    {
      target: '[data-tour="tour-coverage"]',
      title: "Set Your Coverage Area",
      content:
        "Add the counties and ZIP codes where you are available. This helps INS match you with nearby signing opportunities.",
      placement: "right",
    },
    {
      target: '[data-tour="tour-assignments"]',
      title: "Assignments",
      content:
        "Signing opportunities and assigned orders will appear here. Check this area often.",
      placement: "right",
    },
    {
      target: '[data-tour="tour-earnings"]',
      title: "Earnings",
      content:
        "Track your pending payments and completed signing income from here.",
      placement: "right",
    },
  ];

  return <JoyrideComponent steps={steps} run={run} continuous />;
}