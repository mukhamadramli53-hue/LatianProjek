"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleServiceStatus } from "@/lib/actions/service";
import { Edit, Eye, Power, PowerOff } from "lucide-react";
import type { Service } from "@prisma/client";

export default function ServiceTable({ services }: { services: Service[] }) {
 const [loadingId, setLoadingId] = useState<string | null>(null);

 const handleToggleStatus = async (id: string, currentStatus: boolean) => {
 try {
 setLoadingId(id);
 await toggleServiceStatus(id, !currentStatus);
 } catch {
 alert("Gagal mengubah status layanan");
 } finally {
 setLoadingId(null);
 }
 };

 if (services.length === 0) {
 return (
 <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
 Tidak ada layanan yang ditemukan.
 </div>
 );
 }

 return (
 <div style={{ overflowX: "auto" }}>
 <style>{`
 .action-btn-hover {
 transition: all 0.15s ease !important;
 }
 .action-btn-hover:hover {
 background: #f1f5f9 !important;
 color: #3b82f6 !important;
 }
 .action-btn-hover.edit:hover {
 color: #d97706 !important;
 }
 .action-btn-hover.toggle:hover {
 color: #e11d48 !important;
 }
 .action-btn-hover.toggle-on:hover {
 color: #059669 !important;
 }
 `}</style>
 <table className="data-table">
 <thead>
 <tr>
 <th>Kode</th>
 <th>Nama Layanan</th>
 <th>Estimasi</th>
 <th>Status</th>
 <th style={{ textAlign: "right" }}>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {services.map((service) => (
 <tr key={service.id}>
 <td>
 <span style={{
 fontFamily: "monospace", fontSize: 12, fontWeight: 600,
 background: "#f1f5f9", color: "#334155",
 padding: "3px 8px", borderRadius: 6,
 }}>
 {service.code}
 </span>
 </td>
 <td>
 <div style={{ color: "#334155", fontWeight: 600 }}>{service.name}</div>
 <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", maxWidth: "300px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
 {service.description}
 </div>
 </td>
 <td style={{ color: "#475569" }}>{service.estimatedTime || "—"}</td>
 <td>
 <span className={`badge ${service.isActive ? 'badge-success' : 'badge-danger'}`}>
 {service.isActive ? "Aktif" : "Nonaktif"}
 </span>
 </td>
 <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
 <Link
 href={`/layanan/${service.code}`}
 target="_blank"
 className="action-btn-hover"
 style={{
 display: "inline-flex", alignItems: "center", justifyContent: "center",
 width: "32px", height: "32px", borderRadius: "6px", color: "#64748b",
 textDecoration: "none", marginRight: "4px"
 }}
 title="Lihat Detail (Publik)"
 >
 <Eye size={16} />
 </Link>
 <Link
 href={`/kades/layanan/${service.id}/edit`}
 className="action-btn-hover edit"
 style={{
 display: "inline-flex", alignItems: "center", justifyContent: "center",
 width: "32px", height: "32px", borderRadius: "6px", color: "#64748b",
 textDecoration: "none", marginRight: "4px"
 }}
 title="Edit Layanan"
 >
 <Edit size={16} />
 </Link>
 <button
 onClick={() => handleToggleStatus(service.id, service.isActive)}
 disabled={loadingId === service.id}
 className={`action-btn-hover ${service.isActive ? 'toggle' : 'toggle-on'}`}
 style={{
 display: "inline-flex", alignItems: "center", justifyContent: "center",
 width: "32px", height: "32px", borderRadius: "6px", color: "#64748b",
 border: "none", background: "transparent", cursor: loadingId === service.id ? "not-allowed" : "pointer",
 opacity: loadingId === service.id ? 0.5 : 1
 }}
 title={service.isActive ? "Nonaktifkan" : "Aktifkan"}
 >
 {loadingId === service.id ? (
 <span style={{
 width: "16px", height: "16px", border: "2px solid #94a3b8",
 borderTopColor: "transparent", borderRadius: "50%",
 animation: "spin 1s linear infinite"
 }} />
 ) : service.isActive ? (
 <PowerOff size={16} />
 ) : (
 <Power size={16} />
 )}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}
