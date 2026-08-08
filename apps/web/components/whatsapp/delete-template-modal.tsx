"use client";

import { Button } from "@repo/ui";
import { X, AlertTriangle } from "lucide-react";

interface DeleteTemplateModalProps {
  templateName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteTemplateModal({
  templateName,
  onClose,
  onConfirm,
  loading = false,
}: DeleteTemplateModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Delete Template</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the template{" "}
            <span className="font-semibold">"{templateName}"</span>?
          </p>
          <p className="text-sm text-gray-600">
            This action cannot be undone. The template will be permanently removed from your account.
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Deleting..." : "Delete Template"}
          </Button>
        </div>
      </div>
    </div>
  );
}
