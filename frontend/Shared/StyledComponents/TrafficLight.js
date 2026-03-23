import styled, { css } from "styled-components/native";

const TrafficLight = styled.View`
  border-radius: 50px;
  width: 14px;
  height: 14px;

  ${(props) =>
    props.available &&
    css`
      background: #2a9d8f;
    `}

  ${(props) =>
    props.limited &&
    css`
      background: #f4a261;
    `}

  ${(props) =>
    props.unavailable &&
    css`
      background: #e63946;
    `}
`;

export default TrafficLight;