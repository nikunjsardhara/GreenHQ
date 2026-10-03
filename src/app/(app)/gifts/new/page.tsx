"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Copy, Gift as GiftIcon, MessageCircle, PackagePlus, RotateCcw, Sprout } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { uniqueSpecies } from "@/lib/species";
import { toast } from "@/lib/toast";
import { ActionLink, PageHeader } from "@/components/ui";
import { QrCaption, QrPrintButton } from "@/components/qr-caption";

interface CreatedGift {
  recipientName: string;
  shareToken: string;
  url: string;
  saplingNanoid: string | null;
  saplingStatus: string | null;
  orgName: string | null;
  speciesName: string | null;
  plantedAt: string | null;
  saplingCreatedAt: string | null;
}

// Gift creation, PRD §5.6: existing sapling by code, or reserve a new one
// from a project. Result is a share card (WhatsApp / copy-link / QR).
export default function NewGiftPage() {
  const search = useSearchParams();
  const [mode, setMode] = useState<"existing" | "reserve">(search.get("sapling") ? "existing" : "existing");
  const [code, setCode] = useState(search.get("sapling") ?? "");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [species, setSpecies] = useState<{ id: string; commonName: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [gift, setGift] = useState<CreatedGift | null>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    apiFetch<{ projects: { id: string; name: string }[] }>("/api/projects").then((r) => {
      setProjects(r.projects);
      if (r.projects[0]) setProjectId((v) => v || r.projects[0].id);
    }).catch(() => {});
    apiFetch<{ species: { id: string; commonName: string }[] }>("/api/species").then((r) => setSpecies(r.species)).catch(() => {});
  }, []);

  useEffect(() => {
    if (gift) QRCode.toDataURL(gift.url, { margin: 1, width: 200 }).then(setQr).catch(() => {});
  }, [gift]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body =
        mode === "existing"
          ? { saplingNanoid: code.trim(), recipientName, recipientContact: recipientContact || undefined, message: message || undefined }
          : { reserveNew: { projectId, speciesId: speciesId || null }, recipientName, recipientContact: recipientContact || undefined, message: message || undefined };
      const res = await apiFetch<{ gift: CreatedGift }>("/api/gifts", { method: "POST", body: JSON.stringify(body) });
      setGift(res.gift);
      toast("Gift created, share the link!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gift failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const shareText = gift ? `I gifted you a tree on GreenHQ! ${gift.url}` : "";

  if (gift) {
    return (
      <div>
        <PageHeader title="Gift ready" subtitle={`For ${gift.recipientName}`} />
        <div className="gs-card p-6 text-center">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Gift share QR code" width={200} height={200} className="mx-auto" />
          )}
          {gift.saplingNanoid && <p className="font-mono font-bold mt-2">{gift.saplingNanoid}</p>}
          <QrCaption
            orgName={gift.orgName}
            speciesName={gift.speciesName}
            plantedAt={gift.plantedAt}
            createdAt={gift.saplingCreatedAt}
            status={gift.saplingStatus}
          />
          <p className="text-xs break-all text-[var(--gs-muted)] mt-1">{gift.url}</p>
          <QrPrintButton label="Print gift QR" />
          <div className="flex gap-2 justify-center mt-4 flex-wrap no-print">
            <a className="gs-chip inline-flex items-center gap-1.5" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} aria-hidden /> Share on WhatsApp</a>
            <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={() => { navigator.clipboard.writeText(gift.url); toast("Link copied.", "success"); }}><Copy size={14} aria-hidden /> Copy link</button>
            <ActionLink href={gift.url}>Open gift page</ActionLink>
          </div>
          <button type="button" className="gs-chip mt-4 no-print inline-flex items-center gap-1.5" onClick={() => setGift(null)}><RotateCcw size={14} aria-hidden /> Gift another tree</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Gift a tree" />
      <form onSubmit={submit} className="gs-card p-4 flex flex-col gap-3">
        <div className="flex gap-2" role="radiogroup" aria-label="Gift source">
          <button type="button" className="gs-chip inline-flex items-center gap-1.5" aria-pressed={mode === "existing"} onClick={() => setMode("existing")}><Sprout size={14} aria-hidden /> Existing sapling</button>
          <button type="button" className="gs-chip inline-flex items-center gap-1.5" aria-pressed={mode === "reserve"} onClick={() => setMode("reserve")}><PackagePlus size={14} aria-hidden /> Reserve new</button>
        </div>
        {mode === "existing" ? (
          <label className="text-sm font-medium">
            Sapling short-code
            <input required value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-full font-mono !rounded-2xl" placeholder="K7mQ2xP9zR" />
          </label>
        ) : (
          <>
            <label className="text-sm font-medium">
              Project
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full !rounded-2xl">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">
              Species (optional)
              <select value={speciesId} onChange={(e) => setSpeciesId(e.target.value)} className="mt-1 w-full !rounded-2xl">
                <option value="">Unassigned</option>
                {uniqueSpecies(species).map((s) => <option key={s.id} value={s.id}>{s.commonName}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="text-sm font-medium">
          Recipient name
          <input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="mt-1 w-full !rounded-2xl" />
        </label>
        <label className="text-sm font-medium">
          Recipient contact (optional)
          <input value={recipientContact} onChange={(e) => setRecipientContact(e.target.value)} className="mt-1 w-full !rounded-2xl" placeholder="email or phone" />
        </label>
        <label className="text-sm font-medium">
          Message (optional)
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="mt-1 w-full !rounded-2xl" />
        </label>
        <button type="submit" disabled={busy} className="!rounded-2xl inline-flex items-center justify-center gap-1.5"><GiftIcon size={15} aria-hidden />{busy ? "Creating…" : "Create gift"}</button>
      </form>
    </div>
  );
}
