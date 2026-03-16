import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/use-i18n';
import { Truck, Upload, BarChart3, ChevronRight } from 'lucide-react';

const ONBOARDING_KEY = 'carrier_audit_onboarded';

export function useOnboarding() {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return true; }
  });

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
  };

  return { showOnboarding: show, dismissOnboarding: dismiss };
}

interface OnboardingPageProps {
  onDismiss: () => void;
}

const steps = [
  { icon: Truck, titleKey: 'onboarding.step1.title', descKey: 'onboarding.step1.desc', color: 'hsl(var(--primary))' },
  { icon: Upload, titleKey: 'onboarding.step2.title', descKey: 'onboarding.step2.desc', color: 'hsl(221 83% 53%)' },
  { icon: BarChart3, titleKey: 'onboarding.step3.title', descKey: 'onboarding.step3.desc', color: 'hsl(142 71% 45%)' },
];

export function OnboardingPage({ onDismiss }: OnboardingPageProps) {
  const [step, setStep] = useState(0);
  const { t } = useI18n();
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Skip */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('onboarding.skip')}
      </button>

      {/* Dots */}
      <div className="flex gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
        style={{ backgroundColor: `${current.color}15` }}
      >
        <Icon className="h-10 w-10" style={{ color: current.color }} />
      </div>

      {/* Content */}
      <h2 className="text-xl font-bold text-foreground text-center mb-3 transition-all duration-300">
        {t(current.titleKey)}
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-10 leading-relaxed">
        {t(current.descKey)}
      </p>

      {/* Actions */}
      <Button
        size="lg"
        className="w-full max-w-xs"
        onClick={() => {
          if (isLast) onDismiss();
          else setStep(s => s + 1);
        }}
      >
        {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
