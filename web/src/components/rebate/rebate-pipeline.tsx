"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText, CheckCircle, XCircle, DollarSign,
  Clock, AlertTriangle, Save, Check,
} from "lucide-react";
import { Job, RebateStatus } from "@/types";
import { formatDate } from "@/lib/utils";

interface Props {
  job: Job;
  onUpdate: (updates: Partial<Job>) => Promise<void>;
}

const statusConfig: Record<RebateStatus, { label: string; color: string; icon: typeof Clock }> = {
  not_submitted: { label: "Not Submitted", color: "bg-gray-100 text-gray-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: FileText },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700", icon: DollarSign },
};

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

  const [editing, setEditing] = useState(false);
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
  const [status, setStatus] = useState<RebateStatus>(rebate.status);

  const handleSave = async () => {
    setSaving(true);

    const variance = approvedAmount > 0 ? claimedAmount - approvedAmount : undefined;

    await onUpdate({
      rebate: {
        ...rebate,
        claimedAmount,
        submittedDate: submittedDate || undefined,
        claimNumber: claimNumber || undefined,
        status,
        approvedAmount: status === "approved" || status === "paid" ? approvedAmount : undefined,
        approvedDate: status === "approved" || status === "paid" ? approvedDate || undefined : undefined,
        declineReason: status === "declined" ? declineReason : undefined,
        paidAmount: status === "paid" ? paidAmount : undefined,
        paidDate: status === "paid" ? paidDate || undefined : undefined,
        variance,
      },
    });

    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

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

            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="w-full mt-2"
              size="sm"
            >
              Update Pipeline
            </Button>
          </div>
        ) : (
          // Edit mode
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as RebateStatus)} className="text-sm h-9">
                <option value="not_submitted">Not Submitted</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="paid">Paid</option>
              </Select>
            </div>

            {status !== "not_submitted" && (
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

            {(status === "approved" || status === "paid") && (
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

            {status === "declined" && (
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

            {status === "paid" && (
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
                className={`flex-1 ${saved ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                size="sm"
              >
                {saving ? "Saving..." : saved ? (
                  <><Check size={14} className="mr-1" /> Saved</>
                ) : (
                  <><Save size={14} className="mr-1" /> Save</>
                )}
              </Button>
              <Button
                onClick={() => setEditing(false)}
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
