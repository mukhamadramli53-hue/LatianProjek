"use client";

import React from "react";
import type { AiProviderType, AiVersionId, AiVersionInfo } from "@/lib/ai/types";

export interface UnifiedAiVersionOption {
  id: AiVersionId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  accentColor: string;
  isDefault?: boolean;
}

export const DEFAULT_AI_VERSIONS: UnifiedAiVersionOption[] = [
  {
    id: "fast",
    label: "v1.0 Cepat",
    shortLabel: "v1 Cepat",
    icon: "⚡",
    description: "Respons kilat untuk cek status & syarat layanan",
    accentColor: "#0f172a",
  },
  {
    id: "standard",
    label: "v2.0 Standar",
    shortLabel: "v2 Standar",
    icon: "✨",
    description: "Seimbang untuk data layanan, antrean & operasional",
    accentColor: "#4f46e5",
    isDefault: true,
  },
  {
    id: "pro",
    label: "v3.0 Pro",
    shortLabel: "v3 Pro",
    icon: "🧠",
    description: "Analisis mendalam dashboard, laporan & audit desa",
    accentColor: "#7c3aed",
  },
];

export function mergeVersionMetadata(serverVersions?: AiVersionInfo[]): UnifiedAiVersionOption[] {
  if (!serverVersions || serverVersions.length === 0) {
    return DEFAULT_AI_VERSIONS;
  }
  return DEFAULT_AI_VERSIONS.map((def) => {
    const match = serverVersions.find((v) => v.id === def.id);
    if (!match) return def;
    return {
      ...def,
      label: match.label || def.label,
      shortLabel: match.shortLabel || def.shortLabel,
      description: match.description || def.description,
      isDefault: match.isDefault ?? def.isDefault,
    };
  });
}

export function getAiVersionBadgeInfo(
  version?: AiVersionId,
  versionLabel?: string,
  legacyProvider?: AiProviderType
): { text: string; bg: string; color: string; border: string } {
  const resolvedId: AiVersionId =
    version ??
    (legacyProvider === "gemini"
      ? "pro"
      : legacyProvider === "grok"
      ? "fast"
      : "standard");

  if (resolvedId === "fast") {
    return {
      text: `⚡ Asisten AI • ${versionLabel || "v1.0 Cepat"}`,
      bg: "#f1f5f9",
      color: "#334155",
      border: "#cbd5e1",
    };
  }
  if (resolvedId === "pro") {
    return {
      text: `🧠 Asisten AI • ${versionLabel || "v3.0 Pro"}`,
      bg: "#f5f3ff",
      color: "#6d28d9",
      border: "#ddd6fe",
    };
  }
  return {
    text: `✨ Asisten AI • ${versionLabel || "v2.0 Standar"}`,
    bg: "#eef2ff",
    color: "#4338ca",
    border: "#c7d2fe",
  };
}

interface AiVersionSelectorProps {
  activeVersion: AiVersionId;
  onChange: (version: AiVersionId) => void;
  versions?: UnifiedAiVersionOption[];
  disabled?: boolean;
  compact?: boolean;
}

export default function AiVersionSelector({
  activeVersion,
  onChange,
  versions = DEFAULT_AI_VERSIONS,
  disabled = false,
  compact = false,
}: AiVersionSelectorProps) {
  const activeMeta = versions.find((v) => v.id === activeVersion) ?? versions[1];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: compact ? 6 : 10,
        padding: compact ? "6px 12px" : "8px 12px",
        background: compact ? "#ffffff" : "#f8fafc",
        borderTop: compact ? "1px solid #e2e8f0" : undefined,
        border: compact ? undefined : "1px solid #e2e8f0",
        borderRadius: compact ? undefined : 14,
        marginTop: compact ? undefined : 8,
        fontSize: compact ? 11 : 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: "#475569" }}>
          {compact ? "🤖 Asisten AI:" : "🤖 Versi Asisten AI:"}
        </span>
        {!compact && activeMeta && (
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            — {activeMeta.description}
          </span>
        )}
      </div>

      <div
        role="group"
        aria-label="Pilih Versi Asisten AI"
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "#f1f5f9",
          padding: compact ? "2px" : "3px",
          borderRadius: compact ? 10 : 12,
          border: "1px solid #e2e8f0",
          gap: compact ? 2 : 3,
        }}
      >
        {versions.map((ver) => {
          const isActive = activeVersion === ver.id;
          return (
            <button
              key={ver.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(ver.id)}
              title={`${ver.label} — ${ver.description}`}
              aria-pressed={isActive}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: compact ? "4px 8px" : "5px 11px",
                borderRadius: compact ? 8 : 9,
                fontSize: compact ? 10.5 : 12,
                fontWeight: 700,
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                background: isActive ? "#ffffff" : "transparent",
                color: isActive ? ver.accentColor : "#64748b",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
                opacity: disabled ? 0.65 : 1,
                whiteSpace: "nowrap",
              }}
            >
              <span>
                {ver.icon} {compact ? ver.shortLabel : ver.label}
              </span>
              {!compact && ver.isDefault && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: isActive ? "#e0e7ff" : "#e2e8f0",
                    color: isActive ? "#4338ca" : "#64748b",
                  }}
                >
                  Default
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

