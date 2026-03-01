import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "./UserContext";
import styled from "styled-components";
import SearchTable from "./SearchTable";
import { Btn } from "../styles";
// import RelatedData from "./RelatedData"; // Component not found in remote

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 24px;
  color: #111827;
  margin: 0;
`;

const SubTitle = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #2563eb;
  }
`;

const API_BASE = "http://localhost:5000/api";


export default function SearchDashboard({ tenantId, templates, active }) {
    const { authFetch } = useUser();
    const [templateKey, setTemplateKey] = useState("");
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (templates && templates.length > 0 && !templateKey) {
            setTemplateKey(templates[0].templateKey || templates[0].key);
        }
    }, [templates, templateKey]);

    const fetchData = useCallback(() => {
        if (!templateKey) return;
        setLoading(true);
        const limit = 50;
        const skip = (page - 1) * limit;

        // Construct search query
        const url = `${API_BASE}/tenant-data/search?tenantId=${tenantId}&templateKey=${templateKey}&limit=${limit}&skip=${skip}`;

        // Minimum loading time (800ms) for better UX
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
        const request = authFetch(url).then(res => res.json());

        Promise.all([request, minLoadTime])
            .then(([res]) => {
                if (res.error) {
                    console.error(res.error);
                    return;
                }
                // Flatten the data for the table
                const flattened = (res.data || []).map(item => ({
                    ...item,
                    _id: item.id,
                    __timestamp: item._metadata?.createdAt
                }));
                setData(flattened);
                setTotal(res.meta?.total || 0);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [tenantId, templateKey, page, templates, authFetch]);

    useEffect(() => {
        // If the selected template was deleted, reset selection
        if (templates && templates.length > 0 && templateKey) {
            const exists = templates.find(t => (t.templateKey || t.key) === templateKey);
            if (!exists) {
                setTemplateKey(templates[0].templateKey || templates[0].key);
            }
        }
    }, [templates, templateKey]);

    useEffect(() => {
        if (active) {
            console.log("SearchDashboard ACTIVE - Refreshing data");
            fetchData();
        }
    }, [active, fetchData]);

    useEffect(() => {
        console.log("SearchDashboard MOUNT/FETCH - Loading:", loading, "Template:", templateKey);
        fetchData();
    }, [fetchData]);

    const handleSearch = (query) => {
        // Implement search logic if API supports it
        // for now just refreshing
        fetchData();
    };

    const currentTemplate = useMemo(() => {
        return templates.find(t => (t.templateKey || t.key) === templateKey);
    }, [templates, templateKey]);

    const getColumns = () => {
        if (!currentTemplate) return [];
        return currentTemplate.fields.map(f => ({
            key: f.key,
            title: f.label,
            render: (val) => {
                if (typeof val === 'object' && val !== null) {
                    return JSON.stringify(val);
                }
                return val;
            }
        }));
    };

    return (
        <Container>

            <FilterBar style={{ justifyContent: "space-between" }}>
                <Select
                    value={templateKey}
                    onChange={(e) => {
                        setTemplateKey(e.target.value);
                        setPage(1);
                    }}
                >
                    {templates.map(t => {
                        const tKey = t.templateKey || t.key;
                        const tLabel = t.templateLabel || t.label || tKey;
                        return <option key={tKey} value={tKey}>{tLabel}</option>;
                    })}
                </Select>
                <Btn onClick={fetchData}>Refresh</Btn>
            </FilterBar>

            <SearchTable
                data={data}
                columns={getColumns()}
                total={total}
                page={page}
                limit={50}
                onSearch={handleSearch}
                onPageChange={setPage}
                expandedRowRender={null /* RelatedData missing */}
                loading={loading}
            />
        </Container>
    );
}
