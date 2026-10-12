// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAssertionCallbacks {
    function assertionResolvedCallback(bytes32 assertionId, bool assertedTruthfully) external;
    function assertionDisputedCallback(bytes32 assertionId) external;
}

contract MockOOv3 {
    struct A { address asserter; address callback; IERC20 currency; uint256 bond; uint64 expiresAt; bool settled; }
    mapping(bytes32 => A) public assertions;
    uint256 public nonce;
    uint256 public minBond = 100e18;
    bytes public lastClaim;

    function defaultIdentifier() external pure returns (bytes32) { return "ASSERT_TRUTH"; }
    function getMinimumBond(address) external view returns (uint256) { return minBond; }

    function assertTruth(bytes memory claim, address asserter, address callback, address, uint64 liveness, IERC20 currency, uint256 bond, bytes32, bytes32)
        external returns (bytes32 id)
    {
        currency.transferFrom(msg.sender, address(this), bond);
        id = keccak256(abi.encode(nonce++));
        assertions[id] = A(asserter, callback, currency, bond, uint64(block.timestamp) + liveness, false);
        lastClaim = claim;
    }

    function dispute(bytes32 id) external { IAssertionCallbacks(assertions[id].callback).assertionDisputedCallback(id); }

    function resolve(bytes32 id, bool truthful) external {
        A storage a = assertions[id];
        a.settled = true;
        if (truthful) a.currency.transfer(a.asserter, a.bond);
        IAssertionCallbacks(a.callback).assertionResolvedCallback(id, truthful);
    }

    function settleAssertion(bytes32 id) external {
        A storage a = assertions[id];
        require(block.timestamp >= a.expiresAt && !a.settled, "not settleable");
        a.settled = true;
        a.currency.transfer(a.asserter, a.bond);
        IAssertionCallbacks(a.callback).assertionResolvedCallback(id, true);
    }
}
