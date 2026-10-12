// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPoolMarkets {
    function templateOf(uint256 id) external view returns (bytes32 key, uint32 version, bytes32 codeHash, bool demo, uint8 outcomeCount);
    function setProposed(uint256 id, bool proposed) external;
    function finalize(uint256 id, uint8 outcome) external;
    function voidMarket(uint256 id) external;
}
