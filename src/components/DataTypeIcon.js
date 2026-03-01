import React from 'react';

const ICONS = {
    string: '🔤',
    integer: '🔢',
    date: '📆',
    email: '📧',
    phone: '📞',
    enum: '🔽',
    boolean: '✅',
    reference: '🔗',
    relationship: '🔗',
    unknown: '❓'
};

const COLORS = {
    string: '#e2e8f0',
    integer: '#dbeafe',
    date: '#fff7ed',
    email: '#f0fdf4',
    phone: '#faf5ff',
    enum: '#eff6ff',
    boolean: '#f0f9ff',
    reference: '#f0fdf4',
    relationship: '#f0fdf4',
    unknown: '#f1f5f9'
};

export default function DataTypeIcon({ type }) {
    const resolvedType = type || 'string';
    const icon = ICONS[resolvedType] || ICONS.string;
    const color = COLORS[resolvedType] || COLORS.string;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            background: color,
            fontSize: '14px',
            marginRight: '8px',
            userSelect: 'none'
        }} title={type}>
            {icon}
        </span>
    );
}
