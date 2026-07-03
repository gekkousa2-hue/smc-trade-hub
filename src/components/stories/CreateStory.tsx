import { useRef, useState } from "react";
import { X, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { createStory } from "@/lib/social";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateStory({ onClose, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast.error("Fayl 25MB dan kichik bo'lishi kerak"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await createStory(file, caption || undefined);
      toast.success("Istoriya joylandi!");
      onCreated();
    } catch (e) {
      const m = (e as Error).message;
      toast.error(m === "AUTH_REQUIRED" ? "Tizimga kiring" : m === "FILE_TOO_LARGE" ? "Fayl juda katta" : "Yuklashda xatolik");
    } finally {
      setUploading(false);
    }
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] relative z-10">
        <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-white font-semibold text-sm">Yangi istoriya</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {!preview ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 px-10 py-16 text-white/70 hover:border-primary/50 hover:text-primary transition-colors"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm font-medium">Rasm yoki video tanlang</span>
            <span className="text-[11px] text-white/50">Maksimum 25MB · 24 soatdan keyin o'chadi</span>
          </button>
        ) : (
          <div className="relative w-full max-w-md aspect-[9/16] rounded-2xl overflow-hidden bg-black">
            {isVideo ? (
              <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {preview && (
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-3">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 200))}
            placeholder="Izoh qo'shing (ixtiyoriy)"
            className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)] disabled:opacity-60"
          >
            {uploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Yuklanmoqda...</> : <><Upload className="h-5 w-5" /> Joylash</>}
          </button>
        </div>
      )}
    </div>
  );
}
