import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/hooks/use-i18n';
import type { Locale } from '@/lib/carrier-audit/i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <Select value={locale} onValueChange={v => setLocale(v as Locale)}>
      <SelectTrigger className="h-8 w-[110px] text-xs gap-1">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t('lang.en')}</SelectItem>
        <SelectItem value="vi">{t('lang.vi')}</SelectItem>
        <SelectItem value="th">{t('lang.th')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
