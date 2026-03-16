import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FIELD_DEFINITIONS } from '@/lib/carrier-audit/constants';
import { useI18n } from '@/hooks/use-i18n';
import type { FieldKey } from '@/lib/carrier-audit/types';
import { Wand2, Save } from 'lucide-react';

interface ColumnMappingProps {
  headers: string[];
  mapping: Partial<Record<FieldKey, string | null>>;
  previewData: Record<string, unknown>[];
  onMappingChange: (field: FieldKey, value: string | null) => void;
  onAutoDetect: () => void;
  onSaveTemplate: () => void;
}

export function ColumnMapping({ headers, mapping, previewData, onMappingChange, onAutoDetect, onSaveTemplate }: ColumnMappingProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t('step4.title')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAutoDetect} className="h-8 text-xs">
            <Wand2 className="h-3.5 w-3.5 mr-1" /> {t('step4.autoDetect')}
          </Button>
          <Button variant="outline" size="sm" onClick={onSaveTemplate} className="h-8 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" /> {t('step4.saveTemplate')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.entries(FIELD_DEFINITIONS) as [FieldKey, typeof FIELD_DEFINITIONS[FieldKey]][]).map(([key, def]) => {
          const val = mapping[key] || '';
          const isMatched = val && headers.includes(val);

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">{def.label}</label>
                {isMatched ? (
                  <Badge variant="secondary" className="text-[10px] h-4">✓</Badge>
                ) : def.required ? (
                  <Badge variant="destructive" className="text-[10px] h-4">{t('step4.required')}</Badge>
                ) : null}
              </div>
              <Select value={val} onValueChange={v => onMappingChange(key, v === '__none__' ? null : v)}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder={t('step4.notMapped')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('step4.notMapped')}</SelectItem>
                  {headers.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {previewData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">{t('step4.preview')}</h4>
          <div className="border rounded-md overflow-auto max-h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map(h => (
                    <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {headers.map(h => (
                      <TableCell key={h} className="text-xs whitespace-nowrap py-1.5">
                        {String(row[h] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
