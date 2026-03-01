import React from "react";
import { useUser } from "./UserContext";

/**
 * RoleGate — Conditionally renders children based on the user's role in a tenant.
 *
 * Usage:
 *   <RoleGate requiredRole="ADMIN" tenantId={selectedTenantId}>
 *     <SecretAdminPanel />
 *   </RoleGate>
 *
 * Props:
 *   requiredRole — "ADMIN" | "EDITOR" | "VIEWER"  (minimum role needed)
 *   tenantId     — the tenant to check against
 *   children     — only rendered if the user meets the requirement
 *   fallback     — optional element to render if access is denied
 */

const ROLE_HIERARCHY = { ADMIN: 3, EDITOR: 2, VIEWER: 1 };

export default function RoleGate({ requiredRole, tenantId, children, fallback = null }) {
    const { user, getRoleForTenant } = useUser();

    if (!user || !tenantId) return fallback;

    const userRole = getRoleForTenant(tenantId);

    // Super-admin bypass (legacy admin-1 or isSuperAdmin flag)
    const isSuperAdmin = user.isSuperAdmin || user.userId === "admin-1";

    if (!isSuperAdmin) {
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

        if (userLevel < requiredLevel) return fallback;
    }

    return <>{children}</>;
}
