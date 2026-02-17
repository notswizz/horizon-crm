"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText, CheckCircle, XCircle, DollarSign,
  Clock, AlertTriangle, Save, Check, ArrowRight, RotateCcw, Pencil,
} from "lucide-react";
import { Job, RebateStatus } from "@/types";
import { formatDate } from "@/lib/utils";

interface Props {
  job: Job;
  onUpdate: (updates: Partial<Job>) => Promise<void>;
}

const statusConfig: Record<RebateStatus, { label: string; color: string; icon: typeof Clock }> = {
  none: { label: "None", color: "bg-gray-100 text-gray-700", icon: Clock },
  calculated: { label: "Calculated", color: "bg-orange-100 text-orange-700", icon: FileText },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: FileText },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700", icon: DollarSign },
};

const NEXT_STAGE: Record<RebateStatus, RebateStatus | null> = {
  none: "calculated",
  calculated: "submitted",
  submitted: "accepted",
  accepted: "paid",
  declined: "submitted",
  paid: null,
};

const NEXT_LABEL: Record<RebateStatus, string> = {
  none: "Mark Calculated",
  calculated: "Mark Submitted",
  submitted: "Mark Accepted",
  accepted: "Mark Paid",
  declined: "Resubmit",
  paid: "",
};

// Stages that can be declined
const CAN_DECLINE: RebateStatus[] = ["submitted", "accepted"];

export function RebatePipeline({ job, onUpdate }: Props) {
  const rebate = job.rebate;

  if (!rebate || rebate.estimatedRebate === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-400 text-sm">
          <p>Calculate rebate first to track pipeline</p>
        </CardContent>
      </Card>
    );
  }

  const [editing, setEditing] = useState<"advance" | "decline" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [claimedAmount, setClaimedAmount] = useState(rebate.claimedAmount || rebate.estimatedRebate);
  const [submittedDate, setSubmittedDate] = useState(rebate.submittedDate || "");
  const [claimNumber, setClaimNumber] = useState(rebate.claimNumber || "");
  const [approvedAmount, setApprovedAmount] = useState(rebate.approvedAmount || 0);
  const [approvedDate, setApprovedDate] = useState(rebate.approvedDate || "");
  const [declineReason, setDeclineReason] = useState(rebate.declineReason || "");
  const [paidAmount, setPaidAmount] = useState(rebate.paidAmount || 0);
  const [paidDate, setPaidDate] = useState(rebate.paidDate || "");

  const currentStatus: RebateStatus = statusConfig[rebate.status] ? rebate.status : "none";
  const nextStage = NEXT_STAGE[currentStatus];
  const targetStatus = editing === "decline" ? "declined" : editing === "advance" && nextStage ? nextStage : currentStatus;

  const handleSave = async () => {
    setSaving(true);

    const newStatus = editing === "edit" ? currentStatus : targetStatus;
    const variance = approvedAmount > 0 ? claimedAmount - approvedAmount : undefined;

    await onUpdate({
      rebate: {
        ...rebate,
        claimedAmount,
        submittedDate: submittedDate || undefined,
        claimNumber: claimNumber || undefined,
        status: newStatus,
        approvedAmount: newStatus === "accepted" || newStatus === "paid" ? approvedAmount : undefined,
        approvedDate: newStatus === "accepted" || newStatus === "paid" ? approvedDate || undefined : undefined,
        declineReason: newStatus === "declined" ? declineReason : undefined,
        paidAmount: newStatus === "paid" ? paidAmount : undefined,
        paidDate: newStatus === "paid" ? paidDate || undefined : undefined,
        variance,
      },
    });

    setSaving(false);
    setSaved(true);
    setEditing(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const cfg = statusConfig[currentStatus];
  const Icon = cfg.icon;

  // Pipeline progress dots
  const stages: RebateStatus[] = ["none", "calculated", "submitted", "accepted", "paid"];
  const currentIdx = stages.indexOf(currentStatus === "declined" ? "submitted" : currentStatus);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Icon size={16} className={cfg.color.split(" ")[1]} />
            Rebate Pipeline
          </h3>
          <Badge className={cfg.color + " text-[10px]"}>{cfg.label}</Badge>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-4">
          {stages.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= currentIdx ? "bg-[#FF6B35]" : "bg-gray-200"
                } ${currentStatus === "declined" && i >= currentIdx ? "bg-red-200" : ""}`}
              />
            </div>
          ))}
        </div>

        {!editing ? (
          // View mode
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-500">Estimated</p>
                <p className="text-xl font-bold text-[#FF6B35]">${rebate.estimatedRebate.toLocaleString()}</p>
              </div>
              {rebate.claimedAmount != null && rebate.claimedAmount > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500">Claimed</p>
                  <p className="text-xl font-bold">${rebate.claimedAmount.toLocaleString()}</p>
                </div>
              )}
            </div>

            {rebate.submittedDate && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <p className="text-[10px] text-gray-500">Submitted</p>
                  <p className="text-xs font-medium">{formatDate(rebate.submittedDate)}</p>
                </div>
                {rebate.claimNumber && (
                  <div>
                    <p className="text-[10px] text-gray-500">Claim #</p>
                    <p className="text-xs font-medium">{rebate.claimNumber}</p>
                  </div>
                )}
              </div>
            )}

            {rebate.approvedAmount != null && rebate.approvedAmount > 0 && (
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500">Approved</p>
                    <p className="text-xl font-bold text-green-600">${rebate.approvedAmount.toLocaleString()}</p>
                  </div>
                  {rebate.approvedDate && (
                    <div>
                      <p className="text-[10px] text-gray-500">Approved Date</p>
                      <p className="text-xs font-medium">{formatDate(rebate.approvedDate)}</p>
                    </div>
                  )}
                </div>

                {rebate.variance != null && rebate.variance !== 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-[11px] text-yellow-700">
                      Variance: ${Math.abs(rebate.variance).toLocaleString()}{" "}
                      {rebate.variance < 0 ? "more" : "less"} than claimed
                    </p>
                  </div>
                )}
              </div>
            )}

            {rebate.paidAmount != null && rebate.paidAmount > 0 && (
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500">Paid</p>
                    <p className="text-xl font-bold text-emerald-600">${rebate.paidAmount.toLocaleString()}</p>
                  </div>
                  {rebate.paidDate && (
                    <div>
                      <p className="text-[10px] text-gray-500">Paid Date</p>
                      <p className="text-xs font-medium">{formatDate(rebate.paidDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rebate.declineReason && (
              <div className="p-2.5 bg-red-50 rounded">
                <p className="text-[10px] text-gray-500 mb-0.5">Decline Reason</p>
                <p className="text-xs text-red-700">{rebate.declineReason}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {nextStage && (
                <Button
                  onClick={() => setEditing("advance")}
                  className="flex-1"
                  size="sm"
                >
                  {currentStatus === "declined" ? (
                    <><RotateCcw size={14} className="mr-1.5" /> {NEXT_LABEL[currentStatus]}</>
                  ) : (
                    <><ArrowRight size={14} className="mr-1.5" /> {NEXT_LABEL[currentStatus]}</>
                  )}
                </Button>
              )}
              {CAN_DECLINE.includes(currentStatus) && (
                <Button
                  onClick={() => setEditing("decline")}
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  size="sm"
                >
                  <XCircle size={14} className="mr-1.5" /> Decline
                </Button>
              )}
              {currentStatus !== "none" && (
                <button
                  onClick={() => setEditing("edit")}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
              )}
            </div>

            {saved && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                <Check size={14} /> Saved
              </div>
            )}
          </div>
        ) : (
          // Edit mode — fields based on target status
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={statusConfig[targetStatus].color + " text-[10px]"}>
                {editing === "edit" ? `Editing: ${statusConfig[currentStatus].label}` : `→ ${statusConfig[targetStatus].label}`}
              </Badge>
            </div>

            {/* Submitted fields: show when advancing to submitted, or editing submitted+ */}
            {(targetStatus === "submitted" || (editing === "edit" && ["submitted", "accepted", "paid"].includes(currentStatus))) && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Claimed Amount ($)</label>
                  <Input
                    type="number"
                    value={claimedAmount || ""}
                    onChange={(e) => setClaimedAmount(Number(e.target.value))}
                    className="text-sm h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Submitted Date</label>
                    <Input
                      type="date"
                      value={submittedDate}
                      onChange={(e) => setSubmittedDate(e.target.value)}
                      className="text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Claim Number</label>
                    <Input
                      value={claimNumber}
                      onChange={(e) => setClaimNumber(e.target.value)}
                      placeholder="GEFA-2024-12345"
                      className="text-sm h-9"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Accepted fields: show when advancing to accepted, or editing accepted/paid */}
            {(targetStatus === "accepted" || targetStatus === "paid" || (editing === "edit" && ["accepted", "paid"].includes(currentStatus))) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Approved Amount ($)</label>
                  <Input
                    type="number"
                    value={approvedAmount || ""}
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Approved Date</label>
                  <Input
                    type="date"
                    value={approvedDate}
                    onChange={(e) => setApprovedDate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
              </div>
            )}

            {/* Decline fields */}
            {targetStatus === "declined" && (
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Decline Reason</label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                  rows={2}
                  placeholder="Incomplete documentation, ineligible work, etc."
                />
              </div>
            )}

            {/* Paid fields: show when advancing to paid, or editing paid */}
            {(targetStatus === "paid" || (editing === "edit" && currentStatus === "paid")) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Paid Amount ($)</label>
                  <Input
                    type="number"
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Paid Date</label>
                  <Input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 ${editing === "decline" ? "bg-red-600 hover:bg-red-700" : ""}`}
                size="sm"
              >
                {saving ? "Saving..." : (
                  <><Save size={14} className="mr-1" /> {editing === "decline" ? "Decline Rebate" : editing === "edit" ? "Save Changes" : `Advance to ${statusConfig[targetStatus].label}`}</>
                )}
              </Button>
              <Button
                onClick={() => setEditing(null)}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
