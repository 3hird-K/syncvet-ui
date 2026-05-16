"use client";

import { useState } from "react";
import { Plus, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.error("Database Connection Error", {
        description: "The user management service is currently undergoing maintenance. Please try again later.",
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="size-5" />
            <DialogTitle className="text-xl font-bold">Add System User</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a new account for a veterinary officer or administrative staff.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest">
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Juan Dela Cruz"
              className="h-9 text-xs"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. juan@syncvet.ph"
              className="h-9 text-xs"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role" className="text-[10px] font-bold uppercase tracking-widest">
              System Role
            </Label>
            <Select defaultValue="field-officer">
              <SelectTrigger id="role" className="h-9 text-xs">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administrator">Administrator</SelectItem>
                <SelectItem value="lead-veterinarian">Lead Veterinarian</SelectItem>
                <SelectItem value="field-officer">Field Officer</SelectItem>
                <SelectItem value="encoder">Data Encoder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            onClick={(e) => handleSubmit(e as any)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
