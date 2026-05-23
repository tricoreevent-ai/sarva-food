import dynamic from "next/dynamic";
import { InlineLoading } from "@/components/state/page-state";

const InstagramPostCreatorFlow = dynamic(
  () =>
    import("@/components/flows/instagram-post-creator-flow").then(
      (module) => module.InstagramPostCreatorFlow,
    ),
  {
    loading: () => <InlineLoading label="Loading post studio" />,
  },
);

export default function StudioCreatePostPage() {
  return <InstagramPostCreatorFlow />;
}
