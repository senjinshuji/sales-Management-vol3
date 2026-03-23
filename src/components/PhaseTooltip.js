import React from 'react';
import styled from 'styled-components';
import { PHASE_DESCRIPTIONS, STATUS_COLORS } from '../data/constants.js';

/** フェーズ説明ツールチップ付きの？アイコン */
const PhaseTooltip = () => (
  <Wrapper>
    <HelpButton>?</HelpButton>
    <TooltipBox>
      {Object.entries(PHASE_DESCRIPTIONS).map(([phase, desc]) => (
        <TooltipRow key={phase}>
          <PhaseBadge style={{ background: STATUS_COLORS[phase] }}>{phase}</PhaseBadge>
          <span>{desc}</span>
        </TooltipRow>
      ))}
    </TooltipBox>
  </Wrapper>
);

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 4px;

  &:hover > span:last-child {
    visibility: visible;
    opacity: 1;
  }
`;

const HelpButton = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #bbb;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  cursor: help;
  line-height: 1;
`;

const TooltipBox = styled.span`
  visibility: hidden;
  opacity: 0;
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  border-radius: 6px;
  padding: 8px 10px;
  white-space: nowrap;
  z-index: 1000;
  font-size: 0.8rem;
  font-weight: normal;
  transition: opacity 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-bottom-color: #333;
  }
`;

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
`;

const PhaseBadge = styled.span`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  min-width: 52px;
  text-align: center;
`;

export default PhaseTooltip;
