import styled, { css } from "styled-components/native";

const EasyButton = styled.TouchableOpacity`
  flex-direction: row;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 5px;
  justify-content: center;
  align-items: center;

  ${(props) =>
    props.primary &&
    css`
      background: #1f8a70;
    `}

  ${(props) =>
    props.secondary &&
    css`
      background: #0077b6;
    `}

  ${(props) =>
    props.danger &&
    css`
      background: #c1121f;
    `}

  ${(props) =>
    props.large &&
    css`
      width: 160px;
    `}

  ${(props) =>
    props.medium &&
    css`
      width: 120px;
    `}
`;

export default EasyButton;