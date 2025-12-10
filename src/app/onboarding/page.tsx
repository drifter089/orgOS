"use client";

import { useState } from "react";

import { AnimatePresence } from "framer-motion";

import { FinishStep } from "./_components/finish-step";
import { ImportMembersStep } from "./_components/import-members-step";
import { KpiStep } from "./_components/kpi-step";
import { OrgNameStep } from "./_components/org-name-step";
import { ProgressIndicator } from "./_components/progress-indicator";
import { RoleCreationStep } from "./_components/role-creation-step";
import {
  FinishVisual,
  ImportMembersVisual,
  KpiVisual,
  OrgNameVisual,
  RoleCreationVisual,
  TeamSetupVisual,
} from "./_components/step-visuals";
import { TeamSetupStep } from "./_components/team-setup-step";

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const goToNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="bg-background flex flex-1 flex-col justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="flex justify-start">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
            />
          </div>

          <div className="mt-12">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <OrgNameStep key="org-name" onNext={goToNext} />
              )}
              {currentStep === 2 && (
                <ImportMembersStep
                  key="import-members"
                  onNext={goToNext}
                  onBack={goBack}
                />
              )}
              {currentStep === 3 && (
                <TeamSetupStep
                  key="team-setup"
                  onNext={goToNext}
                  onBack={goBack}
                />
              )}
              {currentStep === 4 && (
                <RoleCreationStep
                  key="role-creation"
                  onNext={goToNext}
                  onBack={goBack}
                />
              )}
              {currentStep === 5 && (
                <KpiStep key="kpi" onNext={goToNext} onBack={goBack} />
              )}
              {currentStep === 6 && <FinishStep key="finish" onBack={goBack} />}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right side - Visualization */}
      <div className="border-border hidden items-center justify-center border-l p-12 lg:flex lg:w-1/2">
        <div className="aspect-square w-full max-w-md">
          <AnimatePresence mode="wait">
            {currentStep === 1 && <OrgNameVisual key="org-visual" />}
            {currentStep === 2 && <ImportMembersVisual key="import-visual" />}
            {currentStep === 3 && <TeamSetupVisual key="team-visual" />}
            {currentStep === 4 && <RoleCreationVisual key="role-visual" />}
            {currentStep === 5 && <KpiVisual key="kpi-visual" />}
            {currentStep === 6 && <FinishVisual key="finish-visual" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
