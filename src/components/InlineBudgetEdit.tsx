import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

interface Props {
  value: number;
  label: string;
  unit: string;
  emptyLabel?: string;
  onSave: (val: number) => void | Promise<void>;
}

export default function InlineBudgetEdit({ value, label, unit, emptyLabel, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const displayVal = emptyLabel && value === 0
    ? <span className="text-muted-foreground">{emptyLabel}</span>
    : <span>¥{value.toLocaleString()}</span>;

  const handleOpen = (o: boolean) => {
    if (o) setInput(value === 0 ? "" : String(value));
    setOpen(o);
  };

  const handleSave = async () => {
    const num = input === "" ? 0 : Number(input);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    await onSave(num);
    setSaving(false);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="tabular-nums text-sm">{displayVal}</span>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start" side="bottom">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">¥</span>
            <Input
              type="number"
              min="0"
              className="h-8 text-sm flex-1"
              placeholder={emptyLabel ? "0 = 不限" : "请输入金额"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button size="sm" className="flex-1 h-7 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? "保存…" : "确认"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
