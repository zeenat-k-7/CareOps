'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, TemperatureReading, DoctorVisit, StaffMember } from '@/types';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Bed,
  Thermometer, Stethoscope, Award, Activity, AlertCircle, FileSpreadsheet,
  ArrowUpRight, ArrowDownRight, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { cn, formatDateTime, today } from '@/lib/utils';
import { occupiedBeds, freeBeds, isoToLocalDateString } from '@/lib/business';

type TimeRange = 'today' | '7days' | '30days';

export default function ManagementDashboard() {
  const { state } = useApp();
  const [range, setRange] = useState<TimeRange>('7days');

  const todayStr = today();

  // Determine date bounds based on range
  const rangeBounds = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (range === '7days') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }, [range]);

  // Closed cases in selected time range (discharged or confirmed deceased)
  const closedCases = useMemo(() => {
    return state.patients.filter((p) => {
      if (p.status === 'discharged' && p.dischargedAt) {
        const d = new Date(p.dischargedAt);
        return d >= rangeBounds.start && d <= rangeBounds.end;
      }
      if (p.status === 'death_confirmed' && p.deathConfirmedAt) {
        const d = new Date(p.deathConfirmedAt);
        return d >= rangeBounds.start && d <= rangeBounds.end;
      }
      return false;
    });
  }, [state.patients, rangeBounds]);

  const confirmedDeaths = closedCases.filter((p) => p.status === 'death_confirmed');
  const dischargedCured = closedCases.filter((p) => p.status === 'discharged');

  // METRIC 1: Mortality Rate
  const totalClosedCount = closedCases.length;
  const mortalityRatePct = totalClosedCount > 0 ? (confirmedDeaths.length / totalClosedCount) * 100 : 0;
  const exceedsMortalityBenchmark = mortalityRatePct > 15;

  // METRIC 2: Success Rate
  const successRatePct = totalClosedCount > 0 ? (dischargedCured.length / totalClosedCount) * 100 : 0;

  // METRIC 3: Bed Occupancy
  const occupiedCount = occupiedBeds(state);
  const freeCount = freeBeds(state);
  const occupancyPct = Math.round((occupiedCount / 74) * 100);

  // METRIC 4: Average Length of Stay (ALOS) in days
  const avgLOSDays = useMemo(() => {
    if (closedCases.length === 0) return 0;
    const totalDays = closedCases.reduce((sum, p) => {
      const end = new Date(p.dischargedAt || p.deathConfirmedAt || p.admittedAt);
      const start = new Date(p.admittedAt);
      const diffDays = Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
      return sum + diffDays;
    }, 0);
    return Number((totalDays / closedCases.length).toFixed(1));
  }, [closedCases]);

  // Active patients currently in ward
  const activePatientsList = useMemo(() => {
    return state.patients.filter(
      (p) =>
        p.status === 'active' ||
        p.status === 'eligible' ||
        p.status === 'discharge_approved' ||
        p.status === 'death_declared'
    );
  }, [state.patients]);

  const activeCount = activePatientsList.length;

  // METRIC 5: Temperature Coverage Today
  const activeWithTempToday = activePatientsList.filter((p) =>
    state.temperatureReadings.some(
      (r) => r.patientId === p.id && isoToLocalDateString(r.recordedAt) === todayStr
    )
  );
  const tempCoveragePct = activeCount > 0 ? Math.round((activeWithTempToday.length / activeCount) * 100) : 0;

  // Per-nurse temperature coverage
  const nurseCoverageData = useMemo(() => {
    const nurses = state.staff.filter((s) => s.role === 'nurse');
    return nurses.map((n) => {
      const assigned = activePatientsList.filter((p) => p.nurseId === n.id || p.nurseName === n.name);
      const measured = assigned.filter((p) =>
        state.temperatureReadings.some(
          (r) => r.patientId === p.id && isoToLocalDateString(r.recordedAt) === todayStr
        )
      );
      const pct = assigned.length > 0 ? Math.round((measured.length / assigned.length) * 100) : 0;
      return {
        name: n.name.split(' ')[0],
        fullName: n.name,
        assigned: assigned.length,
        measured: measured.length,
        pct,
      };
    });
  }, [state.staff, activePatientsList, state.temperatureReadings, todayStr]);

  // METRIC 6: Duplicate Readings
  const duplicateReadingsSummary = useMemo(() => {
    // Group readings by patient and date in the range
    const groups: Record<string, TemperatureReading[]> = {};
    state.temperatureReadings.forEach((r) => {
      const d = new Date(r.recordedAt);
      if (d >= rangeBounds.start && d <= rangeBounds.end) {
        const key = `${r.patientId}_${isoToLocalDateString(r.recordedAt)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      }
    });

    let dupCount = 0;
    const nurseDups: Record<string, number> = {};

    Object.values(groups).forEach((readings) => {
      if (readings.length > 1) {
        dupCount += readings.length - 1;
        // Count authors of duplicates beyond first
        readings.slice(1).forEach((r) => {
          nurseDups[r.recordedBy] = (nurseDups[r.recordedBy] || 0) + 1;
        });
      }
    });

    const nurseDupArray = Object.entries(nurseDups).map(([name, count]) => ({
      name,
      duplicates: count,
    }));

    return { totalDuplicates: dupCount, byNurse: nurseDupArray };
  }, [state.temperatureReadings, rangeBounds]);

  // METRIC 7: Doctor Visit Coverage Today
  const activeWithVisitToday = activePatientsList.filter((p) =>
    state.doctorVisits.some((v) => v.patientId === p.id && v.visitDate === todayStr)
  );
  const doctorVisitCoveragePct = activeCount > 0 ? Math.round((activeWithVisitToday.length / activeCount) * 100) : 0;

  // Per-doctor visit coverage
  const doctorCoverageData = useMemo(() => {
    const doctors = state.staff.filter((s) => s.role === 'doctor');
    return doctors.map((d) => {
      const assigned = activePatientsList.filter((p) => p.doctorId === d.id || p.doctorName === d.name);
      const visited = assigned.filter((p) =>
        state.doctorVisits.some((v) => v.patientId === p.id && v.visitDate === todayStr)
      );
      const pct = assigned.length > 0 ? Math.round((visited.length / assigned.length) * 100) : 0;
      return {
        name: d.name.replace('Dr. ', ''),
        fullName: d.name,
        assigned: assigned.length,
        visited: visited.length,
        pct,
      };
    });
  }, [state.staff, activePatientsList, state.doctorVisits, todayStr]);

  // METRIC 8: Visits Before Temperature
  const visitsBeforeTempSummary = useMemo(() => {
    const visits = state.doctorVisits.filter((v) => {
      const d = new Date(v.visitedAt);
      return v.visitBeforeTemperature && d >= rangeBounds.start && d <= rangeBounds.end;
    });

    const byDoc: Record<string, number> = {};
    visits.forEach((v) => {
      byDoc[v.doctorName] = (byDoc[v.doctorName] || 0) + 1;
    });

    return {
      total: visits.length,
      byDoctor: Object.entries(byDoc).map(([doc, count]) => ({ doctor: doc, count })),
    };
  }, [state.doctorVisits, rangeBounds]);

  // METRIC 9, 10, 11: Discharge Efficiency & Workflow Bottleneck Intervals
  const dischargeEfficiency = useMemo(() => {
    let totalEligibleToApprovalHrs = 0;
    let approvalCount = 0;
    const docApprovalMap: Record<string, { totalHours: number; count: number }> = {};

    let totalApprovalToExecHrs = 0;
    let execCount = 0;
    const adminExecMap: Record<string, { totalHours: number; count: number }> = {};

    let totalDischargeLagHrs = 0;
    let lagCount = 0;

    state.patients.forEach((p) => {
      // Metric 9: Eligible to Approved
      if (p.dischargeEligibleAt && p.dischargeApprovedAt) {
        const eligibleTime = new Date(p.dischargeEligibleAt).getTime();
        const approvedTime = new Date(p.dischargeApprovedAt).getTime();
        const diffHrs = Math.max(0, (approvedTime - eligibleTime) / 3_600_000);
        totalEligibleToApprovalHrs += diffHrs;
        approvalCount++;

        const doc = p.dischargeApprovedByName || p.doctorName || 'Doctor';
        if (!docApprovalMap[doc]) docApprovalMap[doc] = { totalHours: 0, count: 0 };
        docApprovalMap[doc].totalHours += diffHrs;
        docApprovalMap[doc].count++;
      }

      // Metric 10: Approved to Executed
      if (p.dischargeApprovedAt && p.dischargedAt) {
        const approvedTime = new Date(p.dischargeApprovedAt).getTime();
        const dischargedTime = new Date(p.dischargedAt).getTime();
        const diffHrs = Math.max(0, (dischargedTime - approvedTime) / 3_600_000);
        totalApprovalToExecHrs += diffHrs;
        execCount++;

        const admin = p.dischargedByName || 'Aditi Sharma';
        if (!adminExecMap[admin]) adminExecMap[admin] = { totalHours: 0, count: 0 };
        adminExecMap[admin].totalHours += diffHrs;
        adminExecMap[admin].count++;
      }

      // Metric 11: Total Lag (Eligible to Executed)
      if (p.dischargeEligibleAt && p.dischargedAt) {
        const eligibleTime = new Date(p.dischargeEligibleAt).getTime();
        const dischargedTime = new Date(p.dischargedAt).getTime();
        const diffHrs = Math.max(0, (dischargedTime - eligibleTime) / 3_600_000);
        totalDischargeLagHrs += diffHrs;
        lagCount++;
      }
    });

    const avgApprovalHrs = approvalCount > 0 ? Number((totalEligibleToApprovalHrs / approvalCount).toFixed(1)) : 0;
    const avgExecHrs = execCount > 0 ? Number((totalApprovalToExecHrs / execCount).toFixed(1)) : 0;
    const avgTotalLagHrs = lagCount > 0 ? Number((totalDischargeLagHrs / lagCount).toFixed(1)) : 0;

    const docApprovalBreakdown = Object.entries(docApprovalMap).map(([doctor, item]) => ({
      doctor,
      avgHours: Number((item.totalHours / item.count).toFixed(1)),
      count: item.count,
    }));

    const adminExecBreakdown = Object.entries(adminExecMap).map(([admin, item]) => ({
      admin,
      avgHours: Number((item.totalHours / item.count).toFixed(1)),
      count: item.count,
    }));

    return {
      avgApprovalHrs,
      avgExecHrs,
      avgTotalLagHrs,
      approvalCount,
      execCount,
      lagCount,
      docApprovalBreakdown,
      adminExecBreakdown,
    };
  }, [state.patients]);

  // Trend data for mortality vs success over recent days
  const outcomesTrendData = useMemo(() => {
    const days: { date: string; deaths: number; discharges: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = isoToLocalDateString(d.toISOString());

      const deaths = state.patients.filter(
        (p) => p.status === 'death_confirmed' && p.deathConfirmedAt && isoToLocalDateString(p.deathConfirmedAt) === dStr
      ).length;
      const discharges = state.patients.filter(
        (p) => p.status === 'discharged' && p.dischargedAt && isoToLocalDateString(p.dischargedAt) === dStr
      ).length;

      days.push({
        date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        deaths,
        discharges,
      });
    }
    return days;
  }, [state.patients]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* EXCEEDS MORTALITY WARNING BANNER */}
      {exceedsMortalityBenchmark && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-wide uppercase">
                EXECUTIVE ESCALATION: MORTALITY BENCHMARK BREACH ({mortalityRatePct.toFixed(1)}% vs 15.0% Benchmark)
              </p>
              <p className="text-xs text-red-100 mt-0.5">
                The facility mortality rate for the selected period exceeds the acceptable maximum threshold of 15%.
                Quality committee review and clinical audit required.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white text-red-700 font-bold text-xs rounded-lg whitespace-nowrap shadow-xs">
            Action Mandated
          </span>
        </div>
      )}

      {/* HEADER & TIME RANGE SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 uppercase tracking-wider">
              Executive Analytics
            </span>
            <span className="text-xs text-slate-400">Read-Only Facility Oversight</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Hospital Operations & Clinical KPIs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Derived directly from 74-bed viral quarantine clinical records, timestamps, and audit events.
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id as TimeRange)}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                range === t.id
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* PRIMARY CLINICAL OUTCOMES GRID (METRICS 1, 2, 3, 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Mortality Rate */}
        <div className={cn(
          'p-5 rounded-2xl border transition-all shadow-xs',
          exceedsMortalityBenchmark ? 'bg-red-50/40 border-red-300' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Mortality Rate</span>
            <span className="text-[10px] text-slate-400 font-mono">15% Max Benchmark</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={cn('text-3xl font-extrabold', exceedsMortalityBenchmark ? 'text-red-600' : 'text-slate-900')}>
              {mortalityRatePct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              ({confirmedDeaths.length}/{totalClosedCount} closed cases)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {totalClosedCount === 0
              ? 'No closed cases in this range.'
              : exceedsMortalityBenchmark
              ? '⚠️ Exceeds 15% benchmark'
              : '✓ Within safety benchmark'}
          </p>
        </div>

        {/* Metric 2: Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Clinical Cure Rate</span>
            <span className="text-[10px] text-teal-600 font-mono">85% Target</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-teal-600">
              {successRatePct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              ({dischargedCured.length}/{totalClosedCount} cured)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Cured discharges / Total closed cases
          </p>
        </div>

        {/* Metric 3: Bed Occupancy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Bed Occupancy</span>
            <span className="text-[10px] text-slate-400 font-mono">74 Beds Total</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {occupancyPct}%
            </span>
            <span className="text-xs text-slate-500">
              ({occupiedCount} occupied / {freeCount} free)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-teal-600 h-full rounded-full" style={{ width: `${occupancyPct}%` }} />
          </div>
        </div>

        {/* Metric 4: Average Length of Stay (ALOS) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Avg Length of Stay</span>
            <span className="text-[10px] text-slate-400 font-mono">Closed Cases</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {avgLOSDays}
            </span>
            <span className="text-xs text-slate-500">days / patient</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Admission to discharge/death across {closedCases.length} closed cases
          </p>
        </div>
      </div>

      {/* OUTCOMES TREND & DISCHARGE BOTTLENECK ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Closed Cases Outcomes Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Patient Outcomes Trend (Last 7 Days)</h3>
              <p className="text-xs text-slate-400">Daily breakdown of cured discharges vs confirmed deaths</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-teal-600 font-medium">
                <span className="w-3 h-3 bg-teal-500 rounded-xs" /> Discharges
              </span>
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <span className="w-3 h-3 bg-red-500 rounded-xs" /> Deaths
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Bar dataKey="discharges" fill="#0d9488" radius={[4, 4, 0, 0]} name="Cured Discharges" />
                <Bar dataKey="deaths" fill="#ef4444" radius={[4, 4, 0, 0]} name="Confirmed Deaths" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* METRICS 9, 10, 11: DISCHARGE BOTTLENECK & LAG ANALYSIS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              Discharge Efficiency & Workflow Lag (Metrics 9, 10, 11)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Breakdown of hours between clinical eligibility, doctor approval, and final admin execution.
            </p>

            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Metric 9: Doctor Approval</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  {dischargeEfficiency.avgApprovalHrs}h
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Eligibility → Approval</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Metric 10: Admin Execution</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  {dischargeEfficiency.avgExecHrs}h
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Approval → Execution</span>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-teal-700 block">Metric 11: Total Lag</span>
                <span className="text-xl font-bold text-teal-800 mt-1 block">
                  {dischargeEfficiency.avgTotalLagHrs}h
                </span>
                <span className="text-[10px] text-teal-600 block mt-0.5">Total Bed Delay</span>
              </div>
            </div>

            {/* Doctor Breakdown */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">Doctor Approval Latency by Physician:</span>
              {dischargeEfficiency.docApprovalBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No approved discharge history in dataset.</p>
              ) : (
                dischargeEfficiency.docApprovalBreakdown.map((item) => (
                  <div key={item.doctor} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{item.doctor} ({item.count} cases)</span>
                    <span className="font-bold text-slate-800">{item.avgHours} hours avg</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Admin Execution Responsiveness:</span>
            <span className="font-semibold text-slate-700">
              Aditi Sharma ({dischargeEfficiency.avgExecHrs}h avg)
            </span>
          </div>
        </div>
      </div>

      {/* CLINICAL PROTOCOL ADHERENCE (METRICS 5, 6, 7, 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* METRIC 5 & 6: Temperature Coverage & Duplicate Readings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Temperature Protocol Compliance (Metrics 5 & 6)
              </h3>
              <p className="text-xs text-slate-400">Coverage rate today and duplicate readings audit</p>
            </div>
            <span className="text-sm font-extrabold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg">
              {tempCoveragePct}% Coverage
            </span>
          </div>

          {/* Nurse Coverage Breakdown */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-700 block">Per-Nurse Coverage Today:</span>
            {nurseCoverageData.map((nurse) => (
              <div key={nurse.fullName} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 font-medium">{nurse.fullName}</span>
                  <span className="text-slate-500 font-semibold">{nurse.measured}/{nurse.assigned} measured ({nurse.pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${nurse.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Duplicate Readings Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Metric 6: Duplicate Temperature Readings:</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">
                {duplicateReadingsSummary.totalDuplicates} duplicate reading{duplicateReadingsSummary.totalDuplicates === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Readings recorded beyond the primary daily measurement. Retained in historical audit for clinical safety monitoring.
            </p>
            {duplicateReadingsSummary.byNurse.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {duplicateReadingsSummary.byNurse.map((item) => (
                  <span key={item.name} className="text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                    {item.name}: <span className="font-bold text-slate-800">{item.duplicates}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* METRIC 7 & 8: Doctor Visit Coverage & Visits Before Temperature */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Doctor Visits & Safety Sequencing (Metrics 7 & 8)
              </h3>
              <p className="text-xs text-slate-400">Physician rounds coverage and out-of-sequence visit alerts</p>
            </div>
            <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              {doctorVisitCoveragePct}% Rounds Done
            </span>
          </div>

          {/* Doctor Visit Coverage Breakdown */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-700 block">Per-Doctor Rounds Coverage Today:</span>
            {doctorCoverageData.map((doc) => (
              <div key={doc.fullName} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 font-medium">{doc.fullName}</span>
                  <span className="text-slate-500 font-semibold">{doc.visited}/{doc.assigned} visited ({doc.pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${doc.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Metric 8: Visits Before Temperature */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Metric 8: Visits Before Temperature Recorded:</span>
              <span className={cn(
                'px-2 py-0.5 text-xs font-bold rounded',
                visitsBeforeTempSummary.total > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
              )}>
                {visitsBeforeTempSummary.total} out-of-sequence visit{visitsBeforeTempSummary.total === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Instances where a doctor marked a patient visit complete before today's daily temperature was measured.
            </p>
            {visitsBeforeTempSummary.byDoctor.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {visitsBeforeTempSummary.byDoctor.map((item) => (
                  <span key={item.doctor} className="text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-900">
                    {item.doctor}: <span className="font-bold">{item.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
