"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Database, FileUp, Loader2, Send, ShieldX, Sparkles } from "lucide-react";

type Role = "user-analis" | "user-super";
type Motor = { id: string; model: string; tahun: number; harga: number; transmisi: string; odometer: number; jenis: string; mesin: number };

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value * 1000);
}

async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!contentType.includes("application/json")) {
    throw new Error("API tidak mengembalikan JSON. Buka aplikasi dari http://localhost:3001 dan refresh halaman.");
  }
  const data = JSON.parse(body) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(data.error || `API gagal dengan status ${response.status}`);
  return data;
}

export default function HomePage() {
  const [role, setRole] = useState<Role>("user-analis");
  const [motors, setMotors] = useState<Motor[]>([]);
  const [source, setSource] = useState("memuat...");
  const [question, setQuestion] = useState("Berapa rentang harga Vario 125 dan mana yang paling murah?");
  const [answer, setAnswer] = useState("Ajukan pertanyaan untuk mulai menganalisis data.");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadMotors() {
    const response = await fetch("/api/motors");
    const data = await readApiResponse(response) as { records?: Motor[]; source?: string };
    setMotors(data.records ?? []);
    setSource(data.source || "unknown");
  }

  useEffect(() => { void loadMotors().catch((error) => setNotice(error.message)); }, []);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, role }) });
      const data = await readApiResponse(response) as { answer?: string; source?: string };
      setAnswer(data.answer || "AI tidak menghasilkan jawaban.");
      setSource(data.source === "cosmos" ? "Cosmos DB" : "CSV lokal");
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function seed() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/motors", { method: "POST" });
      const data = await readApiResponse(response) as { count?: number };
      setNotice(`${data.count || 0} record motor tersimpan di Cosmos DB.`);
      await loadMotors();
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function upload() {
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: form });
      await readApiResponse(response);
      setNotice(`Brosur ${file.name} tersimpan di Cosmos DB.`); setFile(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  return (
    <main className="app-shell grid-lines">
      <div className="container">
        <div className="topline"><span className="brand">FINAL PROJECT · KELOMPOK 3</span><span>MII × AHM</span></div>
        <header className="hero"><div className="number">3</div><div><p className="kicker">Kelompok 3 · Structured Data + Document</p><h1>AI Assistant untuk analisis laporan berbentuk dokumen terstruktur</h1></div></header>

        <section className="layout">
          <article className="panel scope"><h2 className="panel-title">Ruang Lingkup</h2><ol className="scope-list">
            <li><span className="index">1</span><span>Aplikasi dengan dua user: <b>user-analis</b> dan <b>user-super</b>.</span></li>
            <li><span className="index">2</span><span>Data penjualan motor bekas dari <b>CSV</b> disimpan ke Cosmos DB dan brosur Honda Vario 125 dapat diunggah.</span></li>
            <li><span className="index">3</span><span>Index motor dengan kontrol akses: <b>user-analis</b> tidak bisa membaca brosur; <b>user-super</b> dapat membaca index brosur dan menganalisis file data.</span></li>
            <li><span className="index">4</span><span>AI dapat menjawab pertanyaan <b>general / umum</b> di luar brosur maupun data.</span></li>
            <li><span className="index">5</span><span>AI dapat membaca <b>spesifikasi Vario 125</b> yang ditanyakan oleh user-super.</span></li>
            <li><span className="index">6</span><span>AI dapat menjawab pertanyaan seputar <b>data motor bekas</b> dari user-analis dan user-super.</span></li>
          </ol></article>

          <div className="stack">
            <article className="panel matrix"><h2 className="panel-title">Matriks Akses</h2><table><thead><tr><th>User</th><th>Brosur<br />Vario 125</th><th>Data motor<br />bekas</th><th>Umum</th></tr></thead><tbody><tr><td><span className="role">user-analis</span></td><td><span className="access no"><ShieldX size={17} /></span></td><td><span className="access yes"><Check size={17} /></span></td><td><span className="access yes"><Check size={17} /></span></td></tr><tr><td><span className="role">user-super</span></td><td><span className="access yes"><Check size={17} /></span></td><td><span className="access yes"><Check size={17} /></span></td><td><span className="access yes"><Check size={17} /></span></td></tr></tbody></table></article>
            <article className="panel sources"><h2 className="panel-title">Sumber Data</h2><p>Data motor bekas · <a href="/Data/motor_second.csv">motor_second.csv</a></p><p>Brosur Vario 125 · unggah PDF atau TXT pada workspace di bawah</p></article>
            <div className="bottom-grid"><article className="panel members"><h2 className="panel-title">Anggota</h2><p className="member-row"><span className="avatar">PS</span>Prahaso Satrio Utomo</p><p className="member-row"><span className="avatar">DM</span>Dionysius Mario</p></article><article className="panel members"><h2 className="panel-title">PIC MII</h2><p><b>Klaudius C. I. Banu</b></p><p>klaudius.banu@mii.co.id</p></article></div>
          </div>
        </section>

        <section className="panel workspace"><div className="toolbar"><div><h2>AI Motor Workspace</h2><span className="status"><Database size={13} style={{ verticalAlign: "-2px" }} /> sumber aktif: {source} · {motors.length} record</span></div><div><select className="select" value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="user-analis">user-analis</option><option value="user-super">user-super</option></select><button className="action" onClick={() => void seed()} disabled={busy} style={{ marginLeft: 8 }}><Database size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />Simpan ke Cosmos</button></div></div>
          <div className="workspace-grid"><div><div className="data-table"><table><thead><tr><th>Model</th><th>Tahun</th><th>Harga</th><th>Transmisi</th><th>Odometer</th><th>Mesin</th></tr></thead><tbody>{motors.slice(0, 12).map((motor) => <tr key={motor.id}><td>{motor.model}</td><td>{motor.tahun}</td><td>{money(motor.harga)}</td><td>{motor.transmisi}</td><td>{motor.odometer.toLocaleString("id-ID")} km</td><td>{motor.mesin} cc</td></tr>)}</tbody></table></div><div className="upload"><FileUp size={18} /><input type="file" accept=".pdf,.txt,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button className="action" onClick={() => void upload()} disabled={busy || !file}>Simpan brosur</button></div></div>
            <form className="ask-box" onSubmit={ask}><div><h2 style={{ margin: 0, fontSize: 18 }}>Tanya AI</h2><span className="status"><Sparkles size={13} style={{ verticalAlign: "-2px" }} /> akses sebagai {role}</span></div><textarea className="ask-input" value={question} onChange={(event) => setQuestion(event.target.value)} /><button className="action" type="submit" disabled={busy}>{busy ? <Loader2 className="spin" size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} /> : <Send size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />}Tanya AI</button><div className="answer">{answer}</div>{notice && <div className="status">{notice}</div>}</form>
          </div>
        </section>
        <div style={{ height: 32 }} />
      </div>
    </main>
  );
}
