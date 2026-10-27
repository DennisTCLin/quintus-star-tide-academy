import { memo } from "react";
import { castleStage, castleStyle, MAX_CASTLE_EXPANSION, type CastleStyleId } from "./castle-growth";

/** Higgsfield artwork shared by the exterior, previews and the island's actual hall. */
export default memo(function CastleIllustration({ styleId, expansion, decorative = false }: {
  styleId: CastleStyleId; expansion: number; decorative?: boolean;
}) {
  const style = castleStyle(styleId);
  const stage = Number.isFinite(expansion) ? Math.min(MAX_CASTLE_EXPANSION, Math.max(0, Math.floor(expansion))) : 0;
  const asset = `/assets/castles/${style.id}-${stage}`;
  return <img className="castle-illustration"
    src={`${asset}-384.webp`}
    srcSet={`${asset}-384.webp 384w, ${asset}-1280.webp 1280w`}
    sizes={decorative ? "(max-width:720px) 140px, 180px" : "(max-width:720px) 90vw, (max-width:1050px) 55vw, 700px"}
    width="1280" height="956"
    alt={decorative ? "" : `${style.name}城堡，${castleStage(stage).name}`}
    aria-hidden={decorative || undefined}
    loading={decorative ? "lazy" : "eager"} decoding="async" draggable={false}
  />;
});
