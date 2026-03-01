import React, { useState, useEffect, useCallback, Fragment } from "react";
import styled from "styled-components";
import { API_BASE } from "../config";
import { Btn, Card, SectionTitle, StatusBadge, Table, Th, Td } from "../styles";
import Spinner from "./Spinner";
import SavedDataViewer from "./SavedDataViewer";

import { useUser } from "./UserContext";

export default function JobHistory({ tenantId }) {
    const { user, authFetch } = useUser();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rollbackConfirm, setRollbackConfirm] = useState(false);
    const [rollbackBusy, setRollbackBusy] = useState(false);
    const [rollbackResult, setRollbackResult] = useState(null);

    const fetchJobs = useCallback(() => {
        setLoading(true);
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
        const request = authFetch(`${API_BASE}/jobs?tenantId=${tenantId}`).then(res => res.json());

        Promise.all([request, minLoadTime])
            .then(([data]) => setJobs(data.jobs || []))
            .catch(err => console.error("Failed to fetch jobs:", err))
            .finally(() => setLoading(false));
    }, [tenantId, authFetch]);

    const fetchJobDetails = useCallback((jobId) => {
        setLoading(true);
        setRollbackConfirm(false);
        setRollbackResult(null);
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
        const request = authFetch(`${API_BASE}/jobs/${jobId}?tenantId=${tenantId}`).then(res => res.json());

        Promise.all([request, minLoadTime])
            .then(([jobData]) => {
                setSelectedJob(jobData.job);
            })
            .catch(err => console.error("Failed to fetch job details:", err))
            .finally(() => setLoading(false));
    }, [authFetch]);

    const handleRollback = async () => {
        if (!selectedJob) return;
        setRollbackBusy(true);
        setRollbackResult(null);
        try {
            const res = await authFetch(`${API_BASE}/jobs/${selectedJob.jobId}/rollback`, {
                method: "POST",
                body: JSON.stringify({ tenantId }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setRollbackResult(data);
            setRollbackConfirm(false);
            // Refresh job details to show rolled_back status
            fetchJobDetails(selectedJob.jobId);
            // Also refresh job list
            fetchJobs();
        } catch (e) {
            setRollbackResult({ error: e.message });
        } finally {
            setRollbackBusy(false);
        }
    };

    useEffect(() => {
        console.log("JobHistory MOUNT/FETCH - Loading:", loading);
        fetchJobs();
    }, [fetchJobs]);

    if (selectedJob) {
        const isRolledBack = selectedJob.status === "rolled_back";
        const canRollback = ["completed", "error"].includes(selectedJob.status);
        const errorCount = selectedJob.metrics?.errors || 0;
        const statusColor = isRolledBack ? "pending"
            : selectedJob.status === "completed" ? "ok" : "bad";

        return (
            <Fragment>
                <div style={{ marginBottom: 16 }}>
                    <Btn onClick={() => { setSelectedJob(null); setRollbackResult(null); setRollbackConfirm(false); }}>&larr; Back to History</Btn>
                </div>
                <Card>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <SectionTitle style={{ marginBottom: 0 }}>
                            Job Details: {selectedJob.jobId.slice(0, 8)}
                            <StatusBadge status={statusColor} style={{ marginLeft: 10 }}>
                                {selectedJob.status}
                            </StatusBadge>
                        </SectionTitle>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {/* Download error rows — only when there are errors */}
                            {errorCount > 0 && (
                                <a
                                    href={`${API_BASE}/jobs/${selectedJob.jobId}/export-errors?tenantId=${tenantId}&userId=${user?.userId || ''}`}
                                    download
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '7px 14px', background: '#fff7ed',
                                        border: '1px solid #fed7aa', borderRadius: 6,
                                        fontSize: 13, fontWeight: 500, color: '#c2410c',
                                        textDecoration: 'none', whiteSpace: 'nowrap',
                                    }}
                                    title={`Download ${errorCount} failed row${errorCount !== 1 ? "s" : ""} as CSV`}
                                >
                                    ⬇ Error Rows ({errorCount})
                                </a>
                            )}

                            {/* Download trace log */}
                            <a
                                href={`${API_BASE}/jobs/${selectedJob.jobId}/trace?tenantId=${tenantId}&userId=${user?.userId || ''}`}
                                download
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '7px 14px', background: '#f8fafc',
                                    border: '1px solid #e2e8f0', borderRadius: 6,
                                    fontSize: 13, fontWeight: 500, color: '#475569',
                                    textDecoration: 'none', whiteSpace: 'nowrap',
                                }}
                            >
                                ⬇ Download Log
                            </a>

                            {/* Rollback button */}
                            {canRollback && !isRolledBack && (
                                <button
                                    onClick={() => setRollbackConfirm(true)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '7px 14px', background: '#fff1f2',
                                        border: '1px solid #fecdd3', borderRadius: 6,
                                        fontSize: 13, fontWeight: 500, color: '#be123c',
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                    }}
                                >
                                    ↩ Rollback
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
                        Triggered: {new Date(selectedJob.triggeredAt).toLocaleString()}
                        {isRolledBack && selectedJob.rolledBackAt && (
                            <span style={{ marginLeft: 12, color: "#f59e0b", fontWeight: 500 }}>
                                · Rolled back: {new Date(selectedJob.rolledBackAt).toLocaleString()}
                                {selectedJob.rollbackSummary && (
                                    <span> · {selectedJob.rollbackSummary.deleted} deleted, {selectedJob.rollbackSummary.cleared} cleared</span>
                                )}
                            </span>
                        )}
                    </div>

                    {/* Rollback confirmation panel */}
                    {rollbackConfirm && !rollbackBusy && (
                        <div style={{
                            marginBottom: 20, padding: 16,
                            background: "#fff1f2", borderRadius: 8,
                            border: "1px solid #fecdd3",
                        }}>
                            <div style={{ fontWeight: 600, color: "#be123c", marginBottom: 8 }}>
                                ⚠️ Confirm Rollback
                            </div>
                            <div style={{ fontSize: 13, color: "#881337", marginBottom: 12 }}>
                                This will <strong>permanently delete</strong> all records <em>created</em> by this job.
                                Records that were <em>updates</em> to existing data cannot be restored — their
                                changes will remain.
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={handleRollback}
                                    style={{
                                        padding: "7px 16px", background: "#be123c", color: "#fff",
                                        border: "none", borderRadius: 6, fontWeight: 600,
                                        cursor: "pointer", fontSize: 13,
                                    }}
                                >
                                    Yes, Roll Back
                                </button>
                                <Btn onClick={() => setRollbackConfirm(false)}>Cancel</Btn>
                            </div>
                        </div>
                    )}

                    {rollbackBusy && (
                        <div style={{ marginBottom: 20, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#64748b" }}>
                            Rolling back…
                        </div>
                    )}

                    {rollbackResult && !rollbackResult.error && (
                        <div style={{ marginBottom: 20, padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                            <div style={{ color: "#166534", fontWeight: 600, marginBottom: 4 }}>
                                ✓ Rollback complete — {rollbackResult.deleted} record{rollbackResult.deleted !== 1 ? "s" : ""} deleted
                            </div>
                            {rollbackResult.warning && (
                                <div style={{ fontSize: 12, color: "#92400e" }}>⚠️ {rollbackResult.warning}</div>
                            )}
                        </div>
                    )}

                    {rollbackResult?.error && (
                        <div style={{ marginBottom: 20, padding: 12, background: "#fee2e2", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>
                            Rollback failed: {rollbackResult.error}
                        </div>
                    )}

                    {/* Job Metrics */}
                    {selectedJob.metrics && (
                        <div style={{ marginBottom: 24, padding: 16, background: "#f8fafc", borderRadius: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: 12, color: "#1e293b" }}>Processing Summary</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Total Records</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                                        {selectedJob.metrics.totalRecords || 0}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Created</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                                        {selectedJob.metrics.created || 0}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Updated</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                                        {selectedJob.metrics.updated || 0}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Errors</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>
                                        {selectedJob.metrics.errors || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <SavedDataViewer tenantId={tenantId} jobId={selectedJob.jobId} />

                </Card>
            </Fragment>
        );
    }


    return (
        <Card style={{ position: "relative" }}>
            {loading && <Spinner />}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
                <Btn onClick={fetchJobs}>Refresh</Btn>
            </div>
            <Table>
                <thead>
                    <tr>
                        <Th>Date</Th>
                        <Th>Job ID</Th>
                        <Th>Status</Th>
                        <Th>Summary</Th>
                        <Th>Action</Th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map(job => (
                        <tr key={job._id} onClick={() => fetchJobDetails(job.jobId)} style={{ cursor: "pointer" }}>
                            <Td>{new Date(job.triggeredAt).toLocaleString()}</Td>
                            <Td style={{ fontFamily: "monospace" }}>{job.jobId.slice(0, 8)}...</Td>
                            <Td>
                                <StatusBadge status={job.status === "completed" ? "ok" : job.status === "error" ? "bad" : "pending"}>
                                    {job.status}
                                </StatusBadge>
                            </Td>
                            <Td style={{ fontSize: 11, color: "#64748b" }}>
                                {job.metrics ? (
                                    <span>
                                        <span style={{ color: "#10b981", fontWeight: 600 }}>{job.metrics.created || 0}</span> created, {" "}
                                        <span style={{ color: "#3b82f6", fontWeight: 600 }}>{job.metrics.updated || 0}</span> updated
                                        {job.metrics.errors > 0 && (
                                            <span>, <span style={{ color: "#ef4444", fontWeight: 600 }}>{job.metrics.errors}</span> errors</span>
                                        )}
                                    </span>
                                ) : "—"}
                            </Td>
                            <Td style={{ color: "#2563eb" }}>View Details &rarr;</Td>
                        </tr>
                    ))}
                    {jobs.length === 0 && (
                        <tr>
                            <Td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>
                                {loading ? "Loading..." : "No jobs found for this tenant."}
                            </Td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </Card>
    );
};
