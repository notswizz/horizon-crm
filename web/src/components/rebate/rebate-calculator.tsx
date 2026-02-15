"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calculator, DollarSign, TrendingUp, AlertCircle,
  Plus, X, Save, Check,
} from "lucide-react";
import {
  calculateHER, calculateHEAR, calculateProjectCost,
  calculateSavings, calculateProfit, HEAR_ITEMS,
} from "@/lib/rebate-calculator";
import { Job, IncomeTier, RebateProgram } from "@/types";

interface Props {
  job: Job;
  onUpdate: (updates: Partial<Job>) => Promise<void>;
}

export function RebateCalculator({ job, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [program, setProgram] = useState<RebateProgram>(
    job.rebate?.program || "HER"
  );
  const [incomeTier, setIncomeTier] = useState<IncomeTier>(
    job.rebate?.incomeTier || "below_80"
  );

  // Energy assessment (HER)
  const [baselineKWh, setBaselineKWh] = useState(
    job.energyAssessment?.baselineKWh || 0
  );
  const [projectedKWh, setProjectedKWh] = useState(
    job.energyAssessment?.projectedKWh || 0
  );
  const [assessor, setAssessor] = useState(
    job.energyAssessment?.assessor || ""
  );

  // Billable amount
  const [billableAmount, setBillableAmount] = useState(
    job.projectCosts?.billableAmount || 0
  );

  // Actual costs
  const [materials, setMaterials] = useState(job.projectCosts?.materials || 0);
  const [labor, setLabor] = useState(job.projectCosts?.labor || 0);
  const [laborHours, setLaborHours] = useState(job.projectCosts?.laborHours || 0);
  const [laborRate, setLaborRate] = useState(job.projectCosts?.laborRate || 135);
  const [assessmentFee, setAssessmentFee] = useState(job.projectCosts?.assessmentFee || 0);
  const [overhead, setOverhead] = useState(job.projectCosts?.overhead || 0);
  const [other, setOther] = useState(job.projectCosts?.other || 0);

  // HEAR items
  const [hearItems, setHearItems] = useState<{ name: string; cost: number }[]>(
    job.rebate?.hearItems?.map((item) => ({ name: item.name, cost: item.cost })) || []
  );

  const savingsPercent = calculateSavings(baselineKWh, projectedKWh);
  const actualCosts = calculateProjectCost({ materials, labor, assessmentFee, overhead, other });

  useEffect(() => {
    if (laborHours > 0 && laborRate > 0) {
      setLabor(laborHours * laborRate);
    }
  }, [laborHours, laborRate]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const herCalc = program !== "HEAR"
    ? calculateHER(savingsPercent, incomeTier, billableAmount)
    : { amount: 0, tier: "" };

  const hearCalc = program !== "HER" && hearItems.length > 0
    ? calculateHEAR(hearItems, incomeTier)
    : { items: [], total: 0 };

  const estimatedRebate = herCalc.amount + hearCalc.total;
  const { netProfit, profitMargin } = calculateProfit(estimatedRebate, actualCosts);
  const markup = actualCosts > 0 ? Math.round(((billableAmount - actualCosts) / actualCosts) * 100) : 0;

  const addHEARItem = () => {
    setHearItems([...hearItems, { name: HEAR_ITEMS[0], cost: 0 }]);
  };

  const removeHEARItem = (index: number) => {
    setHearItems(hearItems.filter((_, i) => i !== index));
  };

  const updateHEARItem = (index: number, field: "name" | "cost", value: string | number) => {
    const updated = [...hearItems];
    updated[index] = { ...updated[index], [field]: value };
    setHearItems(updated);
  };

  const handleSave = async () => {
    setSaving(true);

    await onUpdate({
      energyAssessment: {
        baselineKWh,
        projectedKWh,
        savingsPercent,
        assessmentDate: new Date().toISOString(),
        assessor,
      },
      projectCosts: {
        materials,
        labor,
        laborHours,
        laborRate,
        assessmentFee,
        overhead,
        other,
        total: actualCosts,
        billableAmount,
      },
      rebate: {
        program,
        incomeTier,
        incomeVerified: false,
        herTier: herCalc.tier,
        herAmount: herCalc.amount,
        hearItems: hearCalc.items,
        hearTotal: hearCalc.total,
        estimatedRebate,
        status: job.rebate?.status || "calculated",
        claimedAmount: job.rebate?.claimedAmount,
        submittedDate: job.rebate?.submittedDate,
        claimNumber: job.rebate?.claimNumber,
        approvedAmount: job.rebate?.approvedAmount,
        approvedDate: job.rebate?.approvedDate,
        paidAmount: job.rebate?.paidAmount,
        paidDate: job.rebate?.paidDate,
      },
      profitMargin,
      netProfit,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-orange-200 bg-white hover:border-[#FF6B35] hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#FF6B35]" />
          <span className="text-sm font-bold">Rebate Calculator</span>
          {estimatedRebate > 0 && (
            <Badge className="bg-orange-100 text-[#FF6B35] text-[10px]">
              ${estimatedRebate.toLocaleString()} est.
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-400">Open</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg mx-4 max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
            {/* Fixed header */}
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#FF6B35]" />
                <h2 className="text-base font-bold">Rebate Calculator</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Program Selection */}
              <div className="grid grid-cols-3 gap-2">
                {(["HER", "HEAR", "both"] as RebateProgram[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProgram(p)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      program === p
                        ? "bg-[#FF6B35] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {p === "both" ? "HER + HEAR" : p}
                  </button>
                ))}
              </div>

              {/* Income Tier */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Homeowner Income Tier</label>
                <Select
                  value={incomeTier}
                  onChange={(e) => setIncomeTier(e.target.value as IncomeTier)}
                  className="text-sm"
                >
                  <option value="below_80">&lt;80% AMI (98% HER / 100% HEAR)</option>
                  <option value="80_to_150">80-150% AMI (50% coverage)</option>
                  <option value="above_150">&gt;150% AMI (50% coverage)</option>
                </Select>
              </div>

              {/* HER Section */}
              {program !== "HEAR" && (
                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-green-600" />
                    HER (Home Efficiency Rebates)
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Baseline (kWh/yr)</label>
                      <Input
                        type="number"
                        value={baselineKWh || ""}
                        onChange={(e) => setBaselineKWh(Number(e.target.value))}
                        placeholder="12000"
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Projected (kWh/yr)</label>
                      <Input
                        type="number"
                        value={projectedKWh || ""}
                        onChange={(e) => setProjectedKWh(Number(e.target.value))}
                        placeholder="7200"
                        className="text-sm h-9"
                      />
                    </div>
                  </div>

                  {savingsPercent > 0 && (
                    <div className="mt-2 p-2.5 bg-green-50 rounded-lg">
                      <p className="text-xs">
                        <strong className="text-green-700">{savingsPercent}% savings</strong>
                        {savingsPercent < 20 && (
                          <span className="text-red-600 ml-1.5">(Need 20% to qualify)</span>
                        )}
                        {savingsPercent >= 20 && savingsPercent < 35 && (
                          <span className="text-orange-600 ml-1.5">(Tier 1)</span>
                        )}
                        {savingsPercent >= 35 && (
                          <span className="text-green-600 ml-1.5">(Tier 2 — max rebate)</span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Energy Assessor</label>
                    <Input
                      value={assessor}
                      onChange={(e) => setAssessor(e.target.value)}
                      placeholder="BPI-certified assessor name"
                      className="text-sm h-9"
                    />
                  </div>
                </div>
              )}

              {/* HEAR Section */}
              {program !== "HER" && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <DollarSign size={14} className="text-blue-600" />
                      HEAR (Electrification Rebates)
                    </h4>
                    <button
                      onClick={addHEARItem}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-gray-300 text-[11px] text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  {hearItems.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Select
                        value={item.name}
                        onChange={(e) => updateHEARItem(index, "name", e.target.value)}
                        className="flex-1 text-xs h-9"
                      >
                        {HEAR_ITEMS.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        value={item.cost || ""}
                        onChange={(e) => updateHEARItem(index, "cost", Number(e.target.value))}
                        placeholder="Cost"
                        className="w-28 text-sm h-9"
                      />
                      <button
                        onClick={() => removeHEARItem(index)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {hearItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No HEAR items added</p>
                  )}
                </div>
              )}

              {/* Actual Costs */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold mb-3">Actual Costs (Internal)</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Materials ($)</label>
                    <Input type="number" value={materials || ""} onChange={(e) => setMaterials(Number(e.target.value))} placeholder="500" className="text-sm h-9" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Assessment Fee ($)</label>
                    <Input type="number" value={assessmentFee || ""} onChange={(e) => setAssessmentFee(Number(e.target.value))} placeholder="500" className="text-sm h-9" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Labor Hours</label>
                    <Input type="number" value={laborHours || ""} onChange={(e) => setLaborHours(Number(e.target.value))} placeholder="24" className="text-sm h-9" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Rate ($/hr)</label>
                    <Input type="number" value={laborRate || ""} onChange={(e) => setLaborRate(Number(e.target.value))} placeholder="135" className="text-sm h-9" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Total Labor</label>
                    <Input type="number" value={labor || ""} readOnly tabIndex={-1} className="text-sm h-9 bg-gray-50 text-gray-500 cursor-default" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Overhead ($)</label>
                    <Input type="number" value={overhead || ""} onChange={(e) => setOverhead(Number(e.target.value))} placeholder="500" className="text-sm h-9" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Other ($)</label>
                    <Input type="number" value={other || ""} onChange={(e) => setOther(Number(e.target.value))} placeholder="500" className="text-sm h-9" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-500">Actual Costs</p>
                    <p className="text-lg font-bold text-gray-900">${actualCosts.toLocaleString()}</p>
                  </div>
                  {billableAmount > 0 && (
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500">Markup</p>
                      <p className={`text-lg font-bold ${markup > 0 ? "text-blue-600" : "text-red-600"}`}>
                        {markup}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Billable Amount */}
              {program !== "HEAR" && (
                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold mb-3">Billable Amount</h4>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      What you charge / claim from rebate program ($)
                    </label>
                    <Input
                      type="number"
                      value={billableAmount || ""}
                      onChange={(e) => setBillableAmount(Number(e.target.value))}
                      placeholder="8000"
                      className="text-sm h-9"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Your costs + markup. Typical markup: 30-50% over costs.
                      {actualCosts > 0 && (
                        <>
                          {" "}Suggested: ${Math.round(actualCosts * 1.3).toLocaleString()} – ${Math.round(actualCosts * 1.5).toLocaleString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Rebate Summary */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold mb-3">Rebate Estimate</h4>

                <div className="space-y-2">
                  {program !== "HEAR" && herCalc.amount > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-green-50 rounded-lg">
                      <span className="text-xs font-medium">HER Rebate ({herCalc.tier})</span>
                      <span className="text-base font-bold text-green-700">${herCalc.amount.toLocaleString()}</span>
                    </div>
                  )}

                  {program !== "HER" && hearCalc.total > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-lg">
                      <span className="text-xs font-medium">HEAR Rebate</span>
                      <span className="text-base font-bold text-blue-700">${hearCalc.total.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg">
                    <span className="text-sm font-semibold">Total Estimated Rebate</span>
                    <span className="text-xl font-bold text-[#FF6B35]">${estimatedRebate.toLocaleString()}</span>
                  </div>

                  {estimatedRebate > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="p-2.5 bg-gray-50 rounded-lg">
                        <p className="text-[10px] text-gray-500">Revenue</p>
                        <p className="text-base font-bold text-gray-800">${estimatedRebate.toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-lg">
                        <p className="text-[10px] text-gray-500">Net Profit</p>
                        <p className={`text-base font-bold ${netProfit > 0 ? "text-green-600" : "text-red-600"}`}>
                          ${netProfit.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-lg">
                        <p className="text-[10px] text-gray-500">Margin</p>
                        <p className={`text-base font-bold ${profitMargin > 20 ? "text-green-600" : profitMargin > 10 ? "text-orange-600" : "text-red-600"}`}>
                          {profitMargin}%
                        </p>
                      </div>
                    </div>
                  )}

                  {profitMargin < 20 && estimatedRebate > 0 && (
                    <div className="flex items-start gap-2 p-2.5 bg-yellow-50 rounded-lg">
                      <AlertCircle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-700">
                        Low margin. Consider increasing billable amount or reducing costs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed footer */}
            <div className="p-5 border-t flex-shrink-0">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`w-full ${saved ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
              >
                {saving ? (
                  "Saving..."
                ) : saved ? (
                  <><Check size={14} className="mr-1.5" /> Saved</>
                ) : (
                  <><Save size={14} className="mr-1.5" /> Save Rebate Calculation</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
