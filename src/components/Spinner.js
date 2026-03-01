import React from "react";
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85); /* More opaque */
  display: flex;
  flex-direction: column; /* Stack spinner and text */
  gap: 12px;
  align-items: center;
  justify-content: center;
  z-index: 50;
`;

const SpinnerCircle = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export default function Spinner({ overlay = true }) {
  console.log("Spinner RENDERING. Overlay:", overlay);
  if (overlay) {
    return (
      <SpinnerOverlay>
        <SpinnerCircle />
        <div style={{ color: "#3b82f6", fontWeight: 600, fontSize: 14 }}>Loading...</div>
      </SpinnerOverlay>
    );
  }
  return <SpinnerCircle />;
}
