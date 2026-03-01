import React, { useState } from "react";
import styled from "styled-components";
import Spinner from "./Spinner";

const TableContainer = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative; /* Added for SpinnerOverlay */
`;

const TableWrapper = styled.div`
  flex: 1;
  overflow: auto;
  position: relative;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 10;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 10px 16px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
  color: #374151;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Pagination = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
`;

const PageBtn = styled.button`
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  margin-left: 8px;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const ExpandToggle = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #6b7280;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
        background: #f3f4f6;
        color: #111827;
    }
`;

export default function SearchTable({
    data,
    columns,
    total,
    page,
    limit,
    onPageChange,
    expandedRowRender,
    loading // New prop
}) {
    const [expandedRows, setExpandedRows] = useState({});

    if (!columns || columns.length === 0) {
        return (
            <TableContainer>
                {loading && <Spinner />}
                <div style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>
                    Select a template to view data.
                </div>
            </TableContainer>
        );
    }

    if (!data || data.length === 0) {
        return (
            <TableContainer>
                {loading && <Spinner />}
                <TableWrapper>
                    <StyledTable>
                        <thead>
                            <tr>
                                {expandedRowRender && <Th style={{ width: 40 }}></Th>}
                                {columns.map(c => <Th key={c.key}>{c.title}</Th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <Td colSpan={columns.length + (expandedRowRender ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                    {loading ? 'Loading...' : 'No results found.'}
                                </Td>
                            </tr>
                        </tbody>
                    </StyledTable>
                </TableWrapper>
            </TableContainer>
        );
    }

    const toggleExpand = (rowId) => {
        setExpandedRows(prev => ({
            ...prev,
            [rowId]: !prev[rowId]
        }));
    };

    return (
        <TableContainer>
            {loading && <Spinner />}
            <TableWrapper>
                <StyledTable>
                    <thead>
                        <tr>
                            {expandedRowRender && <Th style={{ width: 40 }}></Th>}
                            {columns.map(c => <Th key={c.key}>{c.title}</Th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => {
                            const rowId = row._id || rowIndex;
                            const isExpanded = !!expandedRows[rowId];

                            return (
                                <React.Fragment key={rowId}>
                                    <tr style={{ background: isExpanded ? '#f9fafb' : 'white' }}>
                                        {expandedRowRender && (
                                            <Td>
                                                <ExpandToggle onClick={() => toggleExpand(rowId)}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </ExpandToggle>
                                            </Td>
                                        )}
                                        {columns.map(c => (
                                            <Td key={c.key} title={typeof row[c.key] === 'string' ? row[c.key] : ''}>
                                                {c.render ? c.render(row[c.key], row) : row[c.key]}
                                            </Td>
                                        ))}
                                    </tr>
                                    {isExpanded && expandedRowRender && (
                                        <tr>
                                            <Td colSpan={columns.length + 1} style={{ padding: 0, background: '#f9fafb' }}>
                                                <div>
                                                    {expandedRowRender(row)}
                                                </div>
                                            </Td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </StyledTable>
            </TableWrapper>

            <Pagination>
                <span>
                    Showing {data.length} of {total} results
                </span>
                <div>
                    <PageBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</PageBtn>
                    <PageBtn disabled={page * limit >= total} onClick={() => onPageChange(page + 1)}>Next</PageBtn>
                </div>
            </Pagination>
        </TableContainer>
    );
}
