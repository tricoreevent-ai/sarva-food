import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { compressImageFile } from "@/lib/image-optimization";
import { withTenantId } from "@/lib/tenant";
import type { SocialPostDoc, SocialTemplateDoc } from "@/types/firebase";

export async function uploadFoodPostImage(restaurantId: string, file: File) {
  const optimizedFile = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1920 });
  const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const imagePath = `restaurants/${restaurantId}/social/${crypto.randomUUID()}-${safeName}`;
  const imageRef = ref(getFirebaseStorage(), imagePath);
  await uploadBytes(imageRef, optimizedFile, { contentType: optimizedFile.type });
  return { imagePath, downloadUrl: await getDownloadURL(imageRef) };
}

export async function saveSocialTemplate(
  input: Omit<SocialTemplateDoc, "id" | "createdAt" | "updatedAt">,
) {
  const db = getFirebaseDb();
  const templateRef = doc(refs.socialTemplates(db));
  const template: SocialTemplateDoc = {
    id: templateRef.id,
    ...input,
    createdAt: serverTimestamp() as SocialTemplateDoc["createdAt"],
    updatedAt: serverTimestamp() as SocialTemplateDoc["updatedAt"],
  };
  await setDoc(templateRef, template);
  return template;
}

export async function saveGeneratedPost(
  input: Omit<SocialPostDoc, "id" | "createdAt" | "updatedAt">,
) {
  const db = getFirebaseDb();
  const postRef = doc(refs.socialPosts(db));
  const post: SocialPostDoc = {
    id: postRef.id,
    ...withTenantId(input),
    createdAt: serverTimestamp() as SocialPostDoc["createdAt"],
    updatedAt: serverTimestamp() as SocialPostDoc["updatedAt"],
  };
  await setDoc(postRef, post);
  return post;
}

export async function savePostExportMetadata(
  postId: string,
  metadata: SocialPostDoc["exportMetadata"],
) {
  await updateDoc(typedDoc<SocialPostDoc>(getFirebaseDb(), "socialPosts", postId), {
    exportMetadata: metadata,
    updatedAt: serverTimestamp(),
  });
}
