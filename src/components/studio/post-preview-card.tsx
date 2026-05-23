import Image from "next/image";
import { Camera, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PostPreviewCard({
  image,
  title,
  subtitle,
}: {
  image: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Auto preview</CardTitle>
        <Camera className="size-5 text-accent" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-lg bg-muted">
          <Image src={image} alt="Generated social post preview" fill className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 text-white">
            <p className="text-2xl font-black">{title}</p>
            <p className="mt-2 text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary">
            <Send className="size-4" />
            Feed post
          </Button>
          <Button variant="outline">Story format</Button>
        </div>
      </CardContent>
    </Card>
  );
}
