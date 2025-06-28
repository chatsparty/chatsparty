import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import type { CreateDialogState } from "../types";

interface CreateFileDialogProps {
  dialog: CreateDialogState;
  currentPath: string;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onCreate: () => void;
}

export const CreateFileDialog: React.FC<CreateFileDialogProps> = ({
  dialog,
  currentPath,
  onClose,
  onNameChange,
  onCreate,
}) => {
  return (
    <Dialog open={dialog.show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create New {dialog.type === "file" ? "File" : "Folder"}
          </DialogTitle>
          <DialogDescription>
            Enter a name for the new {dialog.type}. It will be created in the
            current directory.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={dialog.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={
                dialog.type === "file" ? "filename.txt" : "folder-name"
              }
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !dialog.creating) {
                  onCreate();
                }
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Location: {currentPath}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={dialog.creating}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={!dialog.name.trim() || dialog.creating}
          >
            {dialog.creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${dialog.type === "file" ? "File" : "Folder"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};