interface StageStepperProps {
  currentStage: number; // 1-5
}

const STEPS = [
  { n: 1, label: 'Enquiry' },
  { n: 2, label: 'Field Visit' },
  { n: 3, label: 'Documents' },
  { n: 4, label: 'Approval' },
  { n: 5, label: 'Agreement' },
];

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function StageStepper({ currentStage }: StageStepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-start justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = step.n < currentStage;
          const isCurrent = step.n === currentStage;
          const isPending = step.n > currentStage;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.n} className="flex flex-col items-center flex-1">
              {/* Circle + connector row */}
              <div className="flex items-center w-full">
                {/* Left connector line (not for first item) */}
                {index > 0 && (
                  <div
                    className={`h-[2px] flex-1 transition-colors ${
                      isCompleted || isCurrent ? 'bg-[#2563EB]' : 'bg-[#E8E8E6]'
                    }`}
                  />
                )}

                {/* Circle */}
                <div className="relative flex items-center justify-center shrink-0">
                  {isCurrent && (
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-[#2563EB] opacity-30 animate-pulse" />
                  )}
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-[#2563EB]'
                        : isCurrent
                        ? 'bg-[#2563EB]'
                        : 'bg-white border-2 border-[#E8E8E6]'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon />
                    ) : (
                      <span
                        className={`text-[12px] font-semibold leading-none ${
                          isCurrent ? 'text-white' : 'text-[#6B6B6B]'
                        }`}
                      >
                        {step.n}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right connector line (not for last item) */}
                {!isLast && (
                  <div
                    className={`h-[2px] flex-1 transition-colors ${
                      isCompleted ? 'bg-[#2563EB]' : 'bg-[#E8E8E6]'
                    }`}
                  />
                )}
              </div>

              {/* Step label */}
              <p
                className={`mt-2 text-[11px] text-center leading-tight transition-colors ${
                  isCompleted
                    ? 'text-[#2D2D2D]'
                    : isCurrent
                    ? 'text-[#2563EB] font-medium'
                    : 'text-[#6B6B6B]'
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
