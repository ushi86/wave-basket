// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IWaveSwapAdapter {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address recipient)
        external
        returns (uint256 amountOut);
}
