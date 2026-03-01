import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { useUser } from "./UserContext";
import { API_BASE } from "../config";
import {
    Card,
    SectionTitle,
    Table,
    Th,
    Td,
    Btn,
    Row,
    ErrorBanner,
} from "../styles";

/* ---------- Local styled ---------- */

const Input = styled.input`
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  &:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
`;

const Select = styled.select`
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  background: #fff;
  cursor: pointer;
  &:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  ${(p) => {
        switch (p.role) {
            case "ADMIN":
                return "background: #dbeafe; color: #1e40af;";
            case "EDITOR":
                return "background: #d1fae5; color: #065f46;";
            case "VIEWER":
                return "background: #f1f5f9; color: #475569;";
            default:
                return "background: #f1f5f9; color: #475569;";
        }
    }}
`;

const UserRow = styled.tr`
  &:hover { background: #f8fafc; }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  overflow: hidden;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  span:first-child { font-weight: 600; font-size: 13px; color: #1e293b; }
  span:last-child { font-size: 11px; color: #94a3b8; }
`;

const SuperBadge = styled.span`
  font-size: 10px;
  background: #fef3c7;
  color: #92400e;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
  margin-left: 6px;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
`;

const InviteSection = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;

/* ---------- Component ---------- */

export default function UserManagement({ tenantId }) {
    const { authFetch } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Invite form
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("VIEWER");
    const [inviting, setInviting] = useState(false);

    // Role change tracking
    const [changingRole, setChangingRole] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/admin/users?tenantId=${tenantId}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to fetch users (${res.status})`);
            }
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [authFetch, tenantId]);

    useEffect(() => {
        fetchUsers();
        setSuccess(null);
        setInviteEmail("");
    }, [tenantId, fetchUsers]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await authFetch(`${API_BASE}/admin/users/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId,
                    email: inviteEmail.trim(),
                    role: inviteRole,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invite failed");

            setSuccess(data.message);
            setInviteEmail("");
            fetchUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setChangingRole(userId);
        setError(null);
        setSuccess(null);

        try {
            const res = await authFetch(`${API_BASE}/admin/users/role`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenantId, userId, role: newRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Role update failed");

            setSuccess(data.message);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setChangingRole(null);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <Card>
                <SectionTitle>User Management</SectionTitle>
                <p style={{ color: "#64748b", margin: "0 0 20px 0" }}>
                    Manage users and roles for the <strong>{tenantId}</strong> tenant.
                </p>

                {error && <ErrorBanner>{error}</ErrorBanner>}

                {success && (
                    <div style={{
                        background: "#d1fae5", color: "#065f46", padding: 12,
                        borderRadius: 6, marginBottom: 16, fontSize: 13, border: "1px solid #a7f3d0",
                    }}>
                        ✓ {success}
                    </div>
                )}

                {/* ---- Invite Section ---- */}
                <InviteSection>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "#334155" }}>
                        Invite a User
                    </div>
                    <Row style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <Input
                            type="email"
                            placeholder="user@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            style={{ width: 260 }}
                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                        />
                        <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                            <option value="VIEWER">Viewer</option>
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                        </Select>
                        <Btn
                            variant="primary"
                            onClick={handleInvite}
                            disabled={inviting || !inviteEmail.trim()}
                        >
                            {inviting ? "Inviting..." : "Invite"}
                        </Btn>
                    </Row>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                        If the user already has an account, they'll be added immediately. Otherwise, a placeholder is created and linked on their first Auth0 login.
                    </div>
                </InviteSection>

                {/* ---- Users Table ---- */}
                {loading ? (
                    <EmptyState>Loading users...</EmptyState>
                ) : users.length === 0 ? (
                    <EmptyState>
                        No users found for this tenant. Invite someone above!
                    </EmptyState>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>User</Th>
                                <Th>Role</Th>
                                <Th style={{ width: 160 }}>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <UserRow key={u.userId}>
                                    <Td>
                                        <UserCell>
                                            <Avatar>
                                                {u.picture ? (
                                                    <img src={u.picture} alt={u.name} referrerPolicy="no-referrer" />
                                                ) : (
                                                    <span>{(u.name || u.email || "?")[0].toUpperCase()}</span>
                                                )}
                                            </Avatar>
                                            <UserInfo>
                                                <span>
                                                    {u.name || "Unnamed"}
                                                    {u.isSuperAdmin && <SuperBadge>Super Admin</SuperBadge>}
                                                </span>
                                                <span>{u.email || u.userId}</span>
                                            </UserInfo>
                                        </UserCell>
                                    </Td>
                                    <Td>
                                        <RoleBadge role={u.role}>{u.role || "—"}</RoleBadge>
                                    </Td>
                                    <Td>
                                        {changingRole === u.userId ? (
                                            <span style={{ fontSize: 12, color: "#94a3b8" }}>Updating...</span>
                                        ) : (
                                            <Select
                                                value={u.role || ""}
                                                onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                                                style={{ fontSize: 12, padding: "4px 8px" }}
                                            >
                                                <option value="VIEWER">Viewer</option>
                                                <option value="EDITOR">Editor</option>
                                                <option value="ADMIN">Admin</option>
                                            </Select>
                                        )}
                                    </Td>
                                </UserRow>
                            ))}
                        </tbody>
                    </Table>
                )}

                <div style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
                    {users.length} user{users.length !== 1 ? "s" : ""} in this tenant
                </div>
            </Card>
        </div>
    );
}
