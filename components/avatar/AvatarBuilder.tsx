// components/avatar/AvatarBuilder.tsx
"use client";

import { useState, useCallback, memo } from "react";
import {
  AvatarConfig,
  getAvatarUrlFromConfig,
  randomAvatarConfig,
  defaultAvatarConfig,
  STYLE_OPTIONS,
  BG_COLORS,
  styleMap,
} from "@/lib/utils/dicebear";
import {
  Shuffle,
  Check,
  Loader2,
  Sparkles,
  Palette,
  Scissors,
  Eye,
  Smile,
  CircleDot,
  User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "style" | "hair" | "eyes" | "mouth" | "extras" | "colors";

interface AvatarBuilderProps {
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  saving?: boolean;
  saved?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "style",  label: "Tipo",    icon: <User className="w-4 h-4" /> },
  { id: "hair",   label: "Cabello", icon: <Scissors className="w-4 h-4" /> },
  { id: "eyes",   label: "Cara",    icon: <Eye className="w-4 h-4" /> },
  { id: "mouth",  label: "Boca",    icon: <Smile className="w-4 h-4" /> },
  { id: "extras", label: "Extras",  icon: <Sparkles className="w-4 h-4" /> },
  { id: "colors", label: "Color",   icon: <Palette className="w-4 h-4" /> },
];

function getCssColor(val: string): string {
  if (/^[0-9a-fA-F]{6}$/.test(val)) {
    return `#${val}`;
  }
  return val;
}

// ─── Mini Preview Button ──────────────────────────────────────────────────────
const MiniAvatar = memo(function MiniAvatar({
  url,
  selected,
  onClick,
  label,
}: {
  url: string;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden
        border-2 transition-all duration-150 active:scale-90 bg-slate-900/50
        ${selected
          ? "border-violet-500 scale-105 shadow-lg shadow-violet-500/30"
          : "border-white/10 hover:border-white/30"
        }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        loading="lazy"
        className="w-full h-full object-contain"
      />
      {selected && (
        <div className="absolute inset-0 flex items-end justify-end p-1">
          <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>
      )}
    </button>
  );
});

// ─── Color Swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({
  hex,
  label,
  selected,
  onClick,
}: {
  hex: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-9 h-9 rounded-xl border-2 transition-all duration-150 active:scale-90 flex-shrink-0 flex items-center justify-center
        ${selected ? "border-violet-400 scale-110 shadow-lg shadow-violet-500/30" : "border-white/10 hover:border-white/30"}`}
      style={{ backgroundColor: hex || "transparent" }}
    >
      {!hex && (
        <span className="text-white/40 text-xs">⊘</span>
      )}
      {selected && hex && (
        <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />
      )}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">
      {children}
    </p>
  );
}

// ─── Scrollable option row ────────────────────────────────────────────────────
function OptionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
      {children}
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-95
        ${checked
          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8"
        }`}
    >
      <div className={`w-8 h-4 rounded-full transition-all relative ${checked ? "bg-violet-500" : "bg-white/20"}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </div>
      {label}
    </button>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────
export function AvatarBuilder({
  initialConfig,
  onSave,
  saving = false,
  saved = false,
}: AvatarBuilderProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<Tab>("style");

  const update = useCallback((updates: Partial<AvatarConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const mainUrl = getAvatarUrlFromConfig(config, 200);

  // Build a preview URL for mini-avatar with a single feature overridden
  const previewUrl = useCallback(
    (overrides: Partial<AvatarConfig>) =>
      getAvatarUrlFromConfig({ ...config, ...overrides }, 64),
    [config]
  );

  const randomize = () => setConfig(randomAvatarConfig(config.seed, config.style));

  // Access the selected style properties dynamically
  const styleSchema = styleMap[config.style];
  const schemaProps = styleSchema?.schema?.properties || {};

  // Extract option arrays from the DiceBear schema
  const hairOptions = schemaProps.hair?.default || schemaProps.top?.default || [];
  const eyesOptions = schemaProps.eyes?.default || [];
  const eyebrowOptions = schemaProps.eyebrows?.default || [];
  const mouthOptions = schemaProps.mouth?.default || [];
  const skinColorOptions = schemaProps.skinColor?.default || [];
  const hairColorOptions = schemaProps.hairColor?.default || [];
  const hatColorOptions = schemaProps.hatColor?.default || [];
  
  // Style specific arrays
  const glassesOptions = schemaProps.glasses?.default || schemaProps.accessories?.default || [];
  const beardOptions = schemaProps.facialHair?.default || schemaProps.beard?.default || [];
  const beardColorOptions = schemaProps.facialHairColor?.default || [];
  const clothingOptions = schemaProps.clothing?.default || [];
  const clothingColorOptions = schemaProps.clothingColor?.default || schemaProps.clothesColor?.default || [];
  const faceOptions = schemaProps.face?.default || [];
  const sidesOptions = schemaProps.sides?.default || [];
  const textureOptions = schemaProps.texture?.default || [];
  const baseColorOptions = schemaProps.baseColor?.default || [];
  const earringsOptions = schemaProps.earrings?.default || [];
  const featuresOptions = schemaProps.features?.default || [];

  // Filter tabs based on what the selected style supports
  const availableTabs = TABS.filter((tab) => {
    if (tab.id === "style" || tab.id === "colors") return true;
    if (tab.id === "hair") return hairOptions.length > 0;
    if (tab.id === "eyes") return eyesOptions.length > 0 || skinColorOptions.length > 0;
    if (tab.id === "mouth") return mouthOptions.length > 0;
    if (tab.id === "extras") {
      return (
        glassesOptions.length > 0 ||
        beardOptions.length > 0 ||
        clothingOptions.length > 0 ||
        faceOptions.length > 0 ||
        sidesOptions.length > 0 ||
        earringsOptions.length > 0 ||
        featuresOptions.length > 0
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ── Main preview ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div
            className="w-36 h-36 rounded-3xl overflow-hidden border-2 border-violet-500/50 shadow-2xl shadow-violet-500/20 flex-shrink-0"
            style={{
              background: config.backgroundColor
                ? getCssColor(config.backgroundColor)
                : "#1a1a28",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainUrl}
              alt="Tu avatar"
              key={mainUrl}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <p className="text-sm font-bold text-white/60">Tu avatar</p>
          <button
            onClick={randomize}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-white/5 border border-white/10 text-white/70 text-sm font-semibold
              hover:bg-white/10 active:scale-95 transition-all"
          >
            <Shuffle className="w-4 h-4 text-violet-400" />
            Aleatorio
          </button>
          <button
            onClick={() => onSave(config)}
            disabled={saving}
            id="btn-save-avatar"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold
              hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all
              disabled:opacity-50 shadow-lg shadow-violet-500/20"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
            ) : saved ? (
              <><Check className="w-4 h-4" />¡Listo!</>
            ) : (
              <><Check className="w-4 h-4" />Guardar</>
            )}
          </button>
        </div>
      </div>

      {/* ── Category Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all
              ${activeTab === tab.id
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────── */}
      <div className="space-y-5">
        
        {/* STYLE TAB */}
        {activeTab === "style" && (
          <div className="space-y-3">
            <SectionLabel>Raza / Tipo de Personaje</SectionLabel>
            <div className="grid grid-cols-1 gap-2">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    const newConfig = defaultAvatarConfig(config.seed, style.id as any);
                    setConfig(newConfig);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all active:scale-98
                    ${config.style === style.id
                      ? "bg-violet-500/10 border-violet-500 text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1a1a28] flex-shrink-0 flex items-center justify-center border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAvatarUrlFromConfig(defaultAvatarConfig(config.seed, style.id as any), 48)}
                      alt={style.label}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{style.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{style.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HAIR TAB */}
        {activeTab === "hair" && (
          <>
            {hairOptions.length > 0 && (
              <div>
                <SectionLabel>Estilo de Cabello</SectionLabel>
                <OptionRow>
                  {hairOptions.map((h: string) => {
                    const paramKey = schemaProps.top ? "top" : "hair";
                    return (
                      <MiniAvatar
                        key={h}
                        url={previewUrl({ [paramKey]: h })}
                        selected={config.hair === h || config.top === h}
                        onClick={() => update({ [paramKey]: h })}
                        label={h}
                      />
                    );
                  })}
                </OptionRow>
              </div>
            )}
            
            {hairColorOptions.length > 0 && (
              <div>
                <SectionLabel>Color de Cabello</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {hairColorOptions.map((c: string) => (
                    <ColorSwatch
                      key={c}
                      hex={getCssColor(c)}
                      label={c}
                      selected={config.hairColor === c}
                      onClick={() => update({ hairColor: c })}
                    />
                  ))}
                </div>
              </div>
            )}

            {config.style === "avataaars" && hatColorOptions.length > 0 && (
              config.top === "hat" ||
              config.top === "turban" ||
              config.top === "hijab" ||
              config.top?.startsWith("winter")
            ) && (
              <div className="mt-3 animate-fade-up">
                <SectionLabel>Color de Sombrero / Gorro</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {hatColorOptions.map((c: string) => (
                    <ColorSwatch
                      key={c}
                      hex={getCssColor(c)}
                      label={c}
                      selected={config.hatColor === c}
                      onClick={() => update({ hatColor: c })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* EYES/FACE TAB */}
        {activeTab === "eyes" && (
          <>
            {skinColorOptions.length > 0 && (
              <div>
                <SectionLabel>Color de Piel</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {skinColorOptions.map((c: string) => (
                    <ColorSwatch
                      key={c}
                      hex={getCssColor(c)}
                      label={c}
                      selected={config.skinColor === c}
                      onClick={() => update({ skinColor: c })}
                    />
                  ))}
                </div>
              </div>
            )}

            {faceOptions.length > 0 && (
              <div>
                <SectionLabel>Tipo de Rostro</SectionLabel>
                <OptionRow>
                  {faceOptions.map((f: string) => (
                    <MiniAvatar
                      key={f}
                      url={previewUrl({ face: f })}
                      selected={config.face === f}
                      onClick={() => update({ face: f })}
                      label={f}
                    />
                  ))}
                </OptionRow>
              </div>
            )}

            {eyesOptions.length > 0 && (
              <div>
                <SectionLabel>Ojos</SectionLabel>
                <OptionRow>
                  {eyesOptions.map((e: string) => (
                    <MiniAvatar
                      key={e}
                      url={previewUrl({ eyes: e })}
                      selected={config.eyes === e}
                      onClick={() => update({ eyes: e })}
                      label={e}
                    />
                  ))}
                </OptionRow>
              </div>
            )}

            {eyebrowOptions.length > 0 && (
              <div>
                <SectionLabel>Cejas</SectionLabel>
                <OptionRow>
                  {eyebrowOptions.map((eb: string) => (
                    <MiniAvatar
                      key={eb}
                      url={previewUrl({ eyebrows: eb })}
                      selected={config.eyebrows === eb}
                      onClick={() => update({ eyebrows: eb })}
                      label={eb}
                    />
                  ))}
                </OptionRow>
              </div>
            )}
          </>
        )}

        {/* MOUTH TAB */}
        {activeTab === "mouth" && mouthOptions.length > 0 && (
          <div>
            <SectionLabel>Boca</SectionLabel>
            <OptionRow>
              {mouthOptions.map((m: string) => (
                <MiniAvatar
                  key={m}
                  url={previewUrl({ mouth: m })}
                  selected={config.mouth === m}
                  onClick={() => update({ mouth: m })}
                  label={m}
                />
              ))}
            </OptionRow>
          </div>
        )}

        {/* EXTRAS TAB */}
        {activeTab === "extras" && (
          <div className="space-y-4">
            
            {/* Beards (only for Avataaars / PixelArt if supported) */}
            {beardOptions.length > 0 && (
              <div className="space-y-2">
                <Toggle
                  label="Barba"
                  checked={!!config.hasBeard}
                  onChange={(v) => update({ hasBeard: v })}
                />
                {config.hasBeard && (
                  <>
                    <SectionLabel>Estilo de Barba</SectionLabel>
                    <OptionRow>
                      {beardOptions.map((b: string) => {
                        const paramKey = schemaProps.facialHair ? "facialHair" : "beard";
                        return (
                          <MiniAvatar
                            key={b}
                            url={previewUrl({ hasBeard: true, [paramKey]: b })}
                            selected={config.facialHair === b || config.beard === b}
                            onClick={() => update({ [paramKey]: b })}
                            label={b}
                          />
                        );
                      })}
                    </OptionRow>
                    {beardColorOptions.length > 0 && (
                      <div>
                        <SectionLabel>Color de Barba</SectionLabel>
                        <div className="flex flex-wrap gap-2">
                          {beardColorOptions.map((c: string) => (
                            <ColorSwatch
                              key={c}
                              hex={getCssColor(c)}
                              label={c}
                              selected={config.facialHairColor === c}
                              onClick={() => update({ facialHairColor: c })}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Glasses */}
            {glassesOptions.length > 0 && (
              <div className="space-y-2">
                <Toggle
                  label="Lentes"
                  checked={!!config.hasGlasses}
                  onChange={(v) => update({ hasGlasses: v })}
                />
                {config.hasGlasses && (
                  <>
                    <SectionLabel>Estilos de Lentes</SectionLabel>
                    <OptionRow>
                      {glassesOptions.map((g: string) => {
                        const paramKey = schemaProps.accessories ? "accessories" : "glasses";
                        return (
                          <MiniAvatar
                            key={g}
                            url={previewUrl({ hasGlasses: true, [paramKey]: g })}
                            selected={config.accessories === g || config.glasses === g}
                            onClick={() => update({ [paramKey]: g })}
                            label={g}
                          />
                        );
                      })}
                    </OptionRow>
                  </>
                )}
              </div>
            )}

            {/* Robot ears / sensors */}
            {sidesOptions.length > 0 && (
              <div>
                <SectionLabel>Sensores Laterales (Orejeras)</SectionLabel>
                <OptionRow>
                  {sidesOptions.map((s: string) => (
                    <MiniAvatar
                      key={s}
                      url={previewUrl({ sides: s })}
                      selected={config.sides === s}
                      onClick={() => update({ sides: s })}
                      label={s}
                    />
                  ))}
                </OptionRow>
              </div>
            )}

            {/* Clothes */}
            {clothingOptions.length > 0 && (
              <div className="space-y-2">
                <SectionLabel>Ropa / Vestimenta</SectionLabel>
                <OptionRow>
                  {clothingOptions.map((cl: string) => (
                    <MiniAvatar
                      key={cl}
                      url={previewUrl({ clothing: cl })}
                      selected={config.clothing === cl}
                      onClick={() => update({ clothing: cl })}
                      label={cl}
                    />
                  ))}
                </OptionRow>
                {clothingColorOptions.length > 0 && (
                  <div>
                    <SectionLabel>Color de Vestimenta</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {clothingColorOptions.map((c: string) => {
                        const paramKey = schemaProps.clothingColor ? "clothingColor" : "clothesColor";
                        return (
                          <ColorSwatch
                            key={c}
                            hex={getCssColor(c)}
                            label={c}
                            selected={config.clothingColor === c || config.clothesColor === c}
                            onClick={() => update({ [paramKey]: c })}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Earrings */}
            {earringsOptions.length > 0 && (
              <Toggle
                label="Aretes"
                checked={!!config.hasEarrings}
                onChange={(v) => update({ hasEarrings: v })}
              />
            )}

            {/* Features (freckles, blush, mustache, etc.) */}
            {featuresOptions.length > 0 && (
              <div className="space-y-2">
                <Toggle
                  label="Rasgos faciales"
                  checked={!!config.hasFeatures}
                  onChange={(v) => update({ hasFeatures: v })}
                />
                {config.hasFeatures && (
                  <div className="flex flex-wrap gap-2">
                    {featuresOptions.map((f: string) => (
                      <button
                        key={f}
                        onClick={() => update({ features: f })}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95
                          ${config.features === f
                            ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === "colors" && (
          <div className="space-y-4">
            <div>
              <SectionLabel>Color de Fondo</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((c) => (
                  <ColorSwatch
                    key={c.value}
                    hex={c.hex}
                    label={c.label}
                    selected={config.backgroundColor === c.value}
                    onClick={() => update({ backgroundColor: c.value })}
                  />
                ))}
              </div>
            </div>
            
            {/* Robot baseColor */}
            {baseColorOptions.length > 0 && (
              <div>
                <SectionLabel>Color Base de Pintura (Robot)</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {baseColorOptions.map((c: string) => (
                    <ColorSwatch
                      key={c}
                      hex={getCssColor(c)}
                      label={c}
                      selected={config.baseColor === c}
                      onClick={() => update({ baseColor: c })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Robot Body Pattern / Texture */}
            {textureOptions.length > 0 && (
              <div>
                <SectionLabel>Patrón del Chasis (Textura)</SectionLabel>
                <OptionRow>
                  {textureOptions.map((t: string) => (
                    <button
                      key={t}
                      onClick={() => update({ texture: t })}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95
                        ${config.texture === t
                          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </OptionRow>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
