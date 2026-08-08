"use client";

import { useState } from "react";
import { whatsappService } from "@/lib/api/services";
import { Button } from "@repo/ui";
import { toast } from "sonner";
import { X } from "lucide-react";

type WhatsAppNumber = {
  id: number;
  displayName: string;
  phoneNumber?: string;
  senderId?: string | null;
  businessId?: string | null;
  status?: string;
  provider: string;
  createdAt: string;
  updatedAt?: string;
};

interface EditNumberModalProps {
  number: WhatsAppNumber;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditNumberModal({
  number,
  onClose,
  onSuccess,
}: EditNumberModalProps) {
  const [displayName, setDisplayName] = useState(number.displayName);
  const [status, setStatus] = useState(number.status || "ACTIVE");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    setLoading(true);
    try {
      await whatsappService.updateNumber(number.id, {
        displayName: displayName.trim(),
        status,
      });

      toast.success("WhatsApp number updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to update number: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit WhatsApp Number</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Phone Number (Read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 bg-gray-100"
              value={number.phoneNumber}
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">
              Phone number cannot be changed
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Display Name *
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Inactive numbers will not appear in dropdowns
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Number"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
