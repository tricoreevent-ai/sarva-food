export type SocialOutputFormat =
  | "instagram-story"
  | "instagram-feed"
  | "whatsapp-status"
  | "facebook-post";

export type TemplateRenderInput = {
  postId: string;
  format: SocialOutputFormat;
  templateName: string;
  headline: string;
  caption: string;
  offerCode: string;
  image: string;
  deepLink: string;
};

export const SOCIAL_FORMATS: Record<
  SocialOutputFormat,
  { label: string; width: number; height: number; aspectRatio: string }
> = {
  "instagram-story": { label: "Instagram Story", width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "instagram-feed": { label: "Instagram Feed", width: 1080, height: 1350, aspectRatio: "4 / 5" },
  "whatsapp-status": { label: "WhatsApp Status", width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "facebook-post": { label: "Facebook Post", width: 1200, height: 1200, aspectRatio: "1 / 1" },
};

export function buildTemplateExport(input: TemplateRenderInput) {
  const format = SOCIAL_FORMATS[input.format];
  return {
    ...input,
    canvas: {
      width: format.width,
      height: format.height,
      aspectRatio: format.aspectRatio,
    },
    exportedAt: new Date().toISOString(),
  };
}
