import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CARRIER_OPTIONS } from '@/lib/carrier-audit/constants';
import { useI18n } from '@/hooks/use-i18n';

interface CarrierSelectProps {
  carrier: string;
  carrierName: string;
  hasTemplate: boolean;
  templateDate?: string;
  onCarrierChange: (value: string) => void;
  onCustomNameChange: (name: string) => void;
}

export function CarrierSelect({ carrier, carrierName, hasTemplate, templateDate, onCarrierChange, onCustomNameChange }: CarrierSelectProps) {
  const { t } = useI18n();
  const vnCarriers = CARRIER_OPTIONS.filter(c => c.group === 'Vietnam');
  const thCarriers = CARRIER_OPTIONS.filter(c => c.group === 'Thailand');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t('step1.title')}</h3>
      <Select value={carrier} onValueChange={onCarrierChange}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder={t('step1.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t('step1.vietnam')}</SelectLabel>
            {vnCarriers.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t('step1.thailand')}</SelectLabel>
            {thCarriers.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t('step1.other')}</SelectLabel>
            <SelectItem value="CUSTOM">{t('step1.newCustom')}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {carrier === 'CUSTOM' && (
        <Input
          placeholder={t('step1.customPlaceholder')}
          value={carrierName}
          onChange={e => onCustomNameChange(e.target.value)}
          className="h-11"
        />
      )}

      {hasTemplate && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{t('step1.templateLoaded')}</Badge>
          {templateDate && <span className="text-xs text-muted-foreground">{t('step1.updated')}: {templateDate}</span>}
        </div>
      )}
    </div>
  );
}
