import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: {
    name: string;
    label: string;
    value: string | number;
    type?: "text" | "number" | "date" | "select";
    options?: { value: string; label: string }[];
  }[];
  onSave: (values: Record<string, string | number>) => Promise<void>;
}

const EditItemDialog = ({ open, onOpenChange, title, fields, onSave }: EditItemDialogProps) => {
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    fields.forEach((f) => {
      initial[f.name] = f.value;
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label className="text-sm md:text-base">{field.label}</Label>
              {field.type === "select" && field.options ? (
                <Select
                  value={String(values[field.name])}
                  onValueChange={(v) => setValues({ ...values, [field.name]: v })}
                >
                  <SelectTrigger className="h-10 md:h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type || "text"}
                  value={values[field.name]}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                    })
                  }
                  className="h-10 md:h-12 text-sm md:text-base"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            বাতিল
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
