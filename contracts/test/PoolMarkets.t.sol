// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {TestUSD} from "../src/TestUSD.sol";
import {PoolMarkets} from "../src/PoolMarkets.sol";

contract PoolMarketsBase is Test {
    TestUSD usd;
    PoolMarkets pm;
    address owner = address(0xA11CE);
    address operator = address(0x09E);
    address resolver = address(0x5E50);
    address alice = address(0xA);
    address bob = address(0xB);
    address carol = address(0xC);
    uint64 tpl;

    function setUp() public virtual {
        usd = new TestUSD(owner);
        pm = new PoolMarkets(address(usd), owner, owner);
        vm.startPrank(owner);
        pm.setOperator(operator, true);
        pm.setResolver(resolver);
        tpl = pm.registerTemplate("AM_TOP_COUNTRY", 1, keccak256("code"), keccak256("rules"), "ipfs://rules", false);
        vm.stopPrank();
        for (uint160 i = 0xA; i <= 0xC; i++) {
            vm.prank(address(i)); usd.faucet();
            vm.prank(address(i)); usd.approve(address(pm), type(uint256).max);
        }
    }

    function _outcomes(uint256 n) internal pure returns (string[] memory o) {
        o = new string[](n);
        for (uint256 i; i < n; i++) o[i] = string(abi.encodePacked("o", vm.toString(i)));
    }

    function _market(uint256 n) internal returns (uint256 id) {
        vm.prank(operator);
        id = pm.createMarket(tpl, "Who is #1?", _outcomes(n), uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours), bytes32(0));
    }
}

contract PoolMarketsTest is PoolMarketsBase {
    function test_createMarketOnlyOperator() public {
        vm.expectRevert(PoolMarkets.NotOperator.selector);
        pm.createMarket(tpl, "q", _outcomes(2), uint64(block.timestamp + 1), uint64(block.timestamp + 2), bytes32(0));
    }

    function test_createMarketValidatesOutcomesAndTimes() public {
        vm.startPrank(operator);
        vm.expectRevert(PoolMarkets.BadOutcomes.selector);
        pm.createMarket(tpl, "q", _outcomes(1), uint64(block.timestamp + 1), uint64(block.timestamp + 2), bytes32(0));
        vm.expectRevert(PoolMarkets.BadOutcomes.selector);
        pm.createMarket(tpl, "q", _outcomes(17), uint64(block.timestamp + 1), uint64(block.timestamp + 2), bytes32(0));
        vm.expectRevert(PoolMarkets.BadTimes.selector);
        pm.createMarket(tpl, "q", _outcomes(2), uint64(block.timestamp), uint64(block.timestamp + 2), bytes32(0));
        vm.expectRevert(PoolMarkets.BadTimes.selector);
        pm.createMarket(tpl, "q", _outcomes(2), uint64(block.timestamp + 3), uint64(block.timestamp + 2), bytes32(0));
        vm.expectRevert(PoolMarkets.UnknownTemplate.selector);
        pm.createMarket(9, "q", _outcomes(2), uint64(block.timestamp + 1), uint64(block.timestamp + 2), bytes32(0));
        vm.stopPrank();
    }

    function test_betUpdatesPoolsAndStakes() public {
        uint256 id = _market(3);
        vm.prank(alice); pm.bet(id, 1, 10e6);
        vm.prank(bob); pm.bet(id, 2, 30e6);
        assertEq(pm.outcomePoolsOf(id)[1], 10e6);
        assertEq(pm.outcomePoolsOf(id)[2], 30e6);
        assertEq(pm.getMarket(id).totalPool, 40e6);
        assertEq(pm.stakesOf(id, alice)[1], 10e6);
        assertEq(usd.balanceOf(address(pm)), 40e6);
    }

    function test_betLimits() public {
        uint256 id = _market(2);
        vm.startPrank(alice);
        vm.expectRevert(PoolMarkets.BetTooSmall.selector); pm.bet(id, 0, 1e6 - 1);
        vm.expectRevert(PoolMarkets.BadOutcome.selector); pm.bet(id, 2, 1e6);
        pm.bet(id, 0, 300e6);
        pm.bet(id, 1, 200e6);
        vm.expectRevert(PoolMarkets.StakeCapExceeded.selector); pm.bet(id, 1, 1e6);
        vm.stopPrank();
    }

    function test_betAtLockTimeReverts() public {
        uint256 id = _market(2);
        vm.warp(pm.getMarket(id).lockTime);
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Locked));
        vm.prank(alice); vm.expectRevert(PoolMarkets.NotOpen.selector); pm.bet(id, 0, 1e6);
    }

    function test_unknownMarketReverts() public {
        vm.expectRevert(PoolMarkets.UnknownMarket.selector); pm.state(42);
    }

    function test_pausedBlocksBets() public {
        uint256 id = _market(2);
        vm.prank(owner); pm.pause();
        vm.prank(alice); vm.expectRevert(); pm.bet(id, 0, 1e6);
    }
}
