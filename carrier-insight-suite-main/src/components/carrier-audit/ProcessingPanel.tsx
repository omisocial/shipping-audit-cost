import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/hooks/use-i18n';
import type { ProcessingState } from '@/lib/carrier-audit/types';

interface ProcessingPanelProps {
  state: ProcessingState;
}

export function ProcessingPanel({ state: ps }: ProcessingPanelProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {t('processing.title')}
        {ps.isProcessing && <span className="inline-block h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </h3>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{ps.label}</span>
          <span>{ps.progress}%</span>
        </div>
        <Progress value={ps.progress} className="h-2" />
      </div>

      {ps.threads.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {ps.threads.map(th => (
            <div key={th.index} className="bg-accent/50 rounded p-2 space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">Thread {th.index + 1}</span>
              <Progress value={th.total ? (th.processed / th.total) * 100 : 0} className="h-1" />
              <span className="text-[10px] text-muted-foreground">{th.processed}/{th.total}</span>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="h-28 border rounded-md bg-muted/30 p-2">
        <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap">
          {ps.log.join('\n') || t('processing.waiting')}
        </pre>
      </ScrollArea>

      {ps.errors.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-destructive flex items-center gap-1">
            {t('processing.errors')}
            <Badge variant="destructive" className="text-[10px] h-4 ml-1">{ps.errors.length}</Badge>
          </h4>
          <ScrollArea className="h-20 border border-destructive/20 rounded-md bg-destructive/5 p-2">
            {ps.errors.slice(0, 50).map((e, i) => (
              <p key={i} className="text-[11px] text-destructive">Row {e.row}: {e.message}</p>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
