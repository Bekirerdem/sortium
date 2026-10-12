// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {PoolMarketsBase} from "./PoolMarkets.t.sol";
import {PoolMarkets} from "../src/PoolMarkets.sol";
import {UmaResolver} from "../src/UmaResolver.sol";
import {MockOOv3} from "./mocks/MockOOv3.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Bond is ERC20 {
    constructor() ERC20("Default Bond Token", "DBT") {}
    function allocateTo(address to, uint256 amt) external { _mint(to, amt); }
}

contract UmaResolverTest is PoolMarketsBase {
    MockOOv3 oo;
    Bond bond;
    UmaResolver ur;
    address proposer = address(0xF00D);

    function setUp() public override {
        super.setUp();
        oo = new MockOOv3();
        bond = new Bond();
        ur = new UmaResolver(address(oo), address(pm), address(bond), "ASSERT_TRUTH", 7200, 300);
        vm.prank(owner); pm.setResolver(address(ur));
        bond.allocateTo(proposer, 1_000e18);
        vm.prank(proposer); bond.approve(address(ur), type(uint256).max);
    }

    function _lockedMarket() internal returns (uint256 id) {
        id = _market(3);
        vm.prank(alice); pm.bet(id, 1, 10e6);
        vm.warp(pm.getMarket(id).resolveTime);
    }

    function test_proposeThenSettleFinalizes() public {
        uint256 id = _lockedMarket();
        vm.prank(proposer);
        bytes32 aid = ur.propose(id, 1, keccak256("snap"), "https://engine/api/evidence/0");
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Proposed));
        assertEq(bond.balanceOf(proposer), 900e18);
        vm.warp(block.timestamp + 7200);
        ur.settle(aid);
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Resolved));
        assertEq(bond.balanceOf(proposer), 1_000e18);
        assertEq(ur.activeAssertion(id), bytes32(0));
    }

    function test_claimTextMentionsMarketAndTemplate() public {
        uint256 id = _lockedMarket();
        vm.prank(proposer); ur.propose(id, 1, keccak256("snap"), "uri");
        string memory c = string(oo.lastClaim());
        assertTrue(bytes(c).length > 0);
        assertTrue(_contains(c, "AM_TOP_COUNTRY"));
    }

    function test_rejectedAssertionReopensForProposal() public {
        uint256 id = _lockedMarket();
        vm.prank(proposer); bytes32 aid = ur.propose(id, 0, keccak256("x"), "uri");
        oo.dispute(aid);
        oo.resolve(aid, false);
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Locked));
        vm.prank(proposer); ur.propose(id, 1, keccak256("y"), "uri");
    }

    function test_voidOutcomeVoidsMarket() public {
        uint256 id = _lockedMarket();
        vm.prank(proposer); bytes32 aid = ur.propose(id, 255, keccak256("gone"), "uri");
        oo.resolve(aid, true);
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Void));
    }

    function test_badOutcomeReverts() public {
        uint256 id = _lockedMarket();
        vm.prank(proposer); vm.expectRevert(UmaResolver.BadOutcome.selector); ur.propose(id, 3, bytes32(0), "uri");
    }

    function test_onlyOracleCallbacks() public {
        vm.expectRevert(UmaResolver.NotOracle.selector); ur.assertionResolvedCallback(bytes32(0), true);
        vm.expectRevert(UmaResolver.NotOracle.selector); ur.assertionDisputedCallback(bytes32(0));
    }

    function test_callbackToleratesVoidedMarket() public {
        uint256 id = _lockedMarket();
        vm.prank(proposer); bytes32 aid = ur.propose(id, 1, keccak256("snap"), "uri");
        // owner swaps resolver temporarily to simulate the market being voided out-of-band
        vm.prank(owner); pm.setResolver(address(this));
        pm.voidMarket(id);
        vm.prank(owner); pm.setResolver(address(ur));
        oo.resolve(aid, true); // must not revert
        assertEq(uint8(pm.state(id)), uint8(PoolMarkets.State.Void));
        assertEq(bond.balanceOf(proposer), 1_000e18);
    }

    function test_demoTemplateUsesShortLiveness() public {
        vm.prank(owner);
        uint64 demoTpl = pm.registerTemplate("AM_TOP_DEMO", 1, keccak256("code"), keccak256("rules"), "uri", true);
        string[] memory o = _outcomes(2);
        vm.prank(operator);
        uint256 id = pm.createMarket(demoTpl, "q", o, uint64(block.timestamp + 60), uint64(block.timestamp + 120), bytes32(0));
        vm.warp(block.timestamp + 120);
        vm.prank(proposer); bytes32 aid = ur.propose(id, 0, bytes32(0), "uri");
        (,,,, uint64 expiresAt,) = oo.assertions(aid);
        assertEq(expiresAt, block.timestamp + 300);
    }

    function _contains(string memory h, string memory n) internal pure returns (bool) {
        bytes memory hb = bytes(h); bytes memory nb = bytes(n);
        for (uint256 i; i + nb.length <= hb.length; i++) {
            bool ok = true;
            for (uint256 j; j < nb.length; j++) if (hb[i + j] != nb[j]) { ok = false; break; }
            if (ok) return true;
        }
        return false;
    }
}
