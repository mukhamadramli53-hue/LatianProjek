"use client";

import styles from "./StepIndicator.module.css";
import { Check } from "lucide-react";

/**
 * StepIndicator - Progress bar premium untuk wizard pengajuan multi-langkah
 */

interface Step {
  number: number;
  label: string;
  subLabel?: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.progressContainer}>
        {/* Progress line background */}
        <div className={styles.progressBg} />

        {/* Dynamic progress fill */}
        <div
          className={styles.progressFill}
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <div key={step.number} className={styles.stepWrapper}>
              <div
                className={`${styles.stepCircle} ${
                  isCompleted
                    ? styles.stepCompleted
                    : isActive
                    ? styles.stepActive
                    : styles.stepPending
                }`}
              >
                {isCompleted ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  step.number
                )}
              </div>

              <div className={styles.labelWrapper}>
                <span
                  className={`${styles.stepLabel} ${
                    isActive
                      ? styles.labelActive
                      : isCompleted
                      ? styles.labelCompleted
                      : styles.labelPending
                  }`}
                >
                  {step.label}
                </span>
                {step.subLabel && (
                  <span className={styles.stepSubLabel}>{step.subLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: show current step indicator badge */}
      <div style={{ textAlign: "center" }}>
        <p className={styles.mobileLabel}>
          Langkah {currentStep} dari {steps.length}: {steps[currentStep - 1]?.label}
        </p>
      </div>
    </div>
  );
}
