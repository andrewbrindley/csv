import React, { useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { API_BASE } from "../config";

const TenantSelectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
`;

const TenantLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`;

const StyledSelect = styled.select`
  appearance: none;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 32px 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  outline: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  transition: all 0.15s ease;

  &:hover {
    border-color: #94a3b8;
    background-color: #f1f5f9;
  }

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
`;

export default function TenantSelector({ selectedTenantId, onTenantChange, tenants = [], isLoading = false }) {
  return (
    <TenantSelectWrapper>
      <TenantLabel>Tenant</TenantLabel>
      <StyledSelect
        value={selectedTenantId}
        onChange={(e) => onTenantChange(e.target.value)}
      >
        {isLoading && tenants.length === 0 && <option disabled>Loading...</option>}
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </StyledSelect>
    </TenantSelectWrapper>
  );
}
