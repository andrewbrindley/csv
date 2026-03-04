import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config";
import { useAuth0 } from "@auth0/auth0-react";

const AUTH0_ENABLED = process.env.REACT_APP_AUTH0_ENABLED === "true";

const UserContext = createContext(null);

/* ------------------------------------------------------------------ */
/* Auth0-powered provider (used when AUTH0_ENABLED = true)              */
/* ------------------------------------------------------------------ */
function Auth0UserProvider({ children }) {
    const {
        isAuthenticated,
        isLoading: auth0Loading,
        loginWithRedirect,
        logout: auth0Logout,
        getAccessTokenSilently,
        user: auth0User,
    } = useAuth0();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    console.log("[UserContext] Auth0 State:", { isAuthenticated, auth0Loading, hasUser: !!auth0User });

    const authFetch = useCallback(async (url, options = {}) => {
        let headers = { ...options.headers };
        if (isAuthenticated) {
            try {
                const token = await getAccessTokenSilently();
                headers["Authorization"] = `Bearer ${token}`;
            } catch (e) {
                console.warn("[authFetch] Could not get access token:", e);
            }
        }
        return fetch(url, { ...options, headers });
    }, [isAuthenticated, getAccessTokenSilently]);

    useEffect(() => {
        if (auth0Loading) return;
        if (!isAuthenticated) { setUser(null); setLoading(false); return; }

        const fetchMe = async () => {
            setLoading(true);
            try {
                const token = await getAccessTokenSilently();
                const res = await fetch(`${API_BASE}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                } else {
                    setUser({
                        userId: auth0User?.sub,
                        name: auth0User?.name,
                        email: auth0User?.email,
                        picture: auth0User?.picture || "",
                        tenants: [],
                        isSuperAdmin: false,
                    });
                }
            } catch (err) {
                console.error("[UserContext] Failed to fetch user profile:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMe();
    }, [isAuthenticated, auth0Loading, getAccessTokenSilently, auth0User]);

    const login = useCallback(() => loginWithRedirect(), [loginWithRedirect]);
    const logout = useCallback(() => {
        setUser(null);
        auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    }, [auth0Logout]);

    const getRoleForTenant = useCallback((tenantId) => {
        if (!user || !tenantId) return null;
        const t = (user.tenants || []).find(x => x.tenantId === tenantId);
        return t ? t.role : null;
    }, [user]);

    const isAdmin = useCallback((tid) => getRoleForTenant(tid) === "ADMIN", [getRoleForTenant]);
    const isEditor = useCallback((tid) => ["ADMIN", "EDITOR"].includes(getRoleForTenant(tid)), [getRoleForTenant]);
    const isViewer = useCallback((tid) => ["ADMIN", "EDITOR", "VIEWER"].includes(getRoleForTenant(tid)), [getRoleForTenant]);

    if (!auth0Loading && !isAuthenticated) {
        return (
            <UserContext.Provider value={{ user: null, loading: false, login, logout, authFetch, isAdmin, isEditor, isViewer, getRoleForTenant }}>
                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: "100vh",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
                    fontFamily: "system-ui, sans-serif", color: "#fff", gap: 16,
                }}>
                    <div style={{ fontSize: 40, fontWeight: 700 }}>📂 CSV Import Tool</div>
                    <p style={{ color: "#94a3b8", margin: 0 }}>Sign in to continue</p>
                    <button onClick={login} style={{
                        marginTop: 8, padding: "12px 32px", fontSize: 16,
                        background: "#3b82f6", color: "#fff", border: "none",
                        borderRadius: 8, cursor: "pointer", fontWeight: 600,
                    }}>Sign in with Auth0</button>
                </div>
            </UserContext.Provider>
        );
    }

    return (
        <UserContext.Provider value={{ user, loading: loading || auth0Loading, login, logout, isAdmin, isEditor, isViewer, getRoleForTenant, authFetch }}>
            {children}
        </UserContext.Provider>
    );
}

/* ------------------------------------------------------------------ */
/* Legacy provider — auto-login as super user (old behavior)           */
/* ------------------------------------------------------------------ */
function LegacyUserProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("csv_poc_user");
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { /* ignore */ }
        }
        const adminUser = {
            userId: "admin-1",
            name: "Global Admin (Super User)",
            picture: "",
            isSuperAdmin: true,
            tenants: [
                { tenantId: "acme-corp", role: "ADMIN" },
                { tenantId: "globex", role: "ADMIN" },
                { tenantId: "stark-ind", role: "ADMIN" },
            ]
        };
        localStorage.setItem("csv_poc_user", JSON.stringify(adminUser));
        return adminUser;
    });
    const [loading] = useState(false);

    const login = async (userId) => {
        try {
            const resp = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!resp.ok) throw new Error("Login failed");
            const data = await resp.json();
            setUser(data.user);
            localStorage.setItem("csv_poc_user", JSON.stringify(data.user));
            return data.user;
        } catch (err) {
            console.error("Login error:", err);
            throw err;
        }
    };

    const logout = () => { setUser(null); localStorage.removeItem("csv_poc_user"); };

    const getRoleForTenant = (tenantId) => {
        if (!user || !tenantId) return null;
        const t = user.tenants.find(x => x.tenantId === tenantId);
        return t ? t.role : null;
    };

    const isAdmin = (tenantId) => getRoleForTenant(tenantId) === "ADMIN";
    const isEditor = (tenantId) => ["ADMIN", "EDITOR"].includes(getRoleForTenant(tenantId));
    const isViewer = (tenantId) => ["ADMIN", "EDITOR", "VIEWER"].includes(getRoleForTenant(tenantId));

    const authFetch = useCallback((url, options = {}) => {
        const headers = { ...options.headers, "X-User-ID": user?.userId || "" };
        return fetch(url, { ...options, headers });
    }, [user]);

    return (
        <UserContext.Provider value={{ user, loading, login, logout, isAdmin, isEditor, isViewer, getRoleForTenant, authFetch }}>
            {children}
        </UserContext.Provider>
    );
}

/* ------------------------------------------------------------------ */
/* Export: pick provider based on flag                                  */
/* ------------------------------------------------------------------ */
export function UserProvider({ children }) {
    if (AUTH0_ENABLED) {
        return <Auth0UserProvider>{children}</Auth0UserProvider>;
    }
    return <LegacyUserProvider>{children}</LegacyUserProvider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
}
