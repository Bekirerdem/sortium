// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {TestUSD} from "../../src/TestUSD.sol";
import {PoolMarkets} from "../../src/PoolMarkets.sol";
import {UmaResolver} from "../../src/UmaResolver.sol";

interface IDBT { function allocateTo(address, uint256) external; function approve(address, uint256) external returns (bool); }

contract UmaForkTest is Test {
    address constant OO = 0x1037A21a30aEfF90c269b01c3933eB9a5285d9b8;
    address constant DBT = 0x689FF0D2c17ECbB01477420aB18482A8DAd45186;

    function test_fork_proposeAndSettleOnRealOOv3() public {
        vm.createSelectFork("arbsep");
        TestUSD usd = new TestUSD(address(this));
        PoolMarkets pm = new PoolMarkets(address(usd), address(this), address(this));
        UmaResolver ur = new UmaResolver(OO, address(pm), DBT, "ASSERT_TRUTH", 7200, 300);
        pm.setResolver(address(ur));
        pm.setOperator(address(this), true);
        uint64 tpl = pm.registerTemplate("AM_TOP_DEMO", 1, keccak256("c"), keccak256("r"), "uri", true);
        string[] memory o = new string[](2); o[0] = "A"; o[1] = "Other";
        uint256 id = pm.createMarket(tpl, "q", o, uint64(block.timestamp + 60), uint64(block.timestamp + 120), bytes32(0));
        usd.faucet(); usd.approve(address(pm), type(uint256).max); pm.bet(id, 0, 5e6);
        vm.warp(block.timestamp + 120);
        IDBT(DBT).allocateTo(address(this), 200e18);
        IDBT(DBT).approve(address(ur), type(uint256).max);
        bytes32 aid = ur.propose(id, 0, keccak256("snap"), "uri");
        vm.warp(block.timestamp + 301);
        ur.settle(aid);
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Resolved));
    }
}
