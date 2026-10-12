// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {PoolMarketsBase} from "./PoolMarkets.t.sol";
import {PoolMarkets} from "../src/PoolMarkets.sol";

contract PoolMarketsSettlementTest is PoolMarketsBase {
    function _propose(uint256 id) internal {
        vm.warp(pm.getMarket(id).resolveTime);
        vm.prank(resolver); pm.setProposed(id, true);
    }

    function test_happyPathPayoutsAndFee() public {
        uint256 id = _market(3);
        vm.prank(alice); pm.bet(id, 0, 10e6);
        vm.prank(bob); pm.bet(id, 0, 30e6);
        vm.prank(carol); pm.bet(id, 1, 60e6);
        _propose(id);
        vm.prank(resolver); pm.finalize(id, 0);
        // total 100, fee 2, distributable 98, winners staked 40
        assertEq(pm.previewClaim(id, alice), 24_500_000); // 10 * 98 / 40
        assertEq(pm.previewClaim(id, bob), 73_500_000);   // 30 * 98 / 40
        assertEq(pm.previewClaim(id, carol), 0);
        uint256 before = usd.balanceOf(alice);
        vm.prank(alice); pm.claim(id);
        assertEq(usd.balanceOf(alice) - before, 24_500_000);
        vm.prank(alice); vm.expectRevert(PoolMarkets.NothingToClaim.selector); pm.claim(id);
        vm.prank(carol); vm.expectRevert(PoolMarkets.NothingToClaim.selector); pm.claim(id);
        pm.withdrawFees();
        assertEq(usd.balanceOf(owner), 2e6);
    }

    function test_finalizeEmptyWinnerVoids() public {
        uint256 id = _market(3);
        vm.prank(alice); pm.bet(id, 0, 10e6);
        vm.prank(bob); pm.bet(id, 1, 20e6);
        _propose(id);
        vm.prank(resolver); pm.finalize(id, 2);
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Void));
        vm.prank(alice); pm.claim(id);
        vm.prank(bob); pm.claim(id);
        assertEq(usd.balanceOf(alice), 1_000e6);
        assertEq(usd.balanceOf(bob), 1_000e6);
        assertEq(pm.accruedFees(), 0);
    }

    function test_proposeRules() public {
        uint256 id = _market(2);
        vm.prank(resolver); vm.expectRevert(PoolMarkets.BadState.selector); pm.setProposed(id, true); // still open
        vm.warp(pm.getMarket(id).lockTime);
        vm.prank(resolver); vm.expectRevert(PoolMarkets.TooEarly.selector); pm.setProposed(id, true);
        vm.warp(pm.getMarket(id).resolveTime);
        vm.expectRevert(PoolMarkets.NotResolver.selector); pm.setProposed(id, true);
        vm.prank(resolver); pm.setProposed(id, true);
        vm.prank(resolver); vm.expectRevert(PoolMarkets.BadState.selector); pm.setProposed(id, true); // already proposed
        vm.prank(resolver); pm.setProposed(id, false); // rejected assertion -> back to Locked
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Locked));
    }

    function test_staleVoidByAnyone() public {
        uint256 id = _market(2);
        vm.prank(alice); pm.bet(id, 0, 5e6);
        vm.warp(uint256(pm.getMarket(id).resolveTime) + 7 days);
        vm.expectRevert(PoolMarkets.TooEarly.selector); pm.voidMarket(id);
        vm.warp(uint256(pm.getMarket(id).resolveTime) + 7 days + 1);
        pm.voidMarket(id);
        vm.prank(alice); pm.claim(id);
        assertEq(usd.balanceOf(alice), 1_000e6);
    }

    function test_staleVoidBlockedWhileProposed() public {
        uint256 id = _market(2);
        _propose(id);
        vm.warp(uint256(pm.getMarket(id).resolveTime) + 8 days);
        vm.expectRevert(PoolMarkets.BadState.selector); pm.voidMarket(id);
    }

    function testFuzz_payoutsNeverExceedPool(uint96 a, uint96 b, uint96 c, uint8 win) public {
        uint256 id = _market(3);
        uint256 sa = bound(a, 1e6, 500e6);
        uint256 sb = bound(b, 1e6, 500e6);
        uint256 sc = bound(c, 1e6, 500e6);
        vm.prank(alice); pm.bet(id, 0, sa);
        vm.prank(bob); pm.bet(id, 1, sb);
        vm.prank(carol); pm.bet(id, uint8(bound(win, 0, 2)) == 2 ? 2 : 0, sc);
        _propose(id);
        uint8 w = uint8(bound(win, 0, 2));
        vm.prank(resolver); pm.finalize(id, w);
        uint256 paid = pm.previewClaim(id, alice) + pm.previewClaim(id, bob) + pm.previewClaim(id, carol);
        assertLe(paid + pm.accruedFees(), sa + sb + sc);
        assertEq(usd.balanceOf(address(pm)), sa + sb + sc);
    }
}
