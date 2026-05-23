"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MenuEditorDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add menu item</DialogTitle>
          <DialogDescription>
            Wireframe form only. Later this can connect to catalog and kitchen routing.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" placeholder="Paneer pepper fry" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-price">Price</Label>
            <Input id="item-price" placeholder="249" inputMode="numeric" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea id="item-desc" placeholder="Short customer-facing dish note" />
          </div>
          <Button type="button" className="w-full">
            Save draft item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
