// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract TestUSDTest is Test {
    TestUSD t;
    address owner = address(0xA11CE);
    address user = address(0xB0B);

    function setUp() public { t = new TestUSD(owner); }

    function test_decimals() public view { assertEq(t.decimals(), 6); }

    function test_faucetMintsOncePerDay() public {
        vm.prank(user); t.faucet();
        assertEq(t.balanceOf(user), 1_000e6);
        vm.prank(user); vm.expectRevert(TestUSD.Cooldown.selector); t.faucet();
        vm.warp(block.timestamp + 1 days);
        vm.prank(user); t.faucet();
        assertEq(t.balanceOf(user), 2_000e6);
    }

    function test_dripOnlyByDripper() public {
        vm.expectRevert(TestUSD.NotDripper.selector); t.drip(user);
        vm.prank(owner); t.setDripper(address(this), true);
        t.drip(user);
        assertEq(t.balanceOf(user), 1_000e6);
        vm.expectRevert(TestUSD.Cooldown.selector); t.drip(user);
    }
}
