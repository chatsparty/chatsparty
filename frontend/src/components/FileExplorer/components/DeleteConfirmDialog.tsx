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
import type { DeleteDialogState } from "../types";

interface DeleteConfirmDialogProps {
  dialog: DeleteDialogState;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  dialog,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={dialog.show} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete {dialog.item?.isFolder ? "Folder" : "File"}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{dialog.item?.name}"?
            {dialog.item?.isFolder && (
              <span className="block mt-2 text-red-600 font-medium">
                This will permanently delete the folder and all its contents.
              </span>
            )}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={dialog.deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={dialog.deleting}
          >
            {dialog.deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${dialog.item?.isFolder ? "Folder" : "File"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};